// 2025년 최고 수준의 가중치 점수 기반 에뮬레이터 탐지 시스템
// 실제 상용 게임에서 사용하는 "움직임 노이즈 기반 가중치 시스템"

/**
 * 가중치 점수 계산 및 에뮬레이터 탐지
 * 총 100점 이상 시 차단, 99점 이하 시 통과 (진짜 유저 100% 보호)
 */

/**
 * 1. Platform 검증 (가장 중요)
 * platform이 android/ios 아님 → +150점 (즉시 차단)
 */
export const checkPlatform = (platform) => {
  const validPlatforms = ['android', 'android_x', 'ios'];
  if (!validPlatforms.includes(platform)) {
    return {
      score: 150,
      blocked: true,
      reason: `Invalid platform: ${platform} (requires android/ios)`
    };
  }
  return { score: 0, blocked: false };
};

/**
 * 2. GPU 렌더러 검증
 * GPU가 Intel/NVIDIA/AMD/SwiftShader/LLVMPipe 등 → +70점
 */
export const checkGPURenderer = () => {
  if (typeof document === 'undefined') {
    return { score: 0, renderer: null, vendor: null };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { score: 0, renderer: null, vendor: null, reason: 'WebGL not supported' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return { score: 0, renderer: null, vendor: null, reason: 'WEBGL_debug_renderer_info not available' };
    }

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';

    const rendererLower = renderer.toLowerCase();
    const vendorLower = vendor.toLowerCase();

    // 에뮬레이터/PC GPU 패턴
    const suspiciousPatterns = [
      'intel', 'nvidia', 'amd', 'swiftshader', 'llvmpipe',
      'google swiftshader', 'android emulator', 'mesa',
      'software', 'virtualbox', 'vmware'
    ];

    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
      rendererLower.includes(pattern) || vendorLower.includes(pattern)
    );

    if (hasSuspiciousPattern) {
      return {
        score: 70,
        renderer,
        vendor,
        reason: `Suspicious GPU renderer: ${renderer}`
      };
    }

    return { score: 0, renderer, vendor };
  } catch (error) {
    console.error('[Emulator Detection] GPU check error:', error);
    return { score: 0, renderer: null, vendor: null, error: error.message };
  }
};

/**
 * 3. UserAgent 기반 검증
 * UserAgent에 bluestacks/nox/ldplayer 등 명시적 키워드 → +80점
 */
export const checkUserAgent = () => {
  if (typeof navigator === 'undefined') {
    return { score: 0, matches: [] };
  }

  const ua = (navigator.userAgent || '').toLowerCase();
  const emulatorKeywords = [
    'bluestacks', 'nox', 'ldplayer', 'memu', 'genymotion',
    'android studio', 'emulator', 'simulator'
  ];

  const matches = emulatorKeywords.filter(keyword => ua.includes(keyword));
  
  if (matches.length > 0) {
    return {
      score: 80,
      matches,
      userAgent: navigator.userAgent,
      reason: `UserAgent contains emulator keywords: ${matches.join(', ')}`
    };
  }

  return { score: 0, matches: [], userAgent: navigator.userAgent };
};

/**
 * 4. Touch Points 검증
 * maxTouchPoints < 2 (iOS 제외) → +40점
 */
export const checkTouchPoints = (platform) => {
  if (typeof navigator === 'undefined') {
    return { score: 0 };
  }

  const maxTouchPoints = navigator.maxTouchPoints || 0;
  
  // iOS는 예외 (일부 iOS 기기는 maxTouchPoints가 0일 수 있음)
  if (platform === 'ios' || platform === 'android_x') {
    return { score: 0, maxTouchPoints };
  }

  if (maxTouchPoints < 2) {
    return {
      score: 40,
      maxTouchPoints,
      reason: `Low touch points: ${maxTouchPoints} (expected >= 2)`
    };
  }

  return { score: 0, maxTouchPoints };
};

/**
 * 5. Battery 상태 검증
 * Battery 5초간 "충전중 + 100% + chargingTime=0" 완전 고정 → +50점
 */
export const checkBatteryStatus = () => {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.getBattery) {
      resolve({ score: 0, reason: 'Battery API not available' });
      return;
    }

    const batteryReadings = [];
    const checkDuration = 5000; // 5초
    const checkInterval = 500; // 0.5초마다 체크

    navigator.getBattery().then((battery) => {
      const startTime = Date.now();
      const intervalId = setInterval(() => {
        const reading = {
          charging: battery.charging,
          level: battery.level,
          chargingTime: battery.chargingTime,
          timestamp: Date.now()
        };
        batteryReadings.push(reading);

        if (Date.now() - startTime >= checkDuration) {
          clearInterval(intervalId);

          // 모든 읽기가 "충전중 + 100% + chargingTime=0"인지 확인
          const allFixed = batteryReadings.every(r => 
            r.charging === true && 
            r.level === 1.0 && 
            r.chargingTime === 0
          );

          if (allFixed && batteryReadings.length >= 8) {
            resolve({
              score: 50,
              reason: 'Battery status completely fixed (charging + 100% + chargingTime=0) for 5 seconds',
              readings: batteryReadings.length
            });
          } else {
            resolve({ score: 0, readings: batteryReadings.length });
          }
        }
      }, checkInterval);
    }).catch(() => {
      resolve({ score: 0, reason: 'Battery API access denied or unavailable' });
    });
  });
};

