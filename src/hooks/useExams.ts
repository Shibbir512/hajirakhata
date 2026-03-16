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
} from "firebase/firestore";
import { Exam } from "../types";
import toast from "react-hot-toast";

export const useExams = (orgId: string | null, user: any) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || !orgId) {
      setExams([]);
      setLoading(false);
      return;
    }

    const examsRef = collection(db, `organizations/${orgId}/exams`);
    
    const unsubExams = onSnapshot(examsRef, (snapshot) => {
      const loadedExams = snapshot.docs.map((doc) => doc.data() as Exam);
      setExams(loadedExams);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching exams:", error);
      setLoading(false);
    });

    return () => unsubExams();
  }, [user, orgId]);

  const addExam = useCallback(
    async (name: string, academicYearId: string, classId: string) => {
      if (!user || !db || !orgId) return;
      try {
        const newExamId = `exam-${Date.now()}`;
        const newExam: Exam = { id: newExamId, institution_id: orgId, name, academicYearId, classId };
        await setDoc(
          doc(db, `organizations/${orgId}/exams`, newExamId),
          newExam,
        );
        toast.success("পরীক্ষা সফলভাবে যোগ করা হয়েছে!");
      } catch (error) {
        console.error("Error adding exam:", error);
        toast.error("পরীক্ষা যোগ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const updateExam = useCallback(
    async (id: string, data: Partial<Exam>) => {
      if (!user || !db || !orgId) return;
      try {
        await updateDoc(doc(db, `organizations/${orgId}/exams`, id), data);
        toast.success("পরীক্ষা সফলভাবে আপডেট করা হয়েছে!");
      } catch (error) {
        console.error("Error updating exam:", error);
        toast.error("পরীক্ষা আপডেট করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const deleteExam = useCallback(
    async (id: string) => {
      if (!user || !db || !orgId) return;
      try {
        await deleteDoc(doc(db, `organizations/${orgId}/exams`, id));
        toast.success("পরীক্ষা সফলভাবে মুছে ফেলা হয়েছে!");
      } catch (error) {
        console.error("Error deleting exam:", error);
        toast.error("পরীক্ষা মুছে ফেলতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  return { exams, loading, addExam, updateExam, deleteExam };
};
