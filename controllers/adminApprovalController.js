const Admin = require('../models/Admin');

/**
 * LEADER 승인 (DEVELOPER 전용)
 * 
 * POST /api/auth/approve-leader
 * 
 * 요청 본문:
 * {
 *   adminId: "admin_id_string"
 * }
 */
exports.approveLeader = async (req, res) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID is required'
      });
    }

    // DEVELOPER 권한 확인 (미들웨어에서 이미 확인됨)
    if (req.user.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        error: 'Only DEVELOPER can approve LEADER accounts'
      });
    }

    // 관리자 찾기
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // LEADER만 승인 가능
    if (admin.role !== 'LEADER') {
      return res.status(400).json({
        success: false,
        error: 'Can only approve LEADER accounts'
      });
    }

    // 이미 승인된 경우
    if (admin.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Admin is already approved'
      });
    }

    // 승인 처리
    admin.status = 'APPROVED';
    admin.approvedBy = null; // DEVELOPER는 DB에 없으므로 null
    admin.approvedAt = new Date();
    await admin.save();

    console.log(`[AdminApproval] LEADER approved: ${admin.username} by DEVELOPER`);

    res.json({
      success: true,
      message: 'LEADER account approved successfully',
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role,
        status: admin.status
      }
    });
  } catch (error) {
    console.error('[AdminApproval] Approve leader error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * ADMIN 승인 (LEADER 전용)
 * 
 * POST /api/auth/approve-admin
 * 
 * 요청 본문:
 * {
 *   adminId: "admin_id_string"
 * }
 */
exports.approveAdmin = async (req, res) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID is required'
      });
    }

    // LEADER 이상 권한 확인 (미들웨어에서 이미 확인됨)
    if (!['DEVELOPER', 'LEADER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only LEADER or DEVELOPER can approve ADMIN accounts'
      });
    }

    // 관리자 찾기
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // DEVELOPER는 모든 역할 승인 가능, LEADER는 ADMIN만 승인 가능
    if (req.user.role === 'LEADER' && admin.role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'LEADER can only approve ADMIN accounts'
      });
    }

    // 이미 승인된 경우
    if (admin.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Admin is already approved'
      });
    }

    // 승인 처리
    const approver = await Admin.findOne({ username: req.user.username });
    admin.status = 'APPROVED';
    admin.approvedBy = approver ? approver._id : null;
    admin.approvedAt = new Date();
    await admin.save();

    console.log(`[AdminApproval] ADMIN approved: ${admin.username} by ${req.user.role} (${req.user.username || 'DEVELOPER'})`);

    res.json({
      success: true,
      message: 'ADMIN account approved successfully',
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role,
        status: admin.status
      }
    });
  } catch (error) {
    console.error('[AdminApproval] Approve admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * 대기 중인 관리자 목록 가져오기
 * 
 * GET /api/auth/pending-admins
 */
exports.getPendingAdmins = async (req, res) => {
  try {
    // DEVELOPER 또는 LEADER만 접근 가능
    if (!['DEVELOPER', 'LEADER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const pendingAdmins = await Admin.find({ status: 'PENDING' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      admins: pendingAdmins
    });
  } catch (error) {
    console.error('[AdminApproval] Get pending admins error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

