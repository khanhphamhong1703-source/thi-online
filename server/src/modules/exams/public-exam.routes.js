const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../../middlewares/validate');
const { authenticateAttempt } = require('../../middlewares/attemptAuth');
const publicExamController = require('./public-exam.controller');
const {
  publicExamsQuerySchema,
  examIdSchema,
  startAttemptSchema,
  attemptIdSchema,
  saveAnswersSchema,
  submitAttemptSchema,
} = require('./exam.validation');

const router = express.Router();

const WINDOW_MS = 15 * 60 * 1000;

// Giới hạn theo từng học sinh (mã ca thi + mã học sinh) thay vì theo IP, vì cả lớp
// hoặc cả trường thường dùng chung một IP công cộng.
function studentKey(req) {
  const accessCode = String(req.body?.accessCode || '').trim().toUpperCase();
  const studentCode = String(req.body?.studentCode || '').trim().toUpperCase();
  return `${accessCode}:${studentCode}`;
}

const clientLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
  },
});

const studentLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 60,
  keyGenerator: studentKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
  },
});

const identityFailureLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 10,
  skipSuccessfulRequests: true,
  // Chỉ đếm lần sai mã ca thi/mã học sinh; lỗi nghiệp vụ (ca chưa mở, đã kết thúc,
  // hết lượt, dữ liệu không hợp lệ) không được tính vào hạn mức.
  requestWasSuccessful: (_req, res) => ![401, 403, 404].includes(res.statusCode),
  keyGenerator: studentKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Thông tin học sinh hoặc mã ca thi đã thử sai quá nhiều lần. Vui lòng thử lại sau.',
  },
});

router.get('/exams', validate({ query: publicExamsQuerySchema }), publicExamController.listExams);
router.post(
  '/exams/lookup',
  clientLimiter,
  studentLimiter,
  identityFailureLimiter,
  validate({ body: startAttemptSchema }),
  publicExamController.lookupExam
);
router.get('/exams/:id', validate({ params: examIdSchema }), publicExamController.getExam);
router.post(
  '/exams/:id/start',
  clientLimiter,
  studentLimiter,
  identityFailureLimiter,
  validate({ params: examIdSchema, body: startAttemptSchema }),
  publicExamController.startAttempt
);

router.get(
  '/attempts/:id',
  validate({ params: attemptIdSchema }),
  authenticateAttempt,
  publicExamController.getAttempt
);
router.patch(
  '/attempts/:id/answers',
  validate({ params: attemptIdSchema, body: saveAnswersSchema }),
  authenticateAttempt,
  publicExamController.saveAnswers
);
router.post(
  '/attempts/:id/submit',
  validate({ params: attemptIdSchema, body: submitAttemptSchema }),
  authenticateAttempt,
  publicExamController.submitAttempt
);
router.post(
  '/attempts/:id/exit',
  validate({ params: attemptIdSchema }),
  authenticateAttempt,
  publicExamController.recordExit
);

module.exports = router;
