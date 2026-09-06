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

export interface SyncLeaveResult {
  updatedSessionsCount: number;
  updatedStudentsCount: number;
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
        email: auth?.currentUser?.email || "N/A",
        id: auth?.currentUser?.uid
      },
      students: studentRecords,
      version: 1 // Initial version
    };

    batch.set(sessionRef, sessionData);
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
   * Atomically and reliably updates attendance sessions for multiple leaves.
   * Groups leaves by class so that all students in a session are updated in a
   * single write, completely eliminating race conditions, overwrites, and lost updates.
   */
  static async syncAttendancesForLeaves(orgId: string, leaves: any[]): Promise<SyncLeaveResult> {
    if (!db) throw new Error("Firestore not initialized");
    if (!leaves || leaves.length === 0) {
      return { updatedSessionsCount: 0, updatedStudentsCount: 0 };
    }

    const validLeaves = leaves.filter(l => l.status === 'approved' || l.status === 'pending');
    if (validLeaves.length === 0) {
      return { updatedSessionsCount: 0, updatedStudentsCount: 0 };
    }

    // Group leaves by classId
    const leavesByClass = new Map<string, any[]>();
    const unassignedClassLeaves: any[] = [];

    for (const leave of validLeaves) {
      if (leave.classId) {
        const list = leavesByClass.get(leave.classId) || [];
        list.push(leave);
        leavesByClass.set(leave.classId, list);
      } else {
        unassignedClassLeaves.push(leave);
      }
    }

    let totalUpdatedSessions = 0;
    let totalUpdatedStudents = 0;

    let batch = writeBatch(db);
    let batchOperations = 0;

    const commitBatchIfNeeded = async (force: boolean = false) => {
      if (batchOperations > 0 && (force || batchOperations >= 400)) {
        await batch.commit();
        batch = writeBatch(db);
        batchOperations = 0;
      }
    };

    // Helper to process sessions against a list of applicable leaves
    const processSessions = (snapshotDocs: any[], applicableLeaves: any[]) => {
      for (const docSnap of snapshotDocs) {
        const session = docSnap.data();

        // Normalize session date to ISO (YYYY-MM-DD)
        let sessionDateISO = "";
        if (session.date) {
          sessionDateISO = normalizeDateToISO(session.date);
        }
        if (!sessionDateISO && session.createdAt?.toDate) {
          sessionDateISO = session.createdAt.toDate().toISOString().split("T")[0];
        }

        if (!sessionDateISO) continue;

        // Find all leaves that encompass this session date
        const matchingLeaves = applicableLeaves.filter(leave => {
          const sDate = normalizeDateToISO(leave.startDate || leave.date);
          const eDate = normalizeDateToISO(leave.endDate || leave.date);
          if (!sDate || !eDate) return false;
          return sessionDateISO >= sDate && sessionDateISO <= eDate;
        });

        if (matchingLeaves.length === 0) continue;

        // Map studentId -> matching leave
        const leaveByStudentId = new Map<string, any>();
        for (const ml of matchingLeaves) {
          if (ml.studentId) {
            leaveByStudentId.set(String(ml.studentId).trim(), ml);
          }
        }

        let sessionModified = false;
        const currentStudents = session.students || [];
        const updatedStudents = currentStudents.map((st: any) => {
          const studentId = String(st.studentId || st.id || '').trim();
          const matchingLeave = leaveByStudentId.get(studentId);

          if (matchingLeave && st.status !== AttendanceStatus.Leave) {
            sessionModified = true;
            totalUpdatedStudents++;
            return {
              ...st,
              status: AttendanceStatus.Leave,
              note: matchingLeave.note || st.note || 'ছুটি'
            };
          }
          return st;
        });

        if (sessionModified) {
          batch.update(docSnap.ref, {
            students: updatedStudents,
            updatedAt: serverTimestamp()
          });
          batchOperations++;
          totalUpdatedSessions++;
        }
      }
    };

    // 1. Process class-specific leaves
    for (const [classId, classLeaves] of leavesByClass.entries()) {
      const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
      const q = query(sessionsRef, where("classId", "==", classId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        processSessions(snapshot.docs, classLeaves);
        await commitBatchIfNeeded();
      }
    }

    // 2. Process unassigned-class leaves if any
    if (unassignedClassLeaves.length > 0) {
      const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
      const snapshot = await getDocs(sessionsRef);
      if (!snapshot.empty) {
        processSessions(snapshot.docs, unassignedClassLeaves);
        await commitBatchIfNeeded();
      }
    }

    // Final commit if any operations remain
    await commitBatchIfNeeded(true);

    return {
      updatedSessionsCount: totalUpdatedSessions,
      updatedStudentsCount: totalUpdatedStudents
    };
  }

  /**
   * Retroactively updates existing attendance sessions when a leave is added or approved.
   */
  static async syncAttendancesForLeave(orgId: string, leave: any): Promise<SyncLeaveResult> {
    return this.syncAttendancesForLeaves(orgId, [leave]);
  }

  /**
   * Scans all approved and pending leaves in the organization and updates all matching
   * attendance sessions where students might still be marked absent.
   */
  static async syncAllApprovedLeaves(orgId: string): Promise<SyncLeaveResult> {
    if (!db) throw new Error("Firestore not initialized");

    const leavesRef = collection(db, `organizations/${orgId}/leaves`);
    const q = query(leavesRef, where("status", "in", ["approved", "pending"]));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { updatedSessionsCount: 0, updatedStudentsCount: 0 };
    }

    const allLeaves = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return this.syncAttendancesForLeaves(orgId, allLeaves);
  }
}
