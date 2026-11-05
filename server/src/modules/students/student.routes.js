const express = require('express');
const validate = require('../../middlewares/validate');
const studentController = require('./student.controller');
const { updateStudentSchema, idSchema } = require('./student.validation');

const router = express.Router();

router.get('/:id', validate({ params: idSchema }), studentController.getStudent);
router.patch(
  '/:id',
  validate({ params: idSchema, body: updateStudentSchema }),
  studentController.updateStudent
);

module.exports = router;
