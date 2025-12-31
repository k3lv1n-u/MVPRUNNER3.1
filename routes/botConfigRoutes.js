const express = require('express');
const router = express.Router();
const botConfigController = require('../controllers/botConfigController');

// 봇 설정 가져오기
router.get('/', botConfigController.getConfig);

// 봇 설정 업데이트
router.post('/', botConfigController.updateConfig);

// 봇 활성화/비활성화
router.post('/toggle-active', botConfigController.toggleActive);

// 필수 채널 목록 가져오기 (공개 API)
router.get('/required-channels', botConfigController.getRequiredChannels);

// 필수 채널 설정 업데이트 (관리자 전용 - adminRoutes에서 처리)
// router.post('/required-channels', botConfigController.updateRequiredChannels);

module.exports = router;




