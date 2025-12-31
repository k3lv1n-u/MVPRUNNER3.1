/**
 * Shop Management Tab 컴포넌트
 * 기존 index.html의 loadShopItems 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { ShopItem } from '../types';

const ShopManagementTab: React.FC = () => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [priceInputs, setPriceInputs] = useState<Record<string, number>>({});

  const loadShopItems = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{ items: ShopItem[] }>(
        API_ENDPOINTS.SHOP_ITEMS.LIST
      );

      if (response.success && response.items) {
        // 고정 아이템만 필터링
        const fixedItems = response.items.filter(
          (item: ShopItem) =>
            item.itemKey === 'promo-code' ||
            item.itemKey === 'slow-shoes' ||
            item.itemKey === 'shield' ||
            item.itemKey === 'magic_syringe' ||
            item.itemKey === 'money-boost'
        );

        setItems(fixedItems);

        // 가격 입력 필드 초기화
        const priceMap: Record<string, number> = {};
        fixedItems.forEach((item: ShopItem) => {
          priceMap[item._id] = item.price;
        });
        setPriceInputs(priceMap);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading shop items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShopItems();
  }, []);

  const handleUpdatePrice = async (itemId: string) => {
    const newPrice = priceInputs[itemId];
    if (isNaN(newPrice) || newPrice < 0) {
      window.alert('Введите корректную цену (неотрицательное число)');
      return;
    }

    try {
      const response = await apiClient.put(
        API_ENDPOINTS.SHOP_ITEMS.UPDATE(itemId),
        { price: newPrice }
      );

      if (response.success) {
        window.alert('Цена обновлена');
        loadShopItems();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to update price'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleToggleStatus = async (itemId: string, isActive: boolean) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.SHOP_ITEMS.UPDATE(itemId),
        { isActive }
      );

      if (response.success) {
        window.alert(isActive ? 'Продажа разрешена' : 'Продажа остановлена');
        loadShopItems();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to toggle status'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  return (
    <div className="tab-content" id="shop-management">
      <div className="controls">
        <button type="button" className="btn" onClick={loadShopItems}>
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : items.length === 0 ? (
        <div className="error">
          Товары не найдены. Инициализируйте базу данных.
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Цена</th>
                <th>Статус продажи</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const typeLabel =
                  item.type === 'promo-code' ? 'Промокод' : 'Товар';
                const isActive = item.isActive
                  ? '🟢 В продаже'
                  : '🔴 Продажа остановлена';

                return (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.name}</strong>
                      <br />
                      <small>{item.description || ''}</small>
                    </td>
                    <td>{typeLabel}</td>
                    <td>
                      <input
                        type="number"
                        value={priceInputs[item._id] || item.price}
                        onChange={(e) =>
                          setPriceInputs({
                            ...priceInputs,
                            [item._id]: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        style={{ width: '100px', padding: '5px' }}
                      />
                      <button
                        className="btn"
                        onClick={() => handleUpdatePrice(item._id)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          marginLeft: '5px',
                        }}
                      >
                        Сохранить
                      </button>
                    </td>
                    <td>{isActive}</td>
                    <td>
                      <button
                        className={`btn ${item.isActive ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => handleToggleStatus(item._id, !item.isActive)}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        {item.isActive
                          ? 'Остановить продажу'
                          : 'Разрешить продажу'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ShopManagementTab;

