const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  itemKey: {
    type: String,
    unique: true,
    sparse: true, // 고정 아이템 식별자 (promo-code, slow-shoes)
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['promo-code', 'item'],
    required: true,
    index: true
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: 0 // 0이면 무제한
  },
  soldCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // 프로모션 코드 관련 설정
  promoCodeConfig: {
    wheelConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WheelConfig'
    },
    autoIssue: {
      type: Boolean,
      default: false // true면 구매 시 자동 발급, false면 요청 생성
    }
  },
  // 기타 아이템 설정 (향후 확장용)
  itemConfig: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

shopItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

shopItemSchema.index({ type: 1, isActive: 1 });
shopItemSchema.index({ isActive: 1, stock: 1 });

module.exports = mongoose.model('ShopItem', shopItemSchema);

