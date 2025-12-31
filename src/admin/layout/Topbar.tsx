/**
 * 상단 바 컴포넌트
 * 기존 index.html의 topbar를 React로 구현
 */

import React from 'react';
import { Admin } from '../types';

interface TopbarProps {
  user: Admin | null;
  notificationCount: number;
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ user, notificationCount, onLogout }) => {
  const getInitials = (username?: string) => {
    if (!username) return 'A';
    return username.charAt(0).toUpperCase();
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">MVP Runner - Admin Panel</div>
      </div>
      <div className="topbar-right">
        <div className="notification-bell">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notificationCount > 0 && (
            <div className="notification-badge">
              {notificationCount > 99 ? '99+' : notificationCount}
            </div>
          )}
        </div>
        <div className="user-avatar" id="userAvatar">
          {getInitials(user?.username)}
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Topbar;

