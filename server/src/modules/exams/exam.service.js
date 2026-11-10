const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const { normalizeSearchText } = require('../../utils/search');
const {
  classSelect,
  getExamClassIds,
  getClassesByIds,
  getClassStudentIds,
  assertOwnedClasses,
} = require('./exam.classes');
const {
  EXAM_STATUS,
  generateAccessCode,
  getExamPhase,
  calculateTotals,
  normalizeAnswers,
} = require('./exam.utils');
const {
  normalizeTrueFalseScores,
  normalizeStatements,
  normalizeStatementAnswers,
  normalizeShortAnswer,
  getQuestionMaxPoints,
  gradeQuestion,
} = require('./exam.grading');
const {
  finalizeExpiredAttempts,
  regradeExamAttempts: regradeAttemptsData,
} = require('./attempt.service');

const examInclude = {
  class: { select: classSelect },
  questions: { orderBy: { order: 'asc' } },
  _count: { select: { attempts: true } },
};

const SECTION_ORDER = { I: 0, II: 1, III: 2 };

function sortQuestionsBySection(questions) {
  return questions
    .map((question, index) => ({ question, index }))
    .sort(
      (first, second) =>
        (SECTION_ORDER[first.question.section] ?? 0) -
          (SECTION_ORDER[second.question.section] ?? 0) ||
        first.index - second.index
    )
    .map((item) => item.question);
}

function buildSearchText(title, subject, classrooms) {
  return [
    title,
    subject,
    ...classrooms.flatMap((classroom) => [classroom.name, classroom.classCode]),
  ]
    .join(' ')
    .toLowerCase();
}

function buildQuestionData(question, trueFalseScores) {
  const points =
    question.section === 'II'
      ? trueFalseScores[3]
      : Number(question.points || 0);
  const data = {
    content: question.content,
    options: question.section === 'I' ? question.options : [],
    correctOption: question.section === 'I' ? question.correctOption : 0,
    points,
    section: question.section,
  };
  if (question.section === 'II') {
    data.statements = normalizeStatements(question.statements);
  }
  if (question.section === 'III') {
    data.correctText = normalizeShortAnswer(question.correctText);
  }
  return data;
}

function normalizeOptional(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

async function generateUniqueAccessCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const accessCode = generateAccessCode();
    const existing = await prisma.exam.findUnique({ where: { accessCode } });
    if (!existing) return accessCode;
  }
  throw new ApiError(503, 'Không thể tạo mã ca thi. Vui lòng thử lại.');
}

function decorateExam(exam, now = new Date()) {
  const questions = exam.questions || [];
  const trueFalseScores = normalizeTrueFalseScores(exam.trueFalseScores);
  const totals = calculateTotals(questions, trueFalseScores);
  return {
    ...exam,
    trueFalseScores,
    phase: getExamPhase(exam, now),
    questionCount: totals.questionCount,
    totalPoints: totals.totalPoints,
    attemptCount: exam._count?.attempts ?? exam.attemptCount ?? 0,
    classes: exam.classes || (exam.class ? [exam.class] : []),
  };
}

async function assertExamOwner(examId, teacherId) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, teacherId },
    include: examInclude,
  });
  if (!exam) {
    throw new ApiError(404, 'Không tìm thấy đề thi');
  }
  return exam;
}

async function listExams(teacherId, { page, limit, search, status, classId }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = { teacherId };

  if (status && status !== 'all') where.status = status;
  if (classId) {
    where.OR = [{ classId }, { classIds: { has: classId } }];
  }
  if (search) where.searchText = { contains: search.toLowerCase() };

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: {
        class: { select: classSelect },
        questions: { select: { points: true } },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.exam.count({ where }),
  ]);

  const allClassIds = exams.flatMap((exam) => getExamClassIds(exam));
  const classes = await getClassesByIds(allClassIds);
  const classMap = new Map(classes.map((classroom) => [classroom.id, classroom]));

  return {
    items: exams.map((exam) =>
      decorateExam({
        ...exam,
        classes: getExamClassIds(exam)
          .map((classId) => classMap.get(classId))
          .filter(Boolean),
      })
    ),
    pagination: paginationMeta(total, safePage, safeLimit),
  };
}

