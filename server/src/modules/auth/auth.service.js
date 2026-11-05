const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { toPublicUser } = require('../../utils/serialize');

async function login({ username, password, expectedRole }) {
  const normalizedUsername = username.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });

  if (!user) {
    throw new ApiError(401, 'Username hoặc mật khẩu không đúng');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new ApiError(401, 'Username hoặc mật khẩu không đúng');
  }

  if (expectedRole && user.role !== expectedRole) {
    throw new ApiError(
      403,
      expectedRole === 'ADMIN'
        ? 'Tài khoản này không có quyền quản trị'
        : 'Tài khoản này không phải tài khoản giáo viên'
    );
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return { token, user: toPublicUser(user) };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }
  return toPublicUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    throw new ApiError(400, 'Mật khẩu hiện tại không đúng');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
  });
}

module.exports = { login, getMe, changePassword };
