const NotificationModel = require("../models/NotificationModel");
const ChatModel = require("../models/chatModel");
const jwt = require("jsonwebtoken");

class NotificationController {
  static async showNotifications(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.redirect("/login");

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;

      const notifications = await NotificationModel.getNotifications(userId);
      const currentUser = await NotificationModel.getUserById(userId);
      const currentUserAvatar = currentUser && currentUser.avatar 
        ? (currentUser.avatar.includes('/uploads/avatars/') ? currentUser.avatar : `/uploads/avatars/${currentUser.avatar}`) 
        : '/uploads/images/pngwing.com.png';

      const enrichedNotifications = notifications.map(notification => ({
        ...notification,
        sender_avatar: notification.sender_avatar 
          ? (notification.sender_avatar.includes('/uploads/avatars/') ? notification.sender_avatar : `/uploads/avatars/${notification.sender_avatar}`) 
          : '/uploads/images/pngwing.com.png'
      }));

      const unreadCount = await NotificationModel.getUnreadCount(userId);
      const unreadMessagesCount = await ChatModel.getUnreadCount(userId); // عدد الرسائل غير المقروءة

      res.render("notifications", { 
        notifications: enrichedNotifications, 
        unreadCount,
        unreadMessagesCount, // تمرير عدد الرسائل غير المقروءة
        userId,
        currentUserAvatar,
        errorMessage: null,
        successMessage: null
      });
    } catch (error) {
      res.status(500).render("notifications", {
        notifications: [],
        unreadCount: 0,
        unreadMessagesCount: 0,
        userId: null,
        currentUserAvatar: '/uploads/images/pngwing.com.png',
        errorMessage: "حدث خطأ أثناء عرض الإشعارات",
        successMessage: null
      });
    }
  }

  static async markAsViewed(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ success: false, message: "غير مصرح" });

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const notificationId = req.params.id;

      const notification = await NotificationModel.getNotificationById(notificationId);
      if (!notification || notification.user_id !== userId) {
        return res.status(403).json({ success: false, message: "غير مصرح لك بتحديث هذا الإشعار" });
      }

      await NotificationModel.markAsViewed(notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "حدث خطأ أثناء تحديث الإشعار" });
    }
  }

  static async deleteNotification(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ success: false, message: "غير مصرح" });

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;
      const notificationId = req.params.id;

      const notification = await NotificationModel.getNotificationById(notificationId);
      if (!notification) {
        return res.status(404).json({ success: false, message: "الإشعار غير موجود" });
      }
      if (notification.user_id !== userId) {
        return res.status(403).json({ success: false, message: "غير مصرح لك بحذف هذا الإشعار" });
      }

      await NotificationModel.deleteNotification(notificationId);
      res.json({ success: true, message: "تم حذف الإشعار بنجاح" });
    } catch (error) {
      res.status(500).json({ success: false, message: "حدث خطأ أثناء حذف الإشعار" });
    }
  }

  static async deleteAllNotifications(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ success: false, message: "غير مصرح" });

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;

      await NotificationModel.deleteAllNotifications(userId);
      res.redirect("/notifications");
    } catch (error) {
      res.redirect("/notifications");
    }
  }

  static async showAdminNotifyPage(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.redirect("/login");

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;

      const user = await NotificationModel.getUserById(userId);
      if (!user) {
        return res.status(403).send("المستخدم غير موجود");
      }

      if (user.role !== "admin") {
        return res.status(403).send("غير مصرح لك");
      }

      const unreadCount = await NotificationModel.getUnreadCount(userId);
      const unreadMessagesCount = await ChatModel.getUnreadCount(userId);

      res.render("admin/notify", { 
        errorMessage: null, 
        successMessage: null,
        unreadCount,
        unreadMessagesCount,
        userId
      });
    } catch (error) {
      res.redirect("/login");
    }
  }

  static async sendAdminNotification(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.redirect("/login");

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;

      const user = await NotificationModel.getUserById(userId);
      if (!user) {
        return res.status(403).send("المستخدم غير موجود");
      }

      if (user.role !== "admin") {
        return res.status(403).send("غير مصرح لك");
      }

      const senderId = userId;
      const { message } = req.body;
      const imageUrl = req.file ? `/uploads/notifications/${req.file.filename}` : null;

      if (!message || message.trim() === "") {
        return res.status(400).render("admin/notify", {
          errorMessage: "يجب إدخال رسالة للإشعار",
          successMessage: null,
          unreadCount: await NotificationModel.getUnreadCount(userId),
          unreadMessagesCount: await ChatModel.getUnreadCount(userId),
          userId
        });
      }

      await NotificationModel.createAdminNotificationForAllUsers(senderId, message, imageUrl);
      res.render("admin/notify", {
        errorMessage: null,
        successMessage: "تم إرسال الإشعار بنجاح إلى جميع المستخدمين!",
        unreadCount: await NotificationModel.getUnreadCount(userId),
        unreadMessagesCount: await ChatModel.getUnreadCount(userId),
        userId
      });
    } catch (error) {
      res.status(500).render("admin/notify", {
        errorMessage: error.message || "حدث خطأ أثناء إرسال الإشعار",
        successMessage: null,
        unreadCount: await NotificationModel.getUnreadCount(userId),
        unreadMessagesCount: await ChatModel.getUnreadCount(userId),
        userId
      });
    }
  }

  static async markAllNotificationsAsRead(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول أولاً" });

      const decoded = jwt.verify(token, "your_jwt_secret");
      const userId = decoded.id;

      await NotificationModel.markAllAsViewed(userId);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: "خطأ أثناء تحديث حالة الإشعارات" });
    }
  }
}

module.exports = NotificationController;