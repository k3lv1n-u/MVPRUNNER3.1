const express = require('express');
const router = express.Router();
const wheelConfigController = require('../controllers/wheelConfigController');

// 활성화된 휠 설정 가져오기 (게임용)
router.get('/active', wheelConfigController.getActiveConfig);

// 기본 휠 설정 가져오기 (관리자용)
router.get('/default', wheelConfigController.getDefaultConfig);

// 모든 휠 설정 가져오기 (관리자용)
router.get('/', wheelConfigController.getAllConfigs);

// 휠 설정 생성
router.post('/', wheelConfigController.createConfig);

// 휠 설정 업데이트
router.put('/:id', wheelConfigController.updateConfig);

// 휠 설정 삭제
router.delete('/:id', wheelConfigController.deleteConfig);

module.exports = router;

