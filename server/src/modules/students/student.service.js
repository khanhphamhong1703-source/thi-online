const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { parseDateInput } = require('../../utils/date');
const { assertClassOwner } = require('../classes/class.service');

const STUDENT_CODE_PREFIX = 'HS';
const STUDENT_CODE_MAX = 9999;

function buildSearchText(code, fullName, phone, email) {
  return [code, fullName, phone || '', email || ''].join(' ').toLowerCase();
}

function normalizeOptional(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

async function generateStudentCode() {
  const students = await prisma.student.findMany({
    where: { studentCode: { startsWith: STUDENT_CODE_PREFIX } },
    select: { studentCode: true },
  });

  let maxNumber = 0;
  for (const { studentCode } of students) {
    const match = new RegExp(`^${STUDENT_CODE_PREFIX}(\\d{4})$`).exec(studentCode);
    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  }

  const nextNumber = maxNumber + 1;
  if (nextNumber > STUDENT_CODE_MAX) {
    throw new ApiError(409, 'Đã sử dụng hết dải mã học sinh HS0001–HS9999');
  }

  return `${STUDENT_CODE_PREFIX}${String(nextNumber).padStart(4, '0')}`;
}

async function createStudentWithGeneratedCode(payload, dateOfBirth) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const studentCode = await generateStudentCode();
    try {
      return await prisma.student.create({
        data: {
          studentCode,
          fullName: payload.fullName,
          dateOfBirth,
          phone: normalizeOptional(payload.phone),
          email: normalizeOptional(payload.email),
          searchText: buildSearchText(
            studentCode,
            payload.fullName,
            normalizeOptional(payload.phone),
            normalizeOptional(payload.email)
          ),
        },
      });
    } catch (error) {
      if (error.code !== 'P2002') throw error;
    }
  }

  throw new ApiError(503, 'Không thể cấp mã học sinh mới. Vui lòng thử lại.');
}

async function assertStudentAccessible(studentId, teacherId) {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      enrollments: { some: { class: { teacherId } } },
    },
    include: {
      enrollments: {
        where: { class: { teacherId } },
        include: {
          class: {
            select: { id: true, name: true, classCode: true, schoolYear: true, isArchived: true },
          },
        },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, 'Không tìm thấy học sinh');
  }

  return student;
}

async function listStudentsInClass(classId, teacherId, { page, limit, search }) {
  await assertClassOwner(classId, teacherId);

  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = { classId };

  if (search) {
    where.student = { is: { searchText: { contains: search.toLowerCase() } } };
  }

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      include: { student: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.enrollment.count({ where }),
  ]);

  return {
    items: enrollments.map((enrollment) => ({
      ...enrollment.student,
      enrolledAt: enrollment.createdAt,
    })),
    pagination: paginationMeta(total, safePage, safeLimit),
  };
}

async function addStudentToClass(classId, teacherId, payload) {
  await assertClassOwner(classId, teacherId);
  const date = parseDateInput(payload.dateOfBirth);
  if (!date) {
    throw new ApiError(422, 'Ngày sinh không hợp lệ');
  }

  const student = await createStudentWithGeneratedCode(payload, date);

  try {
    await prisma.enrollment.create({ data: { classId, studentId: student.id } });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'Học sinh này đã thuộc lớp hiện tại');
    }
    throw error;
  }

  return { student };
}

async function getStudent(studentId, teacherId) {
  const student = await assertStudentAccessible(studentId, teacherId);
  const { enrollments, ...rest } = student;
  return {
    ...rest,
    classes: enrollments.map((enrollment) => enrollment.class),
  };
}

async function updateStudent(studentId, teacherId, payload) {
  const existing = await assertStudentAccessible(studentId, teacherId);
  const data = {};

  if (payload.fullName !== undefined) data.fullName = payload.fullName;
  if (payload.dateOfBirth !== undefined) {
    const date = parseDateInput(payload.dateOfBirth);
    if (!date) throw new ApiError(422, 'Ngày sinh không hợp lệ');
    data.dateOfBirth = date;
  }
  if (payload.phone !== undefined) data.phone = normalizeOptional(payload.phone);
  if (payload.email !== undefined) data.email = normalizeOptional(payload.email);

  const studentCode = existing.studentCode;
  const fullName = data.fullName ?? existing.fullName;
  const phone = data.phone !== undefined ? data.phone : existing.phone;
  const email = data.email !== undefined ? data.email : existing.email;
  data.searchText = buildSearchText(studentCode, fullName, phone, email);

  const student = await prisma.student.update({ where: { id: studentId }, data });
  return { student };
}

async function removeStudentFromClass(classId, studentId, teacherId) {
  await assertClassOwner(classId, teacherId);

  const result = await prisma.enrollment.deleteMany({ where: { classId, studentId } });
  if (result.count === 0) {
    throw new ApiError(404, 'Học sinh không thuộc lớp học này');
  }
}

module.exports = {
  listStudentsInClass,
  addStudentToClass,
  getStudent,
  updateStudent,
  removeStudentFromClass,
  assertStudentAccessible,
  buildSearchText,
  normalizeOptional,
};
