import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 이미지 보호 - 컨텍스트 메뉴 및 드래그 방지
document.addEventListener('contextmenu', (e) => {
  // 이미지에서 컨텍스트 메뉴 방지
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
    return false;
  }
}, false);

// 이미지 드래그 방지
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
    return false;
  }
}, false);

// 이미지 선택 방지
document.addEventListener('selectstart', (e) => {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
    return false;
  }
}, false);

// 터치 이벤트로 이미지 길게 누르기 방지
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  if (e.target.tagName === 'IMG') {
    touchStartTime = Date.now();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (e.target.tagName === 'IMG') {
    // 터치가 움직이면 길게 누르기 취소
    touchStartTime = 0;
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (e.target.tagName === 'IMG' && touchStartTime > 0) {
    const touchDuration = Date.now() - touchStartTime;
    // 500ms 이상 길게 누른 경우 방지
    if (touchDuration > 500) {
      e.preventDefault();
      touchStartTime = 0;
      return false;
    }
  }
}, false);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);




