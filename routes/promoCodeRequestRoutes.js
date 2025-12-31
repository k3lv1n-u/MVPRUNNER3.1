const express = require('express');
const router = express.Router();
const promoCodeRequestController = require('../controllers/promoCodeRequestController');

// 모든 프로모션 코드 요청 조회 (관리자용)
router.get('/', promoCodeRequestController.getAllRequests);

// 프로모션 코드 요청 승인 및 발급
router.post('/:requestId/approve', promoCodeRequestController.approveRequest);

// 프로모션 코드 요청 거부
router.post('/:requestId/reject', promoCodeRequestController.rejectRequest);

// 사용자의 프로모션 코드 요청 상태 확인
router.get('/user/:telegramId', promoCodeRequestController.getUserRequestStatus);

module.exports = router;





