const express = require('express');
const router = express.Router();
const multer = require('multer');
const { sendBroadcast, getBotStatus, getMiniAppUrl } = require('../services/telegramBot');
const User = require('../models/User');
const BotConfig = require('../models/BotConfig');

// Multer 설정: 브로드캐스트용 이미지 업로드 (메모리 저장)
const broadcastUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for broadcast.'), false);
    }
  },
});

// 관리자 브로드캐스트 전송 (텍스트 + 선택적 이미지 업로드)
router.post('/broadcast', broadcastUpload.single('image'), async (req, res) => {
  try {
    const { message, userFilter = '{}' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let parsedFilter = {};
    try {
      parsedFilter = userFilter ? JSON.parse(userFilter) : {};
    } catch (e) {
      console.warn('[Broadcast] Failed to parse userFilter, using empty filter:', e.message);
      parsedFilter = {};
    }

    const imageFile = req.file || null;

    const result = await sendBroadcast(message, parsedFilter, imageFile);

    res.json({
      success: true,
      result: {
        total: result.total,
        successCount: result.successCount,
        failCount: result.failCount
      }
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 필수 채널 목록 가져오기
router.get('/channels', async (req, res) => {
  try {
    const config = await BotConfig.getConfig();
    res.json({
      success: true,
      channels: config.requiredChannels || []
    });
  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 필수 채널 목록 업데이트 (관리자용)
router.post('/channels', (req, res) => {
  try {
    const { channels } = req.body;

    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'Channels must be an array' });
    }

    // 채널 목록 업데이트 (실제로는 환경 변수나 데이터베이스에 저장해야 함)
    // 여기서는 간단히 응답만 반환
    res.json({
      success: true,
      message: 'Channels updated (requires server restart to apply)',
      channels
    });
  } catch (error) {
    console.error('Error updating channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 사용자 통계 (봇 차단 여부 등)
router.get('/user-stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const subscribedUsers = await User.countDocuments({
      subscribedChannels: { $exists: true, $ne: [] }
    });

    const botStatus = await getBotStatus();

    res.json({
      success: true,
      stats: {
        totalUsers,
        blockedUsers,
        subscribedUsers,
        activeUsers: totalUsers - blockedUsers
      },
      botStatus
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 봇 상태 확인
router.get('/status', async (req, res) => {
  try {
    const status = await getBotStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting bot status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 미니앱 URL 가져오기
router.get('/mini-app-url', async (req, res) => {
  try {
    const { getMiniAppUrl } = require('../services/telegramBot');
    const url = await getMiniAppUrl();
    res.json({
      success: true,
      url: url
    });
  } catch (error) {
    console.error('Error getting mini app URL:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Webhook 설정 (Vercel 환경용)
router.post('/set-webhook', async (req, res) => {
  try {
    const { getBotInstance, getMiniAppUrl } = require('../services/telegramBot');
    const bot = await getBotInstance();

    if (!bot) {
      return res.status(400).json({
        error: 'Bot is not initialized. Please activate the bot first.'
      });
    }

    // 모든 환경에서 webhook 사용

    const baseUrl = await getMiniAppUrl();
    // URL 끝에 슬래시가 있으면 제거하여 이중 슬래시 방지
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const webhookUrl = `${cleanBaseUrl}/api/telegram-bot/webhook`;

    console.log('[Vercel] Setting webhook to:', webhookUrl);

    const result = await bot.setWebHook(webhookUrl, {
      drop_pending_updates: true
    });

    res.json({
      success: true,
      message: 'Webhook set successfully',
      webhookUrl: webhookUrl,
      result: result
    });
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Webhook 삭제
router.post('/delete-webhook', async (req, res) => {
  try {
    const { getBotInstance } = require('../services/telegramBot');
    const bot = await getBotInstance();

    if (!bot) {
      return res.status(400).json({
        error: 'Bot is not initialized'
      });
    }

    const result = await bot.telegram.deleteWebhook({ drop_pending_updates: true });

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
      result: result
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Webhook 정보 가져오기
router.get('/webhook-info', async (req, res) => {
  try {
    const { getBotInstance } = require('../services/telegramBot');
    const bot = await getBotInstance();

    if (!bot) {
      return res.status(400).json({
        error: 'Bot is not initialized'
      });
    }

    const info = await bot.telegram.getWebhookInfo();

    res.json({
      success: true,
      webhookInfo: info
    });
  } catch (error) {
    console.error('Error getting webhook info:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Webhook 엔드포인트 (텔레그램에서 업데이트를 받는 엔드포인트)
// Telegraf Express 웹훅 통합
router.post('/webhook', async (req, res) => {
  try {
    const { handleWebhookUpdate } = require('../services/telegramBot');

    // req.body는 Buffer이므로 JSON으로 파싱
    let update;
    try {
      if (Buffer.isBuffer(req.body)) {
        update = JSON.parse(req.body.toString());
      } else {
        update = req.body;
      }
    } catch (parseError) {
      console.error('[Webhook] Error parsing update:', parseError);
      return res.status(400).send('Invalid update format');
    }

    // Telegraf는 handleUpdate를 await할 수 있음
    await handleWebhookUpdate(update);

    // 성공 응답
    res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook] Error processing update:', error);
    // 에러가 발생해도 200 응답 (텔레그램 타임아웃 방지)
    res.status(200).send('OK');
  }
});

module.exports = router;

