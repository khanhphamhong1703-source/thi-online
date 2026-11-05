const express = require('express');
const validate = require('../../middlewares/validate');
const adminDataController = require('./admin-data.controller');
const {
  teacherQuerySchema,
  classQuerySchema,
  studentQuerySchema,
  examQuerySchema,
  idParamSchema,
} = require('./admin-data.validation');

const router = express.Router();

router.get('/summary', adminDataController.getSummary);
router.get('/teachers', validate({ query: teacherQuerySchema }), adminDataController.listTeachers);
router.get('/classes', validate({ query: classQuerySchema }), adminDataController.listClasses);
router.get('/students', validate({ query: studentQuerySchema }), adminDataController.listStudents);
router.get('/exams', validate({ query: examQuerySchema }), adminDataController.listExams);

router.patch(
  '/classes/:id/restore',
  validate({ params: idParamSchema }),
  adminDataController.restoreClass
);
router.patch(
  '/classes/:id/archive',
  validate({ params: idParamSchema }),
  adminDataController.archiveClass
);

router.delete(
  '/teachers/:id',
  validate({ params: idParamSchema }),
  adminDataController.deleteTeacher
);
router.delete(
  '/classes/:id',
  validate({ params: idParamSchema }),
  adminDataController.deleteClass
);
router.delete(
  '/students/:id',
  validate({ params: idParamSchema }),
  adminDataController.deleteStudent
);
router.delete(
  '/exams/:id',
  validate({ params: idParamSchema }),
  adminDataController.deleteExam
);

module.exports = router;
