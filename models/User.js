const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    default: 'username'
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  avatar: {
    type: String
  },
  balance: {
    type: Number,
    default: 94
  },
  highScore: {
    type: Number,
    default: 0
  },
  totalCryptoEarned: {
    type: Number,
    default: 0
  },
  totalGames: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  lastPlayed: {
    type: Date
  },
  // 보안 관련 정보
  ipAddress: {
    type: String
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    language: String
  },
  lastIpAddress: {
    type: String
  },
  lastLoginAt: {
    type: Date
  },
  // 계정 상태
  isBlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  blockedAt: {
    type: Date
  },
  blockReason: {
    type: String
  },
  // 리퍼럴 관련
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0
  },
  referralRewardClaimed: {
    type: Boolean,
    default: false
  },
  referralRewards: [{
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fromUsername: String,
    amount: Number,
    claimed: Boolean,
    claimedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // 채널 구독 상태
  subscribedChannels: {
    type: [String],
    default: []
  },
  subscriptionCheckedAt: {
    type: Date
  },
  // 아이템 인벤토리
  inventory: [{
    itemKey: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 업데이트 시 updatedAt 자동 갱신
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// 인덱스 추가
userSchema.index({ highScore: -1 });
userSchema.index({ balance: -1 });
userSchema.index({ totalCryptoEarned: -1 });
userSchema.index({ telegramId: 1 });
userSchema.index({ isBlocked: 1 });
userSchema.index({ ipAddress: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });

// 리퍼럴 코드 생성 메서드
userSchema.methods.generateReferralCode = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = mongoose.model('User', userSchema);


