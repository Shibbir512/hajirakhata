import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { AcademicYear } from "../types";
import toast from "react-hot-toast";

export const useAcademicYears = (orgId: string | null, user: any) => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || !orgId) {
      setAcademicYears([]);
      setLoading(false);
      return;
    }

    const yearsRef = collection(db, `organizations/${orgId}/academic_years`);
    
    const unsubYears = onSnapshot(yearsRef, (snapshot) => {
      const loadedYears = snapshot.docs.map((doc) => doc.data() as AcademicYear);
      setAcademicYears(loadedYears.sort((a, b) => b.year_name.localeCompare(a.year_name)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching academic years:", error);
      setLoading(false);
    });

    return () => unsubYears();
  }, [user, orgId]);

  const addAcademicYear = useCallback(
    async (year_name: string, hijri_year: string, is_active: boolean) => {
      if (!user || !db || !orgId) return;
      try {
        const newYearId = `ay-${Date.now()}`;
        const newYear: AcademicYear = { id: newYearId, institution_id: orgId, year_name, hijri_year, is_active };
        
        if (is_active) {
          // Set all others to inactive
          const batch = writeBatch(db);
          academicYears.forEach(ay => {
            if (ay.is_active) {
              batch.update(doc(db, `organizations/${orgId}/academic_years`, ay.id), { is_active: false });
            }
          });
          batch.set(doc(db, `organizations/${orgId}/academic_years`, newYearId), newYear);
          await batch.commit();
        } else {
          await setDoc(doc(db, `organizations/${orgId}/academic_years`, newYearId), newYear);
        }
        
        toast.success("শিক্ষাবর্ষ সফলভাবে যোগ করা হয়েছে!");
      } catch (error) {
        console.error("Error adding academic year:", error);
        toast.error("শিক্ষাবর্ষ যোগ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId, academicYears],
  );

  const updateAcademicYear = useCallback(
    async (id: string, data: Partial<AcademicYear>) => {
      if (!user || !db || !orgId) return;
      try {
        const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
        if (cleanData.is_active) {
          // Set all others to inactive
          const batch = writeBatch(db);
          academicYears.forEach(ay => {
            if (ay.id !== id && ay.is_active) {
              batch.update(doc(db, `organizations/${orgId}/academic_years`, ay.id), { is_active: false });
            }
          });
          batch.update(doc(db, `organizations/${orgId}/academic_years`, id), cleanData);
          await batch.commit();
        } else {
          await updateDoc(doc(db, `organizations/${orgId}/academic_years`, id), cleanData);
        }
        toast.success("শিক্ষাবর্ষ সফলভাবে আপডেট করা হয়েছে!");
      } catch (error) {
        console.error("Error updating academic year:", error);
        toast.error("শিক্ষাবর্ষ আপডেট করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId, academicYears],
  );

  const deleteAcademicYear = useCallback(
    async (id: string) => {
      if (!user || !db || !orgId) return;
      try {
        await deleteDoc(doc(db, `organizations/${orgId}/academic_years`, id));
        toast.success("শিক্ষাবর্ষ সফলভাবে মুছে ফেলা হয়েছে!");
      } catch (error) {
        console.error("Error deleting academic year:", error);
        toast.error("শিক্ষাবর্ষ মুছে ফেলতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const setActiveAcademicYear = useCallback(
    async (id: string) => {
      if (!user || !db || !orgId) return;
      try {
        const batch = writeBatch(db);
        academicYears.forEach(ay => {
          if (ay.id === id && !ay.is_active) {
            batch.update(doc(db, `organizations/${orgId}/academic_years`, ay.id), { is_active: true });
          } else if (ay.id !== id && ay.is_active) {
            batch.update(doc(db, `organizations/${orgId}/academic_years`, ay.id), { is_active: false });
          }
        });
        await batch.commit();
        toast.success("সক্রিয় শিক্ষাবর্ষ পরিবর্তন করা হয়েছে!");
      } catch (error) {
        console.error("Error setting active academic year:", error);
        toast.error("সক্রিয় শিক্ষাবর্ষ পরিবর্তন করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId, academicYears],
  );

  return { academicYears, loading, addAcademicYear, updateAcademicYear, deleteAcademicYear, setActiveAcademicYear };
};
