import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import './Welcome.css';

const Welcome = ({ onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loadingStep, setLoadingStep] = useState('connecting');
  const [tempAvatar, setTempAvatar] = useState(null);
  const [tempUsername, setTempUsername] = useState(null);
  const [showChannelCheck, setShowChannelCheck] = useState(false);
  const [channels, setChannels] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState({});
  const [checkingChannels, setCheckingChannels] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        setLoading(true);
        setError(null);
        setLoadingStep('connecting');

        if (!window.Telegram || !window.Telegram.WebApp) {
          throw new Error('이 앱은 Telegram에서만 실행할 수 있습니다');
        }

        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();


        const initData = tg.initData;
        if (!initData) {
          throw new Error('Telegram 사용자 정보를 가져올 수 없습니다. 앱을 다시 시작해주세요.');
        }

        setLoadingStep('authenticating');

        const params = new URLSearchParams(initData);
        const userParam = params.get('user');

        if (!userParam) {
          throw new Error('사용자 데이터가 없습니다. 봇을 통해 앱을 다시 시작해주세요.');
        }

        const telegramUser = JSON.parse(decodeURIComponent(userParam));

        if (!telegramUser || !telegramUser.id) {
          throw new Error('유효하지 않은 사용자 정보입니다.');
        }

        const telegramId = telegramUser.id;
        const username = telegramUser.username || telegramUser.first_name || `user_${telegramUser.id}`;
        const firstName = telegramUser.first_name || null;
        const lastName = telegramUser.last_name || null;
        const avatar = telegramUser.photo_url || null;

        setTempAvatar(avatar);
        setTempUsername(username);


        await new Promise(resolve => setTimeout(resolve, 300));

        setLoadingStep('syncing');

        const userData = await api.createOrUpdateUser(telegramId, {
          username,
          firstName,
          lastName,
          avatar
        });

        if (!userData || !userData.user) {
          throw new Error('서버 연결에 실패했습니다');
        }

        const user = userData.user;

        if (user.isBlocked === true) {
          localStorage.setItem('accountBlocked', 'true');
          if (user.blockReason) {
            localStorage.setItem('accountBlockedReason', user.blockReason);
          }
        } else {
          localStorage.removeItem('accountBlocked');
          localStorage.removeItem('accountBlockedReason');
        }

        localStorage.setItem('telegramId', telegramId.toString());
        localStorage.setItem('username', user.username || username);
        // 서버에서 내려온 balance 값을 그대로 저장 (0도 유효한 값이므로 기본값 94로 덮어쓰지 않음)
        localStorage.setItem('balance', (typeof user.balance === 'number' ? user.balance : 0).toString());
        localStorage.setItem('highScore', (user.highScore || 0).toString());

        setLoadingStep('complete');

        setUserInfo({
          telegramId: user.telegramId,
          username: user.username,
          avatar: user.avatar,
          balance: typeof user.balance === 'number' ? user.balance : 0,
          highScore: user.highScore || 0,
          isNewUser: !user.totalGames || user.totalGames === 0
        });

        // 채널 목록 로드
        setLoadingStep('checking_channels');
        const channelsResponse = await api.getRequiredChannels();

        if (channelsResponse && channelsResponse.channels && channelsResponse.channels.length > 0) {
          setChannels(channelsResponse.channels);

          const initialStatus = {};
          channelsResponse.channels.forEach(ch => {
            initialStatus[ch.url] = false;
          });
          setSubscriptionStatus(initialStatus);

          setLoading(false);
          setShowChannelCheck(true);
        } else {
          setTimeout(() => {
            onComplete(user);
          }, 500);
        }

      } catch (err) {
        console.error('[Welcome] Error:', err);
        setError(err.message || '초기화 중 오류가 발생했습니다');
        setLoading(false);
      }
    };

    initializeUser();
  }, [onComplete]);

  // 채널 구독 확인
  const checkChannelSubscription = useCallback(async () => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setError('Telegram WebApp недоступен');
      return;
    }

    const initData = tg.initData;
    if (!initData) {
      setError('Не удалось получить данные авторизации');
      return;
    }

    setCheckingChannels(true);

    try {
      const response = await api.checkChannelSubscription(initData);

      if (!response.success) {
        throw new Error(response.error || 'Ошибка проверки подписки');
      }

      const status = {};
      let allSubscribedFlag = true;

      if (response.channels && Array.isArray(response.channels)) {
        response.channels.forEach(channel => {
          status[channel.url] = channel.subscribed === true;
          if (!channel.subscribed) {
            allSubscribedFlag = false;
          }
        });
      }

      setSubscriptionStatus(status);

      if (allSubscribedFlag && userInfo) {
        localStorage.setItem('channelsSubscribed', 'true');
        localStorage.setItem('channelsSubscribedAt', new Date().toISOString());

        setTimeout(() => {
          onComplete(userInfo);
        }, 500);
      }

    } catch (error) {
      console.error('[Welcome] Error checking subscription:', error);
      setError(error.message || 'Ошибка проверки подписки');
    } finally {
      setCheckingChannels(false);
    }
  }, [userInfo, onComplete]);

  // 채널 링크 열기
  const openChannel = (url) => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const stars = useMemo(() => {
    return [...Array(30)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2
    }));
  }, []);

  // 채널 체크 화면 (모바일 최적화)
  if (showChannelCheck) {
    const allSubscribed = channels.every(ch => subscriptionStatus[ch.url] === true);

    return (
      <div className="welcome-container">
        <div className="stars-background">
          {stars.map((star) => (
            <div
              key={star.id}
              className="star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`
              }}
            ></div>
          ))}
        </div>

        <div style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          {/* 헤더 */}
          <div style={{ textAlign: 'center', marginBottom: '20px', flexShrink: 0 }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📢</div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 8px 0',
              color: 'white'
            }}>
              Подпишитесь на каналы
            </h2>
            <p style={{
              opacity: 0.7,
              fontSize: '13px',
              margin: 0,
              color: 'white'
            }}>
              Для продолжения подпишитесь на все каналы
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div style={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '15px',
              color: '#ff6b6b',
              fontSize: '13px',
              flexShrink: 0
            }}>
              {error}
            </div>
          )}

          {/* 채널 리스트 */}
          <div style={{ flex: 1, overflow: 'auto', marginBottom: '15px' }}>
            {channels.map((channel, index) => {
              const isSubscribed = subscriptionStatus[channel.url] === true;
              return (
                <div
                  key={channel.url}
                  style={{
                    background: isSubscribed ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${isSubscribed ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    flexShrink: 0,
                    color: 'white'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 'bold',
                      marginBottom: '3px',
                      fontSize: '14px',
                      color: 'white',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {channel.title || `Канал ${index + 1}`}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.6,
                      color: 'white',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {channel.url}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isSubscribed ? (
                      <span style={{ color: '#4ade80', fontSize: '20px' }}>✓</span>
                    ) : (
                      <button
                        onClick={() => openChannel(channel.url)}
                        disabled={checkingChannels}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          color: 'white',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '12px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Открыть
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 로딩 인디케이터 */}
          {checkingChannels && (
            <div style={{
              textAlign: 'center',
              marginBottom: '15px',
              opacity: 0.8,
              flexShrink: 0,
              color: 'white'
            }}>
              <div className="loading-spinner" style={{
                width: '24px',
                height: '24px',
                margin: '0 auto 8px'
              }}></div>
              <div style={{ fontSize: '13px' }}>Проверка подписки...</div>
            </div>
          )}

          {/* 확인 버튼 */}
          <div style={{ flexShrink: 0 }}>
            <button
              onClick={checkChannelSubscription}
              disabled={checkingChannels || allSubscribed}
              style={{
                width: '100%',
                background: allSubscribed
                  ? 'rgba(0, 255, 0, 0.2)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: checkingChannels || allSubscribed ? 'not-allowed' : 'pointer',
                opacity: checkingChannels || allSubscribed ? 0.6 : 1
              }}
            >
              {checkingChannels ? 'Проверка...' : allSubscribed ? 'Все подписаны!' : 'Я подписался'}
            </button>

            <p style={{
              textAlign: 'center',
              marginTop: '10px',
              fontSize: '11px',
              opacity: 0.6,
              color: 'white',
              margin: '10px 0 0 0'
            }}>
              {allSubscribed
                ? '✅ Переход к игре...'
                : 'Подпишитесь на все каналы'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-container">
      <div className="stars-background">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`
            }}
          ></div>
        ))}
      </div>

      <div className="welcome-content">
        {loading && (
          <div className="welcome-loading">
            {tempAvatar ? (
              <div style={{ marginBottom: '15px', position: 'relative' }}>
                <img
                  src={tempAvatar}
                  alt="Avatar"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const placeholder = e.target.nextSibling;
                    if (placeholder) {
                      placeholder.style.display = 'flex';
                    }
                  }}
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    objectFit: 'cover'
                  }}
                />
                <div
                  className="avatar-placeholder"
                  style={{
                    display: 'none',
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: '#222222',
                    color: '#ffffff',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {tempUsername ? tempUsername.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
            ) : (
              <div className="loading-spinner"></div>
            )}
            <h2 className="welcome-title" style={{ fontSize: '18px', margin: '0 0 8px 0' }}>
              {loadingStep === 'connecting' && 'Подключение...'}
              {loadingStep === 'authenticating' && 'Аутентификация...'}
              {loadingStep === 'syncing' && 'Синхронизация...'}
              {loadingStep === 'complete' && 'Готово!'}
              {loadingStep === 'checking_channels' && 'Проверка каналов...'}
            </h2>
            {tempUsername && (
              <p style={{
                marginTop: '5px',
                opacity: 0.7,
                fontSize: '14px',
                color: 'white'
              }}>
                {tempUsername}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="welcome-error">
            <h2 className="welcome-title">Ошибка</h2>
            <p className="welcome-message">{error}</p>
            <p className="welcome-submessage">Пожалуйста, откройте приложение через Telegram бота</p>
          </div>
        )}

        {!loading && !error && userInfo && (
          <div className="welcome-success">
            <div className="welcome-avatar" style={{ position: 'relative' }}>
              {userInfo.avatar ? (
                <>
                  <img
                    src={userInfo.avatar}
                    alt="Avatar"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const placeholder = e.target.nextSibling;
                      if (placeholder) {
                        placeholder.style.display = 'flex';
                      }
                    }}
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                  <div
                    className="avatar-placeholder"
                    style={{
                      display: 'none',
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      background: '#222222',
                      color: '#ffffff',
                      fontSize: '28px',
                      fontWeight: 'bold',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }}
                  >
                    {userInfo.username ? userInfo.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                </>
              ) : (
                <div className="avatar-placeholder">
                  {userInfo.username ? userInfo.username.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <h2 className="welcome-title">
              {userInfo.isNewUser ? 'Добро пожаловать!' : 'С возвращением!'}
            </h2>
            <p className="welcome-username">{userInfo.username}</p>
            <p className="welcome-submessage">Запуск игры...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Welcome;