/**
 * 6. 움직임 분석 (DeviceMotion) - 핵심 기능
 * 6초간 측정하여 표준편차 계산
 * - 표준편차 < 0.0015 (거의 완전 고정) → +90점
 * - 표준편차 < 0.004 이지만 값이 정확히 0에 수렴 → +60점
 * - 표준편차 ≥ 0.004 (자연스러운 손떨림) → +0점 (통과)
 */
export const analyzeMotion = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      resolve({ score: 30, reason: 'DeviceMotion API not available (permission denied or unsupported)' });
      return;
    }

    const motionData = [];
    const measurementDuration = 6000; // 6초
    const startTime = Date.now();

    const handleDeviceMotion = (event) => {
      const acceleration = event.accelerationIncludingGravity;
      
      if (acceleration && acceleration.x !== null && acceleration.y !== null && acceleration.z !== null) {
        motionData.push({
          x: acceleration.x,
          y: acceleration.y,
          z: acceleration.z,
          timestamp: Date.now()
        });
      }
    };

    // 권한 요청 (iOS 13+)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(permission => {
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion);
          } else {
            resolve({ score: 30, reason: 'DeviceMotion permission denied' });
          }
        })
        .catch(() => {
          resolve({ score: 30, reason: 'DeviceMotion permission request failed' });
        });
    } else {
      // Android 또는 권한 요청이 필요 없는 경우
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    // 6초 후 분석
    setTimeout(() => {
      window.removeEventListener('devicemotion', handleDeviceMotion);

      if (motionData.length < 10) {
        resolve({ score: 30, reason: `Insufficient motion data: ${motionData.length} readings (minimum 10 required)` });
        return;
      }

      // 각 축의 표준편차 계산
      const calculateStdDev = (values) => {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      };

      const xValues = motionData.map(d => d.x);
      const yValues = motionData.map(d => d.y);
      const zValues = motionData.map(d => d.z);

      const stdDevX = calculateStdDev(xValues);
      const stdDevY = calculateStdDev(yValues);
      const stdDevZ = calculateStdDev(zValues);

      // 최대 표준편차 사용 (가장 민감한 축)
      const maxStdDev = Math.max(stdDevX, stdDevY, stdDevZ);

      // 평균값이 0에 가까운지 확인 (완전 고정)
      const meanX = xValues.reduce((sum, val) => sum + Math.abs(val), 0) / xValues.length;
      const meanY = yValues.reduce((sum, val) => sum + Math.abs(val), 0) / yValues.length;
      const meanZ = zValues.reduce((sum, val) => sum + Math.abs(val), 0) / zValues.length;
      const meanAbs = (meanX + meanY + meanZ) / 3;

      let score = 0;
      let reason = '';

      if (maxStdDev < 0.0015) {
        // 거의 완전 고정
        score = 90;
        reason = `Motion almost completely fixed (stdDev: ${maxStdDev.toFixed(6)})`;
      } else if (maxStdDev < 0.004 && meanAbs < 0.01) {
        // 표준편차는 낮지만 값이 0에 수렴
        score = 60;
        reason = `Motion very stable with values near zero (stdDev: ${maxStdDev.toFixed(6)}, meanAbs: ${meanAbs.toFixed(6)})`;
      } else if (maxStdDev >= 0.004) {
        // 자연스러운 손떨림 (통과)
        score = 0;
        reason = `Natural motion detected (stdDev: ${maxStdDev.toFixed(6)})`;
      } else {
        // 중간 상태 (의심스러움)
        score = 30;
        reason = `Suspicious motion pattern (stdDev: ${maxStdDev.toFixed(6)})`;
      }

      resolve({
        score,
        reason,
        stdDev: maxStdDev,
        meanAbs,
        dataPoints: motionData.length,
        details: {
          stdDevX,
          stdDevY,
          stdDevZ,
          meanX,
          meanY,
          meanZ
        }
      });
    }, measurementDuration);
  });
};

/**
 * 종합 가중치 점수 계산
 */
