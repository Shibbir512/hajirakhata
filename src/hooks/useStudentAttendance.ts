import { useMemo } from "react";

const parseDateString = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day).getTime();
  }
  return new Date(dateStr).getTime() || 0;
};

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
          note: studentRecord?.note,
        };
      })
      .sort((a, b) => parseDateString(b.date) - parseDateString(a.date));
  }, [studentId, attendanceSessions]);
};
