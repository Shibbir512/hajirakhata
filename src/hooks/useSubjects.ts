import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { Subject } from "../types";
import toast from "react-hot-toast";

export const useSubjects = (orgId: string | null, user: any) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || !orgId) {
      setSubjects([]);
      setLoading(false);
      return;
    }

    const subjectsRef = collection(db, `organizations/${orgId}/subjects`);
    
    const unsubSubjects = onSnapshot(subjectsRef, (snapshot) => {
      const loadedSubjects = snapshot.docs.map((doc) => doc.data() as Subject);
      loadedSubjects.sort((a, b) => a.subjectOrder - b.subjectOrder);
      setSubjects(loadedSubjects);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching subjects:", error);
      setLoading(false);
    });

    return () => unsubSubjects();
  }, [user, orgId]);

  const addSubject = useCallback(
    async (name: string, classId: string, fullMarks: number, passMarks: number, subjectOrder: number, subjectType: 'written' | 'oral' | 'practical') => {
      if (!user || !db || !orgId) return;
      try {
        const newSubjectId = `subject-${Date.now()}`;
        const newSubject: Subject = { id: newSubjectId, institution_id: orgId, name, classId, fullMarks, passMarks, subjectOrder, subjectType };
        await setDoc(
          doc(db, `organizations/${orgId}/subjects`, newSubjectId),
          newSubject,
        );
        toast.success("বিষয় সফলভাবে যোগ করা হয়েছে!");
      } catch (error) {
        console.error("Error adding subject:", error);
        toast.error("বিষয় যোগ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const updateSubject = useCallback(
    async (id: string, data: Partial<Subject>) => {
      if (!user || !db || !orgId) return;
      try {
        await updateDoc(doc(db, `organizations/${orgId}/subjects`, id), data);
        toast.success("বিষয় সফলভাবে আপডেট করা হয়েছে!");
      } catch (error) {
        console.error("Error updating subject:", error);
        toast.error("বিষয় আপডেট করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const deleteSubject = useCallback(
    async (id: string) => {
      if (!user || !db || !orgId) return;
      try {
        await deleteDoc(doc(db, `organizations/${orgId}/subjects`, id));
        toast.success("বিষয় সফলভাবে মুছে ফেলা হয়েছে!");
      } catch (error) {
        console.error("Error deleting subject:", error);
        toast.error("বিষয় মুছে ফেলতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  return { subjects, loading, addSubject, updateSubject, deleteSubject };
};
