const { Telegraf } = require('telegraf');
const User = require('../models/User');
const WeeklyGoal = require('../models/WeeklyGoal');
const BotConfig = require('../models/BotConfig');
const path = require('path');
const fs = require('fs');

// 필수 채널 목록은 데이터베이스(BotConfig)에서 가져옵니다.
// const REQUIRED_CHANNELS = [ ... ];

// 모든 환경에서 webhook만 사용 (무상태 아키텍처)

// 봇 토큰 가져오기 (데이터베이스에서)
async function getBotToken() {
  try {
    const config = await BotConfig.getConfig();
    return config.botToken || null;
  } catch (error) {
    console.error('Error getting bot token from database:', error);
    return null;
  }
}

// 미니 앱 URL 가져오기 (데이터베이스에서)
async function getMiniAppUrl() {
  try {
    const config = await BotConfig.getConfig();
    if (config.miniAppUrl) {
      return config.miniAppUrl;
    }
    // 데이터베이스에 없으면 Vercel 환경 변수 확인
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // 기본값 (로컬 개발)
    return process.env.NODE_ENV === 'production'
      ? 'https://your-mini-app-url.com'
      : 'http://localhost:3000';
  } catch (error) {
    console.error('Error getting mini app URL:', error);
    // 폴백
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    return process.env.NODE_ENV === 'production'
      ? 'https://your-mini-app-url.com'
      : 'http://localhost:3000';
  }
}

// 알림 채널 ID 가져오기 (데이터베이스에서)
async function getNotificationChannelId() {
  try {
    const config = await BotConfig.getConfig();
    return config.notificationChannelId || null;
  } catch (error) {
    console.error('Error getting notification channel ID:', error);
    return null;
  }
}

// 봇 활성화 상태 확인
async function isBotActive() {
  try {
    const config = await BotConfig.getConfig();
    return config.isActive && !!config.botToken;
  } catch (error) {
    console.error('Error checking bot active status:', error);
    return false;
  }
}

// 리퍼럴 코드 생성
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 봇 이벤트 핸들러 설정 (Telegraf 인스턴스)
function setupBotHandlers(botInstance) {
  if (!botInstance) {
    console.error('[SetupHandlers] Cannot setup bot handlers: bot instance is not provided');
    return;
  }

  console.log('[SetupHandlers] Setting up Telegraf bot handlers...');

  // /start 명령어 처리
  botInstance.command('start', async (ctx) => {
    console.log('[Handler] /start command received from:', ctx.from?.id, ctx.from?.username);
    const telegramId = ctx.from.id;
    const referralCode = ctx.message?.text?.split(' ')[1] || null;

    try {
      console.log('[Handler] Processing /start command...');
      // 사용자 찾기 또는 생성
      let user = await User.findOne({ telegramId });

      if (!user) {
        // 새 사용자 생성
        const newReferralCode = generateReferralCode();
        user = new User({
          telegramId,
          username: ctx.from.username || ctx.from.first_name || 'username',
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          avatar: ctx.from.photo_url,
          referralCode: newReferralCode
        });

        // 리퍼럴 코드가 있으면 처리
        if (referralCode) {
          const referrer = await User.findOne({ referralCode });
          if (referrer && referrer.telegramId !== telegramId) {
            user.referredBy = referrer._id;
            referrer.referralCount = (referrer.referralCount || 0) + 1;
            await referrer.save();

            // 리퍼럴 알림 발송
            try {
              await ctx.telegram.sendMessage(
                referrer.telegramId,
                `👥 Новый реферал!\n@${user.username || 'user'} активировал ваш код.`
              );
            } catch (err) {
              console.error('Error sending referral notification:', err);
            }
          }
        }

        await user.save();
      } else {
        // 기존 사용자 업데이트
        user.username = ctx.from.username || user.username || ctx.from.first_name || 'username';
        user.firstName = ctx.from.first_name || user.firstName;
        user.lastName = ctx.from.last_name || user.lastName;
        user.avatar = ctx.from.photo_url || user.avatar;

        // 리퍼럴 코드가 없으면 생성
        if (!user.referralCode) {
          user.referralCode = generateReferralCode();
        }

        await user.save();
      }

      // 환영 메시지 전송
      console.log('[Handler] Sending welcome message...');
      await sendWelcomeMessage(ctx, user);
      console.log('[Handler] Welcome message sent successfully');
    } catch (error) {
      console.error('[Handler] Error handling /start:', error);
      console.error('[Handler] Error stack:', error.stack);
      try {
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
      } catch (sendError) {
        console.error('[Handler] Error sending error message:', sendError);
      }
    }
  });

  // /help 명령어
  botInstance.command('help', async (ctx) => {
    await sendWelcomeMessage(ctx, null);
  });

  // /rules 명령어
  botInstance.command('rules', async (ctx) => {
    const rulesUrl = 'https://telegra.ph/Pravila-MVP-RUNNER-11-07';
    await ctx.reply(`📋 Правила игры:\n${rulesUrl}`);
  });

  // /top 명령어 (주간 리더보드)
  botInstance.command('top', async (ctx) => {
    await showWeeklyLeaderboard(ctx);
  });

  // 인라인 쿼리 처리 (인라인 키보드 버튼 클릭)
  botInstance.action(/^(play|subscribe|check_subscription|weekly_top|profile|rules)$/, async (ctx) => {
    console.log('[Handler] Callback query received:', ctx.callbackQuery.data, 'from:', ctx.from?.id);
    const data = ctx.callbackQuery.data;

    try {
      // 먼저 callback query에 응답 (텔레그램 요구사항)
      await ctx.answerCbQuery().catch(err => {
        console.warn('Error answering callback query:', err);
      });

      console.log('Processing callback data:', data);

      switch (data) {
        case 'play':
          console.log('Handling play button');
          await handlePlayButton(ctx);
          break;
        case 'subscribe':
          console.log('Handling subscribe button');
          await handleSubscribeButton(ctx);
          break;
        case 'check_subscription':
          console.log('Handling check subscription');
          await handleCheckSubscription(ctx);
          break;
        case 'weekly_top':
          console.log('Handling weekly top');
          await showWeeklyLeaderboard(ctx);
          break;
        case 'profile':
          console.log('Handling profile');
          await showProfile(ctx);
          break;
        case 'rules':
          console.log('Handling rules');
          const rulesUrl = 'https://telegra.ph/Pravila-MVP-RUNNER-11-07';
          await ctx.reply(`📋 Правила игры:\n${rulesUrl}`);
          break;
        default:
          console.warn('Unknown callback data:', data);
          await ctx.reply('Неизвестная команда. Попробуйте снова.');
          break;
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      console.error('Error stack:', error.stack);
      try {
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
    }
  });

  // 에러 핸들러
  botInstance.catch((err, ctx) => {
    console.error('Telegraf error:', err);
    if (ctx) {
      ctx.reply('Произошла ошибка. Попробуйте позже.').catch(() => { });
    }
  });
}

// 환영 메시지 전송
async function sendWelcomeMessage(ctx, user = null) {
  try {
    const welcomeImagePath = path.join(__dirname, '../welcome.jpg');
    const imageExists = fs.existsSync(welcomeImagePath);

    const miniAppUrl = await getMiniAppUrl();

    const message = `Добро пожаловать в MVP RUNNER

Это еженедельная гонка за реальными призами , где каждый стартует с нуля.

Ты заходишь — а кто-то уже вырывается вперёд 🏃‍♂️

Кто-то падает 💥 Кто-то возвращается 🔁

Но банк недели забирают только сильнейшие 🥇

Хочешь ворваться в забег?

Сделай всего одно действие — нажми кнопку «Играть» 🎮

Гонка уже началась... 🔥`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '▶️ Играть', web_app: { url: miniAppUrl } }
        ],
        [
          { text: '📊 Топ недели', callback_data: 'weekly_top' },
          { text: '👤 Профиль', callback_data: 'profile' }
        ],
        [
          { text: '👮 Правила', callback_data: 'rules' }
        ]
      ]
    };

    if (imageExists) {
      await ctx.replyWithPhoto({ source: welcomeImagePath }, {
        caption: message,
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    } else {
      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    }
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
}

// 게임 버튼 처리
async function handlePlayButton(ctx) {
  try {
    const miniAppUrl = await getMiniAppUrl();
    await ctx.reply('Открываю игру...', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '▶️ Играть', web_app: { url: miniAppUrl } }]
        ]
      }
    });
  } catch (error) {
    console.error('Error handling play button:', error);
  }
}

