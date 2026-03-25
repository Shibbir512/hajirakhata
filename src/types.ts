export interface Student {
  id: string;
  studentUid?: string; // Unique ID like 202401001 (Optional for backward compatibility)
  classId: string;
  roll: number;
  name: string;
  fatherName?: string;
  phone?: string;
  address?: string;
  version?: number;
  isActive?: boolean;
  archivedAt?: number;
  isAlumni?: boolean;
  graduationYearId?: string;
}

export interface ClassData {
  id: string;
  name: string;
  teacherIds?: string[];
}

export enum AttendanceStatus {
  Present = "present",
  Absent = "absent",
  Late = "late",
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

export interface Exam {
  id: string;
  institution_id: string;
  academicYearId: string;
  name: string;
  classId: string;
  examDate?: number; // Timestamp
  instructions?: string;
}

export interface Result {
  id: string;
  institution_id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  exam_id: string;
  subject_id: string;
  marks: number;
  status: 'draft' | 'published' | 'hidden';
  isDeleted?: boolean;
  created_by: string;
  updated_by: string;
  created_at: number;
  updated_at: number;
  version?: number;
}

export type ResultRecord = Result;

export interface Subject {
  id: string;
  institution_id: string;
  name: string;
  nameAr?: string;
  classId: string;
  fullMarks: number;
  passMarks: number;
  subjectOrder: number;
  subjectType: 'written' | 'oral' | 'practical';
}

export interface AcademicYear {
  id: string;
  institution_id: string;
  year_name: string;
  hijri_year: string;
  is_active: boolean;
}
