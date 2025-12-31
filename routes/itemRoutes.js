const express = require('express');
const router = express.Router();
const itemPurchaseController = require('../controllers/itemPurchaseController');

// 아이템 구매
router.post('/:telegramId/purchase', itemPurchaseController.purchaseItem);

// 사용자 인벤토리 조회
router.get('/:telegramId/inventory', itemPurchaseController.getUserInventory);

// 아이템 사용
router.post('/:telegramId/use', itemPurchaseController.useItem);

module.exports = router;