// 구독 버튼 처리
async function handleSubscribeButton(ctx) {
  try {
    const config = await BotConfig.getConfig();
    const requiredChannels = config.requiredChannels || [];

    if (requiredChannels.length === 0) {
      await ctx.reply('В данный момент нет обязательных каналов для подписки.');
      return;
    }

    const channelsText = requiredChannels.map((channel, index) =>
      `${index + 1}. ${channel.title}: ${channel.url}`
    ).join('\n');

    const keyboard = {
      inline_keyboard: requiredChannels.map(channel => [
        { text: `📢 ${channel.title}`, url: channel.url }
      ]).concat([
        [{ text: '🔁 Проверить подписку', callback_data: 'check_subscription' }]
      ])
    };

    await ctx.reply(`📢 Обязательные каналы для подписки:\n\n${channelsText}`, {
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error handling subscribe button:', error);
    await ctx.reply('Произошла ошибка при загрузке списка каналов.');
  }
}

// 구독 확인
async function handleCheckSubscription(ctx) {
  try {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (!user) {
      await ctx.reply('Пользователь не найден. Используйте /start для регистрации.');
      return;
    }

    // 텔레그램 API로 구독 상태 확인
    const config = await BotConfig.getConfig();
    const requiredChannels = config.requiredChannels || [];

    if (requiredChannels.length === 0) {
      // 필수 채널이 없으면 바로 통과
      await ctx.reply('✅ Подписка подтверждена! Доступ к игре открыт.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '▶️ Играть', web_app: { url: await getMiniAppUrl() } }]
          ]
        }
      });
      return;
    }

    let allSubscribed = true;
    const channelUsernames = requiredChannels.map(ch => {
      // URL에서 채널 username 추출
      const match = ch.url.match(/t\.me\/([^\/]+)/);
      return match ? match[1] : null;
    }).filter(Boolean);

    // 각 채널에 대한 구독 확인
    for (const channelUsername of channelUsernames) {
      try {
        const member = await ctx.telegram.getChatMember(`@${channelUsername}`, telegramId);
        if (member.status === 'left' || member.status === 'kicked') {
          allSubscribed = false;
          break;
        }
      } catch (err) {
        // 채널 확인 실패 시 구독하지 않은 것으로 간주
        allSubscribed = false;
        break;
      }
    }

    if (allSubscribed) {
      user.subscribedChannels = channelUsernames;
      user.subscriptionCheckedAt = new Date();
      await user.save();

      const miniAppUrl = await getMiniAppUrl();
      await ctx.reply('✅ Подписка подтверждена! Доступ к игре открыт.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '▶️ Играть', web_app: { url: miniAppUrl } }]
          ]
        }
      });
    } else {
      await ctx.reply('❌ Вы не подписаны на все обязательные каналы. Пожалуйста, подпишитесь и попробуйте снова.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔔 Подписаться', callback_data: 'subscribe' }]
          ]
        }
      });
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
    await ctx.reply('Ошибка при проверке подписки. Попробуйте позже.').catch(() => { });
  }
}

