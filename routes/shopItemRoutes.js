const express = require('express');
const router = express.Router();
const shopItemController = require('../controllers/shopItemController');

// 활성화된 상점 아이템 조회 (게임용)
router.get('/active', shopItemController.getActiveItems);

// 모든 상점 아이템 조회 (관리자용)
router.get('/', shopItemController.getAllItems);

// 상점 아이템 생성
router.post('/', shopItemController.createItem);

// 상점 아이템 업데이트
router.put('/:id', shopItemController.updateItem);

// 상점 아이템 삭제
router.delete('/:id', shopItemController.deleteItem);

module.exports = router;





