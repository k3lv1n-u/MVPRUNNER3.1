const express = require('express');
const router = express.Router();
const weeklyGoalController = require('../controllers/weeklyGoalController');

// 현재 주간 목표 가져오기
router.get('/current', weeklyGoalController.getCurrentGoal);

// 가장 최근 주간 목표의 주간 상위 5명 플레이어 정보 (관리자용)
router.get('/top-players', weeklyGoalController.getWeeklyTopPlayers);
// 하위 호환성을 위한 엔드포인트 (기존 코드와의 호환성 유지)
router.get('/top-player', weeklyGoalController.getWeeklyTopPlayer);

// 모든 주간 목표 가져오기 (관리자용)
router.get('/', weeklyGoalController.getAllGoals);

// 주간 목표 생성
router.post('/', weeklyGoalController.createGoal);

// 주간 목표 업데이트
router.put('/:id', weeklyGoalController.updateGoal);

// 주간 목표 삭제
router.delete('/:id', weeklyGoalController.deleteGoal);

// 주간 목표 달성자 목록 조회
router.get('/:goalId/achievers', weeklyGoalController.getGoalAchievers);

// 프로모션 코드 발급 (관리자용) - 개별 발급
router.post('/issue-promo-code', weeklyGoalController.issuePromoCode);
// 상위 5명에게 일괄 프로모션 코드 발급 (관리자용)
router.post('/issue-promo-codes-to-top-players', weeklyGoalController.issuePromoCodesToTopPlayers);

module.exports = router;

