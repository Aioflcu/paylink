const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

router.get('/liveness', healthController.liveness);
router.get('/readiness', healthController.readiness);

module.exports = router;
