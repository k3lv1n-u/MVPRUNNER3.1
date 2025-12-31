import React, { useState, useEffect } from 'react';
import './StartMenu.css';
import api from '../services/api';
import { collectFullFingerprint } from '../utils/fingerprintCollector';
import DeviceCheckLoading from './DeviceCheckLoading';
import soundManager from '../utils/soundManager';
import ReferralButton from './ReferralButton';

// 타이틀 애니메이션 컴포넌트
const TitleAnimation = () => {
  const canvasRef = React.useRef(null);
  const [frames, setFrames] = useState([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = React.useRef(new Image());
  const requestRef = React.useRef();
  const frameIndexRef = React.useRef(0);
  const frameCounterRef = React.useRef(0);

  useEffect(() => {
    // JSON 로드
    fetch('/title.json')
      .then(res => res.json())
      .then(data => {
        setFrames(data);
      })
      .catch(err => console.error('Failed to load title.json:', err));

    // 이미지 로드
    imageRef.current.src = '/titleanim.png';
    imageRef.current.onload = () => setImageLoaded(true);
  }, []);

  const animate = React.useCallback(() => {
    if (!canvasRef.current || !frames.length || !imageLoaded) return;

    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Enable smoothing for softer look as requested
    ctx.imageSmoothingEnabled = true;

    const currentFrame = frames[frameIndexRef.current];
    if (currentFrame) {
      // 캔버스 중앙에 배치
      // 원본 프레임 크기 비율 유지하면서 캔버스에 맞춤 (약간의 여백)
      const padding = 10;
      const targetHeight = height - (padding * 2);
      const scale = targetHeight / currentFrame.height;
      const targetWidth = currentFrame.width * scale;

      const x = (width - targetWidth) / 2;
      const y = (height - targetHeight) / 2;

      ctx.drawImage(
        imageRef.current,
        currentFrame.x, currentFrame.y,
        currentFrame.width, currentFrame.height,
        x, y,
        targetWidth, targetHeight
      );
    }

    // 프레임 업데이트 (속도 조절: 6프레임마다 갱신 - 더 느리게)
    frameCounterRef.current += 1;
    if (frameCounterRef.current >= 6) {
      frameCounterRef.current = 0;
      frameIndexRef.current = (frameIndexRef.current + 1) % frames.length;
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [frames, imageLoaded]);

  useEffect(() => {
    if (frames.length > 0 && imageLoaded) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [frames, imageLoaded, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={260}
      className="title-animation-canvas"
    />
  );
};

const StartMenu = ({
  onStartGame,
  onShowLeaderboard,
  onShowAbout,
  onShowShop,
  onShowPromoCode,
  onShowSettings,
  onShowNews,
  onAccountBlocked,
  username = 'username',
  balance = 94
}) => {
  // 웹 환경 감지 (Telegram WebApp이 아닌 경우)
  const isWebEnvironment = typeof window !== 'undefined' &&
    (!window.Telegram || !window.Telegram.WebApp);

  // PC 웹 환경 감지 (터치 디바이스가 아니고 화면이 큰 경우)
  const isPCWebEnvironment = typeof window !== 'undefined' &&
    isWebEnvironment &&
    (navigator.maxTouchPoints === 0 ||
      (window.innerWidth >= 768 && window.matchMedia('(pointer: fine)').matches));

  const [isLandscape, setIsLandscape] = useState(() => {
    // 웹 환경에서는 항상 세로 모드로 간주
    if (isWebEnvironment) {
      return false;
    }
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight;
    }
    return false;
  });

  // 에뮬레이터 탐지 상태
  const [emulatorDetected, setEmulatorDetected] = useState(false);
  const [emulatorReason, setEmulatorReason] = useState('');
  const [isCheckingEmulator, setIsCheckingEmulator] = useState(true);
  const [accountBlocked, setAccountBlocked] = useState(false);
  const [checkingMessage, setCheckingMessage] = useState('Проверка безопасности...');

  // 텔레그램 사용자 정보 가져오기
  const [telegramUser, setTelegramUser] = useState({
    id: null,
    username: username,
    avatar: null,
    referralCode: null
  });

  useEffect(() => {
    // Telegram WebApp 사용자 정보 가져오기 (initData 파싱)
    const loadUserData = async () => {
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        const initData = tg.initData;

        if (initData) {
          const params = new URLSearchParams(initData);
          const userParam = params.get('user');

          if (userParam) {
            try {
              const user = JSON.parse(decodeURIComponent(userParam));
              if (user && user.id) {
                // 기본 정보 설정
                setTelegramUser(prev => ({
                  ...prev,
                  id: user.id,
                  username: user.username || user.first_name || username,
                  avatar: user.photo_url || null
                }));

                // 서버에서 referralCode 가져오기
                try {
                  const userData = await api.getUser(user.id);
                  if (userData) {
                    setTelegramUser(prev => ({
                      ...prev,
                      referralCode: userData.referralCode || prev.referralCode,
                      botUsername: userData.botUsername || null
                    }));
                  }
                } catch (error) {
                  console.error('[StartMenu] Error fetching referral code:', error);
                }
              }
            } catch (error) {
              console.error('[StartMenu] Error parsing user from initData:', error);
            }
          }
        }
      }
    };

    loadUserData();
  }, [username]);

  // 서버 기반 에뮬레이터 탐지 실행
  useEffect(() => {
    const performEmulatorCheck = async () => {
      setIsCheckingEmulator(true);
      setCheckingMessage('Проверка безопасности...');

      try {
        // Fingerprint 데이터 수집 (서버 전송용)
        const fingerprint = await collectFullFingerprint((message) => {
          setCheckingMessage(message);
        });

        // 서버에 fingerprint 전송 및 검증 요청
        if (telegramUser.id) {
          setCheckingMessage('Проверка безопасности...');

          const result = await api.checkEmulatorFingerprint(telegramUser.id, fingerprint);

          // 서버에서 차단 판단
          if (result.blocked || result.isEmulator) {
            console.warn('[Emulator Detection] Emulator detected by server! Score:', result.totalScore);
            setEmulatorDetected(true);
            setAccountBlocked(true);
            const reason = result.totalScore !== undefined
              ? `Обнаружен эмулятор (балл: ${result.totalScore}/100)\n${result.reasons?.join('\n') || ''}`
              : result.reasons?.join('\n') || 'Обнаружен эмулятор сервером';
            setEmulatorReason(reason);

            // 부모 컴포넌트에 차단 상태 전달 (alert 대신 차단 씬으로 전환)
            if (onAccountBlocked) {
              onAccountBlocked(reason);
            }
          } 
        } else {
          // telegramUser.id가 없으면 기본 검증만 수행
          if (fingerprint.platform === 'unknown') {
            setEmulatorDetected(true);
            const reason = 'Telegram WebApp validation failed and platform cannot be determined';
            setEmulatorReason(reason);
            // 부모 컴포넌트에 차단 상태 전달
            if (onAccountBlocked) {
              onAccountBlocked(reason);
            }
          }
        }

        setIsCheckingEmulator(false);
      } catch (error) {
        console.error('[Emulator Detection] Error during check:', error);
        console.error('[Emulator Detection] Error stack:', error.stack);
        // 에러 발생 시에도 의심스러우므로 차단 (에러는 보안상 위험)
        setEmulatorDetected(true);
        const reason = `Ошибка проверки безопасности: ${error.message}`;
        setEmulatorReason(reason);
        setIsCheckingEmulator(false);
        // 부모 컴포넌트에 차단 상태 전달
        if (onAccountBlocked) {
          onAccountBlocked(reason);
        }
      }
    };

    // 텔레그램 사용자 정보가 로드된 후 검증 실행
    // 약간의 지연을 두어 컴포넌트가 완전히 마운트된 후 실행
    const timer = setTimeout(() => {
      performEmulatorCheck();
    }, 100);

    return () => clearTimeout(timer);
  }, [telegramUser.id, onAccountBlocked]);

  useEffect(() => {
    // PC 웹 환경에서는 방향 체크 건너뛰기 (항상 세로 모드)
    if (isPCWebEnvironment) {
      setIsLandscape(false);
      return;
    }

    // 모바일 환경: 가로 모드 체크 (visualViewport 우선 사용)
    const checkOrientation = () => {
      const width = window.visualViewport?.width || window.innerWidth;
      const height = window.visualViewport?.height || window.innerHeight;
      setIsLandscape(width > height);
    };

    checkOrientation();

    const handleResize = () => {
      checkOrientation();
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        checkOrientation();
      }, 100);
    };

    // visualViewport API 사용 (모바일 브라우저에서 더 정확한 크기 감지)
    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        checkOrientation();
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
  }, [isPCWebEnvironment]);

  const handleStartClick = () => {
    if (isCheckingEmulator) {
      alert('Проверка устройства... Пожалуйста, подождите.');
      return;
    }

    if (emulatorDetected || accountBlocked) {
      // 에뮬레이터 환경에서는 게임 시작 차단
      alert('🚫 Эмулятор или виртуальная машина обнаружены!\n\nИспользование эмуляторов запрещено правилами игры.\n\nПожалуйста, запустите игру на реальном устройстве.');
      return;
    }
    soundManager.playButtonClick();
    onStartGame();
  };

  // 로딩 화면 표시
  if (isCheckingEmulator) {
    return <DeviceCheckLoading message={checkingMessage} />;
  }

  return (
    <div className={`start-menu ${isLandscape ? 'landscape-mode' : ''}`}>
      {/* 밤하늘 별 배경 */}
      <div className="stars-background">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* 보라색 별찌 (Purple Falling Stars) */}
      <div className="purple-stars-layer">
        {[...Array(20)].map((_, i) => (
          <div
            key={`pstar-${i}`}
            className="purple-star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10px`,
              animation: `purpleRain ${2 + Math.random() * 3}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* 상단 헤더 */}
      <div className="menu-header">
        <div className="header-left">
          <div className="telegram-profile">
            <div className="telegram-avatar">
              {telegramUser.avatar ? (
                <>
                  <img
                    src={telegramUser.avatar}
                    alt="Avatar"
                    className="avatar-image"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div
                    className="image-overlay"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onTouchEnd={(e) => e.preventDefault()}
                    onTouchMove={(e) => e.preventDefault()}
                  />
                </>
              ) : null}
              <div className="avatar-placeholder" style={{ display: telegramUser.avatar ? 'none' : 'flex' }}>
                {telegramUser.username ? telegramUser.username.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div className="telegram-details">
              <div className="telegram-handle">
                @{telegramUser.username || 'username'}
              </div>
              {telegramUser.id && (
                <div className="telegram-id">ID: {telegramUser.id}</div>
              )}
            </div>
          </div>
        </div>
        <div className="header-right">
          {/* Referral 버튼 */}
          <ReferralButton
            telegramId={telegramUser.id}
            username={telegramUser.username}
            referralCode={telegramUser.referralCode}
            botUsername={telegramUser.botUsername}
          />
          {/* 프로모션 코드 소식 버튼 */}
          <button className="header-icon-btn" onClick={() => { soundManager.playButtonClick(); onShowPromoCode(); }} title="Промокод">
            <span className="icon-promo">🎁</span>
          </button>
          {/* 뉴스 버튼 */}
          <button className="header-icon-btn" onClick={() => { soundManager.playButtonClick(); onShowNews(); }} title="Новости">
            <span className="icon-news">📰</span>
          </button>
          {/* 게임 코인 (잔액) */}
          <button className="header-icon-btn balance-icon-btn" onClick={() => { soundManager.playButtonClick(); onShowShop(); }} title="Магазин">
            <span className="balance-label">🪙</span>
            <span className="balance-value">{balance}</span>
          </button>
          {/* 설정 버튼 */}
          <button className="header-icon-btn" onClick={() => { soundManager.playButtonClick(); onShowSettings(); }} title="Настройки">
            <span className="icon-settings">⚙️</span>
          </button>
        </div>
      </div>

      {/* 타이틀 영역 - 가로모드에서 숨김 */}
      {!isLandscape && (
        <div className="menu-character-area">
          {/* 타이틀 애니메이션 & 텍스트 */}
          <div className="game-title-container">
            <div className="game-title-animation-wrapper">
              <TitleAnimation />
            </div>
          </div>
        </div>
      )}

      {/* 에뮬레이터 경고 메시지 */}
      {(emulatorDetected || accountBlocked) && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          color: '#ff0000',
          padding: '20px',
          borderRadius: '10px',
          zIndex: 10000,
          textAlign: 'center',
          border: '2px solid #ff0000',
          maxWidth: '90%'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#ff0000' }}>🚫 Эмулятор обнаружен</h2>
          <p style={{ margin: '0 0 10px 0' }}>Использование эмуляторов запрещено.</p>
          {accountBlocked && (
            <p style={{ margin: '0 0 10px 0', color: '#ff6b6b' }}>
              Ваш аккаунт был заблокирован.
            </p>
          )}
          <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
            {emulatorReason}
          </p>
        </div>
      )}

      {/* 메뉴 버튼들 */}
      <div className="menu-buttons">
        <button
          className="menu-btn primary-btn"
          onClick={handleStartClick}
          disabled={isCheckingEmulator || emulatorDetected || accountBlocked}
        >
          {isCheckingEmulator ? 'ПРОВЕРКА...' : (emulatorDetected || accountBlocked) ? 'ЗАБЛОКИРОВАНО' : 'НАЧАТЬ ЗАБЕГ'}
        </button>
        <button className="menu-btn" onClick={() => { soundManager.playButtonClick(); onShowShop(); }}>
          <span className="shop-icon">🛒</span>
          МАГАЗИН
        </button>
        <button className="menu-btn" onClick={() => { soundManager.playButtonClick(); onShowPromoCode(); }}>
          ПРОМО КОД
        </button>
        <button className="menu-btn" onClick={() => { soundManager.playButtonClick(); onShowLeaderboard(); }}>
          ТАБЛИЦА ИГРОКОВ
        </button>
        <button className="menu-btn" onClick={() => { soundManager.playButtonClick(); onShowAbout(); }}>
          О НАС
        </button>
      </div>
    </div>
  );
};
export default StartMenu;
