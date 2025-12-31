const { Telegraf } = require('telegraf');
const BotConfig = require('../models/BotConfig');
const { verifyInitData, extractUserFromInitData } = require('../utils/telegramAuth');

/**
 * 필수 채널 목록을 데이터베이스에서 가져오기
 * 
 * ⚠️ 중요: 봇이 이 채널들의 관리자여야 합니다!
 * 
 * 봇을 관리자로 초대하는 방법:
 * 1. 각 채널에서 채널 정보 → 관리자 → 관리자 추가
 * 2. 봇의 username을 입력하고 관리자 권한 부여
 * 3. 최소한 "멤버 추가/제거" 권한은 필요합니다
 * 
 * 채널 관리:
 * - Admin 패널에서 채널 추가/수정/삭제 가능
 * - BotConfig 모델의 requiredChannels 필드에 저장됨
 * 
 * @returns {Promise<Array>} 채널 목록 배열
 */
async function getRequiredChannels() {
  try {
    const config = await BotConfig.getConfig();
    return config.requiredChannels || [];
  } catch (error) {
    console.error('[ChannelController] Error getting required channels from DB:', error);
    // 에러 발생 시 빈 배열 반환
    return [];
  }
}

/**
 * Private 채널 URL에서 chat_id 추출
 * 
 * Private 채널의 invite link 형식: https://t.me/+g06yUX0pXVEzOTEy
 * + 기호 뒤의 문자열이 고유 식별자입니다.
 * 
 * 하지만 getChatMember는 chat_id를 직접 받지 않고,
 * invite link 전체를 사용하거나 채널 username을 사용합니다.
 * 
 * Private 채널의 경우:
 * - invite link 전체를 chat_id로 사용할 수 있습니다
 * - 또는 봇이 관리자인 경우 채널 정보를 가져와서 chat_id를 얻을 수 있습니다
 */
function extractChatIdFromUrl(url) {
  try {
    // https://t.me/+g06yUX0pXVEzOTEy 형식
    const match = url.match(/t\.me\/\+([^\/]+)/);
    if (match) {
      return `+${match[1]}`;
    }
    // https://t.me/channelname 형식 (public)
    const match2 = url.match(/t\.me\/([^\/]+)/);
    if (match2) {
      return `@${match2[1]}`;
    }
    return url;
  } catch (error) {
    console.error('[ChannelController] Error extracting chat_id:', error);
    return url;
  }
}

/**
 * 채널 가입 여부 확인 (서버 측)
 * 
 * POST /api/channel/check-subscription
 * 
 * 요청 본문:
 * {
 *   initData: "Telegram WebApp initData 문자열"
 * }
 * 
 * 응답:
 * {
 *   success: true,
 *   allSubscribed: true/false,
 *   channels: [
 *     { url: "...", title: "...", subscribed: true/false }
 *   ],
 *   userId: 123456789
 * }
 */
