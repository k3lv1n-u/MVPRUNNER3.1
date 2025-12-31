const Admin = require('../models/Admin');
const { generateToken, verifyDeveloperPassword, authenticate } = require('../utils/auth');

/**
 * DEVELOPER 로그인
 * 
 * POST /api/auth/developer-login
 * 
 * 요청 본문:
 * {
 *   password: "Rrs252924"
 * }
 */
exports.developerLogin = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }

    // DEVELOPER 비밀번호 검증
    if (!verifyDeveloperPassword(password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // DEVELOPER 토큰 생성
    const token = generateToken({
      id: 'DEVELOPER',
      role: 'DEVELOPER',
      username: null
    });

    res.json({
      success: true,
      token,
      user: {
        role: 'DEVELOPER',
        username: null
      }
    });
  } catch (error) {
    console.error('[Auth] Developer login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * 일반 로그인 (LEADER/ADMIN)
 * 
 * POST /api/auth/login
 * 
 * 요청 본문:
 * {
 *   username: "admin",
 *   password: "password123"
 * }
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // DB에서 관리자 찾기
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // 승인 상태 확인
    if (admin.status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: 'Account is pending approval. Please wait for approval.',
        status: admin.status
      });
    }

    // 비밀번호 검증
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // 마지막 로그인 시간 업데이트
    admin.lastLoginAt = new Date();
    await admin.save();

    // 토큰 생성
    const token = generateToken({
      id: admin._id.toString(),
      role: admin.role,
      username: admin.username
    });

    res.json({
      success: true,
      token,
      user: {
        id: admin._id.toString(),
        role: admin.role,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * 회원가입 (등록 신청)
 * 
 * POST /api/auth/register
 * 
 * 요청 본문:
 * {
 *   username: "admin",
 *   password: "password123",
 *   role: "ADMIN" // 또는 "LEADER"
 * }
 */
exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // 필수 필드 검증
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Username, password, and role are required'
      });
    }

    // 역할은 기본값으로 ADMIN 설정 (나중에 관리자 패널에서 변경 가능)
    // 사용자가 role을 보내지 않으면 기본값 ADMIN 사용
    const finalRole = role || 'ADMIN';
    
    // 역할 검증
    if (!['LEADER', 'ADMIN'].includes(finalRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be LEADER or ADMIN'
      });
    }

    // DEVELOPER는 등록 불가
    if (finalRole === 'DEVELOPER') {
      return res.status(400).json({
        success: false,
        error: 'DEVELOPER role cannot be registered'
      });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // 중복 username 확인
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // 새 관리자 생성 (PENDING 상태)
    const admin = new Admin({
      username,
      password,
      role: finalRole,
      status: 'PENDING'
    });

    await admin.save();

    console.log(`[Auth] New admin registration: ${username} (${role}) - PENDING`);

    res.json({
      success: true,
      message: 'Registration successful. Please wait for approval.',
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role,
        status: admin.status
      }
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * 현재 사용자 정보 가져오기
 * 
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    // authenticate 미들웨어가 req.user를 설정함
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('[Auth] Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

