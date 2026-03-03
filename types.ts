export interface Student {
  id: string;
  roll: number;
  name: string;
}

export interface ClassData {
  id: string;
  name: string;
}

export enum AttendanceStatus {
  Present = 'present',
  Absent = 'absent',
}

export interface AttendanceRecord {
  id: string; // unique id: `${timestamp}-${studentId}`
  studentId: string;
  classId: string;
  timestamp: number;
  status: AttendanceStatus;
  note?: string;
}