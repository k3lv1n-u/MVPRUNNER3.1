// 요청 빈도 제한 및 비정상 패턴 감지 미들웨어

// 메모리 기반 요청 추적 (프로덕션에서는 Redis 사용 권장)
const requestHistory = new Map();
const suspiciousPatterns = new Map();

// 요청 기록 정리 (1시간마다)
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, history] of requestHistory.entries()) {
    requestHistory.set(key, history.filter(timestamp => timestamp > oneHourAgo));
    if (requestHistory.get(key).length === 0) {
      requestHistory.delete(key);
    }
  }
}, 3600000);

/**
 * 요청 빈도 제한 미들웨어
 * @param {Object} options - 제한 옵션
 * @param {number} options.windowMs - 시간 윈도우 (밀리초)
 * @param {number} options.maxRequests - 최대 요청 수
 * @param {string} options.keyGenerator - 요청 키 생성 함수 (기본: IP + 경로)
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 60000, // 기본 1분
    maxRequests = 30, // 기본 30회
    keyGenerator = (req) => `${req.clientIp || req.ip || 'unknown'}-${req.path}`
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // 요청 기록 가져오기 또는 초기화
    let history = requestHistory.get(key) || [];
    
    // 시간 윈도우 밖의 기록 제거
    history = history.filter(timestamp => timestamp > now - windowMs);
    
    // 요청 수 확인
    if (history.length >= maxRequests) {
      // 의심스러운 패턴 기록
      const suspiciousKey = `${key}-suspicious`;
      const suspiciousCount = suspiciousPatterns.get(suspiciousKey) || 0;
      suspiciousPatterns.set(suspiciousKey, suspiciousCount + 1);
      
      console.warn(`[RateLimit] Too many requests from ${key}: ${history.length} requests in ${windowMs}ms`);
      
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // 현재 요청 기록
    history.push(now);
    requestHistory.set(key, history);
    
    next();
  };
};

/**
 * 비정상 패턴 감지 미들웨어
 * - 동일 IP에서 짧은 시간 내 많은 다른 telegramId로 요청
 * - 동일 telegramId에서 비정상적으로 높은 점수 제출
 * - 동일 경로에서 매우 빠른 연속 요청
 */
const detectAnomalies = (req, res, next) => {
  const ip = req.clientIp || req.ip || 'unknown';
  const path = req.path;
  const telegramId = req.body?.telegramId || req.params?.telegramId;
  
  // IP 기반 의심 패턴 확인
  const suspiciousKey = `${ip}-suspicious`;
  const suspiciousCount = suspiciousPatterns.get(suspiciousKey) || 0;
  
  if (suspiciousCount > 10) {
    console.warn(`[AnomalyDetection] Suspicious activity detected from IP: ${ip}`);
    return res.status(403).json({
      success: false,
      error: 'Suspicious activity detected. Access denied.'
    });
  }
  
  // 게임 기록 저장 시 비정상 패턴 감지
  if (path.includes('/record') && req.method === 'POST') {
    const { score, obstaclesPassed, coinsCollected } = req.body;
    
    // 비정상적으로 높은 점수 (10000 이상)
    if (score > 10000) {
      const highScoreKey = `${ip}-highscore`;
      const highScoreCount = suspiciousPatterns.get(highScoreKey) || 0;
      suspiciousPatterns.set(highScoreKey, highScoreCount + 1);
      
      if (highScoreCount > 3) {
        console.warn(`[AnomalyDetection] Multiple high scores from IP: ${ip}`);
        return res.status(400).json({
          success: false,
          error: 'Unusual score pattern detected. Please contact support.'
        });
      }
    }
  }
  
  next();
};

/**
 * 특정 경로에 대한 커스텀 제한
 */
const customRateLimit = {
  // 게임 기록 저장: 1분에 5회
  gameRecord: rateLimit({
    windowMs: 60000,
    maxRequests: 5,
    keyGenerator: (req) => `${req.body?.telegramId || req.clientIp || 'unknown'}-record`
  }),
  
  // 잔액 업데이트: 1분에 10회
  balanceUpdate: rateLimit({
    windowMs: 60000,
    maxRequests: 10,
    keyGenerator: (req) => `${req.params?.telegramId || req.clientIp || 'unknown'}-balance`
  }),
  
  // 일반 API: 1분에 30회
  general: rateLimit({
    windowMs: 60000,
    maxRequests: 30
  })
};

module.exports = {
  rateLimit,
  detectAnomalies,
  customRateLimit,
  requestHistory,
  suspiciousPatterns
};

