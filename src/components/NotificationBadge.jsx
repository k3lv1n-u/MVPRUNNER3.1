import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './NotificationBadge.css';

const NotificationBadge = ({ telegramId, onBalanceUpdate }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showPanel, setShowPanel] = useState(false);
    const [loading, setLoading] = useState(false);

    // 알림 로드
    const loadNotifications = async () => {
        if (!telegramId) return;

        try {
            setLoading(true);
            const data = await api.getNotifications(telegramId, 20);
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error('[Notifications] Error loading:', error);
        } finally {
            setLoading(false);
        }
    };

    // 초기 로드 및 주기적 업데이트
    useEffect(() => {
        loadNotifications();

        // 30초마다 알림 확인
        const interval = setInterval(loadNotifications, 30000);

        return () => clearInterval(interval);
    }, [telegramId]);

    // 보상 수령
    const handleClaimReward = async (notification) => {
        if (notification.claimed || notification.amount <= 0) return;

        try {
            const result = await api.claimNotificationReward(notification._id);

            if (result.success) {
                // 알림 목록 업데이트
                setNotifications(prev =>
                    prev.map(n =>
                        n._id === notification._id
                            ? { ...n, claimed: true, claimedAt: new Date() }
                            : n
                    )
                );

                // 부모 컴포넌트에 잔액 업데이트 알림
                if (onBalanceUpdate) {
                    onBalanceUpdate(result.newBalance);
                }

            }
        } catch (error) {
            console.error('[Notifications] Error claiming reward:', error);
            alert('Ошибка при получении награды');
        }
    };

    // 알림 읽음 표시
    const handleMarkAsRead = async (notificationId) => {
        try {
            await api.markNotificationAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n =>
                    n._id === notificationId ? { ...n, read: true } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('[Notifications] Error marking as read:', error);
        }
    };

    // 알림 타입별 아이콘
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'referral_reward':
                return '🎁';
            case 'referral_earned':
                return '👥';
            case 'game_reward':
                return '🏆';
            default:
                return '📢';
        }
    };

    return (
        <div className="notification-badge-container">
            <button
                className="notification-bell"
                onClick={() => setShowPanel(!showPanel)}
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {showPanel && (
                <>
                    <div
                        className="notification-overlay"
                        onClick={() => setShowPanel(false)}
                    />
                    <div className="notification-panel">
                        <div className="notification-header">
                            <h3>Уведомления</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowPanel(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="notification-list">
                            {loading && (
                                <div className="notification-loading">Загрузка...</div>
                            )}

                            {!loading && notifications.length === 0 && (
                                <div className="notification-empty">
                                    Нет уведомлений
                                </div>
                            )}

                            {!loading && notifications.map(notification => (
                                <div
                                    key={notification._id}
                                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                                    onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                                >
                                    <div className="notification-icon">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title">{notification.title}</div>
                                        <div className="notification-message">{notification.message}</div>
                                        {notification.amount > 0 && (
                                            <div className="notification-reward">
                                                {notification.claimed ? (
                                                    <span className="reward-claimed">
                                                        ✓ Получено: {notification.amount} монет
                                                    </span>
                                                ) : (
                                                    <button
                                                        className="claim-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleClaimReward(notification);
                                                        }}
                                                    >
                                                        Получить {notification.amount} монет
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <div className="notification-time">
                                            {new Date(notification.createdAt).toLocaleString('ru-RU')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBadge;
