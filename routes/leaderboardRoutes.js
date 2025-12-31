const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { customRateLimit, detectAnomalies } = require('../middleware/rateLimit');

// 리더보드 가져오기 (점수 리더보드)
router.get('/', customRateLimit.general, leaderboardController.getLeaderboard);

// 암호화폐 리더보드
router.get('/crypto', customRateLimit.general, leaderboardController.getCryptoLeaderboard);

// 게임코인 리더보드
router.get('/coins', customRateLimit.general, leaderboardController.getCoinLeaderboard);

// 특정 사용자의 순위 가져오기
router.get('/rank/:telegramId', customRateLimit.general, leaderboardController.getUserRank);

// 게임 기록 저장 (빈도 제한 + 비정상 패턴 감지)
router.post('/record', customRateLimit.gameRecord, detectAnomalies, leaderboardController.saveGameRecord);

// 최근 게임 기록 가져오기
router.get('/records', leaderboardController.getRecentRecords);

// 주간 리더보드 가져오기
router.get('/weekly', leaderboardController.getWeeklyLeaderboard);

module.exports = router;


