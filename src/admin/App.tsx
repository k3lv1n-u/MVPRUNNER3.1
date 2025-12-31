/**
 * Admin Panel 메인 App 컴포넌트
 * 기존 index.html의 전체 구조를 React로 구현
 */

import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AdminLayout from './layout/AdminLayout';
import './styles/admin.css';

const AdminAppContent: React.FC = () => {
  const { isAuthenticated, user, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--text-primary)'
      }}>
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  return <AdminLayout user={user} onLogout={handleLogout} />;
};

const AdminApp: React.FC = () => {
  return (
    <AuthProvider>
      <AdminAppContent />
    </AuthProvider>
  );
};

export default AdminApp;

