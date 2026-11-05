const express = require('express');
const validate = require('../../middlewares/validate');
const classController = require('./class.controller');
const {
  classBodySchema,
  updateClassSchema,
  listClassesQuerySchema,
  classIdSchema,
} = require('./class.validation');

const router = express.Router();

router.get('/', validate({ query: listClassesQuerySchema }), classController.listClasses);
router.post('/', validate({ body: classBodySchema }), classController.createClass);
router.get('/:id', validate({ params: classIdSchema }), classController.getClass);
router.patch(
  '/:id',
  validate({ params: classIdSchema, body: updateClassSchema }),
  classController.updateClass
);
router.delete('/:id', validate({ params: classIdSchema }), classController.archiveClass);

module.exports = router;