// 주간 리더보드 표시
async function showWeeklyLeaderboard(ctx) {
  try {
    const GameRecord = require('../models/GameRecord');

    const currentGoal = await WeeklyGoal.getCurrentGoal();
    if (!currentGoal) {
      await ctx.reply('Текущая недельная цель не установлена.');
      return;
    }

    // 주간 목표 기간 내의 게임 기록 가져오기 (현재 주간 기간에 맞춰서 필터링)
    const records = await GameRecord.find({
      playedAt: {
        $gte: currentGoal.weekStartDate,
        $lte: currentGoal.weekEndDate
      }
    })
      .sort({ score: -1 })
      .populate('userId', 'username avatar telegramId')
      .select('-__v')
      .lean();

    // 사용자별 최고 점수 집계 (주간 기간 내에서만)
    const userScores = {};
    records.forEach(record => {
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

    // 점수 순으로 정렬하고 상위 20개만 가져오기
    const weeklyLeaderboard = Object.values(userScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((user, index) => ({
        rank: index + 1,
        telegramId: user.telegramId,
        username: user.username,
        avatar: user.avatar,
        score: user.score,
        playedAt: user.playedAt
      }));

    const weekGoalImagePath = path.join(__dirname, '../weekgoal.jpg');
    const imageExists = fs.existsSync(weekGoalImagePath);

    let leaderboardText = `📊 Топ недели (${new Date(currentGoal.weekStartDate).toLocaleDateString('ru-RU')} - ${new Date(currentGoal.weekEndDate).toLocaleDateString('ru-RU')})\n\n`;
    leaderboardText += `🎯 Цель: ${currentGoal.targetScore.toLocaleString()} очков\n\n`;

    if (weeklyLeaderboard.length === 0) {
      leaderboardText += 'Пока нет записей за этот период.';
    } else {
      weeklyLeaderboard.forEach((record) => {
        const rank = record.rank;
        const medal = rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        const username = record.username || 'Unknown';
        // @ 기호 제거하여 실제 플레이어 정보를 찾을 수 없게 함
        leaderboardText += `${medal} ${username}: ${record.score.toLocaleString()} очков\n`;
      });
    }

    if (imageExists) {
      await ctx.replyWithPhoto({ source: weekGoalImagePath }, {
        caption: leaderboardText,
        parse_mode: 'HTML'
      });
    } else {
      await ctx.reply(leaderboardText);
    }
  } catch (error) {
    console.error('Error showing weekly leaderboard:', error);
    await ctx.reply('Ошибка при загрузке топа недели.').catch(() => { });
  }
}

// 프로필 표시
async function showProfile(ctx) {
  try {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId }).populate('referredBy');
    if (!user) {
      await ctx.reply('Пользователь не найден. Используйте /start для регистрации.');
      return;
    }

    const profileImagePath = path.join(__dirname, '../profile.jpg');
    const imageExists = fs.existsSync(profileImagePath);

    const profileText = `👤 Профиль

Имя: @${user.username || 'Unknown'}
Монеты: ${user.balance || 0} 🪙
Рекорд: ${user.highScore || 0} очков
Выиграно USDT: ${user.totalCryptoEarned || 0} USDT
Рефералов: ${user.referralCount || 0} 👥

Ваш реферальный код: <code>${user.referralCode || 'N/A'}</code>

Приглашайте друзей и получайте бонусы!`;

    if (imageExists) {
      await ctx.replyWithPhoto({ source: profileImagePath }, {
        caption: profileText,
        parse_mode: 'HTML'
      });
    } else {
      await ctx.reply(profileText, {
        parse_mode: 'HTML'
      });
    }
  } catch (error) {
    console.error('Error showing profile:', error);
    await ctx.reply('Ошибка при загрузке профиля.').catch(() => { });
  }
}

// 봇 인스턴스 생성 (webhook 전용, 핸들러 설정)
async function initializeBot() {
  try {
    const botToken = await getBotToken();
    if (!botToken) {
      console.log('Bot token not found in database.');
      return null;
    }

    const active = await isBotActive();
    if (!active) {
      console.log('Bot is not active.');
      return null;
    }

    // Telegraf 인스턴스 생성
    const botInstance = new Telegraf(botToken);

    // 핸들러 설정
    setupBotHandlers(botInstance);

    console.log('[Bot] Bot instance created for webhook');
    return botInstance;
  } catch (error) {
    console.error('Error initializing bot:', error);
    return null;
  }
}

// Webhook 설정용 봇 인스턴스 생성 (핸들러 없음)
// 주의: webhook 설정을 위해 활성화 상태 체크를 하지 않음 (순환 의존성 방지)
async function getBotInstance() {
  try {
    const botToken = await getBotToken();
    if (!botToken) {
      console.log('[getBotInstance] Bot token not found in database.');
      return null;
    }

    // 활성화 상태 체크 제거: webhook 설정 시에는 봇이 아직 활성화되지 않았을 수 있음
    // webhook 설정 후에야 봇이 활성화되므로, 여기서는 토큰만 확인

    // 모든 환경에서 새 인스턴스 생성 (webhook 전용)
    const botInstance = new Telegraf(botToken);
    console.log('[getBotInstance] Bot instance created successfully');
    return botInstance;
  } catch (error) {
    console.error('[getBotInstance] Error creating bot instance:', error);
    console.error('[getBotInstance] Error stack:', error.stack);
    return null;
  }
}

// Webhook 업데이트 처리 (모든 환경에서 사용)
async function handleWebhookUpdate(update) {
  try {
    console.log('[Webhook] Received update:', JSON.stringify(update, null, 2));

    const botToken = await getBotToken();
    if (!botToken) {
      console.error('[Webhook] Bot token not found');
      return;
    }

    const active = await isBotActive();
    if (!active) {
      console.error('[Webhook] Bot is not active');
      return;
    }

    // 매 요청마다 새로운 Telegraf 인스턴스 생성
    const botInstance = new Telegraf(botToken);
    console.log('[Webhook] Bot instance created');

    // 봇 유저네임 업데이트 (없는 경우)
    const config = await BotConfig.getConfig();
    if (!config.botUsername) {
      try {
        const botInfo = await botInstance.telegram.getMe();
        if (botInfo && botInfo.username) {
          await BotConfig.updateConfig({ botUsername: botInfo.username });
          console.log('[Webhook] Bot username updated:', botInfo.username);
        }
      } catch (err) {
        console.warn('[Webhook] Failed to update bot username:', err.message);
      }
    }

    // 핸들러 등록
    setupBotHandlers(botInstance);
    console.log('[Webhook] Handlers registered');

    // 업데이트 처리
    console.log('[Webhook] Processing update...');
    await botInstance.handleUpdate(update);
    console.log('[Webhook] Update processed successfully');
  } catch (error) {
    console.error('[Webhook] Error handling update:', error);
    console.error('[Webhook] Error stack:', error.stack);
  }
}

// 봇 중지 (webhook 삭제)
async function stopBot() {
  try {
    const botInstance = await getBotInstance();
    if (botInstance) {
      await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
      console.log('[Bot] Webhook deleted');
    }
  } catch (error) {
    console.error('[Bot] Error stopping bot:', error);
  }
}

// 봇 상태 가져오기
async function getBotStatus() {
  const config = await BotConfig.getConfig();
  const miniAppUrl = await getMiniAppUrl();
  const maskedToken = config.botToken
    ? `${config.botToken.substring(0, 10)}...${config.botToken.substring(config.botToken.length - 4)}`
    : 'Not set';

  let webhookInfo = null;
  let isWebhookActive = false;

  if (config.botToken && config.isActive) {
    try {
      const botInstance = await getBotInstance();
      if (botInstance) {
        // 모든 환경에서 webhook 상태 확인
        webhookInfo = await botInstance.telegram.getWebhookInfo();
        isWebhookActive = !!(webhookInfo && webhookInfo.url);
      }
    } catch (error) {
      console.warn('Error getting bot status:', error.message);
    }
  }

  return {
    isInitialized: config.isActive && isWebhookActive,
    isPolling: false, // polling 모드 제거
    isActive: config.isActive,
    hasToken: !!config.botToken,
    miniAppUrl: miniAppUrl,
    botToken: maskedToken,
    notificationChannelId: config.notificationChannelId || 'Not set',
    webhookUrl: webhookInfo?.url || null,
    webhookPendingUpdates: webhookInfo?.pending_update_count || 0,
    isWebhookActive: isWebhookActive
  };
}

// 알림 함수들 (기존 로직 유지, Telegraf API 사용)
async function sendUSDTWinNotification(telegramId, username, amount, pointsRequired) {
  console.log(`[sendUSDTWinNotification] Called: telegramId=${telegramId}, username=${username}, amount=${amount}, pointsRequired=${pointsRequired}`);
  try {
    const user = await User.findOne({ telegramId });
    if (!user) {
      console.warn(`[sendUSDTWinNotification] User not found for USDT win notification: ${telegramId}`);
      return;
    }
    console.log(`[sendUSDTWinNotification] User found: ${user.username || 'Unknown'}`);

    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('[sendUSDTWinNotification] Bot instance not available, cannot send USDT win notification');
      return;
    }
    console.log('[sendUSDTWinNotification] Bot instance obtained, proceeding with notification');

    const winImagePath = path.join(__dirname, '../win.jpg');
    const imageExists = fs.existsSync(winImagePath);

    const message = `🎉 MVP RUNNER: Порог взят!

@${username} первым добрался до ${pointsRequired.toLocaleString()} очков и открыл рулетку.

🎰 Выпало: ${amount.toLocaleString()} USDT!

🏆 Поздравляем победителя недели! #MVPRUNNER`;

    // 모든 봇 사용자에게 알림 전송
    const users = await User.find({ isBlocked: false });
    console.log(`[sendUSDTWinNotification] Found ${users.length} users to notify`);
    let successCount = 0;
    let failCount = 0;

    for (const targetUser of users) {
      try {
        if (imageExists) {
          await botInstance.telegram.sendPhoto(targetUser.telegramId, { source: winImagePath }, {
            caption: message,
            parse_mode: 'HTML'
          });
        } else {
          await botInstance.telegram.sendMessage(targetUser.telegramId, message, {
            parse_mode: 'HTML'
          });
        }
        successCount++;
      } catch (err) {
        if (err.response?.error_code === 400 && err.response?.description?.includes('chat not found')) {
          console.warn(`Cannot send USDT win notification to user ${targetUser.telegramId}: user has not started a conversation with the bot`);
        } else if (err.response?.error_code !== 403) {
          console.error('Error sending USDT win notification:', err);
        }
        failCount++;
      }
    }

    console.log(`USDT win notification sent: ${successCount} success, ${failCount} failed`);

    // 채널에 알림
    const channelId = await getNotificationChannelId();
    if (channelId) {
      try {
        let normalizedChannelId = channelId.trim();
        if (!normalizedChannelId.startsWith('@') && !normalizedChannelId.startsWith('-')) {
          if (/^\d+$/.test(normalizedChannelId)) {
            normalizedChannelId = `-100${normalizedChannelId}`;
          }
        }

        if (imageExists) {
          await botInstance.telegram.sendPhoto(normalizedChannelId, { source: winImagePath }, {
            caption: message,
            parse_mode: 'HTML'
          });
        } else {
          await botInstance.telegram.sendMessage(normalizedChannelId, message, {
            parse_mode: 'HTML'
          });
        }
        console.log('USDT win notification sent to channel:', normalizedChannelId);
      } catch (err) {
        if (err.response?.error_code === 400 && err.response?.description?.includes('chat not found')) {
          console.warn(`Cannot send USDT win notification to channel ${channelId}: bot is not a member of the channel or channel ID is invalid`);
        } else {
          console.error('Error sending channel USDT win notification:', err);
        }
      }
    }
  } catch (error) {
    console.error('Error sending USDT win notification:', error);
  }
}

