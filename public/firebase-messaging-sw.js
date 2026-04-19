importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const urlParams = new URL(location).searchParams;
const configString = urlParams.get('firebaseConfig');

if (configString) {
  try {
    const firebaseConfig = JSON.parse(configString);
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function(payload) {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      const notificationTitle = payload?.notification?.title || 'Notification';
      const notificationOptions = {
        body: payload?.notification?.body || '',
        icon: '/vite.svg'
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error initializing Firebase:', error);
  }
} else {
  console.warn('[firebase-messaging-sw.js] No firebaseConfig provided in URL parameters.');
}
