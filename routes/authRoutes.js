const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminApprovalController = require('../controllers/adminApprovalController');
const { authenticate, requireDeveloper, requireLeader } = require('../utils/auth');

// DEVELOPER 로그인
router.post('/developer-login', authController.developerLogin);

// 일반 로그인
router.post('/login', authController.login);

// 회원가입 (등록 신청)
router.post('/register', authController.register);

// 현재 사용자 정보
router.get('/me', authenticate, authController.getMe);

// LEADER 승인 (DEVELOPER 전용)
router.post('/approve-leader', authenticate, requireDeveloper, adminApprovalController.approveLeader);

// ADMIN 승인 (LEADER 이상)
router.post('/approve-admin', authenticate, requireLeader, adminApprovalController.approveAdmin);

// 대기 중인 관리자 목록
router.get('/pending-admins', authenticate, requireLeader, adminApprovalController.getPendingAdmins);

// 관리자 관리 (DEVELOPER, LEADER만)
const adminManagementController = require('../controllers/adminManagementController');
const adminRoleController = require('../controllers/adminRoleController');
router.get('/admins', authenticate, requireLeader, adminManagementController.getAllAdmins);
router.delete('/admins/:adminId', authenticate, requireLeader, adminManagementController.deleteAdmin);
router.put('/admins/:adminId/role', authenticate, requireLeader, adminRoleController.updateAdminRole);

module.exports = router;

