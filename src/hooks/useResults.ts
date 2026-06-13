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
import { SyncManager } from "../services/SyncManager";

export const useResults = (orgId: string | null, user: any, academicYearId: string, examId: string, classId: string) => {
  const [results, setResults] = useState<Result[]>([]);
  const [resultsConfig, setResultsConfig] = useState<{ studentOrder?: string[]; excludedStudents?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || !orgId || !academicYearId || !examId || !classId) {
      setResults([]);
      setResultsConfig(null);
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
      const loadedResults: Result[] = [];
      let foundConfig: any = null;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'config') {
          foundConfig = data;
        } else if (!data.isDeleted) {
          loadedResults.push(data as Result);
        }
      });

      setResults(loadedResults);
      setResultsConfig(foundConfig);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching results:", error);
      setLoading(false);
    });

    return () => unsubResults();
  }, [user, orgId, academicYearId, examId, classId]);

  const saveResultsConfig = useCallback(
    async (studentOrder: string[], excludedStudents: string[], silent: boolean = false) => {
      if (!user || !db || !orgId || !academicYearId || !examId || !classId) return;
      try {
        const configId = `config-${academicYearId}-${examId}-${classId}`;
        const docPath = `organizations/${orgId}/results/${configId}`;
        const configRef = doc(db, docPath);

        const configToSave = {
          id: configId,
          institution_id: orgId,
          academic_year_id: academicYearId,
          exam_id: examId,
          class_id: classId,
          type: 'config',
          studentOrder,
          excludedStudents,
          status: 'published', // Always published so public/results pages can read it
          updated_by: user.uid,
          updated_at: Date.now()
        };

        await setDoc(configRef, configToSave, { merge: true });
        if (!silent) toast.success("ধারাবাহিকতা ও বাদ দেওয়া লিস্ট সফলভাবে সংরক্ষণ করা হয়েছে!");
      } catch (error) {
        console.error("Error saving results config:", error);
        if (!silent) toast.error("কনফিগারেশন সংরক্ষণ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId, academicYearId, examId, classId],
  );

  const saveResult = useCallback(
    async (result: Partial<Result>) => {
      if (!user || !db || !orgId) return;
      try {
        const resultId = result.id || `result-${Date.now()}-${result.student_id}-${result.subject_id}`;
        const docPath = `organizations/${orgId}/results/${resultId}`;
        
        // Check if result already exists to preserve created_at/created_by
        const resultRef = doc(db, docPath);
        const existingDoc = await getDoc(resultRef);
        const existingData = existingDoc.exists() ? existingDoc.data() as Result : null;

        const resultToSave: any = {
          ...result,
          institution_id: orgId,
          status: result.status || existingData?.status || 'draft'
        };

        // Remove undefined values
        Object.keys(resultToSave).forEach(key => {
          if (resultToSave[key] === undefined) {
            delete resultToSave[key];
          }
        });

        if (!existingData) {
          resultToSave.created_by = user.uid;
          resultToSave.created_at = Date.now();
          resultToSave.version = 1;
          await setDoc(resultRef, resultToSave, { merge: true });
        } else {
          await SyncManager.updateWithVersioning(docPath, resultToSave, existingData.version || 1, { merge: true });
        }
      } catch (error) {
        console.error("Error saving result:", error);
        if (error instanceof Error && error.message.includes("permission-denied")) {
          toast.error("ফলাফল আপডেট করতে সমস্যা হয়েছে। সম্ভবত অন্য কেউ এটি ইতিমধ্যে আপডেট করেছেন।");
        } else {
          toast.error("ফলাফল সংরক্ষণ করতে ব্যর্থ হয়েছে।");
        }
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
          where("status", "in", ["draft", "hidden"])
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

  const hideResults = useCallback(
    async (academicYearId: string, examId: string, classId: string) => {
      if (!user || !db || !orgId) return;
      try {
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const q = query(
          resultsRef,
          where("academic_year_id", "==", academicYearId),
          where("exam_id", "==", examId),
          where("class_id", "==", classId),
          where("status", "==", "published")
        );
        const snapshot = await getDocs(q);
        
        const batch = snapshot.docs.map(d => {
          return setDoc(d.ref, { 
            status: 'hidden',
            updated_by: user.uid,
            updated_at: Date.now()
          }, { merge: true });
        });

        await Promise.all(batch);
        toast.success("ফলাফল সফলভাবে গোপন করা হয়েছে!");
      } catch (error) {
        console.error("Error hiding results:", error);
        toast.error("ফলাফল গোপন করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const deleteResults = useCallback(
    async (academicYearId: string, examId: string, classId: string) => {
      if (!user || !db || !orgId) return;
      try {
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const q = query(
          resultsRef,
          where("academic_year_id", "==", academicYearId),
          where("exam_id", "==", examId),
          where("class_id", "==", classId)
        );
        const snapshot = await getDocs(q);
        
        const batch = snapshot.docs.map(d => {
          return setDoc(d.ref, { 
            isDeleted: true,
            updated_by: user.uid,
            updated_at: Date.now()
          }, { merge: true });
        });

        await Promise.all(batch);
        toast.success("ফলাফল সফলভাবে ডিলিট করা হয়েছে!");
      } catch (error) {
        console.error("Error deleting results:", error);
        toast.error("ফলাফল ডিলিট করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  return { results, resultsConfig, saveResultsConfig, loading, saveResult, publishResults, hideResults, deleteResults };
};
