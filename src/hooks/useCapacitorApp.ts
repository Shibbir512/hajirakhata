import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export function useCapacitorApp() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Configure Status Bar for native Android
    const setupStatusBar = async () => {
      try {
        await StatusBar.setBackgroundColor({ color: '#0F5C7A' });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (e) {
        console.warn('StatusBar configuration not supported or failed:', e);
      }
    };

    setupStatusBar();

    // Handle hardware back button on Android
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/login' || !canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      backButtonListener.then((listener) => listener.remove()).catch(() => {});
    };
  }, []);
}
