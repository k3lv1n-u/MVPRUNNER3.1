const express = require('express');
const router = express.Router();
const wheelController = require('../controllers/wheelController');

// 행운의 휠 스핀
router.post('/spin', wheelController.spinWheel);

module.exports = router;