async function sendCoinsWinNotification(telegramId, username, amount) {
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('Bot instance not available, cannot send COINS win notification');
      return;
    }

    const message = `💠 Выигрыш COINS!\n@${username} получил ${amount.toLocaleString()} COINS.`;

    await botInstance.telegram.sendMessage(telegramId, message, {
      parse_mode: 'HTML'
    });
    console.log('COINS win notification sent to user:', telegramId);
  } catch (error) {
    if (error.response?.error_code === 400 && error.response?.description?.includes('chat not found')) {
      console.warn(`Cannot send COINS win notification to user ${telegramId}: user has not started a conversation with the bot`);
    } else {
      console.error('Error sending COINS win notification:', error);
    }
  }
}

async function sendWeeklyGoalUpdateNotification(pointsRequired) {
  console.log(`[sendWeeklyGoalUpdateNotification] Called with pointsRequired=${pointsRequired}`);
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('[sendWeeklyGoalUpdateNotification] Bot instance not available, cannot send weekly goal update notification');
      return;
    }
    console.log('[sendWeeklyGoalUpdateNotification] Bot instance obtained, proceeding with notification');

    const weekGoalImagePath = path.join(__dirname, '../weekgoal.jpg');
    const imageExists = fs.existsSync(weekGoalImagePath);
    console.log(`[sendWeeklyGoalUpdateNotification] Image exists: ${imageExists}, path: ${weekGoalImagePath}`);

    const message = `📊 Новый порог недели: ${pointsRequired.toLocaleString()} очков.`;

    const users = await User.find({ isBlocked: false });
    console.log(`[sendWeeklyGoalUpdateNotification] Found ${users.length} users to notify`);
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        if (imageExists) {
          await botInstance.telegram.sendPhoto(user.telegramId, { source: weekGoalImagePath }, {
            caption: message,
            parse_mode: 'HTML'
          });
        } else {
          await botInstance.telegram.sendMessage(user.telegramId, message);
        }
        successCount++;
      } catch (err) {
        if (err.response?.error_code === 400 && err.response?.description?.includes('chat not found')) {
          console.warn(`Cannot send weekly goal update to user ${user.telegramId}: user has not started a conversation with the bot`);
        } else if (err.response?.error_code !== 403) {
          console.error('Error sending weekly goal update:', err);
        }
        failCount++;
      }
    }

    console.log(`Weekly goal update notification sent: ${successCount} success, ${failCount} failed`);
  } catch (error) {
    console.error('Error sending weekly goal update notification:', error);
  }
}

