import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import soundManager from '../utils/soundManager';
import './Shop.css';

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
    return [...Array(50)].map((_, i) => (
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
    ));
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
                <h2 style={{ color: '#fff', marginTop: '20px', marginBottom: '10px' }}>Предметы</h2>
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
                      <div key={item.id} className="promo-code-card">
                        <div className="promo-code-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            {iconUrl && (
                              <img
                                src={iconUrl}
                                alt={item.name}
                                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                              />
                            )}
                            <h3 className="promo-code-title" style={{ margin: 0 }}>
                              {item.name || 'Игровой предмет'}
                            </h3>
                          </div>
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
                              padding: '4px 8px',
                              background: 'rgba(76, 175, 80, 0.2)',
                              border: '1px solid #4CAF50',
                              borderRadius: '4px',
                              color: '#4CAF50',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              Имеется: {ownedQuantity}
                            </div>
                          )}
                        </div>
                        <div className="promo-code-actions">
                          <div className="promo-code-price">
                            <span className="price-value">{item.price}</span>
                            <span className="price-icon">🪙</span>
                          </div>
                          <button
                            className="purchase-btn"
                            onClick={() => { soundManager.playButtonClick(); handleItemPurchase(item.id, item.price); }}
                            disabled={purchasing === item.id || balance < item.price || (item.available !== -1 && item.available <= 0)}
                          >
                            {purchasing === item.id ? 'Покупка...' : 'Купить'}
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
                <h2 style={{ color: '#fff', marginTop: '20px', marginBottom: '10px' }}>Промокоды</h2>
                <div className="promo-codes-list">
                  {promoCodes.map((item) => (
                    <div key={item.id} className="promo-code-card">
                      <div className="promo-code-info">
                        <h3 className="promo-code-title">
                          {item.name || item.description || 'Промокод для рулетки'}
                        </h3>
                        {item.description && (
                          <p className="promo-code-details">
                            {item.description}
                          </p>
                        )}
                        {item.promoCodeConfig?.wheelConfigId && (
                          <p className="promo-code-details">
                            Рулетка: {item.promoCodeConfig.wheelConfigId.name} ({item.promoCodeConfig.wheelConfigId.segments.length} сегментов)
                          </p>
                        )}
                        <div className="promo-code-stock">
                          {item.available === -1 ? 'Безлимит' : `Осталось: ${item.available}`}
                        </div>
                      </div>
                      <div className="promo-code-actions">
                        <div className="promo-code-price">
                          <span className="price-value">{item.price}</span>
                          <span className="price-icon">🪙</span>
                        </div>
                        <button
                          className="purchase-btn"
                          onClick={() => { soundManager.playButtonClick(); handlePurchase(item.id, item.price); }}
                          disabled={purchasing === item.id || balance < item.price || (item.available !== -1 && item.available <= 0)}
                        >
                          {purchasing === item.id ? 'Покупка...' : 'Купить'}
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
            НАЗАД
          </button>
          <button className="refresh-btn" onClick={() => { soundManager.playButtonClick(); loadPromoCodes(); }}>
            ОБНОВИТЬ
          </button>
        </div>
      </div>
    </div>
  );
};

export default Shop;

