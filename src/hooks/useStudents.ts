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
  getDoc,
  writeBatch,
  orderBy,
  limit,
} from "firebase/firestore";
import { Student } from "../types";
import toast from "react-hot-toast";
import { SyncManager } from "../services/SyncManager";
import { generateStudentId } from "../utils/idGenerator";
import { toBengaliNumber } from "../utils/dateFormatter";

export const useStudents = (orgId: string | null, user: any, role: string | null) => {
  const [students, setStudents] = useState<{ [key: string]: Student[] }>({});
  const [orgCode, setOrgCode] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !db || !orgId) {
      setStudents({});
      setOrgCode(null);
      return;
    }

    const fetchOrgCode = async () => {
      const orgDoc = await getDoc(doc(db, "organizations", orgId));
      if (orgDoc.exists()) {
        let code = orgDoc.data().orgCode;
        console.log("Fetched orgCode:", code);
        if (!code) {
          // Generate a new 6-digit code if missing
          code = Math.floor(100000 + Math.random() * 900000).toString();
          console.log("Generated new orgCode:", code);
          await updateDoc(doc(db, "organizations", orgId), { orgCode: code });
        }
        setOrgCode(typeof code === 'string' ? parseInt(code) : code);
      } else {
        console.log("Organization document does not exist for orgId:", orgId);
      }
    };
    fetchOrgCode();

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
    async (classId: string, name: string, fatherName?: string, phone?: string, address?: string, photoUrl?: string) => {
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

        // Generate Unique ID: [Madrasa ID][Year][Serial]
        const year = new Date().getFullYear();
        
        let currentOrgCode = orgCode;
        if (currentOrgCode === null) {
          const orgDoc = await getDoc(doc(db, "organizations", orgId));
          if (orgDoc.exists()) {
            let code = orgDoc.data().orgCode;
            if (!code) {
              code = Math.floor(100000 + Math.random() * 900000).toString();
              await updateDoc(doc(db, "organizations", orgId), { orgCode: code });
            }
            currentOrgCode = typeof code === 'string' ? parseInt(code) : code;
            setOrgCode(currentOrgCode);
          } else {
            throw new Error("Organization not found");
          }
        }
        
        const studentUid = await generateStudentId(currentOrgCode, year);

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
          photoUrl: photoUrl ?? "",
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
    [user, orgId, orgCode],
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

        const year = new Date().getFullYear();
        
        let currentOrgCode = orgCode;
        if (currentOrgCode === null) {
          const orgDoc = await getDoc(doc(db, "organizations", orgId));
          if (orgDoc.exists()) {
            let code = orgDoc.data().orgCode;
            if (!code) {
              code = Math.floor(100000 + Math.random() * 900000).toString();
              await updateDoc(doc(db, "organizations", orgId), { orgCode: code });
            }
            currentOrgCode = typeof code === 'string' ? parseInt(code) : code;
            setOrgCode(currentOrgCode);
          } else {
            throw new Error("Organization not found");
          }
        }

        const batch = writeBatch(db);
        for (let index = 0; index < studentsList.length; index++) {
          const studentData = studentsList[index];
          const studentUid = await generateStudentId(currentOrgCode, year);
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
        }

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

  const deleteAllArchivedStudents = useCallback(
    async () => {
      if (!user || !db || !orgId) {
        toast.error("সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার লগইন করুন।");
        return;
      }

      if (role !== "admin") {
        toast.error("শুধুমাত্র অ্যাডমিন স্থায়ীভাবে মুছে ফেলতে পারেন।");
        return;
      }

      const loadingToast = toast.loading("আর্কাইভ করা শিক্ষার্থীদের ডেটা মুছে ফেলা হচ্ছে...");

      try {
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const q = query(studentsRef, where("isActive", "==", false));
        const archivedSnapshot = await getDocs(q);

        // Filter out alumni from the archived list so they don't get deleted
        const archivedDocs = archivedSnapshot.docs.filter(doc => doc.data().isAlumni !== true);

        if (archivedDocs.length === 0) {
          toast.success("কোনো আর্কাইভ করা শিক্ষার্থী পাওয়া যায়নি।", { id: loadingToast });
          return;
        }

        const studentIds = archivedDocs.map(doc => doc.id);

        const deleteInBatches = async (refsToDelete: any[]) => {
          const chunks = [];
          let i = 0;
          while (i < refsToDelete.length) {
            chunks.push(refsToDelete.slice(i, i + 500));
            i += 500;
          }
          for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(ref => batch.delete(ref));
            await batch.commit();
          }
        };

        let allRefsToDelete: any[] = [];

        archivedDocs.forEach(doc => {
          allRefsToDelete.push(doc.ref);
        });

        const attendanceRef = collection(db, `organizations/${orgId}/attendance`);
        for (let i = 0; i < studentIds.length; i += 30) {
          const chunkIds = studentIds.slice(i, i + 30);
          const attQuery = query(attendanceRef, where("studentId", "in", chunkIds));
          const attSnapshot = await getDocs(attQuery);
          attSnapshot.docs.forEach(doc => allRefsToDelete.push(doc.ref));
        }

        const resultsRef = collection(db, `organizations/${orgId}/results`);
        for (let i = 0; i < studentIds.length; i += 30) {
          const chunkIds = studentIds.slice(i, i + 30);
          const resQuery = query(resultsRef, where("student_id", "in", chunkIds));
          const resSnapshot = await getDocs(resQuery);
          resSnapshot.docs.forEach(doc => allRefsToDelete.push(doc.ref));
        }

        await deleteInBatches(allRefsToDelete);

        toast.success(`সকল আর্কাইভ করা শিক্ষার্থী স্থায়ীভাবে মুছে ফেলা হয়েছে!`, { id: loadingToast });
      } catch (error) {
        console.error("Error deleting all archived students:", error);
        toast.error("আর্কাইভ করা শিক্ষার্থীদের মুছতে ব্যর্থ হয়েছে।", { id: loadingToast });
      }
    },
    [user, orgId, role],
  );

  const promoteStudents = useCallback(
    async (promotions: { studentId: string; newClassId?: string; newRoll?: number; isAlumni?: boolean; graduationYearId?: string }[]) => {
      if (!user || !db || !orgId) return;
      if (role !== "admin" && role !== "moderator") {
        toast.error("আপনার এই কাজটি করার অনুমতি নেই।");
        return;
      }

      try {
        const batch = writeBatch(db);
        
        for (const promo of promotions) {
          const studentRef = doc(db, `organizations/${orgId}/students`, promo.studentId);
          if (promo.isAlumni) {
            batch.update(studentRef, {
              isAlumni: true,
              graduationYearId: promo.graduationYearId,
              isActive: false, // Mark as inactive so they don't show up in regular lists
            });
          } else {
            batch.update(studentRef, {
              classId: promo.newClassId,
              roll: promo.newRoll,
            });
          }
        }

        await batch.commit();
        toast.success(`${toBengaliNumber(promotions.length)} জন শিক্ষার্থীকে সফলভাবে প্রমোশন/অ্যালামনাই করা হয়েছে!`);
      } catch (error) {
        console.error("Error promoting students:", error);
        toast.error("শিক্ষার্থীদের প্রমোশন দিতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId, role]
  );

  return { students, addStudent, updateStudent, archiveStudent, permanentDeleteStudent, bulkAddStudents, deleteAllArchivedStudents, promoteStudents };
};
