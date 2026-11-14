const crypto = require('crypto');
const { getQuestionMaxPoints } = require('./exam.grading');

const ATTEMPT_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  AUTO_SUBMITTED: 'AUTO_SUBMITTED',
};

const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAccessCode(length = 6) {
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += ACCESS_CODE_CHARS[crypto.randomInt(0, ACCESS_CODE_CHARS.length)];
  }
  return code;
}

function getExamPhase(exam, now = new Date()) {
  if (exam.closeAt && now >= new Date(exam.closeAt)) return 'ENDED';
  if (now < new Date(exam.openAt)) return 'UPCOMING';
  return 'OPEN';
}

function calculateTotals(questions = [], trueFalseScores) {
  return {
    questionCount: questions.length,
    totalPoints:
      Math.round(
        questions.reduce(
          (sum, question) => sum + getQuestionMaxPoints(question, trueFalseScores),
          0
        ) * 100
      ) / 100,
  };
}

function shuffleArray(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = crypto.randomInt(0, index + 1);
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function normalizeAnswers(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((answer) => answer && typeof answer.questionId === 'string')
    .map((answer) => {
      const normalized = { questionId: answer.questionId };
      if (Number.isInteger(answer.selectedOption) && answer.selectedOption >= 0) {
        normalized.selectedOption = answer.selectedOption;
      }
      if (Array.isArray(answer.statementAnswers) && answer.statementAnswers.length === 4) {
        normalized.statementAnswers = answer.statementAnswers.map((item) =>
          typeof item === 'boolean' ? item : null
        );
      }
      if (typeof answer.textAnswer === 'string') {
        normalized.textAnswer = answer.textAnswer.trim().slice(0, 4);
      }
      return normalized;
    })
    .filter(
      (answer) =>
        answer.selectedOption !== undefined ||
        answer.statementAnswers !== undefined ||
        answer.textAnswer !== undefined
    );
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  ATTEMPT_STATUS,
  generateAccessCode,
  getExamPhase,
  calculateTotals,
  shuffleArray,
  normalizeAnswers,
  roundScore,
};
