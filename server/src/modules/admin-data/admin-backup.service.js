const { z } = require('zod');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');

const BACKUP_FORMAT = 'vieexam-backup';
const BACKUP_VERSION = 1;

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID không hợp lệ');
const date = z.coerce.date();
const nullableText = z.string().nullable().optional();

const userSchema = z.object({
  id: objectId,
  username: z.string().min(1),
  password: z.string().regex(/^\$2[aby]\$\d{2}\$.{53}$/, 'Mật khẩu đã mã hoá không hợp lệ'),
  fullName: z.string().min(1),
  email: nullableText,
  phone: nullableText,
  role: z.enum(['ADMIN', 'TEACHER']),
  isActive: z.boolean(),
  searchText: z.string(),
  createdAt: date,
  updatedAt: date,
});

const classSchema = z.object({
  id: objectId,
  name: z.string().min(1),
  classCode: z.string().min(1),
  schoolYear: z.string().min(1),
  description: nullableText,
  teacherId: objectId,
  isArchived: z.boolean(),
  searchText: z.string(),
  createdAt: date,
  updatedAt: date,
});

const studentSchema = z.object({
  id: objectId,
  studentCode: z.string().min(1),
  fullName: z.string().min(1),
  dateOfBirth: date,
  phone: nullableText,
  email: nullableText,
  searchText: z.string(),
  createdAt: date,
  updatedAt: date,
});

const enrollmentSchema = z.object({
  id: objectId,
  classId: objectId,
  studentId: objectId,
  createdAt: date,
});

const examSchema = z.object({
  id: objectId,
  title: z.string().min(1),
  subject: z.string().min(1),
  description: nullableText,
  accessCode: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  openAt: date,
  closeAt: date.nullable(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  maxAttempts: z.number().int().nonnegative(),
  showScore: z.boolean(),
  sectionTitles: z.record(z.string(), z.string()).nullable().optional(),
  trueFalseScores: z.array(z.number().nonnegative()).length(4).nullable().optional(),
  searchText: z.string(),
  teacherId: objectId,
  classId: objectId.nullable().optional(),
  classIds: z.array(objectId),
  createdAt: date,
  updatedAt: date,
});

const questionSchema = z.object({
  id: objectId,
  content: z.string(),
  options: z.array(z.string()),
  correctOption: z.number().int().nonnegative(),
  statements: z
    .array(
      z.object({
        content: z.string(),
        correct: z.boolean(),
      })
    )
    .nullable()
    .optional(),
  correctText: nullableText,
  points: z.number().nonnegative(),
  section: z.enum(['I', 'II', 'III']),
  order: z.number().int().nonnegative(),
  examId: objectId,
  createdAt: date,
  updatedAt: date,
});

const attemptSchema = z.object({
  id: objectId,
  attemptNumber: z.number().int().positive(),
  status: z.enum(['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED']),
  answers: z.any().nullable().optional(),
  questionOrder: z.array(z.string().min(1)),
  optionOrders: z.any().nullable().optional(),
  score: z.number().nullable().optional(),
  maxScore: z.number().nullable().optional(),
  correctCount: z.number().int().nonnegative().nullable().optional(),
  exitCount: z.number().int().nonnegative(),
  startedAt: date,
  expiresAt: date,
  submittedAt: date.nullable().optional(),
  examId: objectId,
  studentId: objectId,
  createdAt: date,
  updatedAt: date,
});

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: date,
  app: z.string().optional(),
  counts: z.record(z.string(), z.number()).optional(),
  data: z.object({
    users: z.array(userSchema),
    classes: z.array(classSchema),
    students: z.array(studentSchema),
    enrollments: z.array(enrollmentSchema),
    exams: z.array(examSchema),
    questions: z.array(questionSchema),
    examAttempts: z.array(attemptSchema),
  }),
});

