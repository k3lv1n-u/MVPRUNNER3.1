import React, { useMemo } from 'react';
import soundManager from '../utils/soundManager';
import './About.css';
import './ChristmasStyles.css';

const About = ({ onBack }) => {
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

  return (
    <div className="about-container">
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

      <div className="about-content">
        <h2 className="about-title">О НАС</h2>
        <div className="about-text">
          <p>
            <strong>MVP Runner</strong> — это еженедельный соревновательный раннер с реальными призами в USDT. Игроки участвуют в забегах, набирают очки, используют имбовые предметы и борются за первое место. Каждый забег — новые правила, новый банк и новые победители.
          </p>
        </div>
        <button className="back-btn christmas-btn-green" onClick={() => { soundManager.playButtonClick(); onBack(); }}>
          НАЗАД
        </button>
      </div>
    </div>
  );
};

export default About;

