const WeeklyGoal = require('../models/WeeklyGoal');
const GameRecord = require('../models/GameRecord');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const WheelConfig = require('../models/WheelConfig');
const { sendWeeklyGoalUpdateNotification, sendNewWeekNotification } = require('../services/telegramBot');

// 현재 주간 목표 가져오기
exports.getCurrentGoal = async (req, res) => {
  try {
    const goal = await WeeklyGoal.getCurrentGoal();

    if (!goal) {
      return res.json({
        success: true,
        goal: null,
        message: 'No active weekly goal'
      });
    }

    res.json({
      success: true,
      goal: {
        id: goal._id,
        weekStartDate: goal.weekStartDate,
        weekEndDate: goal.weekEndDate,
        targetScore: goal.targetScore,
        description: goal.description,
        isActive: goal.isActive
      }
    });
  } catch (error) {
    console.error('Error getting current goal:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 주간 목표 달성자 목록 조회
exports.getGoalAchievers = async (req, res) => {
  try {
    const { goalId } = req.params;

    const goal = await WeeklyGoal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Weekly goal not found' });
    }

    // 주간 목표 달성한 게임 기록 조회 (차단되지 않은 사용자만)
    const achievers = await GameRecord.find({
      playedAt: {
        $gte: goal.weekStartDate,
        $lte: goal.weekEndDate
      },
      score: { $gte: goal.targetScore }
    })
      .sort({ playedAt: 1 }) // 가장 먼저 달성한 순서
      .populate({
        path: 'userId',
        select: 'username telegramId avatar isBlocked',
        match: { isBlocked: { $ne: true } }
      })
      .select('-__v')
      .lean();

    // 이미 프로모션 코드가 발급된 사용자 확인
    const issuedCodes = await PromoCode.find({
      weeklyGoalId: goal._id
    }).select('telegramId');

    const issuedTelegramIds = new Set(issuedCodes.map(c => c.telegramId));

    // 달성자 정보 정리 (차단되지 않은 사용자만)
    const achieverList = achievers
      .filter(record => record.userId && !record.userId.isBlocked)
      .map((record, index) => {
        const user = record.userId || {};
        return {
          rank: index + 1,
          telegramId: record.telegramId,
          userId: user._id,
          username: user.username || 'Unknown',
          avatar: user.avatar,
          score: record.score,
          playedAt: record.playedAt,
          isFirstAchiever: index === 0,
          hasPromoCode: issuedTelegramIds.has(record.telegramId)
        };
      });

    // 중복 제거 (같은 사용자가 여러 번 달성한 경우 첫 번째만)
    const uniqueAchievers = [];
    const seenTelegramIds = new Set();
    for (const achiever of achieverList) {
      if (!seenTelegramIds.has(achiever.telegramId)) {
        seenTelegramIds.add(achiever.telegramId);
        uniqueAchievers.push(achiever);
      }
    }

    res.json({
      success: true,
      goal: {
        id: goal._id,
        targetScore: goal.targetScore,
        weekStartDate: goal.weekStartDate,
        weekEndDate: goal.weekEndDate
      },
      achievers: uniqueAchievers,
      total: uniqueAchievers.length
    });
  } catch (error) {
    console.error('Error getting goal achievers:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 주간 목표 생성
exports.createGoal = async (req, res) => {
  try {
    const { weekStartDate, weekEndDate, targetScore, description } = req.body;

    if (!weekStartDate || !weekEndDate || !targetScore) {
      return res.status(400).json({ error: 'Week start date, end date, and target score are required' });
    }

    // 기존 활성 목표 비활성화
    await WeeklyGoal.updateMany(
      { isActive: true },
      { isActive: false }
    );

    const goal = new WeeklyGoal({
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      targetScore: parseInt(targetScore),
      description: description || '',
      isActive: true
    });

    await goal.save();

    // 새로운 주간 목표 생성 시 플레이어 점수만 초기화 (코인, 아이템 등은 유지)
    console.log(`[WeeklyGoal] Creating new goal, resetting player scores only`);
    try {
      // 모든 게임 기록 삭제 (점수 기록만 삭제)
      const deletedRecords = await GameRecord.deleteMany({});
      console.log(`[WeeklyGoal] Deleted ${deletedRecords.deletedCount} game records`);

      // 사용자의 점수 관련 필드만 초기화 (코인, 아이템 등은 유지)
      const updateResult = await User.updateMany(
        {},
        {
          $set: {
            totalScore: 0,
            highScore: 0,
            totalGames: 0,
            lastPlayed: null
          }
        }
      );
      console.log(`[WeeklyGoal] Reset scores for ${updateResult.modifiedCount} users (coins and items preserved)`);
    } catch (scoreResetError) {
      console.error('[WeeklyGoal] Error resetting scores:', scoreResetError);
      // 점수 초기화 실패해도 목표 생성은 계속 진행
    }

    // 주간 목표 생성 알림 발송 (비동기, 응답 지연 방지)
    console.log(`[WeeklyGoal] Creating new goal with targetScore=${goal.targetScore}, sending notification`);
    sendWeeklyGoalUpdateNotification(goal.targetScore).then(() => {
      console.log(`[WeeklyGoal] Notification sent successfully for new goal with targetScore=${goal.targetScore}`);
    }).catch(err => {
      console.error('[WeeklyGoal] Error sending weekly goal update notification:', err);
      console.error('[WeeklyGoal] Error stack:', err.stack);
    });

    res.json({
      success: true,
      goal: {
        id: goal._id,
        weekStartDate: goal.weekStartDate,
        weekEndDate: goal.weekEndDate,
        targetScore: goal.targetScore,
        description: goal.description,
        isActive: goal.isActive
      }
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 모든 주간 목표 가져오기 (관리자용)
exports.getAllGoals = async (req, res) => {
  try {
    const goals = await WeeklyGoal.find()
      .sort({ weekStartDate: -1 })
      .select('-__v');

    res.json({
      success: true,
      goals
    });
  } catch (error) {
    console.error('Error getting all goals:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 주간 목표 업데이트
exports.updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { weekStartDate, weekEndDate, targetScore, description, isActive } = req.body;

    const goal = await WeeklyGoal.findById(id);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // 변경 전 값 저장 (알림/보상 전송 여부 판단용)
    const previousTargetScore = goal.targetScore;
    const previousIsActive = goal.isActive;

    if (weekStartDate) goal.weekStartDate = new Date(weekStartDate);
    if (weekEndDate) goal.weekEndDate = new Date(weekEndDate);
    if (targetScore !== undefined) goal.targetScore = parseInt(targetScore);
    if (description !== undefined) goal.description = description;
    if (isActive !== undefined) goal.isActive = isActive;

    await goal.save();

    // 활성 목표의 targetScore가 변경되었거나 새로 활성화된 경우 즉시 알림 전송
    const targetScoreChanged = targetScore !== undefined && goal.targetScore !== previousTargetScore;
    const newlyActivated = isActive !== undefined && goal.isActive && !previousIsActive;
    const isActiveGoal = goal.isActive;
    
    console.log(`[WeeklyGoal] Update check: targetScoreChanged=${targetScoreChanged}, newlyActivated=${newlyActivated}, isActive=${isActiveGoal}, targetScore=${goal.targetScore}`);
    
    if (isActiveGoal && (targetScoreChanged || newlyActivated)) {
      console.log(`[WeeklyGoal] Sending notification for targetScore=${goal.targetScore}`);
      // 주간 목표 업데이트 알림 발송 (비동기, 응답 지연 방지)
      sendWeeklyGoalUpdateNotification(goal.targetScore).then(() => {
        console.log(`[WeeklyGoal] Notification sent successfully for targetScore=${goal.targetScore}`);
      }).catch(err => {
        console.error('[WeeklyGoal] Error sending weekly goal update notification:', err);
        console.error('[WeeklyGoal] Error stack:', err.stack);
      });
    } else {
      console.log(`[WeeklyGoal] Notification not sent: isActive=${isActiveGoal}, targetScoreChanged=${targetScoreChanged}, newlyActivated=${newlyActivated}`);
    }

    res.json({
      success: true,
      goal: {
        id: goal._id,
        weekStartDate: goal.weekStartDate,
        weekEndDate: goal.weekEndDate,
        targetScore: goal.targetScore,
        description: goal.description,
        isActive: goal.isActive
      }
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 주간 목표 삭제
exports.deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await WeeklyGoal.findByIdAndDelete(id);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 상위 5명에게 일괄 프로모션 코드 발급 (관리자용) - 사용 안 함 (개별 발급으로 대체)
exports.issuePromoCodesToTopPlayers = async (req, res) => {
  try {
    const { goalId, wheelConfigId } = req.body;

    if (!goalId) {
      return res.status(400).json({ error: 'Goal ID is required' });
    }

    const goal = await WeeklyGoal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Weekly goal not found' });
    }

    // 주간 기간 동안 목표 점수 이상을 기록한 게임 중 상위 5명 선택 (차단되지 않은 사용자만)
    const allRecords = await GameRecord.find({
      playedAt: {
        $gte: goal.weekStartDate,
        $lte: goal.weekEndDate,
      },
      score: { $gte: goal.targetScore },
    })
      .sort({ playedAt: 1 }) // 가장 먼저 기록한 순서로 정렬
      .populate({
        path: 'userId',
        select: 'username telegramId isBlocked',
        match: { isBlocked: { $ne: true } }
      })
      .lean();

    // 사용자별 가장 먼저 기록한 것만 선택 (차단되지 않은 사용자만)
    const userFirstRecords = new Map();
    for (const record of allRecords) {
      // userId가 populate되지 않았거나 차단된 사용자는 제외
      if (!record.userId || record.userId.isBlocked) {
        continue;
      }
      const telegramId = record.telegramId;
      if (!userFirstRecords.has(telegramId)) {
        userFirstRecords.set(telegramId, record);
      }
    }

    // 가장 먼저 기록한 순서로 정렬하고 상위 5명 선택
    const topPlayers = Array.from(userFirstRecords.values())
      .sort((a, b) => {
        return new Date(a.playedAt) - new Date(b.playedAt);
      })
      .slice(0, 5);

    if (topPlayers.length === 0) {
      return res.status(400).json({ error: 'No players reached the weekly goal' });
    }

    // 휠 설정 가져오기
    let wheelConfig = null;
    if (wheelConfigId) {
      wheelConfig = await WheelConfig.findById(wheelConfigId);
    }
    if (!wheelConfig) {
      wheelConfig = await WheelConfig.getActive();
    }

    // 이미 발급된 코드 확인
    const issuedCodes = await PromoCode.find({
      weeklyGoalId: goal._id
    }).select('telegramId');

    const issuedTelegramIds = new Set(issuedCodes.map(c => c.telegramId));

    // 프로모션 코드 발급 결과
    const results = {
      success: [],
      skipped: [],
      errors: []
    };

    for (const record of topPlayers) {
      const telegramId = record.telegramId;

      // 이미 발급된 경우 스킵
      if (issuedTelegramIds.has(telegramId)) {
        results.skipped.push({
          telegramId,
          username: record.userId?.username || 'Unknown',
          reason: 'Promo code already issued'
        });
        continue;
      }

      try {
        const user = await User.findOne({ telegramId: parseInt(telegramId) });
        if (!user) {
          results.errors.push({
            telegramId,
            username: record.userId?.username || 'Unknown',
            error: 'User not found'
          });
          continue;
        }

        // 고유한 프로모션 코드 생성
        let code;
        let isUnique = false;
        while (!isUnique) {
          code = PromoCode.generateCode();
          const exists = await PromoCode.findOne({ code });
          if (!exists) {
            isUnique = true;
          }
        }

        // 프로모션 코드 생성
        const promoCode = new PromoCode({
          code,
          telegramId: parseInt(telegramId),
          userId: user._id,
          weeklyGoalId: goal._id,
          wheelConfigId: wheelConfig ? wheelConfig._id : null,
          targetScore: goal.targetScore,
          actualScore: record.score
        });

        await promoCode.save();

        results.success.push({
          telegramId,
          username: user.username || 'Unknown',
          code: promoCode.code,
          score: record.score
        });
      } catch (error) {
        console.error(`Error issuing promo code to ${telegramId}:`, error);
        results.errors.push({
          telegramId,
          username: record.userId?.username || 'Unknown',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Issued ${results.success.length} promo codes, skipped ${results.skipped.length}, errors ${results.errors.length}`,
      results
    });
  } catch (error) {
    console.error('Error issuing promo codes to top players:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 프로모션 코드 발급 (관리자용) - 개별 발급
exports.issuePromoCode = async (req, res) => {
  try {
    const { goalId, telegramId, wheelConfigId } = req.body;

    if (!goalId || !telegramId) {
      return res.status(400).json({ error: 'Goal ID and Telegram ID are required' });
    }

    const goal = await WeeklyGoal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ error: 'Weekly goal not found' });
    }

    const user = await User.findOne({ telegramId: parseInt(telegramId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 이미 프로모션 코드가 발급되었는지 확인
    const existingCode = await PromoCode.findOne({
      weeklyGoalId: goal._id,
      telegramId: parseInt(telegramId)
    });

    if (existingCode) {
      return res.status(400).json({ 
        error: 'Promo code already issued to this user for this goal',
        promoCode: {
          code: existingCode.code,
          isUsed: existingCode.isUsed
        }
      });
    }

    // 사용자가 실제로 목표를 달성했는지 확인 (차단되지 않은 사용자만)
    // 주간목표 활성화 여부와 관계없이 상위 5위권에게 프로모션코드 발급 가능
    const achievement = await GameRecord.findOne({
      telegramId: parseInt(telegramId),
      playedAt: {
        $gte: goal.weekStartDate,
        $lte: goal.weekEndDate
      },
      score: { $gte: goal.targetScore }
    })
      .populate({
        path: 'userId',
        select: 'isBlocked',
        match: { isBlocked: { $ne: true } }
      })
      .sort({ playedAt: 1 });

    // 차단된 사용자이거나 achievement가 없는 경우
    if (!achievement || !achievement.userId) {
      return res.status(400).json({ error: 'User has not achieved this weekly goal or is blocked' });
    }

    // 휠 설정 가져오기 (지정된 것이 있으면 사용, 없으면 기본 설정)
    let wheelConfig = null;
    if (wheelConfigId) {
      wheelConfig = await WheelConfig.findById(wheelConfigId);
    }
    if (!wheelConfig) {
      wheelConfig = await WheelConfig.getActive();
    }

    // 고유한 프로모션 코드 생성
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = PromoCode.generateCode();
      const exists = await PromoCode.findOne({ code });
      if (!exists) {
        isUnique = true;
      }
    }

    // 프로모션 코드 생성
    const promoCode = new PromoCode({
      code,
      telegramId: parseInt(telegramId),
      userId: user._id,
      weeklyGoalId: goal._id,
      wheelConfigId: wheelConfig ? wheelConfig._id : null,
      targetScore: goal.targetScore,
      actualScore: achievement.score
    });

    await promoCode.save();

    res.json({
      success: true,
      message: 'Promo code issued successfully',
      promoCode: {
        id: promoCode._id,
        code: promoCode.code,
        telegramId: promoCode.telegramId,
        username: user.username,
        targetScore: promoCode.targetScore,
        actualScore: promoCode.actualScore,
        wheelConfigId: promoCode.wheelConfigId,
        createdAt: promoCode.createdAt
      }
    });
  } catch (error) {
    console.error('Error issuing promo code:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 주간 목표 상위 5명 플레이어 정보 조회 (관리자용)
// - 가장 최근 주간 목표(활성/비활성 상관없이)를 기준으로
// - 주간 기간 내 목표 점수 이상 기록 중 "가장 먼저 기록한 순서" 상위 5명
exports.getWeeklyTopPlayers = async (req, res) => {
  try {
    // 최신 주간 목표 찾기 (가장 최근 weekEndDate 기준)
    const latestGoal = await WeeklyGoal.findOne().sort({ weekEndDate: -1 });

    if (!latestGoal) {
      return res.json({
        success: true,
        goal: null,
        topPlayers: [],
        message: 'No weekly goals found',
      });
    }

    // 주간 기간 동안 목표 점수 이상을 기록한 게임 중 "가장 먼저 기록한 순서" 상위 5명 선택
    // 같은 사용자가 여러 번 달성한 경우, 가장 먼저 기록한 것만 선택 (차단되지 않은 사용자만)
    const allRecords = await GameRecord.find({
      playedAt: {
        $gte: latestGoal.weekStartDate,
        $lte: latestGoal.weekEndDate,
      },
      score: { $gte: latestGoal.targetScore },
    })
      .sort({ playedAt: 1 }) // 가장 먼저 기록한 순서로 정렬
      .populate({
        path: 'userId',
        select: 'username telegramId avatar isBlocked',
        match: { isBlocked: { $ne: true } }
      })
      .lean();

    // 사용자별 가장 먼저 기록한 것만 선택 (차단되지 않은 사용자만)
    const userFirstRecords = new Map();
    for (const record of allRecords) {
      // userId가 populate되지 않았거나 차단된 사용자는 제외
      if (!record.userId || record.userId.isBlocked) {
        continue;
      }
      const telegramId = record.telegramId;
      if (!userFirstRecords.has(telegramId)) {
        userFirstRecords.set(telegramId, record);
      }
    }

    // 가장 먼저 기록한 순서로 정렬하고 상위 5명 선택
    const topPlayersList = Array.from(userFirstRecords.values())
      .sort((a, b) => {
        return new Date(a.playedAt) - new Date(b.playedAt);
      })
      .slice(0, 5)
      .map((record, index) => {
        const user = record.userId || {};
        return {
          rank: index + 1,
          telegramId: record.telegramId,
          username: user.username || 'Unknown',
          avatar: user.avatar || null,
          score: record.score,
          playedAt: record.playedAt,
        };
      });

    // 이미 프로모션 코드가 발급된 사용자 확인
    const issuedCodes = await PromoCode.find({
      weeklyGoalId: latestGoal._id
    }).select('telegramId');

    const issuedTelegramIds = new Set(issuedCodes.map(c => c.telegramId));

    // 발급 상태 추가
    const topPlayersWithStatus = topPlayersList.map(player => ({
      ...player,
      hasPromoCode: issuedTelegramIds.has(player.telegramId)
    }));

    res.json({
      success: true,
      goal: {
        id: latestGoal._id,
        weekStartDate: latestGoal.weekStartDate,
        weekEndDate: latestGoal.weekEndDate,
        targetScore: latestGoal.targetScore,
        description: latestGoal.description,
        isActive: latestGoal.isActive,
      },
      topPlayers: topPlayersWithStatus,
      total: topPlayersWithStatus.length,
    });
  } catch (error) {
    console.error('Error getting weekly top players:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 하위 호환성을 위한 함수 (기존 코드와의 호환성 유지)
// 상위 1명만 반환하는 버전
exports.getWeeklyTopPlayer = async (req, res) => {
  try {
    // 최신 주간 목표 찾기 (가장 최근 weekEndDate 기준)
    const latestGoal = await WeeklyGoal.findOne().sort({ weekEndDate: -1 });

    if (!latestGoal) {
      return res.json({
        success: true,
        goal: null,
        topPlayer: null,
        message: 'No weekly goals found',
      });
    }

    // 주간 기간 동안 목표 점수 이상을 기록한 게임 중 "가장 먼저 기록한 순서" 1명 선택 (차단되지 않은 사용자만)
    const allRecords = await GameRecord.find({
      playedAt: {
        $gte: latestGoal.weekStartDate,
        $lte: latestGoal.weekEndDate,
      },
      score: { $gte: latestGoal.targetScore },
    })
      .sort({ playedAt: 1 }) // 가장 먼저 기록한 순서로 정렬
      .populate({
        path: 'userId',
        select: 'username telegramId avatar isBlocked',
        match: { isBlocked: { $ne: true } }
      })
      .lean();

    // 사용자별 가장 먼저 기록한 것만 선택 (차단되지 않은 사용자만)
    const userFirstRecords = new Map();
    for (const record of allRecords) {
      // userId가 populate되지 않았거나 차단된 사용자는 제외
      if (!record.userId || record.userId.isBlocked) {
        continue;
      }
      const telegramId = record.telegramId;
      if (!userFirstRecords.has(telegramId)) {
        userFirstRecords.set(telegramId, record);
      }
    }

    // 가장 먼저 기록한 순서로 정렬하고 상위 1명 선택
    const topPlayersList = Array.from(userFirstRecords.values())
      .sort((a, b) => {
        return new Date(a.playedAt) - new Date(b.playedAt);
      })
      .slice(0, 1);

    if (topPlayersList.length === 0) {
      return res.json({
        success: true,
        goal: {
          id: latestGoal._id,
          weekStartDate: latestGoal.weekStartDate,
          weekEndDate: latestGoal.weekEndDate,
          targetScore: latestGoal.targetScore,
          description: latestGoal.description,
          isActive: latestGoal.isActive,
        },
        topPlayer: null,
        message: 'No player reached the weekly goal',
      });
    }

    const topRecord = topPlayersList[0];
    const topUser = topRecord.userId;

    if (!topUser) {
      return res.json({
        success: true,
        goal: {
          id: latestGoal._id,
          weekStartDate: latestGoal.weekStartDate,
          weekEndDate: latestGoal.weekEndDate,
          targetScore: latestGoal.targetScore,
          description: latestGoal.description,
          isActive: latestGoal.isActive,
        },
        topPlayer: null,
        message: 'Top record has no associated user',
      });
    }

    res.json({
      success: true,
      goal: {
        id: latestGoal._id,
        weekStartDate: latestGoal.weekStartDate,
        weekEndDate: latestGoal.weekEndDate,
        targetScore: latestGoal.targetScore,
        description: latestGoal.description,
        isActive: latestGoal.isActive,
      },
      topPlayer: {
        telegramId: topUser.telegramId,
        username: topUser.username || 'Unknown',
        avatar: topUser.avatar || null,
        score: topRecord.score,
        playedAt: topRecord.playedAt,
      },
    });
  } catch (error) {
    console.error('Error getting weekly top player:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
