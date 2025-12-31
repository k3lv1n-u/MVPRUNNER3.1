const mongoose = require('mongoose');
const User = require('../models/User');
const GameRecord = require('../models/GameRecord');
const WeeklyGoal = require('../models/WeeklyGoal');
const PromoCode = require('../models/PromoCode');
const PromoCodeRequest = require('../models/PromoCodeRequest');
const WheelConfig = require('../models/WheelConfig');
const ShopItem = require('../models/ShopItem');
const BotConfig = require('../models/BotConfig');

// 데이터베이스 초기화
exports.resetDatabase = async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET_ALL_DATA') {
      return res.status(400).json({
        error: 'Confirmation required. Send { confirm: "RESET_ALL_DATA" }'
      });
    }

    // 모든 컬렉션 삭제
    await User.deleteMany({});
    await GameRecord.deleteMany({});
    await WeeklyGoal.deleteMany({});
    await PromoCode.deleteMany({});
    await PromoCodeRequest.deleteMany({});
    await WheelConfig.deleteMany({});
    await ShopItem.deleteMany({});

    // 봇 설정 초기화 (모든 설정 삭제 후 기본값으로 재생성)
    await BotConfig.deleteMany({});

    // 기존 webhook 삭제 및 봇 UI 정리 시도 (봇 설정이 있으면)
    try {
      const { getBotInstance, clearBotUI } = require('../services/telegramBot');
      const botInstance = await getBotInstance();
      if (botInstance) {
        try {
          await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
          console.log('[Admin] Existing webhook deleted during database reset');
        } catch (webhookError) {
          console.warn('[Admin] Could not delete webhook during reset (may not exist):', webhookError.message);
        }

        // 봇 UI 정리 (메뉴 버튼, 커맨드 제거)
        try {
          await clearBotUI();
          console.log('[Admin] Bot UI cleared during database reset');
        } catch (uiError) {
          console.warn('[Admin] Could not clear bot UI during reset:', uiError.message);
        }
      }
    } catch (botError) {
      console.warn('[Admin] Could not delete webhook/clear UI during reset:', botError.message);
    }

    // 기본 봇 설정 생성 (모든 값 초기화)
    const defaultBotConfig = new BotConfig({
      botToken: '',
      miniAppUrl: '',
      notificationChannelId: '',
      isActive: false,
      requiredChannels: [
        {
          url: 'https://t.me/+g06yUX0pXVEzOTEy',
          title: 'Канал 1',
          accessHash: ''
        },
        {
          url: 'https://t.me/+iK4BAhAmWKs3YzFi',
          title: 'Канал 2',
          accessHash: ''
        },
        {
          url: 'https://t.me/+YOqZH4Dp73syNWM5',
          title: 'Канал 3',
          accessHash: ''
        }
      ],
      updatedBy: 'system'
    });
    await defaultBotConfig.save();
    console.log('[Admin] Bot config reset to default values');

    // 기본 휠 설정 생성
    const defaultWheel = new WheelConfig({
      name: 'default',
      isDefault: true,
      isActive: true,
      description: 'Default wheel configuration',
      segments: [
        { value: 100, label: '100 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] },
        { value: 250, label: '250 USDT', color: '#1f1f1f', gradient: ['#141414', '#2a2a2a'] },
        { value: 500, label: '500 USDT', color: '#242424', gradient: ['#191919', '#2f2f2f'] },
        { value: 1000, label: '1000 USDT', color: '#292929', gradient: ['#1e1e1e', '#343434'] },
        { value: 1000, label: '1000 USDT', color: '#2e2e2e', gradient: ['#232323', '#393939'] },
        { value: 100, label: '100 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] },
        { value: 100, label: '100 USDT', color: '#1f1f1f', gradient: ['#141414', '#2a2a2a'] },
        { value: 25, label: '25 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] }
      ]
    });
    await defaultWheel.save();

    // 기본 주간 목표 생성 (표준 1000점)
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1); // 7일 후 - 1ms

    const defaultWeeklyGoal = new WeeklyGoal({
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      targetScore: 1000,
      description: 'Стандартная недельная цель после инициализации базы данных',
      isActive: true
    });
    await defaultWeeklyGoal.save();
    console.log('[Admin] Default weekly goal created with targetScore=1000');

    // 기본 상점 아이템 생성 (기존 아이템 확인 후 생성/업데이트)
    let promoCodeItem = await ShopItem.findOne({ itemKey: 'promo-code' });
    if (!promoCodeItem) {
      promoCodeItem = new ShopItem({
        itemKey: 'promo-code',
        name: 'Промокод для рулетки',
        type: 'promo-code',
        description: 'Промокод для игры в рулетку',
        price: 1000,
        stock: 0,
        isActive: true,
        promoCodeConfig: {
          autoIssue: false
        }
      });
      await promoCodeItem.save();
      console.log('[Admin] Promo code item created');
    } else {
      console.log('[Admin] Promo code item already exists');
    }

    // 속도 저하 신발 아이템 생성
    let speedBootItem = await ShopItem.findOne({ itemKey: 'slow-shoes' });
    if (!speedBootItem) {
      speedBootItem = new ShopItem({
        itemKey: 'slow-shoes',
        type: 'item',
        name: 'Ботинки замедления',
        description: 'Снижает скорость игры на 30% в течение 15 секунд',
        price: 100,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'speed-reduction',
          duration: 15000,
          speedMultiplier: 0.7
        }
      });
      await speedBootItem.save();
      console.log('[Admin] Speed boot item created');
    } else {
      console.log('[Admin] Speed boot item already exists');
    }

    // 방패 아이템 생성
    let shieldItem = await ShopItem.findOne({ itemKey: 'shield' });
    if (!shieldItem) {
      shieldItem = new ShopItem({
        itemKey: 'shield',
        type: 'item',
        name: 'Щит защиты',
        description: 'Защищает от одного столкновения с препятствием',
        price: 150,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'shield',
          uses: 1
        }
      });
      await shieldItem.save();
      console.log('[Admin] Shield item created');
    } else {
      console.log('[Admin] Shield item already exists');
    }

    // 매직 주사기 아이템 생성
    let magicSyringeItem = await ShopItem.findOne({ itemKey: 'magic_syringe' });
    if (!magicSyringeItem) {
      magicSyringeItem = new ShopItem({
        itemKey: 'magic_syringe',
        type: 'item',
        name: 'Волшебный шприц',
        description: 'Увеличивает скорость и дает неуязвимость',
        price: 1000,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'magic-syringe',
          duration: 6000,
          speedMultiplier: 1.5
        }
      });
      await magicSyringeItem.save();
      console.log('[Admin] Magic Syringe item created');
    } else {
      console.log('[Admin] Magic Syringe item already exists');
    }

    // 코인 부스트 아이템 생성
    let moneyBoostItem = await ShopItem.findOne({ itemKey: 'money-boost' });
    if (!moneyBoostItem) {
      moneyBoostItem = new ShopItem({
        itemKey: 'money-boost',
        type: 'item',
        name: 'Усилитель монет',
        description: 'Увеличивает количество собираемых монет в 10 раз',
        price: 2000,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'coin-multiplier',
          duration: 20000,
          multiplier: 10
        }
      });
      await moneyBoostItem.save();
      console.log('[Admin] Money Boost item created');
    } else {
      console.log('[Admin] Money Boost item already exists');
    }

    res.json({
      success: true,
      message: 'Database reset successfully. Default wheel config and shop items created.'
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 진행 상황만 초기화 (사용자 정보는 유지)
exports.resetProgress = async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET_PROGRESS') {
      return res.status(400).json({
        error: 'Confirmation required. Send { confirm: "RESET_PROGRESS" }'
      });
    }

    // 진행 상황 관련 데이터만 삭제 (사용자 정보는 유지)
    await GameRecord.deleteMany({});
    await WeeklyGoal.deleteMany({});
    await PromoCodeRequest.deleteMany({});

    // 사용자의 게임 진행 상황 초기화 (점수, 코인 등)
    await User.updateMany(
      {},
      {
        $set: {
          totalScore: 0,
          highScore: 0,
          balance: 94, // 기본값으로 초기화
          totalCryptoEarned: 0,
          totalGames: 0,
          lastPlayed: null,
        },
        $unset: {
          inventory: '', // 인벤토리 초기화
        }
      }
    );

    // 인벤토리를 빈 배열로 설정
    await User.updateMany({}, { $set: { inventory: [] } });

    // 봇 설정 초기화 (토큰/채널/미니앱 URL 모두 제거)
    await BotConfig.deleteMany({});

    // 기존 webhook 삭제 및 봇 UI 정리 시도
    try {
      const { getBotInstance, clearBotUI } = require('../services/telegramBot');
      const botInstance = await getBotInstance();
      if (botInstance) {
        try {
          await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
          console.log('[Admin] Existing webhook deleted during progress reset');
        } catch (webhookError) {
          console.warn('[Admin] Could not delete webhook during progress reset (may not exist):', webhookError.message);
        }

        try {
          await clearBotUI();
          console.log('[Admin] Bot UI cleared during progress reset');
        } catch (uiError) {
          console.warn('[Admin] Could not clear bot UI during progress reset:', uiError.message);
        }
      }
    } catch (botError) {
      console.warn('[Admin] Could not delete webhook/clear UI during progress reset:', botError.message);
    }

    const defaultBotConfig = new BotConfig({
      botToken: '',
      miniAppUrl: '',
      botUsername: '',
      notificationChannelId: '',
      isActive: false,
      requiredChannels: [
        {
          url: 'https://t.me/+g06yUX0pXVEzOTEy',
          title: 'Канал 1',
          accessHash: ''
        },
        {
          url: 'https://t.me/+iK4BAhAmWKs3YzFi',
          title: 'Канал 2',
          accessHash: ''
        },
        {
          url: 'https://t.me/+YOqZH4Dp73syNWM5',
          title: 'Канал 3',
          accessHash: ''
        }
      ],
      updatedBy: 'system'
    });
    await defaultBotConfig.save();
    console.log('[Admin] Bot config reset (progress reset)');

    // 기본 주간 목표 생성 (표준 1000점)
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1); // 7일 후 - 1ms

    const defaultWeeklyGoal = new WeeklyGoal({
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      targetScore: 1000,
      description: 'Стандартная недельная цель после сброса прогресса',
      isActive: true
    });
    await defaultWeeklyGoal.save();
    console.log('[Admin] Default weekly goal created after progress reset');

    // 기본 상점 아이템 생성 (기존 아이템 확인 후 생성/업데이트)
    let promoCodeItem = await ShopItem.findOne({ itemKey: 'promo-code' });
    if (!promoCodeItem) {
      promoCodeItem = new ShopItem({
        itemKey: 'promo-code',
        name: 'Промокод для рулетки',
        type: 'promo-code',
        description: 'Промокод для игры в рулетку',
        price: 1000,
        stock: 0,
        isActive: true,
        promoCodeConfig: {
          autoIssue: false
        }
      });
      await promoCodeItem.save();
      console.log('[Admin] Promo code item created (progress reset)');
    }

    let speedBootItem = await ShopItem.findOne({ itemKey: 'slow-shoes' });
    if (!speedBootItem) {
      speedBootItem = new ShopItem({
        itemKey: 'slow-shoes',
        type: 'item',
        name: 'Ботинки замедления',
        description: 'Снижает скорость игры на 30% в течение 15 секунд',
        price: 100,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'speed-reduction',
          duration: 15000,
          speedMultiplier: 0.7
        }
      });
      await speedBootItem.save();
      console.log('[Admin] Speed boot item created (progress reset)');
    }

    let shieldItem = await ShopItem.findOne({ itemKey: 'shield' });
    if (!shieldItem) {
      shieldItem = new ShopItem({
        itemKey: 'shield',
        type: 'item',
        name: 'Щит защиты',
        description: 'Защищает от одного столкновения с препятствием',
        price: 150,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'shield',
          uses: 1
        }
      });
      await shieldItem.save();
      console.log('[Admin] Shield item created (progress reset)');
    }

    let magicSyringeItem = await ShopItem.findOne({ itemKey: 'magic_syringe' });
    if (!magicSyringeItem) {
      magicSyringeItem = new ShopItem({
        itemKey: 'magic_syringe',
        type: 'item',
        name: 'Волшебный шприц',
        description: 'Увеличивает скорость и дает неуязвимость',
        price: 1000,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'magic-syringe',
          duration: 6000,
          speedMultiplier: 1.5
        }
      });
      await magicSyringeItem.save();
      console.log('[Admin] Magic Syringe item created (progress reset)');
    }

    let moneyBoostItem = await ShopItem.findOne({ itemKey: 'money-boost' });
    if (!moneyBoostItem) {
      moneyBoostItem = new ShopItem({
        itemKey: 'money-boost',
        type: 'item',
        name: 'Усилитель монет',
        description: 'Увеличивает количество собираемых монет в 10 раз',
        price: 2000,
        stock: 0,
        isActive: true,
        itemConfig: {
          effectType: 'coin-multiplier',
          duration: 20000,
          multiplier: 10
        }
      });
      await moneyBoostItem.save();
      console.log('[Admin] Money Boost item created (progress reset)');
    }

    res.json({
      success: true,
      message: 'Progress reset successfully. User accounts preserved.'
    });
  } catch (error) {
    console.error('Error resetting progress:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 점수 기록만 초기화 (코인, 아이템 등은 유지)
exports.resetScores = async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET_SCORES') {
      return res.status(400).json({
        error: 'Confirmation required. Send { confirm: "RESET_SCORES" }'
      });
    }

    // 모든 게임 기록 삭제
    const deletedRecords = await GameRecord.deleteMany({});
    console.log(`[Admin] Deleted ${deletedRecords.deletedCount} game records`);

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
    console.log(`[Admin] Reset scores for ${updateResult.modifiedCount} users`);

    res.json({
      success: true,
      message: 'Scores reset successfully. Coins, items, and other data preserved.',
      stats: {
        deletedRecords: deletedRecords.deletedCount,
        updatedUsers: updateResult.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error resetting scores:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 데이터베이스 통계
exports.getDatabaseStats = async (req, res) => {
  try {
    // 최고 점수 (User.highScore 기준)
    const topUser = await User.findOne().sort({ highScore: -1 }).select('highScore username telegramId');

    // 현재 활성 주간 목표 (가장 최근 활성 목표)
    const currentWeeklyGoal = await WeeklyGoal.findOne({ isActive: true }).sort({ weekStartDate: -1 });

    const stats = {
      users: await User.countDocuments(),
      gameRecords: await GameRecord.countDocuments(),
      weeklyGoals: await WeeklyGoal.countDocuments(),
      promoCodes: await PromoCode.countDocuments(),
      promoCodeRequests: await PromoCodeRequest.countDocuments(),
      wheelConfigs: await WheelConfig.countDocuments(),
      shopItems: await ShopItem.countDocuments(),
      usedPromoCodes: await PromoCode.countDocuments({ isUsed: true }),
      unusedPromoCodes: await PromoCode.countDocuments({ isUsed: false }),
      highestScore: topUser?.highScore || 0,
      highestScoreUser: topUser ? (topUser.username || topUser.telegramId?.toString()) : null,
      currentWeeklyGoalTarget: currentWeeklyGoal?.targetScore || 0,
      currentWeeklyGoalDesc: currentWeeklyGoal?.description || null,
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 그래프 데이터 가져오기
exports.getGraphData = async (req, res) => {
  try {
    const { period = '30' } = req.query; // 기본 30일
    const days = parseInt(period, 10) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 1. 사용자 등록 추이 (일별)
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // 2. 게임 플레이 횟수 추이 (일별)
    const gamePlays = await GameRecord.aggregate([
      {
        $match: {
          playedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$playedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // 3. 게임 점수 분포 (구간별)
    const scoreStats = await GameRecord.aggregate([
      {
        $group: {
          _id: null,
          minScore: { $min: '$score' },
          maxScore: { $max: '$score' },
          avgScore: { $avg: '$score' }
        }
      }
    ]);

    let scoreRanges = [];
    if (scoreStats.length > 0 && scoreStats[0].maxScore !== null && scoreStats[0].maxScore > 0) {
      const { minScore, maxScore } = scoreStats[0];
      const rangeSize = Math.max(100, Math.ceil((maxScore - minScore) / 10));
      const boundaries = [];

      // boundaries 생성 (최소값부터 최대값까지 rangeSize 간격으로)
      for (let i = 0; i <= maxScore; i += rangeSize) {
        boundaries.push(i);
      }
      // 마지막 boundary 추가
      if (boundaries[boundaries.length - 1] < maxScore) {
        boundaries.push(maxScore + 1);
      }

      if (boundaries.length >= 2) {
        const scoreCounts = await GameRecord.aggregate([
          {
            $bucket: {
              groupBy: '$score',
              boundaries: boundaries,
              default: 'other',
              output: {
                count: { $sum: 1 }
              }
            }
          }
        ]);

        // 각 구간별로 데이터 매핑
        for (let i = 0; i < boundaries.length - 1; i++) {
          const min = boundaries[i];
          const max = boundaries[i + 1] - 1;
          const bucket = scoreCounts.find(b => b._id === min);
          scoreRanges.push({
            label: `${min}-${max}`,
            count: bucket ? bucket.count : 0
          });
        }
      }
    }

    // 4. 총 플레이어 수 분포 (일별 누적)
    const totalPlayersByDay = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // 누적 합계 계산
    let cumulative = 0;
    const cumulativePlayers = totalPlayersByDay.map(item => {
      cumulative += item.count;
      return {
        date: item._id,
        count: cumulative
      };
    });

    res.json({
      success: true,
      data: {
        userRegistrations: userRegistrations.map(item => ({
          date: item._id,
          count: item.count
        })),
        gamePlays: gamePlays.map(item => ({
          date: item._id,
          count: item.count
        })),
        scoreDistribution: scoreRanges,
        cumulativePlayers: cumulativePlayers
      }
    });
  } catch (error) {
    console.error('Error getting graph data:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 필수 채널 설정 업데이트
/**
 * 필수 채널 설정 업데이트
 * 
 * POST /api/admin/required-channels
 * 
 * 요청 본문:
 * {
 *   requiredChannels: [
 *     {
 *       url: "https://t.me/+...",
 *       title: "Channel Name",
 *       chatId: -1001234567890  // Private 채널의 경우 필수
 *     }
 *   ]
 * }
 */
exports.updateRequiredChannels = async (req, res) => {
  try {
    const BotConfig = require('../models/BotConfig');
    const { requiredChannels } = req.body;

    console.log('[Admin] Received request to update required channels:', JSON.stringify(requiredChannels, null, 2));

    if (!Array.isArray(requiredChannels)) {
      return res.status(400).json({ error: 'requiredChannels must be an array' });
    }

    // 각 채널의 필수 필드 검증
    for (const channel of requiredChannels) {
      if (!channel.url) {
        return res.status(400).json({ error: 'Each channel must have a url' });
      }
      if (!channel.title) {
        return res.status(400).json({ error: 'Each channel must have a title' });
      }
      // chatId는 선택사항이지만, Private 채널의 경우 권장
      if (channel.chatId !== undefined && channel.chatId !== null) {
        if (typeof channel.chatId !== 'number') {
          return res.status(400).json({ error: 'chatId must be a number' });
        }
      }
    }

    const config = await BotConfig.getConfig();
    config.requiredChannels = requiredChannels;
    config.updatedBy = 'admin';
    await config.save();

    console.log('[Admin] Required channels updated:', requiredChannels.length, 'channels');

    res.json({
      success: true,
      message: 'Required channels updated successfully',
      channels: config.requiredChannels
    });
  } catch (error) {
    console.error('[Admin] Error updating required channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

