import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './PromoCodeReceiver.css';

const PromoCodeReceiver = ({ telegramId, onClose, onGoToWheel }) => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (telegramId) {
      loadPromoCodes();
    }
  }, [telegramId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPromoCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const codes = await api.getUserPromoCodes(parseInt(telegramId));
      // 미사용 코드만 표시
      const unusedCodes = codes.filter(code => !code.isUsed);
      setPromoCodes(unusedCodes);
    } catch (err) {
      console.error('Error loading promo codes:', err);
      setError('Не удалось загрузить промокоды');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (e) {
        console.error('Failed to copy:', e);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleUseCode = (code) => {
    // 코드 복사
    copyToClipboard(code);
    // 행운의 휠로 이동
    if (onGoToWheel) {
      onGoToWheel(code);
    }
  };

  return (
    <div className="promo-code-receiver">
      <div className="stars-background">
        {[...Array(30)].map((_, i) => (
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

      <div className="promo-receiver-content">
        <div className="promo-receiver-header">
          <h1 className="promo-receiver-title">ПРОМОКОДЫ</h1>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="loading-message">Загрузка...</div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {!loading && !error && (
          <>
            {promoCodes.length === 0 ? (
              <div className="empty-message">
                <div className="empty-icon">📭</div>
                <p>У вас нет доступных промокодов</p>
                <p className="empty-hint">Промокоды выдаются администратором</p>
              </div>
            ) : (
              <div className="promo-codes-list">
                {promoCodes.map((promoCode) => (
                  <div key={promoCode.id} className="promo-code-card">
                    <div className="promo-code-info">
                      <div className="promo-code-label">Ваш промокод:</div>
                      <div className="promo-code-value">{promoCode.code}</div>
                      {promoCode.weeklyGoal && (
                        <div className="promo-code-source">
                          🏆 За достижение недельной цели
                        </div>
                      )}
                    </div>
                    <div className="promo-code-actions">
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(promoCode.code)}
                      >
                        {copiedCode === promoCode.code ? '✓ Скопировано' : '📋 Копировать'}
                      </button>
                      <button
                        className="use-btn"
                        onClick={() => handleUseCode(promoCode.code)}
                      >
                        🎡 Использовать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PromoCodeReceiver;

