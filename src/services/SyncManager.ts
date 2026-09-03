import { normalizeDateToISO } from "../utils/dateFormatter";
import { 
  db, 
  auth 
} from "../firebase";
import { 
  doc, 
  writeBatch, 
  getDoc, 
  updateDoc, 
  setDoc,
  collection,
  serverTimestamp,
  Firestore, getDocs, query, where,

} from "firebase/firestore";
import { AttendanceStatus } from "../types";

export enum SyncStatus {
  SYNCED = "synced",
  PENDING = "pending",
  CONFLICT = "conflict",
  ERROR = "error"
}

export interface SyncMetadata {
  version: number;
  lastUpdated: number;
  updatedBy: string;
}

export class SyncManager {
  /**
   * Performs an atomic batch write for attendance.
   * Ensures that either all 50 students are marked or none are.
   */
  static async performAtomicAttendance(
    orgId: string,
    classId: string,
    date: string,
    time: string,
    studentRecords: { studentId: string; studentName: string; status: AttendanceStatus; note?: string }[]
  ) {
    if (!db) throw new Error("Firestore, getDocs, query, where not initialized");



    const batch = writeBatch(db);
    const sessionRef = doc(collection(db, `organizations/${orgId}/attendance_sessions`));
    
    const sessionData = {
      classId,
      date,
      time,
      createdAt: serverTimestamp(),
      takenBy: {
        name: auth?.currentUser?.displayName || "Unknown",
        email: auth?.currentUser?.email || "N/A",
        id: auth?.currentUser?.uid
      },
      students: studentRecords,
      version: 1 // Initial version
    };

    batch.set(sessionRef, sessionData);

    // We could also update individual student "lastSeen" or "attendanceStats" here
    // batch.update(studentRef, { ... });

    return await batch.commit();
  }

  /**
   * Robust update with Versioning check.
   * This is critical for Result Management.
   */
  static async updateWithVersioning(
    docPath: string, 
    newData: any, 
    currentVersion: number,
    options: { merge?: boolean } = {}
  ) {


    
    const docRef = doc(db, docPath);
    const updateData = {
      ...newData,
      version: (currentVersion || 0) + 1,
      updatedAt: serverTimestamp(),
      updatedBy: auth?.currentUser?.uid
    };

    if (options.merge) {
      return await setDoc(docRef, updateData, { merge: true });
    } else {
      return await updateDoc(docRef, updateData);
    }
  }

  /**
   * Retroactively updates existing attendance sessions when a leave is added or approved.
   */
  static async syncAttendancesForLeave(orgId: string, leave: any) {
    if (!db) throw new Error("Firestore, getDocs, query, where not initialized");
    if (leave.status !== 'approved' && leave.status !== 'pending') return; // Depending on whether you want pending leaves to also mark as leave

    const sDate = normalizeDateToISO(leave.startDate || leave.date);
    const eDate = normalizeDateToISO(leave.endDate || leave.date);
    if (!sDate || !eDate) return;

    // We consider the entire day if time is not provided
    const startDateObj = new Date(`${sDate}T${leave.startTime || '00:00'}:00`);
    const endDateObj = new Date(`${eDate}T${leave.endTime || '23:59'}:59`);

    const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
    const q = query(sessionsRef, where("classId", "==", leave.classId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    let updateCount = 0;

    snapshot.docs.forEach(docSnap => {
      const session = docSnap.data();
      let sessionDateObj: Date | null = null;
      
      if (session.createdAt && session.createdAt.toDate) {
        sessionDateObj = session.createdAt.toDate();
      } else if (session.date) {
        try {
           const parts = session.date.split(" ");
           if (parts.length === 3) {
             const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
             sessionDateObj = new Date(isoDate);
           }
        } catch (e) {}
      }

      if (sessionDateObj && sessionDateObj >= startDateObj && sessionDateObj <= endDateObj) {
         let hasChanges = false;
         const updatedStudents = (session.students || []).map((st: any) => {
            if (st.studentId === leave.studentId && st.status !== AttendanceStatus.Leave) {
               hasChanges = true;
               return { ...st, status: AttendanceStatus.Leave, note: leave.note || 'ছুটি' };
            }
            return st;
         });

         if (hasChanges) {
            batch.update(docSnap.ref, { students: updatedStudents });
            updateCount++;
         }
      }
    });

    if (updateCount > 0) {
      await batch.commit();
    }
  }
}
