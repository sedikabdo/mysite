const mysql = require('mysql2');
const util = require('util');
require('dotenv').config(); // تحميل المتغيرات من .env

// إعداد الاتصال بقاعدة البيانات الجديدة
const db = mysql.createConnection({
  host: 'sql8.freesqldatabase.com',  // المضيف الجديد
  user: 'sql8767341',                // اسم المستخدم
  password: 'dyws194Y1Z',            // كلمة المرور الجديدة
  database: 'sql8767341',             // اسم قاعدة البيانات
  port: 3306                          // المنفذ الافتراضي لـ MySQL
});

db.connect((err) => {
  if (err) {
    console.error("❌ لم يتم الاتصال بقاعدة البيانات:", err);
    return;
  }
  console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
});

// تحويل db.query إلى Promise حتى يعمل مع async/await
db.query = util.promisify(db.query);

module.exports = db;
