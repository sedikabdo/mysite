const mysql = require('mysql2');
const util = require('util');
require('dotenv').config(); // تحميل المتغيرات من .env

// إعداد الاتصال بقاعدة البيانات باستخدام المتغيرات البيئية
const db = mysql.createConnection({
  host: 'mysql-25e206f6-sedikdev-bee8.h.aivencloud.com',
  user: 'avnadmin',
  password:  'AVNS_NUzRc7lGmAWt4-bTqq9',
  database:'defaultdb',
  port:  10903
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