async function getExam(examId, teacherId) {
  const exam = await assertExamOwner(examId, teacherId);
  const classes = await getClassesByIds(getExamClassIds(exam));
  return decorateExam({ ...exam, classes });
}

async function createExam(teacherId, payload) {
  const classIds = [...new Set(payload.classIds)];
  const classrooms = await assertOwnedClasses(teacherId, classIds);
  const primaryClass = classrooms[0];
  const accessCode = await generateUniqueAccessCode();
  const searchText = buildSearchText(payload.title, payload.subject, classrooms);
  const orderedQuestions = sortQuestionsBySection(payload.questions);
  const trueFalseScores = normalizeTrueFalseScores(payload.trueFalseScores);

  const exam = await prisma.$transaction(async (transaction) => {
    const created = await transaction.exam.create({
      data: {
        title: payload.title,
        subject: payload.subject,
        description: normalizeOptional(payload.description),
        accessCode,
        durationMinutes: payload.durationMinutes,
        openAt: payload.openAt,
        closeAt: payload.closeAt,
        maxAttempts: payload.maxAttempts,
        shuffleQuestions: payload.shuffleQuestions,
        shuffleOptions: payload.shuffleOptions,
        showScore: payload.showScore,
        sectionTitles: payload.sectionTitles,
        trueFalseScores,
        teacherId,
        classId: primaryClass?.id || null,
        classIds,
        searchText,
      },
    });

    for (let index = 0; index < orderedQuestions.length; index += 1) {
      const question = orderedQuestions[index];
      await transaction.question.create({
        data: {
          examId: created.id,
          ...buildQuestionData(question, trueFalseScores),
          order: index,
        },
      });
    }

    return transaction.exam.findUnique({
      where: { id: created.id },
      include: examInclude,
    });
  });

  return decorateExam({ ...exam, classes: classrooms });
}

async function updateExam(examId, teacherId, payload) {
  const existing = await assertExamOwner(examId, teacherId);
  await finalizeExpiredAttempts({ examId });
  const inProgressAttempts = await prisma.examAttempt.count({
    where: { examId, status: 'IN_PROGRESS' },
  });
  if (inProgressAttempts > 0) {
    throw new ApiError(
      409,
      'Không thể chỉnh sửa đề thi khi đang có học sinh làm bài. Vui lòng đợi các lượt làm kết thúc.'
    );
  }

  const classIds = [...new Set(payload.classIds)];
  if (existing.status === EXAM_STATUS.PUBLISHED && classIds.length === 0) {
    throw new ApiError(400, 'Đề đã công bố cần ít nhất một lớp học. Hãy gán lớp trước khi lưu.');
  }
  const classrooms = await assertOwnedClasses(teacherId, classIds);
  const primaryClass = classrooms[0];
  const searchText = buildSearchText(payload.title, payload.subject, classrooms);
  const trueFalseScores = normalizeTrueFalseScores(payload.trueFalseScores);
  const orderedQuestions = payload.questions
    ? sortQuestionsBySection(payload.questions)
    : null;

  const exam = await prisma.$transaction(async (transaction) => {
    await transaction.exam.update({
      where: { id: examId },
      data: {
        title: payload.title,
        subject: payload.subject,
        description: normalizeOptional(payload.description),
        durationMinutes: payload.durationMinutes,
        openAt: payload.openAt,
        closeAt: payload.closeAt,
        maxAttempts: payload.maxAttempts,
        shuffleQuestions: payload.shuffleQuestions,
        shuffleOptions: payload.shuffleOptions,
        showScore: payload.showScore,
        sectionTitles: payload.sectionTitles,
        trueFalseScores,
        classId: primaryClass?.id || null,
        classIds,
        searchText,
      },
    });

    if (orderedQuestions) {
      const existingQuestions = await transaction.question.findMany({
        where: { examId },
        select: { id: true },
      });
      const ownedIds = new Set(existingQuestions.map((question) => question.id));
      const keepIds = orderedQuestions
        .map((question) => question.id)
        .filter((questionId) => questionId && ownedIds.has(questionId));
      await transaction.question.deleteMany({
        where: { examId, id: { notIn: keepIds } },
      });
      for (let index = 0; index < orderedQuestions.length; index += 1) {
        const question = orderedQuestions[index];
        const data = {
          ...buildQuestionData(question, trueFalseScores),
          order: index,
        };
        if (question.id && ownedIds.has(question.id)) {
          await transaction.question.update({ where: { id: question.id }, data });
        } else {
          await transaction.question.create({ data: { examId, ...data } });
        }
      }
    } else {
      await transaction.question.updateMany({
        where: { examId, section: 'II' },
        data: { points: trueFalseScores[3] },
      });
    }

    return transaction.exam.findUnique({ where: { id: examId }, include: examInclude });
  });

  return decorateExam({ ...exam, classes: classrooms });
}

