const BotConfig = require('../models/BotConfig');

// 봇 설정 가져오기
exports.getConfig = async (req, res) => {
  try {
    const config = await BotConfig.getConfig();
    console.log('[BotConfigController] getConfig called. Config ID:', config._id, 'Has Token:', !!config.botToken);

    // 토큰은 마스킹하여 반환 (보안)
    const maskedToken = config.botToken
      ? `${config.botToken.substring(0, 10)}...${config.botToken.substring(config.botToken.length - 4)}`
      : '';

    res.json({
      success: true,
      config: {
        botToken: config.botToken ? maskedToken : '',
        hasToken: !!config.botToken,
        miniAppUrl: config.miniAppUrl,
        notificationChannelId: config.notificationChannelId,
        isActive: config.isActive,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy
      }
    });
  } catch (error) {
    console.error('Error getting bot config:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 봇 설정 업데이트
exports.updateConfig = async (req, res) => {
  try {
    const { botToken, miniAppUrl, notificationChannelId, isActive } = req.body;
    const { getBotInstance, getMiniAppUrl } = require('../services/telegramBot');

    // 기존 설정 가져오기
    const currentConfig = await BotConfig.getConfig();
    const wasTokenChanged = botToken !== undefined && botToken !== currentConfig.botToken;
    const wasActive = currentConfig.isActive;

    const updates = {};
    if (botToken !== undefined) {
      updates.botToken = botToken;
    }
    if (miniAppUrl !== undefined) {
      updates.miniAppUrl = miniAppUrl;
    }
    if (notificationChannelId !== undefined) {
      updates.notificationChannelId = notificationChannelId;
    }
    if (isActive !== undefined) {
      updates.isActive = isActive;
    }
    updates.updatedBy = 'admin';

    const config = await BotConfig.updateConfig(updates);
    console.log('[BotConfigController] updateConfig called. Config ID:', config._id, 'Updates:', Object.keys(updates));

    // 토큰이 설정된 경우 (새로 입력되거나 변경된 경우) 해당 봇의 모든 UI 초기화
    if (botToken !== undefined && config.botToken) {
      console.log('[Bot] Bot token set/updated, initializing bot UI cleanup...');
      try {
        const { clearBotUI } = require('../services/telegramBot');

        // 기존 토큰이 있으면 먼저 기존 봇의 UI 정리
        if (wasTokenChanged && currentConfig.botToken && currentConfig.botToken !== config.botToken) {
          console.log('[Bot] Clearing old bot UI...');
          await clearBotUI(currentConfig.botToken);
        }

        // 새 토큰의 봇 UI 완전 초기화 (모든 버튼, 커맨드, 메뉴 제거)
        console.log('[Bot] Initializing new bot UI (clearing all existing UI elements)...');
        await clearBotUI(config.botToken);
        console.log('[Bot] Bot UI initialization completed - all buttons, commands, and menu items cleared');
      } catch (error) {
        console.error('[Bot] Error initializing bot UI:', error);
        console.error('[Bot] Error message:', error.message);
        // UI 초기화 실패해도 계속 진행 (토큰은 유효할 수 있음)
      }
    }

    // 토큰이 설정되어 있고 봇이 활성화되어 있으면 webhook 설정
    // 새 토큰이 입력되었거나 봇이 활성화된 경우 webhook 설정
    const shouldSetWebhook = (wasTokenChanged || (config.isActive && !wasActive)) && config.botToken && config.isActive;

    console.log(`[Bot] Config update check: wasTokenChanged=${wasTokenChanged}, wasActive=${wasActive}, config.isActive=${config.isActive}, config.botToken=${!!config.botToken}, shouldSetWebhook=${shouldSetWebhook}`);

    if (shouldSetWebhook) {
      console.log('[Bot] Setting webhook after config update...');
      try {
        // 새 토큰으로 봇 인스턴스 생성 (활성화 상태 체크 없이)
        const { Telegraf } = require('telegraf');
        const botInstance = new Telegraf(config.botToken);

        const baseUrl = config.miniAppUrl || await getMiniAppUrl();
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const webhookUrl = `${cleanBaseUrl}/api/telegram-bot/webhook`;

        console.log('[Bot] Webhook URL:', webhookUrl);
        console.log('[Bot] Base URL:', baseUrl);
        console.log('[Bot] Mini App URL from config:', config.miniAppUrl);

        const setWebhookResult = await botInstance.telegram.setWebhook(webhookUrl, { drop_pending_updates: true });
        console.log('[Bot] setWebhook result:', setWebhookResult);
        console.log('[Bot] Webhook set successfully:', webhookUrl);

        // webhook 설정 확인
        const webhookInfo = await botInstance.telegram.getWebhookInfo();
        console.log('[Bot] Webhook info after setting:', JSON.stringify(webhookInfo, null, 2));

        if (!webhookInfo.url || webhookInfo.url !== webhookUrl) {
          console.warn('[Bot] Webhook URL mismatch! Expected:', webhookUrl, 'Got:', webhookInfo.url);
        } else {
          console.log('[Bot] Webhook verified successfully');
        }
      } catch (error) {
        console.error('[Bot] Error setting webhook after token update:', error);
        console.error('[Bot] Error message:', error.message);
        console.error('[Bot] Error response:', error.response);
        console.error('[Bot] Error stack:', error.stack);
        // webhook 설정 실패해도 설정 업데이트는 성공으로 처리 (나중에 재시도 가능)
      }
    } else {
      console.log('[Bot] Webhook not set. Reasons:', {
        wasTokenChanged,
        configIsActive: config.isActive,
        wasActive,
        hasToken: !!config.botToken,
        shouldSetWebhook
      });
    }

    // 토큰 마스킹
    const maskedToken = config.botToken
      ? `${config.botToken.substring(0, 10)}...${config.botToken.substring(config.botToken.length - 4)}`
      : '';

    res.json({
      success: true,
      message: 'Bot config updated successfully',
      config: {
        botToken: config.botToken ? maskedToken : '',
        hasToken: !!config.botToken,
        miniAppUrl: config.miniAppUrl,
        notificationChannelId: config.notificationChannelId,
        isActive: config.isActive,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy
      }
    });
  } catch (error) {
    console.error('Error updating bot config:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 봇 활성화/비활성화 (서버리스 환경: webhook 설정/해제만 담당)
exports.toggleActive = async (req, res) => {
  try {
    const { getBotInstance, getMiniAppUrl } = require('../services/telegramBot');
    const config = await BotConfig.getConfig();

    if (!config.botToken) {
      return res.status(400).json({
        error: 'Bot token is required before activating the bot'
      });
    }

    const wasActive = config.isActive;
    config.isActive = !config.isActive;
    config.updatedBy = 'admin';
    await config.save();

    // 활성화 상태가 변경된 경우 webhook 설정/해제 (모든 환경에서 webhook만 사용)
    if (config.isActive && !wasActive) {
      // 활성화: webhook 설정
      console.log('[Bot] Bot activated, setting webhook...');
      try {
        const botInstance = await getBotInstance();
        if (!botInstance) {
          console.error('[Bot] Failed to create bot instance for webhook setup');
          // 봇 인스턴스 생성 실패 시에도 활성화 상태는 유지 (나중에 재시도 가능)
          return res.status(500).json({
            error: 'Failed to create bot instance',
            message: 'Bot token may be invalid or bot instance creation failed. Please check the token and try again.'
          });
        }

        const baseUrl = await getMiniAppUrl();
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const webhookUrl = `${cleanBaseUrl}/api/telegram-bot/webhook`;

        console.log('[Bot] Setting webhook to:', webhookUrl);
        await botInstance.telegram.setWebhook(webhookUrl, { drop_pending_updates: true });
        console.log('[Bot] Webhook set successfully:', webhookUrl);

        // webhook 설정 확인
        const webhookInfo = await botInstance.telegram.getWebhookInfo();
        console.log('[Bot] Webhook info:', JSON.stringify(webhookInfo, null, 2));
      } catch (error) {
        console.error('[Bot] Error setting webhook:', error);
        console.error('[Bot] Error stack:', error.stack);
        // webhook 설정 실패 시 활성화 상태 롤백
        config.isActive = false;
        await config.save();
        return res.status(500).json({
          error: 'Failed to set webhook',
          details: error.message,
          message: 'Please check the webhook URL and bot token, then try again.'
        });
      }
    } else if (!config.isActive && wasActive) {
      // 비활성화: webhook 삭제 및 UI 정리
      console.log('[Bot] Bot deactivated, deleting webhook and clearing UI...');
      try {
        const botInstance = await getBotInstance();
        if (botInstance) {
          await botInstance.telegram.deleteWebhook({ drop_pending_updates: true });
          console.log('[Bot] Webhook deleted successfully');

          // 메뉴 버튼과 커맨드 제거
          const { clearBotUI } = require('../services/telegramBot');
          await clearBotUI(config.botToken);
        }
      } catch (error) {
        console.error('[Bot] Error deleting webhook:', error);
      }
    }

    res.json({
      success: true,
      message: `Bot ${config.isActive ? 'activated' : 'deactivated'}`,
      isActive: config.isActive
    });
  } catch (error) {
    console.error('Error toggling bot active:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 필수 채널 목록 가져오기 (공개 API)
exports.getRequiredChannels = async (req, res) => {
  try {
    const config = await BotConfig.getConfig();
    console.log('[BotConfigController] getRequiredChannels called. Config ID:', config._id, 'Channels count:', config.requiredChannels?.length);
    res.json({
      success: true,
      channels: config.requiredChannels || []
    });
  } catch (error) {
    console.error('Error getting required channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 필수 채널 설정 업데이트 (관리자 전용)
exports.updateRequiredChannels = async (req, res) => {
  try {
    const { requiredChannels } = req.body;

    if (!Array.isArray(requiredChannels)) {
      return res.status(400).json({ error: 'requiredChannels must be an array' });
    }

    const config = await BotConfig.getConfig();
    config.requiredChannels = requiredChannels;
    config.updatedBy = 'admin';
    await config.save();

    res.json({
      success: true,
      message: 'Required channels updated successfully',
      channels: config.requiredChannels
    });
  } catch (error) {
    console.error('Error updating required channels:', error);
    res.status(500).json({ error: 'Server error' });
  }
};



