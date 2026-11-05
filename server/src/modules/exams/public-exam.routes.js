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

const startLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã thử vào thi quá nhiều lần. Vui lòng thử lại sau.',
  },
});

router.get('/exams', validate({ query: publicExamsQuerySchema }), publicExamController.listExams);
router.post(
  '/exams/lookup',
  startLimiter,
  validate({ body: startAttemptSchema }),
  publicExamController.lookupExam
);
router.get('/exams/:id', validate({ params: examIdSchema }), publicExamController.getExam);
router.post(
  '/exams/:id/start',
  startLimiter,
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
