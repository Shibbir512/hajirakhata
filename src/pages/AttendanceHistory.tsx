import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import { Search, Eye, Edit2, X } from "lucide-react";
import clsx from "clsx";

const AttendanceHistory: React.FC = () => {
  const { user, orgId } = useAuth();
  const { classes } = useClasses(orgId, user);
  const { attendanceSessions, updateAttendanceSession } = useAttendance(orgId, user, classes, {});
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStudents, setEditedStudents] = useState<any[]>([]);

  const classSessions = useMemo(() => {
    return attendanceSessions.filter(s => s.classId === selectedClassId);
  }, [attendanceSessions, selectedClassId]);

  const handleEdit = (session: any) => {
    setSelectedSession(session);
    setEditedStudents(session.students);
    setIsEditMode(true);
  };

  const handleStatusToggle = (studentId: string) => {
    setEditedStudents(prev => prev.map(s => 
      s.studentId === studentId 
        ? { ...s, status: s.status === AttendanceStatus.Present ? AttendanceStatus.Absent : AttendanceStatus.Present }
        : s
    ));
  };

  const handleSave = async () => {
    if (!selectedSession) return;
    await updateAttendanceSession(selectedSession.id, editedStudents);
    setIsEditMode(false);
    setSelectedSession(null);
  };

  const toBengaliNumber = (num: string | number) => {
    const bengaliNumbers = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return num.toString().split("").map(char => bengaliNumbers[parseInt(char)] || char).join("");
  };

  const toBengaliDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return "";
    return dateStr.split("-").map(toBengaliNumber).join("-");
  };

  const toBengaliTime = (timeStr: string) => {
    // Basic conversion for time string like "10:30:00 AM"
    return timeStr.replace(/\d/g, (match) => toBengaliNumber(match));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">হাজিরা ইতিহাস</h2>
      
      <select
        value={selectedClassId}
        onChange={(e) => setSelectedClassId(e.target.value)}
        className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">শ্রেণি নির্বাচন করুন</option>
        {classes.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.name}
          </option>
        ))}
      </select>

      <div className="space-y-4">
        {classSessions.map(session => {
          const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
          return (
            <div key={session.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="font-semibold">তারিখঃ</span> {session.date ? toBengaliDate(session.date) : ""}</p>
                  <p><span className="font-semibold">সময়ঃ</span> {session.time ? toBengaliTime(session.time) : ""}</p>
                  <p><span className="font-semibold">হাজিরা নিয়েছেনঃ</span> {session.takenBy?.name || "N/A"}</p>
                </div>
                <button onClick={() => handleEdit(session)} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-full">
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="border-t pt-3">
                <p className="font-semibold text-slate-700 mb-2">অনুপস্থিত ছাত্র:</p>
                {absentStudents.length > 0 ? (
                  <ul className="space-y-1">
                    {absentStudents.map((s: any) => (
                      <li key={s.studentId} className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                        {s.studentName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">কেউ নেই</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isEditMode && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">হাজিরা সম্পাদনা</h3>
              <button onClick={() => setIsEditMode(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-2">
              {editedStudents.map((student: any) => (
                <div key={student.studentId} className="flex justify-between items-center p-2 border-b">
                  <span>{student.studentName}</span>
                  <button 
                    onClick={() => handleStatusToggle(student.studentId)}
                    className={clsx("px-3 py-1 rounded-full text-sm", student.status === AttendanceStatus.Present ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}
                  >
                    {student.status === AttendanceStatus.Present ? "উপস্থিত" : "অনুপস্থিত"}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={handleSave} className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;
