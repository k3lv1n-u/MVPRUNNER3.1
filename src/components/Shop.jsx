import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import soundManager from '../utils/soundManager';
import './Shop.css';
import './ChristmasStyles.css';

const Shop = ({ onBack, balance, onBalanceUpdate, telegramId }) => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight;
    }
    return false;
  });

  const stars = useMemo(() => {
    return [...Array(50)].map((_, i) => {
      const size = 2 + Math.random() * 4; // 2-6px
      return (
        <div
          key={i}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`
          }}
        ></div>
      );
    });
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkOrientation, 100);
    });

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const loadInventory = useCallback(async () => {
    if (!telegramId) return;
    try {
      const userInventory = await api.getUserInventory(parseInt(telegramId));
      setInventory(userInventory || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  }, [telegramId]);

  const loadPromoCodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allItems = await api.getActiveShopItems();
      // 프로모션 코드와 아이템 분리
      const promoItems = allItems.filter(item => item.type === 'promo-code');
      const gameItems = allItems.filter(item => item.type === 'item');
      setPromoCodes(promoItems);
      setItems(gameItems);
    } catch (err) {
      console.error('Error loading shop items:', err);
      setError('Не удалось загрузить товары');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromoCodes();
    loadInventory();
  }, [loadPromoCodes, loadInventory]);

  const handlePurchase = async (codeId, price) => {
    if (!telegramId) {
      alert('Ошибка: Telegram ID не найден');
      return;
    }

    if (balance < price) {
      alert('Недостаточно средств');
      return;
    }

    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm(`Купить промокод за ${price} монет?`)) {
      return;
    }

    try {
      setPurchasing(codeId);
      const result = await api.purchasePromoCode(parseInt(telegramId), codeId);

      if (result.success) {
        alert(`Запрос на покупку отправлен!\nОжидайте одобрения администратора.\nВаш баланс: ${result.balance} монет`);

        // 잔액 업데이트
        if (onBalanceUpdate) {
          onBalanceUpdate(result.balance);
        }

        localStorage.setItem('balance', result.balance.toString());

        // 목록 새로고침
        loadPromoCodes();
      }
    } catch (err) {
      console.error('Error purchasing promo code:', err);
      alert(`Ошибка: ${err.message || 'Не удалось купить промокод'}`);
    } finally {
      setPurchasing(null);
    }
  };

  const handleItemPurchase = async (itemId, price) => {
    if (!telegramId) {
      alert('Ошибка: Telegram ID не найден');
      return;
    }

    if (balance < price) {
      alert('Недостаточно средств');
      return;
    }

    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm(`Купить предмет за ${price} монет?`)) {
      return;
    }

    try {
      setPurchasing(itemId);
      const result = await api.purchaseItem(parseInt(telegramId), itemId);

      if (result.success) {
        alert(`Предмет куплен!\nВаш баланс: ${result.balance} монет`);

        // 잔액 업데이트
        if (onBalanceUpdate) {
          onBalanceUpdate(result.balance);
        }

        localStorage.setItem('balance', result.balance.toString());

        // 목록 새로고침
        loadPromoCodes();
        loadInventory();
      }
    } catch (err) {
      console.error('Error purchasing item:', err);
      alert(`Ошибка: ${err.message || 'Не удалось купить предмет'}`);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className={`shop-container ${isLandscape ? 'landscape-mode' : ''}`}>
      <div className="stars-background">{stars}</div>
      <div className="shop-content">
        <div className="shop-header">
          <h1 className="shop-title">МАГАЗИН</h1>
          <div className="balance-display">
            <span className="balance-label">Баланс:</span>
            <span className="balance-value">{balance}</span>
            <span className="balance-icon">🪙</span>
          </div>
        </div>

        {loading && <div className="loading-message">Загрузка...</div>}
        {error && <div className="error-message">{error}</div>}

        {!loading && !error && (
          <>
            {items.length > 0 && (
              <>
                <h2 style={{ 
                  background: 'linear-gradient(135deg, #ffffff 0%, #ffd700 50%, #ff6b6b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: '1.8em',
                  fontWeight: '900',
                  textAlign: 'center',
                  marginTop: '20px',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.4))'
                }}>Предметы</h2>
                <div className="promo-codes-list">
                  {items.map((item) => {
                    const ownedItem = inventory.find(inv => inv.itemKey === item.itemKey);
                    const ownedQuantity = ownedItem ? ownedItem.quantity : 0;

                    // 아이템 키에 따른 이미지 매핑
                    let iconUrl = null;
                    if (item.itemKey === 'slow-shoes') iconUrl = '/boot1.png';
                    else if (item.itemKey === 'shield') iconUrl = '/shield_inactive.png';
                    else if (item.itemKey === 'magic_syringe') iconUrl = '/magic_syringe.png';
                    else if (item.itemKey === 'money-boost') iconUrl = '/moneypng.png';

                    return (
                      <div key={item.id} className={`promo-code-card ${item.price === 0 ? 'free-item' : ''}`}>
                        <div className="promo-code-info">
                          <div className="item-image-container">
                            {iconUrl ? (
                              <img
                                src={iconUrl}
                                alt={item.name}
                                className="item-image"
                              />
                            ) : (
                              <div className="item-icon">🎁</div>
                            )}
                          </div>
                          <h3 className="promo-code-title">
                            {item.name || 'Игровой предмет'}
                          </h3>
                          {item.description && (
                            <p className="promo-code-details">
                              {item.description}
                            </p>
                          )}
                          <div className="promo-code-stock">
                            {item.available === -1 ? 'Безлимит' : `Осталось: ${item.available}`}
                          </div>
                          {ownedQuantity > 0 && (
                            <div style={{
                              marginTop: '8px',
                              padding: '4px 10px',
                              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(102, 187, 106, 0.3))',
                              border: '1.5px solid rgba(76, 175, 80, 0.6)',
                              borderRadius: '10px',
                              color: '#66BB6A',
                              fontSize: '10px',
                              fontWeight: '900',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              backdropFilter: 'blur(5px)',
                              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2)'
                            }}>
                              Имеется: {ownedQuantity}
                            </div>
                          )}
                        </div>
                        <div className="promo-code-actions">
                          <button
                            className="purchase-btn"
                            onClick={() => { soundManager.playButtonClick(); handleItemPurchase(item.id, item.price); }}
                            disabled={purchasing === item.id || balance < item.price || (item.available !== -1 && item.available <= 0)}
                          >
                            {item.price === 0 ? (
                              <span style={{ fontSize: '1em', fontWeight: '900' }}>БЕСПЛАТНО</span>
                            ) : (
                              <>
                                <span className="price-icon">🪙</span>
                                <span className="price-value">{item.price}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {promoCodes.length > 0 && (
              <>
                <h2 style={{ 
                  background: 'linear-gradient(135deg, #ffffff 0%, #ffd700 50%, #ff6b6b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: '1.8em',
                  fontWeight: '900',
                  textAlign: 'center',
                  marginTop: '20px',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.4))'
                }}>Промокоды</h2>
                <div className="promo-codes-list">
                  {promoCodes.map((item) => (
                    <div key={item.id} className={`promo-code-card ${item.price === 0 ? 'free-item' : ''}`}>
                      <div className="promo-code-info">
                        <div className="item-image-container">
                          <div className="item-icon">🎫</div>
                        </div>
                        <h3 className="promo-code-title">
                          {item.name || item.description || 'Промокод'}
                        </h3>
                        {item.description && (
                          <p className="promo-code-details">
                            {item.description}
                          </p>
                        )}
                        {item.promoCodeConfig?.wheelConfigId && (
                          <p className="promo-code-details">
                            {item.promoCodeConfig.wheelConfigId.name}
                          </p>
                        )}
                        <div className="promo-code-stock">
                          {item.available === -1 ? 'Безлимит' : `Осталось: ${item.available}`}
                        </div>
                      </div>
                      <div className="promo-code-actions">
                        <button
                          className="purchase-btn"
                          onClick={() => { soundManager.playButtonClick(); handlePurchase(item.id, item.price); }}
                          disabled={purchasing === item.id || balance < item.price || (item.available !== -1 && item.available <= 0)}
                        >
                          {item.price === 0 ? (
                            <span style={{ fontSize: '1em', fontWeight: '900' }}>БЕСПЛАТНО</span>
                          ) : (
                            <>
                              <span className="price-icon">🪙</span>
                              <span className="price-value">{item.price}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {promoCodes.length === 0 && items.length === 0 && (
              <div className="empty-message">Нет доступных товаров</div>
            )}
          </>
        )}

        <div className="shop-footer">
          <button className="back-btn" onClick={() => { soundManager.playButtonClick(); onBack(); }}>
            ← НАЗАД
          </button>
          <button className="refresh-btn" onClick={() => { soundManager.playButtonClick(); loadPromoCodes(); }}>
            🔄 ОБНОВИТЬ
          </button>
        </div>
      </div>
    </div>
  );
};

export default Shop;

