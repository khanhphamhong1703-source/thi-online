export const QUESTION_IMPORT_TEMPLATE = `Phần I: Trắc nghiệm
Câu 1: Nội dung câu hỏi?
A. Đáp án A
B. Đáp án B
C. Đáp án C
D. Đáp án D
Đáp án đúng: A
Điểm: 1

Phần II: Đúng/Sai
Câu 2: Nội dung câu hỏi?
a) Ý 1
b) Ý 2
c) Ý 3
d) Ý 4
Đáp án: Đ, S, Đ, S
Điểm: 1

Phần III: Trả lời ngắn
Câu 3: Nội dung câu hỏi?
Đáp án: 1,5
Điểm: 2`;

const QUESTION_PATTERNS = [
  /^(?:Câu|Cau|Question)\s*\d+\s*(?:[.):\-–—]\s*)?(.*)$/i,
  /^\d{1,3}\s*[.)\/]\s+(.+)$/,
];
const OPTION_PATTERN = /^([A-Fa-f])\s*[.):\-–—\/]\s*(.+)$/;
const ANSWER_PATTERN =
  /^(?:Đáp\s*án(?:\s*đúng)?|Dap\s*an|Answer)\s*[:\-–—]?\s*(.+)$/i;
const POINTS_PATTERN = /^(?:Điểm|Diem|Points?)\s*[:\-–—]?\s*(\d+(?:[.,]\d+)?)\s*$/i;
const SECTION_PATTERN =
  /^(?:Phần|Phan|Part)\s*(III|II|I|3|2|1)\b\s*(?:[.:\-–—]\s*)?(.*)$/i;

const SECTION_MAP = {
  I: 'I',
  II: 'II',
  III: 'III',
  1: 'I',
  2: 'II',
  3: 'III',
};
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function matchQuestionStart(line) {
  for (const pattern of QUESTION_PATTERNS) {
    const match = line.match(pattern);
    if (match) return match[1] || '';
  }
  return null;
}

function appendText(value, extra) {
  return value ? `${value} ${extra}` : extra;
}

