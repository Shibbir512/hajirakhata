import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, where } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { User } from "firebase/auth";

export interface LeaveRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // ISO string or YYYY-MM-DD
  note?: string;
  createdAt?: any;
}

export const useLeaves = (orgId: string | null, user: User | null) => {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !user) {
      setLeaves([]);
      setLoading(false);
      return;
    }

    const leavesRef = collection(db, `organizations/${orgId}/leaves`);
    const q = query(leavesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedLeaves = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRecord[];
      setLeaves(loadedLeaves);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaves:", error);
      toast.error("ছুটির তালিকা লোড করতে সমস্যা হয়েছে।");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId, user]);

  const addLeaves = async (leaveData: Omit<LeaveRecord, "id" | "createdAt">[]) => {
    if (!orgId) return;
    try {
      const leavesRef = collection(db, `organizations/${orgId}/leaves`);
      
      // Batch write or individual adds
      const promises = leaveData.map(async (data) => {
        // Check if leave already exists for this student on this date
        const q = query(
          leavesRef, 
          where("studentId", "==", data.studentId),
          where("date", "==", data.date)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          return addDoc(leavesRef, {
            ...data,
            createdAt: serverTimestamp()
          });
        }
      });
      
      await Promise.all(promises);
      toast.success("ছুটির তালিকায় যুক্ত করা হয়েছে।");
    } catch (error) {
      console.error("Error adding leaves:", error);
      toast.error("ছুটি যুক্ত করতে সমস্যা হয়েছে।");
    }
  };

  const updateLeave = async (id: string, data: Partial<LeaveRecord>) => {
    if (!orgId) return;
    try {
      const leaveRef = doc(db, `organizations/${orgId}/leaves`, id);
      await updateDoc(leaveRef, data);
      toast.success("ছুটির তথ্য আপডেট করা হয়েছে।");
    } catch (error) {
      console.error("Error updating leave:", error);
      toast.error("আপডেট করতে সমস্যা হয়েছে।");
    }
  };

  const deleteLeave = async (id: string) => {
    if (!orgId) return;
    try {
      const leaveRef = doc(db, `organizations/${orgId}/leaves`, id);
      await deleteDoc(leaveRef);
      toast.success("ছুটি মুছে ফেলা হয়েছে।");
    } catch (error) {
      console.error("Error deleting leave:", error);
      toast.error("মুছে ফেলতে সমস্যা হয়েছে।");
    }
  };

  return {
    leaves,
    loading,
    addLeaves,
    updateLeave,
    deleteLeave
  };
};
