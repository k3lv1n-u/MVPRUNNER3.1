import React from 'react';
import './AccountBlocked.css';

const AccountBlocked = ({ reason = '' }) => {
  return (
    <div className="account-blocked">
      <div className="stars-background">
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="star" 
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      
      <div className="account-blocked-content">
        <div className="account-blocked-icon">🚫</div>
        <h1 className="account-blocked-title">Аккаунт заблокирован</h1>
        <p className="account-blocked-message">
          Ваш аккаунт был заблокирован за использование эмулятора или виртуальной машины.
        </p>
        <p className="account-blocked-submessage">
          Использование эмуляторов запрещено правилами игры.
        </p>
        <div className="account-blocked-footer">
          <p>Пожалуйста, запустите игру на реальном устройстве.</p>
        </div>
      </div>
    </div>
  );
};

export default AccountBlocked;

