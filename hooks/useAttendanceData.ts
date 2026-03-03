import { useState, useEffect, useCallback } from 'react';
import { CLASSES, STUDENTS } from '../constants';
import type { AttendanceRecord, Student, ClassData } from '../types';
import { AttendanceStatus } from '../types';
import { db, auth } from '../src/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const useAttendanceData = () => {
  const [user, setUser] = useState(auth?.currentUser || null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<{[key: string]: Student[]}>({});
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [reminders, setReminders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setClasses([]);
        setStudents({});
        setAttendance([]);
        setReminders([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const classesRef = collection(db, `users/${user.uid}/classes`);
    const studentsRef = collection(db, `users/${user.uid}/students`);
    const attendanceRef = collection(db, `users/${user.uid}/attendance`);
    const remindersRef = collection(db, `users/${user.uid}/reminders`);

    const unsubClasses = onSnapshot(classesRef, (snapshot) => {
      const loadedClasses = snapshot.docs.map(doc => doc.data() as ClassData);
      setClasses(loadedClasses);
    });

    const unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      const loadedStudents: {[key: string]: Student[]} = {};
      snapshot.docs.forEach(doc => {
        const student = doc.data() as Student;
        // Extract classId from student ID or store it in student object. 
        // Assuming student ID format: classId-student-timestamp
        const classId = student.id.split('-student-')[0]; 
        if (!loadedStudents[classId]) loadedStudents[classId] = [];
        loadedStudents[classId].push(student);
      });
      // Sort students by roll
      for (const key in loadedStudents) {
        loadedStudents[key].sort((a, b) => a.roll - b.roll);
      }
      setStudents(loadedStudents);
    });

    const unsubAttendance = onSnapshot(attendanceRef, (snapshot) => {
      const loadedAttendance = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
      setAttendance(loadedAttendance);
    });

    const unsubReminders = onSnapshot(remindersRef, (snapshot) => {
      const loadedReminders = snapshot.docs.map(doc => doc.id); // Using doc ID as time
      setReminders(loadedReminders.sort());
    });
    
    setLoading(false);

    return () => {
      unsubClasses();
      unsubStudents();
      unsubAttendance();
      unsubReminders();
    };
  }, [user]);


  const takeAttendance = useCallback(async (classId: string, studentStatuses: Map<string, {status: AttendanceStatus, note: string}>) => {
    if (!user || !db) return;
    const timestamp = Date.now();
    
    const batchPromises: Promise<void>[] = [];

    studentStatuses.forEach(({ status, note }, studentId) => {
      const recordId = `${timestamp}-${studentId}`;
      const record: AttendanceRecord = {
        id: recordId,
        studentId,
        classId,
        timestamp,
        status,
        note: note || undefined,
      };
      const recordRef = doc(db!, `users/${user!.uid}/attendance`, recordId);
      batchPromises.push(setDoc(recordRef, record));
    });

    await Promise.all(batchPromises);
  }, [user]);

  const getAbsencesForStudent = useCallback((studentId: string) => {
    return attendance
      .filter(record => record.studentId === studentId && record.status === AttendanceStatus.Absent)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [attendance]);

  const updateAttendanceRecordStatus = useCallback(async (recordId: string, newStatus: AttendanceStatus) => {
    if (!user || !db) return;
    const recordRef = doc(db, `users/${user.uid}/attendance`, recordId);
    await updateDoc(recordRef, { status: newStatus });
  }, [user]);
  
  const updateAttendanceRecordNote = useCallback(async (recordId: string, newNote: string) => {
    if (!user || !db) return;
    const recordRef = doc(db, `users/${user.uid}/attendance`, recordId);
    await updateDoc(recordRef, { note: newNote });
  }, [user]);

  const getConsolidatedReport = useCallback((filters: {
    startDate: Date | null;
    endDate: Date | null;
    status: AttendanceStatus;
  }) => {
    const report = new Map<string, { student: Student; count: number }[]>();
    
    let filteredAttendance = attendance;

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

    return report;
  }, [attendance, classes, students]);

  const addClass = useCallback(async (name: string) => {
    if (!user || !db) return;
    const newClassId = `class-${Date.now()}`;
    const newClass = { id: newClassId, name };
    await setDoc(doc(db, `users/${user.uid}/classes`, newClassId), newClass);
  }, [user]);

  const updateClassName = useCallback(async (id: string, name: string) => {
    if (!user || !db) return;
    await updateDoc(doc(db, `users/${user.uid}/classes`, id), { name });
  }, [user]);

  const deleteClass = useCallback(async (id: string) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, `users/${user.uid}/classes`, id));
    
    // Delete students of this class
    const studentsToDelete = students[id] || [];
    for (const student of studentsToDelete) {
        await deleteDoc(doc(db!, `users/${user!.uid}/students`, student.id));
    }

    // Delete attendance records for this class
    const attendanceToDelete = attendance.filter(r => r.classId === id);
    for (const record of attendanceToDelete) {
        await deleteDoc(doc(db!, `users/${user!.uid}/attendance`, record.id));
    }
  }, [user, students, attendance]);

  const updateStudentName = useCallback(async (studentId: string, newName: string) => {
    if (!user || !db) return;
    // Find student to get all data, as we need to update the doc
    let studentToUpdate: Student | undefined;
    for (const classId in students) {
        const s = students[classId].find(s => s.id === studentId);
        if (s) {
            studentToUpdate = s;
            break;
        }
    }
    if (studentToUpdate) {
        await updateDoc(doc(db, `users/${user.uid}/students`, studentId), { name: newName });
    }
  }, [user, students]);

  const addStudent = useCallback(async (classId: string, name: string, roll: number) => {
    if (!user || !db) return;
    const studentId = `${classId}-student-${Date.now()}`;
    const newStudent: Student = {
      id: studentId,
      name,
      roll,
    };
    await setDoc(doc(db, `users/${user.uid}/students`, studentId), newStudent);
  }, [user]);

  const deleteStudent = useCallback(async (studentId: string) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, `users/${user.uid}/students`, studentId));
    
    // Delete attendance for this student
    const attendanceToDelete = attendance.filter(r => r.studentId === studentId);
    for (const record of attendanceToDelete) {
        await deleteDoc(doc(db!, `users/${user!.uid}/attendance`, record.id));
    }
  }, [user, attendance]);

  const addReminder = useCallback(async (time: string) => {
    if (!user || !db) return;
    await setDoc(doc(db, `users/${user.uid}/reminders`, time), { time });
  }, [user]);

  const deleteReminder = useCallback(async (time: string) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, `users/${user.uid}/reminders`, time));
  }, [user]);

  return { 
    user,
    loading,
    classes, 
    students, 
    attendance, 
    takeAttendance, 
    getAbsencesForStudent, 
    updateAttendanceRecordStatus, 
    getConsolidatedReport, 
    addClass, 
    updateClassName, 
    deleteClass, 
    updateStudentName, 
    updateAttendanceRecordNote, 
    addStudent, 
    deleteStudent, 
    reminders, 
    addReminder, 
    deleteReminder 
  };
};