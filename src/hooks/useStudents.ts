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
import { SyncManager } from "../services/SyncManager";

export const useStudents = (orgId: string | null, user: any, role: string | null) => {
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
        const data = doc.data();
        const studentId = doc.id;
        const classId = data.classId || studentId.split("-student-")[0];
        const student = { ...data, id: studentId, classId } as Student;
        if (!loadedStudents[classId]) loadedStudents[classId] = [];
        loadedStudents[classId].push(student);
      });
      for (const key in loadedStudents) {
        loadedStudents[key].sort((a, b) => a.roll - b.roll);
      }
      setStudents(loadedStudents);
    }, (error) => {
      console.error("Error fetching students:", error);
    });

    return () => unsubStudents();
  }, [user, orgId]);

  const addStudent = useCallback(
    async (classId: string, name: string, fatherName?: string, phone?: string, address?: string) => {
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
        const newRoll = maxRoll + 1;

        // Generate Unique ID: [Year][Serial]
        const year = new Date().getFullYear();
        const totalStudentsSnapshot = await getDocs(studentsRef);
        const studentUid = `${year}${String(totalStudentsSnapshot.size + 1).padStart(4, '0')}`;

        const studentId = `${classId}-student-${Date.now()}`;
        const newStudent: Student = {
          id: studentId,
          studentUid,
          classId,
          roll: newRoll,
          name,
          fatherName: fatherName ?? "",
          phone: phone ?? "",
          address: address ?? "",
          isActive: true,
          version: 1,
        };
        await setDoc(
          doc(db, `organizations/${orgId}/students`, studentId),
          newStudent,
        );
        toast.success(`শিক্ষার্থী সফলভাবে যোগ করা হয়েছে! আইডি: ${studentUid}`);
      } catch (error) {
        console.error("Error adding student:", error);
        toast.error("শিক্ষার্থী যোগ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const archiveStudent = useCallback(
    async (studentId: string, classId?: string) => {
      if (!user || !db || !orgId) {
        toast.error("সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার লগইন করুন।");
        return;
      }
      
      const resolvedClassId = classId || studentId.split("-student-")[0];

      if (role !== "admin" && role !== "moderator" && role !== "teacher") {
        toast.error("আপনার এই কাজটি করার অনুমতি নেই।");
        return;
      }

      try {
        const studentRef = doc(db, `organizations/${orgId}/students`, studentId);
        
        // Soft delete: set isActive to false
        await updateDoc(studentRef, { 
          isActive: false, 
          archivedAt: Date.now(),
          roll: 9999 // Move to end of list
        });
        
        // Reorder remaining active students
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const q = query(studentsRef, where("classId", "==", resolvedClassId));
        const allStudents = await getDocs(q);
        const activeStudentsDocs = allStudents.docs.filter(doc => doc.data().isActive !== false);
        
        const batch = writeBatch(db);
        const sortedDocs = activeStudentsDocs.sort((a, b) => {
          const rollA = a.data().roll || 0;
          const rollB = b.data().roll || 0;
          return rollA - rollB;
        });

        sortedDocs.forEach((doc, index) => {
          const newRoll = index + 1;
          if (doc.data().roll !== newRoll) {
            batch.update(doc.ref, { roll: newRoll });
          }
        });

        await batch.commit();

        toast.success("শিক্ষার্থীকে আর্কাইভ করা হয়েছে এবং রোল নম্বর পুনরায় সাজানো হয়েছে!");
      } catch (error) {
        console.error("Error archiving student:", error);
        toast.error("শিক্ষার্থী আর্কাইভ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId, role],
  );

  const updateStudent = useCallback(
    async (studentId: string, data: Partial<Student>, currentVersion: number = 1) => {
      if (!user || !db || !orgId) return;
      try {
        // Remove undefined values to prevent Firestore errors
        const cleanData = Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== undefined)
        );
        const docPath = `organizations/${orgId}/students/${studentId}`;
        await SyncManager.updateWithVersioning(docPath, cleanData, currentVersion);
        toast.success("শিক্ষার্থীর তথ্য সফলভাবে আপডেট করা হয়েছে!");
      } catch (error) {
        console.error("Error updating student:", error);
        if (error instanceof Error && error.message.includes("permission-denied")) {
          toast.error("শিক্ষার্থীর তথ্য আপডেট করতে সমস্যা হয়েছে। সম্ভবত অন্য কেউ এটি ইতিমধ্যে আপডেট করেছেন।");
        } else {
          toast.error("শিক্ষার্থীর তথ্য আপডেট করতে ব্যর্থ হয়েছে।");
        }
      }
    },
    [user, orgId],
  );

  const bulkAddStudents = useCallback(
    async (classId: string, studentsList: Omit<Student, 'id' | 'classId' | 'roll' | 'studentUid'>[]) => {
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

        const allStudentsSnapshot = await getDocs(studentsRef);
        let totalCount = allStudentsSnapshot.size;
        const year = new Date().getFullYear();

        const batch = writeBatch(db);
        studentsList.forEach((studentData, index) => {
          totalCount++;
          const studentUid = `${year}${String(totalCount).padStart(4, '0')}`;
          const studentId = `${classId}-student-${Date.now()}-${index}`;
          const newStudent: Student = {
            name: studentData.name,
            fatherName: studentData.fatherName ?? "",
            phone: studentData.phone ?? "",
            address: studentData.address ?? "",
            id: studentId,
            studentUid,
            classId,
            roll: maxRoll + index + 1,
            isActive: true,
            version: 1,
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

  const permanentDeleteStudent = useCallback(
    async (studentId: string, classId?: string) => {
      if (!user || !db || !orgId) {
        toast.error("সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার লগইন করুন।");
        return;
      }
      
      const resolvedClassId = classId || studentId.split("-student-")[0];

      if (role !== "admin") {
        toast.error("শুধুমাত্র অ্যাডমিন স্থায়ীভাবে মুছে ফেলতে পারেন।");
        return;
      }

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

        // 3. Delete associated results
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const resultsQuery = query(resultsRef, where("student_id", "==", studentId));
        const resultsSnapshot = await getDocs(resultsQuery);
        
        if (!resultsSnapshot.empty) {
          resultsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
        }

        // 4. Reorder remaining active students
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const q = query(studentsRef, where("classId", "==", resolvedClassId));
        const allStudents = await getDocs(q);
        const activeStudentsDocs = allStudents.docs.filter(doc => doc.data().isActive !== false);
        
        const sortedDocs = activeStudentsDocs.sort((a, b) => {
          const rollA = a.data().roll || 0;
          const rollB = b.data().roll || 0;
          return rollA - rollB;
        });

        sortedDocs.forEach((doc, index) => {
          const newRoll = index + 1;
          if (doc.data().roll !== newRoll) {
            batch.update(doc.ref, { roll: newRoll });
          }
        });

        await batch.commit();

        toast.success("শিক্ষার্থী এবং তার যাবতীয় রেকর্ড স্থায়ীভাবে মুছে ফেলা হয়েছে!");
      } catch (error) {
        console.error("Error permanently deleting student:", error);
        toast.error("স্থায়ীভাবে মুছতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId, role],
  );

  return { students, addStudent, updateStudent, archiveStudent, permanentDeleteStudent, bulkAddStudents };
};
