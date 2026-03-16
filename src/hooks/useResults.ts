import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Result } from "../types";
import toast from "react-hot-toast";

export const useResults = (orgId: string | null, user: any, academicYearId: string, examId: string, classId: string) => {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || !orgId || !academicYearId || !examId || !classId) {
      setResults([]);
      setLoading(false);
      return;
    }

    const resultsRef = collection(db, `organizations/${orgId}/results`);
    const q = query(
      resultsRef,
      where("academic_year_id", "==", academicYearId),
      where("exam_id", "==", examId),
      where("class_id", "==", classId)
    );
    
    const unsubResults = onSnapshot(q, (snapshot) => {
      const loadedResults = snapshot.docs.map((doc) => doc.data() as Result);
      setResults(loadedResults);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching results:", error);
      setLoading(false);
    });

    return () => unsubResults();
  }, [user, orgId, academicYearId, examId, classId]);

  const saveResult = useCallback(
    async (result: Partial<Result>) => {
      if (!user || !db || !orgId) return;
      try {
        const resultId = result.id || `result-${Date.now()}-${result.student_id}-${result.subject_id}`;
        
        // Check if result already exists to preserve created_at/created_by
        const resultRef = doc(db, `organizations/${orgId}/results`, resultId);
        const existingDoc = await getDoc(resultRef);
        const existingData = existingDoc.exists() ? existingDoc.data() as Result : null;

        const resultToSave: any = {
          ...result,
          id: resultId,
          institution_id: orgId,
          updated_by: user.uid,
          updated_at: Date.now(),
          status: result.status || existingData?.status || 'draft'
        };

        if (!existingData) {
          resultToSave.created_by = user.uid;
          resultToSave.created_at = Date.now();
        }

        await setDoc(resultRef, resultToSave, { merge: true });
      } catch (error) {
        console.error("Error saving result:", error);
        toast.error("ফলাফল সংরক্ষণ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const publishResults = useCallback(
    async (academicYearId: string, examId: string, classId: string) => {
      if (!user || !db || !orgId) return;
      try {
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const q = query(
          resultsRef,
          where("academic_year_id", "==", academicYearId),
          where("exam_id", "==", examId),
          where("class_id", "==", classId),
          where("status", "==", "draft")
        );
        const snapshot = await getDocs(q);
        
        const batch = snapshot.docs.map(d => {
          return setDoc(d.ref, { 
            status: 'published',
            updated_by: user.uid,
            updated_at: Date.now()
          }, { merge: true });
        });

        await Promise.all(batch);
        toast.success("ফলাফল সফলভাবে প্রকাশিত হয়েছে!");
      } catch (error) {
        console.error("Error publishing results:", error);
        toast.error("ফলাফল প্রকাশ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  return { results, loading, saveResult, publishResults };
};
