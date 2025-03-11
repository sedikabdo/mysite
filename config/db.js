const mysql = require('mysql2');
const util = require('util');
require('dotenv').config(); // تحميل المتغيرات من .env

// إعداد الاتصال بقاعدة البيانات باستخدام المتغيرات البيئية
const db = mysql.createConnection({
  host: 'sql.freedb.tech',
  user: 'freedb_colorizer',
  password:  'y!Zm32HmFYzZe#N',
  database:'freedb_colorizerdev',
  port:  3306
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