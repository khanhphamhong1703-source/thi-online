const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { normalizeSearchText } = require('../../utils/search');
const { revokeAllSessions, toTokenVersion } = require('../auth/auth.tokens');

const teacherSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { classes: true } },
};

function buildTeacherSearch(fullName, username, email, phone) {
  return normalizeSearchText([fullName, username, email || '', phone || ''].join(' '));
}

function normalizeOptional(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function mapTeacher(teacher) {
  return {
    ...teacher,
    classCount: teacher._count?.classes ?? 0,
    _count: undefined,
  };
}

async function listTeachers({ page, limit, search, status }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = { role: 'TEACHER' };

  if (status === 'active') where.isActive = true;
  if (status === 'locked') where.isActive = false;
  if (search) where.searchText = { contains: normalizeSearchText(search) };

  const [teachers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: teacherSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: teachers.map(mapTeacher),
    pagination: paginationMeta(total, safePage, safeLimit),
  };
}

async function getTeacher(id) {
  const teacher = await prisma.user.findFirst({
    where: { id, role: 'TEACHER' },
    select: {
      ...teacherSelect,
      classes: {
        where: { isArchived: false },
        select: {
          id: true,
          name: true,
          classCode: true,
          schoolYear: true,
          createdAt: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!teacher) {
    throw new ApiError(404, 'Không tìm thấy giáo viên');
  }

  const { classes, ...rest } = teacher;
  return { ...mapTeacher(rest), recentClasses: classes };
}

async function createTeacher(payload) {
  const username = payload.username.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new ApiError(409, 'Username đã tồn tại');
  }

  const password = await bcrypt.hash(payload.password, 10);
  const teacher = await prisma.user.create({
    data: {
      username,
      password,
      fullName: payload.fullName,
      email: normalizeOptional(payload.email),
      phone: normalizeOptional(payload.phone),
      role: 'TEACHER',
      isActive: true,
      searchText: buildTeacherSearch(
        payload.fullName,
        username,
        normalizeOptional(payload.email),
        normalizeOptional(payload.phone)
      ),
    },
    select: teacherSelect,
  });

  return mapTeacher(teacher);
}

async function updateTeacher(id, payload) {
  const existing = await prisma.user.findFirst({ where: { id, role: 'TEACHER' } });
  if (!existing) {
    throw new ApiError(404, 'Không tìm thấy giáo viên');
  }

  const data = {};
  if (payload.fullName !== undefined) data.fullName = payload.fullName;
  if (payload.username !== undefined) {
    const username = payload.username.trim().toLowerCase();
    if (username !== existing.username) {
      const duplicate = await prisma.user.findUnique({ where: { username } });
      if (duplicate) throw new ApiError(409, 'Username đã tồn tại');
    }
    data.username = username;
  }
  if (payload.email !== undefined) data.email = normalizeOptional(payload.email);
  if (payload.phone !== undefined) data.phone = normalizeOptional(payload.phone);

  const fullName = data.fullName ?? existing.fullName;
  const username = data.username ?? existing.username;
  const email = data.email !== undefined ? data.email : existing.email;
  const phone = data.phone !== undefined ? data.phone : existing.phone;
  data.searchText = buildTeacherSearch(fullName, username, email, phone);

  const teacher = await prisma.user.update({
    where: { id },
    data,
    select: teacherSelect,
  });

  return mapTeacher(teacher);
}

async function setTeacherStatus(id, isActive) {
  const teacher = await prisma.user.findFirst({ where: { id, role: 'TEACHER' } });
  if (!teacher) {
    throw new ApiError(404, 'Không tìm thấy giáo viên');
  }

  if (!isActive) {
    await revokeAllSessions(teacher.id, toTokenVersion(teacher));
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: teacherSelect,
  });

  return mapTeacher(updated);
}

async function resetTeacherPassword(id, newPassword) {
  const teacher = await prisma.user.findFirst({ where: { id, role: 'TEACHER' } });
  if (!teacher) {
    throw new ApiError(404, 'Không tìm thấy giáo viên');
  }

  const password = await bcrypt.hash(newPassword, 10);
  await revokeAllSessions(teacher.id, toTokenVersion(teacher), { password });
}

async function getAdminDashboard() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [total, active, locked, newTeachers, recentTeachers] = await Promise.all([
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.user.count({ where: { role: 'TEACHER', isActive: true } }),
    prisma.user.count({ where: { role: 'TEACHER', isActive: false } }),
    prisma.user.count({
      where: { role: 'TEACHER', createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: teacherSelect,
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    totals: { teachers: total, active, locked, newTeachers },
    recentTeachers: recentTeachers.map(mapTeacher),
  };
}

module.exports = {
  buildTeacherSearch,
  listTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  setTeacherStatus,
  resetTeacherPassword,
  getAdminDashboard,
};
