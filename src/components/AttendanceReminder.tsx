import React, { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export const AttendanceReminder: React.FC = () => {
  const { attendanceReminderEnabled, attendanceReminderTime } = useAuth();
  const lastNotifiedDateRef = useRef<string | null>(null);

  useEffect(() => {
    // Request notification permission if enabled and not already granted
    if (attendanceReminderEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [attendanceReminderEnabled]);

  useEffect(() => {
    if (!attendanceReminderEnabled || !attendanceReminderTime) return;

    const checkTime = () => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      
      const todayDateString = now.toDateString();

      if (currentTime === attendanceReminderTime && lastNotifiedDateRef.current !== todayDateString) {
        // Time matches and haven't notified today
        lastNotifiedDateRef.current = todayDateString;
        
        // Save to localStorage to persist across reloads
        localStorage.setItem('lastAttendanceReminderDate', todayDateString);

        // Show in-app toast
        toast('উপস্থিতি নেওয়ার সময় হয়েছে!', {
          icon: '⏰',
          duration: 10000,
          style: {
            borderRadius: '10px',
            background: '#0F5C7A',
            color: '#fff',
          },
        });

        // Show system notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('উপস্থিতি রিমাইন্ডার', {
            body: 'শিক্ষার্থীদের দৈনিক উপস্থিতি নেওয়ার সময় হয়েছে।',
            icon: '/icon-192x192.png' // Assuming standard PWA icon exists
          });
        }
      }
    };

    // Initialize last notified date from localStorage
    const storedDate = localStorage.getItem('lastAttendanceReminderDate');
    if (storedDate) {
      lastNotifiedDateRef.current = storedDate;
    }

    // Check immediately
    checkTime();

    // Check every minute
    const intervalId = setInterval(checkTime, 60000);

    return () => clearInterval(intervalId);
  }, [attendanceReminderEnabled, attendanceReminderTime]);

  return null; // This component doesn't render anything
};
