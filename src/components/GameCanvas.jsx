import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import './GameCanvas.css';
import soundManager from '../utils/soundManager';

const GameCanvas = ({
  gameRunning,
  gameReady,
  onScoreUpdate,
  onGameOver,
  onGameBegin,
  onBountyCollected,
  isGamePlaying,
  isPCWebEnvironment = false,
  inventory = [],
  telegramId,
  onInventoryUpdate,
  isLandscape = true
}) => {
  const canvasRef = useRef(null);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const canvasDisplaySizeRef = useRef({ width: 0, height: 0 });
  const [wrapperStyle, setWrapperStyle] = useState({});
  const [currentScore, setCurrentScore] = useState(0);
  const [currentCoins, setCurrentCoins] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [speedReductionActive, setSpeedReductionActive] = useState(false);
  const [speedReductionEndTime, setSpeedReductionEndTime] = useState(0);
  const [bootImagesLoaded, setBootImagesLoaded] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldImagesLoaded, setShieldImagesLoaded] = useState(false);
  const [magicSyringeActive, setMagicSyringeActive] = useState(false);
  const [magicSyringeEndTime, setMagicSyringeEndTime] = useState(0);
  const [magicSyringeImagesLoaded, setMagicSyringeImagesLoaded] = useState(false);
  const [moneyBoostActive, setMoneyBoostActive] = useState(false);
  const [moneyBoostEndTime, setMoneyBoostEndTime] = useState(0);
  const [moneyBoostImagesLoaded, setMoneyBoostImagesLoaded] = useState(false);
  // UI 업데이트 주기 제어 (React 상태 업데이트/콜백 빈도 줄이기)
  const lastUiUpdateRef = useRef(0);
  const UI_UPDATE_INTERVAL_MS = 150;
  // 프레임 독립적 게임을 위한 시간 추적
  const lastFrameTimeRef = useRef(null);
  const MAX_DELTA_TIME = 1000 / 60; // 최대 델타 타임 (60fps 기준, 약 16.67ms)
  const gameStateRef = useRef({
    score: 0,
    gameSpeed: 5,
    gameStartTime: 0,
    speedIncreaseTimer: 0, // 시간 기반으로 변경 (밀리초 단위)
    animationFrameId: null,
    gameLoopRunning: false,
    speedReductionActive: false,
    speedReductionEndTime: 0,
    shieldActive: false,
    magicSyringeActive: false,
    magicSyringeEndTime: 0,
    moneyBoostActive: false,
    moneyBoostEndTime: 0,
    spriteLoaded: false,
    idleLoaded: false,
    jumpLoaded: false,
    obstacleLoaded: false,
    coinLoaded: false,
    runningFramesLoaded: false,
    jumpFramesLoaded: false,
    obstacleAspectRatio: 1,
    coinAspectRatio: 1,
    spriteConfig: {
      frameWidth: 560,
      frameHeight: 560,
      totalFrames: 11,
      currentFrame: 0,
      frameCounter: 0,
      displayWidth: 70, // Reverted to original 70px
      displayHeight: 70 // Reverted to original 70px
    },
    runningFrames: null, // JSON에서 로드된 달리기 프레임 데이터
    jumpFrames: null, // JSON에서 로드된 점프 프레임 데이터
    runningFrameIndex: 0, // 달리기 애니메이션 전용 프레임 인덱스
    runningFrameTime: 0, // 달리기 애니메이션 시간 누적 (밀리초 단위)
    jumpFrameIndex: 0, // 점프 애니메이션 전용 프레임 인덱스
    jumpFrameTime: 0, // 점프 애니메이션 시간 누적 (밀리초 단위)
    jumpStartTime: 0, // 점프 시작 시간 (점프 애니메이션 한 번 재생용)
    dino: {
      x: 50,
      y: 250,
      width: 70, // Reverted to original 70px
      height: 70, // Reverted to original 70px
      velocityY: 0,
      gravity: 0.8,
      jumpPower: -15,
      onGround: true
    },
    obstacles: [],
    obstacleTimer: 0, // 시간 기반으로 변경 (밀리초 단위)
    nextObstacleDelay: 1000, // 60프레임 = 약 1000ms (60fps 기준)
    bounties: [],
    bountyTimer: 0, // 시간 기반으로 변경 (밀리초 단위)
    nextBountyDelay: 0, // 시간 기반으로 변경 (밀리초 단위)
    bountiesCollected: 0,
    pendingBounties: 0,
    gameOverTriggered: false,
    gyrocop: {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      visible: false,
      startTime: 0,
      duration: 10000
    },
    gyrocopLoaded: false
  });

  const characterSpriteRef = useRef(new Image());
  const idleSpriteRef = useRef(new Image());
  const jumpSpriteRef = useRef(new Image());
  const obstacleSpriteRef = useRef(new Image());
  const coinSpriteRef = useRef(new Image());
  const gyrocopSpriteRef = useRef(new Image());
  const bootNormalRef = useRef(new Image());
  const bootActiveRef = useRef(new Image());
  const shieldInactiveRef = useRef(new Image());
  const shieldActiveRef = useRef(new Image());


  const obstacleBaseWidth = 40; // Reverted to original 40px
  const coinBaseWidth = 30; // Reverted to original 30px

  // 이미지 로드 상태 확인
  const checkImagesLoaded = useCallback(() => {
    const state = gameStateRef.current;
    const loadedCount = [
      state.spriteLoaded,
      state.idleLoaded,
      state.jumpLoaded,
      state.obstacleLoaded,
      state.coinLoaded,
      state.runningFramesLoaded,
      state.jumpFramesLoaded,
      state.gyrocopLoaded // 광고 이미지 포함
    ].filter(Boolean).length;

    const progress = (loadedCount / 8) * 100; // 8개 이미지 (광고 이미지 포함)
    setLoadingProgress(progress);

    if (loadedCount === 8) {
      setImagesLoaded(true);
    }
  }, []);

  // 이미지 로드
  useEffect(() => {
    const characterSprite = characterSpriteRef.current;
    const idleSprite = idleSpriteRef.current;
    const jumpSprite = jumpSpriteRef.current;
    const obstacleSprite = obstacleSpriteRef.current;
    const coinSprite = coinSpriteRef.current;

    setImagesLoaded(false);
    setLoadingProgress(0);
    gameStateRef.current.spriteLoaded = false;
    gameStateRef.current.idleLoaded = false;
    gameStateRef.current.jumpLoaded = false;
    gameStateRef.current.obstacleLoaded = false;
    gameStateRef.current.coinLoaded = false;
    gameStateRef.current.runningFramesLoaded = false;
    gameStateRef.current.jumpFramesLoaded = false;
    gameStateRef.current.gyrocopLoaded = false; // 광고 이미지 로드 상태 초기화

    const loadImageWithProgress = (sprite, imageName, onLoadCallback) => {
      if (sprite.complete && sprite.naturalHeight !== 0) {
        onLoadCallback();
        checkImagesLoaded();
      } else {
        sprite.onload = () => {
          onLoadCallback();
          checkImagesLoaded();
        };
        sprite.onerror = () => {
          console.error(`${imageName} 이미지를 로드할 수 없습니다.`);
          onLoadCallback();
          checkImagesLoaded();
        };
        if (!sprite.src || sprite.src === window.location.href) {
          sprite.src = `/${imageName}.png`;
        }
      }
    };

    // JSON 프레임 데이터 로드
    fetch('/running.json')
      .then(response => response.json())
      .then(data => {
        gameStateRef.current.runningFrames = data;
        gameStateRef.current.spriteConfig.totalFrames = data.length;

        // JSON 데이터 저장 (originalX/originalY는 렌더링에 사용하지 않음)
        // x, y, width, height만 drawImage 소스 영역 지정에 사용
        // 기준 프레임 크기는 논리적 캐릭터 크기(dino.width)를 기준으로 함

        gameStateRef.current.runningFramesLoaded = true;
        checkImagesLoaded();
      })
      .catch(error => {
        console.error('Failed to load running.json:', error);
        gameStateRef.current.runningFramesLoaded = true; // 에러가 있어도 진행
        checkImagesLoaded();
      });

    fetch('/jumpjson.json')
      .then(response => response.json())
      .then(data => {
        gameStateRef.current.jumpFrames = data;

        // JSON 데이터 저장 (originalX/originalY는 렌더링에 사용하지 않음)
        // x, y, width, height만 drawImage 소스 영역 지정에 사용
        // 기준 프레임 크기는 논리적 캐릭터 크기(dino.width)를 기준으로 함

        gameStateRef.current.jumpFramesLoaded = true;
        checkImagesLoaded();
      })
      .catch(error => {
        console.error('Failed to load jumpjson.json:', error);
        gameStateRef.current.jumpFramesLoaded = true; // 에러가 있어도 진행
        checkImagesLoaded();
      });

    loadImageWithProgress(characterSprite, 'running', () => {
      gameStateRef.current.spriteLoaded = true;
    });

    loadImageWithProgress(idleSprite, 'idle', () => {
      gameStateRef.current.idleLoaded = true;
    });

    loadImageWithProgress(jumpSprite, 'jump1', () => {
      gameStateRef.current.jumpLoaded = true;
    });

    loadImageWithProgress(obstacleSprite, 'obstacle', () => {
      gameStateRef.current.obstacleLoaded = true;
      if (obstacleSprite.naturalWidth > 0 && obstacleSprite.naturalHeight !== 0) {
        gameStateRef.current.obstacleAspectRatio = obstacleSprite.naturalWidth / obstacleSprite.naturalHeight;
      }
    });

    loadImageWithProgress(coinSprite, 'coin', () => {
      gameStateRef.current.coinLoaded = true;
      if (coinSprite.naturalWidth > 0 && coinSprite.naturalHeight !== 0) {
        gameStateRef.current.coinAspectRatio = coinSprite.naturalWidth / coinSprite.naturalHeight;
      }
    });

    // 광고 이미지 동적 로드 (데이터베이스에서) - 로딩 화면에서 미리 로드
    const loadAdImage = async () => {
      try {
        const api = (await import('../services/api')).default;
        const adImageInfo = await api.getAdImage();
        const gyrocopSprite = gyrocopSpriteRef.current;
        
        gyrocopSprite.onload = () => {
          gameStateRef.current.gyrocopLoaded = true;
          checkImagesLoaded(); // 이미지 로드 완료 시 체크
        };
        gyrocopSprite.onerror = () => {
          console.error('광고 이미지를 로드할 수 없습니다. 기본 이미지로 대체합니다.');
          // 기본 이미지로 대체
          gyrocopSprite.src = '/gyrocop.png';
        };
        
        // 데이터베이스에 이미지 데이터가 있으면 API 엔드포인트 사용, 없으면 경로 사용
        if (adImageInfo.hasImageData) {
          // Base64 데이터를 이미지로 반환하는 API 엔드포인트 사용
          // 캐시 방지를 위해 버전 쿼리 파라미터 추가 (updatedAt 기반)
          const version = adImageInfo.version || Date.now();
          gyrocopSprite.src = `/api/game-config/ad-image/data?v=${version}`;
        } else {
          // 하위 호환성: 경로 사용 (캐시 방지)
          const version = adImageInfo.version || Date.now();
          gyrocopSprite.src = `${adImageInfo.adImagePath || '/gyrocop.png'}?v=${version}`;
        }
      } catch (error) {
        console.error('광고 이미지 경로를 가져오는데 실패했습니다. 기본 이미지를 사용합니다.', error);
        const gyrocopSprite = gyrocopSpriteRef.current;
        gyrocopSprite.onload = () => {
          gameStateRef.current.gyrocopLoaded = true;
          checkImagesLoaded(); // 이미지 로드 완료 시 체크
        };
        gyrocopSprite.onerror = () => {
          console.error('기본 광고 이미지를 로드할 수 없습니다.');
          gameStateRef.current.gyrocopLoaded = false;
          checkImagesLoaded(); // 에러 발생 시에도 체크 (진행 허용)
        };
        gyrocopSprite.src = '/gyrocop.png';
      }
    };
    
    // 광고 이미지를 다른 이미지들과 함께 로드
    loadAdImage();

    const bootNormal = bootNormalRef.current;
    const bootActive = bootActiveRef.current;

    bootNormal.onload = () => {};
    bootNormal.onerror = () => {
      console.error('[GameCanvas] Failed to load boot normal image');
    };
    bootNormal.src = '/boot1.png';

    bootActive.onload = () => {
      setBootImagesLoaded(true);
    };
    bootActive.onerror = () => {
      console.error('[GameCanvas] Failed to load boot active image');
    };
    bootActive.src = '/boot1skillingame.png';

    const shieldInactive = shieldInactiveRef.current;
    const shieldActive = shieldActiveRef.current;

    shieldInactive.onload = () => {};
    shieldInactive.onerror = () => {
      console.error('[GameCanvas] Failed to load shield inactive image');
    };
    shieldInactive.src = '/shield_inactive.png';

    shieldActive.onload = () => {
      setShieldImagesLoaded(true);
    };
    shieldActive.onerror = () => {
      console.error('[GameCanvas] Failed to load shield active image');
    };
    shieldActive.src = '/shield_active.png';

    // 매직 주사기 이미지 로드 (비활성/활성 상태)
    let inactiveLoaded = false;
    let activeLoaded = false;

    const checkMagicSyringeImages = () => {
      if (inactiveLoaded && activeLoaded) {
        setMagicSyringeImagesLoaded(true);
      } else if (inactiveLoaded || activeLoaded) {
        // 최소한 하나라도 로드되면 UI 표시
        setMagicSyringeImagesLoaded(true);
      }
    };

    const magicSyringeInactive = new Image();
    magicSyringeInactive.onload = () => {
      inactiveLoaded = true;
      checkMagicSyringeImages();
    };
    magicSyringeInactive.onerror = () => {
      console.error('[GameCanvas] Failed to load magic syringe inactive image: /shprizpng.png');
      inactiveLoaded = true; // 에러가 나도 체크는 완료로 처리
      checkMagicSyringeImages();
    };
    magicSyringeInactive.src = '/shprizpng.png';

    const magicSyringeActive = new Image();
    magicSyringeActive.onload = () => {
      activeLoaded = true;
      checkMagicSyringeImages();
    };
    magicSyringeActive.onerror = () => {
      console.error('[GameCanvas] Failed to load magic syringe active image: /shpriz.png');
      activeLoaded = true; // 에러가 나도 체크는 완료로 처리
      checkMagicSyringeImages();
    };
    magicSyringeActive.src = '/shpriz.png';

    // 코인 부스트 이미지 로드 (비활성/활성 상태)
    let moneyBoostInactiveLoaded = false;
    let moneyBoostActiveLoaded = false;

    const checkMoneyBoostImages = () => {
      if (moneyBoostInactiveLoaded && moneyBoostActiveLoaded) {
        setMoneyBoostImagesLoaded(true);
      } else if (moneyBoostInactiveLoaded || moneyBoostActiveLoaded) {
        // 최소한 하나라도 로드되면 UI 표시
        setMoneyBoostImagesLoaded(true);
      }
    };

    const moneyBoostInactive = new Image();
    moneyBoostInactive.onload = () => {
      moneyBoostInactiveLoaded = true;
      checkMoneyBoostImages();
    };
    moneyBoostInactive.onerror = () => {
      console.error('[GameCanvas] Failed to load money boost inactive image: /moneypng.png');
      moneyBoostInactiveLoaded = true;
      checkMoneyBoostImages();
    };
    moneyBoostInactive.src = '/moneypng.png';

    const moneyBoostActiveImg = new Image();
    moneyBoostActiveImg.onload = () => {
      moneyBoostActiveLoaded = true;
      checkMoneyBoostImages();
    };
    moneyBoostActiveImg.onerror = () => {
      console.error('[GameCanvas] Failed to load money boost active image: /money.png');
      moneyBoostActiveLoaded = true;
      checkMoneyBoostImages();
    };
    moneyBoostActiveImg.src = '/money.png';
  }, [checkImagesLoaded]);

  // 캔버스 크기 조정 - High DPI (Retina) Support
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isPCWeb = typeof window !== 'undefined' &&
      (navigator.maxTouchPoints === 0 ||
        (window.innerWidth >= 768 && window.matchMedia('(pointer: fine)').matches));

    // Get Device Pixel Ratio
    const dpr = window.devicePixelRatio || 1;

    let displayWidth, displayHeight;

    if (isGamePlaying) {
      if (isPCWeb) {
        displayWidth = 932;
        displayHeight = 430;
      } else {
        // 모바일: canvas 논리적 크기는 항상 가로 모드 기준으로 유지
        // (CSS로 세로 모드에서 축소 표시)
        const viewportWidth = window.visualViewport?.width || window.innerWidth;
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const isLandscapeMode = viewportWidth > viewportHeight;
        
        if (isLandscapeMode) {
          // 가로 모드: 전체 화면 사용
          displayWidth = viewportWidth;
          displayHeight = viewportHeight;
        } else {
          // 세로 모드: canvas 논리적 크기는 가로 모드 기준으로 유지
          // 세로 모드의 높이 = 가로 모드의 너비
          // 세로 모드의 너비 = 가로 모드의 높이
          displayWidth = viewportHeight; // 가로 모드 너비
          displayHeight = viewportWidth;  // 가로 모드 높이
        }
      }
    } else {
      if (isPCWeb) {
        displayWidth = 430;
        displayHeight = 932;
      } else {
        displayWidth = window.visualViewport?.width || window.innerWidth;
        displayHeight = window.visualViewport?.height || window.innerHeight;
      }
    }

    // 이전 canvas 크기 저장 (게임 실행 중일 때 오브젝트 위치 조정에 사용)
    const state = gameStateRef.current;
    const wasGameRunning = gameRunning && state.gameLoopRunning;
    const oldWidth = canvas.width / dpr;
    const oldHeight = canvas.height / dpr;

    // Set actual canvas size (scaled by DPR)
    canvas.width = Math.floor(displayWidth * dpr);
    canvas.height = Math.floor(displayHeight * dpr);

    // Set CSS display size
    canvas.style.width = `${Math.floor(displayWidth)}px`;
    canvas.style.height = `${Math.floor(displayHeight)}px`;
    
    // canvas 논리적 크기 저장 (wrapper 스타일 계산용)
    canvasDisplaySizeRef.current = { width: displayWidth, height: displayHeight };

    // Scale context to match DPR
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false;

    // Update dino position based on logical (CSS) height
    state.dino.y = displayHeight - 50 - state.dino.height;

    state.dino.width = state.spriteConfig.displayWidth;
    state.dino.height = state.spriteConfig.displayHeight;

    // 게임이 실행 중이고 화면 크기가 변경된 경우 (회전 등)
    if (wasGameRunning && (oldWidth !== displayWidth || oldHeight !== displayHeight)) {
      // 화면 밖으로 나간 장애물 제거
      state.obstacles = state.obstacles.filter(obstacle => {
        // 장애물이 화면 밖으로 나갔거나, 새로운 canvas 크기 기준으로 위치가 이상한 경우 제거
        return obstacle.x + obstacle.width >= 0 && obstacle.x <= displayWidth;
      });

      // 화면 밖으로 나간 코인 제거
      state.bounties = state.bounties.filter(bounty => {
        // 코인이 화면 밖으로 나갔거나, 새로운 canvas 크기 기준으로 위치가 이상한 경우 제거
        return bounty.x + bounty.width >= 0 && bounty.x <= displayWidth &&
               bounty.y + bounty.height >= 0 && bounty.y <= displayHeight;
      });

      // 캐릭터가 화면 밖으로 나간 경우 위치 재조정
      if (state.dino.x < 0) {
        state.dino.x = 50; // 기본 x 위치
      }
      if (state.dino.x + state.dino.width > displayWidth) {
        state.dino.x = displayWidth - state.dino.width - 50;
      }
      if (state.dino.y < 0) {
        state.dino.y = displayHeight - 50 - state.dino.height;
      }
      if (state.dino.y + state.dino.height > displayHeight) {
        state.dino.y = displayHeight - 50 - state.dino.height;
      }
    }
  }, [isGamePlaying, gameRunning]);

  useEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  // 화면 크기 변경 감지
  useEffect(() => {
    const isPCWeb = typeof window !== 'undefined' &&
      (navigator.maxTouchPoints === 0 ||
        (window.innerWidth >= 768 && window.matchMedia('(pointer: fine)').matches));

    if (isPCWeb && isGamePlaying) {
      return;
    }

    const handleResize = () => {
      resizeCanvas();
    };

    const handleOrientationChange = () => {
      // 화면 회전 시 canvas 크기 재조정 (약간의 지연을 두어 크기가 안정화될 때까지 대기)
      setTimeout(() => {
        resizeCanvas();
        // 세로 모드일 때 wrapper 스타일 업데이트
        if (!isLandscape && isGamePlaying && !isPCWebEnvironment) {
          // updateWrapperStyle은 useEffect에서 호출됨
        }
      }, 100);
    };

    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        resizeCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, [isGamePlaying, isLandscape, isPCWebEnvironment, resizeCanvas]);

  // 배경 그리기 (Obsidian Minimalism: Pure black with faint static stars)
  const drawBackground = (ctx, canvas) => {
    // Logical size (CSS pixels)
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Pure obsidian black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height - 50);

    // Static faint white star specks
    ctx.fillStyle = '#ffffff';
    const starCount = 80;

    for (let i = 0; i < starCount; i++) {
      const seed = i * 7919;
      const baseX = (seed % width);
      const baseY = ((seed * 7) % (height - 50));

      const sizeSeed = (seed * 13) % 100;
      const size = 0.5 + (sizeSeed / 100) * 0.5;

      const opacitySeed = (seed * 17) % 100;
      const opacity = 0.15 + (opacitySeed / 100) * 0.25;

      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(baseX, baseY, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  };

  const drawGround = (ctx, canvas) => {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const groundHeight = 50;

    // Flat style ground
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, height - groundHeight, width, groundHeight);

    // Thin 1px dark gray border - Subpixel perfect
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Align to 0.5 for crisp 1px lines
    const lineY = Math.floor(height - groundHeight) + 0.5;
    ctx.moveTo(0, lineY);
    ctx.lineTo(width, lineY);
    ctx.stroke();
  };

  const drawDino = (ctx, canvas, deltaTime = 0) => {
    const state = gameStateRef.current;
    const dino = state.dino;

    // Integer alignment for crisp edges
    let x = Math.floor(dino.x);
    let y = Math.floor(dino.y);
    const w = Math.floor(dino.width);
    const h = Math.floor(dino.height);

    // Safety check for Y position (only for truly invalid values like NaN or Infinity)
    if (isNaN(y) || !isFinite(y)) {
      const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
      y = Math.floor(logicalHeight - 50 - h);
      // Update state to prevent future issues
      dino.y = y;
    }

    // 스프라이트 스케일 상수 (각 프레임의 실제 크기를 유지하면서 조정)
    const scale = 0.35;

    // 발 위치 고정점 (dino.width/height는 충돌 감지용 히트박스)
    // baseX: 발의 x 좌표 (캐릭터 중앙)
    // baseY: 발의 y 좌표 (캐릭터 하단)
    const baseX = x + w / 2;
    let baseY = y + h;

    if (!dino.onGround) {
      // 점프 애니메이션 (점프 시간 동안 한 번만 재생)
      if (state.jumpLoaded && state.jumpFrames && jumpSpriteRef.current.complete && jumpSpriteRef.current.naturalHeight !== 0) {
        // 점프 시작 시간이 없으면 현재 시간으로 설정
        if (state.jumpStartTime === 0) {
          state.jumpStartTime = Date.now();
        }
        
        // 점프 물리 계산: 최고점까지의 시간
        const framesToApex = Math.abs(state.dino.jumpPower / state.dino.gravity);
        const totalJumpFrames = framesToApex * 2; // 상승 + 하강
        const totalJumpTime = totalJumpFrames * 16.67; // 밀리초 (60fps 가정)
        
        // 점프 경과 시간
        const jumpElapsed = Date.now() - state.jumpStartTime;
        const jumpProgress = Math.min(jumpElapsed / totalJumpTime, 1.0); // 0.0 ~ 1.0
        
        // 점프 진행도에 따라 프레임 인덱스 계산 (점프 시간 동안 모든 프레임 한 번 재생)
        const totalFrames = state.jumpFrames.length;
        const frameIndex = Math.min(
          Math.floor(jumpProgress * totalFrames),
          totalFrames - 1
        );
        
        const jumpFrame = state.jumpFrames[frameIndex];
        if (jumpFrame) {
          // 각 프레임의 실제 크기 사용
          const frameWidth = jumpFrame.width * scale;
          const frameHeight = jumpFrame.height * scale;

          // 발 위치(baseX, baseY) 기준으로 하단 중앙 정렬
          // Center the sprite horizontally on the hit box
          const renderX = baseX - (frameWidth / 2);
          // Align bottom of sprite to bottom of hit box
          const renderY = baseY - frameHeight;

          // 픽셀 스프라이트 선명도 유지: 모든 좌표 정수화
          ctx.drawImage(
            jumpSpriteRef.current,
            jumpFrame.x, jumpFrame.y,  // JSON의 x, y: 소스 영역 지정에만 사용
            jumpFrame.width, jumpFrame.height,  // JSON의 width, height: 소스 영역 지정에만 사용
            Math.floor(renderX), Math.floor(renderY),
            Math.floor(frameWidth), Math.floor(frameHeight)
          );
          
          // 프레임 인덱스 업데이트 (점프 진행도 기반)
          state.jumpFrameIndex = frameIndex;
        } else {
          ctx.fillStyle = '#333';
          ctx.fillRect(x, y, w, h);
        }
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, w, h);
      }
    } else {
      if (gameRunning) {
        // 달리기 애니메이션
        if (state.spriteLoaded && state.runningFrames && characterSpriteRef.current.complete && characterSpriteRef.current.naturalHeight !== 0) {
          const runningFrame = state.runningFrames[state.runningFrameIndex % state.runningFrames.length];
          if (runningFrame) {
            // 각 프레임의 실제 크기 사용
            const frameWidth = runningFrame.width * scale;
            const frameHeight = runningFrame.height * scale;

            // 발 위치(baseX, baseY) 기준으로 하단 중앙 정렬
            // Center the sprite horizontally on the hit box
            const renderX = baseX - (frameWidth / 2);
            // Align bottom of sprite to bottom of hit box
            const renderY = baseY - frameHeight;

            // 픽셀 스프라이트 선명도 유지: 모든 좌표 정수화
            ctx.drawImage(
              characterSpriteRef.current,
              runningFrame.x, runningFrame.y,  // JSON의 x, y: 소스 영역 지정에만 사용
              runningFrame.width, runningFrame.height,  // JSON의 width, height: 소스 영역 지정에만 사용
              Math.floor(renderX), Math.floor(renderY),
              Math.floor(frameWidth), Math.floor(frameHeight)
            );

            const speedMultiplier = state.speedReductionActive ? 0.7 : (state.magicSyringeActive ? 1.5 : 1.0);
            const effectiveGameSpeed = state.gameSpeed * speedMultiplier;
            // 프레임 독립적 애니메이션: 게임 속도에 따라 애니메이션 속도 조절 (밀리초 단위)
            // 기본 프레임 딜레이: 50ms (60fps 기준 약 3프레임)
            const dynamicFrameDelayMs = Math.max(16.67, 50 / effectiveGameSpeed);

            state.runningFrameTime += deltaTime;
            if (state.runningFrameTime >= dynamicFrameDelayMs) {
              state.runningFrameTime = 0;
              state.runningFrameIndex = (state.runningFrameIndex + 1) % state.runningFrames.length;
            }
          } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, w, h);
          }
        } else {
          ctx.fillStyle = '#333';
          ctx.fillRect(x, y, w, h);
        }
      } else {
        // Idle state: Try idle image first, then fallback to first running frame
        if (state.idleLoaded && idleSpriteRef.current.complete && idleSpriteRef.current.naturalHeight !== 0) {
          // Idle image also uses bottom-center anchor
          const baseWidth = w;
          const baseHeight = h;
          const idleWidth = idleSpriteRef.current.naturalWidth || baseWidth;
          const idleHeight = idleSpriteRef.current.naturalHeight || baseHeight;
          const idleScale = baseWidth / idleWidth;
          const destW = idleWidth * idleScale;
          const destH = idleHeight * idleScale;
          const destX = x + (baseWidth - destW) / 2;
          const destY = y + (baseHeight - destH);
          ctx.drawImage(
            idleSpriteRef.current,
            Math.round(destX), Math.round(destY), Math.round(destW), Math.round(destH)
          );
        } else if (state.spriteLoaded && state.runningFrames && characterSpriteRef.current.complete && characterSpriteRef.current.naturalHeight !== 0) {
          // Fallback to first frame of running sprite
          const firstFrame = state.runningFrames[0];
          if (firstFrame) {
            // 각 프레임의 실제 크기 사용
            const frameWidth = firstFrame.width * scale;
            const frameHeight = firstFrame.height * scale;

            // 첫 프레임 기준으로 오프셋 계산 (자기 자신이므로 0)
            const referenceFrame = state.runningFrames[0];
            if (referenceFrame) {
              const offsetX = (firstFrame.originalX - referenceFrame.originalX) * scale;
              const offsetY = (firstFrame.originalY - referenceFrame.originalY) * scale;

              // 발 위치 기준으로 렌더링 위치 계산
              const renderX = baseX - offsetX;
              const renderY = baseY - frameHeight + offsetY;

              // 픽셀 스프라이트 선명도 유지: 모든 좌표 정수화
              ctx.drawImage(
                characterSpriteRef.current,
                firstFrame.x, firstFrame.y,  // JSON의 x, y: 소스 영역 지정에만 사용
                firstFrame.width, firstFrame.height,  // JSON의 width, height: 소스 영역 지정에만 사용
                Math.round(renderX), Math.round(renderY),
                Math.round(frameWidth), Math.round(frameHeight)
              );
            }
          } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, w, h);
          }
        } else {
          ctx.fillStyle = '#333';
          ctx.fillRect(x, y, w, h);
        }
      }
    }
  };

  const drawObstacles = (ctx) => {
    const state = gameStateRef.current;
    state.obstacles.forEach(obstacle => {
      // Integer alignment
      const x = Math.floor(obstacle.x);
      const y = Math.floor(obstacle.y);
      const w = Math.floor(obstacle.width);
      const h = Math.floor(obstacle.height);

      if (state.obstacleLoaded && obstacleSpriteRef.current.complete && obstacleSpriteRef.current.naturalHeight !== 0) {
        ctx.drawImage(obstacleSpriteRef.current, x, y, w, h);
      } else {
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, w, h);
      }
    });
  };

  const drawBounties = (ctx) => {
    const state = gameStateRef.current;
    state.bounties.forEach(bounty => {
      // Integer alignment
      const x = Math.floor(bounty.x);
      const y = Math.floor(bounty.y);
      const w = Math.floor(bounty.width);
      const h = Math.floor(bounty.height);

      if (state.coinLoaded && coinSpriteRef.current.complete && coinSpriteRef.current.naturalHeight !== 0) {
        ctx.drawImage(coinSpriteRef.current, x, y, w, h);
      } else {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  const drawUI = (ctx) => {
    // UI는 HTML로 표시
  };

  const drawGyrocop = (ctx, canvas) => {
    const state = gameStateRef.current;
    const gyrocop = state.gyrocop;

    if (!gyrocop.visible) return;

    // Integer alignment
    const x = Math.floor(gyrocop.x);
    const y = Math.floor(gyrocop.y);
    const w = Math.floor(gyrocop.width);
    const h = Math.floor(gyrocop.height);

    if (state.gyrocopLoaded && gyrocopSpriteRef.current.complete && gyrocopSpriteRef.current.naturalHeight !== 0) {
      const aspectRatio = gyrocopSpriteRef.current.naturalWidth / gyrocopSpriteRef.current.naturalHeight;
      const displayWidth = gyrocop.width;
      const displayHeight = gyrocop.width / aspectRatio;

      // Re-calculate integer dimensions
      const finalW = Math.floor(displayWidth);
      const finalH = Math.floor(displayHeight);

      ctx.drawImage(gyrocopSpriteRef.current, x, y, finalW, finalH);
    } else {
      ctx.fillStyle = '#9b59b6';
      ctx.fillRect(x, y, w, h);
    }
  };

  const updateGyrocop = (canvas) => {
    const state = gameStateRef.current;
    const gyrocop = state.gyrocop;

    if (!gyrocop.visible) return;

    const currentTime = Date.now();
    const elapsed = currentTime - gyrocop.startTime;

    // 10초가 지나면 사라짐
    if (elapsed >= gyrocop.duration) {
      gyrocop.visible = false;
      return;
    }

    // 왼쪽에서 오른쪽으로 이동 (10초 동안) - x축만 업데이트
    const progress = elapsed / gyrocop.duration; // 0 ~ 1
    const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
    gyrocop.x = -gyrocop.width + (logicalWidth + gyrocop.width) * progress;

    // y 위치는 게임 시작 시 한 번만 설정되고 이후로는 고정됨
    // (캐릭터와 분리되어 독립적으로 이동)
  };

  const updateDino = (logicalHeight, frameMultiplier = 1, deltaTime = 0) => {
    const state = gameStateRef.current;
    const dino = state.dino;
    if (!dino.onGround) {
      // 프레임 독립적 중력 및 이동: 프레임이 느려지거나 멈춰도 게임 속도가 일정하게 유지됨
      dino.velocityY += dino.gravity * frameMultiplier;
      dino.y += dino.velocityY * frameMultiplier;

      const groundY = logicalHeight - 50 - dino.height;
      if (dino.y >= groundY) {
        const wasInAir = !dino.onGround;
        dino.y = groundY;
        dino.velocityY = 0;
        dino.onGround = true;
        // 땅에 착지 시 달리기 애니메이션 프레임 초기화 및 점프 시작 시간 리셋
          if (wasInAir) {
          state.jumpStartTime = 0; // 점프 시작 시간 리셋
          if (state.runningFrames) {
            state.runningFrameIndex = 0;
            state.runningFrameTime = 0; // 시간 기반으로 변경
          }
        }
      }
    }
  };

  const updateObstacles = (logicalWidth, logicalHeight, frameMultiplier = 1, deltaTime = 0) => {
    const state = gameStateRef.current;

    // 게임 오버 상태면 더 이상 업데이트하지 않음
    if (state.gameOverTriggered) {
      return;
    }

    // 게임이 실행 중일 때만 장애물 생성 및 업데이트
    if (!gameRunning) return;

    // 델타 타임 기반 타이머 업데이트 (프레임 독립적)
    state.obstacleTimer += deltaTime;

    if (state.obstacleTimer >= state.nextObstacleDelay) {
      const obstacleWidth = obstacleBaseWidth;
      const obstacleHeight = obstacleBaseWidth / state.obstacleAspectRatio;

      // 땅 위에 장애물 생성 (캔버스 높이 확인)
      const groundY = logicalHeight - 50 - obstacleHeight;
      const newObstacleX = logicalWidth;

      // 기존 장애물과 겹치지 않는지 확인
      // 게임 속도에 비례하여 최소 간격을 동적으로 조정
      // 속도가 빠를수록 더 큰 간격이 필요 (장애물이 빠르게 이동하므로)
      const speedBasedMinDistance = obstacleWidth * 2 + (state.gameSpeed * 15) + 80;
      // 점수가 높아질수록 최소 간격을 더 보장 (난이도가 높아도 안전성 유지)
      const scoreBasedMinDistance = state.score > 500 ? speedBasedMinDistance + 50 : speedBasedMinDistance;
      const minDistance = Math.max(speedBasedMinDistance, scoreBasedMinDistance);

      let canSpawn = true;
      let closestObstacleDistance = Infinity;

      for (let obstacle of state.obstacles) {
        const distance = newObstacleX - (obstacle.x + obstacle.width);
        // 화면에 보이는 장애물만 확인 (화면 밖 장애물은 무시)
        if (obstacle.x + obstacle.width > 0) {
          closestObstacleDistance = Math.min(closestObstacleDistance, distance);
          // 새 장애물이 기존 장애물과 너무 가까우면 생성하지 않음
          if (distance < minDistance && distance > -obstacleWidth) {
            canSpawn = false;
            break;
          }
        }
      }

      if (canSpawn) {
        state.obstacles.push({
          x: newObstacleX,
          y: Math.max(0, groundY), // 음수 방지
          width: obstacleWidth,
          height: obstacleHeight
        });

        // 난이도에 따른 동적 간격 계산
        // 점수가 높을수록, 게임 속도가 빠를수록 간격이 줄어듦
        const scoreFactor = Math.max(0, Math.min(1, state.score / 1000)); // 점수 1000점 기준 정규화
        const speedFactor = Math.max(0, Math.min(1, (state.gameSpeed - 5) / 10)); // 속도 5~15 기준 정규화

        // 기본 간격: 초기 2000ms (120프레임 기준), 최소 간격은 게임 속도에 비례하여 증가
        // 속도가 빠를수록 더 많은 시간이 필요 (장애물이 빠르게 이동하므로)
        const minDelayMs = Math.max(500, 416 + (state.gameSpeed - 5) * 50); // 속도에 비례한 최소 간격 (밀리초)
        const baseDelayMs = Math.max(minDelayMs, 2000 - (scoreFactor * 1000 + speedFactor * 583)); // 120프레임 = 2000ms

        // 랜덤 변동: 초기 ±833ms (50프레임), 난이도가 높아질수록 ±500ms (30프레임)까지 감소
        // 하지만 점수가 높아도 최소 랜덤 변동은 유지
        const randomRangeMs = Math.max(500, 833 - (scoreFactor * 166 + speedFactor * 166));
        const randomVariation = (Math.random() - 0.5) * 2 * randomRangeMs; // -randomRangeMs ~ +randomRangeMs

        // 계산된 간격이 최소 간격보다 작으면 최소 간격 사용
        const calculatedDelay = baseDelayMs + randomVariation;
        state.nextObstacleDelay = Math.max(minDelayMs, calculatedDelay);
        state.obstacleTimer = 0;
      } else {
        // 겹치는 경우 최소 간격을 보장하여 다음 시도
        // 가장 가까운 장애물까지의 거리를 고려하여 적절한 지연 시간 계산 (밀리초)
        const requiredTimeMs = Math.ceil(((minDistance - closestObstacleDistance) / state.gameSpeed) * (1000 / 60));
        state.nextObstacleDelay = Math.max(83, requiredTimeMs); // 최소 83ms (5프레임)
        state.obstacleTimer = 0;
      }
    }

    // 역순으로 순회하여 splice 시 인덱스 문제 방지
    // 속도 효과 적용 (속도 저하 또는 매직 주사기)
    const effectiveSpeed = state.speedReductionActive
      ? state.gameSpeed * 0.7
      : (state.magicSyringeActive ? state.gameSpeed * 1.5 : state.gameSpeed);

    // 디버깅용 속도 로그 제거됨

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const obstacle = state.obstacles[i];
      // 프레임 독립적 이동: 프레임이 느려지거나 멈춰도 게임 속도가 일정하게 유지됨
      obstacle.x -= effectiveSpeed * frameMultiplier;

      const dino = state.dino;
      // 충돌 감지 (이미지의 90% 영역 사용)
      const hitboxScale = 0.9; // 90% hitbox

      // 캐릭터 hitbox (중심 기준 90%)
      const dinoHitboxWidth = dino.width * hitboxScale;
      const dinoHitboxHeight = dino.height * hitboxScale;
      const dinoHitboxX = dino.x + (dino.width - dinoHitboxWidth) / 2;
      const dinoHitboxY = dino.y + (dino.height - dinoHitboxHeight) / 2;

      // 장애물 hitbox (중심 기준 90%)
      const obstacleHitboxWidth = obstacle.width * hitboxScale;
      const obstacleHitboxHeight = obstacle.height * hitboxScale;
      const obstacleHitboxX = obstacle.x + (obstacle.width - obstacleHitboxWidth) / 2;
      const obstacleHitboxY = obstacle.y + (obstacle.height - obstacleHitboxHeight) / 2;

      // 90% hitbox로 충돌 감지
      if (
        dinoHitboxX < obstacleHitboxX + obstacleHitboxWidth &&
        dinoHitboxX + dinoHitboxWidth > obstacleHitboxX &&
        dinoHitboxY < obstacleHitboxY + obstacleHitboxHeight &&
        dinoHitboxY + dinoHitboxHeight > obstacleHitboxY
      ) {
        // 충돌 발생!
        // 매직 주사기가 활성화되어 있으면 무시 (무적 상태)
        if (state.magicSyringeActive) {
          continue; // 다음 장애물 체크
        }

        // 방패가 활성화되어 있으면 방패 소모하고 게임 계속
        if (state.shieldActive) {
          // 방패 비활성화 (gameStateRef만 업데이트)
          state.shieldActive = false;

          // React state 업데이트
          setShieldActive(false);

          // 장애물 제거 (충돌한 장애물은 사라짐)
          state.obstacles.splice(i, 1);

          // 사운드 효과
          try {
            soundManager.playJump(); // 임시로 점프 사운드 사용
          } catch (e) {
            console.error('[GameCanvas] Error playing shield sound:', e);
          }

          continue; // 다음 장애물 체크
        }

        // 방패가 활성화되지 않았으면 게임 오버
        if (!state.gameOverTriggered) {
          state.gameOverTriggered = true;

          // 게임 루프 중지
          if (state.animationFrameId !== null) {
            cancelAnimationFrame(state.animationFrameId);
            state.animationFrameId = null;
          }
          state.gameLoopRunning = false;

          // 사운드
          try {
            soundManager.stopBackgroundMusic();
            soundManager.playGameOver();
          } catch (e) {
            console.error('[GameCanvas] Error playing game over sound:', e);
          }

          // 게임 오버 콜백 호출
          try {
            onGameOver(state.score, state.bountiesCollected);
          } catch (e) {
            console.error('[GameCanvas] Error in onGameOver callback:', e);
          }
        }

        // 충돌 후 장애물 제거하고 루프 종료
        state.obstacles.splice(i, 1);
        break;
      }

      // 화면 밖으로 나간 장애물 제거 및 점수 추가
      if (obstacle.x + obstacle.width < 0) {
        state.obstacles.splice(i, 1);
        state.score += 10;
      }
    }

    // 델타 타임 기반 속도 증가 타이머 (프레임 독립적)
    // 60프레임 = 약 1000ms마다 속도 증가
    state.speedIncreaseTimer += deltaTime;
    if (state.speedIncreaseTimer >= 1000) {
      state.gameSpeed += 0.2;
      state.speedIncreaseTimer = 0;
    }
  };

  const updateBounties = (logicalWidth, logicalHeight, frameMultiplier = 1, deltaTime = 0) => {
    const state = gameStateRef.current;

    // 게임 오버 상태면 더 이상 업데이트하지 않음
    if (state.gameOverTriggered) {
      return;
    }

    // 게임이 실행 중일 때만 버운티 생성 및 업데이트
    if (!gameRunning) return;

    // 델타 타임 기반 타이머 업데이트 (프레임 독립적)
    state.bountyTimer += deltaTime;

    if (state.bountyTimer >= state.nextBountyDelay) {
      const bountyWidth = coinBaseWidth;
      const bountyHeight = coinBaseWidth / state.coinAspectRatio;

      const groundY = logicalHeight - 50 - bountyHeight;
      const minY = groundY;
      const heightRange = Math.min(150, logicalHeight * 0.35); // 높이 범위를 조금 높게
      const maxY = groundY - heightRange;
      const randomY = minY - Math.random() * (minY - maxY);

      const newBountyX = logicalWidth;
      let canSpawn = true;

      for (let obstacle of state.obstacles) {
        const distance = Math.abs(obstacle.x - newBountyX);
        if (distance < 100) {
          canSpawn = false;
          break;
        }
      }

      if (canSpawn) {
        state.bounties.push({
          x: newBountyX,
          y: randomY,
          width: bountyWidth,
          height: bountyHeight
        });

        // 랜덤 지연: 833ms ~ 1667ms (50~100프레임)
        state.nextBountyDelay = Math.random() * 833 + 833;
        state.bountyTimer = 0;
      } else {
        // 겹치는 경우 약간의 지연 후 재시도 (167ms = 10프레임)
        state.bountyTimer = state.nextBountyDelay - 167;
      }
    }

    // 역순으로 순회하여 splice 시 인덱스 문제 방지
    // 속도 효과 적용 (속도 저하 또는 매직 주사기)
    const effectiveSpeed = state.speedReductionActive
      ? state.gameSpeed * 0.7
      : (state.magicSyringeActive ? state.gameSpeed * 1.5 : state.gameSpeed);

    for (let i = state.bounties.length - 1; i >= 0; i--) {
      const bounty = state.bounties[i];
      // 프레임 독립적 이동: 프레임이 느려지거나 멈춰도 게임 속도가 일정하게 유지됨
      bounty.x -= effectiveSpeed * frameMultiplier;

      const dino = state.dino;
      // 충돌 감지 (버운티 수집, 이미지의 90% 영역 사용)
      // 90% hitbox로 충돌 감지
      if (
        dino.x < bounty.x + bounty.width &&
        dino.x + dino.width > bounty.x &&
        dino.y < bounty.y + bounty.height &&
        dino.y + dino.height > bounty.y
      ) {
        // 버운티 획득!
        // 코인 부스트 효과 적용 (10배 증가)
        const coinMultiplier = state.moneyBoostActive ? 10 : 1;
        state.bountiesCollected += coinMultiplier;
        state.pendingBounties += coinMultiplier;

        // 사운드 재생
        try {
          soundManager.playCoin();
        } catch (e) {
          console.error('[GameCanvas] Error playing coin sound:', e);
        }

        state.bounties.splice(i, 1);
        continue; // 이미 제거했으므로 다음으로
      }

      // 화면 밖으로 나간 버운티 제거 (점수 없음)
      if (bounty.x + bounty.width < 0) {
        state.bounties.splice(i, 1);
      }
    }
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const state = gameStateRef.current;

    // 게임이 준비되지 않았으면 루프 중지
    if (!gameReady && !gameRunning) {
      state.gameLoopRunning = false;
      lastFrameTimeRef.current = null;
      if (state.animationFrameId !== null) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }
      return;
    }

    // 델타 타임 계산 (프레임 독립적 게임을 위해)
    // 화면 녹화 시 낮은 프레임률에서도 게임이 정상적으로 작동하도록 함
    const now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
    
    let deltaTime = 0;
    if (lastFrameTimeRef.current !== null) {
      deltaTime = now - lastFrameTimeRef.current;
      
      // 음수 또는 0인 경우 처리 (시스템 시간 변경 등)
      if (deltaTime <= 0) {
        deltaTime = MAX_DELTA_TIME;
      }
      
      // 화면 녹화로 인한 매우 낮은 프레임률(예: 10-15fps)을 지원하기 위해
      // 델타 타임 제한을 더 크게 설정 (최대 20프레임 분량, 약 333ms)
      // 이렇게 하면 3fps까지도 게임이 정상적으로 작동함
      const MAX_ALLOWED_DELTA = MAX_DELTA_TIME * 20; // 약 333ms
      if (deltaTime > MAX_ALLOWED_DELTA) {
        // 프레임이 너무 오래 멈춘 경우(예: 탭 전환 후 복귀)에만 제한
        deltaTime = MAX_ALLOWED_DELTA;
      }
    } else {
      // 첫 프레임
      deltaTime = MAX_DELTA_TIME;
    }
    lastFrameTimeRef.current = now;

    if ((gameReady || gameRunning) && imagesLoaded) {
      // Disable image smoothing for sharp pixel art rendering
      ctx.imageSmoothingEnabled = false;

      // Clear with logical dimensions (context is already scaled)
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, width, height);

      drawBackground(ctx, canvas);
      drawGround(ctx, canvas);
      drawDino(ctx, canvas, deltaTime);
      drawGyrocop(ctx, canvas);
      drawObstacles(ctx);
      drawBounties(ctx);
      drawUI(ctx);

      // 점수 / 버운티 UI 및 상위 콜백은 일정 주기로만 업데이트하여 성능 최적화
      if (now - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL_MS) {
        lastUiUpdateRef.current = now;

        // Ref에 먼저 저장
        scoreRef.current = state.score;
        coinsRef.current = state.bountiesCollected;

        // UI 업데이트 (90ms마다 한 번만)
        setCurrentScore(scoreRef.current);
        setCurrentCoins(coinsRef.current);

        if (typeof onScoreUpdate === 'function') {
          onScoreUpdate(scoreRef.current);
        }

        // 누적된 버운티 개수를 한 번에 상위로 전달
        if (state.pendingBounties > 0 && typeof onBountyCollected === 'function') {
          onBountyCollected(state.pendingBounties);
          state.pendingBounties = 0;
        }
      }

      if (gameReady && !gameRunning) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 0, 255, 0.8)';
        ctx.fillText('Click to Start!', width / 2, height / 2);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
      }

      if (gameRunning) {
        // 델타 타임을 프레임 비율로 변환 (60fps 기준, 약 16.67ms)
        // 화면 녹화로 인한 낮은 프레임률(예: 10-30fps)에서도 정상 작동
        const frameMultiplier = deltaTime / MAX_DELTA_TIME;
        
        // 프레임이 너무 느리거나 멈춘 경우에도 게임이 정상적으로 진행되도록 함
        // 최소값을 0.5로 설정하여 매우 낮은 프레임률에서도 게임이 너무 느려지지 않도록 함
        // 최대값을 20으로 설정하여 화면 녹화 중 낮은 프레임률을 지원
        const clampedMultiplier = Math.min(Math.max(frameMultiplier, 0.5), 20);
        
        updateDino(height, clampedMultiplier, deltaTime);
        updateGyrocop(canvas); // gyrocop already updated to use logical width inside
        updateObstacles(width, height, clampedMultiplier, deltaTime);
        updateBounties(width, height, clampedMultiplier, deltaTime);
      }
    }

    // 게임이 계속 실행 중이고 이미지가 로드되었으며 게임 오버가 아닐 때만 다음 프레임 요청
    if ((gameReady || gameRunning) && imagesLoaded && !state.gameOverTriggered) {
      state.animationFrameId = requestAnimationFrame(gameLoop);
    } else {
      state.gameLoopRunning = false;
      if (state.animationFrameId !== null) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }
    }
  }, [gameReady, gameRunning, onScoreUpdate, onGameOver, imagesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 게임이 실제로 시작될 때 배경음악 재생
  useEffect(() => {
    if (gameRunning && imagesLoaded) {
      // 게임이 실행 중이고 이미지가 로드되었을 때 배경음악 재생
      // 첫 플레이 시 배경음악이 확실히 재생되도록 여러 번 시도
      const tryPlayMusic = () => {
        soundManager.playBackgroundMusic();
      };
      
      // 즉시 재생 시도
      tryPlayMusic();
      
      // 오디오가 준비될 때까지 재시도 (최대 3번)
      let retryCount = 0;
      const maxRetries = 3;
      const retryInterval = setInterval(() => {
        if (!gameRunning || !imagesLoaded) {
          clearInterval(retryInterval);
          return;
        }
        
        retryCount++;
        tryPlayMusic();
        
        if (retryCount >= maxRetries) {
          clearInterval(retryInterval);
        }
      }, 200);
      
      // cleanup 함수
      return () => {
        clearInterval(retryInterval);
      };
    } else if (!gameRunning) {
      // 게임이 중지되면 배경음악 정지
      soundManager.stopBackgroundMusic();
    }
  }, [gameRunning, imagesLoaded]);

  // 화면 녹화/캡처 시 낮은 프레임률에서도 게임이 정상 작동하도록 처리
  // 화면 녹화는 visibilitychange를 트리거하지 않지만, 프레임률을 낮춤
  // 델타 타임 기반 업데이트로 낮은 프레임률(10-30fps)에서도 게임 속도가 일정하게 유지됨
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 화면이 숨겨진 경우(예: 다른 앱으로 전환)
        // 게임은 계속 실행되지만, 다음 프레임에서 큰 델타 타임이 발생할 수 있음
        // 델타 타임 제한(MAX_DELTA_TIME * 20)으로 인해 게임이 갑자기 빨라지지 않음
      } else {
        // 화면이 다시 보이면 마지막 프레임 시간을 현재 시간으로 업데이트하여
        // 큰 델타 타임으로 인한 게임 속도 급증 방지
        if (lastFrameTimeRef.current !== null) {
          const now = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();
          lastFrameTimeRef.current = now;
        }

        // 앱이 포그라운드로 돌아올 때 canvas 크기 재조정
        // (화면 회전이 백그라운드에서 발생했을 수 있음)
        setTimeout(() => {
          resizeCanvas();
        }, 100); // orientationchange 이벤트 후 크기가 안정화될 때까지 대기
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resizeCanvas]);

  // 게임 루프 시작/중지
  useEffect(() => {
    const state = gameStateRef.current;

    if ((gameReady || gameRunning) && imagesLoaded && !state.gameLoopRunning) {
      state.gameLoopRunning = true;
      // 게임 시작 시 마지막 프레임 시간 초기화
      lastFrameTimeRef.current = null;
      gameLoop();
    } else if ((!gameReady && !gameRunning) || !imagesLoaded) {
      if (state.animationFrameId !== null) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }
      state.gameLoopRunning = false;
      lastFrameTimeRef.current = null;
    }

    return () => {
      if (state.animationFrameId !== null) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }
      state.gameLoopRunning = false;
      lastFrameTimeRef.current = null;
    };
  }, [gameReady, gameRunning, gameLoop, imagesLoaded]);

  // 게임 시작 시 비행선 초기화
  useEffect(() => {
    if (gameRunning) {
      const state = gameStateRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        // 비행선 초기 위치 설정
        state.gyrocop.visible = true;
        state.gyrocop.startTime = Date.now();
        state.gyrocop.x = -state.gyrocop.width; // 화면 왼쪽 밖에서 시작

        // y 위치는 게임 시작 시 캐릭터가 땅에 있을 때의 위치 기준으로 고정
        const dino = state.dino;
        const aspectRatio = gyrocopSpriteRef.current.complete && gyrocopSpriteRef.current.naturalHeight !== 0
          ? gyrocopSpriteRef.current.naturalWidth / gyrocopSpriteRef.current.naturalHeight
          : 2;
        const displayHeight = state.gyrocop.width / aspectRatio;

        // Logical height calculation
        const logicalHeight = canvas.height / (window.devicePixelRatio || 1);

        // 캐릭터가 땅에 있을 때의 y 위치 기준으로 설정 (고정)
        const groundY = logicalHeight - 50 - dino.height;
        state.gyrocop.y = groundY - displayHeight - 20;
      }
    } else {
      // 게임이 중지되면 비행선 숨김
      gameStateRef.current.gyrocop.visible = false;
    }
  }, [gameRunning]);

  // 게임 상태 초기화
  useEffect(() => {
    if (gameReady && !gameRunning) {
      const state = gameStateRef.current;
      state.score = 0;
      state.gameSpeed = 5;
      state.gameStartTime = Date.now();
      state.speedIncreaseTimer = 0;
      state.obstacles.length = 0;
      state.obstacleTimer = 0;
      state.nextObstacleDelay = 60; // 첫 장애물 생성 지연
      state.bounties.length = 0;
      state.bountyTimer = 0;
      state.nextBountyDelay = 0;
      state.bountiesCollected = 0; // 버운티 수집 개수 초기화
      state.gameOverTriggered = false; // 게임 오버 플래그 초기화
      state.gyrocop.visible = false; // 비행선 초기화
      const canvas = canvasRef.current;
      if (canvas) {
        // Use logical height for correct positioning on high-DPI screens
        const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
        state.dino.y = logicalHeight - 50 - state.dino.height;
      }
      state.dino.velocityY = 0;
      state.dino.onGround = true;
      state.spriteConfig.currentFrame = 0;
      state.spriteConfig.frameCounter = 0;
      // 애니메이션 프레임 인덱스 초기화
      state.runningFrameIndex = 0;
      state.runningFrameTime = 0; // 시간 기반으로 변경
      state.jumpFrameIndex = 0;
      state.jumpFrameTime = 0; // 시간 기반으로 변경
      state.jumpStartTime = 0; // 점프 시작 시간 초기화
      scoreRef.current = 0;
      coinsRef.current = 0;
      setCurrentScore(0);
      setCurrentCoins(0);
      onScoreUpdate(0);
    }
  }, [gameReady, gameRunning, onScoreUpdate]);

  // 하이스코어는 부모 컴포넌트에서 관리됨

  // 점프 함수
  const jump = useCallback(() => {
    const state = gameStateRef.current;

    // 이미지가 모두 로드되지 않았으면 게임 시작 불가
    if (!imagesLoaded) return;

    if (gameReady && !gameRunning) {
      onGameBegin();
      return;
    }

    if (state.dino.onGround && gameRunning) {
      state.dino.velocityY = state.dino.jumpPower;
      state.dino.onGround = false;
      // 점프 시작 시 점프 애니메이션 프레임 리셋 및 시작 시간 기록
      state.jumpFrameIndex = 0;
      state.jumpFrameTime = 0; // 시간 기반으로 변경
      state.jumpStartTime = Date.now();
    }
  }, [gameReady, gameRunning, onGameBegin, imagesLoaded]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [jump]);

  // 마우스 클릭 이벤트
  useEffect(() => {
    const handleClick = (e) => {
      // 버튼 클릭 시 점프 방지 (아이템 버튼 포함)
      if (
        e.target.classList.contains('btn') ||
        e.target.closest('button') ||
        e.target.closest('.item-button') ||
        e.target.closest('.item-button-container') ||
        e.target.closest('.item-icon') ||
        e.target.closest('.item-badge') ||
        e.target.closest('.item-timer')
      ) {
        return;
      }
      if (gameReady || gameRunning) {
        e.preventDefault();
        jump();
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [gameReady, gameRunning, jump]);

  // 터치 이벤트
  useEffect(() => {
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      // 버튼 클릭 시 점프 방지 (아이템 버튼 포함)
      if (
        e.target.closest('button') ||
        e.target.closest('.btn') ||
        e.target.closest('.item-button') ||
        e.target.closest('.item-button-container') ||
        e.target.closest('.item-icon') ||
        e.target.closest('.item-badge') ||
        e.target.closest('.item-timer')
      ) {
        return;
      }
      if (gameReady || gameRunning) {
        e.preventDefault();
        touchStartY = e.touches[0].clientY;
        jump();
      }
    };

    const handleTouchEnd = (e) => {
      // 버튼 클릭 시 점프 방지 (아이템 버튼 포함)
      if (
        e.target.closest('button') ||
        e.target.closest('.btn') ||
        e.target.closest('.item-button') ||
        e.target.closest('.item-button-container') ||
        e.target.closest('.item-icon') ||
        e.target.closest('.item-badge') ||
        e.target.closest('.item-timer')
      ) {
        return;
      }
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchStartY - touchEndY;
        if (swipeDistance > 30) {
          jump();
        }
      }
    };

    // Overlay에 이벤트 리스너 등록 (Canvas 대신)
    // Protection overlay handles all touch interactions for the game
    const overlay = document.querySelector('.protection-overlay');
    if (overlay) {
      overlay.addEventListener('touchstart', handleTouchStart, { passive: false });
      overlay.addEventListener('touchend', handleTouchEnd, { passive: false });
      // Prevent context menu on long press
      overlay.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Document 레벨 리스너는 유지하되, 중복 방지를 위해 passive: false 사용
    // (Overlay가 이벤트를 잡아먹으면 document까지 안 갈 수도 있음)
    // 하지만 안전장치로 document에도 리스너를 두는 것이 좋음 (단, overlay가 처리했으면 무시하도록 로직 보완 필요할 수 있음)
    // 여기서는 overlay가 전체 화면을 덮으므로 overlay 리스너만으로 충분할 수 있으나,
    // 기존 로직 유지를 위해 document 리스너는 제거하거나 유지.
    // 사용자가 요청한 "overlay layer"가 있으므로 overlay에 집중.

    return () => {
      if (overlay) {
        overlay.removeEventListener('touchstart', handleTouchStart);
        overlay.removeEventListener('touchend', handleTouchEnd);
        overlay.removeEventListener('contextmenu', (e) => e.preventDefault());
      }
    };
  }, [gameReady, gameRunning, jump]);

  // 초기 화면 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && !gameReady && !gameRunning && imagesLoaded) {
      const ctx = canvas.getContext('2d');
      drawBackground(ctx, canvas);
      drawGround(ctx, canvas);
      // 초기 화면이므로 애니메이션 업데이트가 필요 없음 (deltaTime = 0)
      drawDino(ctx, canvas, 0);
      drawUI(ctx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameReady, gameRunning, imagesLoaded]);


  // 속도 저하 아이템 사용 핸들러
  const handleUseSpeedBoot = useCallback(async () => {
    if (speedReductionActive) {
      return;
    }

    const speedBootItem = inventory.find(item => item.itemKey === 'slow-shoes');
    if (!speedBootItem || speedBootItem.quantity <= 0) {
      return;
    }

    if (!telegramId) {
      console.error('[GameCanvas] No telegram ID');
      return;
    }

    try {
      // 서버에 아이템 사용 요청
      const api = require('../services/api').default;
      await api.useItem(parseInt(telegramId), 'slow-shoes');

      // 속도 저하 효과 활성화 (15초)
      const endTime = Date.now() + 15000;

      // gameStateRef 업데이트 (게임 루프에서 사용)
      gameStateRef.current.speedReductionActive = true;
      gameStateRef.current.speedReductionEndTime = endTime;

      // React state 업데이트 (UI 표시용)
      setSpeedReductionActive(true);
      setSpeedReductionEndTime(endTime);

      // 인벤토리 업데이트
      if (onInventoryUpdate) {
        const updatedInventory = inventory.map(item => {
          if (item.itemKey === 'slow-shoes') {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        }).filter(item => item.quantity > 0);
        onInventoryUpdate(updatedInventory);
      }
    } catch (error) {
      console.error('[GameCanvas] Error using speed boot:', error);
    }
  }, [speedReductionActive, inventory, telegramId, onInventoryUpdate]);

  // 방패 아이템 사용 핸들러
  const handleUseShield = useCallback(async () => {
    if (shieldActive) {
      return;
    }

    const shieldItem = inventory.find(item => item.itemKey === 'shield');
    if (!shieldItem || shieldItem.quantity <= 0) {
      return;
    }

    if (!telegramId) {
      console.error('[GameCanvas] No telegram ID');
      return;
    }

    try {
      // 서버에 아이템 사용 요청
      const api = require('../services/api').default;
      await api.useItem(parseInt(telegramId), 'shield');

      // 방패 활성화
      gameStateRef.current.shieldActive = true;
      setShieldActive(true);

      // 인벤토리 업데이트
      if (onInventoryUpdate) {
        const updatedInventory = inventory.map(item => {
          if (item.itemKey === 'shield') {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        }).filter(item => item.quantity > 0);
        onInventoryUpdate(updatedInventory);
      }
    } catch (error) {
      console.error('[GameCanvas] Error using shield:', error);
    }
  }, [shieldActive, inventory, telegramId, onInventoryUpdate]);

  // 매직 주사기 아이템 사용 핸들러
  const handleUseMagicSyringe = useCallback(async () => {
    if (magicSyringeActive) {
      return;
    }

    const syringeItem = inventory.find(item => item.itemKey === 'magic_syringe');
    if (!syringeItem || syringeItem.quantity <= 0) {
      return;
    }

    if (!telegramId) {
      console.error('[GameCanvas] No telegram ID');
      return;
    }

    try {
      // 서버에 아이템 사용 요청
      const api = require('../services/api').default;
      await api.useItem(parseInt(telegramId), 'magic_syringe');

      // 효과 활성화
      const duration = 6000; // 6초
      const endTime = Date.now() + duration;

      gameStateRef.current.magicSyringeActive = true;
      gameStateRef.current.magicSyringeEndTime = endTime;

      // React state 업데이트
      setMagicSyringeActive(true);
      setMagicSyringeEndTime(endTime);

      // 인벤토리 업데이트
      if (onInventoryUpdate) {
        const updatedInventory = inventory.map(item => {
          if (item.itemKey === 'magic_syringe') {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        }).filter(item => item.quantity > 0);
        onInventoryUpdate(updatedInventory);
      }
    } catch (error) {
      console.error('[GameCanvas] Error using magic syringe:', error);
    }
  }, [magicSyringeActive, inventory, telegramId, onInventoryUpdate]);

  const speedBootItem = inventory.find(item => item.itemKey === 'slow-shoes');
  const hasSpeedBoot = speedBootItem && speedBootItem.quantity > 0;
  const remainingTime = speedReductionActive ? Math.max(0, Math.ceil((speedReductionEndTime - Date.now()) / 1000)) : 0;

  const shieldItem = inventory.find(item => item.itemKey === 'shield');
  const hasShield = shieldItem && shieldItem.quantity > 0;

  const magicSyringeItem = inventory.find(item => item.itemKey === 'magic_syringe');
  const hasMagicSyringe = magicSyringeItem && magicSyringeItem.quantity > 0;
  const magicSyringeRemainingTime = magicSyringeActive ? Math.max(0, Math.ceil((magicSyringeEndTime - Date.now()) / 1000)) : 0;

  const moneyBoostItem = inventory.find(item => item.itemKey === 'money-boost');
  const hasMoneyBoost = moneyBoostItem && moneyBoostItem.quantity > 0;
  const moneyBoostRemainingTime = moneyBoostActive ? Math.max(0, Math.ceil((moneyBoostEndTime - Date.now()) / 1000)) : 0;

  // 코인 부스트 아이템 사용 핸들러
  const handleUseMoneyBoost = useCallback(async () => {
    if (moneyBoostActive) {
      return;
    }
    if (!moneyBoostItem || moneyBoostItem.quantity <= 0) {
      return;
    }

    if (!telegramId) {
      console.error('[GameCanvas] No telegram ID');
      return;
    }

    try {
      // 서버에 아이템 사용 요청
      const api = require('../services/api').default;
      await api.useItem(parseInt(telegramId), 'money-boost');

      // 효과 활성화 (20초)
      const duration = 20000;
      const endTime = Date.now() + duration;

      gameStateRef.current.moneyBoostActive = true;
      gameStateRef.current.moneyBoostEndTime = endTime;

      // React state 업데이트
      setMoneyBoostActive(true);
      setMoneyBoostEndTime(endTime);

      // 인벤토리 업데이트
      if (onInventoryUpdate) {
        const updatedInventory = inventory.map(item => {
          if (item.itemKey === 'money-boost') {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        }).filter(item => item.quantity > 0);
        onInventoryUpdate(updatedInventory);
      }
    } catch (error) {
      console.error('[GameCanvas] Error using money boost:', error);
    }
  }, [moneyBoostActive, moneyBoostItem, inventory, telegramId, onInventoryUpdate]);

  // 속도 저하 효과 타이머
  useEffect(() => {
    if (!speedReductionActive || !speedReductionEndTime) return;

    const checkTimer = setInterval(() => {
      if (Date.now() >= speedReductionEndTime) {
        // gameStateRef 업데이트
        gameStateRef.current.speedReductionActive = false;
        gameStateRef.current.speedReductionEndTime = 0;

        // React state 업데이트
        setSpeedReductionActive(false);
        setSpeedReductionEndTime(0);
      }
    }, 100);

    return () => clearInterval(checkTimer);
  }, [speedReductionActive, speedReductionEndTime]);

  // 매직 주사기 효과 타이머
  useEffect(() => {
    if (!magicSyringeActive || !magicSyringeEndTime) return;

    const checkTimer = setInterval(() => {
      if (Date.now() >= magicSyringeEndTime) {
        gameStateRef.current.magicSyringeActive = false;
        gameStateRef.current.magicSyringeEndTime = 0;

        setMagicSyringeActive(false);
        setMagicSyringeEndTime(0);
      }
    }, 100);

    return () => clearInterval(checkTimer);
  }, [magicSyringeActive, magicSyringeEndTime]);

  // 코인 부스트 효과 타이머
  useEffect(() => {
    if (!moneyBoostActive || !moneyBoostEndTime) return;

    const checkTimer = setInterval(() => {
      if (Date.now() >= moneyBoostEndTime) {
        gameStateRef.current.moneyBoostActive = false;
        gameStateRef.current.moneyBoostEndTime = 0;

        setMoneyBoostActive(false);
        setMoneyBoostEndTime(0);
      }
    }, 100);

    return () => clearInterval(checkTimer);
  }, [moneyBoostActive, moneyBoostEndTime]);

  // 디버깅: 인벤토리 상태 로그
  useEffect(() => {
    // inventory/debug logs removed for performance
  }, [inventory, speedBootItem, hasSpeedBoot]);

  // 별 위치 메모이제이션 (성능 최적화)
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3
    }));
  }, []);

  // 세로 모드일 때 wrapper 크기와 scale 계산
  const updateWrapperStyle = useCallback(() => {
    if (!isLandscape && isGamePlaying && !isPCWebEnvironment && canvasDisplaySizeRef.current.width > 0) {
      const viewportWidth = window.visualViewport?.width || window.innerWidth;
      const canvasWidth = canvasDisplaySizeRef.current.width;
      const canvasHeight = canvasDisplaySizeRef.current.height;
      
      // 세로 모드 화면 너비에 정확히 맞춰서 축소
      // scale = 화면 너비 / canvas 논리적 너비
      const scale = viewportWidth / canvasWidth;
      
      // 디버깅을 위한 로그 (개발 중에만)
      if (process.env.NODE_ENV === 'development') {
        console.log('[GameCanvas] Portrait mode scale:', {
          viewportWidth,
          canvasWidth,
          canvasHeight,
          scale,
          scaledHeight: canvasHeight * scale
        });
      }
      
      setWrapperStyle({
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        position: 'absolute',
        top: '50%',
        left: '50%',
        maxWidth: 'none',
        maxHeight: 'none',
      });
    } else {
      setWrapperStyle({});
    }
  }, [isLandscape, isGamePlaying, isPCWebEnvironment]);

  // 화면 크기 변경 및 canvas 크기 변경 시 wrapper 스타일 업데이트
  useEffect(() => {
    if (!isLandscape && isGamePlaying && !isPCWebEnvironment) {
      // 초기 업데이트
      updateWrapperStyle();
      
      const handleResize = () => {
        // 약간의 지연을 두어 크기가 안정화될 때까지 대기
        setTimeout(() => {
          updateWrapperStyle();
        }, 50);
      };
      
      window.addEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
      }
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
        }
      };
    } else {
      setWrapperStyle({});
    }
  }, [isLandscape, isGamePlaying, isPCWebEnvironment, updateWrapperStyle]);
  
  // resizeCanvas 완료 후 wrapper 스타일 업데이트를 위한 effect
  // resizeCanvas는 useCallback이므로, canvas 크기가 변경될 때마다 호출됨
  // updateWrapperStyle은 useEffect에서 호출되므로 별도 effect 불필요

  return (
    <div 
      className={`game-canvas-wrapper ${isGamePlaying ? 'game-playing' : ''} ${isPCWebEnvironment ? 'pc-web' : ''} ${!isLandscape ? 'portrait-mode' : ''}`}
      style={wrapperStyle}
    >
      <canvas
        ref={canvasRef}
        className={`game-canvas ${isGamePlaying ? 'game-playing' : ''} ${isPCWebEnvironment ? 'pc-web' : ''} ${!isLandscape ? 'portrait-mode' : ''}`}
        width={isGamePlaying ? (isPCWebEnvironment ? 932 : (window.visualViewport?.width || window.innerWidth)) : (isPCWebEnvironment ? 430 : (window.visualViewport?.width || window.innerWidth))}
        height={isGamePlaying ? (isPCWebEnvironment ? 430 : (window.visualViewport?.height || window.innerHeight)) : (isPCWebEnvironment ? 932 : (window.visualViewport?.height || window.innerHeight))}
      />

      {/* Protection Overlay - Blocks context menu and handles game input */}
      <div
        className="protection-overlay"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* 점수 UI - 게임 플레이 중에만 표시 */}
      {isGamePlaying && (gameReady || gameRunning) && imagesLoaded && (
        <div className="game-score-panel">
          <div className="score-value">{currentScore}</div>
          <div className="coin-value">COINS: {currentCoins}</div>
        </div>
      )}

      {/* 이미지 로딩 화면 - 메뉴 스타일 */}
      {!imagesLoaded && (gameReady || isGamePlaying) && (
        <div className={`game-loading-screen ${isPCWebEnvironment ? 'pc-web' : ''}`}>
          {/* 별 배경 */}
          <div className="stars-background">
            {stars.map((star) => (
              <div
                key={star.id}
                className="star"
                style={{
                  left: `${star.left}% `,
                  top: `${star.top}% `,
                  animationDelay: `${star.delay} s`
                }}
              />
            ))}
          </div>

          <div className="loading-content">
            <div className="loading-title">Загрузка</div>
            <div className="loading-progress-container">
              <div className="loading-progress">
                <div className="loading-progress-bar" style={{ width: `${loadingProgress}% ` }}></div>
              </div>
              <div className="loading-percentage">{Math.round(loadingProgress)}%</div>
            </div>
            <div className="loading-status">
              {loadingProgress < 25 && 'Загрузка ресурсов...'}
              {loadingProgress >= 25 && loadingProgress < 50 && 'Загрузка персонажа...'}
              {loadingProgress >= 50 && loadingProgress < 75 && 'Загрузка препятствий...'}
              {loadingProgress >= 75 && loadingProgress < 100 && 'Почти готово...'}
              {loadingProgress === 100 && 'Готово!'}
            </div>
          </div>
        </div>
      )}



      {/* 아이템 버튼 UI - 게임 플레이 중에만 표시 */}
      {isGamePlaying && gameRunning && (
        <div
          className="item-button-container"
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Speed Boot Button */}
          {bootImagesLoaded && (
            <div className="speed-boot-container">
              <button
                className={`item-button ${hasSpeedBoot && !speedReductionActive ? 'active' : 'disabled'}`}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (hasSpeedBoot && !speedReductionActive) {
                    handleUseSpeedBoot();
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                disabled={!hasSpeedBoot || speedReductionActive}
              >
                {speedReductionActive && (
                  <div className="item-timer">
                    {remainingTime}s
                  </div>
                )}
                <div
                  className="item-icon"
                  style={{
                    backgroundImage: `url(${speedReductionActive ? '/boot1skillingame.png' : '/boot1.png'})`
                  }}
                />
                {/* Transparent Protection Overlay for Image */}
                <div className="image-protection-overlay" />

                {hasSpeedBoot && !speedReductionActive && (
                  <div className="item-badge">
                    {speedBootItem.quantity}
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Shield Button */}
          {shieldImagesLoaded && (
            <div className="shield-container">
              <button
                className={`item-button ${hasShield && !shieldActive ? 'active' : 'disabled'}`}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (hasShield && !shieldActive) {
                    handleUseShield();
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                disabled={!hasShield || shieldActive}
              >
                <div
                  className="item-icon"
                  style={{
                    backgroundImage: `url(${shieldActive ? '/shield_active.png' : '/shield_inactive.png'})`
                  }}
                />
                {/* Transparent Protection Overlay for Image */}
                <div className="image-protection-overlay" />

                {hasShield && !shieldActive && (
                  <div className="item-badge">
                    {shieldItem.quantity}
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Magic Syringe Button */}
          {magicSyringeImagesLoaded && (
            <div className="magic-syringe-container">
              <button
                className={`item-button ${hasMagicSyringe && !magicSyringeActive ? 'active' : 'disabled'}`}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (hasMagicSyringe && !magicSyringeActive) {
                    handleUseMagicSyringe();
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                disabled={!hasMagicSyringe || magicSyringeActive}
              >
                {magicSyringeActive && (
                  <div className="item-timer">
                    {magicSyringeRemainingTime}s
                  </div>
                )}
                <div
                  className="item-icon"
                  style={{
                    backgroundImage: `url(${magicSyringeActive ? '/shpriz.png' : '/shprizpng.png'})`
                  }}
                />
                {/* Transparent Protection Overlay for Image */}
                <div className="image-protection-overlay" />

                {hasMagicSyringe && !magicSyringeActive && (
                  <div className="item-badge">
                    {magicSyringeItem.quantity}
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Money Boost Button */}
          {moneyBoostImagesLoaded && (
            <div className="money-boost-container">
              <button
                className={`item-button ${hasMoneyBoost && !moneyBoostActive ? 'active' : 'disabled'}`}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (hasMoneyBoost && !moneyBoostActive) {
                    handleUseMoneyBoost();
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                disabled={!hasMoneyBoost || moneyBoostActive}
              >
                {moneyBoostActive && (
                  <div className="item-timer">
                    {moneyBoostRemainingTime}s
                  </div>
                )}
                <div
                  className="item-icon"
                  style={{
                    backgroundImage: `url(${moneyBoostActive ? '/money.png' : '/moneypng.png'})`
                  }}
                />
                {/* Transparent Protection Overlay for Image */}
                <div className="image-protection-overlay" />

                {hasMoneyBoost && !moneyBoostActive && (
                  <div className="item-badge">
                    {moneyBoostItem.quantity}
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(GameCanvas);

