import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import soundManager from '../utils/soundManager';
import './GameOver.css';
import './ChristmasStyles.css';

const GameOver = ({ 
  score, 
  highScore, 
  isNewRecord,
  promoCode,
  onRestart, 
  onBackToMenu,
  onClearPromoCode,
  telegramId,
  onHighScoreUpdate,
  bountiesCollected = 0
}) => {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [serverAcceptedRecord, setServerAcceptedRecord] = useState(true);

  // 컴포넌트 마운트 시 게임 오버 사운드 재생
  useEffect(() => {
    soundManager.playWin();
  }, []);

  // 컴포넌트 마운트 시 서버에 점수 전송
  useEffect(() => {
    const saveScore = async () => {
      if (telegramId) {
        try {
          const result = await api.saveGameRecord(parseInt(telegramId), {
            score,
            isNewRecord,
            coinsCollected: bountiesCollected
          });
          
          // 서버에서 실제로 new record로 인정했는지 확인
          if (result && typeof result.isNewRecord === 'boolean') {
            setServerAcceptedRecord(result.isNewRecord);
          } else {
            setServerAcceptedRecord(true);
          }
          
          // 고득점인 경우 사용자 정보 업데이트
          if (result?.isNewRecord && result?.highScore && onHighScoreUpdate) {
            try {
              onHighScoreUpdate(result.highScore);
            } catch (error) {
              console.error('Failed to update high score:', error);
            }
          }
        } catch (error) {
          console.error('Failed to save game record:', error);
          setServerAcceptedRecord(false);
          // 오프라인 모드로 계속 진행
        }
      }
    };

    saveScore();
  }, [telegramId, score, isNewRecord, onHighScoreUpdate, bountiesCollected]);

  useEffect(() => {
    // 프로모션 코드가 있으면 표시
    if (promoCode) {
      setShowPromoCode(true);
    }
  }, [promoCode]);

  // 크리스마스 눈송이 배경 최적화
  const stars = useMemo(() => {
    return [...Array(50)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 4, // 2-6px
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 10 // 5-15초
    }));
  }, []);
  return (
    <div className="game-over-container">
      {/* 크리스마스 눈송이 배경 */}
      <div className="stars-background">
        {stars.map((star) => (
          <div 
            key={star.id} 
            className="star" 
            style={{
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`
            }}
          ></div>
        ))}
      </div>

      <div className="game-over-content">
        {/* 게임 오버 타이틀 */}
        <div className="game-over-title">
          <h1 className="title-text">GAME OVER</h1>
        </div>

        {/* 점수 표시 영역 */}
        <div className="score-section">
          <div className="score-display">
            <div className="score-label">Ваш счет</div>
            <div className="score-value">{score.toLocaleString()}</div>
          </div>
          
          {isNewRecord && serverAcceptedRecord && (
            <div className="new-record-badge">
              🏆 Новый рекорд!
            </div>
          )}

          {/* 프로모션 코드 수신 알림 */}
          {showPromoCode && promoCode && (
            <div className="promo-code-notification">
              <div className="promo-code-header">
                <div className="promo-code-icon">🎁</div>
                <div className="promo-code-title">Поздравляем!</div>
              </div>
              <div className="promo-code-message">
                Вы первым достигли недельной цели!
              </div>
              <div className="promo-code-display">
                <div className="promo-code-label">Ваш промокод:</div>
                <div className="promo-code-value">{promoCode.code}</div>
              </div>
              <div className="promo-code-instruction">
                Используйте этот код в рулетке для получения приза!
              </div>
              <button 
                className="promo-code-close-btn"
                onClick={() => {
                  setShowPromoCode(false);
                  if (onClearPromoCode) {
                    onClearPromoCode();
                  }
                }}
              >
                Понятно
              </button>
            </div>
          )}
          
          <div className="high-score-display">
            <div className="high-score-label">Лучший счет</div>
            <div className="high-score-value">{highScore.toLocaleString()}</div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="game-over-buttons">
          <button 
            className="game-over-btn restart-btn" 
            onClick={() => {
              soundManager.playButtonClick();
              onRestart();
            }}
          >
            ИГРАТЬ СНОВА
          </button>
          <button 
            className="game-over-btn menu-btn" 
            onClick={() => {
              soundManager.playButtonClick();
              onBackToMenu();
            }}
          >
            В МЕНЮ
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;

