/**
 * 로그인 페이지
 * 기존 index.html의 로그인 화면을 React로 구현
 */

import React, { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';

export const LoginPage: React.FC = () => {
  const { login, developerLogin, register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerError, setRegisterError] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 개발자 모드: 닉네임이 비어있고 비밀번호가 "Rrs252924"인 경우
    if (!username && password === 'Rrs252924') {
      const result = await developerLogin(password);
      if (result.success) {
        // 로그인 성공 - useAuth 훅이 상태를 업데이트하므로 페이지가 자동으로 리렌더링됨
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
      } else {
        setError(result.error || 'Invalid password');
        setPassword('');
      }
      setIsLoading(false);
      return;
    }

    // 일반 로그인
    if (!username || !password) {
      setError('Username and password are required');
      setIsLoading(false);
      return;
    }

    const result = await login(username, password);
    if (result.success) {
      if (rememberMe) {
        // Remember me 기능 (필요시 구현)
        localStorage.setItem('rememberMe', 'true');
      }
      // 로그인 성공 - useAuth 훅이 상태를 업데이트하므로 페이지가 자동으로 리렌더링됨
    } else {
      setError(result.error || 'Login failed');
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    const trimmedUsername = registerUsername.trim();
    if (!trimmedUsername) {
      setRegisterError('Username is required');
      return;
    }

    if (!registerPassword || registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await register(trimmedUsername, registerPassword);
      if (result.success) {
        window.alert(
          'Registration successful! Your account is pending approval. A developer will review and approve your account.'
        );
        setShowRegisterModal(false);
        setRegisterUsername('');
        setRegisterPassword('');
        setRegisterError('');
      } else {
        setRegisterError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setRegisterError(error.message || 'Registration error. Please try again.');
    }
  };

  return (
    <>
      <div className="login-screen">
        <div className="login-container">
          <div className="login-icon">
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h1 className="login-title">User Login</h1>
          {error && (
            <div className="error-message" style={{ display: 'block' }}>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <svg
                className="input-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input
                type="text"
                id="username"
                className="login-input"
                placeholder="Email ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
              />
              <div className="input-line"></div>
            </div>

            <div className="input-group">
              <svg
                className="input-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                type="password"
                id="password"
                className="login-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin(e as any);
                  }
                }}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <div className="input-line"></div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a
                href="#"
                className="forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'LOGIN...' : 'LOGIN'}
            </button>
          </form>

          <div className="login-footer">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowRegisterModal(true);
                setRegisterError('');
              }}
              className="register-link"
            >
              Don't have an account? Register
            </a>
          </div>
        </div>
      </div>

      {/* 회원가입 모달 */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => {
          setShowRegisterModal(false);
          setRegisterError('');
        }}
        title="Create Account"
      >
        {registerError && (
          <div className="error-message" style={{ display: 'block', marginBottom: '20px' }}>
            {registerError}
          </div>
        )}
        <form className="register-form" onSubmit={handleRegister}>
          <div className="input-group">
            <svg
              className="input-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <input
              type="text"
              id="registerUsername"
              className="login-input"
              placeholder="Username"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              autoComplete="username"
            />
            <div className="input-line"></div>
          </div>

          <div className="input-group">
            <svg
              className="input-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input
              type="password"
              id="registerPassword"
              className="login-input"
              placeholder="Password (min 6 characters)"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleRegister(e as any);
                }
              }}
              autoComplete="new-password"
            />
            <div className="input-line"></div>
          </div>

          <button type="submit" className="login-button" style={{ marginTop: '20px' }}>
            REGISTER
          </button>
        </form>
      </Modal>
    </>
  );
};

export default LoginPage;

