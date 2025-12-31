const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * 관리자 계정 모델
 * 
 * 역할:
 * - DEVELOPER: 최상위 권한, 고정 비밀번호 사용 (DB에 저장 안 함)
 * - LEADER: ADMIN보다 상위 권한, DB 초기화 가능, ADMIN 승인 가능
 * - ADMIN: 일반 관리자, DB 초기화 불가, 승인 권한 없음
 * 
 * 상태:
 * - PENDING: 등록 신청, 로그인 불가
 * - APPROVED: 승인 완료, 로그인 가능
 */
const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: function() {
      // DEVELOPER는 username이 없음
      return this.role !== 'DEVELOPER';
    },
    unique: true,
    sparse: true, // null 값 허용
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // DEVELOPER는 password가 DB에 저장되지 않음
      return this.role !== 'DEVELOPER';
    },
    minlength: 6
  },
  role: {
    type: String,
    enum: ['DEVELOPER', 'LEADER', 'ADMIN'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED'],
    default: 'PENDING',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  collection: 'admins'
});

// 비밀번호 해싱 (저장 전)
adminSchema.pre('save', async function(next) {
  // DEVELOPER는 비밀번호 해싱 불필요
  if (this.role === 'DEVELOPER') {
    return next();
  }
  
  // 비밀번호가 변경된 경우에만 해싱
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 비교 메서드
adminSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.role === 'DEVELOPER') {
    return false; // DEVELOPER는 이 메서드 사용 안 함
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// 승인 처리
adminSchema.methods.approve = function(approvedBy) {
  this.status = 'APPROVED';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Admin', adminSchema);


