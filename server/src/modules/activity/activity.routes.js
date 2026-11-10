const express = require('express');
const validate = require('../../middlewares/validate');
const activityController = require('./activity.controller');
const { activityQuerySchema } = require('./activity.validation');

const router = express.Router();

router.get('/', validate({ query: activityQuerySchema }), activityController.listMine);

module.exports = router;
