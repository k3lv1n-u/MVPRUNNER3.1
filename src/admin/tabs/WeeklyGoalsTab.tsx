/**
 * Weekly Goals Tab 컴포넌트
 * 기존 index.html의 loadWeeklyGoals 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { WeeklyGoal, GoalAchiever } from '../types';
import Modal from '../components/Modal';

const WeeklyGoalsTab: React.FC = () => {
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAchieversModal, setShowAchieversModal] = useState(false);
  const [achievers, setAchievers] = useState<GoalAchiever[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<WeeklyGoal | null>(null);

  useEffect(() => {
    return () => {
      // cleanup if needed
    };
  }, []);

  // Create Goal Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [description, setDescription] = useState('');

  const loadWeeklyGoals = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{ goals: WeeklyGoal[] }>(
        API_ENDPOINTS.WEEKLY_GOALS.LIST
      );

      if (response.success && response.goals) {
        setGoals(response.goals);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading weekly goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeeklyGoals();

    // Set default dates for create modal
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setStartDate(startOfWeek.toISOString().split('T')[0]);
    setEndDate(endOfWeek.toISOString().split('T')[0]);
  }, []);

  const handleShowCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCreateGoal = async () => {
    if (!startDate || !endDate || !targetScore) {
      window.alert('Заполните все обязательные поля');
      return;
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.WEEKLY_GOALS.CREATE, {
        weekStartDate: startDate,
        weekEndDate: endDate,
        targetScore: parseInt(targetScore),
        description: description,
      });

      if (response.success) {
        window.alert('Цель создана успешно');
        setShowCreateModal(false);
        setStartDate('');
        setEndDate('');
        setTargetScore('');
        setDescription('');
        loadWeeklyGoals();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to create goal'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleToggleGoal = async (id: string, isActive: boolean) => {
    try {
      const response = await apiClient.put(API_ENDPOINTS.WEEKLY_GOALS.UPDATE(id), {
        isActive,
      });

      if (response.success) {
        loadWeeklyGoals();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to toggle goal'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('Удалить эту цель?')) return;

    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.WEEKLY_GOALS.DELETE(id)
      );

      if (response.success) {
        loadWeeklyGoals();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to delete goal'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleShowAchievers = async (goalId: string) => {
    try {
      const response = await apiClient.get<{
        achievers: GoalAchiever[];
        goal: WeeklyGoal;
        total: number;
      }>(API_ENDPOINTS.WEEKLY_GOALS.ACHIEVERS(goalId));

      if (response.success && response.achievers) {
        setAchievers(response.achievers);
        setSelectedGoal(response.goal);
        setShowAchieversModal(true);
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to load achievers'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  return (
    <div className="tab-content" id="weekly-goals">
      <div className="controls">
        <button type="button" className="btn" onClick={handleShowCreateModal}>
          Создать новую цель
        </button>
        <button type="button" className="btn" onClick={loadWeeklyGoals}>
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : goals.length === 0 ? (
        <div className="error">Нет созданных целей</div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Начало недели</th>
                <th>Конец недели</th>
                <th>Целевой счет</th>
                <th>Описание</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const isActive = goal.isActive
                  ? '🟢 Активна'
                  : '🔴 Неактивна';
                return (
                  <tr key={goal._id}>
                    <td>
                      {new Date(goal.weekStartDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td>
                      {new Date(goal.weekEndDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td>{goal.targetScore.toLocaleString()}</td>
                    <td>{goal.description || 'N/A'}</td>
                    <td>{isActive}</td>
                    <td>
                      <button
                        className="btn"
                        onClick={() => handleShowAchievers(goal._id)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          marginRight: '5px',
                        }}
                      >
                        Достигшие
                      </button>
                      <button
                        className="btn"
                        onClick={() => handleToggleGoal(goal._id, !goal.isActive)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '12px',
                          marginRight: '5px',
                        }}
                      >
                        {goal.isActive ? 'Деактивировать' : 'Активировать'}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteGoal(goal._id)}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Goal Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Создать недельную цель"
      >
        <div className="form-group">
          <label>Дата начала недели:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Дата окончания недели:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Целевой счет:</label>
          <input
            type="number"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            placeholder="10000"
            required
          />
        </div>
        <div className="form-group">
          <label>Описание:</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание цели..."
          />
        </div>
        <div className="controls">
          <button className="btn btn-success" onClick={handleCreateGoal}>
            Создать
          </button>
          <button
            className="btn"
            onClick={() => setShowCreateModal(false)}
          >
            Отмена
          </button>
        </div>
      </Modal>

      {/* Achievers Modal */}
      <Modal
        isOpen={showAchieversModal}
        onClose={() => {
          setShowAchieversModal(false);
          setAchievers([]);
          setSelectedGoal(null);
        }}
        title="Достигшие цель"
      >
        {selectedGoal && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h3
                style={{
                  color: '#00ffff',
                  marginBottom: '10px',
                }}
              >
                Цель: {selectedGoal.targetScore.toLocaleString()} очков
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                {new Date(selectedGoal.weekStartDate).toLocaleDateString(
                  'ru-RU'
                )}{' '}
                -{' '}
                {new Date(selectedGoal.weekEndDate).toLocaleDateString('ru-RU')}
              </p>
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '14px',
                  marginTop: '5px',
                }}
              >
                Всего достигших: {achievers.length}
              </p>
            </div>
            {achievers.length === 0 ? (
              <div className="error">Нет достигших эту цель</div>
            ) : (
              <table style={{ marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th>Ранг</th>
                    <th>Telegram ID</th>
                    <th>Имя</th>
                    <th>Счет</th>
                    <th>Дата</th>
                    <th>Промокод</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {achievers.map((achiever) => {
                    const hasCode = achiever.hasPromoCode
                      ? '✅ Выдан'
                      : '❌ Не выдан';
                    return (
                      <tr key={achiever.telegramId}>
                        <td>{achiever.rank}</td>
                        <td>{achiever.telegramId}</td>
                        <td>{achiever.username}</td>
                        <td>{achiever.score.toLocaleString()}</td>
                        <td>
                          {new Date(achiever.playedAt).toLocaleDateString(
                            'ru-RU'
                          )}
                        </td>
                        <td>{hasCode}</td>
                        <td>
                          {!achiever.hasPromoCode ? (
                            <span
                              style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '12px',
                              }}
                            >
                              Выдать в разделе "Промокоды"
                            </span>
                          ) : (
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="controls">
              <button
                className="btn"
                onClick={() => {
                  setShowAchieversModal(false);
                  setAchievers([]);
                  setSelectedGoal(null);
                }}
              >
                Закрыть
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default WeeklyGoalsTab;

