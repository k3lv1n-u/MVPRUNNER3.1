const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');

/**
 * 채널 가입 여부 확인 (서버 측 검증)
 * 
 * POST /api/channel/check-subscription
 * 
 * 요청 본문:
 * {
 *   initData: "Telegram WebApp initData 문자열"
 * }
 */
router.post('/check-subscription', channelController.checkChannelSubscription);

/**
 * 필수 채널 목록 가져오기
 * 
 * GET /api/channel/required-channels
 */
router.get('/required-channels', channelController.getRequiredChannels);

module.exports = router;


