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
import { Holiday } from "../types";
import toast from "react-hot-toast";

export const useHolidays = (orgId: string | null, user: any) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || !orgId) {
      setHolidays([]);
      setLoading(false);
      return;
    }

    const holidaysRef = collection(db, `organizations/${orgId}/holidays`);
    
    const unsubHolidays = onSnapshot(holidaysRef, (snapshot) => {
      const loadedHolidays = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Holiday));
      setHolidays(loadedHolidays);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching holidays:", error);
      setLoading(false);
    });

    return () => unsubHolidays();
  }, [user, orgId]);

  const addHoliday = useCallback(
    async (name: string, startDate: number, endDate: number, description?: string, type: 'holiday' | 'event' = 'holiday') => {
      if (!user || !db || !orgId) return;
      try {
        const newHolidayId = `holiday-${Date.now()}`;
        const newHoliday: Holiday = { id: newHolidayId, name, startDate, endDate, description, type };
        
        await setDoc(
          doc(db, `organizations/${orgId}/holidays`, newHolidayId),
          newHoliday,
        );
        toast.success("ছুটি সফলভাবে যোগ করা হয়েছে!");
      } catch (error) {
        console.error("Error adding holiday:", error);
        toast.error("ছুটি যোগ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const updateHoliday = useCallback(
    async (id: string, data: Partial<Holiday>) => {
      if (!user || !db || !orgId) return;
      try {
        await updateDoc(doc(db, `organizations/${orgId}/holidays`, id), data as any);
        toast.success("ছুটি সফলভাবে আপডেট করা হয়েছে!");
      } catch (error) {
        console.error("Error updating holiday:", error);
        toast.error("ছুটি আপডেট করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const deleteHoliday = useCallback(
    async (id: string) => {
      if (!user || !db || !orgId) return;
      try {
        await deleteDoc(doc(db, `organizations/${orgId}/holidays`, id));
        toast.success("ছুটি সফলভাবে মুছে ফেলা হয়েছে!");
      } catch (error) {
        console.error("Error deleting holiday:", error);
        toast.error("ছুটি মুছে ফেলতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  return { holidays, loading, addHoliday, updateHoliday, deleteHoliday };
};
