const mongoose = require('mongoose');

const wheelSegmentSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#1a1a1a'
  },
  gradient: {
    type: [String],
    default: ['#0f0f0f', '#222222']
  }
}, { _id: false });

const wheelConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },
  segments: {
    type: [wheelSegmentSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length >= 4 && v.length <= 16; // 최소 4개, 최대 16개
      },
      message: 'Wheel must have between 4 and 16 segments'
    }
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: {
    type: String
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
wheelConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 기본 설정 찾기
wheelConfigSchema.statics.getDefault = async function() {
  return await this.findOne({ isDefault: true, isActive: true });
};

// 활성 설정 찾기
wheelConfigSchema.statics.getActive = async function() {
  return await this.findOne({ isActive: true }).sort({ isDefault: -1, createdAt: -1 });
};

module.exports = mongoose.model('WheelConfig', wheelConfigSchema);





