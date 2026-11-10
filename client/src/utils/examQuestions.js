export const SECTIONS = ['I', 'II', 'III'];
export const SECTION_ORDER = { I: 0, II: 1, III: 2 };
export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
export const DEFAULT_TRUE_FALSE_SCORES = [0.1, 0.25, 0.5, 1];

export function makeClientId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function blankStatements() {
  return Array.from({ length: 4 }, () => ({ content: '', correct: false }));
}

export function splitShortAnswer(value = '') {
  const chars = String(value || '').split('');
  return Array.from({ length: 4 }, (_, index) => chars[index] || '');
}

export function isValidShortAnswer(value) {
  const answer = String(value || '').trim();
  if (answer.length < 1 || answer.length > 4) return false;
  if (!/^-?[0-9,]+$/.test(answer)) return false;
  if ((answer.match(/,/g) || []).length > 1) return false;
  if (answer.startsWith(',') || answer.endsWith(',')) return false;
  if (answer.startsWith('-') && !/^-?[0-9]/.test(answer)) return false;
  return /[0-9]/.test(answer);
}

export function normalizeTrueFalseScores(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    return [...DEFAULT_TRUE_FALSE_SCORES];
  }
  const scores = value.map((score) => Number(score));
  return scores.some((score) => !Number.isFinite(score) || score < 0)
    ? [...DEFAULT_TRUE_FALSE_SCORES]
    : scores;
}

export function blankQuestion(section = 'I') {
  return {
    clientId: makeClientId(),
    section,
    content: '',
    options: section === 'I' ? ['', '', '', ''] : [],
    correctOption: 0,
    statements: section === 'II' ? blankStatements() : [],
    correctBoxes: section === 'III' ? ['', '', '', ''] : [],
    points: 1,
  };
}

export function sortQuestionsBySection(questions) {
  return [...questions].sort(
    (first, second) => (SECTION_ORDER[first.section] ?? 0) - (SECTION_ORDER[second.section] ?? 0)
  );
}

export function getSectionPoints(questions) {
  return SECTIONS.reduce((totals, section) => {
    totals[section] = questions
      .filter((question) => question.section === section)
      .reduce((sum, question) => sum + (Number(question.points) || 0), 0);
    return totals;
  }, {});
}

export function draftFromExamQuestion(question) {
  return {
    clientId: makeClientId(),
    remoteId: question.id,
    section: SECTIONS.includes(question.section) ? question.section : 'I',
    content: question.content || '',
    options:
      question.section === 'I'
        ? [...(question.options || []), '', '', '', ''].slice(0, 4)
        : [],
    correctOption: question.correctOption || 0,
    statements:
      question.section === 'II' && Array.isArray(question.statements)
        ? [...question.statements, ...blankStatements()].slice(0, 4)
        : blankStatements(),
    correctBoxes:
      question.section === 'III' ? splitShortAnswer(question.correctText) : ['', '', '', ''],
    points: Number(question.points) || 0,
  };
}

export function validateQuestionDraft(question) {
  const questionError = {};
  if (!question.content.trim()) questionError.content = 'Vui lòng nhập nội dung câu hỏi';
  if (question.section === 'I') {
    const optionErrors = (question.options || []).map((option) =>
      option.trim() ? '' : 'Không được để trống'
    );
    if (optionErrors.some(Boolean)) questionError.options = optionErrors;
  }
  if (question.section === 'II') {
    const statements = question.statements || [];
    if (statements.length !== 4 || statements.some((statement) => !statement.content.trim())) {
      questionError.statements = 'Vui lòng nhập đủ nội dung 4 ý';
    }
  }
  if (question.section === 'III' && !isValidShortAnswer((question.correctBoxes || []).join(''))) {
    questionError.correctText = 'Đáp án ngắn không hợp lệ';
  }
  if (!(Number(question.points) > 0)) questionError.points = 'Điểm phải lớn hơn 0';
  return questionError;
}

export function toQuestionPayload(question, scoreValues) {
  const base = {
    id: question.remoteId || undefined,
    section: question.section,
    content: question.content.trim(),
    points: question.section === 'II' ? scoreValues[3] : Number(question.points),
  };
  if (question.section === 'I') {
    return {
      ...base,
      options: (question.options || []).map((option) => option.trim()),
      correctOption: Number(question.correctOption),
    };
  }
  if (question.section === 'II') {
    return {
      ...base,
      statements: (question.statements || []).map((statement) => ({
        content: statement.content.trim(),
        correct: Boolean(statement.correct),
      })),
    };
  }
  return {
    ...base,
    correctText: (question.correctBoxes || []).join(''),
  };
}