// 첫 주간 목표 달성자 알림
async function sendFirstAchieverNotification(telegramId, username, targetScore, actualScore) {
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('Bot instance not available, cannot send first achiever notification');
      return;
    }

    // 활성 휠 설정 가져오기
    const WheelConfig = require('../models/WheelConfig');
    const activeWheelConfig = await WheelConfig.getActive();

    // 휠 설정에서 USDT 값들 추출 (중복 제거 및 정렬)
    let wheelValuesText = '';
    if (activeWheelConfig && activeWheelConfig.segments && activeWheelConfig.segments.length > 0) {
      const usdtValues = activeWheelConfig.segments
        .map(seg => seg.value)
        .filter(val => val > 0) // USDT 값만 (COINS는 제외)
        .filter((val, index, arr) => arr.indexOf(val) === index) // 중복 제거
        .sort((a, b) => a - b); // 오름차순 정렬

      if (usdtValues.length > 0) {
        wheelValuesText = `{${usdtValues.join('/')} USDT}`;
      } else {
        wheelValuesText = '{USDT}'; // 기본값
      }
    } else {
      wheelValuesText = '{USDT}'; // 기본값
    }

    const goalReachImagePath = path.join(__dirname, '../goal reach.jpg');
    const imageExists = fs.existsSync(goalReachImagePath);

    const message = `🎟 Фриспин: @${username} активировал промокод — выигрыш в рулетке ${wheelValuesText}! 🎰🔥`;

    // 모든 봇 사용자에게 알림 전송
    const users = await User.find({ isBlocked: false });
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        if (imageExists) {
          await botInstance.telegram.sendPhoto(user.telegramId, { source: goalReachImagePath }, {
            caption: message,
            parse_mode: 'HTML'
          });
        } else {
          await botInstance.telegram.sendMessage(user.telegramId, message, {
            parse_mode: 'HTML'
          });
        }
        successCount++;
      } catch (err) {
        if (err.response?.error_code === 400 && err.response?.description?.includes('chat not found')) {
          console.warn(`Cannot send first achiever notification to user ${user.telegramId}: user has not started a conversation with the bot`);
        } else if (err.response?.error_code !== 403) {
          console.error('Error sending first achiever notification:', err);
        }
        failCount++;
      }
    }

    console.log(`First achiever notification sent: ${successCount} success, ${failCount} failed`);

    // 채널에 알림
    const channelId = await getNotificationChannelId();
    if (channelId) {
      try {
        let normalizedChannelId = channelId.trim();
        if (!normalizedChannelId.startsWith('@') && !normalizedChannelId.startsWith('-')) {
          if (/^\d+$/.test(normalizedChannelId)) {
            normalizedChannelId = `-100${normalizedChannelId}`;
          }
        }

        if (imageExists) {
          await botInstance.telegram.sendPhoto(normalizedChannelId, { source: goalReachImagePath }, {
            caption: message,
            parse_mode: 'HTML'
          });
        } else {
          await botInstance.telegram.sendMessage(normalizedChannelId, message, {
            parse_mode: 'HTML'
          });
        }
        console.log('First achiever notification sent to channel:', normalizedChannelId);
      } catch (err) {
        if (err.response?.error_code === 400 && err.response?.description?.includes('chat not found')) {
          console.warn(`Cannot send first achiever notification to channel ${channelId}: bot is not a member of the channel or channel ID is invalid`);
        } else {
          console.error('Error sending first achiever notification to channel:', err);
        }
      }
    }
  } catch (error) {
    console.error('Error sending first achiever notification:', error);
  }
}

