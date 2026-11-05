const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');

const classSelect = {
  id: true,
  name: true,
  classCode: true,
  schoolYear: true,
};

function getExamClassIds(exam) {
  if (Array.isArray(exam.classIds) && exam.classIds.length) return exam.classIds;
  return exam.classId ? [exam.classId] : [];
}

async function getClassesByIds(classIds) {
  const uniqueIds = [...new Set(classIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const classes = await prisma.class.findMany({
    where: { id: { in: uniqueIds } },
    select: classSelect,
  });
  const classMap = new Map(classes.map((classroom) => [classroom.id, classroom]));
  return uniqueIds.map((id) => classMap.get(id)).filter(Boolean);
}

async function getClassStudentIds(classId) {
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    select: { studentId: true },
  });
  return [...new Set(enrollments.map((enrollment) => enrollment.studentId))];
}

async function assertOwnedClasses(teacherId, classIds) {
  const uniqueIds = [...new Set(classIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const classes = await prisma.class.findMany({
    where: { id: { in: uniqueIds }, teacherId },
    select: classSelect,
  });
  if (classes.length !== uniqueIds.length) {
    throw new ApiError(404, 'Một hoặc nhiều lớp học không thuộc quyền quản lý của bạn');
  }

  const classMap = new Map(classes.map((classroom) => [classroom.id, classroom]));
  return uniqueIds.map((id) => classMap.get(id)).filter(Boolean);
}

module.exports = {
  classSelect,
  getExamClassIds,
  getClassesByIds,
  getClassStudentIds,
  assertOwnedClasses,
};
