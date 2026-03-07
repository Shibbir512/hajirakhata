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
    async (classId: string, name: string, roll: number, fatherName?: string, phone?: string, address?: string) => {
      if (!user || !db || !orgId) return;
      try {
        const studentId = `${classId}-student-${Date.now()}`;
        const newStudent: Student = {
          id: studentId,
          name,
          roll,
          fatherName,
          phone,
          address,
        };
        await setDoc(
          doc(db, `organizations/${orgId}/students`, studentId),
          newStudent,
        );
        toast.success("Student added successfully!");
      } catch (error) {
        console.error("Error adding student:", error);
        toast.error("Failed to add student.");
      }
    },
    [user, orgId],
  );

  const updateStudent = useCallback(
    async (studentId: string, data: Partial<Student>) => {
      if (!user || !db || !orgId) return;
      try {
        await updateDoc(doc(db, `organizations/${orgId}/students`, studentId), data);
        toast.success("Student updated successfully!");
      } catch (error) {
        console.error("Error updating student:", error);
        toast.error("Failed to update student.");
      }
    },
    [user, orgId],
  );

  const deleteStudent = useCallback(
    async (studentId: string) => {
      if (!user || !db || !orgId) return;
      try {
        // 1. Delete the student document
        await deleteDoc(doc(db, `organizations/${orgId}/students`, studentId));
        
        // 2. Delete associated attendance records
        const attendanceRef = collection(db, `organizations/${orgId}/attendance`);
        const attendanceQuery = query(attendanceRef, where("studentId", "==", studentId));
        const attendanceSnapshot = await getDocs(attendanceQuery);

        if (!attendanceSnapshot.empty) {
          const batch = writeBatch(db);
          attendanceSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }

        toast.success("Student and associated records deleted successfully!");
      } catch (error) {
        console.error("Error deleting student:", error);
        toast.error("Failed to delete student.");
      }
    },
    [user, orgId],
  );

  return { students, addStudent, updateStudent, deleteStudent };
};
