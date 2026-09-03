import { useState, useEffect, useCallback } from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { User } from "firebase/auth";
import { SyncManager, SyncLeaveResult } from "../services/SyncManager";
import { toBengaliNumber } from "../utils/dateFormatter";

export interface LeaveRecord {
  id: string;
  studentId: string;
  classId: string;
  date?: string; // Legacy
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  note?: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
}

export const useLeaves = (orgId: string | null, user: User | null) => {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

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
    }, (error: any) => {
      console.error("Error fetching leaves:", error);
      toast.error(`ছুটির তালিকা লোড করতে সমস্যা হয়েছে। এরর: ${error?.code || error?.message || 'অজানা'}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orgId, user]);

  const addLeaves = async (leaveData: Omit<LeaveRecord, "id" | "createdAt">[]) => {
    if (!orgId) return;
    try {
      const leavesRef = collection(db, `organizations/${orgId}/leaves`);
      
      // Save all leaves
      const promises = leaveData.map(async (data) => {
        return await addDoc(leavesRef, {
          ...data,
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(promises);

      // Perform unified, atomic retroactive attendance sync for all added leaves
      const syncResult = await SyncManager.syncAttendancesForLeaves(orgId, leaveData);
      
      if (syncResult.updatedStudentsCount > 0) {
        toast.success(`ছুটি যুক্ত হয়েছে এবং ${toBengaliNumber(syncResult.updatedStudentsCount)} জন শিক্ষার্থীর অনুপস্থিতি ছুটিতে হালনাগাদ করা হয়েছে!`);
      } else {
        toast.success("ছুটির তালিকায় যুক্ত করা হয়েছে।");
      }
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
      
      const leave = leaves.find(l => l.id === id);
      if (leave) {
        const updatedLeave = { ...leave, ...data };
        if (updatedLeave.status === 'approved' || updatedLeave.status === 'pending') {
          const syncResult = await SyncManager.syncAttendancesForLeaves(orgId, [updatedLeave]);
          if (syncResult.updatedStudentsCount > 0) {
            toast.success(`ছুটি আপডেট হয়েছে এবং ${toBengaliNumber(syncResult.updatedStudentsCount)} জন শিক্ষার্থীর হাজিরা হালনাগাদ হয়েছে!`);
            return;
          }
        }
      }

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

  const syncAllLeaves = useCallback(async (): Promise<SyncLeaveResult> => {
    if (!orgId) return { updatedSessionsCount: 0, updatedStudentsCount: 0 };
    setIsSyncing(true);
    try {
      const result = await SyncManager.syncAllApprovedLeaves(orgId);
      if (result.updatedStudentsCount > 0) {
        toast.success(`${toBengaliNumber(result.updatedStudentsCount)} জন শিক্ষার্থীর অনুপস্থিতি সফলভাবে ছুটিতে হালনাগাদ হয়েছে (${toBengaliNumber(result.updatedSessionsCount)} টি সেশন)!`);
      } else {
        toast.success("সকল অনুমোদিত ছুটি ইতিমধ্যে হাজিরার সাথে সিঙ্ক রয়েছে।");
      }
      return result;
    } catch (error) {
      console.error("Error syncing leaves:", error);
      toast.error("হাজিরা সিঙ্ক করতে ব্যর্থ হয়েছে।");
      return { updatedSessionsCount: 0, updatedStudentsCount: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [orgId]);

  return {
    leaves,
    loading,
    isSyncing,
    addLeaves,
    updateLeave,
    deleteLeave,
    syncAllLeaves
  };
};
