const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true
  },
  telegramId: {
    type: Number,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weeklyGoalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeeklyGoal',
    sparse: true
  },
  wheelConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WheelConfig'
  },
  targetScore: {
    type: Number
  },
  actualScore: {
    type: Number
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  usedAt: {
    type: Date
  },
  wheelPrize: {
    type: Number, // 휠에서 당첨된 점수
    default: 0
  },
  cryptoPaid: {
    type: Boolean,
    default: false
  },
  cryptoPaidAt: {
    type: Date
  },
  purchasePrice: {
    type: Number,
    default: 0 // 게임 코인으로 구매한 경우 가격 저장, 주간 목표 달성은 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 인덱스 추가
promoCodeSchema.index({ telegramId: 1, isUsed: 1 });
promoCodeSchema.index({ weeklyGoalId: 1 });
promoCodeSchema.index({ isPurchasable: 1, isUsed: false });
promoCodeSchema.index({ isPurchasable: 1, stock: 1 });

// 프로모션 코드 생성 헬퍼
promoCodeSchema.statics.generateCode = function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동하기 쉬운 문자 제외
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = mongoose.model('PromoCode', promoCodeSchema);