async function sendWeeklyWinnerNotification(telegramId, username, amount) {
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('Bot instance not available, cannot send weekly winner notification');
      return;
    }

    const message = `🏁 Победитель забега!\n@${username} занял 1 место и получил ${amount.toLocaleString()} USDT.`;

    const channelId = await getNotificationChannelId();
    if (channelId) {
      try {
        let normalizedChannelId = channelId.trim();
        if (!normalizedChannelId.startsWith('@') && !normalizedChannelId.startsWith('-')) {
          if (/^\d+$/.test(normalizedChannelId)) {
            normalizedChannelId = `-100${normalizedChannelId}`;
          }
        }

        await botInstance.telegram.sendMessage(normalizedChannelId, message, {
          parse_mode: 'HTML'
        });
        console.log('Weekly winner notification sent to channel:', normalizedChannelId);
      } catch (err) {
        if (err.response?.error_code === 400 && err.response?.description?.includes('chat not found')) {
          console.warn(`Cannot send weekly winner notification to channel ${channelId}: bot is not a member of the channel or channel ID is invalid`);
        } else {
          console.error('Error sending weekly winner notification to channel:', err);
        }
      }
    }
  } catch (error) {
    console.error('Error sending weekly winner notification:', error);
  }
}

async function sendNewWeekNotification() {
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('Bot instance not available, cannot send new week notification');
      return;
    }

    const currentGoal = await WeeklyGoal.getCurrentGoal();

    const message = currentGoal
      ? `🔔 Новый заезд открыт!\nПорог: ${currentGoal.targetScore.toLocaleString()} очков\nБанк обновлен.`
      : `🔔 Новый заезд открыт!\nПорог и банк обновлены.`;

    const users = await User.find({ isBlocked: false });
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await botInstance.telegram.sendMessage(user.telegramId, message);
        successCount++;
      } catch (err) {
        if (err.response?.error_code !== 403) {
          console.error('Error sending new week notification:', err);
        }
        failCount++;
      }
    }

    console.log(`New week notification sent: ${successCount} success, ${failCount} failed`);
  } catch (error) {
    console.error('Error sending new week notification:', error);
  }
}

