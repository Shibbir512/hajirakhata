import { useMemo } from "react";

export const useStudentAttendance = (studentId: string, attendanceSessions: any[]) => {
  return useMemo(() => {
    if (!studentId || !attendanceSessions) return [];

    return attendanceSessions
      .filter((session) =>
        session.students.some((s: any) => s.studentId === studentId)
      )
      .map((session) => {
        const studentRecord = session.students.find((s: any) => s.studentId === studentId);
        return {
          date: session.date,
          time: session.time,
          status: studentRecord?.status,
          classId: session.classId,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [studentId, attendanceSessions]);
};
