const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');

// 에뮬레이터 fingerprint 검증
router.post('/emulator-check', securityController.checkEmulatorFingerprint);

module.exports = router;



