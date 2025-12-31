import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './GameCanvas';
import StartMenu from './StartMenu';
import Leaderboard from './Leaderboard';
import About from './About';
import Settings from './Settings';
import GameOver from './GameOver';
import WheelOfFortune from './WheelOfFortune';
import Welcome from './Welcome';
import NewYear2026 from './NewYear2026';
import News from './News';
import Shop from './Shop';
import PromoCodeReceiver from './PromoCodeReceiver';
import AccountBlocked from './AccountBlocked';
import api from '../services/api';
import soundManager from '../utils/soundManager';
import './Game.css';

const Game = () => {
  const [score, setScore] = useState(0); // eslint-disable-line no-unused-vars
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('highScore') || '0', 10);
  });
  const [gameRunning, setGameRunning] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const [isGamePlaying, setIsGamePlaying] = useState(false);
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome', 'menu', 'game', 'gameover', 'leaderboard', 'about', 'settings', 'wheel', 'news'
  const [finalScore, setFinalScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('username') || 'username';
  });
  const [balance, setBalance] = useState(() => {
    // 기본값은 0으로 시작하고, 실제 값은 서버에서 받아온 user.balance로 덮어씁니다.
    return parseInt(localStorage.getItem('balance') || '0', 10);
  });
  const [telegramId, setTelegramId] = useState(() => {
    return localStorage.getItem('telegramId') || null;
  });
  const [userInitialized, setUserInitialized] = useState(false);
  const [receivedPromoCode, setReceivedPromoCode] = useState(null);
  const [promoCodeForWheel, setPromoCodeForWheel] = useState(null);
  const [bountiesCollected, setBountiesCollected] = useState(0);
  const [accountBlocked, setAccountBlocked] = useState(() => {
    // 초기 상태는 항상 false로 시작 (Welcome에서 서버 상태 확인 후 업데이트)
    // localStorage의 차단 상태는 Welcome 컴포넌트에서 서버와 동기화될 때까지 무시
    api.setAccountBlocked(false);
    return { blocked: false, reason: '' };
  });
  const [inventory, setInventory] = useState([]);

  // 웹 환경 감지 (Telegram WebApp이 아닌 경우)
  const isWebEnvironment = typeof window !== 'undefined' &&
    (!window.Telegram || !window.Telegram.WebApp);

  // PC 웹 환경 감지 (터치 디바이스가 아니고 화면이 큰 경우)
  const isPCWebEnvironment = typeof window !== 'undefined' &&
    isWebEnvironment &&
    (navigator.maxTouchPoints === 0 ||
      (window.innerWidth >= 768 && window.matchMedia('(pointer: fine)').matches));

  // 화면 방향 감지 (세로 모드에서도 게임 진행, 가로 비율 유지)
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight;
    }
    return true;
  });


  const handleScoreUpdate = useCallback((newScore) => {
    setScore(newScore);
  }, []);

  // 버운티 수집 시 로컬 상태만 업데이트 (서버 업데이트는 게임 기록 저장 시 처리)
  const handleBountyCollected = useCallback(async (amount = 1) => {
    // 함수형 업데이트를 사용하여 항상 최신 balance 값을 참조
    setBalance(prevBalance => {
      const newBalance = prevBalance + amount;
      // localStorage 즉시 업데이트
      localStorage.setItem('balance', newBalance.toString());

      return newBalance;
    });
  }, [telegramId]);

  const handleGameOver = useCallback((score, bountiesCollected = 0) => {
    try {
      // 버운티 수집 정보를 상태에 저장
      setBountiesCollected(bountiesCollected);
      // 게임 상태 즉시 중지
      setGameRunning(false);
      setGameReady(false);
      setIsGamePlaying(false);

      const newRecord = score > highScore;
      if (newRecord) {
        const newHighScore = score;
        setHighScore(newHighScore);
        try {
          localStorage.setItem('highScore', newHighScore.toString());
        } catch (e) {
          console.error('[Game] Error saving high score to localStorage:', e);
        }
        setIsNewRecord(true);
      } else {
        setIsNewRecord(false);
      }

      setFinalScore(score);
    } catch (error) {
      console.error('[Game] Error in handleGameOver logic:', error);
    }

    // 에러가 발생하더라도 게임 오버 씬으로 전환은 반드시 수행
    setCurrentView('gameover');
  }, [highScore]);

  const handleStartGame = () => {
    if (gameRunning || gameReady) return;
    setCurrentView('game');
    setGameReady(true);
    setGameRunning(false);
    setIsGamePlaying(true);
  };

  const handleShowLeaderboard = () => {
    setCurrentView('leaderboard');
  };

  const handleShowAbout = () => {
    setCurrentView('about');
  };

  const handleShowSettings = () => {
    setCurrentView('settings');
  };

  const handleShowPromoCode = () => {
    setCurrentView('promo-code');
  };

  const handleBackFromShop = useCallback(async () => {
    soundManager.playButtonClick();

    // 상점에서 돌아올 때 인벤토리 새로고침
    if (telegramId) {
      try {
        const userInventory = await api.getUserInventory(parseInt(telegramId));
        setInventory(userInventory || []);
      } catch (error) {
        console.error('Error reloading inventory:', error);
      }
    }

    setCurrentView('menu');
  }, [telegramId]);

  const handleGoToWheel = (code) => {
    setPromoCodeForWheel(code);
    setCurrentView('wheel');
  };

  const handleShowNews = () => {
    setCurrentView('news');
  };

  const handleShowShop = () => {
    setCurrentView('shop');
  };

  const handleWheelWin = useCallback(async (prize) => {
    // 휠 당첨은 USDT(totalCryptoEarned)만 증가하며, 게임코인(balance)과는 무관합니다.
    // 서버에서 이미 totalCryptoEarned를 업데이트했으므로 클라이언트에서는 아무것도 하지 않습니다.
  }, []);

  const handleBackToMenu = () => {
    setCurrentView('menu');
    setGameRunning(false);
    setGameReady(false);
    setIsGamePlaying(false);
    setScore(0);
    setFinalScore(0);
    setIsNewRecord(false);
  };

  const handleRestartGame = () => {
    setCurrentView('game');
    setGameReady(true);
    setGameRunning(false);
    setIsGamePlaying(true);
    setScore(0);
    setFinalScore(0);
    setIsNewRecord(false);
  };

  const handleGameBegin = useCallback(() => {
    // 세로 모드에서도 게임 진행 (가로 비율 유지)
    if (gameReady && !gameRunning) {
      setGameRunning(true);
      // 배경음악은 GameCanvas에서 gameRunning이 true가 되면 자동으로 재생됨
    }
  }, [gameReady, gameRunning]);

  // 게임 오버 시 배경음악 정지
  useEffect(() => {
    if (currentView === 'gameover') {
      soundManager.stopBackgroundMusic();
    } else if (currentView !== 'game') {
      // 게임 씬이 아닌 다른 씬으로 이동 시 배경음악 정지
      soundManager.stopBackgroundMusic();
    }
  }, [currentView]);

  // 화면 방향 감지 (세로 모드에서도 게임 진행, 가로 비율 유지)
  useEffect(() => {
    if (currentView !== 'game') return;

    const checkOrientation = () => {
      const isLandscapeMode = window.innerWidth > window.innerHeight;
      setIsLandscape(isLandscapeMode);
    };

    // 초기 확인
    checkOrientation();

    // 화면 크기 변경 및 방향 변경 감지
    const handleResize = () => {
      checkOrientation();
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        checkOrientation();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [currentView]);

  // 게임 화면 이탈 감지 및 시작 메뉴로 강제 이동
  useEffect(() => {
    // 게임이 실행 중일 때만 작동
    if (currentView !== 'game' || !gameRunning) return;

    const handleVisibilityChange = () => {
      // 페이지가 숨겨졌을 때 (다른 앱으로 전환, 텔레그램 미니앱을 내릴 때 등)
      if (document.hidden) {
        console.log('[Game] Page hidden, returning to menu');
        // 게임 상태 초기화 및 메뉴로 이동
        handleBackToMenu();
        // 배경음악 정지
        soundManager.stopBackgroundMusic();
      }
    };

    const handleBlur = () => {
      // 윈도우가 포커스를 잃었을 때 (다른 앱으로 전환)
      if (document.hidden) {
        console.log('[Game] Window blurred, returning to menu');
        // 게임 상태 초기화 및 메뉴로 이동
        handleBackToMenu();
        // 배경음악 정지
        soundManager.stopBackgroundMusic();
      }
    };

    // Telegram WebApp 이벤트 감지 (미니앱이 닫히거나 숨겨질 때)
    const handleTelegramViewportChanged = () => {
      if (window.Telegram && window.Telegram.WebApp) {
        const webApp = window.Telegram.WebApp;
        // 미니앱이 확장되지 않았거나 숨겨진 경우
        if (!webApp.isExpanded || document.hidden) {
          console.log('[Game] Telegram WebApp hidden/collapsed, returning to menu');
          handleBackToMenu();
          soundManager.stopBackgroundMusic();
        }
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    
    // Telegram WebApp 이벤트 (지원되는 경우)
    if (window.Telegram && window.Telegram.WebApp) {
      const webApp = window.Telegram.WebApp;
      // viewportChanged 이벤트가 있는 경우 사용
      if (webApp.onEvent) {
        webApp.onEvent('viewportChanged', handleTelegramViewportChanged);
      }
    }

    return () => {
      // 이벤트 리스너 제거
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      
      // Telegram WebApp 이벤트 제거
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.offEvent) {
        window.Telegram.WebApp.offEvent('viewportChanged', handleTelegramViewportChanged);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, gameRunning]);


  // Welcome 씬 완료 핸들러
  const handleWelcomeComplete = useCallback(async (user) => {
    if (user) {
      setTelegramId(user.telegramId?.toString() || null);
      setUsername(user.username || 'username');
      setBalance(typeof user.balance === 'number' ? user.balance : 0);
      setHighScore(user.highScore || 0);

      // 서버에서 차단 상태 확인 및 동기화
      // Welcome에서 이미 서버 상태를 확인했지만, 이중 확인으로 확실히 동기화
      if (user.telegramId) {
        try {
          const serverUser = await api.getUser(parseInt(user.telegramId));
            if (serverUser) {
              // 서버에서 받은 balance와 highScore로 동기화 (서버가 최신 정보)
              if (typeof serverUser.balance === 'number') {
                setBalance(serverUser.balance);
                localStorage.setItem('balance', serverUser.balance.toString());
              }
              if (typeof serverUser.highScore === 'number') {
                setHighScore(serverUser.highScore);
                localStorage.setItem('highScore', serverUser.highScore.toString());
              }

              // 서버 상태에 따라 차단 상태 업데이트
              // 서버 상태를 우선으로 하여 localStorage를 덮어쓰기
              if (serverUser.isBlocked === true) {
                // 서버에서 차단된 경우
                const reason = serverUser.blockReason || '';
                localStorage.setItem('accountBlocked', 'true');
                if (reason) {
                  localStorage.setItem('accountBlockedReason', reason);
                }
                setAccountBlocked({ blocked: true, reason });
                api.setAccountBlocked(true);
              } else {
                // 서버에서 차단되지 않은 경우 (false, undefined, null 모두 포함)
                // 무조건 localStorage에서 차단 상태 제거 (DB 초기화 대응)
                localStorage.removeItem('accountBlocked');
                localStorage.removeItem('accountBlockedReason');
                setAccountBlocked({ blocked: false, reason: '' });
                api.setAccountBlocked(false);
              }
          } else {
            // 사용자가 서버에 없으면 (DB 초기화 후) 차단 상태 제거
            localStorage.removeItem('accountBlocked');
            localStorage.removeItem('accountBlockedReason');
            setAccountBlocked({ blocked: false, reason: '' });
            api.setAccountBlocked(false);
          }
        } catch (error) {
          console.error('[Game] Error checking server block status:', error);
          // 에러 발생 시에도 차단 해제 (서버 연결 실패 시 차단 상태 유지 방지)
          localStorage.removeItem('accountBlocked');
          localStorage.removeItem('accountBlockedReason');
          setAccountBlocked({ blocked: false, reason: '' });
          api.setAccountBlocked(false);
        }
      }

      // 로컬 스토리지 업데이트
      if (user.telegramId) {
        localStorage.setItem('telegramId', user.telegramId.toString());
      }
      localStorage.setItem('username', user.username || 'username');
      // 서버에서 내려온 balance 값을 그대로 저장 (0도 유효한 값이므로 기본값 94로 덮어쓰지 않음)
      localStorage.setItem('balance', (typeof user.balance === 'number' ? user.balance : 0).toString());
      localStorage.setItem('highScore', (user.highScore || 0).toString());
    }

    // 발급된 프로모션 코드 확인 (요청 상태 확인)
    if (user && user.telegramId) {
      try {
        const requests = await api.getUserPromoCodeRequests(parseInt(user.telegramId));
        const issuedRequest = requests.find(req => req.status === 'issued' && req.promoCode && !req.promoCode.isUsed);
        if (issuedRequest && issuedRequest.promoCode) {
          setReceivedPromoCode({
            code: issuedRequest.promoCode.code,
            message: 'Промокод выдан администратором!'
          });
          localStorage.setItem('receivedPromoCode', JSON.stringify({
            code: issuedRequest.promoCode.code,
            message: 'Промокод выдан администратором!'
          }));
        }
      } catch (error) {
        console.error('Error checking promo code requests:', error);
      }

      // 사용자 인벤토리 로드
      try {
        const userInventory = await api.getUserInventory(parseInt(user.telegramId));
        setInventory(userInventory || []);
      } catch (error) {
        console.error('Error loading user inventory:', error);
      }
    }

    setUserInitialized(true);
    setCurrentView('newyear'); // 새해 축하 씬 먼저 표시
  }, []);

  // 계정 차단 핸들러
  const handleAccountBlocked = useCallback((reason) => {
    console.warn('[Game] Account blocked:', reason);
    setAccountBlocked({ blocked: true, reason: reason || '' });
    // localStorage에 차단 상태 저장
    localStorage.setItem('accountBlocked', 'true');
    if (reason) {
      localStorage.setItem('accountBlockedReason', reason);
    }
    // API 서비스에 차단 상태 전달
    api.setAccountBlocked(true);
  }, []);

  // 뷰에 따라 다른 컴포넌트 렌더링
  // 계정 차단 상태면 모든 씬 차단
  if (accountBlocked.blocked) {
    return <AccountBlocked reason={accountBlocked.reason} />;
  }

  if (currentView === 'welcome' || !userInitialized) {
    return <Welcome onComplete={handleWelcomeComplete} />;
  }

  if (currentView === 'newyear') {
    return <NewYear2026 onComplete={() => setCurrentView('menu')} />;
  }

  if (currentView === 'promo-code') {
    return (
      <PromoCodeReceiver
        telegramId={telegramId}
        onClose={() => setCurrentView('menu')}
        onGoToWheel={handleGoToWheel}
      />
    );
  }

  if (currentView === 'menu') {
    return (
      <StartMenu
        onStartGame={handleStartGame}
        onShowLeaderboard={handleShowLeaderboard}
        onShowAbout={handleShowAbout}
        onShowShop={handleShowShop}
        onShowPromoCode={handleShowPromoCode}
        onShowSettings={handleShowSettings}
        onShowNews={handleShowNews}
        onAccountBlocked={handleAccountBlocked}
        username={username}
        balance={balance}
      />
    );
  }

  if (currentView === 'news') {
    return (
      <News
        onBack={handleBackToMenu}
      />
    );
  }

  if (currentView === 'leaderboard') {
    return (
      <Leaderboard
        onBack={handleBackToMenu}
      />
    );
  }

  if (currentView === 'about') {
    return (
      <About
        onBack={handleBackToMenu}
      />
    );
  }

  if (currentView === 'settings') {
    return (
      <Settings
        onBack={handleBackToMenu}
      />
    );
  }

  if (currentView === 'gameover') {
    return (
      <GameOver
        score={finalScore}
        highScore={highScore}
        isNewRecord={isNewRecord}
        promoCode={receivedPromoCode}
        onRestart={handleRestartGame}
        onBackToMenu={handleBackToMenu}
        onClearPromoCode={() => setReceivedPromoCode(null)}
        telegramId={telegramId}
        onHighScoreUpdate={(newHighScore) => {
          setHighScore(newHighScore);
          localStorage.setItem('highScore', newHighScore.toString());
        }}
        bountiesCollected={bountiesCollected}
      />
    );
  }

  if (currentView === 'wheel') {
    return (
      <WheelOfFortune
        onBack={() => {
          setPromoCodeForWheel(null);
          handleBackToMenu();
        }}
        onWin={handleWheelWin}
        telegramId={telegramId}
        initialPromoCode={promoCodeForWheel}
      />
    );
  }

  if (currentView === 'shop') {
    return (
      <Shop
        onBack={handleBackFromShop}
        balance={balance}
        onBalanceUpdate={setBalance}
        telegramId={telegramId}
      />
    );
  }

  // 게임 뷰 (세로 모드에서도 가로 비율 유지하며 진행)
  return (
    <div className={`game-container ${isGamePlaying ? 'game-playing' : ''} ${isPCWebEnvironment ? 'pc-web' : ''} ${!isLandscape ? 'portrait-mode' : ''}`}>
      <GameCanvas
        gameRunning={gameRunning}
        gameReady={gameReady}
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        onGameBegin={handleGameBegin}
        onBountyCollected={handleBountyCollected}
        isGamePlaying={isGamePlaying}
        isPCWebEnvironment={isPCWebEnvironment}
        inventory={inventory}
        telegramId={telegramId}
        onInventoryUpdate={setInventory}
        isLandscape={isLandscape}
      />
    </div>
  );
};

export default Game;

