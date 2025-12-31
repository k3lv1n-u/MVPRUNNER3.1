// 보안 관련 미들웨어 - IP 및 기기정보 수집

const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

const getDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // 간단한 플랫폼 감지
  let platform = 'unknown';
  if (userAgent.includes('Windows')) platform = 'Windows';
  else if (userAgent.includes('Mac')) platform = 'Mac';
  else if (userAgent.includes('Linux')) platform = 'Linux';
  else if (userAgent.includes('Android')) platform = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';
  
  return {
    userAgent,
    platform,
    language: req.headers['accept-language']?.split(',')[0] || 'unknown'
  };
};

// 요청 정보를 req에 추가하는 미들웨어
const attachSecurityInfo = (req, res, next) => {
  req.clientIp = getClientIp(req);
  req.deviceInfo = getDeviceInfo(req);
  next();
};

module.exports = {
  attachSecurityInfo,
  getClientIp,
  getDeviceInfo
};

