/**
 * Admin Panel 진입점
 * React Router 또는 직접 렌더링
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') || document.createElement('div')
);

root.render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);

