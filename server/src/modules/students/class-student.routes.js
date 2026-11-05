const express = require('express');
const validate = require('../../middlewares/validate');
const { uploadExcel } = require('../../middlewares/upload');
const classStudentController = require('./class-student.controller');
const {
  studentBodySchema,
  listStudentsQuerySchema,
  classIdSchema,
  studentIdSchema,
  importReportSchema,
} = require('./student.validation');

const router = express.Router();

const classStudentParamsSchema = classIdSchema.merge(studentIdSchema);

router.get(
  '/:classId/students/export',
  validate({ params: classIdSchema }),
  classStudentController.exportStudents
);

router.post(
  '/:classId/students/import/error-report',
  validate({ params: classIdSchema, body: importReportSchema }),
  classStudentController.errorReport
);

router.post(
  '/:classId/students/import/preview',
  validate({ params: classIdSchema }),
  uploadExcel,
  classStudentController.previewImport
);

router.post(
  '/:classId/students/import/commit',
  validate({ params: classIdSchema }),
  uploadExcel,
  classStudentController.commitImport
);

router.get(
  '/:classId/students',
  validate({ params: classIdSchema, query: listStudentsQuerySchema }),
  classStudentController.listStudents
);

router.post(
  '/:classId/students',
  validate({ params: classIdSchema, body: studentBodySchema }),
  classStudentController.addStudent
);

router.delete(
  '/:classId/students/:studentId',
  validate({ params: classStudentParamsSchema }),
  classStudentController.removeStudent
);

module.exports = router;
