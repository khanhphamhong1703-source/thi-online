const { z } = require('zod');
const {
  DEFAULT_TRUE_FALSE_SCORES,
  isValidShortAnswer,
} = require('./exam.grading');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ');

const statementSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập nội dung ý')
    .max(1000, 'Nội dung ý tối đa 1000 ký tự'),
  correct: z.boolean(),
});

const questionSchema = z
  .object({
    id: objectId.optional(),
    content: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập nội dung câu hỏi')
      .max(2000, 'Nội dung câu hỏi tối đa 2000 ký tự'),
    options: z
      .array(z.string().trim().min(1, 'Đáp án không được để trống').max(500))
      .max(6, 'Tối đa 6 đáp án')
      .optional()
      .default([]),
    correctOption: z.coerce.number().int().min(0, 'Đáp án đúng không hợp lệ').optional().default(0),
    statements: z.array(statementSchema).length(4, 'Phần II cần đúng 4 ý').optional(),
    correctText: z.string().trim().max(4, 'Đáp án ngắn tối đa 4 ký tự').optional().default(''),
    points: z.coerce.number().positive('Điểm phải lớn hơn 0').max(100, 'Điểm tối đa 100'),
    section: z.enum(['I', 'II', 'III']).default('I'),
  })
  .superRefine((question, context) => {
    if (question.section === 'I') {
      if (question.options.length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cần ít nhất 2 đáp án',
          path: ['options'],
        });
      }
      if (question.correctOption >= question.options.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Đáp án đúng không hợp lệ',
          path: ['correctOption'],
        });
      }
      return;
    }

    if (question.section === 'II' && (!question.statements || question.statements.length !== 4)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Phần II cần đúng 4 ý',
        path: ['statements'],
      });
    }

    if (question.section === 'III' && !isValidShortAnswer(question.correctText)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Đáp án ngắn không hợp lệ',
        path: ['correctText'],
      });
    }
  });

const examFields = {
  title: z.string().trim().min(3, 'Tên đề thi phải có ít nhất 3 ký tự').max(200),
  subject: z.string().trim().min(1, 'Vui lòng nhập môn học').max(100),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự').optional().nullable(),
  classIds: z
    .array(objectId)
    .min(0)
    .max(20, 'Tối đa 20 lớp cho một đề thi'),
  durationMinutes: z.coerce.number().int().min(1, 'Thời lượng tối thiểu 1 phút').max(300),
  openAt: z.coerce.date({ message: 'Thời gian mở không hợp lệ' }),
  closeAt: z.preprocess(
    (value) => (value === '' || value === null ? null : value),
    z.coerce
      .date({ message: 'Thời gian đóng không hợp lệ' })
      .nullable()
      .optional()
  ),
  maxAttempts: z.coerce
    .number()
    .int()
    .min(0, 'Số lượt làm không được âm')
    .max(100, 'Số lượt làm tối đa là 100'),
  trueFalseScores: z
    .array(z.coerce.number().min(0, 'Điểm không được âm').max(100, 'Điểm tối đa 100'))
    .length(4, 'Cần đủ 4 mức điểm Đúng/Sai')
    .default(DEFAULT_TRUE_FALSE_SCORES),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showScore: z.boolean().default(true),
  sectionTitles: z
    .object({
      I: z.string().trim().max(120, 'Tên phần tối đa 120 ký tự').default(''),
      II: z.string().trim().max(120, 'Tên phần tối đa 120 ký tự').default(''),
      III: z.string().trim().max(120, 'Tên phần tối đa 120 ký tự').default(''),
    })
    .default({ I: '', II: '', III: '' }),
};

function withDateOrder(schema) {
  return schema.refine(
    (data) =>
      !data.closeAt ||
      new Date(data.closeAt).getTime() > new Date(data.openAt).getTime(),
    {
      message: 'Thời gian kết thúc phải sau thời gian mở',
      path: ['closeAt'],
    }
  );
}

const createExamSchema = withDateOrder(
  z.object({
    ...examFields,
    questions: z.array(questionSchema).min(1, 'Đề thi cần ít nhất một câu hỏi').max(200),
  })
);

const updateExamSchema = withDateOrder(
  z.object({
    ...examFields,
    questions: z.array(questionSchema).min(1, 'Đề thi cần ít nhất một câu hỏi').max(200).optional(),
  })
);

const listExamsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(100).optional().default(''),
  classId: objectId.optional(),
});

const examIdSchema = z.object({ id: objectId });

const attemptDetailParamsSchema = z.object({
  id: objectId,
  attemptId: objectId,
});

const resultsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(100).optional().default(''),
  classId: objectId.optional(),
  status: z
    .enum(['all', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'])
    .optional()
    .default('all'),
});

const exportResultsQuerySchema = z.object({
  classId: objectId.optional(),
});

const publicExamsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  search: z.string().trim().max(100).optional().default(''),
});

const startAttemptSchema = z.object({
  studentCode: z.string().trim().min(1, 'Vui lòng nhập mã học sinh').max(30),
  accessCode: z
    .string()
    .trim()
    .length(6, 'Mã ca thi phải có 6 ký tự')
    .transform((value) => value.toUpperCase()),
});

const attemptIdSchema = z.object({ id: objectId });

const answerSchema = z.object({
  questionId: objectId,
  selectedOption: z.coerce.number().int().min(0).optional(),
  statementAnswers: z.array(z.boolean().nullable()).length(4).optional(),
  textAnswer: z.string().trim().max(4).optional(),
});

const saveAnswersSchema = z.object({
  answers: z.array(answerSchema).max(200),
});

const submitAttemptSchema = z
  .object({
    answers: z.array(answerSchema).max(200).optional(),
  })
  .optional()
  .default({});

module.exports = {
  createExamSchema,
  updateExamSchema,
  listExamsQuerySchema,
  examIdSchema,
  attemptDetailParamsSchema,
  resultsQuerySchema,
  exportResultsQuerySchema,
  publicExamsQuerySchema,
  startAttemptSchema,
  attemptIdSchema,
  saveAnswersSchema,
  submitAttemptSchema,
};
