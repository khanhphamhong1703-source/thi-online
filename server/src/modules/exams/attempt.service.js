const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { getPagination, paginationMeta } = require('../../utils/pagination');
const {
  EXAM_STATUS,
  ATTEMPT_STATUS,
  getExamPhase,
  calculateTotals,
  shuffleArray,
  normalizeAnswers,
  roundScore,
} = require('./exam.utils');
const { getExamClassIds, getClassesByIds } = require('./exam.classes');
const {
  normalizeTrueFalseScores,
  normalizeStatements,
  normalizeStatementAnswers,
  normalizeShortAnswer,
  isValidShortAnswer,
  getQuestionMaxPoints,
  gradeQuestion,
} = require('./exam.grading');

const publicClassSelect = {
  id: true,
  name: true,
  classCode: true,
  schoolYear: true,
};

const publicExamInclude = {
  class: { select: publicClassSelect },
  teacher: { select: { fullName: true } },
  questions: { select: { id: true, points: true }, orderBy: { order: 'asc' } },
};

const attemptInclude = {
  student: {
    select: { id: true, studentCode: true, fullName: true },
  },
  exam: {
    include: {
      class: { select: publicClassSelect },
      teacher: { select: { fullName: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  },
};

function signAttemptToken(attemptId) {
  return jwt.sign({ scope: 'EXAM_ATTEMPT', attemptId }, env.JWT_SECRET, {
    expiresIn: '24h',
  });
}

function publicExamSummary(exam, classes = []) {
  const trueFalseScores = normalizeTrueFalseScores(exam.trueFalseScores);
  const totals = calculateTotals(exam.questions || [], trueFalseScores);
  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    openAt: exam.openAt,
    closeAt: exam.closeAt,
    maxAttempts: exam.maxAttempts,
    trueFalseScores,
    showScore: exam.showScore,
    phase: getExamPhase(exam),
    questionCount: totals.questionCount,
    totalPoints: totals.totalPoints,
    className: exam.class?.name,
    classCode: exam.class?.classCode,
    schoolYear: exam.class?.schoolYear,
    classes,
    teacherName: exam.teacher?.fullName,
  };
}

async function listPublicExams({ page, limit, search }) {
  const { page: safePage, limit: safeLimit, skip } = getPagination(page, limit);
  const where = { status: EXAM_STATUS.PUBLISHED };
  if (search) where.searchText = { contains: search.toLowerCase() };

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      include: publicExamInclude,
      orderBy: { openAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.exam.count({ where }),
  ]);

  const classes = await getClassesByIds(exams.flatMap((exam) => getExamClassIds(exam)));
  const classMap = new Map(classes.map((classroom) => [classroom.id, classroom]));

  return {
    items: exams.map((exam) =>
      publicExamSummary(
        exam,
        getExamClassIds(exam)
          .map((classId) => classMap.get(classId))
          .filter(Boolean)
      )
    ),
    pagination: paginationMeta(total, safePage, safeLimit),
  };
}

async function getPublicExam(examId) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, status: EXAM_STATUS.PUBLISHED },
    include: publicExamInclude,
  });
  if (!exam) {
    throw new ApiError(404, 'Không tìm thấy đề thi đang công bố');
  }
  return publicExamSummary(exam, await getClassesByIds(getExamClassIds(exam)));
}

async function lookupExamStudent({ accessCode, studentCode }) {
  const normalizedAccessCode = accessCode.trim().toUpperCase();
  const exam = await prisma.exam.findUnique({
    where: { accessCode: normalizedAccessCode },
    include: publicExamInclude,
  });
  if (!exam || exam.status !== EXAM_STATUS.PUBLISHED) {
    throw new ApiError(404, 'Mã ca thi không tồn tại hoặc chưa được công bố');
  }

  const normalizedStudentCode = studentCode.trim().toUpperCase();
  const student = await prisma.student.findUnique({
    where: { studentCode: normalizedStudentCode },
  });
  if (!student) {
    throw new ApiError(403, 'Mã học sinh không tồn tại trong lớp của đề thi');
  }

  const examClassIds = getExamClassIds(exam);
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: student.id,
      classId: { in: examClassIds },
    },
    include: {
      class: { select: publicClassSelect },
    },
  });
  if (!enrollment) {
    throw new ApiError(403, 'Học sinh không thuộc lớp của đề thi');
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { examId: exam.id, studentId: student.id },
    select: { status: true, attemptNumber: true },
  });
  const inProgress = attempts.find(
    (attempt) => attempt.status === ATTEMPT_STATUS.IN_PROGRESS
  );

  return {
    exam: publicExamSummary(exam, await getClassesByIds(examClassIds)),
    student: {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      className: enrollment.class.name,
      classCode: enrollment.class.classCode,
    },
    attempt: {
      hasInProgress: Boolean(inProgress),
      attemptsUsed: attempts.length,
      completedAttempts: attempts.filter(
        (attempt) => attempt.status !== ATTEMPT_STATUS.IN_PROGRESS
      ).length,
      maxAttempts: exam.maxAttempts,
    },
  };
}