const importOptionsSchema = z.object({
  mode: z.enum(['merge', 'replace']).default('merge'),
  confirmReplace: z.enum(['true', 'false']).optional().default('false'),
});

function stripIds(record) {
  const { id, ...data } = record;
  return data;
}

function countData(data) {
  return Object.fromEntries(
    Object.entries(data).map(([name, records]) => [name, records.length])
  );
}

function ensureUnique(records, keyOf, label) {
  const seen = new Set();
  for (const record of records) {
    const key = keyOf(record);
    if (seen.has(key)) {
      throw new ApiError(422, `Dữ liệu sao lưu bị trùng ${label}: ${key}`);
    }
    seen.add(key);
  }
}

function ensureReference(recordsById, id, label) {
  if (!recordsById.has(id)) {
    throw new ApiError(422, `Bản sao lưu thiếu ${label} tương ứng`);
  }
}

function validateRelations(data) {
  const userIds = new Map(data.users.map((record) => [record.id, record]));
  const studentIds = new Map(data.students.map((record) => [record.id, record]));
  const classIds = new Map(data.classes.map((record) => [record.id, record]));
  const examIds = new Map(data.exams.map((record) => [record.id, record]));

  ensureUnique(data.users, (record) => record.id, 'ID người dùng');
  ensureUnique(data.users, (record) => record.username.toLowerCase(), 'username');
  ensureUnique(data.classes, (record) => record.id, 'ID lớp học');
  ensureUnique(
    data.classes,
    (record) => `${record.teacherId}:${record.classCode}`,
    'mã lớp trong cùng giáo viên'
  );
  ensureUnique(data.students, (record) => record.id, 'ID học sinh');
  ensureUnique(data.students, (record) => record.studentCode, 'mã học sinh');
  ensureUnique(data.enrollments, (record) => record.id, 'ID ghi danh');
  ensureUnique(
    data.enrollments,
    (record) => `${record.classId}:${record.studentId}`,
    'lớp-học sinh'
  );
  ensureUnique(data.exams, (record) => record.id, 'ID đề thi');
  ensureUnique(data.exams, (record) => record.accessCode, 'mã ca thi');
  ensureUnique(data.questions, (record) => record.id, 'ID câu hỏi');
  ensureUnique(data.examAttempts, (record) => record.id, 'ID lượt thi');
  ensureUnique(
    data.examAttempts,
    (record) => `${record.examId}:${record.studentId}:${record.attemptNumber}`,
    'lượt thi của học sinh'
  );

  for (const classroom of data.classes) {
    ensureReference(userIds, classroom.teacherId, 'giáo viên của lớp');
  }
  for (const enrollment of data.enrollments) {
    ensureReference(classIds, enrollment.classId, 'lớp của ghi danh');
    ensureReference(studentIds, enrollment.studentId, 'học sinh của ghi danh');
  }
  for (const exam of data.exams) {
    ensureReference(userIds, exam.teacherId, 'giáo viên của đề');
    if (exam.classId) {
      ensureReference(classIds, exam.classId, 'lớp chính của đề');
    }
    for (const classId of exam.classIds) {
      ensureReference(classIds, classId, 'lớp được giao đề');
    }
  }
  for (const question of data.questions) {
    ensureReference(examIds, question.examId, 'đề của câu hỏi');
  }
  for (const attempt of data.examAttempts) {
    ensureReference(examIds, attempt.examId, 'đề của lượt thi');
    ensureReference(studentIds, attempt.studentId, 'học sinh của lượt thi');
  }

  if (!data.users.some((user) => user.role === 'ADMIN' && user.isActive)) {
    throw new ApiError(422, 'Bản sao lưu phải có ít nhất một tài khoản ADMIN đang hoạt động');
  }
}

