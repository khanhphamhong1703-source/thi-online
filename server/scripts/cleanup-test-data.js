const prisma = require('../src/config/prisma');

const TEST_USERNAME_PREFIXES = [
  'admin.data.',
  'archive.class.',
  'attempt.detail.',
  'attempt.limit.',
  'class.filter.',
  'ui.form.',
  'exit.test.',
  'form.compact.',
  'lookup.flow.',
  'profile.test.',
  'expiry.teacher.',
  'section.teacher.',
  'multi.class.',
  'student.code.',
  'no.class.',
  'question.types.',
  'results.teacher.',
  'import.teacher.',
  'docx.teacher.',
  'exam.teacher.',
  'exam.other.',
  'gv.a.',
  'gv.b.',
];

const isTestUsername = (username) =>
  TEST_USERNAME_PREFIXES.some((prefix) => username.startsWith(prefix));

async function collect() {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: { id: true, username: true },
  });
  const testTeachers = teachers.filter((teacher) => isTestUsername(teacher.username));
  const teacherIds = testTeachers.map((teacher) => teacher.id);

  const classes = await prisma.class.findMany({
    where: { teacherId: { in: teacherIds } },
    select: { id: true },
  });
  const classIds = classes.map((item) => item.id);

  const exams = await prisma.exam.findMany({
    where: { teacherId: { in: teacherIds } },
    select: { id: true },
  });
  const examIds = exams.map((item) => item.id);

  const enrollments = await prisma.enrollment.findMany({ select: { classId: true, studentId: true } });
  const testClassIds = new Set(classIds);
  const testEnrollmentIds = enrollments
    .filter((item) => testClassIds.has(item.classId))
    .map((item) => item.id);
  const testStudentIds = [
    ...new Set(
      enrollments
        .filter((item) => testClassIds.has(item.classId))
        .map((item) => item.studentId)
    ),
  ].filter((studentId) => {
    const studentEnrollments = enrollments.filter((item) => item.studentId === studentId);
    return studentEnrollments.every((item) => testClassIds.has(item.classId));
  });

  const enrolledIds = new Set(enrollments.map((item) => item.studentId));
  const orphanStudents = await prisma.student.findMany({
    where: {
      id: { notIn: [...enrolledIds] },
      enrollments: { none: {} },
      examAttempts: { none: {} },
    },
    select: { id: true },
  });

  return {
    testTeachers,
    classIds,
    examIds,
    testStudentIds,
    orphanStudentIds: orphanStudents.map((item) => item.id),
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const data = await collect();

  const studentIds = [...new Set([...data.testStudentIds, ...data.orphanStudentIds])];

  const counts = {
    teachers: data.testTeachers.length,
    classes: data.classIds.length,
    exams: data.examIds.length,
    questions: await prisma.question.count({ where: { examId: { in: data.examIds } } }),
    attempts: await prisma.examAttempt.count({ where: { examId: { in: data.examIds } } }),
    enrollments: await prisma.enrollment.count({ where: { classId: { in: data.classIds } } }),
    students: studentIds.length,
  };

  console.log(apply ? 'Xoá dữ liệu test:' : 'Dry-run — dữ liệu test sẽ bị xoá:');
  console.log(JSON.stringify(counts, null, 2));

  if (!apply) {
    console.log('Thêm --apply để thực hiện.');
    return;
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const attempts = await tx.examAttempt.deleteMany({ where: { examId: { in: data.examIds } } });
    const questions = await tx.question.deleteMany({ where: { examId: { in: data.examIds } } });
    const exams = await tx.exam.deleteMany({ where: { id: { in: data.examIds } } });
    const enrollments = await tx.enrollment.deleteMany({ where: { classId: { in: data.classIds } } });
    const classes = await tx.class.deleteMany({ where: { id: { in: data.classIds } } });
    const students = await tx.student.deleteMany({ where: { id: { in: studentIds } } });
    const teachers = await tx.user.deleteMany({ where: { id: { in: data.testTeachers.map((t) => t.id) } } });
    return {
      attempts: attempts.count,
      questions: questions.count,
      exams: exams.count,
      enrollments: enrollments.count,
      classes: classes.count,
      students: students.count,
      teachers: teachers.count,
    };
  });

  console.log('Đã xoá:', JSON.stringify(deleted, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