function buildOptionOrders(exam) {
  const optionOrders = {};
  for (const question of exam.questions) {
    const indexes = question.options.map((_, index) => index);
    optionOrders[question.id] = exam.shuffleOptions ? shuffleArray(indexes) : indexes;
  }
  return optionOrders;
}

function sanitizeAnswers(answers, questions) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const answerMap = new Map();
  for (const answer of normalizeAnswers(answers)) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    if (question.section === 'II') {
      const statementAnswers = normalizeStatementAnswers(answer.statementAnswers);
      if (statementAnswers.some((value) => value !== null)) {
        answerMap.set(answer.questionId, {
          questionId: answer.questionId,
          statementAnswers,
        });
      }
      continue;
    }

    if (question.section === 'III') {
      const textAnswer = normalizeShortAnswer(answer.textAnswer);
      if (isValidShortAnswer(textAnswer)) {
        answerMap.set(answer.questionId, {
          questionId: answer.questionId,
          textAnswer,
        });
      }
      continue;
    }

    if (
      Number.isInteger(answer.selectedOption) &&
      answer.selectedOption >= 0 &&
      answer.selectedOption < question.options.length
    ) {
      answerMap.set(answer.questionId, {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
      });
    }
  }
  return [...answerMap.values()];
}

function buildAttemptSummary(attempt) {
  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    showScore: attempt.exam.showScore,
    score: attempt.exam.showScore ? attempt.score : null,
    maxScore: attempt.exam.showScore ? attempt.maxScore : null,
    correctCount: attempt.exam.showScore ? attempt.correctCount : null,
    exitCount: attempt.exitCount || 0,
  };
}

function buildExamSummary(exam) {
  const trueFalseScores = normalizeTrueFalseScores(exam.trueFalseScores);
  const totals = calculateTotals(exam.questions, trueFalseScores);
  return {
    id: exam.id,
    title: exam.title,
    subject: exam.subject,
    durationMinutes: exam.durationMinutes,
    className: exam.class?.name,
    classCode: exam.class?.classCode,
    teacherName: exam.teacher?.fullName,
    questionCount: totals.questionCount,
    totalPoints: totals.totalPoints,
    showScore: exam.showScore,
    trueFalseScores,
    sectionTitles: exam.sectionTitles || {},
  };
}

function buildTakingView(attempt) {
  const attemptQuestions = Array.isArray(attempt.questionSnapshot)
    ? attempt.questionSnapshot
    : attempt.exam.questions;
  const trueFalseScores = normalizeTrueFalseScores(
    attempt.trueFalseScoresSnapshot ?? attempt.exam.trueFalseScores
  );
  const questionMap = new Map(attemptQuestions.map((question) => [question.id, question]));
  const storedOrder = Array.isArray(attempt.questionOrder) ? attempt.questionOrder : [];
  const orderedIds = storedOrder.length
    ? storedOrder
    : attemptQuestions.map((question) => question.id);
  const optionOrders =
    attempt.optionOrders && typeof attempt.optionOrders === 'object'
      ? attempt.optionOrders
      : {};

  const questions = orderedIds
    .map((questionId) => questionMap.get(questionId))
    .filter(Boolean)
    .map((question) => {
      const order = Array.isArray(optionOrders[question.id])
        ? optionOrders[question.id]
        : question.options.map((_, index) => index);
      const base = {
        id: question.id,
        section: question.section,
        content: question.content,
        points: getQuestionMaxPoints(question, trueFalseScores),
      };

      if (question.section === 'II') {
        return {
          ...base,
          options: [],
          statements: normalizeStatements(question.statements).map(
            (statement, index) => ({
              index,
              content: statement.content,
            })
          ),
        };
      }

      if (question.section === 'III') {
        return {
          ...base,
          options: [],
          answerBoxes: 4,
        };
      }

      return {
        ...base,
        options: order
          .filter((index) => question.options[index] !== undefined)
          .map((index) => ({ index, text: question.options[index] })),
      };
    });

  return {
    attempt: buildAttemptSummary(attempt),
    exam: buildExamSummary(attempt.exam),
    student: attempt.student,
    questions,
    answers: normalizeAnswers(attempt.answers),
    serverTime: new Date().toISOString(),
  };
}

