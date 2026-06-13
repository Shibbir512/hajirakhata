import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, AttendanceStatus } from '../types';

export const useStruckOffStudents = (orgId: string | null, students: { [key: string]: Student[] }) => {
  const [struckOffStudents, setStruckOffStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStruckOff = async () => {
    if (!orgId || !db) return;
    setLoading(true);
    try {
      // 1. Get attendance sessions from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
      const q = query(sessionsRef, where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)));
      const snapshot = await getDocs(q);

      const sessions = snapshot.docs.map(doc => doc.data());

      // 2. Group sessions by classId and date
      const classDates: Record<string, Set<string>> = {};
      const sessionByClassDate: Record<string, Record<string, any>> = {};

      sessions.forEach(session => {
        const classId = session.classId;
        const dateStr = session.date; // "dd mm yyyy"
        
        // Ignore Fridays
        const [d, m, y] = dateStr.split(' ');
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        if (dateObj.getDay() === 5) return; // Skip Friday

        if (!classDates[classId]) {
          classDates[classId] = new Set();
          sessionByClassDate[classId] = {};
        }
        classDates[classId].add(dateStr);
        
        // If there are multiple sessions for the same date, take the latest one
        if (!sessionByClassDate[classId][dateStr] || session.createdAt.toMillis() > sessionByClassDate[classId][dateStr].createdAt.toMillis()) {
          sessionByClassDate[classId][dateStr] = session;
        }
      });

      // 3. For each class, sort the valid dates descending
      const sortedClassDates: Record<string, string[]> = {};
      Object.keys(classDates).forEach(classId => {
        sortedClassDates[classId] = Array.from(classDates[classId]).sort((a, b) => {
          const [d1, m1, y1] = a.split(' ');
          const [d2, m2, y2] = b.split(' ');
          const date1 = new Date(Number(y1), Number(m1) - 1, Number(d1)).getTime();
          const date2 = new Date(Number(y2), Number(m2) - 1, Number(d2)).getTime();
          return date2 - date1; // Descending
        });
      });

      // 4. Check each student
      const struckOff: Student[] = [];

      Object.keys(students).forEach(classId => {
        const classStudentList = students[classId] || [];
        const validDates = sortedClassDates[classId] || [];

        classStudentList.forEach(student => {
          if (student.isActive === false) return;

          // Filter validDates to only those after clearedAbsenceDate
          let relevantDates = validDates;
          if (student.clearedAbsenceDate) {
             const clearTime = student.clearedAbsenceDate.toMillis ? student.clearedAbsenceDate.toMillis() : student.clearedAbsenceDate;
             relevantDates = validDates.filter(dateStr => {
               const [d, m, y] = dateStr.split(' ');
               const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
               return dateObj.getTime() > clearTime; 
             });
          }

          if (relevantDates.length >= 6) {
            const last6Dates = relevantDates.slice(0, 6);
            let consecutiveAbsences = 0;

            for (const dateStr of last6Dates) {
              const session = sessionByClassDate[classId][dateStr];
              if (session && session.students) {
                const studentRecord = session.students.find((s: any) => s.studentId === student.id);
                if (studentRecord && studentRecord.status === AttendanceStatus.Absent) {
                  consecutiveAbsences++;
                } else {
                  break; // Not absent on this day
                }
              }
            }

            if (consecutiveAbsences === 6) {
              struckOff.push(student);
            }
          }
        });
      });

      setStruckOffStudents(struckOff);
    } catch (error) {
      console.error("Error calculating struck off students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStruckOff();
  }, [orgId, students]);

  const markAsActionTaken = async (studentId: string) => {
    if (!orgId || !db) return;
    try {
      const studentRef = doc(db, `organizations/${orgId}/students/${studentId}`);
      await updateDoc(studentRef, {
        clearedAbsenceDate: serverTimestamp()
      });
      // Optimistically remove from list
      setStruckOffStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (error) {
      console.error("Error updating student:", error);
      throw error;
    }
  };

  return { struckOffStudents, loading, markAsActionTaken, refresh: fetchStruckOff };
};
