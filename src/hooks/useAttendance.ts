import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
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

export const useAttendance = (
  orgId: string | null,
  user: any,
  classes: ClassData[],
  students: { [key: string]: Student[] },
) => {
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    ) => {
      if (!user || !db || !orgId) return;

      try {
        const now = new Date();
        const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '); // dd mm yyyy
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).replace(/:/g, ' ').replace(' ', '-'); // hh mm ss-AM/PM

        // Duplicate Protection: Check if session exists
        const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
        const q = query(sessionsRef, where("classId", "==", classId), where("date", "==", date), where("time", "==", time));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          toast.error("এই সেশনের জন্য ইতিমধ্যে হাজিরা নেওয়া হয়েছে।");
          return;
        }

        const studentsArray = Array.from(studentStatuses.entries()).map(([studentId, { status, studentName }]) => ({
          studentId,
          studentName,
          status
        }));

        const sessionData = {
          classId,
          date,
          time,
          createdAt: Date.now(),
          takenBy: {
            name: user.displayName || "Unknown",
            id: user.uid
          },
          students: studentsArray
        };

        await addDoc(sessionsRef, sessionData);
        toast.success("হাজিরা সফলভাবে সংরক্ষণ করা হয়েছে!");
      } catch (error) {
        console.error("Error taking attendance:", error);
        toast.error("হাজিরা সংরক্ষণ করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  const updateAttendanceSession = useCallback(
    async (sessionId: string, students: any[]) => {
      if (!user || !db || !orgId) return;
      try {
        const sessionRef = doc(db, `organizations/${orgId}/attendance_sessions`, sessionId);
        await updateDoc(sessionRef, { students });
        toast.success("হাজিরা আপডেট করা হয়েছে!");
      } catch (error) {
        console.error("Error updating attendance:", error);
        toast.error("হাজিরা আপডেট করতে ব্যর্থ হয়েছে।");
      }
    },
    [user, orgId],
  );

  return {
    attendanceSessions,
    loading,
    takeAttendance,
    updateAttendanceSession,
  };
};
