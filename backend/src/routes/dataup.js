const express = require('express');
const router = express.Router();
const pushDataController = require('../controllers/pushDataController');

// @route  POST /api/v1/data/push-data
// @desc   Push data to database server from local reactor system.
// @access Public

router.post('/push', pushDataController.pushDataToDatabase);

module.exports = router;
