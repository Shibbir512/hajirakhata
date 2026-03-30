import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { Announcement } from "../types";
import { useAuth } from "./useAuth";

export const useAnnouncements = (orgId: string | null) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `organizations/${orgId}/announcements`),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Announcement[];
      setAnnouncements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  const addAnnouncement = useCallback(async (message: string, creatorName: string) => {
    if (!orgId || !user) return;
    await addDoc(collection(db, `organizations/${orgId}/announcements`), {
      message,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      creatorName,
    });
  }, [orgId, user]);

  const updateAnnouncement = useCallback(async (id: string, message: string) => {
    if (!orgId) return;
    await updateDoc(doc(db, `organizations/${orgId}/announcements`, id), {
      message,
    });
  }, [orgId]);

  const deleteAnnouncement = useCallback(async (id: string) => {
    if (!orgId) return;
    await deleteDoc(doc(db, `organizations/${orgId}/announcements`, id));
  }, [orgId]);

  return { announcements, loading, addAnnouncement, updateAnnouncement, deleteAnnouncement };
};
