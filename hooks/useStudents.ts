import { useState, useEffect, useCallback } from 'react';
import { db } from '../src/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Student } from '../types';
import toast from 'react-hot-toast';

export const useStudents = (orgId: string | null, user: any) => {
  const [students, setStudents] = useState<{[key: string]: Student[]}>({});

  useEffect(() => {
    if (!user || !db || !orgId) {
      setStudents({});
      return;
    }

    const studentsRef = collection(db, `organizations/${orgId}/students`);
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

    return () => unsubStudents();
  }, [user, orgId]);

  const addStudent = useCallback(async (classId: string, name: string, roll: number) => {
    if (!user || !db || !orgId) return;
    try {
      const studentId = `${classId}-student-${Date.now()}`;
      const newStudent: Student = {
        id: studentId,
        name,
        roll,
      };
      await setDoc(doc(db, `organizations/${orgId}/students`, studentId), newStudent);
      toast.success('ছাত্র সফলভাবে যোগ করা হয়েছে!');
    } catch (error) {
      console.error("Error adding student:", error);
      toast.error('ছাত্র যোগ করতে সমস্যা হয়েছে।');
    }
  }, [user, orgId]);

  const updateStudentName = useCallback(async (studentId: string, newName: string) => {
    if (!user || !db || !orgId) return;
    try {
      await updateDoc(doc(db, `organizations/${orgId}/students`, studentId), { name: newName });
      toast.success('ছাত্রের নাম আপডেট করা হয়েছে!');
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error('ছাত্রের নাম আপডেট করতে সমস্যা হয়েছে।');
    }
  }, [user, orgId]);

  const deleteStudent = useCallback(async (studentId: string) => {
    if (!user || !db || !orgId) return;
    try {
      await deleteDoc(doc(db, `organizations/${orgId}/students`, studentId));
      toast.success('ছাত্র মুছে ফেলা হয়েছে!');
      // Note: Attendance cleanup for student should be handled.
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error('ছাত্র মুছতে সমস্যা হয়েছে।');
    }
  }, [user, orgId]);

  return { students, addStudent, updateStudentName, deleteStudent };
};