async function sendBroadcast(message, userFilter = {}, imageFile = null) {
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      throw new Error('Bot instance not available for broadcast');
    }

    const users = await User.find({ ...userFilter, isBlocked: false });
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        // 이미지 파일이 업로드된 경우: 메모리 버퍼를 그대로 전송
        if (imageFile && imageFile.buffer) {
          await botInstance.telegram.sendPhoto(
            user.telegramId,
            { source: imageFile.buffer, filename: imageFile.originalname || 'image.jpg' },
            {
              caption: message,
              parse_mode: 'HTML'
            }
          );
        } else {
          // 이미지가 없으면 텍스트 메시지만 전송
          await botInstance.telegram.sendMessage(user.telegramId, message, {
            parse_mode: 'HTML'
          });
        }
        successCount++;
      } catch (err) {
        if (err.response?.error_code === 403) {
          failCount++;
        } else {
          console.error('Error sending broadcast:', err);
          failCount++;
        }
      }
    }

    return { successCount, failCount, total: users.length };
  } catch (error) {
    console.error('Error in broadcast:', error);
    throw error;
  }
}

// 프로모션 코드 구매 알림 (자동 발급)
async function sendPromoCodePurchaseNotification(telegramId, username, promoCode, itemName, price) {
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('[sendPromoCodePurchaseNotification] Bot instance not available');
      return;
    }

    const message = `🎁 Промокод приобретен!

Пользователь: @${username || 'Unknown'}
Товар: ${itemName}
Цена: ${price.toLocaleString()} монет

🎫 Ваш промокод: <code>${promoCode}</code>

Используйте его в игре для участия в рулетке! 🎰`;

    await botInstance.telegram.sendMessage(telegramId, message, {
      parse_mode: 'HTML'
    });
    console.log(`[sendPromoCodePurchaseNotification] Notification sent to ${telegramId}`);
  } catch (error) {
    if (error.response?.error_code === 400 && error.response?.description?.includes('chat not found')) {
      console.warn(`[sendPromoCodePurchaseNotification] Cannot send notification to ${telegramId}: user has not started a conversation with the bot`);
    } else if (error.response?.error_code !== 403) {
      console.error('[sendPromoCodePurchaseNotification] Error sending notification:', error);
    }
  }
}

// 프로모션 코드 구매 요청 알림 (수동 승인 대기)
async function sendPromoCodeRequestNotification(telegramId, username, itemName, price, requestId) {
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('[sendPromoCodeRequestNotification] Bot instance not available');
      return;
    }

    const message = `📝 Запрос на покупку промокода

Пользователь: @${username || 'Unknown'}
Товар: ${itemName}
Цена: ${price.toLocaleString()} монет
ID запроса: ${requestId}

⏳ Ваш запрос отправлен администратору. Ожидайте одобрения.

После одобрения вы получите промокод в этом чате.`;

    await botInstance.telegram.sendMessage(telegramId, message, {
      parse_mode: 'HTML'
    });
    console.log(`[sendPromoCodeRequestNotification] Notification sent to ${telegramId}`);
  } catch (error) {
    if (error.response?.error_code === 400 && error.response?.description?.includes('chat not found')) {
      console.warn(`[sendPromoCodeRequestNotification] Cannot send notification to ${telegramId}: user has not started a conversation with the bot`);
    } else if (error.response?.error_code !== 403) {
      console.error('[sendPromoCodeRequestNotification] Error sending notification:', error);
    }
  }
}

// 게임 코인으로 구매한 프로모션 코드 당첨 알림
async function sendPurchasedPromoCodeWinNotification(telegramId, username, amount, coinsSpent) {
  try {
    const botInstance = await getBotInstance();
    if (!botInstance) {
      console.warn('[sendPurchasedPromoCodeWinNotification] Bot instance not available');
      return;
    }

    const WeeklyGoal = require('../models/WeeklyGoal');
    const currentGoal = await WeeklyGoal.getCurrentGoal();
    const pointsRequired = currentGoal ? currentGoal.targetScore : 0;
    const thresholdStatus = pointsRequired > 0 ? `Порог ${pointsRequired.toLocaleString()} ещё не взят!` : 'Порог ещё не установлен!';

    const message = `🎉 MVP RUNNER

@${username || 'Unknown'} купил рулетку за ${coinsSpent.toLocaleString()} COINS!

🎰 Выпало: ${amount.toLocaleString()} USDT!

🏆 Поздравляем! ${thresholdStatus} #MVPRUNNER`;

    // 모든 봇 사용자에게 알림 전송
    const users = await User.find({ isBlocked: false });
    console.log(`[sendPurchasedPromoCodeWinNotification] Found ${users.length} users to notify`);
    let successCount = 0;
    let failCount = 0;

    for (const targetUser of users) {
      try {
        await botInstance.telegram.sendMessage(targetUser.telegramId, message, {
          parse_mode: 'HTML'
        });
        successCount++;
      } catch (err) {
        if (err.response?.error_code === 400 && err.response?.description?.includes('chat not found')) {
          console.warn(`Cannot send purchased promo code win notification to user ${targetUser.telegramId}: user has not started a conversation with the bot`);
        } else if (err.response?.error_code !== 403) {
          console.error('Error sending purchased promo code win notification:', err);
        }
        failCount++;
      }
    }

    console.log(`Purchased promo code win notification sent: ${successCount} success, ${failCount} failed`);

    // 채널에 알림
    const channelId = await getNotificationChannelId();
    if (channelId) {
      try {
        let normalizedChannelId = channelId.trim();
        if (!normalizedChannelId.startsWith('@') && !normalizedChannelId.startsWith('-')) {
          if (/^\d+$/.test(normalizedChannelId)) {
            normalizedChannelId = `-100${normalizedChannelId}`;
          }
        }

        await botInstance.telegram.sendMessage(normalizedChannelId, message, {
          parse_mode: 'HTML'
        });
        console.log('Purchased promo code win notification sent to channel:', normalizedChannelId);
      } catch (err) {
        if (err.response?.error_code === 400 && err.response?.description?.includes('chat not found')) {
          console.warn(`Cannot send purchased promo code win notification to channel ${channelId}: bot is not a member of the channel or channel ID is invalid`);
        } else {
          console.error('Error sending channel purchased promo code win notification:', err);
        }
      }
    }
  } catch (error) {
    console.error('[sendPurchasedPromoCodeWinNotification] Error sending notification:', error);
  }
}

