/**
 * Stats Tab 컴포넌트
 * 기존 index.html의 loadStats 함수를 React로 구현
 * Chart.js를 사용하여 통계 차트 표시
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { Stats, GraphData, Admin } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface StatsTabProps {
  user: Admin;
}

const StatsTab: React.FC<StatsTabProps> = ({ user }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartPeriod, setChartPeriod] = useState('7d');
  const [chartType, setChartType] = useState('userRegistrations');

  const loadStats = async () => {
    setLoading(true);
    setError('');

    try {
      const [statsResponse, graphResponse] = await Promise.all([
        apiClient.get<{ stats: Stats }>(API_ENDPOINTS.ADMIN.STATS),
        apiClient.get<{ data: GraphData }>(API_ENDPOINTS.ADMIN.GRAPH_DATA, {
          period: chartPeriod,
        }),
      ]);

      if (statsResponse.success && statsResponse.stats) {
        setStats(statsResponse.stats);
      }

      if (graphResponse.success && graphResponse.data) {
        // API 응답: { success: true, data: GraphData }
        // apiClient.get<{ data: GraphData }>로 호출하면 graphResponse.data는 { data: GraphData } 형태
        // 실제 GraphData에 접근하려면 (graphResponse.data as any).data 사용
        const responseData = graphResponse.data as any;
        const graphData: GraphData = responseData.data || responseData;
        if (graphData && (graphData.userRegistrations || graphData.gamePlays || graphData.scoreDistribution || graphData.cumulativePlayers)) {
          setGraphData(graphData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [chartPeriod]);

  const handleResetDatabase = async () => {
    // 권한 확인
    if (!['DEVELOPER', 'LEADER'].includes(user?.role || '')) {
      window.alert('У вас нет прав для сброса базы данных');
      return;
    }

    const confirmText = window.prompt('Введите "RESET_ALL_DATA" для подтверждения сброса базы данных:');
    if (confirmText !== 'RESET_ALL_DATA') {
      window.alert('Отменено');
      return;
    }

    if (
      !window.confirm(
        '⚠️ ВНИМАНИЕ! Это действие удалит ВСЕ данные из базы данных. Это действие нельзя отменить. Продолжить?'
      )
    ) {
      return;
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.ADMIN.RESET_DATABASE, {
        confirm: 'RESET_ALL_DATA',
      });

      if (response.success) {
        window.alert('База данных успешно сброшена');
        loadStats();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to reset database'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleResetProgress = async () => {
    // 권한 확인
    if (!['DEVELOPER', 'LEADER'].includes(user?.role || '')) {
      window.alert('У вас нет прав для сброса прогресса');
      return;
    }

    const confirmText = window.prompt('Введите "RESET_PROGRESS" для подтверждения сброса прогресса:');
    if (confirmText !== 'RESET_PROGRESS') {
      window.alert('Отменено');
      return;
    }

    if (
      !window.confirm(
        '⚠️ ВНИМАНИЕ! Это действие удалит весь игровой прогресс (очки, записи, цели), но сохранит информацию о пользователях. Продолжить?'
      )
    ) {
      return;
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.ADMIN.RESET_PROGRESS, {
        confirm: 'RESET_PROGRESS',
      });

      if (response.success) {
        window.alert('Прогресс успешно сброшен. Информация о пользователях сохранена.');
        loadStats();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to reset progress'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleResetScores = async () => {
    // 권한 확인
    if (!['DEVELOPER', 'LEADER'].includes(user?.role || '')) {
      window.alert('У вас нет прав для сброса очков');
      return;
    }

    const confirmText = window.prompt('Введите "RESET_SCORES" для подтверждения сброса очков:');
    if (confirmText !== 'RESET_SCORES') {
      window.alert('Отменено');
      return;
    }

    if (
      !window.confirm(
        '⚠️ ВНИМАНИЕ! Это действие удалит все записи об очках (GameRecord) и сбросит очки пользователей (highScore, totalScore, totalGames), но сохранит монеты, предметы и другую информацию. Продолжить?'
      )
    ) {
      return;
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.ADMIN.RESET_SCORES, {
        confirm: 'RESET_SCORES',
      });

      if (response.success) {
        window.alert(`Очки успешно сброшены. Удалено записей: ${response.stats?.deletedRecords || 0}, обновлено пользователей: ${response.stats?.updatedUsers || 0}. Монеты и предметы сохранены.`);
        loadStats();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to reset scores'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const renderChart = () => {
    if (!graphData) return null;

    let chartData: any = null;
    let chartOptions: any = null;

    switch (chartType) {
      case 'userRegistrations':
        if (graphData.userRegistrations) {
          chartData = {
            labels: graphData.userRegistrations.map((d) => d.date),
            datasets: [
              {
                label: 'Регистрации',
                data: graphData.userRegistrations.map((d) => d.count),
                borderColor: 'rgba(138, 43, 226, 1)',
                backgroundColor: 'rgba(138, 43, 226, 0.1)',
                tension: 0.4,
              },
            ],
          };
          chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top' as const,
              },
              title: {
                display: true,
                text: 'Регистрации пользователей',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          };
          return <Line data={chartData} options={chartOptions} />;
        }
        break;

      case 'gamePlays':
        if (graphData.gamePlays) {
          chartData = {
            labels: graphData.gamePlays.map((d) => d.date),
            datasets: [
              {
                label: 'Игры',
                data: graphData.gamePlays.map((d) => d.count),
                borderColor: 'rgba(0, 212, 255, 1)',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.4,
              },
            ],
          };
          chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top' as const,
              },
              title: {
                display: true,
                text: 'Игровые сессии',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          };
          return <Line data={chartData} options={chartOptions} />;
        }
        break;

      case 'scoreDistribution':
        if (graphData.scoreDistribution) {
          chartData = {
            labels: graphData.scoreDistribution.map((d) => d.label),
            datasets: [
              {
                label: 'Распределение очков',
                data: graphData.scoreDistribution.map((d) => d.count),
                backgroundColor: [
                  'rgba(138, 43, 226, 0.6)',
                  'rgba(0, 212, 255, 0.6)',
                  'rgba(255, 0, 255, 0.6)',
                  'rgba(255, 255, 255, 0.6)',
                ],
              },
            ],
          };
          chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top' as const,
              },
              title: {
                display: true,
                text: 'Распределение очков',
              },
            },
          };
          return <Doughnut data={chartData} options={chartOptions} />;
        }
        break;

      case 'cumulativePlayers':
        if (graphData.cumulativePlayers) {
          chartData = {
            labels: graphData.cumulativePlayers.map((d) => d.date),
            datasets: [
              {
                label: 'Накопительное количество игроков',
                data: graphData.cumulativePlayers.map((d) => d.count),
                borderColor: 'rgba(255, 0, 255, 1)',
                backgroundColor: 'rgba(255, 0, 255, 0.1)',
                tension: 0.4,
              },
            ],
          };
          chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top' as const,
              },
              title: {
                display: true,
                text: 'Накопительное количество игроков',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          };
          return <Line data={chartData} options={chartOptions} />;
        }
        break;
    }

    return null;
  };

  const canResetDatabase = ['DEVELOPER', 'LEADER'].includes(user?.role || '');

  return (
    <div className="tab-content" id="stats">
      <div className="page-header">
        <h1 className="page-title">Статистика</h1>
        <p className="page-subtitle">Общая статистика и графики</p>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Пользователи</h3>
              <div className="value">
                {stats?.users?.toLocaleString() || 0}
              </div>
            </div>
            <div className="stat-card">
              <h3>Макс. рекорд</h3>
              <div className="value">
                {stats?.highestScore?.toLocaleString() || 0}
              </div>
              {stats?.highestScoreUser && (
                <div className="sub-value" style={{ marginTop: '6px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                  {stats.highestScoreUser}
                </div>
              )}
            </div>
            <div className="stat-card">
              <h3>Игровые записи</h3>
              <div className="value">
                {stats?.gameRecords?.toLocaleString() || 0}
              </div>
            </div>
            <div className="stat-card">
              <h3>Промокоды</h3>
              <div className="value">
                {stats?.promoCodes?.toLocaleString() || 0}
              </div>
            </div>
            <div className="stat-card">
              <h3>Использованные промокоды</h3>
              <div className="value">
                {stats?.usedPromoCodes?.toLocaleString() || 0}
              </div>
            </div>
            <div className="stat-card">
              <h3>Неиспользованные промокоды</h3>
              <div className="value">
                {stats?.unusedPromoCodes?.toLocaleString() || 0}
              </div>
            </div>
            <div className="stat-card">
              <h3>Текущая недельная цель</h3>
              <div className="value">
                {stats?.currentWeeklyGoalTarget?.toLocaleString() || 0}
              </div>
              {stats?.currentWeeklyGoalDesc && (
                <div className="sub-value" style={{ marginTop: '6px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                  {stats.currentWeeklyGoalDesc}
                </div>
              )}
            </div>
          </div>

          {/* Chart Controls */}
          <div className="chart-container">
            <div className="chart-controls">
              <button
                className={`btn ${chartPeriod === '7d' ? 'active' : ''}`}
                onClick={() => setChartPeriod('7d')}
              >
                7 дней
              </button>
              <button
                className={`btn ${chartPeriod === '30d' ? 'active' : ''}`}
                onClick={() => setChartPeriod('30d')}
              >
                30 дней
              </button>
              <button
                className={`btn ${chartPeriod === '90d' ? 'active' : ''}`}
                onClick={() => setChartPeriod('90d')}
              >
                90 дней
              </button>
              <button
                className={`btn ${chartPeriod === 'all' ? 'active' : ''}`}
                onClick={() => setChartPeriod('all')}
              >
                Все время
              </button>
            </div>
            <div className="chart-controls">
              <button
                className={`btn ${chartType === 'userRegistrations' ? 'active' : ''}`}
                onClick={() => setChartType('userRegistrations')}
              >
                Регистрации
              </button>
              <button
                className={`btn ${chartType === 'gamePlays' ? 'active' : ''}`}
                onClick={() => setChartType('gamePlays')}
              >
                Игры
              </button>
              <button
                className={`btn ${chartType === 'scoreDistribution' ? 'active' : ''}`}
                onClick={() => setChartType('scoreDistribution')}
              >
                Распределение очков
              </button>
              <button
                className={`btn ${chartType === 'cumulativePlayers' ? 'active' : ''}`}
                onClick={() => setChartType('cumulativePlayers')}
              >
                Накопительные игроки
              </button>
            </div>
            <div className="chart-wrapper">{renderChart()}</div>
          </div>

          {/* Reset Buttons (DEVELOPER, LEADER only) */}
          {canResetDatabase && (
            <div className="controls" style={{ display: 'flex', gap: '10px', marginTop: '30px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleResetScores}
                style={{ background: '#4a90e2' }}
              >
                🎯 Сбросить только очки (сохранить монеты и предметы)
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleResetProgress}
                style={{ background: '#ff8800' }}
              >
                🔄 Сбросить прогресс (сохранить пользователей)
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleResetDatabase}
                style={{ background: '#ff4444' }}
              >
                ⚠️ Сбросить всю базу данных
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatsTab;

