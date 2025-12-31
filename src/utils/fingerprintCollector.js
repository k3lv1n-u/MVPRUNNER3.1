// Fingerprint 데이터 수집 유틸리티 (서버 전송용)
// 클라이언트에서는 데이터만 수집하고, 검증은 서버에서 수행

/**
 * 배터리 상태 수집 (5초간)
 */
export const collectBatteryData = () => {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.getBattery) {
      resolve({ available: false });
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
          resolve({
            available: true,
            readings: batteryReadings
          });
        }
      }, checkInterval);
    }).catch(() => {
      resolve({ available: false });
    });
  });
};

/**
 * 움직임 데이터 수집 (6초간)
 */
export const collectMotionData = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      resolve({ available: false, reason: 'DeviceMotion API not available' });
      return;
    }

    const motionData = [];
    const measurementDuration = 6000; // 6초

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
            resolve({ available: false, reason: 'DeviceMotion permission denied', dataPoints: 0 });
          }
        })
        .catch(() => {
          resolve({ available: false, reason: 'DeviceMotion permission request failed', dataPoints: 0 });
        });
    } else {
      // Android 또는 권한 요청이 필요 없는 경우
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    // 6초 후 데이터 반환
    setTimeout(() => {
      window.removeEventListener('devicemotion', handleDeviceMotion);

      resolve({
        available: motionData.length >= 10,
        dataPoints: motionData.length,
        data: motionData,
        reason: motionData.length < 10 ? `Insufficient motion data: ${motionData.length} readings (minimum 10 required)` : null
      });
    }, measurementDuration);
  });
};

/**
 * 전체 Fingerprint 수집 (서버 전송용)
 */
export const collectFullFingerprint = async (onProgress = null) => {
  const fingerprint = {
    // 기본 정보
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    platform: '',
    webglVendor: '',
    webglRenderer: '',
    screen: {
      width: typeof window !== 'undefined' ? (window.screen?.width || 0) : 0,
      height: typeof window !== 'undefined' ? (window.screen?.height || 0) : 0,
      colorDepth: typeof window !== 'undefined' ? (window.screen?.colorDepth || 0) : 0
    },
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
    languages: typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language] || []) : [],
    maxTouchPoints: typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0,
    hardwareConcurrency: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 0) : 0,
    deviceMemory: typeof navigator !== 'undefined' ? (navigator.deviceMemory || 0) : 0,
    initData: null
  };

  // Telegram WebApp 정보
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    const initData = tg.initDataUnsafe;
    fingerprint.platform = tg.platform || '';
    fingerprint.initData = initData || null;
  } else {
    // 플랫폼 추정
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android')) {
        fingerprint.platform = 'android';
      } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
        fingerprint.platform = 'ios';
      } else {
        fingerprint.platform = 'unknown';
      }
    } else {
      fingerprint.platform = 'unknown';
    }
  }

  // WebGL 정보 수집
  if (onProgress) onProgress('Проверка безопасности...');
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          fingerprint.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
          fingerprint.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        } else {
          console.warn('[Fingerprint] WEBGL_debug_renderer_info extension not available');
        }
      } else {
        console.warn('[Fingerprint] WebGL context not available');
      }
    } catch (error) {
      console.error('[Fingerprint] WebGL check error:', error);
    }
  } else {
    console.warn('[Fingerprint] Document not available for WebGL check');
  }

  // 배터리 데이터 수집
  if (onProgress) onProgress('Проверка безопасности...');
  fingerprint.battery = await collectBatteryData();

  // 움직임 데이터 수집
  if (onProgress) onProgress('Проверка безопасности...');
  fingerprint.motion = await collectMotionData();

  return fingerprint;
};

