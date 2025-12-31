const mongoose = require('mongoose');

const promoCodeRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['weekly-goal', 'shop-purchase'],
    required: true,
    index: true
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
  targetScore: {
    type: Number
  },
  actualScore: {
    type: Number
  },
  isFirstAchiever: {
    type: Boolean,
    default: false
  },
  shopPurchasePrice: {
    type: Number
  },
  shopItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShopItem',
    sparse: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'issued'],
    default: 'pending',
    index: true
  },
  promoCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode',
    sparse: true
  },
  adminNote: {
    type: String
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date
  },
  processedBy: {
    type: String // 관리자 ID 또는 이름
  }
});

// 인덱스 추가
promoCodeRequestSchema.index({ telegramId: 1, status: 1 });
promoCodeRequestSchema.index({ type: 1, status: 1 });
promoCodeRequestSchema.index({ weeklyGoalId: 1, isFirstAchiever: 1 });

module.exports = mongoose.model('PromoCodeRequest', promoCodeRequestSchema);

