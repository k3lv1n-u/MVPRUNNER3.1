/**
 * 사이드바 컴포넌트
 * 기존 index.html의 사이드바를 React로 구현
 */

import React from 'react';

interface SidebarProps {
  isCollapsed: boolean;
  activeTab: string;
  onToggle: () => void;
  onTabChange: (tabName: string) => void;
}

const TABS = [
  { id: 'users', label: 'Пользователи', icon: 'users' },
  { id: 'leaderboard', label: 'Таблица лидеров', icon: 'leaderboard' },
  { id: 'crypto-leaderboard', label: 'Криптовалюта', icon: 'crypto' },
  { id: 'coin-leaderboard', label: 'Игровые монеты', icon: 'coins' },
  { id: 'records', label: 'Игровые записи', icon: 'records' },
  { id: 'weekly-goals', label: 'Недельные цели', icon: 'goals' },
  { id: 'promo-orders', label: 'Заказы промокодов', icon: 'promo' },
  { id: 'wheel-configs', label: 'Настройки рулетки', icon: 'wheel' },
  { id: 'shop-management', label: 'Управление магазином', icon: 'shop' },
  { id: 'telegram-bot', label: 'Telegram Бот', icon: 'bot' },
  { id: 'admin-management', label: 'Управление администраторами', icon: 'admin' },
  { id: 'ad-management', label: 'Управление рекламой', icon: 'ad' },
  { id: 'stats', label: 'Статистика', icon: 'stats' },
];

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  activeTab,
  onToggle,
  onTabChange,
}) => {
  const renderIcon = (iconName: string) => {
    const iconProps = {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
    };

    switch (iconName) {
      case 'users':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'leaderboard':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2zM14 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2zM6 21H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2zM14 21h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2z" />
          </svg>
        );
      case 'crypto':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      case 'coins':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      case 'records':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case 'goals':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'promo':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        );
      case 'wheel':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
      case 'shop':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        );
      case 'bot':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 8.22 8.5 8.5 0 0 1-6.08 2.28 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 2.28-6.08 8.38 8.38 0 0 1 8.22-.9z" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="16" x2="12" y2="16" />
          </svg>
        );
      case 'admin':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'ad':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        );
      case 'stats':
        return (
          <svg className="sidebar-item-icon" {...iconProps}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">MVP RUNNER</div>
        <button className="sidebar-toggle" onClick={onToggle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
      </div>
      <nav className="sidebar-nav">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {renderIcon(tab.icon)}
            <span className="sidebar-item-text">{tab.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;

