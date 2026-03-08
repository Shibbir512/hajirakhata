import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  writeBatch,
  orderBy,
  limit,
} from "firebase/firestore";
import { Student } from "../types";
import toast from "react-hot-toast";

export const useStudents = (orgId: string | null, user: any) => {
  const [students, setStudents] = useState<{ [key: string]: Student[] }>({});

  useEffect(() => {
    if (!user || !db || !orgId) {
      setStudents({});
      return;
    }

    const studentsRef = collection(db, `organizations/${orgId}/students`);
    const unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      const loadedStudents: { [key: string]: Student[] } = {};
      snapshot.docs.forEach((doc) => {
        const student = doc.data() as Student;
        const classId = student.id.split("-student-")[0];
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

  const addStudent = useCallback(
    async (classId: string, name: string, fatherName?: string, phone?: string, address?: string) => {
      if (!user || !db || !orgId) return;
      try {
        // Find max roll in class
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const q = query(studentsRef, where("classId", "==", classId));
        const querySnapshot = await getDocs(q);
        
        let maxRoll = 0;
        querySnapshot.docs.forEach(doc => {
          const roll = doc.data().roll;
          if (roll > maxRoll) maxRoll = roll;
        });
        const newRoll = maxRoll + 1;

        const studentId = `${classId}-student-${Date.now()}`;
        const newStudent: Student = {
          id: studentId,
          classId,
          roll: newRoll,
          name,
          fatherName,
          phone,
          address,
        };
        await setDoc(
          doc(db, `organizations/${orgId}/students`, studentId),
          newStudent,
        );
        toast.success("শিক্ষার্থী সফলভাবে যোগ করা হয়েছে!");
      } catch (error) {
        console.error("Error adding student:", error);
        toast.error("শিক্ষার্থী যোগ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const deleteStudent = useCallback(
    async (studentId: string, classId: string) => {
      if (!user || !db || !orgId) return;
      try {
        // 1. Delete the student document
        await deleteDoc(doc(db, `organizations/${orgId}/students`, studentId));
        
        // 2. Delete associated attendance records
        const attendanceRef = collection(db, `organizations/${orgId}/attendance`);
        const attendanceQuery = query(attendanceRef, where("studentId", "==", studentId));
        const attendanceSnapshot = await getDocs(attendanceQuery);

        const batch = writeBatch(db);
        
        if (!attendanceSnapshot.empty) {
          attendanceSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
        }

        // 3. Reorder remaining students
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const q = query(studentsRef, where("classId", "==", classId), orderBy("roll", "asc"));
        const remainingStudents = await getDocs(q);
        
        remainingStudents.docs.forEach((doc, index) => {
          batch.update(doc.ref, { roll: index + 1 });
        });

        await batch.commit();

        toast.success("শিক্ষার্থী মুছে ফেলা হয়েছে এবং রোল নম্বর পুনরায় সাজানো হয়েছে!");
      } catch (error) {
        console.error("Error deleting student:", error);
        toast.error("শিক্ষার্থী মুছে ফেলতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const updateStudent = useCallback(
    async (studentId: string, data: Partial<Student>) => {
      if (!user || !db || !orgId) return;
      try {
        await updateDoc(doc(db, `organizations/${orgId}/students`, studentId), data);
        toast.success("শিক্ষার্থীর তথ্য সফলভাবে আপডেট করা হয়েছে!");
      } catch (error) {
        console.error("Error updating student:", error);
        toast.error("শিক্ষার্থীর তথ্য আপডেট করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const bulkAddStudents = useCallback(
    async (classId: string, studentsList: Omit<Student, 'id' | 'classId' | 'roll'>[]) => {
      if (!user || !db || !orgId) return;
      try {
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const q = query(studentsRef, where("classId", "==", classId));
        const querySnapshot = await getDocs(q);
        
        let maxRoll = 0;
        querySnapshot.docs.forEach(doc => {
          const roll = doc.data().roll;
          if (roll > maxRoll) maxRoll = roll;
        });

        const batch = writeBatch(db);
        studentsList.forEach((studentData, index) => {
          const studentId = `${classId}-student-${Date.now()}-${index}`;
          const newStudent: Student = {
            ...studentData,
            id: studentId,
            classId,
            roll: maxRoll + index + 1,
          };
          batch.set(doc(db, `organizations/${orgId}/students`, studentId), newStudent);
        });

        await batch.commit();
        toast.success("শিক্ষার্থীদের সফলভাবে যোগ করা হয়েছে!");
      } catch (error) {
        console.error("Error adding students:", error);
        toast.error("শিক্ষার্থীদের যোগ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  return { students, addStudent, updateStudent, deleteStudent, bulkAddStudents };
};
