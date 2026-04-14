importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "myattendanceapp-41a5d",
  appId: "1:988935534386:web:fb9aaecd9e98e59f32492b",
  apiKey: "AIzaSyCPApAnSzRk-pZT5y36N1mKPdpGthoPORs",
  authDomain: "myattendanceapp-41a5d.firebaseapp.com",
  storageBucket: "myattendanceapp-41a5d.firebasestorage.app",
  messagingSenderId: "988935534386",
  measurementId: ""
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