async function exportBackup() {
  const [users, classes, students, enrollments, exams, questions, examAttempts] =
    await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.class.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.student.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.enrollment.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.exam.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.question.findMany({ orderBy: { order: 'asc' } }),
      prisma.examAttempt.findMany({ orderBy: { startedAt: 'asc' } }),
    ]);

  const data = { users, classes, students, enrollments, exams, questions, examAttempts };

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'ViExam',
    exportedAt: new Date().toISOString(),
    counts: countData(data),
    data,
  };
}

async function createAll(tx, data) {
  for (const user of data.users) await tx.user.create({ data: user });
  for (const student of data.students) await tx.student.create({ data: student });
  for (const classroom of data.classes) await tx.class.create({ data: classroom });
  for (const enrollment of data.enrollments) await tx.enrollment.create({ data: enrollment });
  for (const exam of data.exams) await tx.exam.create({ data: exam });
  for (const question of data.questions) await tx.question.create({ data: question });
  for (const attempt of data.examAttempts) await tx.examAttempt.create({ data: attempt });
}

async function mergeAll(tx, data) {
  for (const user of data.users) {
    await tx.user.upsert({
      where: { id: user.id },
      update: stripIds(user),
      create: user,
    });
  }
  for (const student of data.students) {
    await tx.student.upsert({
      where: { id: student.id },
      update: stripIds(student),
      create: student,
    });
  }
  for (const classroom of data.classes) {
    await tx.class.upsert({
      where: { id: classroom.id },
      update: stripIds(classroom),
      create: classroom,
    });
  }
  for (const enrollment of data.enrollments) {
    await tx.enrollment.upsert({
      where: { id: enrollment.id },
      update: stripIds(enrollment),
      create: enrollment,
    });
  }
  for (const exam of data.exams) {
    await tx.exam.upsert({
      where: { id: exam.id },
      update: stripIds(exam),
      create: exam,
    });
  }
  for (const question of data.questions) {
    await tx.question.upsert({
      where: { id: question.id },
      update: stripIds(question),
      create: question,
    });
  }
  for (const attempt of data.examAttempts) {
    await tx.examAttempt.upsert({
      where: { id: attempt.id },
      update: stripIds(attempt),
      create: attempt,
    });
  }
}

async function replaceAll(tx, data) {
  await tx.refreshToken.deleteMany();
  await tx.examAttempt.deleteMany();
  await tx.question.deleteMany();
  await tx.enrollment.deleteMany();
  await tx.exam.deleteMany();
  await tx.class.deleteMany();
  await tx.student.deleteMany();
  await tx.user.deleteMany();
  await createAll(tx, data);
}

function parseBackup(buffer) {
  let raw;
  try {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    raw = JSON.parse(text);
  } catch {
    throw new ApiError(400, 'File sao lưu không phải JSON hợp lệ');
  }

  const result = backupSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.slice(0, 10).map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ApiError(422, 'File sao lưu không đúng định dạng', details);
  }

  validateRelations(result.data.data);
  return result.data;
}

async function importBackup({ buffer, mode, confirmReplace, currentAdminId }) {
  if (mode === 'replace' && !confirmReplace) {
    throw new ApiError(400, 'Cần xác nhận thay thế toàn bộ dữ liệu');
  }

  const backup = parseBackup(buffer);
  const data = backup.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        if (mode === 'replace') {
          await replaceAll(tx, data);
        } else {
          await mergeAll(tx, data);
        }
      },
      { maxWait: 10000, timeout: 120000 }
    );
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(
        409,
        'Không thể nhập vì dữ liệu trùng username, mã học sinh, mã ca thi hoặc mã lớp với dữ liệu hiện có'
      );
    }
    throw error;
  }

  return {
    mode,
    counts: countData(data),
    total: Object.values(data).reduce((sum, records) => sum + records.length, 0),
    requiresLogin:
      mode === 'replace' &&
      !data.users.some((user) => user.id === currentAdminId && user.isActive),
  };
}

module.exports = {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupSchema,
  importOptionsSchema,
  exportBackup,
  importBackup,
};
