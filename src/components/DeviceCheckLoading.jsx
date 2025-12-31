import React, { useState, useEffect } from 'react';
import './DeviceCheckLoading.css';

const DeviceCheckLoading = ({ message = 'Проверка безопасности...' }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '') return '.';
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="device-check-loading">
      <div className="device-check-content">
        <div className="device-check-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <div className="device-check-message">
          {message}
          <span className="device-check-dots">{dots}</span>
        </div>
      </div>
    </div>
  );
};

export default DeviceCheckLoading;

