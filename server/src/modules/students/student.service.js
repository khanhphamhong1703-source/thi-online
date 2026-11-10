const prisma = require('../../config/prisma');
const crypto = require('node:crypto');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { parseDateInput } = require('../../utils/date');
const { normalizeSearchText } = require('../../utils/search');
const { assertClassOwner } = require('../classes/class.service');

const STUDENT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STUDENT_CODE_LENGTH = 6;

function buildSearchText(code, fullName, phone, email) {
  return normalizeSearchText([code, fullName, phone || '', email || ''].join(' '));
}

function normalizeOptional(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function randomStudentCode() {
  let code = '';
  for (let index = 0; index < STUDENT_CODE_LENGTH; index += 1) {
    code += STUDENT_CODE_ALPHABET[crypto.randomInt(STUDENT_CODE_ALPHABET.length)];
  }
  return code;
}

async function generateStudentCode(database = prisma) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomStudentCode();
    const existing = await database.student.findUnique({
      where: { studentCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw new ApiError(503, 'Không thể cấp mã học sinh mới. Vui lòng thử lại.');
}

async function createStudentWithGeneratedCode(classId, payload, dateOfBirth) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const studentCode = await generateStudentCode(transaction);
        const phone = normalizeOptional(payload.phone);
        const email = normalizeOptional(payload.email);
        const student = await transaction.student.create({
          data: {
            studentCode,
            fullName: payload.fullName,
            dateOfBirth,
            phone,
            email,
            searchText: buildSearchText(studentCode, payload.fullName, phone, email),
          },
        });

        await transaction.enrollment.create({ data: { classId, studentId: student.id } });
        return student;
      });
    } catch (error) {
      if (error.code !== 'P2002' && error.code !== 'P2034') throw error;
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
    where.student = { is: { searchText: { contains: buildSearchText('', search, '', '') } } };
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
  const classroom = await assertClassOwner(classId, teacherId);
  const date = parseDateInput(payload.dateOfBirth);
  if (!date) {
    throw new ApiError(422, 'Ngày sinh không hợp lệ');
  }

  const student = await createStudentWithGeneratedCode(classId, payload, date);

  return { student, classroom };
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
  return { student, classrooms: existing.enrollments.map((enrollment) => enrollment.class) };
}

async function removeStudentFromClass(classId, studentId, teacherId) {
  const classroom = await assertClassOwner(classId, teacherId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, enrollments: { some: { classId } } },
    select: { id: true, fullName: true, studentCode: true },
  });

  const result = await prisma.enrollment.deleteMany({ where: { classId, studentId } });
  if (result.count === 0) {
    throw new ApiError(404, 'Học sinh không thuộc lớp học này');
  }

  return { student, classroom };
}

module.exports = {
  generateStudentCode,
  listStudentsInClass,
  addStudentToClass,
  getStudent,
  updateStudent,
  removeStudentFromClass,
  assertStudentAccessible,
  buildSearchText,
  normalizeOptional,
};