function normalizeTrueFalseToken(token) {
  const normalized = String(token || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .trim()
    .toUpperCase();
  if (['D', 'DUNG', 'TRUE', 'T', '1'].includes(normalized)) return true;
  if (['S', 'SAI', 'FALSE', 'F', '0'].includes(normalized)) return false;
  return null;
}

function parseTrueFalseAnswers(value) {
  const tokens = String(value || '')
    .split(/[,;|/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length !== 4) return null;
  const answers = tokens.map(normalizeTrueFalseToken);
  return answers.every((answer) => typeof answer === 'boolean') ? answers : null;
}

function isValidShortAnswer(value) {
  const answer = String(value || '').trim();
  if (answer.length < 1 || answer.length > 4) return false;
  if (!/^-?[0-9,]+$/.test(answer)) return false;
  if ((answer.match(/,/g) || []).length > 1) return false;
  if (answer.startsWith(',') || answer.endsWith(',')) return false;
  if (answer.startsWith('-') && !/^-?[0-9]/.test(answer)) return false;
  return /[0-9]/.test(answer);
}

export function parseQuestionText(text) {
  const normalized = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ');
  const lines = normalized.split('\n');
  const collected = [];
  let current = null;
  let lastKind = null;
  let lastOption = null;
  let currentSection = 'I';

  const startQuestion = (content, lineNumber) => {
    if (current) collected.push(current);
    current = {
      content: content || '',
      options: {},
      correctLetter: null,
      trueFalseAnswerText: null,
      correctText: null,
      points: 1,
      section: currentSection,
      lineNumber,
    };
    lastKind = content ? 'content' : 'blankContent';
    lastOption = null;
  };

  const hasAnswer = () =>
    Boolean(
      current?.correctLetter ||
        current?.trueFalseAnswerText ||
        current?.correctText
    );

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line) {
      lastKind = 'blank';
      return;
    }

    const sectionMatch = line.match(SECTION_PATTERN);
    if (sectionMatch) {
      if (current) {
        collected.push(current);
        current = null;
      }
      currentSection = SECTION_MAP[sectionMatch[1].toUpperCase()] || 'I';
      lastKind = null;
      lastOption = null;
      return;
    }

    const questionContent = matchQuestionStart(line);
    if (questionContent !== null) {
      if (
        current &&
        (current.content ||
          Object.keys(current.options).length > 0 ||
          hasAnswer())
      ) {
        collected.push(current);
        current = null;
      }
      startQuestion(questionContent.trim(), lineNumber);
      return;
    }

    const answerMatch = line.match(ANSWER_PATTERN);
    if (answerMatch) {
      if (!current) startQuestion('', lineNumber);
      const value = answerMatch[1].trim();
      if (current.section === 'I') {
        current.correctLetter = value.toUpperCase();
      } else if (current.section === 'II') {
        current.trueFalseAnswerText = value;
      } else {
        current.correctText = value;
      }
      lastKind = 'answer';
      return;
    }

    const pointsMatch = line.match(POINTS_PATTERN);
    if (pointsMatch) {
      if (!current) startQuestion('', lineNumber);
      current.points = Number(pointsMatch[1].replace(',', '.'));
      lastKind = 'points';
      return;
    }

    const optionMatch = line.match(OPTION_PATTERN);
    if (optionMatch) {
      if (!current) startQuestion('', lineNumber);
      const letter = optionMatch[1].toUpperCase();
      current.options[letter] = appendText(current.options[letter] || '', optionMatch[2].trim());
      lastKind = 'option';
      lastOption = letter;
      return;
    }

    if (!current) {
      startQuestion(line, lineNumber);
      return;
    }

    if (hasAnswer()) {
      collected.push(current);
      current = null;
      startQuestion(line, lineNumber);
      return;
    }

    if (lastKind === 'option' && lastOption) {
      current.options[lastOption] = appendText(current.options[lastOption], line);
    } else if (Object.keys(current.options).length === 0) {
      current.content = appendText(current.content, line);
      lastKind = 'content';
    } else if (lastOption) {
      current.options[lastOption] = appendText(current.options[lastOption], line);
    }
  });

  if (current) collected.push(current);

  const questions = collected.map((question, index) => {
    const errors = [];
    const content = question.content.trim();
    const points = Number(question.points) || 1;
    const section = question.section || 'I';

    if (!content) errors.push('Thiếu nội dung câu hỏi');
    if (!(Number(points) > 0)) errors.push('Điểm phải lớn hơn 0');

    if (section === 'II') {
      const statements = OPTION_LETTERS.map((letter) =>
        (question.options[letter] || '').trim()
      );
      const extraLetters = Object.keys(question.options).filter(
        (letter) => !OPTION_LETTERS.includes(letter)
      );
      statements.forEach((statement, statementIndex) => {
        if (!statement) errors.push(`Thiếu nội dung ý ${statementIndex + 1}`);
      });
      if (extraLetters.length) errors.push('Phần II chỉ hỗ trợ 4 ý a, b, c, d');
      const answers = parseTrueFalseAnswers(question.trueFalseAnswerText);
      if (!answers) {
        errors.push('Thiếu hoặc sai dòng Đáp án: Đ, S, Đ, S');
      }
      return {
        id: `import-${index}-${question.lineNumber}`,
        content,
        options: [],
        correctOption: 0,
        statements: statements.map((statement, statementIndex) => ({
          content: statement,
          correct: answers ? answers[statementIndex] : false,
        })),
        correctText: null,
        points,
        section,
        lineNumber: question.lineNumber,
        errors,
      };
    }

    if (section === 'III') {
      const correctText = String(question.correctText || '').trim();
      if (!isValidShortAnswer(correctText)) {
        errors.push('Đáp án ngắn phải có 1–4 ký tự theo quy tắc 4 ô');
      }
      return {
        id: `import-${index}-${question.lineNumber}`,
        content,
        options: [],
        correctOption: 0,
        statements: [],
        correctText,
        points,
        section,
        lineNumber: question.lineNumber,
        errors,
      };
    }

    const options = OPTION_LETTERS.map((letter) => (question.options[letter] || '').trim());
    const extraLetters = Object.keys(question.options).filter(
      (letter) => !OPTION_LETTERS.includes(letter)
    );
    options.forEach((option, optionIndex) => {
      if (!option) errors.push(`Thiếu đáp án ${OPTION_LETTERS[optionIndex]}`);
    });
    if (extraLetters.length) errors.push('Chỉ hỗ trợ 4 đáp án A, B, C, D');
    if (!question.correctLetter) {
      errors.push('Thiếu dòng Đáp án đúng: A/B/C/D');
    } else if (!OPTION_LETTERS.includes(question.correctLetter)) {
      errors.push('Đáp án đúng phải là A, B, C hoặc D');
    }

    return {
      id: `import-${index}-${question.lineNumber}`,
      content,
      options,
      correctOption: OPTION_LETTERS.indexOf(question.correctLetter),
      statements: [],
      correctText: null,
      points,
      section: 'I',
      lineNumber: question.lineNumber,
      errors,
    };
  });

  const valid = questions.filter((question) => question.errors.length === 0);
  return {
    questions,
    summary: {
      total: questions.length,
      valid: valid.length,
      invalid: questions.length - valid.length,
    },
    globalError:
      normalized.trim() && questions.length === 0
        ? 'Không nhận diện được câu hỏi. Hãy dùng đúng mẫu bên cạnh.'
        : '',
  };
}