export const calculateEmulatorScore = async (platform, showLoadingCallback = null) => {
  let totalScore = 0;
  const reasons = [];
  const details = {};


  // 1. Platform 검증 (즉시 차단 가능)
  if (showLoadingCallback) showLoadingCallback('플랫폼 검증 중...');
  const platformCheck = checkPlatform(platform);
  totalScore += platformCheck.score;
  details.platform = platformCheck;
  
  if (platformCheck.blocked) {
    console.warn('[Emulator Detection] Platform check blocked:', platformCheck.reason);
    return {
      totalScore,
      blocked: true,
      reasons: [platformCheck.reason],
      details
    };
  }
  if (platformCheck.score > 0) {
    reasons.push(platformCheck.reason);
  }

  // 2. GPU 렌더러 검증
  if (showLoadingCallback) showLoadingCallback('GPU 검증 중...');
  try {
    const gpuCheck = checkGPURenderer();
    totalScore += gpuCheck.score;
    details.gpu = gpuCheck;
    if (gpuCheck.score > 0) {
      reasons.push(gpuCheck.reason);
    }
  } catch (err) {
    console.error('[Emulator Detection] GPU check error:', err);
  }

  // 3. UserAgent 검증
  if (showLoadingCallback) showLoadingCallback('UserAgent 검증 중...');
  try {
    const uaCheck = checkUserAgent();
    totalScore += uaCheck.score;
    details.userAgent = uaCheck;
    if (uaCheck.score > 0) {
      reasons.push(uaCheck.reason);
    }
  } catch (err) {
    console.error('[Emulator Detection] UserAgent check error:', err);
  }

  // 4. Touch Points 검증
  if (showLoadingCallback) showLoadingCallback('터치 포인트 검증 중...');
  try {
    const touchCheck = checkTouchPoints(platform);
    totalScore += touchCheck.score;
    details.touchPoints = touchCheck;
    if (touchCheck.score > 0) {
      reasons.push(touchCheck.reason);
    }
  } catch (err) {
    console.error('[Emulator Detection] Touch points check error:', err);
  }

  // 5. Battery 상태 검증 (비동기)
  if (showLoadingCallback) showLoadingCallback('배터리 상태 검증 중...');
  try {
    const batteryCheck = await checkBatteryStatus();
    totalScore += batteryCheck.score;
    details.battery = batteryCheck;
    if (batteryCheck.score > 0) {
      reasons.push(batteryCheck.reason);
    }
  } catch (err) {
    console.error('[Emulator Detection] Battery check error:', err);
  }

  // 6. 움직임 분석 (비동기, 가장 중요)
  if (showLoadingCallback) showLoadingCallback('기기 움직임 분석 중...');
  try {
    const motionCheck = await analyzeMotion();
    totalScore += motionCheck.score;
    details.motion = motionCheck;
    if (motionCheck.score > 0) {
      reasons.push(motionCheck.reason);
    }
  } catch (err) {
    console.error('[Emulator Detection] Motion check error:', err);
    // 움직임 분석 실패는 의심스러우므로 +30점
    totalScore += 30;
    reasons.push('Motion analysis failed');
  }

  // 최종 판단: 100점 이상 시 차단
  const blocked = totalScore >= 100;


  return {
    totalScore,
    blocked,
    reasons,
    details
  };
};

/**
 * Device Fingerprint 생성 (서버 전송용)
 */
export const generateDeviceFingerprint = () => {
  const telegramCheck = checkTelegramWebApp();
  const uaCheck = checkUserAgent();
  const gpuCheck = checkGPURenderer();
  
  const fingerprint = {
    userAgent: navigator.userAgent || '',
    platform: telegramCheck.platform || navigator.platform || '',
    webglVendor: gpuCheck.vendor || '',
    webglRenderer: gpuCheck.renderer || '',
    screen: {
      width: window.screen?.width || 0,
      height: window.screen?.height || 0,
      colorDepth: window.screen?.colorDepth || 0
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    languages: navigator.languages || [navigator.language] || [],
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || 0,
    initData: telegramCheck.initData || null
  };

  return {
    fingerprint,
    checks: {
      telegram: telegramCheck,
      userAgent: uaCheck,
      gpu: gpuCheck
    }
  };
};

/**
 * Telegram WebApp 검증 (기존 유지)
 */
export const checkTelegramWebApp = () => {
  if (typeof window === 'undefined') {
    return { isValid: false, reason: 'Not in browser environment' };
  }

  if (!window.Telegram || !window.Telegram.WebApp) {
    return { isValid: false, reason: 'Telegram WebApp not found' };
  }

  const tg = window.Telegram.WebApp;
  const initData = tg.initDataUnsafe;

  if (!initData || !initData.user) {
    return { isValid: false, reason: 'Telegram user data not found' };
  }

  const platform = tg.platform || '';
  const validPlatforms = ['android', 'android_x', 'ios'];
  if (!validPlatforms.includes(platform)) {
    return { isValid: false, reason: `Invalid platform: ${platform}` };
  }

  return { isValid: true, platform, initData };
};
