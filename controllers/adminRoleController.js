const Admin = require('../models/Admin');

/**
 * 관리자 역할 변경
 * 
 * PUT /api/auth/admins/:adminId/role
 * 
 * 요청 본문:
 * {
 *   role: "LEADER" | "ADMIN"
 * }
 */
exports.updateAdminRole = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { role } = req.body;

    if (!adminId || !role) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID and role are required'
      });
    }

    // 역할 검증
    if (!['LEADER', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be LEADER or ADMIN'
      });
    }

    // DEVELOPER, LEADER만 접근 가능
    if (!['DEVELOPER', 'LEADER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // LEADER 역할은 DEVELOPER만 설정 가능
    if (role === 'LEADER' && req.user.role !== 'DEVELOPER') {
      return res.status(403).json({
        success: false,
        error: 'Only DEVELOPER can set LEADER role'
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

    // PENDING 상태일 때만 역할 변경 가능
    if (admin.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Can only change role for PENDING admins'
      });
    }

    // 역할 변경
    admin.role = role;
    await admin.save();

    console.log(`[AdminRole] Role updated: ${admin.username} -> ${role} by ${req.user.role} (${req.user.username || 'DEVELOPER'})`);

    res.json({
      success: true,
      message: 'Role updated successfully',
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role,
        status: admin.status
      }
    });
  } catch (error) {
    console.error('[AdminRole] Error updating role:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};


