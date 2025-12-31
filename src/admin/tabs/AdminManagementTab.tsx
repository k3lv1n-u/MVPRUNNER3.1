/**
 * Admin Management Tab 컴포넌트
 * 기존 index.html의 loadAdmins, approveAdmin, deleteAdmin 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { Admin } from '../types';
import { useAuth } from '../hooks/useAuth';

const AdminManagementTab: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleSelects, setRoleSelects] = useState<Record<string, string>>({});

  const loadAdmins = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{ admins: Admin[] }>(
        API_ENDPOINTS.AUTH.ADMINS
      );

      if (response.success && response.admins) {
        let adminList = [...response.admins];

        // DEVELOPER도 목록에 추가 (DB에 없지만 표시용)
        if (currentUser?.role === 'DEVELOPER') {
          adminList.unshift({
            id: 'DEVELOPER',
            username: undefined,
            role: 'DEVELOPER',
            status: 'APPROVED',
            approvedBy: undefined,
            approvedAt: undefined,
            createdAt: undefined,
            lastLoginAt: undefined,
          });
        }

        setAdmins(adminList);

        // 역할 선택 초기화
        const roleMap: Record<string, string> = {};
        adminList.forEach((admin) => {
          roleMap[admin.id] = admin.role;
        });
        setRoleSelects(roleMap);
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleUpdateRole = async (adminId: string, newRole: string) => {
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.AUTH.UPDATE_ROLE(adminId),
        { role: newRole }
      );

      if (response.success) {
        setRoleSelects({ ...roleSelects, [adminId]: newRole });
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to update role'}`);
        loadAdmins();
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
      loadAdmins();
    }
  };

  const handleApproveAdmin = async (adminId: string) => {
    const roleSelect = roleSelects[adminId] || 'ADMIN';
    const roleText = roleSelect === 'LEADER' ? '리더' : '관리자';
    if (!window.confirm(`${roleText} 계정을 승인하시겠습니까?`)) {
      return;
    }

    try {
      let endpoint: string;
      if (currentUser?.role === 'DEVELOPER') {
        endpoint =
          roleSelect === 'LEADER'
            ? API_ENDPOINTS.AUTH.APPROVE_LEADER
            : API_ENDPOINTS.AUTH.APPROVE_ADMIN;
      } else if (currentUser?.role === 'LEADER' && roleSelect === 'ADMIN') {
        endpoint = API_ENDPOINTS.AUTH.APPROVE_ADMIN;
      } else {
        alert(
          '권한이 없습니다. DEVELOPER는 LEADER와 ADMIN을 승인할 수 있고, LEADER는 ADMIN만 승인할 수 있습니다.'
        );
        return;
      }

      const response = await apiClient.post(endpoint, { adminId });

      if (response.success) {
        window.alert(
          `${roleSelect === 'LEADER' ? '리더' : '관리자'} 계정이 성공적으로 승인되었습니다.`
        );
        loadAdmins();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to approve admin'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleDeleteAdmin = async (adminId: string, username?: string) => {
    if (
      !window.confirm(
        `Вы уверены, что хотите удалить администратора "${username || 'Admin'}"?`
      )
    ) {
      return;
    }

    try {
      const response = await apiClient.delete(
        API_ENDPOINTS.AUTH.DELETE_ADMIN(adminId)
      );

      if (response.success) {
        window.alert('Администратор успешно удален');
        loadAdmins();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to delete admin'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const canDelete = (admin: Admin) => {
    return (
      ['DEVELOPER', 'LEADER'].includes(currentUser?.role || '') &&
      admin.role !== 'DEVELOPER' &&
      admin.id !== 'DEVELOPER' &&
      (currentUser?.role === 'DEVELOPER' ||
        (admin.role !== 'LEADER' && admin.id !== currentUser?.id))
    );
  };

  const canApprove = (admin: Admin) => {
    return (
      admin.status === 'PENDING' &&
      ((currentUser?.role === 'DEVELOPER') ||
        (admin.role === 'ADMIN' && currentUser?.role === 'LEADER'))
    );
  };

  const canChangeRole = (admin: Admin) => {
    return (
      admin.status === 'PENDING' &&
      ((currentUser?.role === 'DEVELOPER') ||
        (admin.role === 'ADMIN' && currentUser?.role === 'LEADER'))
    );
  };

  return (
    <div className="tab-content" id="admin-management">
      <div className="controls">
        <button type="button" className="btn" onClick={loadAdmins}>
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : admins.length === 0 ? (
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Нет администраторов</p>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Approved By</th>
                <th>Created At</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const canDel = canDelete(admin);
                const canApp = canApprove(admin);
                const canChange = canChangeRole(admin);

                return (
                  <tr key={admin.id}>
                    <td>{admin.username || 'DEVELOPER'}</td>
                    <td>
                      {canChange ? (
                        <select
                          id={`roleSelect_${admin.id}`}
                          value={roleSelects[admin.id] || admin.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            setRoleSelects({ ...roleSelects, [admin.id]: newRole });
                            handleUpdateRole(admin.id, newRole);
                          }}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '2px solid rgba(255, 0, 255, 0.3)',
                            borderRadius: '4px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        >
                          <option value="ADMIN">ADMIN</option>
                          {currentUser?.role === 'DEVELOPER' && (
                            <option value="LEADER">LEADER</option>
                          )}
                        </select>
                      ) : (
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background:
                              admin.role === 'DEVELOPER'
                                ? '#ff00ff'
                                : admin.role === 'LEADER'
                                ? '#00ffff'
                                : '#00ff00',
                            color:
                              admin.role === 'DEVELOPER' ||
                              admin.role === 'LEADER'
                                ? '#ffffff'
                                : '#000000',
                          }}
                        >
                          {admin.role}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          background:
                            admin.status === 'APPROVED'
                              ? 'rgba(0, 255, 0, 0.3)'
                              : 'rgba(255, 255, 0, 0.3)',
                          color:
                            admin.status === 'APPROVED' ? '#00ff00' : '#ffff00',
                        }}
                      >
                        {admin.status || 'APPROVED'}
                      </span>
                    </td>
                    <td>
                      {admin.approvedBy
                        ? `${admin.approvedBy.username} (${admin.approvedBy.role})`
                        : admin.role === 'DEVELOPER'
                        ? 'N/A'
                        : 'Pending'}
                    </td>
                    <td>
                      {admin.createdAt
                        ? new Date(admin.createdAt).toLocaleString('ru-RU')
                        : 'N/A'}
                    </td>
                    <td>
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleString('ru-RU')
                        : 'Never'}
                    </td>
                    <td style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {canApp && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleApproveAdmin(admin.id)}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Одобрить
                        </button>
                      )}
                      {canDel && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteAdmin(admin.id, admin.username)}
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                        >
                          Удалить
                        </button>
                      )}
                      {!canApp && !canDel && '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminManagementTab;

