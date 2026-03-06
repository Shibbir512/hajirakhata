import { useState, useEffect, useCallback } from 'react';
import { CLASSES, STUDENTS } from '../constants';
import type { AttendanceRecord, Student, ClassData } from '../types';
import { AttendanceStatus } from '../types';
import { db, auth } from '../src/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const useAttendanceData = () => {
  const [user, setUser] = useState(auth?.currentUser || null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [visitedOrgs, setVisitedOrgs] = useState<{[key: string]: string}>({});
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        // Fetch user profile to get organizationId
        const userDocRef = doc(db!, `users`, currentUser.uid);
        const unsubUser = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const currentOrgId = data.organizationId || null;
            const history = data.visitedOrgs || {};
            
            setOrgId(currentOrgId);
            setVisitedOrgs(history);

            // If no org ID, stop loading so user can select/create org
            // If there IS an org ID, keep loading true, the second useEffect will handle fetching class data
            if (!currentOrgId) {
              setLoading(false);
            }

            // Auto-populate history if current org is missing from it
            if (currentOrgId && !history[currentOrgId]) {
              try {
                const orgRef = doc(db!, 'organizations', currentOrgId);
                const orgSnap = await getDoc(orgRef);
                if (orgSnap.exists()) {
                  const orgName = orgSnap.data().name;
                  await setDoc(userDocRef, { 
                    visitedOrgs: { [currentOrgId]: orgName } 
                  }, { merge: true });
                }
              } catch (e) {
                console.error("Error auto-populating history:", e);
              }
            }
          } else {
            setOrgId(null);
            setVisitedOrgs({});
            setLoading(false);
          }
        });
        return () => unsubUser();
      } else {
        setOrgId(null);
        setVisitedOrgs({});
        setClasses([]);
        setStudents([]);
        setAttendance([]);
        setReminders([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db || !orgId) {
      return;
    }

    setLoading(true);
    const classesRef = collection(db, `organizations/${orgId}/classes`);
    const studentsRef = collection(db, `organizations/${orgId}/students`);
    const attendanceRef = collection(db, `organizations/${orgId}/attendance`);
    const remindersRef = collection(db, `organizations/${orgId}/reminders`);

    const unsubClasses = onSnapshot(classesRef, (snapshot) => {
      const loadedClasses = snapshot.docs.map(doc => doc.data() as ClassData);
      setClasses(loadedClasses);
    });

    const unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      const loadedStudents: {[key: string]: Student[]} = {};
      snapshot.docs.forEach(doc => {
        const student = doc.data() as Student;
        const classId = student.id.split('-student-')[0]; 
        if (!loadedStudents[classId]) loadedStudents[classId] = [];
        loadedStudents[classId].push(student);
      });
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
      const loadedReminders = snapshot.docs.map(doc => doc.id);
      setReminders(loadedReminders.sort());
    });
    
    setLoading(false);

    return () => {
      unsubClasses();
      unsubStudents();
      unsubAttendance();
      unsubReminders();
    };
  }, [user, orgId]);

  const createOrganization = useCallback(async (name: string) => {
    if (!user || !db) return;
    const newOrgId = `school-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await setDoc(doc(db, 'organizations', newOrgId), { 
      id: newOrgId, 
      name, 
      createdBy: user.uid,
      createdAt: Date.now()
    });
    
    // Update user with new org and add to history
    await setDoc(doc(db, 'users', user.uid), { 
      organizationId: newOrgId,
      visitedOrgs: {
        [newOrgId]: name
      }
    }, { merge: true });
    
    setOrgId(newOrgId);
  }, [user]);

  const joinOrganization = useCallback(async (id: string) => {
    if (!user || !db) return;
    
    // Check if org exists and get name
    const orgRef = doc(db, 'organizations', id);
    const orgSnap = await getDoc(orgRef);
    
    if (!orgSnap.exists()) {
      throw new Error("স্কুলটি খুঁজে পাওয়া যায়নি। সঠিক আইডি দিন।");
    }
    
    const orgName = orgSnap.data().name;

    await setDoc(doc(db, 'users', user.uid), { 
      organizationId: id,
      visitedOrgs: {
        [id]: orgName
      }
    }, { merge: true });
    
    setOrgId(id);
  }, [user]);

  const leaveOrganization = useCallback(async () => {
    if (!user || !db) return;
    await setDoc(doc(db, 'users', user.uid), { organizationId: null }, { merge: true });
    setOrgId(null);
  }, [user]);

  const takeAttendance = useCallback(async (classId: string, studentStatuses: Map<string, {status: AttendanceStatus, note: string}>) => {
    if (!user || !db || !orgId) return;
    const timestamp = Date.now();
    const batchPromises: Promise<void>[] = [];

    studentStatuses.forEach(({ status, note }, studentId) => {
      const recordId = `${timestamp}-${studentId}`;
      const record: any = {
        id: recordId,
        studentId,
        classId,
        timestamp,
        status,
      };
      
      if (note && note.trim()) {
        record.note = note;
      }

      const recordRef = doc(db!, `organizations/${orgId}/attendance`, recordId);
      batchPromises.push(setDoc(recordRef, record));
    });

    await Promise.all(batchPromises);
  }, [user, orgId]);

  const getAbsencesForStudent = useCallback((studentId: string) => {
    return attendance
      .filter(record => record.studentId === studentId && record.status === AttendanceStatus.Absent)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [attendance]);

  const updateAttendanceRecordStatus = useCallback(async (recordId: string, newStatus: AttendanceStatus) => {
    if (!user || !db || !orgId) return;
    const recordRef = doc(db, `organizations/${orgId}/attendance`, recordId);
    await updateDoc(recordRef, { status: newStatus });
  }, [user, orgId]);
  
  const updateAttendanceRecordNote = useCallback(async (recordId: string, newNote: string) => {
    if (!user || !db || !orgId) return;
    const recordRef = doc(db, `organizations/${orgId}/attendance`, recordId);
    await updateDoc(recordRef, { note: newNote });
  }, [user, orgId]);

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
    if (!user || !db || !orgId) return;
    const newClassId = `class-${Date.now()}`;
    const newClass = { id: newClassId, name };
    await setDoc(doc(db, `organizations/${orgId}/classes`, newClassId), newClass);
  }, [user, orgId]);

  const updateClassName = useCallback(async (id: string, name: string) => {
    if (!user || !db || !orgId) return;
    await updateDoc(doc(db, `organizations/${orgId}/classes`, id), { name });
  }, [user, orgId]);

  const deleteClass = useCallback(async (id: string) => {
    if (!user || !db || !orgId) return;
    await deleteDoc(doc(db, `organizations/${orgId}/classes`, id));
    
    const studentsToDelete = students[id] || [];
    for (const student of studentsToDelete) {
        await deleteDoc(doc(db!, `organizations/${orgId}/students`, student.id));
    }

    const attendanceToDelete = attendance.filter(r => r.classId === id);
    for (const record of attendanceToDelete) {
        await deleteDoc(doc(db!, `organizations/${orgId}/attendance`, record.id));
    }
  }, [user, orgId, students, attendance]);

  const updateStudentName = useCallback(async (studentId: string, newName: string) => {
    if (!user || !db || !orgId) return;
    await updateDoc(doc(db, `organizations/${orgId}/students`, studentId), { name: newName });
  }, [user, orgId]);

  const addStudent = useCallback(async (classId: string, name: string, roll: number) => {
    if (!user || !db || !orgId) return;
    const studentId = `${classId}-student-${Date.now()}`;
    const newStudent: Student = {
      id: studentId,
      name,
      roll,
    };
    await setDoc(doc(db, `organizations/${orgId}/students`, studentId), newStudent);
  }, [user, orgId]);

  const deleteStudent = useCallback(async (studentId: string) => {
    if (!user || !db || !orgId) return;
    await deleteDoc(doc(db, `organizations/${orgId}/students`, studentId));
    
    const attendanceToDelete = attendance.filter(r => r.studentId === studentId);
    for (const record of attendanceToDelete) {
        await deleteDoc(doc(db!, `organizations/${orgId}/attendance`, record.id));
    }
  }, [user, orgId, attendance]);

  const addReminder = useCallback(async (time: string) => {
    if (!user || !db || !orgId) return;
    await setDoc(doc(db, `organizations/${orgId}/reminders`, time), { time });
  }, [user, orgId]);

  const deleteReminder = useCallback(async (time: string) => {
    if (!user || !db || !orgId) return;
    await deleteDoc(doc(db, `organizations/${orgId}/reminders`, time));
  }, [user, orgId]);

  return { 
    user,
    orgId,
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
    deleteReminder,
    createOrganization,
    joinOrganization,
    leaveOrganization,
    visitedOrgs
  };
};