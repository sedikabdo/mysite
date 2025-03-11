const JobModel = require("../models/JobModel");
const NotificationModel = require("../models/NotificationModel");
const jwt = require("jsonwebtoken");
const { getIO } = require("../socket");

class JobController {
  static async addJob(req, res) {
    try {
      const userId = req.user.id;

      const canAddJob = await NotificationModel.canUserAddJob(userId);
      if (!canAddJob.canAddJob) {
        return res.status(403).json({ success: false, message: canAddJob.message });
      }

      const {
        title,
        description,
        jobType,
        education,
        currency,
        salaryMin,
        salaryMax,
        salaryAfterInterview,
        location,
        experience,
        duration,
      } = req.body;

      const isSalaryAfterInterview = salaryAfterInterview === "1" || salaryAfterInterview === "on" || salaryAfterInterview === true ? 1 : 0;

      const jobData = {
        title,
        description,
        job_type: jobType,
        education,
        currency: currency || null,
        salary_min: isSalaryAfterInterview ? null : (salaryMin ? parseFloat(salaryMin) : null),
        salary_max: isSalaryAfterInterview ? null : (salaryMax ? parseFloat(salaryMax) : null),
        salary_after_interview: isSalaryAfterInterview,
        location,
        experience,
        duration: parseInt(duration, 10) || 0,
        logo: req.file ? req.file.filename : null,
        expires_at: duration ? new Date(Date.now() + parseInt(duration) * 86400000).toISOString() : null,
        user_id: userId,
      };

      const requiredFields = { title, description, jobType, education, location, experience, duration };
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value || value.toString().trim() === "")
        .map(([key]) => key);

      if (missingFields.length > 0) {
        return res.status(400).json({ success: false, message: `الحقول التالية مطلوبة: ${missingFields.join(", ")}.` });
      }

      if (!isSalaryAfterInterview) {
        if (!salaryMin || !salaryMax || isNaN(parseFloat(salaryMin)) || isNaN(parseFloat(salaryMax))) {
          return res.status(400).json({ success: false, message: "يجب إدخال أقل راتب وأعلى راتب بشكل صحيح عند عدم تحديد الراتب بعد المقابلة." });
        }
        if (parseFloat(salaryMin) >= parseFloat(salaryMax)) {
          return res.status(400).json({ success: false, message: "أقل راتب يجب أن يكون أقل من أعلى راتب." });
        }
      }

      if (isNaN(jobData.duration) || jobData.duration <= 0) {
        return res.status(400).json({ success: false, message: "مدة الإعلان يجب أن تكون رقمًا موجبًا." });
      }

      const jobId = await JobModel.addJob(jobData);

      const io = getIO();
      const senderName = (await JobModel.getUserProfile(userId)).name || "المسؤول";
      await NotificationModel.createAdminNotificationForAllUsers(
        userId,
        `وظيفة جديدة: ${title} أُضيفت بواسطة ${senderName}.`,
        jobData.logo ? `/uploads/picjobs/${jobData.logo}` : null
      );
      io.emit("newJobNotification", { 
        senderId: userId, 
        message: `وظيفة جديدة: ${title} أُضيفت بواسطة ${senderName}.`,
        jobId 
      });

      res.status(201).json({ success: true, message: "تم إضافة الوظيفة بنجاح!" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message || "حدث خطأ أثناء إضافة الوظيفة." });
    }
  }

  static async applyJob(req, res) {
    try {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: "يرجى تسجيل الدخول للتقديم على الوظيفة." });
      }

      const decoded = jwt.verify(token, "your_jwt_secret");
      const applicantId = decoded.id;
      const { job_id: jobId, cover_letter } = req.body;

      if (!jobId || !cover_letter) {
        return res.status(400).json({ success: false, message: "معرف الوظيفة ورسالة التقديم مطلوبان." });
      }

      await JobModel.addApplication(jobId, applicantId, cover_letter);

      const job = await JobModel.getJobDetail(jobId);
      const applicantName = (await JobModel.getUserProfile(applicantId)).name || "مستخدم";
      await NotificationModel.createNotification(
        job.user_id,
        applicantId,
        "job_application",
        `${applicantName} تقدم بطلب للوظيفة: ${job.title}`
      );

      const io = getIO();
      io.to(job.user_id).emit("jobApplicationReceived", { 
        applicantId, 
        jobId, 
        message: `${applicantName} تقدم بطلب للوظيفة: ${job.title}` 
      });

      res.status(201).json({ success: true, message: "تم إرسال الطلب بنجاح!" });
    } catch (err) {
      const status = err.message.includes("تقدمت لهذه الوظيفة") ? 400 : 500;
      const message = err.message.includes("تقدمت لهذه الوظيفة") 
        ? "لقد تقدمت لهذه الوظيفة بالفعل." 
        : err.message.includes("الوظيفة غير موجودة") 
        ? "الوظيفة غير موجودة." 
        : "حدث خطأ أثناء إرسال الطلب.";
      res.status(status).json({ success: false, message });
    }
  }

  static async renderAllJobs(req, res) {
    try {
      const jobs = await JobModel.getAllJobs();
      res.render("listing-job", { 
        jobs,
        errorMessage: null,
        successMessage: null
      });
    } catch (error) {
      res.status(500).render("listing-job", {
        jobs: [],
        errorMessage: "حدث خطأ أثناء عرض الوظائف.",
        successMessage: null
      });
    }
  }

  static async getAllJobs(req, res) {
    try {
      const jobs = await JobModel.getAllJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "حدث خطأ أثناء جلب الوظائف." });
    }
  }

  static async renderAllApplications(req, res) {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        return res.status(401).render("jobapplications", {
          applications: [],
          errorMessage: "يجب تسجيل الدخول لعرض طلبات التوظيف.",
          successMessage: null
        });
      }

      const applications = await JobModel.getAllApplicationsForOwner(ownerId);

      const enrichedApplications = applications.map(application => ({
        ...application,
        applicant_avatar: application.applicant_avatar 
          ? (application.applicant_avatar.includes('/uploads/avatars/') ? application.applicant_avatar : `/uploads/avatars/${application.applicant_avatar}`) 
          : '/uploads/images/pngwing.com.png'
      }));

      res.render("jobapplications", { 
        applications: enrichedApplications,
        errorMessage: null,
        successMessage: null
      });
    } catch (err) {
      res.status(500).render("jobapplications", {
        applications: [],
        errorMessage: "حدث خطأ أثناء عرض طلبات التوظيف.",
        successMessage: null
      });
    }
  }

  static async getApplications(req, res) {
    try {
      const { jobId } = req.params;
      const applications = await JobModel.getApplicationsByJob(jobId);

      const enrichedApplications = applications.map(application => ({
        ...application,
        applicant_avatar: application.applicant_avatar 
          ? (application.applicant_avatar.includes('/uploads/avatars/') ? application.applicant_avatar : `/uploads/avatars/${application.applicant_avatar}`) 
          : '/uploads/images/pngwing.com.png'
      }));

      res.json(enrichedApplications);
    } catch (err) {
      res.status(500).json({ error: "حدث خطأ أثناء جلب الطلبات." });
    }
  }

  static async renderJobDetail(req, res) {
    try {
      const { jobId } = req.params;
      const job = await JobModel.getJobDetail(jobId);
      if (!job) {
        return res.status(404).render("jobDetail", {
          job: null,
          currentUserId: null,
          errorMessage: "الوظيفة غير موجودة",
          successMessage: null
        });
      }

      job.logo = job.logo 
        ? (job.logo.includes('/uploads/') ? job.logo : `/uploads/picjobs/${job.logo}`) 
        : '/uploads/images/pngwing.com.png';

      const token = req.cookies.token;
      const currentUserId = token ? jwt.verify(token, "your_jwt_secret").id : null;

      res.render("jobDetail", { 
        job, 
        currentUserId,
        errorMessage: null,
        successMessage: null
      });
    } catch (error) {
      res.status(500).render("jobDetail", {
        job: null,
        currentUserId: null,
        errorMessage: "حدث خطأ أثناء جلب تفاصيل الوظيفة.",
        successMessage: null
      });
    }
  }
}

module.exports = JobController;