const express = require('express');
const classController = require('./class.controller');

const router = express.Router();

router.get('/dashboard', classController.dashboard);

module.exports = router;
