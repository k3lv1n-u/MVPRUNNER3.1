const express = require('express');
const router = express.Router();
const gameConfigController = require('../controllers/gameConfigController');
const { authenticate, requireLeader } = require('../utils/auth');

// 모든 사용자가 광고 이미지 경로를 가져올 수 있음
router.get('/ad-image', gameConfigController.getAdImage);

// Base64 이미지 데이터를 이미지로 반환 (클라이언트에서 img src로 사용)
router.get('/ad-image/data', gameConfigController.getAdImageData);

// 관리자만 광고 이미지 업로드 및 관리 가능
router.post('/ad-image/upload', authenticate, requireLeader, gameConfigController.uploadAdImage);
router.post('/ad-image/reset', authenticate, requireLeader, gameConfigController.resetAdImage);

module.exports = router;

