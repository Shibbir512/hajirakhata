import { useState, useEffect, useCallback } from 'react';
import { db } from '../src/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, where, writeBatch, getDocs, orderBy } from 'firebase/firestore';
import { AttendanceRecord, AttendanceStatus, Student, ClassData } from '../types';
import toast from 'react-hot-toast';

export const useAttendance = (orgId: string | null, user: any, classes: ClassData[], students: {[key: string]: Student[]}) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch current month's attendance by default
  useEffect(() => {
    if (!user || !db || !orgId) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const attendanceRef = collection(db, `organizations/${orgId}/attendance`);
    
    // Get start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const q = query(
      attendanceRef,
      where('timestamp', '>=', startOfMonth.getTime()),
      orderBy('timestamp', 'desc')
    );

    const unsubAttendance = onSnapshot(q, (snapshot) => {
      const loadedAttendance = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
      setAttendance(loadedAttendance);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching attendance:", error);
      toast.error("হাজিরা লোড করতে সমস্যা হয়েছে।");
      setLoading(false);
    });

    return () => unsubAttendance();
  }, [user, orgId]);

  const fetchHistoricalData = useCallback(async (startDate: Date, endDate: Date) => {
    if (!user || !db || !orgId) return [];
    try {
      setLoading(true);
      const attendanceRef = collection(db, `organizations/${orgId}/attendance`);
      const q = query(
        attendanceRef,
        where('timestamp', '>=', startDate.getTime()),
        where('timestamp', '<=', endDate.getTime()),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const historicalData = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
      setLoading(false);
      return historicalData;
    } catch (error) {
      console.error("Error fetching historical data:", error);
      toast.error("পুরানো হাজিরা লোড করতে সমস্যা হয়েছে।");
      setLoading(false);
      return [];
    }
  }, [user, orgId]);

  const takeAttendance = useCallback(async (classId: string, studentStatuses: Map<string, {status: AttendanceStatus, note: string}>, dateString?: string) => {
    if (!user || !db || !orgId) return;
    
    try {
      let timestamp: number;
      if (dateString) {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        timestamp = date.getTime();
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        timestamp = today.getTime();
      }

      const batch = writeBatch(db);
      const takenAt = Date.now();

      studentStatuses.forEach(({ status, note }, studentId) => {
        const dateKey = new Date(timestamp).toISOString().split('T')[0];
        const recordId = `${dateKey}-${studentId}`;
        
        const record: AttendanceRecord = {
          id: recordId,
          studentId,
          classId,
          timestamp,
          status,
          note: note || '',
          teacherName: user.displayName || user.email || 'অজানা',
          teacherId: user.uid,
          takenAt
        };

        const recordRef = doc(db!, `organizations/${orgId}/attendance`, recordId);
        batch.set(recordRef, record, { merge: true });
      });

      batch.commit().catch(error => {
        console.error("Error committing batch:", error);
        toast.error('হাজিরা সিঙ্ক করতে সমস্যা হয়েছে।');
      });
      
      toast.success('হাজিরা সংরক্ষিত! (অফলাইনে থাকলে ইন্টারনেট এলে সিঙ্ক হবে)');
    } catch (error) {
      console.error("Error taking attendance:", error);
      toast.error('হাজিরা সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  }, [user, orgId]);

  const updateAttendanceRecordStatus = useCallback(async (recordId: string, newStatus: AttendanceStatus) => {
    if (!user || !db || !orgId) return;
    try {
      const recordRef = doc(db, `organizations/${orgId}/attendance`, recordId);
      await updateDoc(recordRef, { status: newStatus });
      toast.success('হাজিরা স্ট্যাটাস আপডেট করা হয়েছে!');
    } catch (error) {
      console.error("Error updating attendance status:", error);
      toast.error('হাজিরা স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।');
    }
  }, [user, orgId]);
  
  const updateAttendanceRecordNote = useCallback(async (recordId: string, newNote: string) => {
    if (!user || !db || !orgId) return;
    try {
      const recordRef = doc(db, `organizations/${orgId}/attendance`, recordId);
      await updateDoc(recordRef, { note: newNote });
      toast.success('মন্তব্য আপডেট করা হয়েছে!');
    } catch (error) {
      console.error("Error updating attendance note:", error);
      toast.error('মন্তব্য আপডেট করতে সমস্যা হয়েছে।');
    }
  }, [user, orgId]);

  const getHistoryForStudent = useCallback((studentId: string) => {
    return attendance
      .filter(record => record.studentId === studentId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [attendance]);

  const getAbsencesForStudent = useCallback((studentId: string) => {
    return attendance
      .filter(record => record.studentId === studentId && record.status === AttendanceStatus.Absent)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [attendance]);

  const getConsolidatedReport = useCallback(async (filters: {
    startDate: Date | null;
    endDate: Date | null;
    status: AttendanceStatus;
  }) => {
    let dataToProcess = attendance;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    if (filters.startDate && filters.startDate < startOfMonth) {
        if (filters.endDate) {
            const historicalData = await fetchHistoricalData(filters.startDate, filters.endDate);
            // Merge historical data with current attendance, avoiding duplicates
            const currentIds = new Set(attendance.map(r => r.id));
            const newRecords = historicalData.filter(r => !currentIds.has(r.id));
            dataToProcess = [...attendance, ...newRecords];
        }
    }

    const report = new Map<string, { student: Student; count: number }[]>();
    const teachersMap = new Map<string, { name: string; timestamp: number }>();
    let filteredAttendance = dataToProcess;

    if (filters.startDate) {
        const startOfDay = new Date(filters.startDate);
        startOfDay.setHours(0, 0, 0, 0);
        filteredAttendance = filteredAttendance.filter(record => record.timestamp >= startOfDay.getTime());
    }
    if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filteredAttendance = filteredAttendance.filter(record => record.timestamp <= endOfDay.getTime());
    }

    const studentCount = new Map<string, number>();
    filteredAttendance.forEach(record => {
        if (record.teacherName) {
            const time = record.takenAt || record.timestamp;
            const key = `${record.teacherName}-${time}`;
            if (!teachersMap.has(key)) {
                teachersMap.set(key, { name: record.teacherName, timestamp: time });
            }
        }
        if (record.status === filters.status) {
            studentCount.set(record.studentId, (studentCount.get(record.studentId) || 0) + 1);
        }
    });

    classes.forEach(cls => {
        const classStudents = students[cls.id] || [];
        const studentsWithCount = classStudents
            .map(student => ({
                student,
                count: studentCount.get(student.id) || 0,
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => a.student.roll - b.student.roll);

        if (studentsWithCount.length > 0) {
            report.set(cls.id, studentsWithCount);
        }
    });

    const teachersList = Array.from(teachersMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    return { report, teachers: teachersList };
  }, [attendance, classes, students, fetchHistoricalData]);

  return { 
    attendance, 
    loading, 
    takeAttendance, 
    updateAttendanceRecordStatus, 
    updateAttendanceRecordNote, 
    getHistoryForStudent, 
    getAbsencesForStudent, 
    getConsolidatedReport,
    fetchHistoricalData
  };
};
