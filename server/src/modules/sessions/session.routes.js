const express = require('express');
const validate = require('../../middlewares/validate');
const sessionController = require('./session.controller');
const {
  listSessionsQuerySchema,
  sessionIdSchema,
  userIdSchema,
} = require('./session.validation');

const router = express.Router();

router.get('/', validate({ query: listSessionsQuerySchema }), sessionController.list);
router.delete('/:id', validate({ params: sessionIdSchema }), sessionController.remove);
router.post(
  '/users/:id/revoke-all',
  validate({ params: userIdSchema }),
  sessionController.revokeAll
);

module.exports = router;
