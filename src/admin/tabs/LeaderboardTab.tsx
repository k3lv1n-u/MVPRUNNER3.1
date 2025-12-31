/**
 * Leaderboard Tab 컴포넌트 (Score)
 * 기존 index.html의 loadLeaderboard 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { LeaderboardEntry, Pagination } from '../types';
import PaginationComponent from '../components/Pagination';

const LeaderboardTab: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    return () => {
      // cleanup if needed
    };
  }, []);

  const loadLeaderboard = async (page: number = 1) => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{
        leaderboard: LeaderboardEntry[];
        pagination: Pagination;
      }>(API_ENDPOINTS.LEADERBOARD.SCORE, {
        limit,
        page,
      });

      if (response.success && response.leaderboard) {
        setLeaderboard(response.leaderboard);
        setPagination(response.pagination || null);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return (
    <div className="tab-content" id="leaderboard">
      <div className="controls">
        <input
          type="number"
          id="leaderboardLimit"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
          placeholder="На странице"
          style={{ width: '120px' }}
          min="10"
          max="200"
        />
        <button type="button" className="btn" onClick={() => loadLeaderboard(1)}>
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ранг</th>
                  <th>Telegram ID</th>
                  <th>Имя</th>
                  <th>Рекорд</th>
                  <th>Баланс</th>
                  <th>Игр</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.telegramId}>
                    <td>{entry.rank}</td>
                    <td>{entry.telegramId}</td>
                    <td>{entry.username || 'N/A'}</td>
                    <td>{entry.highScore.toLocaleString()}</td>
                    <td>{entry.balance.toLocaleString()}</td>
                    <td>{entry.totalGames}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <PaginationComponent
              pagination={pagination}
              onPageChange={loadLeaderboard}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LeaderboardTab;

