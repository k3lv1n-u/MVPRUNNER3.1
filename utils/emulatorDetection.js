// 서버 측 에뮬레이터 탐지 로직
// 가중치 점수 기반 검증 시스템

/**
 * 1. Platform 검증
 * platform이 android/ios 아님 → +150점 (즉시 차단)
 */
function checkPlatform(platform) {
  const validPlatforms = ['android', 'android_x', 'ios'];
  if (!validPlatforms.includes(platform)) {
    return {
      score: 150,
      blocked: true,
      reason: `Invalid platform: ${platform} (requires android/ios)`
    };
  }
  return { score: 0, blocked: false };
}

/**
 * 2. GPU 렌더러 검증
 * GPU가 Intel/NVIDIA/AMD/SwiftShader/LLVMPipe 등 → +70점
 */
function checkGPURenderer(renderer, vendor) {
  console.log('[GPU Check] Input - Renderer:', renderer, 'Vendor:', vendor);

  if (!renderer) {
    console.log('[GPU Check] No renderer provided');
    return { score: 0, reason: 'GPU renderer information not available' };
  }

  const rendererLower = renderer.toLowerCase();
  const vendorLower = (vendor || '').toLowerCase();

  // 실제 모바일 GPU는 제외 (Qualcomm, ARM, Mali, PowerVR, Imagination 등)
  const mobileGPUs = [
    'qualcomm', 'adreno', 'arm', 'mali', 'powervr', 
    'imagination', 'apple', 'apple gpu', 'apple g13'
  ];
  
  // 모바일 GPU면 즉시 통과
  const isMobileGPU = mobileGPUs.some(gpu => 
    rendererLower.includes(gpu) || vendorLower.includes(gpu)
  );
  
  if (isMobileGPU) {
    console.log('[GPU Check] Mobile GPU detected (Qualcomm/ARM/Mali/Apple), passing');
    return { score: 0 };
  }

  // PC GPU 및 에뮬레이터 GPU 패턴
  const suspiciousPatterns = [
    'intel', 'nvidia', 'amd', 'swiftshader', 'llvmpipe',
    'google swiftshader', 'android emulator', 'mesa',
    'software', 'virtualbox', 'vmware', 'radeon',
    'geforce', 'rtx', 'gtx', 'iris', 'uhd graphics'
  ];

  console.log('[GPU Check] Checking patterns against renderer:', rendererLower, 'and vendor:', vendorLower);

  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => {
    const match = rendererLower.includes(pattern) || vendorLower.includes(pattern);
    if (match) {
      console.log('[GPU Check] Suspicious pattern matched:', pattern);
    }
    return match;
  });

  if (hasSuspiciousPattern) {
    console.log('[GPU Check] Suspicious GPU detected, score: 70');
    return {
      score: 70,
      reason: `Suspicious GPU renderer: ${renderer}`
    };
  }

  console.log('[GPU Check] GPU check passed, score: 0');
  return { score: 0 };
}

/**
 * 3. UserAgent 기반 검증
 * UserAgent에 bluestacks/nox/ldplayer 등 명시적 키워드 → +80점
 */
function checkUserAgent(userAgent) {
  if (!userAgent) {
    return { score: 0, matches: [] };
  }

  const ua = userAgent.toLowerCase();
  const emulatorKeywords = [
    'bluestacks', 'nox', 'ldplayer', 'memu', 'genymotion',
    'android studio', 'emulator', 'simulator'
  ];

  const matches = emulatorKeywords.filter(keyword => ua.includes(keyword));
  
  if (matches.length > 0) {
    return {
      score: 80,
      matches,
      reason: `UserAgent contains emulator keywords: ${matches.join(', ')}`
    };
  }

  return { score: 0, matches: [] };
}

/**
 * 4. Touch Points 검증
 * maxTouchPoints < 2 (iOS 제외) → +40점
 */
function checkTouchPoints(platform, maxTouchPoints) {
  const touchPoints = maxTouchPoints || 0;
  
  // iOS는 예외
  if (platform === 'ios' || platform === 'android_x') {
    return { score: 0, maxTouchPoints: touchPoints };
  }

  if (touchPoints < 2) {
    return {
      score: 40,
      maxTouchPoints: touchPoints,
      reason: `Low touch points: ${touchPoints} (expected >= 2)`
    };
  }

  return { score: 0, maxTouchPoints: touchPoints };
}

/**
 * 5. Battery 상태 검증
 * Battery 5초간 "충전중 + 100% + chargingTime=0" 완전 고정 → +50점
 */
