import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Game from './components/Game';
import AdminApp from './admin/App';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 게임 메인 경로 */}
        <Route path="/" element={
          <div className="App">
            <Game />
          </div>
        } />
        
        {/* Admin Panel 경로 */}
        <Route path="/admin/*" element={<AdminApp />} />
        
        {/* 기본 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;





