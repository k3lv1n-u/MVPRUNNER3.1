const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { customRateLimit, detectAnomalies } = require('../middleware/rateLimit');
const { authenticate, requireLeader } = require('../utils/auth');

// 사용자 생성/업데이트
router.post('/', customRateLimit.general, userController.createOrUpdateUser);

// 사용자 정보 가져오기
router.get('/:telegramId', customRateLimit.general, userController.getUser);

// 잔액 업데이트 (서버 내부 전용 - 외부 요청 차단)
router.put('/:telegramId/balance', customRateLimit.balanceUpdate, detectAnomalies, userController.updateBalance);

// 사용자 통계 가져오기
router.get('/:telegramId/stats', userController.getUserStats);

// 모든 사용자 가져오기 (관리자용)
router.get('/', userController.getAllUsers);

// 계정 블록
router.post('/:telegramId/block', userController.blockUser);

// 계정 블록 해제
router.post('/:telegramId/unblock', userController.unblockUser);

// 관리자용 잔액 업데이트 (LEADER, DEVELOPER만 접근 가능)
router.put('/:telegramId/balance/admin', authenticate, requireLeader, userController.updateBalanceByAdmin);

module.exports = router;