function checkBatteryStatus(batteryData) {
  console.log('[Battery Check] Input data:', {
    hasData: !!batteryData,
    available: batteryData?.available,
    readingsCount: batteryData?.readings?.length || 0
  });

  if (!batteryData) {
    console.log('[Battery Check] No battery data provided');
    return { score: 0, reason: 'Battery data not available' };
  }

  if (!batteryData.available) {
    console.log('[Battery Check] Battery API not available');
    return { score: 0, reason: 'Battery API not available' };
  }

  if (!batteryData.readings || batteryData.readings.length < 8) {
    console.log('[Battery Check] Insufficient readings:', batteryData.readings?.length || 0);
    return { score: 0, reason: `Insufficient battery readings: ${batteryData.readings?.length || 0} (minimum 8 required)` };
  }

  console.log('[Battery Check] Analyzing', batteryData.readings.length, 'readings');
  console.log('[Battery Check] First reading sample:', JSON.stringify(batteryData.readings[0], null, 2));

  // 배터리 상태가 완전히 고정되어 있는지 확인
  // 에뮬레이터 특징: level이 1.0으로 완전 고정, chargingTime이 0 또는 null/Infinity
  let allLevelsFixed = true;
  let allChargingTimesAbnormal = true;
  
  batteryData.readings.forEach((r, index) => {
    // 필드명 통일 (한글/영문 혼용 대응)
    const level = r.level !== undefined ? r.level : (r.레벨 !== undefined ? r.레벨 : 0);
    const chargingTime = r.chargingTime !== undefined ? r.chargingTime : 
      (r.charging시간 !== undefined ? r.charging시간 : 
      (r.chargingtime !== undefined ? r.chargingtime : 
      (r.charging_time !== undefined ? r.charging_time : null)));
    
    // level이 1.0으로 완전 고정되어 있는지 확인
    const isLevelFixed = level === 1.0 || level === 1;
    if (!isLevelFixed) {
      allLevelsFixed = false;
      console.log(`[Battery Check] Reading ${index} level not fixed:`, level);
    }
    
    // chargingTime이 비정상적인 값인지 확인 (0, null, Infinity, NaN, undefined)
    const isChargingTimeAbnormal = chargingTime === 0 || chargingTime === null || 
      chargingTime === Infinity || isNaN(chargingTime) || chargingTime === undefined;
    if (!isChargingTimeAbnormal) {
      allChargingTimesAbnormal = false;
      console.log(`[Battery Check] Reading ${index} chargingTime normal:`, chargingTime);
    }
  });

  console.log('[Battery Check] All levels fixed (1.0):', allLevelsFixed);
  console.log('[Battery Check] All chargingTimes abnormal:', allChargingTimesAbnormal);

  // level이 1.0으로 완전 고정되어 있고, chargingTime이 비정상적이면 에뮬레이터 의심
  if (allLevelsFixed && allChargingTimesAbnormal) {
    console.log('[Battery Check] Battery status completely fixed - adding 50 points');
    return {
      score: 50,
      reason: 'Battery status completely fixed (level=100% with abnormal chargingTime) for 5 seconds',
      readings: batteryData.readings.length
    };
  }

  console.log('[Battery Check] Battery check passed, score: 0');
  return { score: 0, readings: batteryData.readings.length };
}

/**
 * 6. 움직임 분석
 * 표준편차 < 0.0015 (거의 완전 고정) → +90점
 * 표준편차 < 0.004 이지만 값이 정확히 0에 수렴 → +60점
 * 표준편차 ≥ 0.004 (자연스러운 손떨림) → +0점 (통과)
 */
function analyzeMotion(motionData) {
  if (!motionData || !motionData.available || !motionData.data || motionData.data.length < 10) {
    return {
      score: 30,
      reason: motionData?.reason || 'Insufficient motion data or permission denied'
    };
  }

  const data = motionData.data;

  // 각 축의 표준편차 계산
  const calculateStdDev = (values) => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  const zValues = data.map(d => d.z);

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

  return {
    score,
    reason,
    stdDev: maxStdDev,
    meanAbs,
    dataPoints: data.length
  };
}

/**
 * 종합 가중치 점수 계산 (서버 측)
 */
