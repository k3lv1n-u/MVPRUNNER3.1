import React, { useState, useMemo, useEffect } from 'react';
import './Settings.css';
import soundManager from '../utils/soundManager';

const Settings = ({ onBack }) => {
  const [bgMusicEnabled, setBgMusicEnabled] = useState(() => {
    const saved = localStorage.getItem('bgMusicEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEffectsEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [bgMusicVolume, setBgMusicVolume] = useState(() => {
    const saved = localStorage.getItem('bgMusicVolume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [soundEffectsVolume, setSoundEffectsVolume] = useState(() => {
    const saved = localStorage.getItem('soundEffectsVolume');
    return saved !== null ? parseFloat(saved) : 0.7;
  });

  // SoundManager와 동기화
  useEffect(() => {
    soundManager.setBackgroundMusicEnabled(bgMusicEnabled);
    soundManager.setBackgroundMusicVolume(bgMusicVolume);
    soundManager.setSoundEffectsEnabled(soundEffectsEnabled);
    soundManager.setSoundEffectsVolume(soundEffectsVolume);
  }, [bgMusicEnabled, bgMusicVolume, soundEffectsEnabled, soundEffectsVolume]);

  // 별 위치 메모이제이션 (성능 최적화)
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2
    }));
  }, []);

  const handleBgMusicToggle = () => {
    soundManager.playButtonClick();
    const newValue = !bgMusicEnabled;
    setBgMusicEnabled(newValue);
    localStorage.setItem('bgMusicEnabled', newValue.toString());
    soundManager.setBackgroundMusicEnabled(newValue);
  };

  const handleSoundEffectsToggle = () => {
    soundManager.playButtonClick();
    const newValue = !soundEffectsEnabled;
    setSoundEffectsEnabled(newValue);
    localStorage.setItem('soundEffectsEnabled', newValue.toString());
    soundManager.setSoundEffectsEnabled(newValue);
  };

  const handleBgMusicVolumeChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setBgMusicVolume(newValue);
    localStorage.setItem('bgMusicVolume', newValue.toString());
    soundManager.setBackgroundMusicVolume(newValue);
  };

  const handleSoundEffectsVolumeChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setSoundEffectsVolume(newValue);
    localStorage.setItem('soundEffectsVolume', newValue.toString());
    soundManager.setSoundEffectsVolume(newValue);
  };

  const handleBackClick = () => {
    soundManager.playButtonClick();
    onBack();
  };

  return (
    <div className="settings-container">
      {/* 밤하늘 별 배경 */}
      <div className="stars-background">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`
            }}
          />
        ))}
      </div>

      <div className="settings-content">
        <h2 className="settings-title">НАСТРОЙКИ</h2>
        
        <div className="settings-section">
          {/* 배경음악 설정 */}
          <div className="setting-item">
            <div className="setting-label-row">
              <label className="setting-label">Фоновая музыка</label>
              <button
                className={`toggle-btn ${bgMusicEnabled ? 'enabled' : 'disabled'}`}
                onClick={handleBgMusicToggle}
              >
                <span className="toggle-slider"></span>
              </button>
            </div>
            {bgMusicEnabled && (
              <div className="volume-control">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={bgMusicVolume}
                  onChange={handleBgMusicVolumeChange}
                  onInput={handleBgMusicVolumeChange}
                  className="volume-slider"
                />
                <span className="volume-value">{Math.round(bgMusicVolume * 100)}%</span>
              </div>
            )}
          </div>

          {/* 효과음 설정 */}
          <div className="setting-item">
            <div className="setting-label-row">
              <label className="setting-label">Звуковые эффекты</label>
              <button
                className={`toggle-btn ${soundEffectsEnabled ? 'enabled' : 'disabled'}`}
                onClick={handleSoundEffectsToggle}
              >
                <span className="toggle-slider"></span>
              </button>
            </div>
            {soundEffectsEnabled && (
              <div className="volume-control">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={soundEffectsVolume}
                  onChange={handleSoundEffectsVolumeChange}
                  onInput={handleSoundEffectsVolumeChange}
                  className="volume-slider"
                />
                <span className="volume-value">{Math.round(soundEffectsVolume * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        <button className="back-btn" onClick={handleBackClick}>
          НАЗАД
        </button>
      </div>
    </div>
  );
};

export default Settings;

