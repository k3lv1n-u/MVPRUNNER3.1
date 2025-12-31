/**
 * Admin Layout 컴포넌트
 * 기존 index.html의 admin-panel 구조를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Admin } from '../types';

// 탭 컴포넌트들 (나중에 구현)
import UsersTab from '../tabs/UsersTab';
import LeaderboardTab from '../tabs/LeaderboardTab';
import CryptoLeaderboardTab from '../tabs/CryptoLeaderboardTab';
import CoinLeaderboardTab from '../tabs/CoinLeaderboardTab';
import RecordsTab from '../tabs/RecordsTab';
import WeeklyGoalsTab from '../tabs/WeeklyGoalsTab';
import PromoOrdersTab from '../tabs/PromoOrdersTab';
import WheelConfigTab from '../tabs/WheelConfigTab';
import ShopManagementTab from '../tabs/ShopManagementTab';
import TelegramBotTab from '../tabs/TelegramBotTab';
import AdminManagementTab from '../tabs/AdminManagementTab';
import AdManagementTab from '../tabs/AdManagementTab';
import StatsTab from '../tabs/StatsTab';

interface AdminLayoutProps {
  user: Admin;
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [notificationCount, setNotificationCount] = useState(0);

  // 알림 배지 업데이트 (주기적 폴링)
  useEffect(() => {
    const updateNotificationBadge = async () => {
      try {
        const response = await fetch('/api/promo-code-requests?status=pending');
        const data = await response.json();
        if (data.success && data.requests) {
          const count = data.requests.length;
          setNotificationCount(count > 99 ? 99 : count);
        }
      } catch (error) {
        console.error('Error updating notification badge:', error);
      }
    };

    // 초기 로드
    updateNotificationBadge();

    // 30초마다 업데이트
    const interval = setInterval(updateNotificationBadge, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    // 기존 index.html의 switchTab 함수처럼 탭 전환 시 필요한 데이터 로드
    // 각 탭 컴포넌트는 자체 useEffect로 데이터를 로드하므로 여기서는 탭만 변경
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersTab />;
      case 'leaderboard':
        return <LeaderboardTab />;
      case 'crypto-leaderboard':
        return <CryptoLeaderboardTab />;
      case 'coin-leaderboard':
        return <CoinLeaderboardTab />;
      case 'records':
        return <RecordsTab />;
      case 'weekly-goals':
        return <WeeklyGoalsTab />;
      case 'promo-orders':
        return <PromoOrdersTab />;
      case 'wheel-configs':
        return <WheelConfigTab />;
      case 'shop-management':
        return <ShopManagementTab />;
      case 'telegram-bot':
        return <TelegramBotTab />;
      case 'admin-management':
        return <AdminManagementTab />;
      case 'ad-management':
        return <AdManagementTab />;
      case 'stats':
        return <StatsTab user={user} />;
      default:
        console.warn('Unknown tab:', activeTab);
        return <UsersTab />;
    }
  };

  return (
    <div className={`admin-panel ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`} id="adminPanel">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        activeTab={activeTab}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onTabChange={handleTabChange}
      />
      <Topbar
        user={user}
        notificationCount={notificationCount}
        onLogout={onLogout}
      />
      <div className="main-content">
        <div className="container">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

