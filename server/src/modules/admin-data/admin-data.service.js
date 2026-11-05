const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');

const teacherSelect = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  createdAt: true,
  _count: { select: { classes: true, exams: true } },
};

async function getSummary() {
  const [
    teachers,
    lockedTeachers,
    classes,
    archivedClasses,
    students,
    exams,
    draftExams,
    publishedExams,
    closedExams,
    attempts,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.user.count({ where: { role: 'TEACHER', isActive: false } }),
    prisma.class.count(),
    prisma.class.count({ where: { isArchived: true } }),
    prisma.student.count(),
    prisma.exam.count(),
    prisma.exam.count({ where: { status: 'DRAFT' } }),
    prisma.exam.count({ where: { status: 'PUBLISHED' } }),
    prisma.exam.count({ where: { status: 'CLOSED' } }),
    prisma.examAttempt.count(),
  ]);

  return {
    teachers: { total: teachers, locked: lockedTeachers },
    classes: { total: classes, archived: archivedClasses },
    students: { total: students },
    exams: {
      total: exams,
      draft: draftExams,
      published: publishedExams,
      closed: closedExams,
    },
    attempts: { total: attempts },
  };
}

async function listTeachers({ page, limit, search, status }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = { role: 'TEACHER' };
  if (status === 'active') where.isActive = true;
  if (status === 'locked') where.isActive = false;
  if (search) where.searchText = { contains: search.toLowerCase() };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: teacherSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, pagination: paginationMeta(total, safePage, safeLimit) };
}

async function listClasses({ page, limit, search, status }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = {};
  if (status === 'active') where.isArchived = false;
  if (status === 'archived') where.isArchived = true;
  if (search) where.searchText = { contains: search.toLowerCase() };

  const [items, total] = await Promise.all([
    prisma.class.findMany({
      where,
      select: {
        id: true,
        name: true,
        classCode: true,
        schoolYear: true,
        isArchived: true,
        createdAt: true,
        teacher: {
          select: { id: true, username: true, fullName: true, isActive: true },
        },
        _count: { select: { enrollments: true, exams: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.class.count({ where }),
  ]);

  return { items, pagination: paginationMeta(total, safePage, safeLimit) };
}

async function listStudents({ page, limit, search }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = {};
  if (search) where.searchText = { contains: search.toLowerCase() };

  const [items, total] = await Promise.all([
    prisma.student.findMany({
      where,
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        createdAt: true,
        _count: { select: { enrollments: true, examAttempts: true } },
        enrollments: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
                classCode: true,
                isArchived: true,
                teacher: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.student.count({ where }),
  ]);

  return { items, pagination: paginationMeta(total, safePage, safeLimit) };
}

async function listExams({ page, limit, search, status }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = {};
  if (status && status !== 'all') where.status = status;
  if (search) where.searchText = { contains: search.toLowerCase() };

  const [items, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      select: {
        id: true,
        title: true,
        subject: true,
        accessCode: true,
        status: true,
        openAt: true,
        closeAt: true,
        createdAt: true,
        teacher: { select: { id: true, username: true, fullName: true } },
        class: {
          select: { id: true, name: true, classCode: true, isArchived: true },
        },
        _count: { select: { attempts: true, questions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.exam.count({ where }),
  ]);

  return { items, pagination: paginationMeta(total, safePage, safeLimit) };
}

async function restoreClass(id) {
  const classroom = await prisma.class.findUnique({ where: { id } });
  if (!classroom) throw new ApiError(404, 'Không tìm thấy lớp học');
  if (!classroom.isArchived) {
    throw new ApiError(400, 'Lớp học đang hoạt động, không cần khôi phục');
  }
  return prisma.class.update({
    where: { id },
    data: { isArchived: false },
  });
}

async function archiveClass(id) {
  const classroom = await prisma.class.findUnique({ where: { id } });
  if (!classroom) throw new ApiError(404, 'Không tìm thấy lớp học');
  if (classroom.isArchived) {
    throw new ApiError(400, 'Lớp học đã được lưu trữ');
  }
  return prisma.class.update({
    where: { id },
    data: { isArchived: true },
  });
}

async function deleteTeacher(id) {
  const teacher = await prisma.user.findFirst({
    where: { id, role: 'TEACHER' },
    select: { id: true, fullName: true },
  });
  if (!teacher) throw new ApiError(404, 'Không tìm thấy giáo viên');

  const [classes, exams] = await Promise.all([
    prisma.class.count({ where: { teacherId: id } }),
    prisma.exam.count({ where: { teacherId: id } }),
  ]);
  if (classes || exams) {
    throw new ApiError(
      409,
      `Không thể xoá giáo viên "${teacher.fullName}" vì còn ${classes} lớp và ${exams} đề thi. Hãy xoá dữ liệu liên quan trước.`
    );
  }
  await prisma.user.delete({ where: { id } });
  return teacher;
}

async function deleteClass(id) {
  const classroom = await prisma.class.findUnique({
    where: { id },
    select: { id: true, name: true, classCode: true },
  });
  if (!classroom) throw new ApiError(404, 'Không tìm thấy lớp học');

  const exams = await prisma.exam.count({
    where: { OR: [{ classId: id }, { classIds: { has: id } }] },
  });
  if (exams) {
    throw new ApiError(
      409,
      `Không thể xoá lớp "${classroom.name}" vì còn ${exams} đề thi tham chiếu. Hãy xoá đề thi trước.`
    );
  }

  const [enrollments] = await prisma.$transaction([
    prisma.enrollment.deleteMany({ where: { classId: id } }),
    prisma.class.delete({ where: { id } }),
  ]);
  return { ...classroom, enrollments: enrollments.count };
}

async function deleteStudent(id) {
  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, fullName: true, studentCode: true },
  });
  if (!student) throw new ApiError(404, 'Không tìm thấy học sinh');

  const [enrollments] = await prisma.$transaction([
    prisma.enrollment.deleteMany({ where: { studentId: id } }),
    prisma.examAttempt.deleteMany({ where: { studentId: id } }),
    prisma.student.delete({ where: { id } }),
  ]);
  return { ...student, enrollments: enrollments.count };
}

async function deleteExam(id) {
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!exam) throw new ApiError(404, 'Không tìm thấy đề thi');

  const [attempts] = await prisma.$transaction([
    prisma.examAttempt.deleteMany({ where: { examId: id } }),
    prisma.question.deleteMany({ where: { examId: id } }),
    prisma.exam.delete({ where: { id } }),
  ]);
  return { ...exam, attempts: attempts.count };
}

module.exports = {
  getSummary,
  listTeachers,
  listClasses,
  listStudents,
  listExams,
  restoreClass,
  archiveClass,
  deleteTeacher,
  deleteClass,
  deleteStudent,
  deleteExam,
};
