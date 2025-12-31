const mongoose = require('mongoose');

const weeklyGoalSchema = new mongoose.Schema({
  weekStartDate: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  targetScore: {
    type: Number,
    required: true,
    // 데이터베이스 초기화 시 표준 주간 목표 점수
    default: 1000
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
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

// 업데이트 시 updatedAt 자동 갱신
weeklyGoalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 현재 활성 주간 목표 찾기 헬퍼
weeklyGoalSchema.statics.getCurrentGoal = async function() {
  const now = new Date();
  // 날짜만 비교하기 위해 시간을 00:00:00으로 설정
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  return await this.findOne({
    weekStartDate: { $lte: todayEnd },
    weekEndDate: { $gte: todayStart },
    isActive: true
  }).sort({ weekStartDate: -1 });
};

module.exports = mongoose.model('WeeklyGoal', weeklyGoalSchema);

