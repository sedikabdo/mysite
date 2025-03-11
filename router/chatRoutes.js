const express = require("express");
const multer = require("multer");
const ChatController = require("../controllers/chatController");

const router = express.Router();

// إعداد Multer لتخزين الصور في مجلد معين
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/chatimage/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// عرض صفحة الدردشة مع الصديق
router.get("/:friendId", ChatController.getChatPage);

// جلب الرسائل ديناميكياً عبر API
router.get("/messages/:friendId", ChatController.getMessagesAPI);

// إرسال رسالة جديدة (موحد مع الكود القديم)
router.post("/sendMessage", upload.single("imagePath"), ChatController.sendMessage);

// حذف كل الرسائل
router.post("/delete-all", ChatController.deleteAllMessages);

// حذف رسالة معينة
router.post("/delete/:messageId", ChatController.deleteMessage);

// عرض صفحة الرسائل الواردة
router.get("/messages", ChatController.getMessagesPage);

// تحديث الصورة الرمزية
router.post("/updateAvatar", upload.single("avatar"), ChatController.updateAvatar);

// جلب عدد الرسائل غير المقروءة
router.get("/unread-count", ChatController.getUnreadMessagesCount);

// تحديد جميع الرسائل كمقروءة
router.post("/mark-all-as-read", ChatController.markAllAsRead);

module.exports = router;
