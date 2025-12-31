/**
 * 인증 관련 커스텀 훅
 * 기존 index.html의 인증 로직을 React 훅으로 변환
 * Context API를 사용하여 전역 상태 관리
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { Admin } from '../types';

interface AuthState {
  token: string | null;
  user: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  developerLogin: (password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    token: localStorage.getItem('adminToken'),
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // 초기 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await apiClient.get<{ user: Admin }>(
          API_ENDPOINTS.AUTH.ME
        );

        if (response.success && response.user) {
          setAuthState({
            token,
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          localStorage.removeItem('adminToken');
          setAuthState({
            token: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        localStorage.removeItem('adminToken');
        setAuthState({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await apiClient.post<{ token: string; user: Admin }>(
        API_ENDPOINTS.AUTH.LOGIN,
        { username, password }
      );

      if (response.success && response.token && response.user) {
        localStorage.setItem('adminToken', response.token);
        setAuthState({
          token: response.token,
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Login error' };
    }
  }, []);

  const developerLogin = useCallback(async (password: string) => {
    try {
      const response = await apiClient.post<{ token: string; user: Admin }>(
        API_ENDPOINTS.AUTH.DEVELOPER_LOGIN,
        { password }
      );

      if (response.success && response.token && response.user) {
        localStorage.setItem('adminToken', response.token);
        setAuthState({
          token: response.token,
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Login error' };
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.REGISTER,
        { username, password, role: 'ADMIN' }
      );

      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration error' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    setAuthState({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    developerLogin,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
