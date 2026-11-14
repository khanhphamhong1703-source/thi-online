const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { normalizeSearchText } = require('../../utils/search');
const activityService = require('../activity/activity.service');

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
  const now = new Date();
  const [
    teachers,
    lockedTeachers,
    classes,
    archivedClasses,
    students,
    exams,
    openExams,
    attempts,
  ] =
    await Promise.all([
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'TEACHER', isActive: false } }),
      prisma.class.count(),
      prisma.class.count({ where: { isArchived: true } }),
      prisma.student.count(),
      prisma.exam.count(),
      prisma.exam.count({
        where: {
          openAt: { lte: now },
          OR: [{ closeAt: null }, { closeAt: { gt: now } }],
        },
      }),
      prisma.examAttempt.count(),
    ]);

  return {
    teachers: { total: teachers, locked: lockedTeachers },
    classes: { total: classes, archived: archivedClasses },
    students: { total: students },
    exams: { total: exams, open: openExams },
    attempts: { total: attempts },
  };
}

async function listTeachers({ page, limit, search, status }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = { role: 'TEACHER' };
  if (status === 'active') where.isActive = true;
  if (status === 'locked') where.isActive = false;
  if (search) where.searchText = { contains: normalizeSearchText(search) };

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

async function listClasses({ page, limit, search, status, teacherId }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = {};
  if (status === 'active') where.isArchived = false;
  if (status === 'archived') where.isArchived = true;
  if (teacherId) where.teacherId = teacherId;
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
  if (search) where.searchText = { contains: normalizeSearchText(search) };

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

async function listExams({ page, limit, search }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = {};
  if (search) where.searchText = { contains: search.toLowerCase() };

  const [items, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      select: {
        id: true,
        title: true,
        subject: true,
        accessCode: true,
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

async function collectStudentsForClasses(database, classIds) {
  const enrollments = classIds.length
    ? await database.enrollment.findMany({
        where: { classId: { in: classIds } },
        select: { studentId: true },
      })
    : [];
  const candidateIds = [...new Set(enrollments.map((item) => item.studentId))];
  if (!candidateIds.length) {
    return { deletableIds: [], sharedIds: [] };
  }

  const allEnrollments = await database.enrollment.findMany({
    where: { studentId: { in: candidateIds } },
    select: { studentId: true, classId: true },
  });
  const classIdSet = new Set(classIds);
  const deletableIds = [];
  const sharedIds = [];

  for (const studentId of candidateIds) {
    const own = allEnrollments.filter((item) => item.studentId === studentId);
    if (own.every((item) => classIdSet.has(item.classId))) {
      deletableIds.push(studentId);
    } else {
      sharedIds.push(studentId);
    }
  }

  return { deletableIds, sharedIds };
}

function detachedClassRefs(exam, removedClassIds) {
  const removed = new Set(removedClassIds);
  const current = Array.isArray(exam.classIds) ? exam.classIds : [];
  const remaining = current.filter((classId) => !removed.has(classId));
  const nextClassId =
    exam.classId && removed.has(exam.classId)
      ? remaining[0] || null
      : exam.classId || remaining[0] || null;
  return { remaining, nextClassId };
}

async function deleteTeacher(id) {
  const teacher = await prisma.user.findFirst({
    where: { id, role: 'TEACHER' },
    select: { id: true, fullName: true },
  });
  if (!teacher) throw new ApiError(404, 'Không tìm thấy giáo viên');

  const classes = await prisma.class.findMany({
    where: { teacherId: id },
    select: { id: true },
  });
  const classIds = classes.map((item) => item.id);
  const { deletableIds } = await collectStudentsForClasses(prisma, classIds);
  const exams = await prisma.exam.findMany({
    where: { teacherId: id },
    select: { id: true },
  });
  const examIds = exams.map((item) => item.id);

  const result = await prisma.$transaction(async (transaction) => {
    const attemptFilters = [];
    if (deletableIds.length) attemptFilters.push({ studentId: { in: deletableIds } });
    if (examIds.length) attemptFilters.push({ examId: { in: examIds } });
    const attempts = attemptFilters.length
      ? await transaction.examAttempt.deleteMany({ where: { OR: attemptFilters } })
      : { count: 0 };

    const questions = examIds.length
      ? await transaction.question.deleteMany({ where: { examId: { in: examIds } } })
      : { count: 0 };
    const removedExams = examIds.length
      ? await transaction.exam.deleteMany({ where: { id: { in: examIds } } })
      : { count: 0 };

    const enrollments = await transaction.enrollment.deleteMany({
      where: {
        OR: [
          { classId: { in: classIds } },
          { studentId: { in: deletableIds } },
        ],
      },
    });

    const students = await transaction.student.deleteMany({
      where: { id: { in: deletableIds } },
    });
    const removedClasses = await transaction.class.deleteMany({
      where: { id: { in: classIds } },
    });
    await transaction.refreshToken.deleteMany({ where: { userId: id } });
    await transaction.user.delete({ where: { id } });

    return {
      ...teacher,
      classes: removedClasses.count,
      students: students.count,
      attempts: attempts.count,
      enrollments: enrollments.count,
      exams: removedExams.count,
      questions: questions.count,
    };
  });

  return result;
}

async function deleteClass(id) {
  const classroom = await prisma.class.findUnique({
    where: { id },
    select: { id: true, name: true, classCode: true },
  });
  if (!classroom) throw new ApiError(404, 'Không tìm thấy lớp học');

  const { deletableIds } = await collectStudentsForClasses(prisma, [id]);

  return await prisma.$transaction(async (transaction) => {
    const attempts = deletableIds.length
      ? await transaction.examAttempt.deleteMany({
          where: { studentId: { in: deletableIds } },
        })
      : { count: 0 };

    const enrollments = await transaction.enrollment.deleteMany({
      where: {
        OR: [{ classId: id }, { studentId: { in: deletableIds } }],
      },
    });

    const exams = await transaction.exam.findMany({
      where: { OR: [{ classId: id }, { classIds: { has: id } }] },
      select: { id: true, classId: true, classIds: true },
    });
    for (const exam of exams) {
      const { remaining, nextClassId } = detachedClassRefs(exam, [id]);
      await transaction.exam.update({
        where: { id: exam.id },
        data: { classIds: remaining, classId: nextClassId },
      });
    }

    const students = await transaction.student.deleteMany({
      where: { id: { in: deletableIds } },
    });
    await transaction.class.delete({ where: { id } });

    return {
      ...classroom,
      exams: exams.length,
      students: students.count,
      attempts: attempts.count,
      enrollments: enrollments.count,
    };
  });
}

async function deleteStudent(id) {
  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, fullName: true, studentCode: true },
  });
  if (!student) throw new ApiError(404, 'Không tìm thấy học sinh');

  const [enrollments, attempts] = await prisma.$transaction([
    prisma.enrollment.deleteMany({ where: { studentId: id } }),
    prisma.examAttempt.deleteMany({ where: { studentId: id } }),
    prisma.student.delete({ where: { id } }),
  ]);
  return { ...student, enrollments: enrollments.count, attempts: attempts.count };
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

async function getDeleteImpact(type, id) {
  if (type === 'teacher') {
    const teacher = await prisma.user.findFirst({
      where: { id, role: 'TEACHER' },
      select: { id: true, fullName: true, username: true },
    });
    if (!teacher) throw new ApiError(404, 'Không tìm thấy giáo viên');

    const classes = await prisma.class.findMany({
      where: { teacherId: id },
      select: { id: true },
    });
    const classIds = classes.map((item) => item.id);
    const { deletableIds, sharedIds } = await collectStudentsForClasses(prisma, classIds);
    const exams = await prisma.exam.findMany({
      where: { teacherId: id },
      select: { id: true },
    });
    const examIds = exams.map((item) => item.id);
    const attemptFilters = [];
    if (deletableIds.length) attemptFilters.push({ studentId: { in: deletableIds } });
    if (examIds.length) attemptFilters.push({ examId: { in: examIds } });
    const [questions, attempts, inProgress] = await Promise.all([
      examIds.length
        ? prisma.question.count({ where: { examId: { in: examIds } } })
        : 0,
      attemptFilters.length
        ? prisma.examAttempt.count({ where: { OR: attemptFilters } })
        : 0,
      attemptFilters.length
        ? prisma.examAttempt.count({
            where: { OR: attemptFilters, status: 'IN_PROGRESS' },
          })
        : 0,
    ]);

    const warnings = [
      'Tài khoản giáo viên sẽ bị xoá vĩnh viễn; phiên đăng nhập hiện tại mất hiệu lực.',
      `${classIds.length} lớp học và ${deletableIds.length} học sinh trong lớp sẽ bị xoá cùng toàn bộ bài làm.`,
      `${examIds.length} đề thi do giáo viên tạo (${questions} câu hỏi) sẽ bị xoá cùng toàn bộ điểm đã ghi.`,
    ];
    if (sharedIds.length) {
      warnings.push(
        `${sharedIds.length} học sinh còn thuộc lớp khác sẽ được giữ hồ sơ, chỉ mất ghi danh ở lớp này.`
      );
    }
    if (inProgress > 0) {
      warnings.unshift(
        `Đang có ${inProgress} lượt làm bài dở: sẽ bị huỷ cùng học sinh đang làm.`
      );
    }

    return {
      type,
      id,
      name: teacher.fullName,
      code: teacher.username,
      blocked: false,
      blockedReason: null,
      counts: {
        classes: classIds.length,
        students: deletableIds.length,
        sharedStudents: sharedIds.length,
        attempts,
        exams: examIds.length,
        questions,
        inProgress,
      },
      warnings,
    };
  }

  if (type === 'class') {
    const classroom = await prisma.class.findUnique({
      where: { id },
      select: { id: true, name: true, classCode: true },
    });
    if (!classroom) throw new ApiError(404, 'Không tìm thấy lớp học');

    const { deletableIds, sharedIds } = await collectStudentsForClasses(prisma, [id]);
    const [exams, attempts, inProgress] = await Promise.all([
      prisma.exam.count({ where: { OR: [{ classId: id }, { classIds: { has: id } }] } }),
      deletableIds.length
        ? prisma.examAttempt.count({ where: { studentId: { in: deletableIds } } })
        : 0,
      deletableIds.length
        ? prisma.examAttempt.count({
            where: { studentId: { in: deletableIds }, status: 'IN_PROGRESS' },
          })
        : 0,
    ]);

    const warnings = [
      `${deletableIds.length} học sinh trong lớp và toàn bộ bài làm sẽ bị xoá.`,
      'Đề thi không bị xoá; chỉ bỏ lớp này khỏi danh sách lớp của đề.',
    ];
    if (sharedIds.length) {
      warnings.push(
        `${sharedIds.length} học sinh còn thuộc lớp khác sẽ được giữ hồ sơ, chỉ mất ghi danh ở lớp này.`
      );
    }
    if (inProgress > 0) {
      warnings.unshift(
        `Đang có ${inProgress} lượt làm bài dở: sẽ bị huỷ cùng học sinh đang làm.`
      );
    }

    return {
      type,
      id,
      name: classroom.name,
      code: classroom.classCode,
      blocked: false,
      blockedReason: null,
      counts: {
        students: deletableIds.length,
        sharedStudents: sharedIds.length,
        attempts,
        exams,
        inProgress,
      },
      warnings,
    };
  }

  if (type === 'student') {
    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true, fullName: true, studentCode: true },
    });
    if (!student) throw new ApiError(404, 'Không tìm thấy học sinh');

    const [enrollments, attempts, inProgress, distinctExams] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId: id },
        select: { classId: true },
      }),
      prisma.examAttempt.count({ where: { studentId: id } }),
      prisma.examAttempt.count({ where: { studentId: id, status: 'IN_PROGRESS' } }),
      prisma.examAttempt.findMany({
        where: { studentId: id },
        select: { examId: true },
        distinct: ['examId'],
      }),
    ]);

    const warnings = [
      'Toàn bộ điểm và lượt thi của học sinh ở mọi lớp sẽ bị xoá vĩnh viễn.',
      `Mã học sinh "${student.studentCode}" được giải phóng; phiếu mã đã phát trước đây không còn hiệu lực.`,
    ];
    if (inProgress > 0) {
      warnings.unshift(
        `Đang có ${inProgress} lượt làm bài dở: học sinh sẽ bị đẩy ra khỏi phòng thi và bài làm bị huỷ.`
      );
    }

    return {
      type,
      id,
      name: student.fullName,
      code: student.studentCode,
      blocked: false,
      blockedReason: null,
      counts: {
        enrollments: enrollments.length,
        classes: new Set(enrollments.map((item) => item.classId)).size,
        attempts,
        inProgress,
        exams: distinctExams.length,
      },
      warnings,
    };
  }

  if (type === 'exam') {
    const exam = await prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        accessCode: true,
        classId: true,
        classIds: true,
      },
    });
    if (!exam) throw new ApiError(404, 'Không tìm thấy đề thi');

    const classIds = exam.classIds?.length
      ? exam.classIds
      : exam.classId
        ? [exam.classId]
        : [];
    const [questions, attempts, inProgress, distinctStudents] = await Promise.all([
      prisma.question.count({ where: { examId: id } }),
      prisma.examAttempt.count({ where: { examId: id } }),
      prisma.examAttempt.count({ where: { examId: id, status: 'IN_PROGRESS' } }),
      prisma.examAttempt.findMany({
        where: { examId: id },
        select: { studentId: true },
        distinct: ['studentId'],
      }),
    ]);

    const warnings = [
      'Toàn bộ câu hỏi, lượt làm bài và điểm của đề sẽ bị xoá vĩnh viễn.',
      `Mã ca thi "${exam.accessCode}" được giải phóng; mã đã phát trước đây có thể trùng đề khác.`,
    ];
    if (inProgress > 0) {
      warnings.unshift(
        `Đang có ${inProgress} học sinh làm bài: bài làm sẽ bị huỷ ngay lập tức.`
      );
    }

    return {
      type,
      id,
      name: exam.title,
      code: exam.accessCode,
      blocked: false,
      blockedReason: null,
      counts: {
        questions,
        attempts,
        inProgress,
        classes: new Set(classIds).size,
        students: distinctStudents.length,
      },
      warnings,
    };
  }

  throw new ApiError(400, 'Loại dữ liệu không hợp lệ');
}

module.exports = {
  getSummary,
  listActivity: activityService.listActivity,
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
  getDeleteImpact,
};
