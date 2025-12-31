const Admin = require('../models/Admin');

/**
 * 모든 관리자 목록 가져오기
 * 
 * GET /api/auth/admins
 * 
 * DEVELOPER, LEADER만 접근 가능
 */
exports.getAllAdmins = async (req, res) => {
  try {
    // DEVELOPER, LEADER만 접근 가능
    if (!['DEVELOPER', 'LEADER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // 모든 관리자 가져오기 (비밀번호 제외)
    const admins = await Admin.find({})
      .select('-password')
      .populate('approvedBy', 'username role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      admins: admins.map(admin => ({
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role,
        status: admin.status,
        approvedBy: admin.approvedBy ? {
          id: admin.approvedBy._id.toString(),
          username: admin.approvedBy.username,
          role: admin.approvedBy.role
        } : null,
        approvedAt: admin.approvedAt,
        createdAt: admin.createdAt,
        lastLoginAt: admin.lastLoginAt
      }))
    });
  } catch (error) {
    console.error('[AdminManagement] Error getting all admins:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * 관리자 삭제
 * 
 * DELETE /api/auth/admins/:adminId
 * 
 * DEVELOPER, LEADER만 접근 가능
 */
exports.deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID is required'
      });
    }

    // DEVELOPER, LEADER만 접근 가능
    if (!['DEVELOPER', 'LEADER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
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

    // 자기 자신은 삭제 불가
    if (req.user.role !== 'DEVELOPER' && admin._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // DEVELOPER는 삭제 불가 (DB에 없음)
    if (admin.role === 'DEVELOPER') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete DEVELOPER account'
      });
    }

    // LEADER는 DEVELOPER만 삭제 가능
    if (admin.role === 'LEADER' && req.user.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        error: 'Only DEVELOPER can delete LEADER accounts'
      });
    }

    // 관리자 삭제
    await Admin.findByIdAndDelete(adminId);

    console.log(`[AdminManagement] Admin deleted: ${admin.username} (${admin.role}) by ${req.user.role} (${req.user.username || 'DEVELOPER'})`);

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('[AdminManagement] Error deleting admin:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};