exports.checkChannelSubscription = async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({
        success: false,
        error: 'initData is required'
      });
    }

    // 1. 봇 토큰 가져오기
    const config = await BotConfig.getConfig();
    const botToken = config.botToken;

    if (!botToken) {
      console.error('[ChannelController] Bot token not found');
      return res.status(500).json({
        success: false,
        error: 'Bot token not configured'
      });
    }

    // 2. initData HMAC 검증 (위조 방지)
    const isValid = verifyInitData(initData, botToken);
    if (!isValid) {
      console.error('[ChannelController] Invalid initData signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid initData signature'
      });
    }

    // 3. initData에서 user 정보 추출
    const user = extractUserFromInitData(initData);
    if (!user || !user.id) {
      console.error('[ChannelController] User ID not found in initData');
      return res.status(400).json({
        success: false,
        error: 'User ID not found in initData'
      });
    }

    const userId = user.id;
    console.log('[ChannelController] Checking subscription for user:', userId);

    // 4. 데이터베이스에서 필수 채널 목록 가져오기
    const REQUIRED_CHANNELS = await getRequiredChannels();
    
    if (!REQUIRED_CHANNELS || REQUIRED_CHANNELS.length === 0) {
      console.warn('[ChannelController] No required channels found in database');
      return res.json({
        success: true,
        allSubscribed: true, // 채널이 없으면 자동으로 통과
        channels: [],
        userId
      });
    }

    console.log('[ChannelController] Found', REQUIRED_CHANNELS.length, 'required channels in database');

    // 5. Telegraf 봇 인스턴스 생성
    const bot = new Telegraf(botToken);

    // 6. 각 채널에 대해 getChatMember로 가입 여부 확인
    const channelResults = [];
    let allSubscribed = true;

    for (const channel of REQUIRED_CHANNELS) {
      try {
        console.log('[ChannelController] Checking channel:', channel.url);

        // Private 채널의 경우:
        // 1. chatId가 숫자로 미리 설정되어 있으면 그대로 사용 (가장 빠름)
        // 2. 없으면 invite link로부터 getChat 또는 메시지 전송으로 chat_id를 얻어야 함
        let finalChatId = channel.chatId;
        
        // chatId가 이미 숫자로 설정되어 있으면 바로 사용 (getChat 호출 불필요)
        if (finalChatId && typeof finalChatId === 'number') {
          console.log('[ChannelController] Using pre-configured chat_id:', finalChatId);
        }
        
        // chatId가 없거나 문자열인 경우, 초대 링크로부터 숫자 chat_id 얻기
        if (!finalChatId || typeof finalChatId === 'string') {
          console.log('[ChannelController] Getting chat_id from invite link:', channel.url);
          
          // 방법 1: getChat을 사용하여 초대 링크로부터 chat_id 얻기
          // 봇이 관리자이고 채널에 가입되어 있어야 합니다
          let chatInfo = null;
          let chatIdObtained = false;
          
          // 여러 형식으로 시도
          const inviteLinkFormats = [
            channel.url, // 전체 URL: https://t.me/+g06yUX0pXVEzOTEy
            channel.url.replace('https://t.me/', ''), // 짧은 형식: +g06yUX0pXVEzOTEy
          ];
          
          for (const inviteLink of inviteLinkFormats) {
            try {
              console.log('[ChannelController] Trying getChat with format:', inviteLink);
              chatInfo = await bot.telegram.getChat(inviteLink);
              finalChatId = chatInfo.id; // 숫자 chat_id (예: -1001234567890)
              chatIdObtained = true;
              console.log('[ChannelController] ✅ Successfully got chat_id from getChat:', finalChatId);
              console.log('[ChannelController] Chat info:', {
                id: chatInfo.id,
                type: chatInfo.type,
                title: chatInfo.title
              });
              break; // 성공하면 루프 종료
            } catch (getChatError) {
              console.warn('[ChannelController] getChat failed with format:', inviteLink, getChatError.message);
              // 다음 형식 시도
            }
          }
          
          // 방법 2: getChat이 실패하면, 봇이 채널에 메시지를 보내서 chat_id 얻기
          // (봇이 관리자이고 메시지를 보낼 수 있는 권한이 있어야 함)
          if (!chatIdObtained) {
            console.log('[ChannelController] getChat failed, trying to send a message to get chat_id...');
            try {
              // 봇이 채널에 메시지를 보내서 chat_id 얻기
              // 메시지는 나중에 삭제할 수 있습니다
              const testMessage = await bot.telegram.sendMessage(channel.url, '🔍');
              
              // 메시지 객체에서 chat.id 추출
              finalChatId = testMessage.chat.id;
              chatIdObtained = true;
              console.log('[ChannelController] ✅ Successfully got chat_id from message:', finalChatId);
              
              // 테스트 메시지 삭제 (선택사항)
              try {
                await bot.telegram.deleteMessage(finalChatId, testMessage.message_id);
                console.log('[ChannelController] Test message deleted');
              } catch (deleteError) {
                console.warn('[ChannelController] Could not delete test message:', deleteError.message);
              }
            } catch (sendMessageError) {
              console.error('[ChannelController] Failed to send message to get chat_id:', sendMessageError.message);
              // 마지막 시도 실패
            }
          }
          
          // 모든 방법 실패 시 에러
          if (!chatIdObtained || !finalChatId) {
            console.error('[ChannelController] ❌ All methods failed to get chat_id');
            console.error('[ChannelController] ⚠️ Troubleshooting steps:');
            console.error('[ChannelController] 1. Make sure the bot is an administrator of the channel');
            console.error('[ChannelController] 2. Check if the invite link is valid and not expired');
            console.error('[ChannelController] 3. Verify the bot has "View channel info" and "Post messages" permissions');
            console.error('[ChannelController] 4. Alternative: Set chatId directly in REQUIRED_CHANNELS array');
            console.error('[ChannelController] 5. To get chat_id manually: make the bot send a message to the channel, then check chat.id');
            
            throw new Error(`Failed to get chat_id for channel ${channel.url}. Make sure the bot is an administrator of the channel with proper permissions. You can also set chatId directly in the REQUIRED_CHANNELS array.`);
          }
        }
        
        // finalChatId가 여전히 문자열이면 에러
        if (typeof finalChatId === 'string' && finalChatId.startsWith('+')) {
          throw new Error(`Invalid chat_id format for channel ${channel.url}. Expected numeric chat_id, got: ${finalChatId}`);
        }
        
        console.log('[ChannelController] Using finalChatId (number):', finalChatId);
        
        // 이제 숫자 chat_id로 getChatMember 호출
        const member = await bot.telegram.getChatMember(finalChatId, userId);
        
        const isSubscribed = member.status !== 'left' && member.status !== 'kicked';
        
        console.log('[ChannelController] Channel', channel.url, 'subscribed:', isSubscribed, 'status:', member.status);

        channelResults.push({
          url: channel.url,
          title: channel.title,
          subscribed: isSubscribed,
          status: member.status
        });

        if (!isSubscribed) {
          allSubscribed = false;
        }
      } catch (error) {
        console.error('[ChannelController] Error checking channel:', channel.url, error);
        
        // 에러 발생 시 가입하지 않은 것으로 간주
        channelResults.push({
          url: channel.url,
          title: channel.title,
          subscribed: false,
          error: error.message
        });
        
        allSubscribed = false;
      }
    }

    console.log('[ChannelController] All subscribed:', allSubscribed);

    return res.json({
      success: true,
      allSubscribed,
      channels: channelResults,
      userId
    });

  } catch (error) {
    console.error('[ChannelController] Error checking channel subscription:', error);
    console.error('[ChannelController] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Server error while checking channel subscription'
    });
  }
};

/**
 * 필수 채널 목록 가져오기
 * 
 * GET /api/channel/required-channels
 */
exports.getRequiredChannels = async (req, res) => {
  try {
    // 데이터베이스에서 채널 목록 가져오기
    const channels = await getRequiredChannels();
    
    // 클라이언트에는 url과 title만 전송 (chatId는 서버에서만 사용)
    return res.json({
      success: true,
      channels: channels.map(ch => ({
        url: ch.url,
        title: ch.title || 'Channel'
      }))
    });
  } catch (error) {
    console.error('[ChannelController] Error getting required channels:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

