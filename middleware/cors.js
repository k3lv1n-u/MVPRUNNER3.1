const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV === 'development' || !origin) {
      return callback(null, true);
    }
    // 프로덕션/Vercel에서는 모든 origin 허용 (같은 도메인에서 서빙되므로)
    // 또는 특정 origin만 허용하려면 아래 주석을 해제하고 설정
    const allowedOrigins = [
      process.env.CORS_ORIGIN,
      'http://localhost:3000',
      'http://localhost:3001'
    ].filter(Boolean);
    
    // Vercel 배포 시 같은 도메인에서 서빙되므로 모든 origin 허용
    if (process.env.VERCEL || allowedOrigins.length === 0) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);


