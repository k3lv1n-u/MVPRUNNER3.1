// 차단된 사용자 요청 차단 미들웨어

const User = require('../models/User');

/**
 * 차단된 사용자의 요청을 차단하는 미들웨어
 * 요청에서 telegramId를 추출하고, 해당 사용자가 차단되었는지 확인
 */
const checkBlockedUser = async (req, res, next) => {
  try {
    // telegramId 추출 (body, params, query에서)
    const telegramId = req.body?.telegramId || 
                      req.params?.telegramId || 
                      req.query?.telegramId;

    // telegramId가 없으면 다음 미들웨어로 진행 (일부 엔드포인트는 telegramId가 필요 없을 수 있음)
    if (!telegramId) {
      return next();
    }

    // 숫자로 변환
    const numericTelegramId = parseInt(telegramId, 10);
    if (isNaN(numericTelegramId)) {
      return next(); // 유효하지 않은 telegramId는 다음 미들웨어에서 처리
    }

    // 사용자 조회
    const user = await User.findOne({ telegramId: numericTelegramId });

    // 사용자가 존재하고 차단된 경우
    if (user && user.isBlocked) {
      console.warn(`[BlockedUserCheck] Blocked user attempted to access API: ${numericTelegramId}, IP: ${req.clientIp || req.ip}, Path: ${req.path}`);
      
      return res.status(403).json({
        success: false,
        error: 'Account is blocked',
        isBlocked: true,
        blockReason: user.blockReason || 'Account blocked by administrator'
      });
    }

    // 차단되지 않았거나 사용자가 없으면 다음 미들웨어로 진행
    next();
  } catch (error) {
    console.error('[BlockedUserCheck] Error checking blocked user:', error);
    // 에러 발생 시에도 요청을 차단하지 않고 다음 미들웨어로 진행
    // (DB 연결 문제 등으로 인한 오류 시 서비스 중단 방지)
    next();
  }
};

module.exports = {
  checkBlockedUser
};

