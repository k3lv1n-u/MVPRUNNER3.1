const crypto = require('crypto');

/**
 * Telegram WebApp initData HMAC 검증
 * 
 * Telegram WebApp에서 전송된 initData의 무결성을 검증합니다.
 * 
 * @param {string} initData - Telegram WebApp에서 받은 initData 문자열
 * @param {string} botToken - 봇 토큰 (BotFather에서 발급)
 * @returns {boolean} - 검증 성공 여부
 * 
 * @example
 * const isValid = verifyInitData(initData, botToken);
 * if (!isValid) {
 *   return res.status(401).json({ error: 'Invalid initData' });
 * }
 */
function verifyInitData(initData, botToken) {
  try {
    if (!initData || !botToken) {
      console.error('[TelegramAuth] Missing initData or botToken');
      return false;
    }

    // initData 파싱: "key=value&key2=value2&hash=..."
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      console.error('[TelegramAuth] Hash not found in initData');
      return false;
    }

    // hash를 제외한 모든 파라미터를 정렬하여 문자열 생성
    urlParams.delete('hash');
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // HMAC-SHA256으로 해시 생성
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // 해시 비교
    const isValid = calculatedHash === hash;
    
    if (!isValid) {
      console.error('[TelegramAuth] Hash mismatch');
      console.error('[TelegramAuth] Expected:', calculatedHash);
      console.error('[TelegramAuth] Received:', hash);
    }

    return isValid;
  } catch (error) {
    console.error('[TelegramAuth] Error verifying initData:', error);
    return false;
  }
}

/**
 * initData에서 user 정보 추출
 * 
 * @param {string} initData - Telegram WebApp에서 받은 initData 문자열
 * @returns {Object|null} - user 객체 또는 null
 */
function extractUserFromInitData(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    
    if (!userStr) {
      return null;
    }

    return JSON.parse(decodeURIComponent(userStr));
  } catch (error) {
    console.error('[TelegramAuth] Error extracting user from initData:', error);
    return null;
  }
}

module.exports = {
  verifyInitData,
  extractUserFromInitData
};


