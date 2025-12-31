const User = require('../models/User');
const GameRecord = require('../models/GameRecord');
const WeeklyGoal = require('../models/WeeklyGoal');
const PromoCode = require('../models/PromoCode');
const { sendUSDTWinNotification } = require('../services/telegramBot');

// 리더보드 가져오기 (고득점 순) - 점수 리더보드
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const offset = (pageNum - 1) * limitNum;

    // 총 사용자 수 가져오기 (차단되지 않은 사용자만)
    const total = await User.countDocuments({ isBlocked: { $ne: true } });
    const totalPages = Math.ceil(total / limitNum);

    const users = await User.find({ isBlocked: { $ne: true } })
      .sort({ highScore: -1 })
      .limit(limitNum)
      .skip(offset)
      .select('telegramId username avatar highScore balance totalGames')
      .lean();

    // 순위 추가
    const leaderboard = users.map((user, index) => ({
      rank: offset + index + 1,
      telegramId: user.telegramId,
      username: user.username,
      avatar: user.avatar,
      highScore: user.highScore,
      balance: user.balance,
      totalGames: user.totalGames
    }));

    res.json({
      success: true,
      leaderboard,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 암호화폐 리더보드 (총 획득 암호화폐 순)
exports.getCryptoLeaderboard = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const offset = (pageNum - 1) * limitNum;

    // 총 사용자 수 가져오기 (차단되지 않은 사용자만)
    const total = await User.countDocuments({ isBlocked: { $ne: true } });
    const totalPages = Math.ceil(total / limitNum);

    const users = await User.find({ isBlocked: { $ne: true } })
      .sort({ totalCryptoEarned: -1 })
      .limit(limitNum)
      .skip(offset)
      .select('telegramId username avatar totalCryptoEarned balance totalGames')
      .lean();

    // 순위 추가
    const leaderboard = users.map((user, index) => ({
      rank: offset + index + 1,
      telegramId: user.telegramId,
      username: user.username,
      avatar: user.avatar,
      totalCryptoEarned: user.totalCryptoEarned || 0,
      balance: user.balance,
      totalGames: user.totalGames
    }));

    res.json({
      success: true,
      leaderboard,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting crypto leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 게임코인 리더보드 (밸런스 순)
exports.getCoinLeaderboard = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const offset = (pageNum - 1) * limitNum;

    // 총 사용자 수 가져오기 (차단되지 않은 사용자만)
    const total = await User.countDocuments({ isBlocked: { $ne: true } });
    const totalPages = Math.ceil(total / limitNum);

    const users = await User.find({ isBlocked: { $ne: true } })
      .sort({ balance: -1 })
      .limit(limitNum)
      .skip(offset)
      .select('telegramId username avatar balance highScore totalGames')
      .lean();

    // 순위 추가
    const leaderboard = users.map((user, index) => ({
      rank: offset + index + 1,
      telegramId: user.telegramId,
      username: user.username,
      avatar: user.avatar,
      balance: user.balance || 0,
      highScore: user.highScore,
      totalGames: user.totalGames
    }));

    res.json({
      success: true,
      leaderboard,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting coin leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 특정 사용자의 순위 가져오기
exports.getUserRank = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rank = await User.countDocuments({
      highScore: { $gt: user.highScore },
      isBlocked: { $ne: true }
    }) + 1;

    res.json({
      success: true,
      rank,
      highScore: user.highScore
    });
  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 게임 기록 저장
exports.saveGameRecord = async (req, res) => {
  try {
    const { telegramId, score, gameDuration, obstaclesPassed, coinsCollected } = req.body;

    if (!telegramId || score === undefined) {
      return res.status(400).json({ error: 'Telegram ID and score are required' });
    }

    // 점수 검증: 음수 불가
    if (score < 0) {
      return res.status(400).json({ error: 'Score cannot be negative' });
    }

    // 점수와 obstaclesPassed, coinsCollected 관계 검증
    // 현재 게임 로직에서는 "코인"은 점수와 별개로 관리되므로
    // coinsCollected를 점수 검증에 사용하지 않습니다.
    const obstaclesPassedNum = typeof obstaclesPassed === 'number' ? obstaclesPassed : 0;
    const coinsCollectedNum = typeof coinsCollected === 'number' ? coinsCollected : 0;
    
    // 기본 점수 계산 로직 검증
    // 최소 점수: obstaclesPassed만으로도 점수가 있어야 함
    // 최대 점수: 비현실적으로 높은 점수는 거부
    
    // 1. obstaclesPassed가 있으면 최소 점수는 obstaclesPassed 이상이어야 함
    if (obstaclesPassedNum > 0 && score < obstaclesPassedNum) {
      console.warn(`[ScoreValidation] Invalid score: score=${score}, obstaclesPassed=${obstaclesPassedNum}`);
      return res.status(400).json({ 
        error: 'Invalid score: score must be at least equal to obstacles passed',
        details: { score, obstaclesPassed: obstaclesPassedNum }
      });
    }
    
    // 2. 비현실적으로 높은 점수 검증
    // 코인은 점수와 별개이므로, 상한 계산에서는 obstaclesPassed만 사용
    // obstaclesPassed 정보가 없으면(0) 이 검증은 생략하여 클라이언트 점수만 신뢰
    if (obstaclesPassedNum > 0) {
      const maxReasonableScore = obstaclesPassedNum * 1000;
      if (score > maxReasonableScore * 1.5) {
        console.warn(
          `[ScoreValidation] Suspiciously high score: score=${score}, maxReasonable=${maxReasonableScore}`
        );
        return res.status(400).json({
          error:
            'Invalid score: score is unreasonably high compared to obstacles passed',
          details: {
            score,
            obstaclesPassed: obstaclesPassedNum,
            coinsCollected: coinsCollectedNum,
            maxReasonable: maxReasonableScore,
          },
        });
      }
    }
    
    // 3. (삭제됨) 기존에는 coinsCollected에 비례한 최소 점수를 강제했으나
    //    현재 게임 설계에서는 코인과 점수가 서로 독립적이므로 검증에서 제외합니다.

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 새 기록인지 확인
    const isNewRecord = score > user.highScore;

    // 게임 기록 저장
    const gameRecord = new GameRecord({
      userId: user._id,
      telegramId,
      score,
      isNewRecord,
      gameDuration,
      obstaclesPassed,
      coinsCollected
    });

    await gameRecord.save();

    // 사용자 정보 업데이트
    if (isNewRecord) {
      user.highScore = score;
    }
    user.totalGames += 1;
    user.totalScore += score;
    user.lastPlayed = Date.now();
    
    // 동전 수집 시 잔액 업데이트 (게임 기록 저장 시에만 처리)
    if (coinsCollectedNum > 0) {
      user.balance = (user.balance || 0) + coinsCollectedNum;
      console.log(`[GameRecord] Added ${coinsCollectedNum} coins to balance for user ${telegramId}. New balance: ${user.balance}`);
    }
    
    await user.save();

    // ========== REFERRAL REWARD SYSTEM ==========
    // 첫 게임 플레이 시 referral 보상 지급
    let referralRewardGiven = false;
    if (user.totalGames === 1 && user.referredBy && !user.referralRewardClaimed) {
      try {
        const { createNotification } = require('./notificationController');

        // 추천인 찾기
        const referrer = await User.findById(user.referredBy);

        if (referrer) {
          // 새 사용자에게 300 코인 지급
          user.balance = (user.balance || 0) + 300;
          user.referralRewardClaimed = true;
          await user.save();

          // 새 사용자에게 알림 생성
          await createNotification(
            user.telegramId,
            'referral_reward',
            '🎁 Бонус за регистрацию!',
            `Вы получили 300 монет за регистрацию по реферальной ссылке от @${referrer.username || 'пользователя'}!`,
            300,
            referrer.telegramId,
            referrer.username
          );

          // 추천인에게 150 코인 지급
          referrer.balance = (referrer.balance || 0) + 150;
          await referrer.save();

          // 추천인에게 알림 생성
          await createNotification(
            referrer.telegramId,
            'referral_earned',
            '👥 Реферальная награда!',
            `@${user.username || 'Пользователь'} сыграл первую игру! Вы получили 150 монет.`,
            150,
            user.telegramId,
            user.username
          );

          referralRewardGiven = true;

          console.log(`[Referral] Rewards given: ${user.username} (+300), ${referrer.username} (+150)`);
        }
      } catch (referralError) {
        console.error('[Referral] Error giving referral rewards:', referralError);
      }
    }
    // ========== END REFERRAL REWARD SYSTEM ==========


    // 주간 목표 달성 체크
    let weeklyGoalAchieved = false;
    try {
      const currentGoal = await WeeklyGoal.getCurrentGoal();
      if (currentGoal && score >= currentGoal.targetScore) {
        weeklyGoalAchieved = true;
      }
    } catch (goalError) {
      console.error('Error checking weekly goal:', goalError);
    }

    res.json({
      success: true,
      isNewRecord,
      highScore: user.highScore,
      record: {
        id: gameRecord._id,
        score: gameRecord.score,
        playedAt: gameRecord.playedAt
      },
      weeklyGoalAchieved,
      referralRewardGiven
    });
  } catch (error) {
    console.error('Error saving game record:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 최근 게임 기록 가져오기
exports.getRecentRecords = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const records = await GameRecord.find()
      .sort({ playedAt: -1 })
      .limit(parseInt(limit))
      .populate({
        path: 'userId',
        select: 'username avatar telegramId isBlocked',
        match: { isBlocked: { $ne: true } }
      })
      .select('-__v')
      .lean();
    
    // 차단되지 않은 사용자의 기록만 필터링
    const filteredRecords = records.filter(record => record.userId && !record.userId.isBlocked);

    res.json({
      success: true,
      records: filteredRecords
    });
  } catch (error) {
    console.error('Error getting recent records:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 주간 리더보드 가져오기 (현재 주간 목표 기간의 기록)
exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // 현재 주간 목표 가져오기
    const currentGoal = await WeeklyGoal.getCurrentGoal();

    if (!currentGoal) {
      // 주간 목표가 없으면 빈 리더보드 반환
      return res.json({
        success: true,
        leaderboard: [],
        weekInfo: null
      });
    }

    // 주간 목표 기간 내의 게임 기록 가져오기 (차단되지 않은 사용자만)
    const records = await GameRecord.find({
      playedAt: {
        $gte: currentGoal.weekStartDate,
        $lte: currentGoal.weekEndDate
      }
    })
      .sort({ score: -1 })
      .populate({
        path: 'userId',
        select: 'username avatar telegramId isBlocked',
        match: { isBlocked: { $ne: true } }
      })
      .select('-__v')
      .lean();

    // 사용자별 최고 점수 집계 (차단되지 않은 사용자만)
    const userScores = {};
    records.forEach(record => {
      // userId가 populate되지 않았거나 차단된 사용자는 제외
      if (!record.userId || record.userId.isBlocked) {
        return;
      }
      
      const telegramId = record.telegramId;
      if (!userScores[telegramId] || record.score > userScores[telegramId].score) {
        userScores[telegramId] = {
          telegramId: record.telegramId,
          username: record.userId?.username || 'Unknown',
          avatar: record.userId?.avatar,
          score: record.score,
          playedAt: record.playedAt
        };
      }
    });

    // 점수 순으로 정렬
    const weeklyLeaderboard = Object.values(userScores)
      .sort((a, b) => b.score - a.score)
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit))
      .map((user, index) => ({
        rank: parseInt(offset) + index + 1,
        telegramId: user.telegramId,
        username: user.username,
        avatar: user.avatar,
        score: user.score,
        playedAt: user.playedAt
      }));

    res.json({
      success: true,
      leaderboard: weeklyLeaderboard,
      weekInfo: {
        weekStartDate: currentGoal.weekStartDate,
        weekEndDate: currentGoal.weekEndDate,
        targetScore: currentGoal.targetScore
      }
    });
  } catch (error) {
    console.error('Error getting weekly leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