async function publishExam(examId, teacherId) {
  const exam = await assertExamOwner(examId, teacherId);
  if (exam.status !== EXAM_STATUS.DRAFT) {
    throw new ApiError(400, 'Chỉ có thể công bố đề thi đang ở trạng thái nháp');
  }
  if (!exam.questions?.length) {
    throw new ApiError(400, 'Cần ít nhất một câu hỏi trước khi công bố');
  }
  if (!getExamClassIds(exam).length) {
    throw new ApiError(400, 'Cần gán ít nhất một lớp trước khi công bố đề thi');
  }
  const publishClasses = await getClassesByIds(getExamClassIds(exam));
  if (!publishClasses.some((classroom) => !classroom.isArchived)) {
    throw new ApiError(400, 'Đề thi cần ít nhất một lớp đang hoạt động trước khi công bố');
  }
  if (new Date(exam.closeAt).getTime() <= Date.now()) {
    throw new ApiError(400, 'Thời gian kết thúc phải ở tương lai trước khi công bố');
  }

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { status: EXAM_STATUS.PUBLISHED, publishedAt: new Date() },
    include: examInclude,
  });
  const classes = await getClassesByIds(getExamClassIds(updated));
  return decorateExam({ ...updated, classes });
}

async function closeExam(examId, teacherId) {
  const exam = await assertExamOwner(examId, teacherId);
  if (exam.status !== EXAM_STATUS.PUBLISHED) {
    throw new ApiError(400, 'Chỉ có thể đóng đề thi đã công bố');
  }

  const now = new Date();
  const updated = await prisma.exam.update({
    where: { id: examId },
    data: {
      status: EXAM_STATUS.CLOSED,
      closeAt: new Date(exam.closeAt) > now ? now : exam.closeAt,
    },
    include: examInclude,
  });

  await prisma.examAttempt.updateMany({
    where: { examId, status: 'IN_PROGRESS' },
    data: { expiresAt: now },
  });
  await finalizeExpiredAttempts({ examId });

  const classes = await getClassesByIds(getExamClassIds(updated));
  return decorateExam({ ...updated, classes });
}

async function deleteExam(examId, teacherId) {
  const exam = await assertExamOwner(examId, teacherId);
  if (exam.status !== EXAM_STATUS.DRAFT) {
    throw new ApiError(400, 'Chỉ có thể xóa đề thi nháp');
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.question.deleteMany({ where: { examId } });
    await transaction.exam.delete({ where: { id: examId } });
  });

  return {
    id: exam.id,
    title: exam.title,
    questionCount: exam.questions?.length ?? 0,
    attemptCount: exam._count?.attempts ?? 0,
  };
}

