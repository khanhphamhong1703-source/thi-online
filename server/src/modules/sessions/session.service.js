const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { normalizeSearchText } = require('../../utils/search');
const { parseUserAgent } = require('../activity/activity.service');
const { revokeAllSessions, toTokenVersion } = require('../auth/auth.tokens');

const SESSION_STATUSES = ['ALL', 'ACTIVE', 'REVOKED', 'EXPIRED'];

function sessionSelect() {
  return {
    id: true,
    userId: true,
    userAgent: true,
    ip: true,
    createdAt: true,
    expiresAt: true,
    revokedAt: true,
    user: {
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    },
  };
}

function buildBaseWhere({ search, teacherId }) {
  const userWhere = { role: 'TEACHER' };
  if (search) userWhere.searchText = { contains: normalizeSearchText(search) };

  const where = { user: { is: userWhere } };
  if (teacherId) where.userId = teacherId;
  return where;
}

function statusWhere(baseWhere, status, now) {
  if (status === 'ACTIVE') {
    return { ...baseWhere, revokedAt: { isSet: false }, expiresAt: { gt: now } };
  }
  if (status === 'REVOKED') {
    return { ...baseWhere, revokedAt: { isSet: true } };
  }
  if (status === 'EXPIRED') {
    return { ...baseWhere, revokedAt: { isSet: false }, expiresAt: { lte: now } };
  }
  return baseWhere;
}

function mapSession(session, now) {
  const { device, browser } = parseUserAgent(session.userAgent);
  return {
    id: session.id,
    user: session.user,
    device,
    browser,
    ip: session.ip ? String(session.ip).replace(/^::ffff:/, '') : null,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    status: session.revokedAt
      ? 'REVOKED'
      : session.expiresAt <= now
        ? 'EXPIRED'
        : 'ACTIVE',
  };
}

async function listSessions(filters) {
  const { page, limit, skip } = getPagination(filters.page, filters.limit);
  const now = new Date();
  const baseWhere = buildBaseWhere(filters);
  const where = statusWhere(baseWhere, filters.status, now);

  const [items, total, active, revoked, expired] = await Promise.all([
    prisma.refreshToken.findMany({
      where,
      select: sessionSelect(),
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.refreshToken.count({ where }),
    prisma.refreshToken.count({ where: statusWhere(baseWhere, 'ACTIVE', now) }),
    prisma.refreshToken.count({ where: statusWhere(baseWhere, 'REVOKED', now) }),
    prisma.refreshToken.count({ where: statusWhere(baseWhere, 'EXPIRED', now) }),
  ]);

  return {
    items: items.map((item) => mapSession(item, now)),
    pagination: paginationMeta(total, page, limit),
    summary: { active, revoked, expired, total: active + revoked + expired },
  };
}

async function deleteSession(id) {
  const session = await prisma.refreshToken.findFirst({
    where: { id, user: { is: { role: 'TEACHER' } } },
    select: sessionSelect(),
  });
  if (!session) {
    throw new ApiError(404, 'Không tìm thấy phiên đăng nhập');
  }

  try {
    await prisma.refreshToken.delete({ where: { id } });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new ApiError(404, 'Không tìm thấy phiên đăng nhập');
    }
    throw error;
  }
  return mapSession(session, new Date());
}

async function revokeAllForUser(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: 'TEACHER' },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      tokenVersion: true,
    },
  });
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy tài khoản');
  }

  const activeSessions = await prisma.refreshToken.count({
    where: { userId, revokedAt: { isSet: false }, expiresAt: { gt: new Date() } },
  });
  const tokenVersion = await revokeAllSessions(user.id, toTokenVersion(user));

  return {
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    },
    activeSessions,
    tokenVersion,
  };
}

module.exports = {
  SESSION_STATUSES,
  listSessions,
  deleteSession,
  revokeAllForUser,
};
