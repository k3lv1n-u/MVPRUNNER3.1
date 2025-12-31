import React, { useState, useEffect } from 'react';
import './NewYear2026.css';

const NewYear2026 = ({ onComplete }) => {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 3초 후 페이드아웃 시작
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3000);

    // 4초 후 완전히 닫기
    const closeTimer = setTimeout(() => {
      setShow(false);
      if (onComplete) {
        onComplete();
      }
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [onComplete]);

  if (!show) {
    return null;
  }

  return (
    <div className={`new-year-2026-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="new-year-background"></div>
      
      {/* 불꽃놀이 효과 */}
      <div className="fireworks">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="firework"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="new-year-content">
        <div className="year-number">2026</div>
        <div className="new-year-title">새해 복 많이 받으세요!</div>
        <div className="new-year-subtitle">Happy New Year!</div>
        <div className="celebration-icons">
          <span className="celebration-icon">🎊</span>
          <span className="celebration-icon">🎉</span>
          <span className="celebration-icon">🎆</span>
        </div>
      </div>

      {/* 떨어지는 색종이 */}
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              backgroundColor: ['#FF6B6B', '#FFD93D', '#4ECDC4', '#95E1D3', '#F38181'][Math.floor(Math.random() * 5)]
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default NewYear2026;

