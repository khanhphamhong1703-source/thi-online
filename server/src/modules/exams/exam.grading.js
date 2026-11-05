const DEFAULT_TRUE_FALSE_SCORES = [0.1, 0.25, 0.5, 1];

function normalizeTrueFalseScores(value) {
  if (!Array.isArray(value) || value.length !== 4) return [...DEFAULT_TRUE_FALSE_SCORES];
  const scores = value.map((score) => Number(score));
  if (scores.some((score) => !Number.isFinite(score) || score < 0)) {
    return [...DEFAULT_TRUE_FALSE_SCORES];
  }
  return scores;
}

function normalizeStatements(value) {
  const statements = Array.isArray(value) ? value : [];
  return Array.from({ length: 4 }, (_, index) => {
    const statement = statements[index] || {};
    return {
      content: String(statement.content || '').trim(),
      correct: Boolean(statement.correct),
    };
  });
}

function normalizeStatementAnswers(value) {
  const answers = Array.isArray(value) ? value : [];
  return Array.from({ length: 4 }, (_, index) =>
    typeof answers[index] === 'boolean' ? answers[index] : null
  );
}

function normalizeShortAnswer(value) {
  return String(value || '').trim();
}

function isValidShortAnswer(value) {
  const answer = normalizeShortAnswer(value);
  if (answer.length < 1 || answer.length > 4) return false;
  if (!/^-?[0-9,]+$/.test(answer)) return false;
  if ((answer.match(/,/g) || []).length > 1) return false;
  if (answer.startsWith(',') || answer.endsWith(',')) return false;
  if (answer.startsWith('-') && !/^-?[0-9]/.test(answer)) return false;
  return /[0-9]/.test(answer);
}

function getQuestionMaxPoints(question, trueFalseScores) {
  if (question.section === 'II') {
    return normalizeTrueFalseScores(trueFalseScores)[3];
  }
  return Number(question.points || 0);
}

function gradeQuestion(question, answer, trueFalseScores) {
  const maxPoints = getQuestionMaxPoints(question, trueFalseScores);

  if (question.section === 'II') {
    const statements = normalizeStatements(question.statements);
    const statementAnswers = normalizeStatementAnswers(answer?.statementAnswers);
    const answered = statementAnswers.some((value) => value !== null);
    let correctCount = 0;
    for (let index = 0; index < 4; index += 1) {
      if (statementAnswers[index] !== null && statementAnswers[index] === statements[index].correct) {
        correctCount += 1;
      }
    }
    const scores = normalizeTrueFalseScores(trueFalseScores);
    return {
      answered,
      isCorrect: correctCount === 4,
      correctCount,
      earnedPoints: correctCount > 0 ? scores[correctCount - 1] : 0,
      maxPoints,
    };
  }

  if (question.section === 'III') {
    const answerText = normalizeShortAnswer(answer?.textAnswer);
    const correctText = normalizeShortAnswer(question.correctText);
    const answered = answerText.length > 0;
    return {
      answered,
      isCorrect: answered && answerText === correctText,
      correctCount: answered && answerText === correctText ? 1 : 0,
      earnedPoints: answered && answerText === correctText ? maxPoints : 0,
      maxPoints,
    };
  }

  const selectedOption = Number.isInteger(answer?.selectedOption)
    ? answer.selectedOption
    : null;
  const answered = selectedOption !== null;
  const isCorrect = answered && selectedOption === question.correctOption;
  return {
    answered,
    isCorrect,
    correctCount: isCorrect ? 1 : 0,
    earnedPoints: isCorrect ? maxPoints : 0,
    maxPoints,
  };
}

module.exports = {
  DEFAULT_TRUE_FALSE_SCORES,
  normalizeTrueFalseScores,
  normalizeStatements,
  normalizeStatementAnswers,
  normalizeShortAnswer,
  isValidShortAnswer,
  getQuestionMaxPoints,
  gradeQuestion,
};
