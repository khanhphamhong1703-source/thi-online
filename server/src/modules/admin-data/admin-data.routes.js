const express = require('express');
const validate = require('../../middlewares/validate');
const { uploadBackup } = require('../../middlewares/upload');
const adminDataController = require('./admin-data.controller');
const { importOptionsSchema } = require('./admin-backup.service');
const {
  teacherQuerySchema,
  classQuerySchema,
  studentQuerySchema,
  examQuerySchema,
  idParamSchema,
} = require('./admin-data.validation');
const { adminActivityQuerySchema } = require('../activity/activity.validation');

const router = express.Router();

router.get('/summary', adminDataController.getSummary);
router.get(
  '/activity',
  validate({ query: adminActivityQuerySchema }),
  adminDataController.listActivity
);
router.get('/teachers', validate({ query: teacherQuerySchema }), adminDataController.listTeachers);
router.get('/classes', validate({ query: classQuerySchema }), adminDataController.listClasses);
router.get('/students', validate({ query: studentQuerySchema }), adminDataController.listStudents);
router.get('/exams', validate({ query: examQuerySchema }), adminDataController.listExams);
router.get('/backup/export', adminDataController.exportBackup);
router.post(
  '/backup/import',
  uploadBackup,
  validate({ body: importOptionsSchema }),
  adminDataController.importBackup
);

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
router.get(
  '/teachers/:id/delete-impact',
  validate({ params: idParamSchema }),
  adminDataController.getTeacherDeleteImpact
);
router.delete(
  '/classes/:id',
  validate({ params: idParamSchema }),
  adminDataController.deleteClass
);
router.get(
  '/classes/:id/delete-impact',
  validate({ params: idParamSchema }),
  adminDataController.getClassDeleteImpact
);
router.delete(
  '/students/:id',
  validate({ params: idParamSchema }),
  adminDataController.deleteStudent
);
router.get(
  '/students/:id/delete-impact',
  validate({ params: idParamSchema }),
  adminDataController.getStudentDeleteImpact
);
router.delete(
  '/exams/:id',
  validate({ params: idParamSchema }),
  adminDataController.deleteExam
);
router.get(
  '/exams/:id/delete-impact',
  validate({ params: idParamSchema }),
  adminDataController.getExamDeleteImpact
);

module.exports = router;