async function getExamResults(examId, teacherId, { page, limit, search, status, classId }) {
  const exam = await assertExamOwner(examId, teacherId);
  await finalizeExpiredAttempts({ examId });
  const examClassIds = getExamClassIds(exam);
  if (classId && !examClassIds.includes(classId)) {
    throw new ApiError(400, 'Lớp được chọn không thuộc đề thi');
  }
  const classes = await getClassesByIds(examClassIds);
  const classStudentIds = classId ? await getClassStudentIds(classId) : null;
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = { examId };

  if (classStudentIds) where.studentId = { in: classStudentIds };
  if (status && status !== 'all') where.status = status;
  if (search) {
    where.student = { is: { searchText: { contains: normalizeSearchText(search) } } };
  }

  const [attempts, total] = await Promise.all([
    prisma.examAttempt.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            dateOfBirth: true,
            email: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.examAttempt.count({ where }),
  ]);

  const gradedAttempts = await prisma.examAttempt.findMany({
    where: {
      examId,
      ...(classStudentIds ? { studentId: { in: classStudentIds } } : {}),
      status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
      score: { not: null },
      maxScore: { gt: 0 },
    },
    select: { score: true, maxScore: true },
  });
  const percentages = gradedAttempts
    .map((attempt) => (Number(attempt.score) / Number(attempt.maxScore)) * 100)
    .filter(Number.isFinite);
  const scoreValues = gradedAttempts.map((attempt) => Number(attempt.score));
  const maxScore = gradedAttempts.length
    ? Math.max(...gradedAttempts.map((attempt) => Number(attempt.maxScore)))
    : null;
  const average = (values) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const round = (value) =>
    value === null ? null : Math.round(value * 100) / 100;
  const bands = [
    { label: '0–20%', min: 0, max: 20 },
    { label: '20–40%', min: 20, max: 40 },
    { label: '40–60%', min: 40, max: 60 },
    { label: '60–80%', min: 60, max: 80 },
    { label: '80–100%', min: 80, max: 100.0001 },
  ];
  const distribution = bands.map((band) => ({
    label: band.label,
    count: percentages.filter(
      (value) => value >= band.min && value < band.max
    ).length,
  }));
  const stats = {
    total: percentages.length,
    maxScore,
    averageScore: round(average(scoreValues)),
    averagePercent: round(average(percentages)),
    highestScore: scoreValues.length ? Math.max(...scoreValues) : null,
    highestPercent: percentages.length ? Math.max(...percentages) : null,
    lowestScore: scoreValues.length ? Math.min(...scoreValues) : null,
    lowestPercent: percentages.length ? Math.min(...percentages) : null,
    distribution,
  };

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      accessCode: exam.accessCode,
      status: exam.status,
      class: exam.class,
      classes,
    },
    items: attempts.map((attempt) => ({
      ...attempt,
      percent:
        attempt.maxScore > 0 && attempt.score !== null
          ? Math.round((attempt.score / attempt.maxScore) * 100)
          : null,
    })),
    pagination: paginationMeta(total, safePage, safeLimit),
    stats,
  };
}

