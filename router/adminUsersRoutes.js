const express = require("express");
const AdminUsersController = require("../controllers/AdminUsersController");

const router = express.Router();

// مسار لعرض صفحة المستخدمين (يبقى GET)
router.get("/users", AdminUsersController.showUsers);

// مسار لتعيين مستخدم كـ Admin (POST)
router.post("/users/set-admin/:id", AdminUsersController.setAdmin);

// مسار لتفعيل/حظر مستخدم (POST)
router.post("/users/toggle-block/:id", AdminUsersController.toggleBlock);

module.exports = router;