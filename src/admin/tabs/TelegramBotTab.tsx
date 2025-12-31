/**
 * Telegram Bot Tab 컴포넌트
 * 기존 index.html의 loadBotStatus, loadBotConfig, sendBroadcast 함수를 React로 구현
 */

import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { BotStatus, BotConfig, RequiredChannel } from '../types';

const TelegramBotTab: React.FC = () => {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [requiredChannels, setRequiredChannels] = useState<RequiredChannel[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastFilter, setBroadcastFilter] = useState('all');
  const [broadcastResult, setBroadcastResult] = useState('');
  const [broadcastImageFile, setBroadcastImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Bot Config Form State
  const [botToken, setBotToken] = useState('');
  const [miniAppUrl, setMiniAppUrl] = useState('');
  const [notificationChannelId, setNotificationChannelId] = useState('');

  // Required Channels Form State (removed - channels are edited directly in the list)

  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadBotStatus = async () => {
    try {
      const response = await apiClient.get<{ status: BotStatus }>(
        API_ENDPOINTS.TELEGRAM_BOT.STATUS
      );

      if (response.success && response.status) {
        setBotStatus(response.status);
      }
    } catch (err: any) {
      console.error('Error loading bot status:', err);
    }
  };

  const loadBotConfig = async () => {
    try {
      const response = await apiClient.get<{ config: BotConfig }>(
        API_ENDPOINTS.BOT_CONFIG.GET
      );

      if (response.success && response.config) {
        setBotConfig(response.config);
        setMiniAppUrl(response.config.miniAppUrl || '');
        setNotificationChannelId(response.config.notificationChannelId || '');
      }
    } catch (err: any) {
      console.error('Error loading bot config:', err);
    }
  };

  const loadRequiredChannels = async () => {
    try {
      const response = await apiClient.get<{ channels: RequiredChannel[] }>(
        API_ENDPOINTS.ADMIN.REQUIRED_CHANNELS
      );

      if (response.success && response.channels) {
        setRequiredChannels(response.channels);
      }
    } catch (err: any) {
      console.error('Error loading required channels:', err);
    }
  };

  useEffect(() => {
    loadBotStatus();
    loadBotConfig();
    loadRequiredChannels();

    // 30초마다 봇 상태 업데이트 (Telegram Bot 탭이 활성일 때만)
    statusIntervalRef.current = setInterval(() => {
      loadBotStatus();
    }, 30000);

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);

  const handleSaveBotConfig = async () => {
    if (!botToken && !miniAppUrl) {
      window.alert('Пожалуйста, введите хотя бы токен бота или Mini App URL');
      return;
    }

    setSaving(true);

    try {
      const response = await apiClient.post(API_ENDPOINTS.BOT_CONFIG.SAVE, {
        botToken: botToken || undefined,
        miniAppUrl: miniAppUrl || undefined,
        notificationChannelId: notificationChannelId || undefined,
      });

      if (response.success) {
        window.alert('Настройки сохранены! Теперь активируйте бота.');
        setBotToken('');
        loadBotConfig();
      } else {
        window.alert(`Ошибка: ${response.error || 'Неизвестная ошибка'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка при сохранении настроек: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBotActive = async () => {
    try {
      const response = await apiClient.post<{ isActive: boolean }>(
        API_ENDPOINTS.BOT_CONFIG.TOGGLE_ACTIVE
      );

      if (response.success) {
        window.alert(response.isActive ? 'Бот активирован!' : 'Бот деактивирован!');
        loadBotConfig();
        setTimeout(() => loadBotStatus(), 2000);
      } else {
        window.alert(`Ошибка: ${response.error || 'Неизвестная ошибка'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      setBroadcastResult('<div class="error">Пожалуйста, введите сообщение.</div>');
      return;
    }

    if (!window.confirm('Вы уверены, что хотите отправить рассылку всем пользователям?')) {
      return;
    }

    setBroadcastResult('<div class="loading">Отправка рассылки...</div>');

    try {
      const userFilter: any = {};
      if (broadcastFilter === 'active') {
        userFilter.isBlocked = false;
      } else if (broadcastFilter === 'subscribed') {
        userFilter.subscribedChannels = { $exists: true, $ne: [] };
      }

      const formData = new FormData();
      formData.append('message', broadcastMessage);
      formData.append('userFilter', JSON.stringify(userFilter));
      if (broadcastImageFile) {
        formData.append('image', broadcastImageFile);
      }

      const response = await apiClient.postFormData<{
        result: { total: number; successCount: number; failCount: number };
      }>(API_ENDPOINTS.TELEGRAM_BOT.BROADCAST, formData);

      if (response.success && response.result) {
        setBroadcastResult(`
          <div class="success">
            Рассылка отправлена!<br>
            Всего: ${response.result.total}<br>
            Успешно: ${response.result.successCount}<br>
            Ошибок: ${response.result.failCount}
          </div>
        `);
        setBroadcastMessage('');
      } else {
        setBroadcastResult(
          `<div class="error">Ошибка: ${response.error || 'Неизвестная ошибка'}</div>`
        );
      }
    } catch (err: any) {
      setBroadcastResult(
        `<div class="error">Ошибка при отправке рассылки: ${err.message}</div>`
      );
    }
  };

  const handleAddRequiredChannel = () => {
    setRequiredChannels([
      ...requiredChannels,
      { title: '', url: '', chatId: null, accessHash: undefined },
    ]);
  };

  const handleRemoveRequiredChannel = (index: number) => {
    setRequiredChannels(requiredChannels.filter((_, i) => i !== index));
  };

  const handleSaveRequiredChannels = async () => {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.ADMIN.REQUIRED_CHANNELS,
        { requiredChannels }
      );

      if (response.success) {
        window.alert('Каналы сохранены');
        loadRequiredChannels();
      } else {
        window.alert(`Ошибка: ${response.error || 'Failed to save channels'}`);
      }
    } catch (err: any) {
      window.alert(`Ошибка: ${err.message}`);
    }
  };

  const getBotStatusDisplay = () => {
    if (!botStatus) return null;

    const isInitialized = botStatus.isInitialized || false;
    const isWebhookActive = botStatus.isWebhookActive || false;
    const isActive = botStatus.isActive || false;
    const botWorking = isActive && (isWebhookActive || isInitialized);

    let statusClass = 'bot-status-error';
    let statusIcon = '🔴';
    let statusText = 'Бот не работает';
    let statusColor = '#ff4444';

    if (botWorking) {
      statusClass = 'bot-status-success';
      statusIcon = '🟢';
      statusText = 'Бот работает';
      statusColor = '#4A6FA5';
    } else if (isActive && !isWebhookActive) {
      statusClass = 'bot-status-warning';
      statusIcon = '🟡';
      statusText = 'Бот активирован, но webhook не настроен';
      statusColor = '#ffaa00';
    }

    const details = [];
    details.push(`Активен: ${isActive ? '✅ Да' : '❌ Нет'}`);
    if (isWebhookActive) {
      details.push(`Webhook: ✅ Активен`);
      if (botStatus.webhookUrl) {
        details.push(`Webhook URL: ${botStatus.webhookUrl}`);
      }
      if (botStatus.webhookPendingUpdates !== undefined) {
        details.push(
          `Ожидающие обновления: ${botStatus.webhookPendingUpdates}`
        );
      }
    } else {
      details.push(`Webhook: ❌ Неактивен`);
    }
    if (botStatus.miniAppUrl) {
      details.push(`Mini App URL: ${botStatus.miniAppUrl}`);
    }
    if (botStatus.hasToken !== undefined) {
      details.push(
        `Токен: ${botStatus.hasToken ? '✅ Установлен' : '❌ Не установлен'}`
      );
    }

    return (
      <div className={`bot-status-card ${statusClass}`}>
        <div className="bot-status-header">
          <span style={{ fontSize: '20px', marginRight: '10px' }}>
            {statusIcon}
          </span>
          <span style={{ color: statusColor }}>{statusText}</span>
        </div>
        <div className="bot-status-details">{details.join('\n')}</div>
      </div>
    );
  };

  return (
    <div className="tab-content" id="telegram-bot">
      {getBotStatusDisplay()}

      {/* Bot Config Section */}
      <div className="bot-config-section">
        <h3 className="bot-section-title">Настройки бота</h3>
        <div className="form-group">
          <label className="form-label">Токен бота:</label>
          <input
            type="text"
            id="botTokenInput"
            className="bot-input"
            placeholder={
              botConfig?.hasToken
                ? 'Токен уже установлен (введите новый для изменения)'
                : 'Введите токен бота'
            }
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
          />
          <span className="form-help">
            Токен можно получить у @BotFather в Telegram
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">Mini App URL:</label>
          <input
            type="text"
            id="miniAppUrlInput"
            className="bot-input"
            placeholder="https://example.com"
            value={miniAppUrl}
            onChange={(e) => setMiniAppUrl(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ID канала для уведомлений:</label>
          <input
            type="text"
            id="notificationChannelIdInput"
            className="bot-input"
            placeholder="@channel или -1001234567890"
            value={notificationChannelId}
            onChange={(e) => setNotificationChannelId(e.target.value)}
          />
        </div>
        <div className="controls">
          <button
            type="button"
            className="btn"
            onClick={handleSaveBotConfig}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
          <button
            type="button"
            className="btn"
            id="toggleBotBtn"
            onClick={handleToggleBotActive}
            style={{
              background: botConfig?.isActive ? '#ff0000' : '#ffaa00',
              color: botConfig?.isActive ? '#fff' : '#000',
            }}
          >
            {botConfig?.isActive ? 'Деактивировать бота' : 'Активировать бота'}
          </button>
        </div>
      </div>

      {/* Required Channels Section */}
      <div className="channel-section">
        <h3 className="bot-section-title">Обязательные каналы</h3>
        <div className="channel-info-box">
          <p className="channel-info-text">
            Пользователи должны быть подписаны на эти каналы, чтобы использовать
            бота. Добавьте каналы, на которые должны подписаться пользователи.
          </p>
        </div>
        {requiredChannels.map((channel, index) => (
          <div key={index} className="channel-item">
            <label>Канал {index + 1}:</label>
            <input
              type="text"
              value={channel.title}
              onChange={(e) => {
                const newChannels = [...requiredChannels];
                newChannels[index].title = e.target.value;
                setRequiredChannels(newChannels);
              }}
              placeholder="Название канала"
            />
            <input
              type="text"
              value={channel.url}
              onChange={(e) => {
                const newChannels = [...requiredChannels];
                newChannels[index].url = e.target.value;
                setRequiredChannels(newChannels);
              }}
              placeholder="URL канала (https://t.me/your_channel)"
              style={{ marginTop: '10px' }}
            />
            <input
              type="text"
              value={channel.chatId !== undefined && channel.chatId !== null ? channel.chatId.toString() : ''}
              onChange={(e) => {
                const newChannels = [...requiredChannels];
                const val = e.target.value.trim();
                newChannels[index].chatId = val ? Number(val) : null;
                setRequiredChannels(newChannels);
              }}
              placeholder="ID канала (-1001234567890, опционально)"
              style={{ marginTop: '10px' }}
            />
            <button
              className="btn btn-danger"
              onClick={() => handleRemoveRequiredChannel(index)}
              style={{ marginTop: '10px' }}
            >
              Удалить
            </button>
          </div>
        ))}
        <div className="controls">
          <button type="button" className="btn" onClick={handleAddRequiredChannel}>
            + Добавить канал
          </button>
          <button type="button" className="btn" onClick={handleSaveRequiredChannels}>
            Сохранить каналы
          </button>
        </div>
      </div>

      {/* Broadcast Section */}
      <div className="broadcast-section">
        <h3>Рассылка сообщений</h3>
        <div className="form-group">
          <label className="form-label">Сообщение:</label>
          <textarea
            id="broadcastMessage"
            className="broadcast-textarea"
            placeholder="Введите сообщение для рассылки..."
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Изображение (опционально):</label>
          <input
            type="file"
            accept="image/*"
            className="bot-input"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setBroadcastImageFile(file);
            }}
          />
          <span className="form-help">
            Можно загрузить любое изображение (до 5MB), оно будет отправлено вместе с сообщением
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">Фильтр пользователей:</label>
          <select
            id="broadcastFilter"
            className="filter-select"
            value={broadcastFilter}
            onChange={(e) => setBroadcastFilter(e.target.value)}
          >
            <option value="all">Все пользователи</option>
            <option value="active">Только активные</option>
            <option value="subscribed">Только подписанные на каналы</option>
          </select>
        </div>
        <div className="controls">
          <button type="button" className="btn" onClick={handleSendBroadcast}>
            Отправить рассылку
          </button>
        </div>
        {broadcastResult && (
          <div
            dangerouslySetInnerHTML={{ __html: broadcastResult }}
            style={{ marginTop: '20px' }}
          />
        )}
      </div>
    </div>
  );
};

export default TelegramBotTab;

