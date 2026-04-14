import React, { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export const AttendanceReminder: React.FC = () => {
  const { orgId, attendanceReminderEnabled, attendanceReminderTime } = useAuth();
  const lastNotifiedDateRef = useRef<string | null>(null);

  useEffect(() => {
    // Request notification permission if enabled and not already granted
    if (attendanceReminderEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [attendanceReminderEnabled]);

  useEffect(() => {
    if (!attendanceReminderEnabled || !attendanceReminderTime || !orgId || !db) return;

    const checkTimeAndAttendance = async () => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      
      const todayDateString = now.toDateString();
      const todayFormatted = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '); // dd mm yyyy

      if (currentTime === attendanceReminderTime && lastNotifiedDateRef.current !== todayDateString) {
        // Time matches and haven't notified today
        
        // Check if attendance was already taken today
        try {
          const attendanceRef = collection(db, 'attendance');
          const q = query(attendanceRef, where('orgId', '==', orgId), where('date', '==', todayFormatted));
          const querySnapshot = await getDocs(q);
          
          lastNotifiedDateRef.current = todayDateString;
          localStorage.setItem('lastAttendanceReminderDate', todayDateString);

          if (querySnapshot.empty) {
            // Attendance NOT taken yet
            const title = 'হাজিরা নেওয়ার সময় হয়েছে!';
            const body = 'আজ কি হাজিরা নিয়েছেন? শিক্ষার্থীদের দৈনিক উপস্থিতি নেওয়ার সময় হয়েছে।';

            // Show in-app toast
            toast(title, {
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
              new Notification(title, {
                body: body,
                icon: '/vite.svg'
              });
            }
          } else {
            // Attendance already taken, maybe just a soft reminder or nothing
            console.log("Attendance already taken for today. Skipping reminder.");
          }
        } catch (error) {
          console.error("Error checking attendance status for reminder:", error);
        }
      }
    };

    // Initialize last notified date from localStorage
    const storedDate = localStorage.getItem('lastAttendanceReminderDate');
    if (storedDate) {
      lastNotifiedDateRef.current = storedDate;
    }

    // Check immediately
    checkTimeAndAttendance();

    // Check every minute
    const intervalId = setInterval(checkTimeAndAttendance, 60000);

    return () => clearInterval(intervalId);
  }, [attendanceReminderEnabled, attendanceReminderTime, orgId]);

  return null; // This component doesn't render anything
};
