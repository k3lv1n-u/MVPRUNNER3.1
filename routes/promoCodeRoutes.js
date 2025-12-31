const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCodeController');

// 구매 가능한 프로모션 코드 목록 조회 (상점용) - 특정 라우트를 먼저 정의
router.get('/shop/purchasable', promoCodeController.getPurchasableCodes);

// 모든 프로모션 코드 조회 (관리자용)
router.get('/', promoCodeController.getAllCodes);

// 프로모션 코드 검증
router.post('/:telegramId/verify', promoCodeController.verifyCode);

// 프로모션 코드 사용 (휠 당첨 점수 저장)
router.post('/:telegramId/use', promoCodeController.useCode);

// 프로모션 코드 구매 (상점)
router.post('/:telegramId/purchase', promoCodeController.purchasePromoCode);

// 사용자의 프로모션 코드 목록 조회
router.get('/:telegramId', promoCodeController.getUserCodes);

// 암호화폐 지급 완료 처리 (관리자용)
router.post('/:id/mark-paid', promoCodeController.markCryptoPaid);

module.exports = router;

