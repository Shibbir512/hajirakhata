import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { Edit2, X, ChevronDown, Trash2, Calendar, Share2, Clock } from "lucide-react";
import clsx from "clsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ITEMS_PER_PAGE = 12;

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
  const [sessionToDelete, setSessionToDelete] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassId, selectedDate]);

  const classSessions = useMemo(() => {
    let filtered = attendanceSessions.filter(s => s.classId === selectedClassId && !s.deleted);
    if (selectedDate) {
      const dateStr = selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' ');
      filtered = filtered.filter(s => s.date === dateStr);
    }
    return filtered;
  }, [attendanceSessions, selectedClassId, selectedDate]);

  const totalPages = Math.ceil(classSessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return classSessions.slice(start, start + ITEMS_PER_PAGE);
  }, [classSessions, currentPage]);

  const handleEdit = (session: any) => {
    setSelectedSession(session);
    setEditedStudents(session.students);
    setIsEditMode(true);
  };

  const handleStatusToggle = (studentId: string, status: AttendanceStatus) => {
    setEditedStudents(prev => prev.map(s => 
      s.studentId === studentId 
        ? { ...s, status }
        : s
    ));
  };

  const handleSave = async () => {
    if (!selectedSession) return;
    await updateAttendanceSession(selectedSession.id, editedStudents);
    setIsEditMode(false);
    setSelectedSession(null);
  };

  const handleShare = async (session: any) => {
    const className = classes.find(c => c.id === session.classId)?.name || "N/A";
    const formattedDate = toBengaliDate(session.date);
    const formattedTime = toBengaliTime(session.time);
    const presentCount = session.students.filter((s: any) => s.status === AttendanceStatus.Present).length;
    const absentStudents = session.students.filter((s: any) => s.status === AttendanceStatus.Absent);
    const absentCount = absentStudents.length;
    const lateCount = session.students.filter((s: any) => s.status === AttendanceStatus.Late).length;

    let text = `হাজিরা রিপোর্ট\nশ্রেণি: ${className}\nসময়: ${formattedTime} তারিখঃ ${formattedDate}\nউপস্থিত: ${toBengaliNumber(presentCount)} জন\nঅনুপস্থিত: ${toBengaliNumber(absentCount)} জন\nবিলম্বিত: ${toBengaliNumber(lateCount)} জন`;
    
    if (absentCount > 0) {
      const absentNames = absentStudents.map((s: any, index: number) => `${toBengaliNumber(index + 1)}. ${s.studentName}`).join("\n");
      text += `\n\nঅনুপস্থিতদের তালিকা:\n${absentNames}`;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'হাজিরা রিপোর্ট',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(text);
      alert('রিপোর্ট কপি করা হয়েছে!');
    }
  };

  const toBengaliNumber = (num: string | number) => {
    const bengaliNumbers = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return num.toString().split("").map(char => bengaliNumbers[parseInt(char)] || char).join("");
  };

  const toBengaliDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return "";
    const separator = dateStr.includes("-") ? "-" : " ";
    return dateStr.split(separator).map(toBengaliNumber).join("-");
  };

  const toBengaliTime = (timeStr: string) => {
    if (!timeStr || typeof timeStr !== 'string') return "";
    
    // Convert all digits to Bengali digits
    let result = timeStr.replace(/\d/g, (match) => toBengaliNumber(match));
    
    // Handle our custom format "hh mm ss-AM/PM" (from useAttendance.ts)
    if (timeStr.includes("-")) {
      const [timePart, ampm] = result.split("-");
      const formattedTime = timePart.trim().replace(/\s+/g, ":");
      return `${formattedTime} ${ampm || ""}`;
    }
    
    // Handle standard format "hh:mm:ss AM/PM" or others
    return result;
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

      {selectedClassId && classSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-premium p-4 bg-white border-l-4 border-l-indigo-500">
            <p className="text-sm font-medium text-slate-500 mb-1">মোট সেশন</p>
            <p className="text-2xl font-bold text-slate-800">{toBengaliNumber(classSessions.length)} টি</p>
          </div>
          <div className="card-premium p-4 bg-white border-l-4 border-l-teal-500">
            <p className="text-sm font-medium text-slate-500 mb-1">গড় উপস্থিতি</p>
            <p className="text-2xl font-bold text-teal-600">
              {toBengaliNumber(Math.round(classSessions.reduce((acc, s) => acc + (s.students.filter((st: any) => st.status === AttendanceStatus.Present).length / s.students.length) * 100, 0) / classSessions.length))}%
            </p>
          </div>
          <div className="card-premium p-4 bg-rose-50 border-l-4 border-l-rose-500">
            <p className="text-sm font-medium text-rose-600 mb-1">মোট অনুপস্থিতি (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-rose-700">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + s.students.filter((st: any) => st.status === AttendanceStatus.Absent).length, 0))} জন
            </p>
          </div>
          <div className="card-premium p-4 bg-emerald-50 border-l-4 border-l-emerald-500">
            <p className="text-sm font-medium text-emerald-600 mb-1">মোট উপস্থিতি (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-emerald-700">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + s.students.filter((st: any) => st.status === AttendanceStatus.Present).length, 0))} জন
            </p>
          </div>
          <div className="card-premium p-4 bg-amber-50 border-l-4 border-l-amber-500">
            <p className="text-sm font-medium text-amber-600 mb-1">মোট বিলম্বিত (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-amber-700">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + s.students.filter((st: any) => st.status === AttendanceStatus.Late).length, 0))} জন
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedSessions.map(session => {
          const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
          const className = classes.find(c => c.id === session.classId)?.name || "N/A";
          return (
            <div key={session.id} className="card-premium p-6 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-l-4 border-l-teal-500 bg-white shadow-sm hover:shadow-md border border-slate-100 flex flex-col" onClick={() => setViewingSession(session)}>
              <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-slate-600 space-y-2 flex-1">
                  <p className="text-lg font-bold text-teal-700 mb-1">{className}</p>
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">তারিখঃ</span> <span className="font-mono font-bold text-base bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{session.date ? toBengaliDate(session.date) : ""}</span></p>
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">সময়ঃ</span> <span className="font-mono font-bold text-base bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{session.time ? toBengaliTime(session.time) : ""}</span></p>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(session)} className="text-indigo-600 hover:text-indigo-800 p-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSessionToDelete(session)} className="text-rose-600 hover:text-rose-800 p-2 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className={clsx("w-2.5 h-2.5 rounded-full", absentStudents.length > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500")}></span>
                    {absentStudents.length > 0 ? `অনুপস্থিত (${toBengaliNumber(absentStudents.length)} জন)` : "সবাই উপস্থিত"}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700" title="উপস্থিত">
                      {toBengaliNumber(session.students.filter((s: any) => s.status === AttendanceStatus.Present).length)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700" title="অনুপস্থিত">
                      {toBengaliNumber(session.students.filter((s: any) => s.status === AttendanceStatus.Absent).length)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700" title="বিলম্বিত">
                      {toBengaliNumber(session.students.filter((s: any) => s.status === AttendanceStatus.Late).length)}
                    </span>
                  </div>
                </div>

                {absentStudents.length > 0 ? (
                  <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/50">
                    <ul className="space-y-1.5">
                      {absentStudents.slice(0, 3).map((s: any) => (
                        <li key={s.studentId} className="text-xs font-medium text-rose-700 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-rose-400"></span>
                          {s.studentName}
                        </li>
                      ))}
                      {absentStudents.length > 3 && (
                        <li className="text-[10px] text-rose-500 italic pl-3">
                          আরও {toBengaliNumber(absentStudents.length - 3)} জন...
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50 flex items-center justify-center">
                    <p className="text-xs font-medium text-emerald-700">চমৎকার! সবাই উপস্থিত আছে।</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {classSessions.length === 0 && selectedClassId && (
          <div className="col-span-full text-center py-16 text-slate-500 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            এই শ্রেণির জন্য কোন হাজিরা রেকর্ড পাওয়া যায়নি।
          </div>
        )}
        {!selectedClassId && (
          <div className="col-span-full text-center py-16 text-slate-500 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            হাজিরা ইতিহাস দেখতে একটি শ্রেণি নির্বাচন করুন।
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
          <div className="text-sm text-slate-500">
            দেখানো হচ্ছে <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> থেকে <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, classSessions.length)}</span> পর্যন্ত, মোট <span className="font-medium">{classSessions.length}</span> টি রেকর্ড
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              পূর্ববর্তী
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={clsx(
                        "w-10 h-10 rounded-xl text-sm font-bold transition-all duration-300",
                        currentPage === page
                          ? "bg-[#045F5F] text-white shadow-md"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {page}
                    </button>
                  );
                }
                if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <span key={page} className="px-2 text-slate-400">...</span>;
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      )}

      {viewingSession && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 p-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">হাজিরা বিস্তারিত</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handleShare(viewingSession)} className="text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 p-2 rounded-full"><Share2 className="w-5 h-5" /></button>
                <button onClick={() => setViewingSession(null)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="space-y-3">
              {viewingSession.students.sort((a: any, b: any) => {
                if (a.status === b.status) return 0;
                return a.status === AttendanceStatus.Absent ? -1 : 1;
              }).map((student: any) => (
                <div key={student.studentId} className={clsx(
                  "flex justify-between items-center p-4 border rounded-2xl transition-all duration-300",
                  student.status === AttendanceStatus.Absent 
                    ? "bg-rose-50 border-rose-200 shadow-sm" 
                    : "bg-white border-slate-100"
                )}>
                  <span className={clsx(
                    "font-medium flex items-center gap-3",
                    student.status === AttendanceStatus.Absent ? "text-rose-700" : "text-slate-800"
                  )}>
                    {student.status === AttendanceStatus.Absent && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                    {student.studentName}
                  </span>
                  <span className={clsx(
                    "px-4 py-2 rounded-xl text-sm font-bold shadow-sm",
                    student.status === AttendanceStatus.Present 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : student.status === AttendanceStatus.Absent
                      ? "bg-rose-600 text-white border border-rose-700"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  )}>
                    {student.status === AttendanceStatus.Present ? "উপস্থিত" : student.status === AttendanceStatus.Absent ? "অনুপস্থিত" : "বিলম্বিত"}
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
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleStatusToggle(student.studentId, AttendanceStatus.Present)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border",
                        student.status === AttendanceStatus.Present 
                          ? "bg-emerald-500 text-white border-emerald-600" 
                          : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      উপস্থিত
                    </button>
                    <button 
                      onClick={() => handleStatusToggle(student.studentId, AttendanceStatus.Absent)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border",
                        student.status === AttendanceStatus.Absent 
                          ? "bg-rose-500 text-white border-rose-600" 
                          : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      অনুপস্থিত
                    </button>
                    <button 
                      onClick={() => handleStatusToggle(student.studentId, AttendanceStatus.Late)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border",
                        student.status === AttendanceStatus.Late 
                          ? "bg-amber-500 text-white border-amber-600" 
                          : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      বিলম্বিত
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-300 w-full mt-8 py-3 rounded-xl font-bold text-base">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}
      {sessionToDelete && (
        <ConfirmationDialog
          isOpen={!!sessionToDelete}
          onClose={() => setSessionToDelete(null)}
          onConfirm={() => {
            deleteAttendanceSession(sessionToDelete.id);
            setSessionToDelete(null);
          }}
          title="হাজিরা সেশন মুছে ফেলুন"
          message="আপনি কি নিশ্চিত যে এই হাজিরা সেশনটি মুছে ফেলতে চান? এই কাজটি অপরিবর্তনীয়।"
        />
      )}
    </div>
  );
};

export default AttendanceHistory;
