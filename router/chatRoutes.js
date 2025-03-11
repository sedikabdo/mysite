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
router.get("/chat/:friendId", ChatController.getChatPage); // تعديل هنا

// جلب الرسائل ديناميكياً عبر API
router.get("/chat/messages/:friendId", ChatController.getMessagesAPI); // تعديل لتجنب التعارض

// إرسال رسالة جديدة
router.post("/chat/sendMessage", upload.single("imagePath"), ChatController.sendMessage);

// حذف كل الرسائل
router.post("/chat/delete-all", ChatController.deleteAllMessages);

// حذف رسالة معينة
router.post("/chat/delete/:messageId", ChatController.deleteMessage);

// عرض صفحة الرسائل الواردة
router.get("/messages", ChatController.getMessagesPage);

// تحديث الصورة الرمزية
router.post("/chat/updateAvatar", upload.single("avatar"), ChatController.updateAvatar);

// جلب عدد الرسائل غير المقروءة
router.get("/chat/unread-count", ChatController.getUnreadMessagesCount);

// تحديد جميع الرسائل كمقروءة
router.post("/chat/mark-all-as-read", ChatController.markAllAsRead);

module.exports = router;
