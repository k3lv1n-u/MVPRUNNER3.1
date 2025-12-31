import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import soundManager from '../utils/soundManager';
import './WheelOfFortune.css';

const WheelOfFortune = ({ onBack, onWin, telegramId, initialPromoCode = null }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [cryptoPaymentInfo, setCryptoPaymentInfo] = useState(null);
  const [segments, setSegments] = useState([
    { value: 100, label: '100 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] },
    { value: 250, label: '250 USDT', color: '#1f1f1f', gradient: ['#141414', '#2a2a2a'] },
    { value: 500, label: '500 USDT', color: '#242424', gradient: ['#191919', '#2f2f2f'] },
    { value: 1000, label: '1000 USDT', color: '#292929', gradient: ['#1e1e1e', '#343434'] },
    { value: 1000, label: '1000 USDT', color: '#2e2e2e', gradient: ['#232323', '#393939'] },
    { value: 100, label: '100 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] },
    { value: 100, label: '100 USDT', color: '#1f1f1f', gradient: ['#141414', '#2a2a2a'] },
    { value: 25, label: '25 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] }
  ]);
  const wheelRef = useRef(null);

  // 초기 프로모션 코드 설정
  useEffect(() => {
    if (initialPromoCode) {
      setPromoCode(initialPromoCode);
      setCodeVerified(true);
    }
  }, [initialPromoCode]);

  // 로컬 스토리지에서 받은 프로모션 코드 확인 및 서버 설정 로드
  useEffect(() => {
    // initialPromoCode가 없을 때만 로컬 스토리지 확인
    if (!initialPromoCode) {
      const savedCode = localStorage.getItem('receivedPromoCode');
      if (savedCode) {
        try {
          const codeData = JSON.parse(savedCode);
          if (codeData && codeData.code) {
            setPromoCode(codeData.code);
          }
        } catch (e) {
          console.error('Error parsing saved promo code:', e);
        }
      }
    }

    // 서버에서 활성화된 휠 설정 로드
    const loadWheelConfig = async () => {
      try {
        const config = await api.getActiveWheelConfig();
        if (config && config.segments) {
          // 보라색 색상을 표준 스타일로 변환
          const convertedSegments = config.segments.map(segment => {
            // 보라색 계열 색상 감지 및 변환
            const purpleColors = ['#4a1a6b', '#3d1a5c', '#2e1a4d', '#1f1a3e', '#1a1a3e'];
            
            let newColor = segment.color;
            let newGradient = segment.gradient;
            
            // 보라색이면 표준 색상으로 변환
            if (purpleColors.includes(segment.color)) {
              const index = purpleColors.indexOf(segment.color);
              const standardColors = ['#1a1a1a', '#1f1f1f', '#242424', '#292929', '#2e2e2e'];
              const standardGradients = [['#0f0f0f', '#222222'], ['#141414', '#2a2a2a'], ['#191919', '#2f2f2f'], ['#1e1e1e', '#343434'], ['#232323', '#393939']];
              newColor = standardColors[index] || '#1a1a1a';
              newGradient = standardGradients[index] || ['#0f0f0f', '#222222'];
            }
            
            return {
              ...segment,
              color: newColor,
              gradient: newGradient
            };
          });
          setSegments(convertedSegments);
        }
      } catch (error) {
        console.error('Error loading wheel config:', error);
      }
    };
    loadWheelConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  // segments가 변경될 때마다 재계산
  const segmentAngle = segments.length > 0 ? 360 / segments.length : 45; // 기본값 45도
  const radius = 140; // SVG 반지름
  const centerX = 150;
  const centerY = 150;

  // SVG 경로 생성 함수
  const createSegmentPath = (index) => {
    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArc = segmentAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // 텍스트 위치 계산
  const getTextPosition = (index) => {
    const angle = (index * segmentAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
    const textRadius = radius * 0.65;
    const x = centerX + textRadius * Math.cos(angle);
    const y = centerY + textRadius * Math.sin(angle);
    const textAngle = (index * segmentAngle + segmentAngle / 2);
    return { x, y, angle: textAngle };
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    
    if (!code) {
      setCodeError('Введите промокод');
      return;
    }

    if (!telegramId) {
      setCodeError('Необходима авторизация');
      return;
    }
    
    try {
      const result = await api.verifyPromoCode(parseInt(telegramId), code);
      
      if (result.valid) {
        setCodeVerified(true);
        setCodeError('');
        
        // 프로모션 코드에 연결된 휠 설정이 있으면 로드
        if (result.wheelConfig && result.wheelConfig.segments) {
          // 보라색 색상을 표준 스타일로 변환
          const convertedSegments = result.wheelConfig.segments.map(segment => {
            const purpleColors = ['#4a1a6b', '#3d1a5c', '#2e1a4d', '#1f1a3e', '#1a1a3e'];
            if (purpleColors.includes(segment.color)) {
              const index = purpleColors.indexOf(segment.color);
              const standardColors = ['#1a1a1a', '#1f1f1f', '#242424', '#292929', '#2e2e2e'];
              const standardGradients = [['#0f0f0f', '#222222'], ['#141414', '#2a2a2a'], ['#191919', '#2f2f2f'], ['#1e1e1e', '#343434'], ['#232323', '#393939']];
              return {
                ...segment,
                color: standardColors[index] || '#1a1a1a',
                gradient: standardGradients[index] || ['#0f0f0f', '#222222']
              };
            }
            return segment;
          });
          setSegments(convertedSegments);
        } else {
          // 활성화된 휠 설정 로드
          const config = await api.getActiveWheelConfig();
          if (config && config.segments) {
            // 보라색 색상을 표준 스타일로 변환
            const convertedSegments = config.segments.map(segment => {
              const purpleColors = ['#4a1a6b', '#3d1a5c', '#2e1a4d', '#1f1a3e', '#1a1a3e'];
              if (purpleColors.includes(segment.color)) {
                const index = purpleColors.indexOf(segment.color);
                const standardColors = ['#1a1a1a', '#1f1f1f', '#242424', '#292929', '#2e2e2e'];
                const standardGradients = [['#0f0f0f', '#222222'], ['#141414', '#2a2a2a'], ['#191919', '#2f2f2f'], ['#1e1e1e', '#343434'], ['#232323', '#393939']];
                return {
                  ...segment,
                  color: standardColors[index] || '#1a1a1a',
                  gradient: standardGradients[index] || ['#0f0f0f', '#222222']
                };
              }
              return segment;
            });
            setSegments(convertedSegments);
          }
        }
      } else {
        setCodeError(result.error || 'Неверный промокод');
        setCodeVerified(false);
      }
    } catch (error) {
      setCodeError('Ошибка проверки промокода');
      setCodeVerified(false);
    }
  };

  const spinWheel = async () => {
    if (isSpinning || !codeVerified || !telegramId || !promoCode) return;
    soundManager.playButtonClick();
    
    setIsSpinning(true);
    setSelectedPrize(null);
    setCryptoPaymentInfo(null);
    
    try {
      // 서버에서 결과 계산
      const result = await api.spinWheel(parseInt(telegramId), promoCode.toUpperCase());
      
      if (result.success) {
        // 서버에서 반환한 segments 사용 (서버 설정과 일치)
        if (result.segments && result.segments.length > 0) {
          // 보라색 색상을 표준 스타일로 변환
          const convertedSegments = result.segments.map(segment => {
            const purpleColors = ['#4a1a6b', '#3d1a5c', '#2e1a4d', '#1f1a3e', '#1a1a3e'];
            if (purpleColors.includes(segment.color)) {
              const index = purpleColors.indexOf(segment.color);
              const standardColors = ['#1a1a1a', '#1f1f1f', '#242424', '#292929', '#2e2e2e'];
              const standardGradients = [['#0f0f0f', '#222222'], ['#141414', '#2a2a2a'], ['#191919', '#2f2f2f'], ['#1e1e1e', '#343434'], ['#232323', '#393939']];
              return {
                ...segment,
                color: standardColors[index] || '#1a1a1a',
                gradient: standardGradients[index] || ['#0f0f0f', '#222222']
              };
            }
            return segment;
          });
          setSegments(convertedSegments);
        }
        
        // 서버에서 계산된 결과 사용
        const selectedSegment = {
          value: result.prize.value,
          label: result.prize.label,
          index: result.prize.index
        };
        
        // 서버에서 계산된 회전 각도 사용 (현재 rotation에 더하기)
        // 서버는 이미 정확한 rotation을 계산했으므로 그대로 사용
        setRotation(prevRotation => prevRotation + result.rotation);
        
        // 회전 애니메이션 완료 후 결과 표시
        setTimeout(() => {
          setSelectedPrize(selectedSegment);
          setIsSpinning(false);
          
          if (result.cryptoPayment) {
            setCryptoPaymentInfo(result.cryptoPayment);
          }
          
          // 프로모션 코드 사용 완료 후 로컬 스토리지에서 제거
          localStorage.removeItem('receivedPromoCode');
          
          // 승리 처리
          if (onWin) {
            onWin(selectedSegment.value);
          }
        }, 3500); // 3.5초 회전 애니메이션
      } else {
        setIsSpinning(false);
        setCodeError(result.error || 'Ошибка при вращении рулетки');
      }
    } catch (error) {
      console.error('Error spinning wheel:', error);
      setIsSpinning(false);
      setCodeError(error.message || 'Ошибка при вращении рулетки');
    }
  };

  const handleBack = () => {
    if (!isSpinning) {
      soundManager.playButtonClick();
      onBack();
    }
  };

  return (
    <div className="wheel-container">
      {/* 밤하늘 별 배경 */}
      <div className="stars-background">
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="star" 
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* 타이틀 */}
      <div className="wheel-header">
        <h1 className="wheel-title">РУЛЕТКА</h1>
        <div className="top-badge">
          <div className="badge-content">
            <div className="badge-text-top">TOP-1</div>
            <div className="badge-text-bottom">MVP</div>
          </div>
        </div>
      </div>

      {/* 프로모션 코드 입력 */}
      {!codeVerified && (
        <div className="promo-code-section">
          <div className="promo-code-content">
            <h2 className="promo-code-title">Введите промокод</h2>
            <form onSubmit={handleCodeSubmit} className="promo-code-form">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setCodeError('');
                }}
                placeholder="ПРОМОКОД"
                className="promo-code-input"
                maxLength={20}
                autoFocus
              />
              {codeError && (
                <div className="promo-code-error">{codeError}</div>
              )}
              <button type="submit" className="promo-code-submit-btn">
                ПОДТВЕРДИТЬ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 휠 프레임 - 코드 확인 후에만 표시 */}
      {codeVerified && (
        <div className="wheel-frame">
        <div className="wheel-wrapper">
          {/* 포인터 */}
          <div className="wheel-pointer"></div>
          
          {/* SVG 휠 */}
          <svg 
            className="wheel-svg"
            viewBox="0 0 300 300"
            ref={wheelRef}
          >
            <defs>
              {/* 세그먼트 그라데이션 - 어둡고 스마트한 스타일 */}
              {segments.map((segment, index) => (
                <linearGradient key={`grad-${index}`} id={`segmentGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={segment.gradient[0]} stopOpacity="1" />
                  <stop offset="50%" stopColor={segment.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={segment.gradient[1]} stopOpacity="0.95" />
                </linearGradient>
              ))}
              
              {/* 그림자 필터 - 더 깊은 그림자 */}
              <filter id="segmentShadow">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                <feOffset dx="0" dy="3" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.4"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* 글로우 필터 - 텍스트용 (세련된 스타일) */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feOffset in="coloredBlur" dx="0" dy="0" result="offsetBlur"/>
                <feMerge>
                  <feMergeNode in="offsetBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* 텍스트 아웃라인 필터 */}
              <filter id="textOutline" x="-50%" y="-50%" width="200%" height="200%">
                <feMorphology operator="dilate" radius="1" in="SourceAlpha" result="dilated"/>
                <feGaussianBlur in="dilated" stdDeviation="1" result="blurred"/>
                <feFlood floodColor="#000000" floodOpacity="0.6" result="flood"/>
                <feComposite in="flood" in2="blurred" operator="in" result="mask"/>
                <feMerge>
                  <feMergeNode in="mask"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* 허브 그라데이션 - 어두운 스타일 */}
              <radialGradient id="hubGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#3a3a3a" />
                <stop offset="50%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </radialGradient>
              
              <radialGradient id="hubCenterGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#5a5a5a" />
                <stop offset="100%" stopColor="#3a3a3a" />
              </radialGradient>
              
              {/* 외곽 글로우 */}
              <filter id="outerGlow">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* 외곽 글로우 그라데이션 */}
              <linearGradient id="outerGlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#333333" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#444444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#333333" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            
            {/* 외곽 원형 글로우 */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius + 5}
              fill="none"
              stroke="url(#outerGlowGradient)"
              strokeWidth="8"
              opacity="0.4"
              filter="url(#outerGlow)"
            />
            
            <g 
              className={`wheel-group ${isSpinning ? 'spinning' : ''}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: '150px 150px',
                transition: isSpinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
              }}
            >
              {segments.map((segment, index) => {
                const textPos = getTextPosition(index);
                return (
                  <g key={index}>
                    {/* 세그먼트 배경 */}
                    <path
                      d={createSegmentPath(index)}
                      fill={`url(#segmentGradient-${index})`}
                      stroke="#333333"
                      strokeWidth="1"
                      filter="url(#segmentShadow)"
                      className="wheel-segment-path"
                    />
                    
                    {/* 세그먼트 내부 하이라이트 */}
                    <path
                      d={createSegmentPath(index)}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                    
                    {/* 텍스트 - 세련되고 깨끗한 스타일 */}
                    <g transform={`translate(${textPos.x}, ${textPos.y}) rotate(${textPos.angle})`}>
                      {/* 메인 텍스트 */}
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="segment-text"
                        filter="url(#textOutline)"
                        fontFamily="Arial, sans-serif"
                        letterSpacing="0.5"
                      >
                        {/* 금액 숫자 */}
                        <tspan 
                          x="0" 
                          dy="-7" 
                          fontSize="22" 
                          fontWeight="700"
                          fill="#ffffff"
                          stroke="none"
                        >
                          {segment.value}
                        </tspan>
                        
                        {/* USDT 라벨 */}
                        <tspan 
                          x="0" 
                          dy="16" 
                          fontSize="11" 
                          fontWeight="600"
                          fill="rgba(255, 255, 255, 0.85)"
                          letterSpacing="1"
                        >
                          USDT
                        </tspan>
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
            
            {/* 중앙 허브 - 어두운 스타일 */}
            <circle
              cx={centerX}
              cy={centerY}
              r="32"
              fill="url(#hubGradient)"
              stroke="#333333"
              strokeWidth="2"
              filter="url(#segmentShadow)"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r="24"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r="12"
              fill="url(#hubCenterGradient)"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r="6"
              fill="rgba(255, 255, 255, 0.2)"
            />
          </svg>
        </div>
      </div>
      )}

      {/* 결과 표시 */}
      {codeVerified && selectedPrize && !isSpinning && (
        <div className="prize-result">
          <div className="prize-message">
            <div className="prize-icon">🎉</div>
            <div className="prize-text">
              <div className="prize-label">Поздравляем!</div>
              <div className="prize-amount">Вы выиграли {selectedPrize.value} USDT!</div>
              {cryptoPaymentInfo && (
                <div className="crypto-payment-notice">
                  <div className="crypto-notice-text">
                    💰 Криптовалюта будет отправлена вне игры
                  </div>
                  <div className="crypto-notice-amount">
                    Сумма: {cryptoPaymentInfo.amount} USDT
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 스핀 버튼 - 코드 확인 후에만 표시 */}
      {codeVerified && (
        <button 
          className={`spin-button ${isSpinning ? 'spinning' : ''}`}
          onClick={spinWheel}
          disabled={isSpinning}
        >
          {isSpinning ? 'КРУТИТСЯ...' : 'КРУТИТЬ'}
        </button>
      )}

      {/* 뒤로가기 버튼 */}
      <button 
        className="back-button"
        onClick={handleBack}
        disabled={isSpinning}
      >
        НАЗАД
      </button>
    </div>
  );
};

export default WheelOfFortune;
