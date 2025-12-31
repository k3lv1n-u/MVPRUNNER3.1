/**
 * Ad Management Tab 컴포넌트
 * 기존 index.html의 loadAdImage, uploadAdImage, resetAdImage 함수를 React로 구현
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { AdImageInfo } from '../types';

const AdManagementTab: React.FC = () => {
  const [adImageInfo, setAdImageInfo] = useState<AdImageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [imageSrc, setImageSrc] = useState('');

  const loadAdImage = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<AdImageInfo>(
        API_ENDPOINTS.GAME_CONFIG.AD_IMAGE
      );

      if (response.success) {
        // API 응답 구조에 따라 data 또는 직접 응답 사용
        const adImageData = (response as any).data || response;
        setAdImageInfo(adImageData);

        // 이미지 소스 설정 (캐시 방지)
        const version = adImageData.version || Date.now();
        if (adImageData.hasImageData) {
          setImageSrc(`/api/game-config/ad-image/data?v=${version}`);
        } else {
          setImageSrc(`${adImageData.adImagePath || '/gyrocop.png'}?v=${version}`);
        }
      } else {
        setError(response.error || 'Failed to load ad image');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading ad image');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdImage();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      window.alert('Пожалуйста, выберите файл изображения');
      return;
    }

    // 파일 크기 제한 (예: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      window.alert('Размер файла не должен превышать 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      // 서버 multer 설정에서 기대하는 필드 이름은 'adImage'입니다.
      formData.append('adImage', file);

      const response = await apiClient.postFormData(
        API_ENDPOINTS.GAME_CONFIG.AD_IMAGE_UPLOAD,
        formData
      );

      if (response.success) {
        window.alert('Изображение загружено успешно!');
        // 이미지 다시 로드 (캐시 방지)
        setTimeout(() => {
          loadAdImage();
        }, 500);
      } else {
        setError(response.error || 'Failed to upload image');
        window.alert(`Ошибка: ${response.error || 'Failed to upload image'}`);
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading image');
      window.alert(`Ошибка: ${err.message}`);
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      e.target.value = '';
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Сбросить изображение к значению по умолчанию?')) {
      return;
    }

    setResetting(true);
    setError('');

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.GAME_CONFIG.AD_IMAGE_RESET
      );

      if (response.success) {
        window.alert('Изображение сброшено к значению по умолчанию');
        setTimeout(() => {
          loadAdImage();
        }, 500);
      } else {
        setError(response.error || 'Failed to reset image');
        window.alert(`Ошибка: ${response.error || 'Failed to reset image'}`);
      }
    } catch (err: any) {
      setError(err.message || 'Error resetting image');
      window.alert(`Ошибка: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="tab-content" id="ad-management">
      <div className="page-header">
        <h1 className="page-title">Управление рекламой</h1>
        <p className="page-subtitle">
          Загрузите изображение для отображения в игре (вместо гирокоптера)
        </p>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : error ? (
        <div className="error">Ошибка: {error}</div>
      ) : (
        <>
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '15px' }}>
              Текущее рекламное изображение:
            </h3>
            <div
              style={{
                border: '2px solid var(--border-color-bright)',
                padding: '10px',
                display: 'inline-block',
                background: 'rgba(10, 10, 12, 0.8)',
              }}
            >
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt="Текущее рекламное изображение"
                  style={{
                    maxWidth: '400px',
                    maxHeight: '200px',
                    display: 'block',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `/gyrocop.png?v=${Date.now()}`;
                  }}
                />
              )}
              <p
                style={{
                  marginTop: '10px',
                  color: 'var(--text-tertiary)',
                  fontSize: '12px',
                }}
              >
                {adImageInfo?.hasImageData
                  ? 'Источник: База данных'
                  : `Путь: ${adImageInfo?.adImagePath || '/gyrocop.png'}`}
              </p>
            </div>
          </div>

          <div className="controls">
            <input
              type="file"
              id="adImageInput"
              accept="image/*"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
            <label htmlFor="adImageInput">
              <button
                className="btn"
                onClick={() => {
                  document.getElementById('adImageInput')?.click();
                }}
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : 'Загрузить изображение'}
              </button>
            </label>
            <button
              type="button"
              className="btn"
              onClick={handleReset}
              disabled={resetting}
              style={{ background: '#ff4444' }}
            >
              {resetting ? 'Сброс...' : 'Сбросить к значению по умолчанию'}
            </button>
            <button type="button" className="btn" onClick={loadAdImage}>
              Обновить
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdManagementTab;