async function getAttemptDetail(examId, attemptId, teacherId) {
  const exam = await assertExamOwner(examId, teacherId);
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, examId },
    include: {
      exam: {
        select: { id: true, trueFalseScores: true },
      },
      student: {
        select: {
          id: true,
          studentCode: true,
          fullName: true,
          dateOfBirth: true,
          email: true,
        },
      },
    },
  });
  if (!attempt) {
    throw new ApiError(404, 'Không tìm thấy lượt làm bài');
  }

  const attemptQuestions = Array.isArray(attempt.questionSnapshot)
    ? attempt.questionSnapshot
    : exam.questions;
  const questionMap = new Map(attemptQuestions.map((question) => [question.id, question]));
  const storedOrder = Array.isArray(attempt.questionOrder) ? attempt.questionOrder : [];
  const orderedIds = storedOrder.length
    ? storedOrder
    : attemptQuestions.map((question) => question.id);
  const optionOrders =
    attempt.optionOrders && typeof attempt.optionOrders === 'object'
      ? attempt.optionOrders
      : {};
  const trueFalseScores = normalizeTrueFalseScores(
    attempt.trueFalseScoresSnapshot ?? attempt.exam.trueFalseScores
  );
  const answerMap = new Map(
    normalizeAnswers(attempt.answers).map((answer) => [answer.questionId, answer])
  );

  const questions = orderedIds.map((questionId, index) => {
    const question = questionMap.get(questionId);
    if (!question) {
      return {
        id: questionId,
        number: index + 1,
        missing: true,
        content: 'Câu hỏi này không còn trong đề vì đề đã được chỉnh sửa.',
        section: null,
        points: 0,
        options: [],
        statements: [],
        selectedOption: null,
        selectedText: null,
        correctText: null,
        selectedLabel: null,
        correctLabel: null,
        answered: false,
        isCorrect: false,
        earnedPoints: 0,
      };
    }

    const answer = answerMap.get(question.id) || {};
    const grade = gradeQuestion(question, answer, trueFalseScores);

    if (question.section === 'II') {
      const statements = normalizeStatements(question.statements).map(
        (statement, statementIndex) => {
          const selected = normalizeStatementAnswers(answer.statementAnswers)[statementIndex];
          return {
            index: statementIndex,
            content: statement.content,
            correct: statement.correct,
            selected,
            isCorrect: selected !== null && selected === statement.correct,
          };
        }
      );
      const statementAnswers = normalizeStatementAnswers(answer.statementAnswers);
      return {
        id: question.id,
        number: index + 1,
        missing: false,
        content: question.content,
        section: question.section,
        points: grade.maxPoints,
        options: [],
        statements,
        selectedOption: null,
        selectedText: null,
        correctText: null,
        selectedLabel: statementAnswers
          .map((value) => (value === null ? '—' : value ? 'Đúng' : 'Sai'))
          .join(' · '),
        correctLabel: statements
          .map((statement) => (statement.correct ? 'Đúng' : 'Sai'))
          .join(' · '),
        answered: grade.answered,
        isCorrect: grade.isCorrect,
        correctCount: grade.correctCount,
        earnedPoints: grade.earnedPoints,
      };
    }

    if (question.section === 'III') {
      const selectedText = normalizeShortAnswer(answer.textAnswer);
      const correctText = normalizeShortAnswer(question.correctText);
      return {
        id: question.id,
        number: index + 1,
        missing: false,
        content: question.content,
        section: question.section,
        points: grade.maxPoints,
        options: [],
        statements: [],
        selectedOption: null,
        selectedText,
        correctText,
        selectedLabel: selectedText || null,
        correctLabel: correctText || null,
        answered: grade.answered,
        isCorrect: grade.isCorrect,
        earnedPoints: grade.earnedPoints,
      };
    }

    const selected = Number.isInteger(answer.selectedOption)
      ? answer.selectedOption
      : null;
    const displayOrder = Array.isArray(optionOrders[question.id])
      ? optionOrders[question.id]
      : question.options.map((_, optionIndex) => optionIndex);
    const options = displayOrder
      .map((optionIndex, displayIndex) => ({
        index: optionIndex,
        label: String.fromCharCode(65 + displayIndex),
        text: question.options[optionIndex],
        isSelected: selected === optionIndex,
        isCorrect: question.correctOption === optionIndex,
      }))
      .filter((option) => option.text !== undefined);
    const selectedOption = options.find((option) => option.isSelected) || null;
    const correctOption = options.find((option) => option.isCorrect) || null;
    return {
      id: question.id,
      number: index + 1,
      missing: false,
      content: question.content,
      section: question.section,
      points: grade.maxPoints,
      options,
      statements: [],
      selectedOption: selected,
      selectedText: null,
      correctText: null,
      selectedLabel: selectedOption?.label || null,
      correctLabel: correctOption?.label || null,
      answered: grade.answered,
      isCorrect: grade.isCorrect,
      earnedPoints: grade.earnedPoints,
    };
  });
  const answeredCount = questions.filter((question) => question.answered).length;
  const computedCorrect = questions.filter((question) => question.isCorrect).length;
  const totalPoints = calculateTotals(exam.questions, trueFalseScores).totalPoints;
  const maxScore = attempt.maxScore ?? totalPoints;
  const percent =
    maxScore > 0 && attempt.score !== null
      ? Math.round((attempt.score / maxScore) * 100)
      : null;

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      sectionTitles: exam.sectionTitles || {},
    },
    student: attempt.student,
    attempt: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      maxScore,
      correctCount: attempt.correctCount ?? computedCorrect,
      percent,
      exitCount: attempt.exitCount || 0,
      questionCount: questions.length,
      answeredCount,
    },
    questions,
  };
}

async function regradeExamAttempts(examId, teacherId) {
  const exam = await assertExamOwner(examId, teacherId);
  const regraded = await regradeAttemptsData(examId);
  return { regraded, title: exam.title };
}

module.exports = {
  assertExamOwner,
  listExams,
  getExam,
  createExam,
  updateExam,
  publishExam,
  closeExam,
  deleteExam,
  getExamResults,
  regradeExamAttempts,
  getAttemptDetail,
  decorateExam,
  examInclude,
  classSelect,
};
