import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import { Edit2, X, ChevronDown, Trash2, Calendar } from "lucide-react";
import clsx from "clsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const AttendanceHistory: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { attendanceSessions, updateAttendanceSession, deleteAttendanceSession } = useAttendance(orgId, user, classes, {}, role);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [viewingSession, setViewingSession] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStudents, setEditedStudents] = useState<any[]>([]);

  const classSessions = useMemo(() => {
    let filtered = attendanceSessions.filter(s => s.classId === selectedClassId && !s.deleted);
    if (selectedDate) {
      const dateStr = selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' ');
      filtered = filtered.filter(s => s.date === dateStr);
    }
    return filtered;
  }, [attendanceSessions, selectedClassId, selectedDate]);

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
      <h2 className="text-3xl font-bold gradient-text tracking-tight">হাজিরা ইতিহাস</h2>
      
      <div className="card-premium p-6 flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-xs">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="input-premium w-full search-highlight text-lg font-bold text-teal-700 border-teal-200 bg-teal-50/30 text-center appearance-none pr-10"
          >
            <option value="" className="text-slate-500 font-normal">শ্রেণি নির্বাচন করুন</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-teal-600 w-5 h-5 pointer-events-none" />
        </div>

        <div className="relative max-w-xs">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-500 w-4 h-4" />
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => setSelectedDate(date)}
            dateFormat="dd MM yyyy"
            placeholderText="তারিখ নির্বাচন করুন"
            className="input-premium pl-10 w-full"
            isClearable
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classSessions.map(session => {
          const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
          return (
            <div key={session.id} className="card-premium p-6 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-l-4 border-l-teal-500 bg-white shadow-sm hover:shadow-md border border-slate-100" onClick={() => setViewingSession(session)}>
              <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-slate-600 space-y-2">
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">তারিখঃ</span> <span className="font-mono font-bold text-base bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{session.date ? toBengaliDate(session.date) : ""}</span></p>
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">সময়ঃ</span> <span className="font-mono font-bold text-base bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{session.time ? toBengaliTime(session.time) : ""}</span></p>
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">হাজিরা নিয়েছেনঃ</span> <span className="text-indigo-700 font-semibold">{session.takenBy?.name || "N/A"}</span></p>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(session)} className="text-indigo-600 hover:text-indigo-800 p-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteAttendanceSession(session.id)} className="text-rose-600 hover:text-rose-800 p-2 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4 mt-2">
                <p className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className={clsx("w-2 h-2 rounded-full", absentStudents.length > 0 ? "bg-rose-500" : "bg-emerald-500")}></span>
                  {absentStudents.length > 0 ? `অনুপস্থিত ছাত্র (${toBengaliNumber(absentStudents.length)} জন):` : "সবাই উপস্থিত"}
                </p>
                {absentStudents.length > 0 && (
                  <ul className="space-y-2">
                    {absentStudents.slice(0, 3).map((s: any) => (
                      <li key={s.studentId} className="text-sm text-slate-700 bg-rose-50/80 border border-rose-100 px-3 py-1.5 rounded-md flex items-center gap-2">
                        {s.studentName}
                      </li>
                    ))}
                    {absentStudents.length > 3 && (
                      <li className="text-xs text-slate-500 italic pl-2">আরও {toBengaliNumber(absentStudents.length - 3)} জন...</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {viewingSession && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 p-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">হাজিরা বিস্তারিত</h3>
              <button onClick={() => setViewingSession(null)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {viewingSession.students.map((student: any) => (
                <div key={student.studentId} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                  <span className="font-medium text-slate-800 flex items-center gap-3">
                    {student.studentName}
                  </span>
                  <span className={clsx(
                    "px-4 py-2 rounded-xl text-sm font-bold",
                    student.status === AttendanceStatus.Present 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-rose-100 text-rose-800"
                  )}>
                    {student.status === AttendanceStatus.Present ? "উপস্থিত" : "অনুপস্থিত"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isEditMode && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 p-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">হাজিরা সম্পাদনা</h3>
              <button onClick={() => setIsEditMode(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {editedStudents.map((student: any) => (
                <div key={student.studentId} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                  <span className="font-medium text-slate-800 flex items-center gap-3">
                    {student.studentName}
                  </span>
                  <button 
                    onClick={() => handleStatusToggle(student.studentId)}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 border-2",
                      student.status === AttendanceStatus.Present 
                        ? "bg-emerald-100 text-emerald-800 border-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.15)]" 
                        : "bg-rose-100 text-rose-800 border-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                    )}
                  >
                    {student.status === AttendanceStatus.Present ? "উপস্থিত" : "অনুপস্থিত"}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={handleSave} className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 w-full mt-8 py-3 rounded-xl font-medium">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;
