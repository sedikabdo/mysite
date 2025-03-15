// utils/avatarHelper.js
const fs = require('fs');
const path = require('path');

function getAvatarPath(avatarFilename) {
  const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars'); // المسار النسبي لـ uploads/avatars
  const defaultAvatar = '/uploads/images/pngwing.com.png'; // الصورة الافتراضية

  if (!avatarFilename) {
    return defaultAvatar;
  }

  const avatarPath = path.join(avatarDir, avatarFilename);
  return fs.existsSync(avatarPath) ? `/uploads/avatars/${avatarFilename}` : defaultAvatar;
}

module.exports = { getAvatarPath };