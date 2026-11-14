const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { toPublicUser } = require('../../utils/serialize');
const {
  issueSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllSessions,
  toTokenVersion,
} = require('./auth.tokens');

async function login({ username, password, expectedRole }, meta) {
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

  const session = await issueSession(user, meta);

  return { ...session, user: toPublicUser(user) };
}

async function refresh(rawRefreshToken, meta) {
  const session = await rotateRefreshToken(rawRefreshToken, meta);
  return { ...session, user: toPublicUser(session.user) };
}

async function logout(rawRefreshToken) {
  await revokeRefreshToken(rawRefreshToken);
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }
  return toPublicUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }, meta) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    throw new ApiError(400, 'Mật khẩu hiện tại không đúng');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const nextVersion = await revokeAllSessions(user.id, toTokenVersion(user), {
    password: passwordHash,
  });
  return issueSession({ ...user, password: passwordHash, tokenVersion: nextVersion }, meta);
}

module.exports = { login, refresh, logout, getMe, changePassword };
