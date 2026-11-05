const express = require('express');
const validate = require('../../middlewares/validate');
const userController = require('./user.controller');
const {
  createTeacherSchema,
  updateTeacherSchema,
  listTeachersQuerySchema,
  teacherIdSchema,
  statusSchema,
  resetPasswordSchema,
} = require('./user.validation');

const router = express.Router();

router.get('/dashboard', userController.dashboard);

router.get('/teachers', validate({ query: listTeachersQuerySchema }), userController.listTeachers);
router.post('/teachers', validate({ body: createTeacherSchema }), userController.createTeacher);
router.get(
  '/teachers/:id',
  validate({ params: teacherIdSchema }),
  userController.getTeacher
);
router.patch(
  '/teachers/:id',
  validate({ params: teacherIdSchema, body: updateTeacherSchema }),
  userController.updateTeacher
);
router.patch(
  '/teachers/:id/status',
  validate({ params: teacherIdSchema, body: statusSchema }),
  userController.setTeacherStatus
);
router.post(
  '/teachers/:id/reset-password',
  validate({ params: teacherIdSchema, body: resetPasswordSchema }),
  userController.resetPassword
);

module.exports = router;
