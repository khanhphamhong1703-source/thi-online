const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');

function buildSearchText(name, classCode, schoolYear) {
  return [name, classCode, schoolYear].join(' ').toLowerCase();
}

function normalizeOptional(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

async function assertClassOwner(classId, teacherId) {
  const classroom = await prisma.class.findFirst({
    where: { id: classId, teacherId },
    include: { _count: { select: { enrollments: true } } },
  });

  if (!classroom) {
    throw new ApiError(404, 'Không tìm thấy lớp học');
  }

  return classroom;
}

async function listClasses(teacherId, { page, limit, search }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = { teacherId, isArchived: false };

  if (search) {
    where.searchText = { contains: search.toLowerCase() };
  }

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.class.count({ where }),
  ]);

  return {
    items: classes,
    pagination: paginationMeta(total, safePage, safeLimit),
  };
}

async function getClass(classId, teacherId) {
  return assertClassOwner(classId, teacherId);
}

async function createClass(teacherId, payload) {
  const classCode = payload.classCode.trim().toUpperCase();
  const duplicate = await prisma.class.findFirst({
    where: { teacherId, classCode },
  });

  if (duplicate) {
    throw new ApiError(409, 'Mã lớp đã tồn tại trong tài khoản của bạn');
  }

  return prisma.class.create({
    data: {
      name: payload.name,
      classCode,
      schoolYear: payload.schoolYear,
      description: normalizeOptional(payload.description),
      teacherId,
      searchText: buildSearchText(payload.name, classCode, payload.schoolYear),
    },
    include: { _count: { select: { enrollments: true } } },
  });
}

async function updateClass(classId, teacherId, payload) {
  const existing = await assertClassOwner(classId, teacherId);
  if (existing.isArchived) {
    throw new ApiError(400, 'Lớp học đã được lưu trữ, không thể chỉnh sửa');
  }

  const data = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.schoolYear !== undefined) data.schoolYear = payload.schoolYear;
  if (payload.description !== undefined) data.description = normalizeOptional(payload.description);

  if (payload.classCode !== undefined) {
    const classCode = payload.classCode.trim().toUpperCase();
    if (classCode !== existing.classCode) {
      const duplicate = await prisma.class.findFirst({
        where: { teacherId, classCode, id: { not: classId } },
      });
      if (duplicate) {
        throw new ApiError(409, 'Mã lớp đã tồn tại trong tài khoản của bạn');
      }
    }
    data.classCode = classCode;
  }

  const name = data.name ?? existing.name;
  const classCode = data.classCode ?? existing.classCode;
  const schoolYear = data.schoolYear ?? existing.schoolYear;
  data.searchText = buildSearchText(name, classCode, schoolYear);

  return prisma.class.update({
    where: { id: classId },
    data,
    include: { _count: { select: { enrollments: true } } },
  });
}

async function archiveClass(classId, teacherId) {
  const existing = await assertClassOwner(classId, teacherId);
  if (existing.isArchived) {
    throw new ApiError(400, 'Lớp học đã được lưu trữ trước đó');
  }
  return prisma.class.update({
    where: { id: classId },
    data: { isArchived: true },
    include: { _count: { select: { enrollments: true } } },
  });
}

async function getTeacherDashboard(teacherId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalClasses, totalStudents, newClasses, recentClasses] = await Promise.all([
    prisma.class.count({ where: { teacherId, isArchived: false } }),
    prisma.student.count({
      where: {
        enrollments: {
          some: { class: { teacherId, isArchived: false } },
        },
      },
    }),
    prisma.class.count({
      where: {
        teacherId,
        isArchived: false,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.class.findMany({
      where: { teacherId, isArchived: false },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    totals: { classes: totalClasses, students: totalStudents, newClasses },
    recentClasses,
  };
}

module.exports = {
  assertClassOwner,
  listClasses,
  getClass,
  createClass,
  updateClass,
  archiveClass,
  getTeacherDashboard,
};
