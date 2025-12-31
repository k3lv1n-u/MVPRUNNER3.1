/**
 * Users Tab 컴포넌트
 * 기존 index.html의 loadUsers 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { User, Pagination } from '../types';
import PaginationComponent from '../components/Pagination';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';

const UsersTab: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [sortBy, setSortBy] = useState('highScore');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceOperation, setBalanceOperation] = useState<'add' | 'subtract' | 'set'>('set');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [updatingBalance, setUpdatingBalance] = useState(false);

  const loadUsers = async (page: number = 1) => {
    setLoading(true);
    setError('');

    try {
      const params: Record<string, any> = {
        sortBy,
        limit: 50,
        page,
        includeSecurity: 'true',
      };

      if (searchValue.trim()) {
        params.search = searchValue.trim();
      }

      const response = await apiClient.get<{
        users: User[];
        pagination: Pagination;
      }>(API_ENDPOINTS.USERS.LIST, params);

      if (response.success && response.users) {
        setUsers(response.users);
        setPagination(response.pagination || null);
        setCurrentPage(page);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, searchValue]);

  const handleSearch = () => {
    loadUsers(1);
  };

  const handleShowUserDetail = async (telegramId: number) => {
    try {
      const response = await apiClient.get<{ user: User }>(
        API_ENDPOINTS.USERS.DETAIL(telegramId),
        { includeSecurity: 'true' }
      );

      if (response.success && response.user) {
        setSelectedUser(response.user);
        setShowUserModal(true);
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to load user details'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleBlockUser = async (telegramId: number) => {
    const reason = window.prompt('Причина блокировки:');
    if (!reason) return;

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.USERS.BLOCK(telegramId),
        { blockReason: reason }
      );

      if (response.success) {
        window.alert('Пользователь заблокирован');
        loadUsers(currentPage);
        if (selectedUser?.telegramId === telegramId) {
          handleShowUserDetail(telegramId);
        }
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to block user'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleUnblockUser = async (telegramId: number) => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.USERS.UNBLOCK(telegramId)
      );

      if (response.success) {
        window.alert('Пользователь разблокирован');
        loadUsers(currentPage);
        if (selectedUser?.telegramId === telegramId) {
          handleShowUserDetail(telegramId);
        }
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to unblock user'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleOpenBalanceModal = () => {
    if (!selectedUser) return;
    setBalanceAmount('');
    setBalanceReason('');
    setBalanceOperation('set');
    setShowBalanceModal(true);
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser) return;

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount < 0) {
      window.alert('Введите корректную сумму');
      return;
    }

    if (balanceOperation === 'subtract' && amount > (selectedUser.balance || 0)) {
      window.alert('Недостаточно средств для вычитания');
      return;
    }

    setUpdatingBalance(true);
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.USERS.UPDATE_BALANCE(selectedUser.telegramId),
        {
          balance: amount,
          operation: balanceOperation,
          reason: balanceReason || undefined,
        }
      );

      if (response.success) {
        window.alert(
          `Баланс обновлен!\n` +
            `Старый баланс: ${response.balance?.old || selectedUser.balance}\n` +
            `Новый баланс: ${response.balance?.new || 'N/A'}\n` +
            `Изменение: ${response.balance?.change || 0 >= 0 ? '+' : ''}${response.balance?.change || 0}`
        );
        setShowBalanceModal(false);
        handleShowUserDetail(selectedUser.telegramId);
        loadUsers(currentPage);
      } else {
        window.alert(`Ошибка: ${response.error || 'Не удалось обновить баланс'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка при обновлении баланса: ${err.message}`);
    } finally {
      setUpdatingBalance(false);
    }
  };

  const canModifyBalance = currentAdmin && ['DEVELOPER', 'LEADER'].includes(currentAdmin.role);

  return (
    <div className="tab-content active" id="users">
      <div className="controls">
        <input
          type="text"
          id="searchUser"
          className="search-input"
          placeholder="Поиск по имени пользователя..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select
          id="sortUsers"
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="highScore">По рекорду</option>
          <option value="balance">По балансу</option>
          <option value="totalGames">По играм</option>
          <option value="createdAt">По дате регистрации</option>
        </select>
        <button type="button" className="btn" onClick={() => loadUsers(1)}>
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Имя</th>
                  <th>Баланс</th>
                  <th>Рекорд</th>
                  <th>Игр</th>
                  <th>IP</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const blockedClass = user.isBlocked ? 'blocked' : '';
                  const statusText = user.isBlocked
                    ? '🔴 Заблокирован'
                    : '🟢 Активен';
                  return (
                    <tr key={user.telegramId} className={blockedClass}>
                      <td>{user.telegramId}</td>
                      <td>{user.username || 'N/A'}</td>
                      <td>{user.balance}</td>
                      <td>{user.highScore}</td>
                      <td>{user.totalGames}</td>
                      <td>{user.ipAddress || 'N/A'}</td>
                      <td>{statusText}</td>
                      <td>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => handleShowUserDetail(user.telegramId)}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Детали
                        </button>
                        {user.isBlocked ? (
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => handleUnblockUser(user.telegramId)}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            Разблокировать
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleBlockUser(user.telegramId)}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            Заблокировать
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <PaginationComponent
              pagination={pagination}
              onPageChange={loadUsers}
            />
          )}
        </>
      )}

      {/* User Detail Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        title="Детали пользователя"
      >
        {selectedUser && (
          <>
            <div className="user-detail-grid">
              <div className="detail-item">
                <label>Telegram ID</label>
                <div className="value">{selectedUser.telegramId}</div>
              </div>
              <div className="detail-item">
                <label>Имя пользователя</label>
                <div className="value">{selectedUser.username || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <label>Имя</label>
                <div className="value">{selectedUser.firstName || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <label>Фамилия</label>
                <div className="value">{selectedUser.lastName || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <label>Баланс</label>
                <div className="value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedUser.balance}
                  {canModifyBalance && (
                    <button
                      type="button"
                      className="btn"
                      onClick={handleOpenBalanceModal}
                      style={{ padding: '4px 8px', fontSize: '11px', marginLeft: '8px' }}
                    >
                      Изменить
                    </button>
                  )}
                </div>
              </div>
              <div className="detail-item">
                <label>Рекорд</label>
                <div className="value">{selectedUser.highScore}</div>
              </div>
              <div className="detail-item">
                <label>Всего игр</label>
                <div className="value">{selectedUser.totalGames}</div>
              </div>
              <div className="detail-item">
                <label>Общий счет</label>
                <div className="value">{selectedUser.totalScore || 0}</div>
              </div>
              <div className="detail-item">
                <label>IP адрес</label>
                <div className="value">{selectedUser.ipAddress || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <label>Последний IP</label>
                <div className="value">
                  {selectedUser.lastIpAddress || 'N/A'}
                </div>
              </div>
              <div className="detail-item">
                <label>Платформа</label>
                <div className="value">
                  {selectedUser.deviceInfo?.platform || 'N/A'}
                </div>
              </div>
              <div className="detail-item">
                <label>Язык</label>
                <div className="value">
                  {selectedUser.deviceInfo?.language || 'N/A'}
                </div>
              </div>
              <div className="detail-item">
                <label>User Agent</label>
                <div
                  className="value"
                  style={{ fontSize: '12px', wordBreak: 'break-all' }}
                >
                  {selectedUser.deviceInfo?.userAgent || 'N/A'}
                </div>
              </div>
              <div className="detail-item">
                <label>Статус</label>
                <div
                  className={`value ${selectedUser.isBlocked ? 'blocked' : ''}`}
                >
                  {selectedUser.isBlocked
                    ? '🔴 Заблокирован'
                    : '🟢 Активен'}
                </div>
              </div>
              <div className="detail-item">
                <label>Причина блокировки</label>
                <div className="value">
                  {selectedUser.blockReason || 'N/A'}
                </div>
              </div>
              <div className="detail-item">
                <label>Дата регистрации</label>
                <div className="value">
                  {new Date(selectedUser.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>
              <div className="detail-item">
                <label>Последний вход</label>
                <div className="value">
                  {selectedUser.lastLoginAt
                    ? new Date(selectedUser.lastLoginAt).toLocaleString('ru-RU')
                    : 'N/A'}
                </div>
              </div>
              <div className="detail-item">
                <label>Последняя игра</label>
                <div className="value">
                  {selectedUser.lastPlayed
                    ? new Date(selectedUser.lastPlayed).toLocaleString('ru-RU')
                    : 'N/A'}
                </div>
              </div>
            </div>
            <div className="controls">
              {selectedUser.isBlocked ? (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    handleUnblockUser(selectedUser.telegramId);
                    setShowUserModal(false);
                  }}
                >
                  Разблокировать
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleBlockUser(selectedUser.telegramId)}
                >
                  Заблокировать
                </button>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
              >
                Закрыть
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Balance Update Modal */}
      <Modal
        isOpen={showBalanceModal}
        onClose={() => {
          setShowBalanceModal(false);
          setBalanceAmount('');
          setBalanceReason('');
        }}
        title="Изменение баланса"
      >
        {selectedUser && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Пользователь: <strong>{selectedUser.username || 'N/A'}</strong> (ID: {selectedUser.telegramId})
              </div>
              <div style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Текущий баланс: <strong>{selectedUser.balance}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Операция:
              </label>
              <select
                value={balanceOperation}
                onChange={(e) => setBalanceOperation(e.target.value as 'add' | 'subtract' | 'set')}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="set">Установить значение</option>
                <option value="add">Добавить</option>
                <option value="subtract">Вычесть</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Сумма:
              </label>
              <input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder={balanceOperation === 'set' ? 'Новое значение баланса' : 'Сумма для изменения'}
                min="0"
                step="1"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Причина (необязательно):
              </label>
              <textarea
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                placeholder="Укажите причину изменения баланса..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                }}
              />
            </div>

            {balanceAmount && !isNaN(parseFloat(balanceAmount)) && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {balanceOperation === 'set' && (
                    <>Новый баланс: <strong>{parseFloat(balanceAmount)}</strong></>
                  )}
                  {balanceOperation === 'add' && (
                    <>Новый баланс: <strong>{selectedUser.balance + parseFloat(balanceAmount)}</strong></>
                  )}
                  {balanceOperation === 'subtract' && (
                    <>Новый баланс: <strong>{Math.max(0, selectedUser.balance - parseFloat(balanceAmount))}</strong></>
                  )}
                </div>
              </div>
            )}

            <div className="controls">
              <button
                type="button"
                className="btn btn-success"
                onClick={handleUpdateBalance}
                disabled={updatingBalance || !balanceAmount || isNaN(parseFloat(balanceAmount))}
              >
                {updatingBalance ? 'Обновление...' : 'Обновить баланс'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowBalanceModal(false);
                  setBalanceAmount('');
                  setBalanceReason('');
                }}
                disabled={updatingBalance}
              >
                Отмена
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default UsersTab;

