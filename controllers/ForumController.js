const forumModel = require("../models/forumModel");
const JobModel = require("../models/jobModel");
const ProjectModel = require("../models/Project");
const NotificationModel = require("../models/NotificationModel");
const jwt = require("jsonwebtoken");
const { getAvatarPath } = require("../utils/avatarHelper");

class ForumController {
  static async addPost(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).json({ success: false, message: "معرف المستخدم مطلوب. الرجاء تسجيل الدخول." });
      }
      const userId = req.user.id;
      const content = req.body.content;
      const images = req.files ? req.files.map((file) => file.filename) : [];

      const canPost = await NotificationModel.canUserPost(userId);
      if (!canPost.canPost) {
        return res.status(403).json({ success: false, message: canPost.message });
      }

      await forumModel.addPost(userId, content, images);
      res.json({ success: true, message: "تم إضافة المنشور بنجاح!" });
    } catch (err) {
      console.error("Error in addPost:", err);
      res.status(500).json({ success: false, message: "حدث خطأ أثناء إضافة المنشور." });
    }
  }

  static async addComment(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).json({ success: false, message: "معرف المستخدم مطلوب. الرجاء تسجيل الدخول." });
      }
      const userId = req.user.id;
      const { postId } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ success: false, message: "محتوى التعليق مطلوب." });
      }

      const canComment = await NotificationModel.canUserComment(userId);
      if (!canComment.canComment) {
        return res.status(403).json({ success: false, message: canComment.message });
      }

      const comment = await forumModel.addComment(postId, userId, content);
      const userInfo = await forumModel.getUserById(userId);

      res.json({
        success: true,
        comment: {
          id: comment.insertId,
          content,
          user_name: userInfo.name,
          user_avatar: getAvatarPath(userInfo.avatar),
          user_id: userId,
        },
      });
    } catch (error) {
      console.error("Error in addComment:", error);
      res.status(500).json({ success: false, message: "خطأ في إضافة التعليق." });
    }
  }

  static async addAd(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).json({ success: false, message: "معرف المستخدم مطلوب. الرجاء تسجيل الدخول." });
      }
      const userId = req.user.id;
      const { title, description } = req.body;
      const image = req.file ? req.file.filename : null;

      if (!title) {
        return res.status(400).json({ success: false, message: "العنوان مطلوب." });
      }

      const canAddAd = await NotificationModel.canUserAddAd(userId);
      if (!canAddAd.canAddAd) {
        return res.status(403).json({ success: false, message: canAddAd.message });
      }

      const adId = await forumModel.addAd(userId, title, description, image);
      res.json({
        success: true,
        message: "تم إضافة الإعلان بنجاح!",
        adId,
        filename: image,
      });
    } catch (err) {
      console.error("Error in addAd:", err);
      res.status(500).json({ success: false, message: "حدث خطأ أثناء إضافة الإعلان." });
    }
  }

  static async editPostForm(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).send("معرف المستخدم مطلوب. الرجاء تسجيل الدخول.");
      }
      const userId = req.user.id;
      const postId = req.params.postId;
      const post = await forumModel.getPostDetails(postId);

      if (!post) {
        return res.status(404).send("المنشور غير موجود.");
      }

      const isOwner = await forumModel.isPostOwner(postId, userId);
      if (!isOwner) {
        return res.status(403).send("أنت لست صاحب هذا المنشور.");
      }

      post.user_avatar = getAvatarPath(post.user_avatar);
      res.render("editPost", { post });
    } catch (err) {
      console.error("Error in editPostForm:", err);
      res.status(500).send("حدث خطأ أثناء جلب تفاصيل المنشور.");
    }
  }

  static async updatePost(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).send("معرف المستخدم مطلوب. الرجاء تسجيل الدخول.");
      }
      const userId = req.user.id;
      const postId = req.params.postId;
      const { content } = req.body;
      const images = req.files ? req.files.map((file) => file.filename) : [];

      const isOwner = await forumModel.isPostOwner(postId, userId);
      if (!isOwner) {
        return res.status(403).send("أنت لست صاحب هذا المنشور.");
      }

      await forumModel.editPost(postId, content, images);
      res.redirect("/forum");
    } catch (err) {
      console.error("Error in updatePost:", err);
      res.status(500).send("حدث خطأ أثناء تحديث المنشور.");
    }
  }

  static async deletePost(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).send("معرف المستخدم مطلوب. الرجاء تسجيل الدخول.");
      }
      const userId = req.user.id;
      const postId = req.params.id;

      const isOwner = await forumModel.isPostOwner(postId, userId);
      if (!isOwner) {
        return res.status(403).send("أنت لست صاحب هذا المنشور.");
      }

      await forumModel.deletePost(postId);
      res.redirect("/forum");
    } catch (err) {
      console.error("Error in deletePost:", err);
      res.status(500).send("حدث خطأ أثناء حذف المنشور.");
    }
  }

  static async toggleLike(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).json({ success: false, message: "معرف المستخدم مطلوب. الرجاء تسجيل الدخول." });
      }
      const userId = req.user.id;
      const postId = req.params.id;

      const canLike = await NotificationModel.canUserLike(userId);
      if (!canLike.canLike) {
        return res.status(403).json({ success: false, message: canLike.message });
      }

      const liked = await forumModel.toggleLike(postId, userId);
      const likeCount = await forumModel.getLikeCount(postId);

      res.json({ success: true, liked, likeCount });
    } catch (err) {
      console.error("Error in toggleLike:", err);
      res.status(500).json({ success: false, message: "حدث خطأ أثناء تبديل الإعجاب." });
    }
  }

  static async getComments(req, res) {
    try {
      const { postId } = req.params;
      const comments = await forumModel.getComments(postId);

      const enrichedComments = comments.map(comment => ({
        ...comment,
        user_avatar: getAvatarPath(comment.user_avatar),
      }));

      res.json({ success: true, comments: enrichedComments });
    } catch (error) {
      console.error("Error in getComments:", error);
      res.status(500).json({ success: false, message: "خطأ في جلب التعليقات." });
    }
  }

  static async toggleLikeComment(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).send("معرف المستخدم مطلوب. الرجاء تسجيل الدخول.");
      }
      const userId = req.user.id;
      const { commentId } = req.params;

      const liked = await forumModel.toggleLikeComment(commentId, userId);
      res.json({ liked });
    } catch (err) {
      console.error("Error in toggleLikeComment:", err);
      res.status(500).send("حدث خطأ أثناء تبديل الإعجاب على التعليق.");
    }
  }

  static async sharePost(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).send("معرف المستخدم مطلوب. الرجاء تسجيل الدخول.");
      }
      const userId = req.user.id;
      const postId = req.params.id;

      await forumModel.sharePost(userId, postId);
      res.redirect("/forum");
    } catch (err) {
      console.error("Error in sharePost:", err);
      res.status(500).send("حدث خطأ أثناء مشاركة المنشور.");
    }
  }

  static async hidePost(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).send("معرف المستخدم مطلوب. الرجاء تسجيل الدخول.");
      }
      const userId = req.user.id;
      const postId = req.params.id;

      const isHidden = await forumModel.checkHiddenPost(userId, postId);
      if (!isHidden) {
        await forumModel.hidePost(userId, postId);
      }
      res.redirect("/forum");
    } catch (err) {
      console.error("Error in hidePost:", err);
      res.status(500).send("حدث خطأ أثناء إخفاء المنشور.");
    }
  }

  static async getAllPosts(req, res) {
    try {
      const token = req.cookies.token;
      let userId = null;
      let currentUserAvatar = null;
      let currentUserName = null;

      if (token) {
        try {
          const decoded = jwt.verify(token, "your_jwt_secret");
          userId = decoded.id;
          const userInfo = await forumModel.getUserById(userId);
          currentUserAvatar = getAvatarPath(userInfo.avatar);
          currentUserName = userInfo.name;
        } catch (err) {
          console.error("JWT Decoding Error:", err);
        }
      }

      const posts = await forumModel.getAllPosts(userId);
      const ads = await forumModel.getAllAds();
      const jobs = await JobModel.getAllJobs();
      const projects = await ProjectModel.findAll();

      const enrichedPosts = await Promise.all(
        posts.map(async post => {
          const isOwner = userId ? await forumModel.isPostOwner(post.id, userId) : false;
          const liked = userId ? await forumModel.hasLikedPost(post.id, userId) : false;
          return {
            ...post,
            user_avatar: getAvatarPath(post.user_avatar),
            comments: post.comments
              ? post.comments.map(comment => ({
                  ...comment,
                  user_avatar: getAvatarPath(comment.user_avatar),
                }))
              : [],
            showEditDeleteButtons: isOwner,
            liked,
          };
        })
      );

      const enrichedAds = ads.map(ad => ({
        ...ad,
        user_avatar: getAvatarPath(ad.user_avatar),
      }));

      res.render("forum", {
        posts: enrichedPosts,
        ads: enrichedAds,
        jobs,
        projects,
        currentUserId: userId,
        currentUserAvatar,
        currentUserName,
      });
    } catch (err) {
      console.error("Error in getAllPosts:", err);
      res.status(500).send("حدث خطأ أثناء جلب المنشورات.");
    }
  }

  static async getPostDetails(req, res) {
    try {
      const token = req.cookies.token;
      let userId = null;

      if (token) {
        try {
          const decoded = jwt.verify(token, "your_jwt_secret");
          userId = decoded.id;
        } catch (err) {
          console.error("JWT Decoding Error:", err);
        }
      }

      const postId = req.params.postId;
      const post = await forumModel.getPostDetails(postId);

      if (!post) {
        return res.status(404).send("المنشور غير موجود.");
      }

      post.user_avatar = getAvatarPath(post.user_avatar);
      post.comments = post.comments
        ? post.comments.map(comment => ({
            ...comment,
            user_avatar: getAvatarPath(comment.user_avatar),
          }))
        : [];

      res.render("postDetails", { post, currentUserId: userId });
    } catch (err) {
      console.error("Error in getPostDetails:", err);
      res.status(500).send("حدث خطأ أثناء جلب تفاصيل المنشور.");
    }
  }

  static async uploadAvatar(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).send("معرف المستخدم مطلوب. الرجاء تسجيل الدخول.");
      }
      const userId = req.user.id;

      const avatar = req.file ? req.file.filename : null;
      if (avatar) {
        await forumModel.uploadAvatar(userId, avatar);
        res.redirect(`/profile?userId=${userId}`);
      } else {
        res.status(400).send("صورة الأفاتار مطلوبة.");
      }
    } catch (err) {
      console.error("Error in uploadAvatar:", err);
      res.status(500).send("حدث خطأ أثناء رفع الأفاتار.");
    }
  }

  static async renderProfile(req, res) {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).send("معرف المستخدم مفقود.");
      }

      const user = await forumModel.getUserById(userId);
      if (!user) {
        return res.status(404).send("المستخدم غير موجود");
      }

      user.avatar = getAvatarPath(user.avatar);
      res.render("profile", { user });
    } catch (err) {
      console.error("Error in renderProfile:", err);
      res.status(500).send("حدث خطأ أثناء عرض الملف الشخصي.");
    }
  }

  static async getUserPosts(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(403).send("معرف المستخدم مطلوب. الرجاء تسجيل الدخول.");
      }
      const userId = req.user.id;

      const posts = await forumModel.getUserPosts(userId);
      const enrichedPosts = await Promise.all(
        posts.map(async post => {
          const isOwner = await forumModel.isPostOwner(post.id, userId);
          const liked = await forumModel.hasLikedPost(post.id, userId);
          return {
            ...post,
            user_avatar: getAvatarPath(post.user_avatar),
            showEditDeleteButtons: isOwner,
            liked,
          };
        })
      );

      const userInfo = await forumModel.getUserById(userId);
      const currentUserAvatar = getAvatarPath(userInfo.avatar);
      const currentUserName = userInfo.name;

      res.render("userPosts", {
        posts: enrichedPosts,
        currentUserId: userId,
        currentUserAvatar,
        currentUserName,
      });
    } catch (err) {
      console.error("Error in getUserPosts:", err);
      res.status(500).send("حدث خطأ أثناء جلب منشورات المستخدم.");
    }
  }
}

module.exports = ForumController;
