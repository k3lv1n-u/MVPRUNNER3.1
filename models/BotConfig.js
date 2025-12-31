const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
  botToken: {
    type: String,
    default: ''
  },
  miniAppUrl: {
    type: String,
    default: ''
  },
  botUsername: {
    type: String,
    default: ''
  },
  notificationChannelId: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: false
  },
  requiredChannels: {
    type: [{
      url: { type: String, required: true },
      title: { type: String, required: true },
      chatId: { type: Number, default: null }, // Private 채널의 숫자 chat_id (예: -1002152323324)
      accessHash: { type: String, default: '' } // 사용하지 않지만 호환성을 위해 유지
    }],
    default: []
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'admin'
  }
}, {
  // 단일 문서만 유지
  collection: 'botconfig'
});

// 업데이트 시 updatedAt 자동 갱신
botConfigSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// 단일 설정 문서 가져오기
botConfigSchema.statics.getConfig = async function () {
  try {
    const count = await this.countDocuments();
    if (count > 1) {
      console.warn(`[BotConfig] Warning: Found ${count} config documents. Using the first one.`);
      // 선택적: 중복 제거 로직 추가 가능
    }

    let config = await this.findOne();
    if (!config) {
      console.log('[BotConfig] No config found, creating default config...');
      config = new this({
        botToken: '',
        miniAppUrl: '',
        botUsername: '',
        notificationChannelId: '',
        isActive: false,
        requiredChannels: []
      });
      await config.save();
      console.log('[BotConfig] Default config created:', config._id);
    }
    return config;
  } catch (error) {
    console.error('[BotConfig] Error in getConfig:', error);
    throw error;
  }
};

// 설정 업데이트
botConfigSchema.statics.updateConfig = async function (updates) {
  let config = await this.findOne();
  if (!config) {
    config = new this(updates);
  } else {
    Object.assign(config, updates);
  }
  await config.save();
  return config;
};

module.exports = mongoose.model('BotConfig', botConfigSchema);




