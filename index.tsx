import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available. Please refresh to update.');
    // Prevent infinite reload loops by not forcing an update automatically.
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

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
