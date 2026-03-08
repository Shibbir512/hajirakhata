import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";

export const useReminders = (orgId: string | null, user: any) => {
  const [reminders, setReminders] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !db || !orgId) {
      setReminders([]);
      return;
    }

    const remindersRef = collection(db, `organizations/${orgId}/reminders`);
    const unsubReminders = onSnapshot(remindersRef, (snapshot) => {
      const loadedReminders = snapshot.docs.map((doc) => doc.id);
      setReminders(loadedReminders.sort());
    });

    return () => unsubReminders();
  }, [user, orgId]);

  const addReminder = useCallback(
    async (time: string) => {
      if (!user || !db || !orgId) return;
      try {
        await setDoc(doc(db, `organizations/${orgId}/reminders`, time), {
          time,
        });
        toast.success("রিমাইন্ডার সফলভাবে যোগ করা হয়েছে!");
      } catch (error) {
        console.error("Error adding reminder:", error);
        toast.error("রিমাইন্ডার যোগ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const deleteReminder = useCallback(
    async (time: string) => {
      if (!user || !db || !orgId) return;
      try {
        await deleteDoc(doc(db, `organizations/${orgId}/reminders`, time));
        toast.success("রিমাইন্ডার সফলভাবে মুছে ফেলা হয়েছে!");
      } catch (error) {
        console.error("Error deleting reminder:", error);
        toast.error("রিমাইন্ডার মুছে ফেলতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  return { reminders, addReminder, deleteReminder };
};