// 모든 환경에서 webhook만 사용하므로 자동 초기화 제거

// 봇 메뉴 버튼과 커맨드 제거 (초기화 시 사용)
// 모든 UI 요소(버튼, 커맨드, 메뉴 등)를 완전히 초기화
async function clearBotUI(botToken = null) {
  try {
    let token = botToken;
    if (!token) {
      token = await getBotToken();
    }

    if (!token) {
      console.log('[ClearBotUI] No bot token available, skipping UI cleanup');
      return;
    }

    console.log('[ClearBotUI] Starting complete bot UI initialization...');
    const botInstance = new Telegraf(token);

    // 1. 모든 커맨드 제거 (빈 배열로 설정)
    try {
      await botInstance.telegram.setMyCommands([]);
      console.log('[ClearBotUI] ✓ Bot commands cleared (setMyCommands)');
    } catch (err) {
      console.warn('[ClearBotUI] Error clearing commands (setMyCommands):', err.message);
    }

    // 2. 커맨드 삭제 (더 확실한 방법)
    try {
      await botInstance.telegram.deleteMyCommands();
      console.log('[ClearBotUI] ✓ Bot commands deleted (deleteMyCommands)');
    } catch (err) {
      console.warn('[ClearBotUI] Error deleting commands (deleteMyCommands):', err.message);
    }

    // 3. 특정 스코프의 커맨드도 삭제 (기본, 그룹, 개인 채팅 등)
    try {
      await botInstance.telegram.deleteMyCommands({ scope: { type: 'default' } });
      await botInstance.telegram.deleteMyCommands({ scope: { type: 'all_private_chats' } });
      await botInstance.telegram.deleteMyCommands({ scope: { type: 'all_group_chats' } });
      await botInstance.telegram.deleteMyCommands({ scope: { type: 'all_chat_administrators' } });
      console.log('[ClearBotUI] ✓ All scoped commands deleted');
    } catch (err) {
      console.warn('[ClearBotUI] Error deleting scoped commands:', err.message);
    }

    // 4. 메뉴 버튼 제거 (모든 채팅 타입에 대해)
    try {
      await botInstance.telegram.setChatMenuButton({
        menu_button: null
      });
      console.log('[ClearBotUI] ✓ Chat menu button cleared');
    } catch (err) {
      console.warn('[ClearBotUI] Error clearing menu button:', err.message);
    }

    // 5. 특정 채팅의 메뉴 버튼도 제거 시도
    try {
      // 기본 메뉴 버튼 제거
      await botInstance.telegram.setChatMenuButton({
        chat_id: undefined, // 기본 설정
        menu_button: null
      });
      console.log('[ClearBotUI] ✓ Default menu button cleared');
    } catch (err) {
      console.warn('[ClearBotUI] Error clearing default menu button:', err.message);
    }

    // 6. Webhook의 pending updates 삭제 (이전 대화 상태 초기화)
    try {
      await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
      console.log('[ClearBotUI] ✓ Pending updates dropped (webhook reset)');
    } catch (err) {
      // webhook이 없을 수도 있으므로 경고만 출력
      console.warn('[ClearBotUI] Could not drop pending updates (webhook may not exist):', err.message);
    }

    console.log('[ClearBotUI] ✓ Bot UI initialization completed - all buttons, commands, menu items, and pending updates cleared');
  } catch (error) {
    console.error('[ClearBotUI] Error clearing bot UI:', error);
    console.error('[ClearBotUI] Error stack:', error.stack);
    throw error; // 에러를 다시 throw하여 호출자가 처리할 수 있도록
  }
}

module.exports = {
  initializeBot,
  sendPromoCodePurchaseNotification,
  sendPromoCodeRequestNotification,
  sendPurchasedPromoCodeWinNotification,
  getBotInstance,
  handleWebhookUpdate,
  stopBot,
  getBotStatus,
  getMiniAppUrl,
  sendUSDTWinNotification,
  sendCoinsWinNotification,
  sendWeeklyGoalUpdateNotification,
  sendFirstAchieverNotification,
  sendWeeklyWinnerNotification,
  sendNewWeekNotification,
  sendBroadcast,
  clearBotUI
};
