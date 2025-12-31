import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import soundManager from '../utils/soundManager';
import './News.css';

const News = ({ onBack }) => {
  const [weeklyGoal, setWeeklyGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWeeklyGoal = async () => {
      setLoading(true);
      setError(null);
      try {
        const goal = await api.getCurrentWeeklyGoal();
        setWeeklyGoal(goal);
      } catch (err) {
        console.error('Failed to load weekly goal:', err);
        setError('Не удалось загрузить информацию');
        setWeeklyGoal(null);
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyGoal();
  }, []);

  // 별 배경 최적화
  const stars = useMemo(() => {
    return [...Array(50)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2
    }));
  }, []);

  return (
    <div className="news-container">
      {/* 밤하늘 별 배경 */}
      <div className="stars-background">
        {stars.map((star) => (
          <div 
            key={star.id} 
            className="star" 
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`
            }}
          ></div>
        ))}
      </div>

      <div className="news-content">
        {/* 타이틀 */}
        <div className="news-header">
          <h2 className="news-title">📰 НОВОСТИ</h2>
        </div>

        {/* 콘텐츠 */}
        <div className="news-body">
          {loading && (
            <div className="news-loading">
              <div className="loading-spinner"></div>
              <p>Загрузка...</p>
            </div>
          )}

          {error && (
            <div className="news-error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {weeklyGoal ? (
                <div className="weekly-goal-card">
                  <div className="goal-header">
                    <h3 className="goal-title">🎯 Недельная цель</h3>
                    <div className="goal-period">
                      {new Date(weeklyGoal.weekStartDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long'
                      })} - {new Date(weeklyGoal.weekEndDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long'
                      })}
                    </div>
                  </div>
                  
                  <div className="goal-target">
                    <div className="target-label">Целевой счет:</div>
                    <div className="target-value">{weeklyGoal.targetScore.toLocaleString()}</div>
                  </div>

                  {weeklyGoal.description && (
                    <div className="goal-description">
                      <p>{weeklyGoal.description}</p>
                    </div>
                  )}

                  <div className="goal-info">
                    <p>🎮 Достигните целевого счета в течение недели!</p>
                    <p>🏆 Покажите свои лучшие результаты!</p>
                  </div>
                </div>
              ) : (
                <div className="no-goal-message">
                  <p>В настоящее время нет активных недельных целей.</p>
                  <p>Следите за обновлениями!</p>
                </div>
              )}

              <div className="news-announcement">
                <h3>📢 Объявления</h3>
                <p>Следите за новыми обновлениями и событиями!</p>
              </div>
            </>
          )}
        </div>

        {/* 뒤로가기 버튼 */}
        <div className="news-footer">
          <button className="back-btn" onClick={() => { soundManager.playButtonClick(); onBack(); }}>
            НАЗАД
          </button>
        </div>
      </div>
    </div>
  );
};

export default News;

