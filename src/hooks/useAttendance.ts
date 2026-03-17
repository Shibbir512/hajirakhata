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
  writeBatch,
  getDocs,
  orderBy,
  addDoc,
  limit,
} from "firebase/firestore";
import {
  AttendanceRecord,
  AttendanceStatus,
  Student,
  ClassData,
} from "../types";
import toast from "react-hot-toast";

import { SyncManager } from "../services/SyncManager";

export const useAttendance = (
  orgId: string | null,
  user: any,
  classes: ClassData[],
  students: { [key: string]: Student[] },
  role: string | null,
) => {
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);

  // Fetch attendance sessions
  useEffect(() => {
    if (!user || !db || !orgId) {
      setAttendanceSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
    
    const q = query(sessionsRef, orderBy("createdAt", "desc"), limit(50));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          _syncStatus: doc.metadata.hasPendingWrites ? "pending" : "synced"
        }));
        setAttendanceSessions(sessions);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching sessions:", error);
        toast.error("হাজিরা সেশন লোড করতে ব্যর্থ হয়েছে।");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user, orgId]);

  const takeAttendance = useCallback(
    async (
      classId: string,
      studentStatuses: Map<string, { status: AttendanceStatus; studentName: string }>,
    ): Promise<boolean> => {
      if (!user || !db || !orgId) return false;

      setIsTakingAttendance(true);
      try {
        const now = new Date();
        const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '); // dd mm yyyy
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const timeParts = timeStr.split(' ');
        const time = timeParts[0].replace(/:/g, ' ') + '-' + (timeParts[1] || ''); // hh mm ss-AM/PM

        const studentsArray = Array.from(studentStatuses.entries()).map(([studentId, { status, studentName }]) => ({
          studentId,
          studentName,
          status
        }));

        await SyncManager.performAtomicAttendance(orgId, classId, date, time, studentsArray);
        toast.success("হাজিরা সফলভাবে সংরক্ষণ করা হয়েছে!");
        return true;
      } catch (error) {
        console.error("Error taking attendance:", error);
        toast.error("হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে।");
        return false;
      } finally {
        setIsTakingAttendance(false);
      }
    },
    [user, orgId],
  );

  const updateAttendanceSession = useCallback(
    async (sessionId: string, students: any[], currentVersion: number = 1) => {
      if (!user || !db || !orgId) return;
      try {
        const path = `organizations/${orgId}/attendance_sessions/${sessionId}`;
        await SyncManager.updateWithVersioning(path, { students }, currentVersion);
        toast.success("হাজিরা আপডেট করা হয়েছে!");
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          toast.error("সংস্করণ অমিল! অন্য কেউ ইতিমধ্যে এই তথ্য আপডেট করেছে।");
        } else {
          console.error("Error updating attendance:", error);
          toast.error("হাজিরা আপডেট করতে ব্যর্থ হয়েছে।");
        }
      }
    },
    [user, orgId],
  );

  const deleteAttendanceSession = useCallback(
    async (sessionId: string) => {
      if (!user || !db || !orgId) {
        toast.error("সেশন শেষ হয়ে গেছে। অনুগ্রহ করে আবার লগইন করুন।");
        return;
      }

      // Allow teachers to delete attendance sessions
      if (role !== "admin" && role !== "moderator" && role !== "teacher") {
        toast.error("আপনার এই কাজটি করার অনুমতি নেই।");
        return;
      }

      try {
        const sessionRef = doc(db, `organizations/${orgId}/attendance_sessions`, sessionId);
        // Use deleteDoc instead of updateDoc to permanently remove it as requested by "delete not working"
        await deleteDoc(sessionRef);
        toast.success("হাজিরা সেশন মুছে ফেলা হয়েছে!");
      } catch (error) {
        console.error("Error deleting attendance:", error);
        toast.error("হাজিরা সেশন মুছতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId, role],
  );

  return {
    attendanceSessions,
    loading,
    isTakingAttendance,
    takeAttendance,
    updateAttendanceSession,
    deleteAttendanceSession,
  };
};
