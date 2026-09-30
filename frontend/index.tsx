import './index.css'; // ← WAJIB: Load Tailwind CSS via PostCSS (bukan CDN)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Pengaman global: error render apa pun tampil sebagai pesan + tombol
        Refresh, bukan layar putih kosong (MASALAH 8, v4.2.2). */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
