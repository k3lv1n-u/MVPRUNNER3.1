/**
 * Coin Leaderboard Tab 컴포넌트
 * 기존 index.html의 loadCoinLeaderboard 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { LeaderboardEntry } from '../types';

const CoinLeaderboardTab: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(100);

  const loadCoinLeaderboard = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{
        leaderboard: LeaderboardEntry[];
      }>(API_ENDPOINTS.LEADERBOARD.COINS, { limit });

      if (response.success && response.leaderboard) {
        setLeaderboard(response.leaderboard);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading coin leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoinLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return (
    <div className="tab-content" id="coin-leaderboard">
      <div className="controls">
        <input
          type="number"
          id="coinLeaderboardLimit"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
          placeholder="На странице"
          style={{ width: '120px' }}
          min="10"
          max="200"
        />
        <button type="button" className="btn" onClick={loadCoinLeaderboard}>
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ранг</th>
                <th>Telegram ID</th>
                <th>Имя</th>
                <th>Игровые монеты</th>
                <th>Рекорд</th>
                <th>Игр</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.telegramId}>
                  <td>{entry.rank}</td>
                  <td>{entry.telegramId}</td>
                  <td>{entry.username || 'N/A'}</td>
                  <td>
                    <strong>{(entry.balance || 0).toLocaleString()}</strong>
                  </td>
                  <td>{entry.highScore.toLocaleString()}</td>
                  <td>{entry.totalGames}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CoinLeaderboardTab;

