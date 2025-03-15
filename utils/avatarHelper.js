// utils/avatarHelper.js
const path = require('path');

function getAvatarPath(avatarFilename) {
  const defaultAvatar = '/uploads/images/pngwing.com.png'; // الصورة الافتراضية

  // إذا لم يكن هناك اسم ملف أو كان فارغًا، نرجع الافتراضي
  if (!avatarFilename || typeof avatarFilename !== 'string') {
    return defaultAvatar;
  }

  // نضمن أن المسار يكون موحدًا ونظيفًا
  const normalizedAvatar = avatarFilename.trim();
  if (normalizedAvatar.startsWith('/uploads/avatars/')) {
    return normalizedAvatar; // المسار جاهز بالفعل
  }

  // إنشاء المسار النسبي للأفاتار
  return `/uploads/avatars/${normalizedAvatar}`;
}

module.exports = { getAvatarPath };
