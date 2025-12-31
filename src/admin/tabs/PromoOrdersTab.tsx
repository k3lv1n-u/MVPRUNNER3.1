/**
 * Promo Orders Tab 컴포넌트
 * 기존 index.html의 loadPromoCodeOrders 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { PromoCodeRequest } from '../types';

interface WeeklyTopPlayersInfo {
  goal: {
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    targetScore: number;
    description?: string;
    isActive: boolean;
  } | null;
  topPlayers: Array<{
    rank: number;
    telegramId: number;
    username: string;
    avatar?: string | null;
    score: number;
    playedAt: string;
    hasPromoCode: boolean;
  }>;
  total: number;
}

const PromoOrdersTab: React.FC = () => {
  const [requests, setRequests] = useState<PromoCodeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [weeklyTopPlayers, setWeeklyTopPlayers] = useState<WeeklyTopPlayersInfo | null>(null);
  const [weeklyTopPlayersError, setWeeklyTopPlayersError] = useState('');

  const loadPromoCodeOrders = async () => {
    setLoading(true);
    setError('');

    try {
      const url = statusFilter
        ? `${API_ENDPOINTS.PROMO_CODE_REQUESTS.LIST}?status=${statusFilter}`
        : API_ENDPOINTS.PROMO_CODE_REQUESTS.LIST;

      const response = await apiClient.get<{ requests: PromoCodeRequest[] }>(
        url
      );

      if (response.success && response.requests) {
        setRequests(response.requests);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading promo code orders');
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyTopPlayers = async () => {
    setWeeklyTopPlayersError('');

    try {
      const response = await apiClient.get<WeeklyTopPlayersInfo & { message?: string }>(
        API_ENDPOINTS.WEEKLY_GOALS.TOP_PLAYERS
      );

      if (response.success) {
        setWeeklyTopPlayers({
          goal: (response as any).goal || null,
          topPlayers: (response as any).topPlayers || [],
          total: (response as any).total || 0,
        });
      } else {
        setWeeklyTopPlayersError(response.error || 'Не удалось загрузить топ-5 игроков недели');
      }
    } catch (err: any) {
      setWeeklyTopPlayersError(err.message || 'Ошибка при загрузке топ-5 игроков недели');
    }
  };

  useEffect(() => {
    // 초기 로드
    loadPromoCodeOrders();
    loadWeeklyTopPlayers();

    // 실시간에 가깝게 보기 위해 주기적으로 주간 TOP5 새로고침 (예: 30초마다)
    const intervalId = window.setInterval(() => {
      loadWeeklyTopPlayers();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleApprove = async (orderId: string) => {
    if (!window.confirm('Одобрить и выдать промокод?')) {
      return;
    }

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.PROMO_CODE_REQUESTS.APPROVE(orderId),
        { wheelConfigId: null, adminNote: '' }
      );

      if (response.success) {
        window.alert(
          `Промокод выдан успешно!\nКод: ${response.promoCode?.code || 'N/A'}\nПользователь: ${response.request?.username || 'N/A'}`
        );
        loadPromoCodeOrders();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to approve order'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleReject = async (orderId: string) => {
    const adminNote = window.prompt('Причина отклонения:') || '';
    if (adminNote === '' && !window.confirm('Отклонить без указания причины?')) {
      return;
    }

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.PROMO_CODE_REQUESTS.REJECT(orderId),
        { adminNote }
      );

      if (response.success) {
        window.alert('Запрос отклонен');
        loadPromoCodeOrders();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to reject order'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleCopyPromoCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      window.alert(`Код скопирован: ${code}`);
    } catch (err) {
      window.alert(`Ошибка копирования: ${err}`);
    }
  };

  const handleIssuePromoCodeToPlayer = async (player: { rank: number; telegramId: number; username: string; score: number; hasPromoCode: boolean }) => {
    if (!weeklyTopPlayers || !weeklyTopPlayers.goal) {
      window.alert('Нет данных о недельной цели');
      return;
    }

    if (player.hasPromoCode) {
      window.alert('Этот игрок уже получил промокод');
      return;
    }

    if (
      !window.confirm(
        `Выдать промокод игроку?\n\n` +
          `Ранг: ${player.rank}\n` +
          `Пользователь: ${player.username} (ID: ${player.telegramId})\n` +
          `Результат: ${player.score.toLocaleString()}\n` +
          `Цель: ${weeklyTopPlayers.goal.targetScore.toLocaleString()}`
      )
    ) {
      return;
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.WEEKLY_GOALS.ISSUE_PROMO_CODE, {
        goalId: weeklyTopPlayers.goal.id,
        telegramId: player.telegramId,
        wheelConfigId: null,
      });

      if (response.success) {
        window.alert(
          `Промокод выдан!\nКод: ${response.promoCode?.code || 'N/A'}\nПользователь: ${response.promoCode?.username || player.username}`
        );
        loadPromoCodeOrders();
        loadWeeklyTopPlayers();
      } else {
        window.alert(`Ошибка: ${response.error || 'Не удалось выдать промокод'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка при выдаче промокода: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">Ожидание</span>;
      case 'approved':
        return <span className="status-badge approved">Одобрено</span>;
      case 'issued':
        return <span className="status-badge issued">Выдано</span>;
      case 'rejected':
        return <span className="status-badge rejected">Отклонено</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="tab-content" id="promo-orders">
      <div className="page-header">
        <h1 className="page-title">Promo Code Orders</h1>
        <p className="page-subtitle">
          Управление заказами промокодов и их статусами
        </p>
      </div>

      {/* Weekly Top 5 Players Panel */}
      <div className="data-table-container" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '16px' }}>
          <h3 style={{ marginBottom: '10px' }}>🏆 Топ-5 игроков недели</h3>
          {weeklyTopPlayersError && (
            <div className="error" style={{ marginBottom: '10px' }}>
              {weeklyTopPlayersError}
            </div>
          )}
          {!weeklyTopPlayers || !weeklyTopPlayers.goal ? (
            <div className="error">Нет данных о недельной цели</div>
          ) : weeklyTopPlayers.topPlayers.length === 0 ? (
            <div className="error">
              За этот период никто не достиг недельной цели (
              {weeklyTopPlayers.goal.targetScore.toLocaleString()}).
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                Период:{' '}
                {new Date(weeklyTopPlayers.goal.weekStartDate).toLocaleDateString('ru-RU')} -{' '}
                {new Date(weeklyTopPlayers.goal.weekEndDate).toLocaleDateString('ru-RU')}
                <br />
                <strong>Цель:</strong> {weeklyTopPlayers.goal.targetScore.toLocaleString()}
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Ранг</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Пользователь</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Результат</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Статус</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyTopPlayers.topPlayers.map((player) => (
                      <tr key={player.telegramId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px' }}>{player.rank}</td>
                        <td style={{ padding: '8px' }}>
                          {player.username}
                          <br />
                          <small style={{ color: 'var(--text-tertiary)' }}>
                            ID: {player.telegramId}
                          </small>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          {player.score.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {player.hasPromoCode ? (
                            <span className="status-badge issued" style={{ fontSize: '10px' }}>
                              Выдан
                            </span>
                          ) : (
                            <span className="status-badge pending" style={{ fontSize: '10px' }}>
                              Не выдан
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {!player.hasPromoCode ? (
                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={() => handleIssuePromoCodeToPlayer(player)}
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              Выдать
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="search-filter-bar">
        <button type="button" className="btn" onClick={loadPromoCodeOrders}>
          Обновить
        </button>
        <select
          id="orderStatusFilter"
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="pending">Ожидание</option>
          <option value="approved">Одобрено</option>
          <option value="issued">Выдано</option>
          <option value="rejected">Отклонено</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : requests.length === 0 ? (
        <div className="error">Нет запросов</div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Тип</th>
                <th>Пользователь</th>
                <th>Детали</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const isWeeklyGoal = request.type === 'weekly-goal';
                const typeLabel = isWeeklyGoal
                  ? '🏆 Лидер недели (недельная цель)'
                  : '🛒 Покупка в магазине';

                let details = '';
                if (isWeeklyGoal) {
                  details = `Цель: ${request.targetScore?.toLocaleString() || 'N/A'}<br>Лучший результат за неделю: ${request.actualScore?.toLocaleString() || 'N/A'}`;
                } else {
                  details = `Товар: ${request.shopItemId?.name || 'N/A'}<br>Цена: ${request.shopPurchasePrice || 0} монет`;
                }

                return (
                  <tr key={request._id}>
                    <td>{typeLabel}</td>
                    <td>
                      {request.userId?.username || 'N/A'}
                      <br />
                      <small style={{ color: 'var(--text-tertiary)' }}>
                        ID: {request.telegramId}
                      </small>
                    </td>
                    <td>
                      <small
                        style={{ color: 'var(--text-secondary)' }}
                        dangerouslySetInnerHTML={{ __html: details }}
                      />
                    </td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(request.requestedAt).toLocaleString('ru-RU')}
                    </td>
                    <td>
                      {request.status === 'pending' ? (
                        <>
                          <button
                            className="btn btn-success"
                            onClick={() => handleApprove(request._id)}
                            style={{
                              padding: '8px 16px',
                              fontSize: '12px',
                              marginRight: '8px',
                            }}
                          >
                            Одобрить
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleReject(request._id)}
                            style={{ padding: '8px 16px', fontSize: '12px' }}
                          >
                            Отклонить
                          </button>
                        </>
                      ) : request.status === 'issued' &&
                        request.promoCodeId ? (
                        <span
                          className="promo-code-chip"
                          onClick={() =>
                            handleCopyPromoCode(request.promoCodeId?.code || '')
                          }
                        >
                          {request.promoCodeId?.code || 'N/A'}
                        </span>
                      ) : (
                        '-'
                      )}
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

export default PromoOrdersTab;

