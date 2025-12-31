const User = require('../models/User');
const { calculateEmulatorScore } = require('../utils/emulatorDetection');

/**
 * 에뮬레이터 fingerprint 검증 및 계정 차단 (서버 측 검증)
 */
exports.checkEmulatorFingerprint = async (req, res) => {
  try {
    const { telegramId, fingerprint } = req.body;

    if (!telegramId || !fingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Telegram ID and fingerprint are required'
      });
    }

    const numericTelegramId = parseInt(telegramId, 10);
    if (Number.isNaN(numericTelegramId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Telegram ID'
      });
    }

    console.log('[Security] Checking fingerprint for telegramId:', numericTelegramId);
    console.log('[Security] Platform:', fingerprint.platform);
    console.log('[Security] UserAgent:', fingerprint.userAgent?.substring(0, 50));
    console.log('[Security] Full fingerprint received:', JSON.stringify(fingerprint, null, 2));

    // 서버 측에서 가중치 점수 계산
    const scoreResult = calculateEmulatorScore(fingerprint);

    console.log('[Security] Score calculation result:', {
      totalScore: scoreResult.totalScore,
      blocked: scoreResult.blocked,
      reasons: scoreResult.reasons
    });

    // 100점 이상 시 차단
    if (scoreResult.blocked || scoreResult.totalScore >= 100) {
      try {
        const user = await User.findOne({ telegramId: numericTelegramId });
        if (user) {
          if (!user.isBlocked) {
            user.isBlocked = true;
            user.blockReason = `Emulator detected (score: ${scoreResult.totalScore}/100): ${scoreResult.reasons.join('; ')}`;
            user.blockedAt = new Date();
            await user.save();
            console.warn('[Security] User account blocked due to emulator detection:', {
              telegramId: numericTelegramId,
              totalScore: scoreResult.totalScore,
              reasons: scoreResult.reasons
            });
          }
        } else {
          console.warn('[Security] Emulator detected but user not found:', numericTelegramId);
        }
      } catch (err) {
        console.error('[Security] Failed to block user after emulator detection:', err);
      }

      return res.json({
        success: false,
        isEmulator: true,
        blocked: true,
        totalScore: scoreResult.totalScore,
        reasons: scoreResult.reasons,
        details: scoreResult.details,
        message: 'Emulator or virtual machine detected. Account has been blocked.'
      });
    }

    // 정상 기기 (99점 이하)
    console.log('[Security] Device verified (score:', scoreResult.totalScore, ')');
    return res.json({
      success: true,
      isEmulator: false,
      blocked: false,
      totalScore: scoreResult.totalScore,
      reasons: scoreResult.reasons,
      message: 'Device verification passed'
    });
  } catch (error) {
    console.error('[Security] Error checking emulator fingerprint:', error);
    console.error('[Security] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Server error during emulator check'
    });
  }
};

