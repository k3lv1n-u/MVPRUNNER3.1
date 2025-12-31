const GameConfig = require('../models/GameConfig');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Multer 설정: 메모리 스토리지 사용 (데이터베이스에 저장하기 위해)
const upload = multer({
  storage: multer.memoryStorage(), // 메모리에 저장하여 Base64로 변환
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 현재 광고 이미지 가져오기 (Base64 데이터 포함)
exports.getAdImage = async (req, res) => {
  try {
    const config = await GameConfig.getConfig();
    
    // updatedAt을 버전으로 사용하여 캐시 버스팅
    const version = config.updatedAt ? config.updatedAt.getTime() : Date.now();
    
    // 데이터베이스에 이미지 데이터가 있으면 Base64로 반환
    if (config.adImageData) {
      res.json({
        success: true,
        adImagePath: config.adImagePath,
        adImageData: config.adImageData,
        adImageMimeType: config.adImageMimeType,
        hasImageData: true,
        version: version // 캐시 버스팅용 버전
      });
    } else {
      // 데이터베이스에 이미지 데이터가 없으면 경로만 반환 (하위 호환성)
      res.json({
        success: true,
        adImagePath: config.adImagePath,
        hasImageData: false,
        version: version // 캐시 버스팅용 버전
      });
    }
  } catch (error) {
    console.error('Error getting ad image:', error);
    res.status(500).json({
      success: false,
      message: '광고 이미지 정보를 가져오는데 실패했습니다.',
      error: error.message
    });
  }
};

// 광고 이미지 업로드
exports.uploadAdImage = async (req, res) => {
  try {
    const uploadSingle = upload.single('adImage');
    
    uploadSingle(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || '이미지 업로드에 실패했습니다.'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '이미지 파일이 제공되지 않았습니다.'
        });
      }

      // 이미지를 Base64로 인코딩
      const imageBase64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      
      // 설정 업데이트
      const config = await GameConfig.getConfig();
      
      // 데이터베이스에 이미지 데이터 저장
      config.adImageData = imageBase64;
      config.adImageMimeType = mimeType;
      config.adImagePath = `/api/game-config/ad-image/data`; // 데이터베이스에서 가져오는 경로
      config.updatedAt = new Date();
      await config.save();

      res.json({
        success: true,
        message: '광고 이미지가 성공적으로 업로드되었습니다.',
        adImagePath: config.adImagePath,
        hasImageData: true
      });
    });
  } catch (error) {
    console.error('Error uploading ad image:', error);
    res.status(500).json({
      success: false,
      message: '광고 이미지 업로드에 실패했습니다.',
      error: error.message
    });
  }
};

// 광고 이미지를 기본값(gyrocop.png)으로 리셋
exports.resetAdImage = async (req, res) => {
  try {
    const config = await GameConfig.getConfig();
    
    // 기본 이미지를 Base64로 로드
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

    // 데이터베이스에 기본 이미지 저장
    config.adImageData = defaultImageData;
    config.adImageMimeType = defaultMimeType;
    config.adImagePath = '/gyrocop.png';
    config.updatedAt = new Date();
    await config.save();

    res.json({
      success: true,
      message: '광고 이미지가 기본값으로 리셋되었습니다.',
      adImagePath: '/gyrocop.png',
      hasImageData: defaultImageData !== null
    });
  } catch (error) {
    console.error('Error resetting ad image:', error);
    res.status(500).json({
      success: false,
      message: '광고 이미지 리셋에 실패했습니다.',
      error: error.message
    });
  }
};

// Base64 이미지 데이터를 이미지로 반환하는 엔드포인트
exports.getAdImageData = async (req, res) => {
  try {
    const config = await GameConfig.getConfig();
    
    if (config.adImageData) {
      // Base64 데이터를 이미지로 반환
      const imageBuffer = Buffer.from(config.adImageData, 'base64');
      const mimeType = config.adImageMimeType || 'image/png';
      
      // 캐시 방지 헤더 설정 (이미지 변경 시 즉시 반영)
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      // ETag를 updatedAt 기반으로 설정하여 변경 감지
      const etag = `"${config.updatedAt.getTime()}"`;
      res.setHeader('ETag', etag);
      res.send(imageBuffer);
    } else {
      // 데이터베이스에 이미지가 없으면 기본 이미지 반환
      const defaultImagePath = path.join(__dirname, '../public/gyrocop.png');
      if (fs.existsSync(defaultImagePath)) {
        const imageBuffer = fs.readFileSync(defaultImagePath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', imageBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(imageBuffer);
      } else {
        res.status(404).json({
          success: false,
          message: '이미지를 찾을 수 없습니다.'
        });
      }
    }
  } catch (error) {
    console.error('Error getting ad image data:', error);
    res.status(500).json({
      success: false,
      message: '이미지를 가져오는데 실패했습니다.',
      error: error.message
    });
  }
};

