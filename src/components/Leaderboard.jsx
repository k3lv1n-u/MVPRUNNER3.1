import React, { useState, useEffect } from 'react';
import api from '../services/api';
import soundManager from '../utils/soundManager';
import './Leaderboard.css';

const Leaderboard = ({ onBack }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [playerRank, setPlayerRank] = useState(null); // 플레이어의 등수 정보
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'weekly', 'crypto', 'coins'
  const [weekInfo, setWeekInfo] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const highScore = parseInt(localStorage.getItem('highScore') || '0', 10);
  const telegramId = localStorage.getItem('telegramId');

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        if (viewMode === 'weekly') {
          const data = await api.getWeeklyLeaderboard(100, 0);
          const allData = data.leaderboard || [];
          // 상위 20개만 표시
          const top20 = allData.slice(0, 20);
          setLeaderboardData(top20);
          setWeekInfo(data.weekInfo);
          setPagination(null);
          
          // 플레이어의 등수 찾기
          if (telegramId) {
            const player = allData.find(p => p.telegramId && parseInt(telegramId) === p.telegramId);
            if (player && player.rank > 20) {
              setPlayerRank(player);
            } else {
              setPlayerRank(null);
            }
          } else {
            setPlayerRank(null);
          }
        } else if (viewMode === 'crypto') {
          const data = await api.getCryptoLeaderboard(itemsPerPage, currentPage);
          setLeaderboardData(data.leaderboard || []);
          setPagination(data.pagination);
          setWeekInfo(null);
          
          // 플레이어의 등수 찾기
          if (telegramId) {
            // 전체 데이터에서 플레이어 찾기 (현재 페이지에 없을 수 있음)
            const player = data.leaderboard.find(p => p.telegramId && parseInt(telegramId) === p.telegramId);
            if (!player && data.pagination) {
              // 현재 페이지에 없으면 전체 검색 필요 (간단히 null로 설정)
              setPlayerRank(null);
            } else {
              setPlayerRank(player || null);
            }
          } else {
            setPlayerRank(null);
          }
        } else if (viewMode === 'coins') {
          const data = await api.getCoinLeaderboard(itemsPerPage, currentPage);
          setLeaderboardData(data.leaderboard || []);
          setPagination(data.pagination);
          setWeekInfo(null);
          
          // 플레이어의 등수 찾기
          if (telegramId) {
            const player = data.leaderboard.find(p => p.telegramId && parseInt(telegramId) === p.telegramId);
            if (!player && data.pagination) {
              setPlayerRank(null);
            } else {
              setPlayerRank(player || null);
            }
          } else {
            setPlayerRank(null);
          }
        } else {
          // 'all' 모드
          const data = await api.getLeaderboard(itemsPerPage, currentPage);
          setLeaderboardData(data.leaderboard || []);
          setPagination(data.pagination);
          setWeekInfo(null);
          
          // 플레이어의 등수 찾기
          if (telegramId) {
            const player = data.leaderboard.find(p => p.telegramId && parseInt(telegramId) === p.telegramId);
            if (!player && data.pagination) {
              setPlayerRank(null);
            } else {
              setPlayerRank(player || null);
            }
          } else {
            setPlayerRank(null);
          }
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        setError('Не удалось загрузить таблицу лидеров');
        // 오프라인 모드: 로컬 데이터 사용
        const offlineData = [
          { rank: 1, username: 'Player1', highScore: 5000 },
          { rank: 2, username: 'Player2', highScore: 3500 },
          { rank: 3, username: 'Player3', highScore: 2800 },
          ...(highScore > 0 ? [{ rank: 4, username: 'You', highScore, telegramId: telegramId }] : [])
        ];
        setLeaderboardData(offlineData.slice(0, 20));
        setPlayerRank(null);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [viewMode, currentPage, telegramId]);

  // viewMode가 변경될 때 currentPage를 1로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  return (
    <div className="leaderboard-container">
      {/* 밤하늘 별 배경 */}
      <div className="stars-background">
        {[...Array(50)].map((_, i) => (
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
        ))}
      </div>

      <div className="leaderboard-content">
        {/* 타이틀 */}
        <div className="leaderboard-header">
          <h2 className="leaderboard-title">ТАБЛИЦА ИГРОКОВ</h2>
        </div>

        {/* 탭 전환 버튼 */}
        <div className="leaderboard-tabs">
          <button 
            className={`tab-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => { setViewMode('all'); setCurrentPage(1); }}
          >
            ОЧКИ
          </button>
          <button 
            className={`tab-btn ${viewMode === 'weekly' ? 'active' : ''}`}
            onClick={() => { setViewMode('weekly'); setCurrentPage(1); }}
          >
            НЕДЕЛЯ
          </button>
          <button 
            className={`tab-btn ${viewMode === 'crypto' ? 'active' : ''}`}
            onClick={() => { setViewMode('crypto'); setCurrentPage(1); }}
          >
            КРИПТО
          </button>
          <button 
            className={`tab-btn ${viewMode === 'coins' ? 'active' : ''}`}
            onClick={() => { setViewMode('coins'); setCurrentPage(1); }}
          >
            МОНЕТЫ
          </button>
        </div>

        {/* 주간 정보 표시 */}
        {viewMode === 'weekly' && weekInfo && (
          <div className="week-info">
            <div className="week-info-text">
              Цель недели: {weekInfo.targetScore.toLocaleString()} очков
            </div>
            <div className="week-info-dates">
              {new Date(weekInfo.weekStartDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - {new Date(weekInfo.weekEndDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        )}

        {/* 리더보드 리스트 */}
        <div className="leaderboard-list">
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#00ffff' }}>
              Загрузка...
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ff4444' }}>
              {error}
            </div>
          )}
          {!loading && leaderboardData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ffffff' }}>
              Нет данных
            </div>
          )}
          {!loading && leaderboardData.map((player) => {
            // 상위 3등은 특별한 아이콘 표시
            const getRankDisplay = (rank) => {
              if (rank === 1) {
                return (
                  <div className="rank-badge rank-gold">
                    <div className="rank-icon">🏆</div>
                    <div className="rank-number">1</div>
                  </div>
                );
              } else if (rank === 2) {
                return (
                  <div className="rank-badge rank-silver">
                    <div className="rank-icon">🥈</div>
                    <div className="rank-number">2</div>
                  </div>
                );
              } else if (rank === 3) {
                return (
                  <div className="rank-badge rank-bronze">
                    <div className="rank-icon">🥉</div>
                    <div className="rank-number">3</div>
                  </div>
                );
              } else {
                return (
                  <div className="rank-badge rank-normal">
                    <div className="rank-number">#{rank}</div>
                  </div>
                );
              }
            };

            const isCurrentUser = telegramId && player.telegramId && 
              parseInt(telegramId) === player.telegramId;

            return (
              <div 
                key={player.rank || player.telegramId} 
                className={`leaderboard-item ${player.rank <= 3 ? `rank-${player.rank}` : ''} ${isCurrentUser ? 'current-user' : ''}`}
              >
                {getRankDisplay(player.rank)}
                <div className="item-username">
                  {player.username || 'Unknown'}
                  {isCurrentUser && ' (Вы)'}
                </div>
                <div className="item-score">
                  {viewMode === 'crypto' 
                    ? `${(player.totalCryptoEarned || 0).toLocaleString()} USDT`
                    : viewMode === 'coins'
                    ? `${(player.balance || 0).toLocaleString()}`
                    : `${(player.highScore || player.score || 0).toLocaleString()}`
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* 플레이어의 등수가 20위 밖일 때 별도 표시 */}
        {!loading && playerRank && (
          <div className="player-rank-section">
            <div className="player-rank-divider"></div>
            <div className="player-rank-label">Ваша позиция</div>
            <div className="leaderboard-item current-user player-rank-item">
              {(() => {
                const getRankDisplay = (rank) => {
                  if (rank === 1) {
                    return (
                      <div className="rank-badge rank-gold">
                        <div className="rank-icon">🏆</div>
                        <div className="rank-number">1</div>
                      </div>
                    );
                  } else if (rank === 2) {
                    return (
                      <div className="rank-badge rank-silver">
                        <div className="rank-icon">🥈</div>
                        <div className="rank-number">2</div>
                      </div>
                    );
                  } else if (rank === 3) {
                    return (
                      <div className="rank-badge rank-bronze">
                        <div className="rank-icon">🥉</div>
                        <div className="rank-number">3</div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="rank-badge rank-normal">
                        <div className="rank-number">#{rank}</div>
                      </div>
                    );
                  }
                };
                return getRankDisplay(playerRank.rank);
              })()}
              <div className="item-username">
                {playerRank.username || 'Unknown'} (Вы)
              </div>
              <div className="item-score">
                {viewMode === 'crypto' 
                  ? `${(playerRank.totalCryptoEarned || 0).toLocaleString()} USDT`
                  : viewMode === 'coins'
                  ? `${(playerRank.balance || 0).toLocaleString()}`
                  : `${(playerRank.highScore || playerRank.score || 0).toLocaleString()}`
                }
              </div>
            </div>
          </div>
        )}

        {/* 페이징 UI */}
        {!loading && pagination && pagination.totalPages > 1 && (
          <div className="leaderboard-pagination">
            <button 
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => { 
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                }
              }}
            >
              ‹ Предыдущая
            </button>
            <div className="pagination-info">
              Страница {currentPage} из {pagination.totalPages}
            </div>
            <button 
              className="pagination-btn"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => { 
                if (currentPage < pagination.totalPages) {
                  setCurrentPage(currentPage + 1);
                }
              }}
            >
              Следующая ›
            </button>
          </div>
        )}

        {/* 뒤로가기 버튼 */}
        <div className="leaderboard-footer">
          <button className="back-btn" onClick={() => { soundManager.playButtonClick(); onBack(); }}>
            НАЗАД
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

