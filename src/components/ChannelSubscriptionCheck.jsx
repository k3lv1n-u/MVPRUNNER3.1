import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import './ChannelSubscriptionCheck.css';

/**
 * 채널 가입 확인 컴포넌트
 * 
 * 서버 측에서 채널 가입 여부를 100% 정확하게 검증합니다.
 * 
 * 작동 방식:
 * 1. 앱 시작 300ms 후 자동 검사
 * 2. 3초마다 자동 재검사 (가입 화면일 때만)
 * 3. "Я подписался на все каналы" 버튼 클릭 시 즉시 검사
 * 4. Telegram.initData 전체를 서버로 전송하여 HMAC 검증
 * 5. 서버에서 getChatMember로 각 채널 가입 여부 확인
 * 6. 모두 가입했으면 onComplete() 호출하여 다음 단계로 진행
 */
const ChannelSubscriptionCheck = ({ onComplete }) => {
  const [channels, setChannels] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState({});
  const [allSubscribed, setAllSubscribed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Telegram WebApp 인스턴스 가져오기
  const getTelegramWebApp = () => {
    if (typeof window === 'undefined' || !window.Telegram || !window.Telegram.WebApp) {
      return null;
    }
    return window.Telegram.WebApp;
  };

  // 채널 목록 로드
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const response = await api.getRequiredChannels();
        if (response && response.channels) {
          setChannels(response.channels);

          // 초기 상태 설정
          const initialStatus = {};
          response.channels.forEach(ch => {
            initialStatus[ch.url] = false;
          });
          setSubscriptionStatus(initialStatus);
        }
      } catch (error) {
        console.error('[ChannelCheck] Error loading channels:', error);
        setError('Ошибка загрузки списка каналов');
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, []);

  /**
   * initData가 준비될 때까지 대기 (모바일 대응)
   * 모바일에서는 initData가 즉시 사용 가능하지 않을 수 있음
   */
  const waitForInitData = useCallback(async (maxRetries = 10) => {
    const tg = getTelegramWebApp();
    if (!tg) return null;

    for (let i = 0; i < maxRetries; i++) {
      if (tg.initData) {
        
        return tg.initData;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms 대기
    }

    return null;
  }, []);

  /**
   * 서버에서 채널 가입 여부 확인
   * 
   * Telegram WebApp의 initData 전체를 서버로 전송하여:
   * 1. HMAC 검증 (위조 방지)
   * 2. user.id 추출
   * 3. getChatMember로 각 채널 가입 여부 확인
   */
  const checkChannelSubscription = useCallback(async () => {
    const tg = getTelegramWebApp();
    if (!tg) {
      console.error('[ChannelCheck] Telegram WebApp not available');
      setError('Пожалуйста, откройте приложение через Telegram');
      return;
    }

    // initData를 기다림 (최대 5초)
    const initData = await waitForInitData();

    if (!initData) {
      console.error('[ChannelCheck] initData not available after waiting');

      // 디버그 정보 수집
      const debugInfo = {
        hasTelegram: !!window.Telegram,
        hasWebApp: !!window.Telegram?.WebApp,
        platform: tg.platform,
        version: tg.version
      };
      console.error('[ChannelCheck] Debug info:', debugInfo);

      setError(`Не удалось получить данные авторизации (Platform: ${tg.platform || 'unknown'}). Пожалуйста, перезапустите приложение через бота.`);

      // 사용자에게 알림
      if (tg.showAlert) {
        tg.showAlert('Ошибка инициализации. Пожалуйста, закройте и откройте приложение снова через бота.');
      }
      return;
    }

    setChecking(true);
    setError(null);

    try {

      // 서버로 initData 전송하여 채널 가입 여부 확인
      const response = await api.checkChannelSubscription(initData);

      if (!response.success) {
        throw new Error(response.error || 'Ошибка проверки подписки');
      }


      // 각 채널의 가입 상태 업데이트
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
      setAllSubscribed(allSubscribedFlag);


      // 모두 가입했으면 다음 단계로 진행
      if (allSubscribedFlag) {
        // localStorage에 가입 완료 상태 저장
        localStorage.setItem('channelsSubscribed', 'true');
        localStorage.setItem('channelsSubscribedAt', new Date().toISOString());

        // onComplete 호출하여 다음 단계로 진행
        if (onComplete) {
          onComplete();
        }
      }

    } catch (error) {
      console.error('[ChannelCheck] Error checking subscription:', error);
      setError(error.message || 'Ошибка проверки подписки');

      // 사용자에게 친절한 에러 메시지 표시
      const tg = getTelegramWebApp();
      if (tg && tg.showAlert) {
        tg.showAlert(
          'Ошибка при проверке подписки. Пожалуйста, убедитесь, что вы подписаны на все каналы и попробуйте снова.'
        );
      }
    } finally {
      setChecking(false);
    }
  }, [onComplete, waitForInitData]);

  // 앱 시작 1초 후 자동 검사 (모바일 대응)
  useEffect(() => {
    if (channels.length === 0) return;

    const timer = setTimeout(() => {
      checkChannelSubscription();
    }, 1000); // 모바일에서 initData 준비 시간 확보

    return () => clearTimeout(timer);
  }, [channels, checkChannelSubscription]);

  // 3초마다 자동 재검사 (가입 화면일 때만, 즉 allSubscribed가 false일 때)
  useEffect(() => {
    if (channels.length === 0 || allSubscribed) return;

    const interval = setInterval(() => {
      if (!checking) {
        checkChannelSubscription();
      }
    }, 3000); // 3초마다

    return () => clearInterval(interval);
  }, [channels, checking, allSubscribed, checkChannelSubscription]);

  // 채널 링크 열기
  const openChannel = (url) => {
    const tg = getTelegramWebApp();
    if (tg && tg.openLink) {
      tg.openLink(url);
    } else {
      // fallback: 새 창에서 열기
      window.open(url, '_blank');
    }
  };

  // "Я подписался на все каналы" 버튼 클릭 핸들러
  const handleVerifyClick = async () => {
    if (checking) return;

    await checkChannelSubscription();
  };

  // 별 배경 생성
  const stars = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2
    }));
  }, []);

  // 로딩 화면
  if (loading) {
    return (
      <div className="channel-check-container">
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
        <div className="channel-check-content">
          <div className="loading-spinner"></div>
          <h2 className="channel-check-title">Загрузка...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="channel-check-container">
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

      <div className="channel-check-content">
        <div className="channel-check-header">
          <div className="channel-check-icon">📢</div>
          <h2 className="channel-check-title">Подпишитесь на каналы</h2>
          <p className="channel-check-subtitle">
            Для продолжения необходимо подписаться на все указанные каналы
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="channel-check-error">
            {error}
          </div>
        )}

        {/* 채널 목록 */}
        <div className="channels-list">
          {channels.map((channel, index) => {
            const isSubscribed = subscriptionStatus[channel.url] === true;
            return (
              <div
                key={channel.url}
                className={`channel-item ${isSubscribed ? 'subscribed' : ''}`}
              >
                <div className="channel-number">{index + 1}</div>
                <div className="channel-info">
                  <h3 className="channel-title">{channel.title || `Канал ${index + 1}`}</h3>
                  <p className="channel-url">{channel.url}</p>
                </div>
                <div className="channel-status">
                  {isSubscribed ? (
                    <span className="status-icon subscribed" title="Подписан">✓</span>
                  ) : (
                    <span className="status-icon not-subscribed" title="Не подписан">○</span>
                  )}
                </div>
                {!isSubscribed ? (
                  <button
                    className="channel-join-btn"
                    onClick={() => openChannel(channel.url)}
                    disabled={checking}
                  >
                    Подписаться
                  </button>
                ) : (
                  <div className="channel-subscribed-label">
                    Подписан
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 검사 중 표시 */}
        {checking && (
          <div className="channel-check-loading">
            <div className="loading-spinner-small"></div>
            <span>Проверка подписки...</span>
          </div>
        )}

        {/* 힌트 메시지 */}
        <div className="channel-check-hint">
          {allSubscribed ? (
            <p className="hint-success">✅ Все каналы подписаны! Переход к игре...</p>
          ) : (
            <p className="hint-info">
              {checking
                ? 'Проверка подписки...'
                : 'Подпишитесь на все каналы выше, затем нажмите кнопку ниже'}
            </p>
          )}
        </div>

        {/* 확인 버튼 */}
        <div className="channel-check-footer">
          <button
            className="channel-verify-btn"
            onClick={handleVerifyClick}
            disabled={checking || allSubscribed}
          >
            {checking ? 'Проверка...' : 'Я подписался на все каналы'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelSubscriptionCheck;