function calculateEmulatorScore(fingerprint) {
  console.log('[Emulator Detection] ===== Starting score calculation =====');
  console.log('[Emulator Detection] Fingerprint keys:', Object.keys(fingerprint));
  console.log('[Emulator Detection] Full fingerprint:', JSON.stringify(fingerprint, null, 2));
  
  let totalScore = 0;
  const reasons = [];
  const details = {};

  const platform = fingerprint.platform || '';
  console.log('[Emulator Detection] Platform:', platform);

  // 1. Platform 검증 (즉시 차단 가능)
  console.log('[Emulator Detection] Step 1: Platform check');
  const platformCheck = checkPlatform(platform);
  totalScore += platformCheck.score;
  details.platform = platformCheck;
  console.log('[Emulator Detection] Platform check score:', platformCheck.score, 'Total:', totalScore);
  
  if (platformCheck.blocked) {
    console.log('[Emulator Detection] Platform check blocked, returning early');
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
  console.log('[Emulator Detection] GPU check - Renderer:', fingerprint.webglRenderer, 'Vendor:', fingerprint.webglVendor);
  const gpuCheck = checkGPURenderer(fingerprint.webglRenderer, fingerprint.webglVendor);
  totalScore += gpuCheck.score;
  details.gpu = gpuCheck;
  console.log('[Emulator Detection] GPU check score:', gpuCheck.score);
  if (gpuCheck.score > 0) {
    reasons.push(gpuCheck.reason);
  }

  // 3. UserAgent 검증
  console.log('[Emulator Detection] Step 3: UserAgent check');
  const uaCheck = checkUserAgent(fingerprint.userAgent);
  totalScore += uaCheck.score;
  details.userAgent = uaCheck;
  console.log('[Emulator Detection] UserAgent check score:', uaCheck.score, 'Total:', totalScore);
  if (uaCheck.score > 0) {
    reasons.push(uaCheck.reason);
  }

  // 4. Touch Points 검증
  console.log('[Emulator Detection] Step 4: Touch Points check');
  const touchCheck = checkTouchPoints(platform, fingerprint.maxTouchPoints);
  totalScore += touchCheck.score;
  details.touchPoints = touchCheck;
  console.log('[Emulator Detection] Touch Points check score:', touchCheck.score, 'Total:', totalScore);
  if (touchCheck.score > 0) {
    reasons.push(touchCheck.reason);
  }

  // 5. Battery 상태 검증
  console.log('[Emulator Detection] Battery check - Data:', fingerprint.battery ? {
    available: fingerprint.battery.available,
    readingsCount: fingerprint.battery.readings?.length || 0
  } : 'No battery data');
  if (fingerprint.battery) {
    const batteryCheck = checkBatteryStatus(fingerprint.battery);
    totalScore += batteryCheck.score;
    details.battery = batteryCheck;
    console.log('[Emulator Detection] Battery check score:', batteryCheck.score);
    if (batteryCheck.score > 0) {
      reasons.push(batteryCheck.reason);
    }
  } else {
    console.warn('[Emulator Detection] Battery data not provided');
  }

  // 6. 움직임 분석
  console.log('[Emulator Detection] Step 6: Motion analysis');
  console.log('[Emulator Detection] Motion check - Data:', fingerprint.motion ? {
    available: fingerprint.motion.available,
    dataPoints: fingerprint.motion.dataPoints || 0,
    reason: fingerprint.motion.reason
  } : 'No motion data');
  if (fingerprint.motion && fingerprint.motion.available && fingerprint.motion.data && fingerprint.motion.data.length >= 10) {
    const motionCheck = analyzeMotion(fingerprint.motion);
    totalScore += motionCheck.score;
    details.motion = motionCheck;
    console.log('[Emulator Detection] Motion check score:', motionCheck.score, 'Total:', totalScore);
    if (motionCheck.score > 0) {
      reasons.push(motionCheck.reason);
    }
  } else {
    // 움직임 데이터가 없거나 부족하면 의심스러움
    // 배터리도 의심스러우면 더 높은 점수 부여
    const batterySuspicious = details.battery && details.battery.score > 0;
    const motionScore = batterySuspicious ? 60 : 50; // 배터리도 의심스러우면 60점, 아니면 50점
    
    console.warn('[Emulator Detection] Motion data not available, adding', motionScore, 'points');
    totalScore += motionScore;
    const motionReason = fingerprint.motion?.reason || 'Motion data not available or insufficient';
    reasons.push(motionReason);
    details.motion = { score: motionScore, reason: motionReason };
    console.log('[Emulator Detection] Total after motion penalty:', totalScore);
  }

  // 최종 판단: 100점 이상 시 차단
  const blocked = totalScore >= 100;

  console.log('[Emulator Detection] ===== Final Result =====');
  console.log('[Emulator Detection] Total Score:', totalScore);
  console.log('[Emulator Detection] Blocked:', blocked);
  console.log('[Emulator Detection] Reasons:', reasons);
  console.log('[Emulator Detection] Details:', JSON.stringify(details, null, 2));

  return {
    totalScore,
    blocked,
    reasons,
    details
  };
}

module.exports = {
  calculateEmulatorScore
};

