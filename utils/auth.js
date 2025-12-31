const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// JWT 시크릿 키 (환경 변수 또는 기본값)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// DEVELOPER 고정 비밀번호
const DEVELOPER_PASSWORD = 'Rrs252924';

/**
 * JWT 토큰 생성
 * 
 * @param {Object} payload - 토큰에 포함할 데이터
 * @returns {string} JWT 토큰
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * JWT 토큰 검증
 * 
 * @param {string} token - 검증할 토큰
 * @returns {Object|null} 디코딩된 페이로드 또는 null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * DEVELOPER 로그인 검증
 * 
 * @param {string} password - 입력된 비밀번호
 * @returns {boolean} 검증 성공 여부
 */
function verifyDeveloperPassword(password) {
  return password === DEVELOPER_PASSWORD;
}

/**
 * 인증 미들웨어
 * 
 * 요청 헤더에서 토큰을 추출하고 검증합니다.
 * req.user에 사용자 정보를 추가합니다.
 */
async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.adminToken ||
                  req.body?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    // DEVELOPER는 DB에 없으므로 직접 처리
    if (decoded.role === 'DEVELOPER') {
      req.user = {
        id: 'DEVELOPER',
        role: 'DEVELOPER',
        username: null
      };
      return next();
    }

    // LEADER/ADMIN는 DB에서 확인
    const admin = await Admin.findById(decoded.id);
    if (!admin || admin.status !== 'APPROVED') {
      return res.status(401).json({ 
        success: false, 
        error: 'Account not found or not approved' 
      });
    }

    // 마지막 로그인 시간 업데이트
    admin.lastLoginAt = new Date();
    await admin.save();

    req.user = {
      id: admin._id.toString(),
      role: admin.role,
      username: admin.username
    };

    next();
  } catch (error) {
    console.error('[Auth] Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
}

/**
 * 권한 체크 미들웨어
 * 
 * @param {string[]} allowedRoles - 허용된 역할 배열
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
}

/**
 * DEVELOPER 전용 미들웨어
 */
const requireDeveloper = requireRole(['DEVELOPER']);

/**
 * LEADER 이상 권한 미들웨어 (DEVELOPER, LEADER)
 */
const requireLeader = requireRole(['DEVELOPER', 'LEADER']);

/**
 * ADMIN 이상 권한 미들웨어 (모든 역할)
 */
const requireAdmin = requireRole(['DEVELOPER', 'LEADER', 'ADMIN']);

module.exports = {
  generateToken,
  verifyToken,
  verifyDeveloperPassword,
  authenticate,
  requireRole,
  requireDeveloper,
  requireLeader,
  requireAdmin
};