function buildResultView(attempt) {
  const showScore = attempt.exam.showScore;
  return {
    attempt: buildAttemptSummary(attempt),
    exam: buildExamSummary(attempt.exam),
    student: attempt.student,
    showScore,
    serverTime: new Date().toISOString(),
  };
}

async function getAttemptContext(attemptId) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: attemptInclude,
  });
  if (!attempt) {
    throw new ApiError(404, 'Không tìm thấy phiên làm bài');
  }
  return attempt;
}

async function finalizeAttempt(attempt, answers, autoSubmitted = false) {
  if (!['IN_PROGRESS'].includes(attempt.status)) {
    return attempt;
  }

  const questions = Array.isArray(attempt.questionSnapshot)
    ? attempt.questionSnapshot
    : attempt.exam.questions;
  const safeAnswers = sanitizeAnswers(answers ?? attempt.answers, questions);
  const answerMap = new Map(safeAnswers.map((answer) => [answer.questionId, answer]));
  const trueFalseScores = normalizeTrueFalseScores(
    attempt.trueFalseScoresSnapshot ?? attempt.exam.trueFalseScores
  );
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;

  for (const question of questions) {
    const grade = gradeQuestion(question, answerMap.get(question.id), trueFalseScores);
    maxScore += grade.maxPoints;
    score += grade.earnedPoints;
    if (grade.isCorrect) {
      correctCount += 1;
    }
  }

  return prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      answers: safeAnswers,
      status: autoSubmitted ? ATTEMPT_STATUS.AUTO_SUBMITTED : ATTEMPT_STATUS.SUBMITTED,
      score: roundScore(score),
      maxScore: roundScore(maxScore),
      correctCount,
      submittedAt: new Date(),
    },
    include: attemptInclude,
  });
}

function attemptExpired(attempt, now = new Date()) {
  return (
    now >= new Date(attempt.expiresAt) ||
    now >= new Date(attempt.exam.closeAt) ||
    attempt.exam.status === EXAM_STATUS.CLOSED
  );
}

async function getAttemptForStudent(attemptId) {
  let attempt = await getAttemptContext(attemptId);
  if (attempt.status === ATTEMPT_STATUS.IN_PROGRESS && attemptExpired(attempt)) {
    attempt = await finalizeAttempt(attempt, attempt.answers, true);
  }

  if (attempt.status === ATTEMPT_STATUS.IN_PROGRESS) {
    return buildTakingView(attempt);
  }
  return buildResultView(attempt);
}

