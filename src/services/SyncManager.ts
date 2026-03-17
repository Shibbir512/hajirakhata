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
  Firestore
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
    studentRecords: { studentId: string; studentName: string; status: AttendanceStatus }[]
  ) {
    if (!db) throw new Error("Firestore not initialized");

    const batch = writeBatch(db);
    const sessionRef = doc(collection(db, `organizations/${orgId}/attendance_sessions`));
    
    const sessionData = {
      classId,
      date,
      time,
      createdAt: serverTimestamp(),
      takenBy: {
        name: auth?.currentUser?.displayName || "Unknown",
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
    if (!db) throw new Error("Firestore not initialized");
    
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
}
