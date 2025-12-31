require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');
const corsMiddleware = require('./middleware/cors');
const { attachSecurityInfo } = require('./middleware/security');
const { checkBlockedUser } = require('./middleware/blockedUserCheck');

// Routes
const userRoutes = require('./routes/userRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const weeklyGoalRoutes = require('./routes/weeklyGoalRoutes');
const promoCodeRoutes = require('./routes/promoCodeRoutes');
const promoCodeRequestRoutes = require('./routes/promoCodeRequestRoutes');
const wheelConfigRoutes = require('./routes/wheelConfigRoutes');
const wheelRoutes = require('./routes/wheelRoutes');
const shopItemRoutes = require('./routes/shopItemRoutes');
const adminRoutes = require('./routes/adminRoutes');
const telegramBotRoutes = require('./routes/telegramBotRoutes');
const botConfigRoutes = require('./routes/botConfigRoutes');
const securityRoutes = require('./routes/securityRoutes');
const channelRoutes = require('./routes/channelRoutes');
const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const itemRoutes = require('./routes/itemRoutes');
const gameConfigRoutes = require('./routes/gameConfigRoutes');

// Connect to MongoDB
connectDB();

// 서버리스 환경: 봇 초기화 제거 (webhook 기반 무상태 아키텍처)
// 모든 봇 처리는 handleWebhookUpdate를 통해 요청마다 새 인스턴스 생성

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(corsMiddleware);

// Webhook 엔드포인트는 raw body를 받아야 하므로 bodyParser 이전에 등록
// 텔레그램 webhook은 raw JSON을 보내므로 별도 처리 필요
app.use('/api/telegram-bot/webhook', express.raw({ type: 'application/json' }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(attachSecurityInfo); // IP 및 기기정보 수집

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

// Static files for admin panel (기존 HTML 버전 - 필요시 주석 해제)
// React Router가 /admin 경로를 처리하므로 정적 파일 서빙은 제거
// app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Serve React app static files (after build)
// 빌드된 React 앱이 있으면 서빙 (개발/프로덕션 모두)
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
  // /admin 경로는 React Router가 처리하므로 정적 파일 서빙에서 제외
  app.use((req, res, next) => {
    // /admin 경로는 React Router가 처리하도록 넘김
    if (req.path.startsWith('/admin')) {
      return next();
    }
    // 나머지 경로는 정적 파일로 서빙
    express.static(buildPath)(req, res, next);
  });
}

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/weekly-goals', weeklyGoalRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/promo-code-requests', promoCodeRequestRoutes);
app.use('/api/wheel-configs', wheelConfigRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/shop-items', shopItemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/telegram-bot', telegramBotRoutes);
app.use('/api/bot-config', botConfigRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/channel', channelRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/game-config', gameConfigRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve React app (catch all handler - must be after API routes)
// 빌드된 React 앱이 있으면 서빙
if (fs.existsSync(buildPath)) {
  app.get('*', (req, res) => {
    // Don't serve React app for API routes
    // /admin 경로는 React Router가 처리하므로 여기서도 index.html을 서빙
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    // React Router가 /admin 경로도 처리하므로 모든 경로에 index.html 서빙
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Vercel 서버리스 환경에서는 app을 export하고 listen하지 않음
// 로컬 환경에서만 서버 시작
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Game frontend: http://localhost:${PORT}/`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`API: http://localhost:${PORT}/api`);
    if (!fs.existsSync(buildPath)) {
      console.log(`\n⚠️  Warning: React app not built yet. Run 'npm run build:dev' first.`);
    }
    console.log(`\n📝 Note: Telegram bot uses webhook mode. Set webhook URL in admin panel.`);
  });
}

// Vercel 서버리스 함수를 위해 app export
module.exports = app;


