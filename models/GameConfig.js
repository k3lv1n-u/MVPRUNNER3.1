const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const gameConfigSchema = new mongoose.Schema({
  adImagePath: {
    type: String,
    default: '/gyrocop.png', // 기본값: 비행선 이미지 (하위 호환성)
    required: true
  },
  adImageData: {
    type: String, // Base64 인코딩된 이미지 데이터
    default: null
  },
  adImageMimeType: {
    type: String, // image/png, image/jpeg 등
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 싱글톤 패턴: 항상 하나의 설정만 존재
gameConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    // 기본 이미지를 Base64로 로드하여 초기화
    const defaultImagePath = path.join(__dirname, '../public/gyrocop.png');
    let defaultImageData = null;
    let defaultMimeType = 'image/png';
    
    try {
      if (fs.existsSync(defaultImagePath)) {
        const imageBuffer = fs.readFileSync(defaultImagePath);
        defaultImageData = imageBuffer.toString('base64');
      }
    } catch (error) {
      console.error('Error loading default image:', error);
    }
    
    config = await this.create({
      adImagePath: '/gyrocop.png',
      adImageData: defaultImageData,
      adImageMimeType: defaultMimeType
    });
  }
  return config;
};

module.exports = mongoose.model('GameConfig', gameConfigSchema);

