const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireLeader } = require('../utils/auth');

// 데이터베이스 초기화 (DEVELOPER, LEADER만 가능)
router.post('/reset-database', authenticate, requireLeader, adminController.resetDatabase);

// 진행 상황만 초기화 (DEVELOPER, LEADER만 가능, 사용자 정보는 유지)
router.post('/reset-progress', authenticate, requireLeader, adminController.resetProgress);

// 점수 기록만 초기화 (DEVELOPER, LEADER만 가능, 코인/아이템 등은 유지)
router.post('/reset-scores', authenticate, requireLeader, adminController.resetScores);

// 데이터베이스 통계
router.get('/stats', adminController.getDatabaseStats);

// 그래프 데이터
router.get('/graph-data', adminController.getGraphData);

// 필수 채널 설정 업데이트
router.post('/required-channels', adminController.updateRequiredChannels);

// 필수 채널 목록 가져오기 (관리자 패널용 프록시)
router.get('/required-channels', async (req, res, next) => {
  try {
    const botConfigController = require('../controllers/botConfigController');
    return botConfigController.getRequiredChannels(req, res, next);
  } catch (error) {
    console.error('Error proxying required channels:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;




