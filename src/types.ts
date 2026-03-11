export interface Student {
  id: string;
  classId: string;
  roll: number;
  name: string;
  fatherName?: string;
  phone?: string;
  address?: string;
}

export interface ClassData {
  id: string;
  name: string;
  teacherIds?: string[];
}

export enum AttendanceStatus {
  Present = "present",
  Absent = "absent",
}

export interface AttendanceRecord {
  id: string; // unique id: `${timestamp}-${studentId}`
  studentId: string;
  classId: string;
  timestamp: number;
  status: AttendanceStatus;
  note?: string;
  teacherName?: string;
  teacherId?: string;
  takenAt?: number;
}