async function startAttempt(examId, { studentCode, accessCode }) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, status: EXAM_STATUS.PUBLISHED },
    include: {
      class: { select: publicClassSelect },
      teacher: { select: { fullName: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  });
  if (!exam) {
    throw new ApiError(404, 'Đề thi không tồn tại hoặc chưa được công bố');
  }

  const now = new Date();
  const phase = getExamPhase(exam, now);
  if (phase === 'UPCOMING') {
    throw new ApiError(400, 'Ca thi chưa mở');
  }
  if (phase === 'ENDED') {
    throw new ApiError(400, 'Ca thi đã kết thúc');
  }
  if (exam.accessCode.toUpperCase() !== accessCode) {
    throw new ApiError(403, 'Mã ca thi không đúng');
  }

  const normalizedStudentCode = studentCode.trim().toUpperCase();
  const student = await prisma.student.findUnique({
    where: { studentCode: normalizedStudentCode },
  });
  if (!student) {
    throw new ApiError(403, 'Mã học sinh không tồn tại trong lớp của đề thi');
  }

  const examClassIds = getExamClassIds(exam);
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: student.id,
      classId: { in: examClassIds },
    },
  });
  if (!enrollment) {
    throw new ApiError(403, 'Học sinh không thuộc lớp của đề thi');
  }

  let attempts = await prisma.examAttempt.findMany({
    where: { examId, studentId: student.id },
    orderBy: { attemptNumber: 'desc' },
    include: attemptInclude,
  });

  const inProgress = attempts.find(
    (attempt) => attempt.status === ATTEMPT_STATUS.IN_PROGRESS
  );

  if (inProgress) {
    if (!attemptExpired(inProgress, now)) {
      return {
        token: signAttemptToken(inProgress.id),
        ...buildTakingView(inProgress),
      };
    }
    await finalizeAttempt(inProgress, inProgress.answers, true);
    attempts = await prisma.examAttempt.findMany({
      where: { examId, studentId: student.id },
      orderBy: { attemptNumber: 'desc' },
      include: attemptInclude,
    });
  }

  if (exam.maxAttempts > 0 && attempts.length >= exam.maxAttempts) {
    throw new ApiError(409, `Bạn đã sử dụng hết ${exam.maxAttempts} lượt làm bài`);
  }

  const expiresAt = new Date(
    Math.min(now.getTime() + exam.durationMinutes * 60 * 1000, new Date(exam.closeAt).getTime())
  );
  if (expiresAt <= now) {
    throw new ApiError(400, 'Ca thi đã kết thúc');
  }

  const sectionOrder = ['I', 'II', 'III'];
  const groupedQuestions = sectionOrder
    .map((section) => exam.questions.filter((question) => question.section === section))
    .flat();
  const remainingQuestions = exam.questions.filter(
    (question) => !sectionOrder.includes(question.section)
  );
  const orderedQuestions = [...groupedQuestions, ...remainingQuestions];
  const questionOrder = exam.shuffleQuestions
    ? sectionOrder.flatMap((section) =>
        shuffleArray(
          orderedQuestions
            .filter((question) => question.section === section)
            .map((question) => question.id)
        )
      ).concat(
        remainingQuestions.map((question) => question.id)
      )
    : orderedQuestions.map((question) => question.id);

  let attempt;
  try {
    attempt = await prisma.examAttempt.create({
      data: {
        examId,
        studentId: student.id,
        attemptNumber: attempts.length + 1,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        answers: [],
        questionOrder,
        optionOrders: buildOptionOrders(exam),
        questionSnapshot: exam.questions.map((question) => ({
          id: question.id,
          content: question.content,
          section: question.section,
          options: question.options,
          correctOption: question.correctOption,
          statements: normalizeStatements(question.statements),
          correctText: question.correctText || '',
          points: question.points,
          order: question.order,
        })),
        trueFalseScoresSnapshot: normalizeTrueFalseScores(exam.trueFalseScores),
        expiresAt,
      },
      include: attemptInclude,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await prisma.examAttempt.findFirst({
        where: { examId, studentId: student.id, status: ATTEMPT_STATUS.IN_PROGRESS },
        include: attemptInclude,
      });
      if (existing) {
        return { token: signAttemptToken(existing.id), ...buildTakingView(existing) };
      }
    }
    throw error;
  }

  return {
    token: signAttemptToken(attempt.id),
    ...buildTakingView(attempt),
  };
}

async function saveAttemptAnswers(attemptId, answers) {
  let attempt = await getAttemptContext(attemptId);
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    return { alreadySubmitted: true, ...buildResultView(attempt) };
  }
  if (attemptExpired(attempt)) {
    attempt = await finalizeAttempt(attempt, attempt.answers, true);
    return { autoSubmitted: true, ...buildResultView(attempt) };
  }

  const safeAnswers = sanitizeAnswers(answers, attempt.exam.questions);
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { answers: safeAnswers },
  });

  return {
    savedAt: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    answers: safeAnswers,
  };
}

async function submitAttempt(attemptId, answers) {
  let attempt = await getAttemptContext(attemptId);
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    return buildResultView(attempt);
  }

  const autoSubmitted = attemptExpired(attempt);
  const finalAnswers = answers ?? attempt.answers;
  attempt = await finalizeAttempt(attempt, finalAnswers, autoSubmitted);
  return buildResultView(attempt);
}

async function recordAttemptExit(attemptId) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { status: true },
  });
  if (!attempt) {
    throw new ApiError(404, 'Không tìm thấy phiên làm bài');
  }
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    return { exitCount: null, ignored: true };
  }

  const updated = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { exitCount: { increment: 1 } },
    select: { exitCount: true },
  });

  return {
    exitCount: updated.exitCount,
    recordedAt: new Date().toISOString(),
  };
}

module.exports = {
  listPublicExams,
  getPublicExam,
  lookupExamStudent,
  startAttempt,
  getAttemptForStudent,
  saveAttemptAnswers,
  submitAttempt,
  recordAttemptExit,
};
