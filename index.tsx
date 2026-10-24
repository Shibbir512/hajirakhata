import './src/utils/fetchPolyfill';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    registerSW({
      onNeedRefresh() {
        console.log('New content available. Please refresh to update.');
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
    });
  } catch (err) {
    console.warn('PWA registration warning:', err);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
