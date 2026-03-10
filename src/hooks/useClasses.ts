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
import { ClassData } from "../types";
import toast from "react-hot-toast";

export const useClasses = (orgId: string | null, user: any, role: string | null) => {
  const [classes, setClasses] = useState<ClassData[]>([]);

  useEffect(() => {
    if (!user || !db || !orgId) {
      setClasses([]);
      return;
    }

    const classesRef = collection(db, `organizations/${orgId}/classes`);
    const unsubClasses = onSnapshot(classesRef, (snapshot) => {
      const loadedClasses = snapshot.docs.map((doc) => doc.data() as ClassData);
      setClasses(loadedClasses);
    });

    return () => unsubClasses();
  }, [user, orgId]);

  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const addClass = useCallback(
    async (name: string) => {
      if (!user || !db || !orgId) return;
      setIsAdding(true);
      try {
        const newClassId = `class-${Date.now()}`;
        const newClass = { id: newClassId, name };
        await setDoc(
          doc(db, `organizations/${orgId}/classes`, newClassId),
          newClass,
        );
        toast.success("শ্রেণি সফলভাবে যোগ করা হয়েছে!");
      } catch (error) {
        console.error("Error adding class:", error);
        toast.error("শ্রেণি যোগ করতে ব্যর্থ হয়েছে।");
      } finally {
        setIsAdding(false);
      }
    },
    [user, orgId],
  );

  const updateClassName = useCallback(
    async (id: string, name: string) => {
      if (!user || !db || !orgId) return;
      setIsUpdating(true);
      try {
        await updateDoc(doc(db, `organizations/${orgId}/classes`, id), {
          name,
        });
        toast.success("শ্রেণি সফলভাবে আপডেট করা হয়েছে!");
      } catch (error) {
        console.error("Error updating class:", error);
        toast.error("শ্রেণি আপডেট করতে ব্যর্থ হয়েছে।");
      } finally {
        setIsUpdating(false);
      }
    },
    [user, orgId],
  );

  const deleteClass = useCallback(
    async (id: string) => {
      if (!user || !db || !orgId) {
        toast.error("সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার লগইন করুন।");
        return;
      }
      
      // Allow teachers to delete classes as well if they are in the org
      if (role !== "admin" && role !== "moderator" && role !== "teacher") {
        toast.error("আপনার এই কাজটি করার অনুমতি নেই।");
        return;
      }

      setIsDeleting(true);
      try {
        // 1. Delete the class document
        await deleteDoc(doc(db, `organizations/${orgId}/classes`, id));

        // 2. Delete associated students
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const studentsSnapshot = await getDocs(studentsRef);
        
        // We can't query by ID prefix easily in Firestore, so we fetch all and filter
        // Alternatively, if we had classId in student doc, we could query.
        // For now, filtering client-side since the collection size per org is manageable.
        const studentsToDelete = studentsSnapshot.docs.filter(doc => doc.id.startsWith(`${id}-student-`));
        
        // 3. Delete associated attendance records
        const attendanceRef = collection(db, `organizations/${orgId}/attendance`);
        const attendanceQuery = query(attendanceRef, where("classId", "==", id));
        const attendanceSnapshot = await getDocs(attendanceQuery);

        // Use batch to delete
        const batch = writeBatch(db);
        
        studentsToDelete.forEach(doc => {
          batch.delete(doc.ref);
        });

        attendanceSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();

        toast.success("শ্রেণি এবং সম্পর্কিত তথ্য সফলভাবে মুছে ফেলা হয়েছে!");
      } catch (error) {
        console.error("Error deleting class:", error);
        toast.error("শ্রেণি মুছে ফেলতে ব্যর্থ হয়েছে।");
      } finally {
        setIsDeleting(false);
      }
    },
    [user, orgId, role],
  );

  return { classes, addClass, updateClassName, deleteClass, isAdding, isUpdating, isDeleting };
};
