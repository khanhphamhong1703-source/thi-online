const express = require('express');
const validate = require('../../middlewares/validate');
const { uploadDocument } = require('../../middlewares/upload');
const examController = require('./exam.controller');
const {
  createExamSchema,
  updateExamSchema,
  listExamsQuerySchema,
  examIdSchema,
  attemptDetailParamsSchema,
  resultsQuerySchema,
  exportResultsQuerySchema,
} = require('./exam.validation');

const router = express.Router();

router.get('/', validate({ query: listExamsQuerySchema }), examController.listExams);
router.post('/', validate({ body: createExamSchema }), examController.createExam);
router.post('/import-text', uploadDocument, examController.importText);
router.get('/:id', validate({ params: examIdSchema }), examController.getExam);
router.patch(
  '/:id',
  validate({ params: examIdSchema, body: updateExamSchema }),
  examController.updateExam
);
router.post(
  '/:id/publish',
  validate({ params: examIdSchema }),
  examController.publishExam
);
router.post('/:id/close', validate({ params: examIdSchema }), examController.closeExam);
router.delete('/:id', validate({ params: examIdSchema }), examController.deleteExam);
router.get(
  '/:id/attempts',
  validate({ params: examIdSchema, query: resultsQuerySchema }),
  examController.getResults
);
router.get(
  '/:id/attempts/:attemptId',
  validate({ params: attemptDetailParamsSchema }),
  examController.getAttemptDetail
);
router.get(
  '/:id/results/export',
  validate({ params: examIdSchema, query: exportResultsQuerySchema }),
  examController.exportResults
);

module.exports = router;
