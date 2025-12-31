const mongoose = require('mongoose');

const gameRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  telegramId: {
    type: Number,
    required: true,
    index: true
  },
  score: {
    type: Number,
    required: true
  },
  isNewRecord: {
    type: Boolean,
    default: false
  },
  gameDuration: {
    type: Number // 게임 플레이 시간 (초)
  },
  obstaclesPassed: {
    type: Number,
    default: 0
  },
  coinsCollected: {
    type: Number,
    default: 0
  },
  playedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 인덱스 추가
gameRecordSchema.index({ score: -1 });
gameRecordSchema.index({ playedAt: -1 });
gameRecordSchema.index({ userId: 1, playedAt: -1 });

module.exports = mongoose.model('GameRecord', gameRecordSchema);






