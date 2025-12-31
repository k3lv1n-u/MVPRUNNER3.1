const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// 알림 목록 가져오기
router.get('/:userId', notificationController.getNotifications);

// 알림 읽음 표시
router.post('/:id/read', notificationController.markAsRead);

// 모든 알림 읽음 표시
router.post('/:userId/read-all', notificationController.markAllAsRead);

// 보상 수령
router.post('/:id/claim', notificationController.claimReward);

module.exports = router;
