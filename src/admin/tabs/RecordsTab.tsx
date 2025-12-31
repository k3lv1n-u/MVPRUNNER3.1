/**
 * Records Tab 컴포넌트
 * 기존 index.html의 loadRecords 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { GameRecord } from '../types';

const RecordsTab: React.FC = () => {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    return () => {
      // cleanup if needed
    };
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{ records: GameRecord[] }>(
        API_ENDPOINTS.LEADERBOARD.RECORDS,
        { limit }
      );

      if (response.success && response.records) {
        setRecords(response.records);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return (
    <div className="tab-content" id="records">
      <div className="controls">
        <input
          type="number"
          id="recordsLimit"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
          placeholder="Лимит"
          style={{ width: '100px' }}
        />
        <button type="button" className="btn" onClick={loadRecords}>
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
                <th>Telegram ID</th>
                <th>Имя</th>
                <th>Очки</th>
                <th>Новый рекорд</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                return (
                  <tr key={index}>
                    <td>{record.telegramId}</td>
                    <td>{record.userId?.username || 'N/A'}</td>
                    <td>{record.score}</td>
                    <td>{record.isNewRecord ? '✅' : '❌'}</td>
                    <td>
                      {new Date(record.playedAt).toLocaleString('ru-RU')}
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

export default RecordsTab;

