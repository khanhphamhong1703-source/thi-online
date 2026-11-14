const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');

const REFRESH_TOKEN_BYTES = 48;

function toTokenVersion(user) {
  return Number.isInteger(user?.tokenVersion) ? user.tokenVersion : 0;
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createRawRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      tv: toTokenVersion(user),
      scope: 'ACCESS',
    },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60 }
  );
}

function refreshExpiryDate() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function sessionMeta(meta = {}) {
  return {
    userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 255) : null,
    ip: meta.ip ? String(meta.ip).slice(0, 64) : null,
  };
}

async function pruneExpiredTokens(userId) {
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
}

async function createRefreshToken(user, meta) {
  const rawToken = createRawRefreshToken();
  const { userAgent, ip } = sessionMeta(meta);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(rawToken),
      userId: user.id,
      tokenVersion: toTokenVersion(user),
      expiresAt: refreshExpiryDate(),
      userAgent,
      ip,
    },
  });

  return rawToken;
}

async function issueSession(user, meta) {
  await pruneExpiredTokens(user.id);
  const refreshToken = await createRefreshToken(user, meta);
  return { accessToken: signAccessToken(user), refreshToken };
}

async function rotateRefreshToken(rawToken, meta) {
  if (!rawToken) {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const tokenHash = hashRefreshToken(rawToken);
  const current = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!current) {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  if (current.revokedAt || current.expiresAt <= new Date()) {
    if (!current.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { id: current.id, revokedAt: { isSet: false } },
        data: { revokedAt: new Date() },
      });
    }
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const user = current.user;
  if (!user || !user.isActive || current.tokenVersion !== toTokenVersion(user)) {
    await prisma.refreshToken.updateMany({
      where: { id: current.id, revokedAt: { isSet: false } },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(
      user && !user.isActive ? 403 : 401,
      user && !user.isActive
        ? 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'
        : 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
    );
  }

  const nextRawToken = createRawRefreshToken();
  const nextHash = hashRefreshToken(nextRawToken);
  const revoked = await prisma.refreshToken.updateMany({
    where: { id: current.id, revokedAt: { isSet: false } },
    data: { revokedAt: new Date(), replacedByHash: nextHash },
  });

  if (revoked.count === 0) {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }

  const { userAgent, ip } = sessionMeta(meta);
  await prisma.refreshToken.create({
    data: {
      tokenHash: nextHash,
      userId: user.id,
      tokenVersion: toTokenVersion(user),
      expiresAt: refreshExpiryDate(),
      userAgent,
      ip,
    },
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken: nextRawToken,
    user,
  };
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(rawToken), revokedAt: { isSet: false } },
    data: { revokedAt: new Date() },
  });
}

async function revokeAllSessions(userId, currentVersion = 0, userData = {}) {
  const nextVersion = Number(currentVersion || 0) + 1;
  await prisma.user.update({
    where: { id: userId },
    data: { ...userData, tokenVersion: nextVersion },
  });
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: { isSet: false } },
    data: { revokedAt: new Date() },
  });
  return nextVersion;
}

module.exports = {
  toTokenVersion,
  signAccessToken,
  issueSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllSessions,
};
