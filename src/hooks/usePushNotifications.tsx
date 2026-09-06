import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db, firebaseConfig } from '../firebase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

const VAPID_KEY = "BB5faqO9DXAciLd3MWxC7ZYPALCqz3GUaZtWBRpVmFg4LdlYU-4dy1n2cDKr2S0Nl3P_sbmpqvCNx3aGs6Qh7DI";

export const usePushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !messaging || !db) return;

    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/firebase-cloud-messaging-push-scope'
          });
          
          const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
          });
          
          if (token) {
            // Save token to Firestore
            await setDoc(doc(db, 'users', user.uid), {
              fcmToken: token,
            }, { merge: true });
            console.log('FCM Token saved successfully');
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Notification permission denied.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    };

    requestPermissionAndGetToken();

    // Listen for foreground messages
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      if (payload.notification) {
        toast(
          (t) => (
            <div className="flex flex-col gap-1">
              <span className="font-bold text-slate-800">{payload.notification?.title}</span>
              <span className="text-sm text-slate-600">{payload.notification?.body}</span>
            </div>
          ),
          { duration: 5000, position: 'top-right' }
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);
};
