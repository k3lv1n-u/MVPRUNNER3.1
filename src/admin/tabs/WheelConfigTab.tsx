/**
 * Wheel Config Tab 컴포넌트
 * 기존 index.html의 loadActiveWheelConfig, saveWheelConfig 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { WheelConfig, WheelSegment } from '../types';

const WheelConfigTab: React.FC = () => {
  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadActiveWheelConfig = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<{ configs: WheelConfig[] }>(
        API_ENDPOINTS.WHEEL_CONFIGS.LIST
      );

      if (response.success && response.configs) {
        // 활성화된 설정 찾기
        let activeConfig =
          response.configs.find((c: WheelConfig) => c.isActive) ||
          response.configs.find((c: WheelConfig) => c.isDefault) ||
          response.configs[0];

        // 설정이 없으면 기본값 생성
        if (!activeConfig) {
          const defaultResponse = await apiClient.get<{ config: WheelConfig }>(
            API_ENDPOINTS.WHEEL_CONFIGS.DEFAULT
          );
          if (defaultResponse.success && defaultResponse.config) {
            activeConfig = defaultResponse.config;
          }
        }

        if (activeConfig) {
          setConfig(activeConfig);
          setSegments(
            activeConfig.segments && activeConfig.segments.length > 0
              ? [...activeConfig.segments]
              : []
          );

          // 세그먼트가 없으면 기본 8개 추가
          if (
            !activeConfig.segments ||
            activeConfig.segments.length === 0
          ) {
            const defaultSegments: WheelSegment[] = Array.from(
              { length: 8 },
              () => ({
                value: 100,
                label: '100 USDT',
                color: '#1a1a1a',
                gradient: ['#0f0f0f', '#222222'],
              })
            );
            setSegments(defaultSegments);
          }
        } else {
          setError('Не удалось загрузить конфигурацию');
        }
      } else {
        setError(response.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading wheel config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveWheelConfig();
  }, []);

  const handleAddSegment = () => {
    setSegments([
      ...segments,
      {
        value: 100,
        label: '100 USDT',
        color: '#1a1a1a',
        gradient: ['#0f0f0f', '#222222'],
      },
    ]);
  };

  const handleRemoveSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleSegmentChange = (
    index: number,
    field: 'value' | 'label',
    value: string | number
  ) => {
    const newSegments = [...segments];
    newSegments[index] = {
      ...newSegments[index],
      [field]: value,
    };
    setSegments(newSegments);
  };

  const handleSave = async () => {
    if (!config) {
      window.alert('Конфигурация не загружена');
      return;
    }

    if (segments.length < 4 || segments.length > 16) {
      window.alert('Добавьте от 4 до 16 сегментов');
      return;
    }

    setSaving(true);

    try {
      const response = await apiClient.put(
        API_ENDPOINTS.WHEEL_CONFIGS.UPDATE(config._id),
        {
          segments: segments.map((s) => ({
            value: s.value,
            label: s.label,
            color: s.color || '#1a1a1a',
            gradient: s.gradient || ['#0f0f0f', '#222222'],
          })),
          isActive: true,
        }
      );

      if (response.success) {
        window.alert('Конфигурация сохранена успешно');
        loadActiveWheelConfig();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to save config'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (error) {
    return <div className="error">Ошибка: {error}</div>;
  }

  const isActive = config?.isActive
    ? '🟢 Активна (используется в игре)'
    : '🔴 Неактивна';

  return (
    <div className="tab-content" id="wheel-configs">
      <div className="controls">
        <button type="button" className="btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button type="button" className="btn" onClick={loadActiveWheelConfig}>
          Обновить
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
          }}
        >
          <div>
            <h3 style={{ color: '#ffffff', margin: 0 }}>
              {config?.name || 'Конфигурация рулетки'}
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '5px 0 0 0' }}>
              {isActive}
            </p>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Сегменты рулетки (4-16):</label>
        <div>
          {segments.map((segment, index) => (
            <div
              key={index}
              className="form-group"
              style={{
                border: '1px solid rgba(255, 0, 255, 0.3)',
                padding: '10px',
                marginBottom: '10px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '12px' }}>Значение (USDT):</label>
                  <input
                    type="number"
                    className="segment-value"
                    value={segment.value}
                    onChange={(e) =>
                      handleSegmentChange(
                        index,
                        'value',
                        parseInt(e.target.value) || 0
                      )
                    }
                    min="1"
                    style={{ width: '100%', padding: '5px' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '12px' }}>Метка:</label>
                  <input
                    type="text"
                    className="segment-label"
                    value={segment.label}
                    onChange={(e) =>
                      handleSegmentChange(index, 'label', e.target.value)
                    }
                    style={{ width: '100%', padding: '5px' }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleRemoveSegment(index)}
                  style={{ padding: '5px 10px', fontSize: '12px' }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn"
          onClick={handleAddSegment}
          style={{ marginTop: '10px' }}
        >
          + Добавить сегмент
        </button>
      </div>
    </div>
  );
};

export default WheelConfigTab;

