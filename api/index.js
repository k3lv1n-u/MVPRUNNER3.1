// Vercel 서버리스 함수 진입점
// Express 앱을 서버리스 함수로 래핑

// 서버 초기화를 한 번만 수행하도록 모듈 스코프에서 로드
let app;
// 서버리스 환경에서는 webhook만 사용하므로 봇 초기화 불필요

try {
  app = require('../server.js');
} catch (error) {
  console.error('Error loading server:', error);
  // Fallback: 직접 Express 앱 생성
  require('dotenv').config();
  const express = require('express');
  const path = require('path');
  const fs = require('fs');
  const connectDB = require('../config/database');
  const corsMiddleware = require('../middleware/cors');
  const { attachSecurityInfo } = require('../middleware/security');
  const { checkBlockedUser } = require('../middleware/blockedUserCheck');
  const bodyParser = require('body-parser');
  
  const userRoutes = require('../routes/userRoutes');
  const leaderboardRoutes = require('../routes/leaderboardRoutes');
  const weeklyGoalRoutes = require('../routes/weeklyGoalRoutes');
  const promoCodeRoutes = require('../routes/promoCodeRoutes');
  const promoCodeRequestRoutes = require('../routes/promoCodeRequestRoutes');
  const wheelConfigRoutes = require('../routes/wheelConfigRoutes');
  const wheelRoutes = require('../routes/wheelRoutes');
  const shopItemRoutes = require('../routes/shopItemRoutes');
  const adminRoutes = require('../routes/adminRoutes');
  
  connectDB();
  
  app = express();
  app.use(corsMiddleware);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(attachSecurityInfo);
  
  // 차단된 사용자 체크 (관리자 및 텔레그램 봇 엔드포인트 제외)
  app.use((req, res, next) => {
    // 관리자, 텔레그램 봇, 인증 관련 엔드포인트는 제외
    if (req.path.startsWith('/api/admin') || 
        req.path.startsWith('/api/telegram-bot') ||
        req.path.startsWith('/api/auth') ||
        req.path.startsWith('/api/security') ||
        req.path === '/api/health') {
      return next();
    }
    // 나머지 API 요청에 대해 차단된 사용자 체크
    checkBlockedUser(req, res, next);
  });
  
  const buildPath = path.join(__dirname, '../build');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
  }
  
  app.use('/api/users', userRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/weekly-goals', weeklyGoalRoutes);
  app.use('/api/promo-codes', promoCodeRoutes);
  app.use('/api/promo-code-requests', promoCodeRequestRoutes);
  app.use('/api/wheel-configs', wheelConfigRoutes);
  app.use('/api/wheel', wheelRoutes);
  app.use('/api/shop-items', shopItemRoutes);
  app.use('/api/admin', adminRoutes);
  
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString()
    });
  });
  
  if (fs.existsSync(buildPath)) {
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
      }
      // 모든 SPA 경로(/admin 포함)는 React Router가 처리
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }
}

// Vercel 서버리스 함수 핸들러
module.exports = (req, res) => {
  // Express 앱이 모든 요청을 처리
  return app(req, res);
};

