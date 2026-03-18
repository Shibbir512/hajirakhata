import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { Edit2, X, ChevronDown, Trash2, Calendar, Share2, Clock, Search } from "lucide-react";
import { toBengaliDate, toBengaliTime, toBengaliNumber } from "../utils/dateFormatter";
import clsx from "clsx";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ITEMS_PER_PAGE = 12;

const AttendanceHistory: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { attendanceSessions, updateAttendanceSession, deleteAttendanceSession } = useAttendance(orgId, user, classes, students, role);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [viewingSession, setViewingSession] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStudents, setEditedStudents] = useState<any[]>([]);
  const [sessionToDelete, setSessionToDelete] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [mainSearchQuery, setMainSearchQuery] = useState("");

  const getStudentRoll = useCallback((classId: string, studentId: string) => {
    const classStudents = students[classId] || [];
    const student = classStudents.find(s => s.id === studentId);
    return student ? student.roll : "";
  }, [students]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassId, selectedDate, mainSearchQuery]);

  const classSessions = useMemo(() => {
    let filtered = attendanceSessions.filter(s => s.classId === selectedClassId && !s.deleted);
    if (selectedDate) {
      const dateStr = selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' ');
      filtered = filtered.filter(s => s.date === dateStr);
    }
    
    if (mainSearchQuery) {
      const searchLower = mainSearchQuery.toLowerCase();
      filtered = filtered.filter(session => {
        return session.students.some((student: any) => {
          const rollValue = getStudentRoll(session.classId, student.studentId);
          const roll = rollValue !== undefined && rollValue !== null ? rollValue.toString() : "";
          const name = student.studentName || "";
          const matchesSearch = name.toLowerCase().includes(searchLower) || roll.includes(searchLower);
          return matchesSearch && student.status === AttendanceStatus.Absent;
        });
      });
    }
    
    return filtered;
  }, [attendanceSessions, selectedClassId, selectedDate, mainSearchQuery, students]);

  const totalPages = Math.ceil(classSessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return classSessions.slice(start, start + ITEMS_PER_PAGE);
  }, [classSessions, currentPage]);

  const handleEdit = (session: any) => {
    setSelectedSession(session);
    setEditedStudents(session.students);
    setIsEditMode(true);
    setSearchQuery("");
  };

  const handleView = (session: any) => {
    setViewingSession(session);
    setSearchQuery("");
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
    await updateAttendanceSession(selectedSession.id, editedStudents, selectedSession.version || 1);
    setIsEditMode(false);
    setSelectedSession(null);
    setSearchQuery("");
  };

  const handleShare = async (session: any) => {
    const className = classes.find(c => c.id === session.classId)?.name || "N/A";
    const formattedDate = toBengaliDate(session.date);
    const formattedTime = toBengaliTime(session.time);
    const presentCount = session.students.filter((s: any) => s.status === AttendanceStatus.Present).length;
    const absentStudents = session.students.filter((s: any) => s.status === AttendanceStatus.Absent);
    const absentCount = absentStudents.length;

    let text = `হাজিরা রিপোর্ট\nশ্রেণি: ${className}\nসময়: ${formattedTime} তারিখঃ ${formattedDate}\nউপস্থিত: ${toBengaliNumber(presentCount)} জন\nঅনুপস্থিত: ${toBengaliNumber(absentCount)} জন`;
    
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
      toast.success('রিপোর্ট কপি করা হয়েছে!');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">হাজিরা ইতিহাস</h2>
      
      <div className="card-premium p-6 flex flex-col sm:flex-row gap-6 items-center justify-center flex-wrap rounded-[20px] border border-[#E5E7EB]">
        <div className="relative w-full max-w-xs">
          <label className="block text-sm font-medium text-slate-500 mb-2 text-center">শ্রেণি নির্বাচন করুন</label>
          <div className="relative">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input-premium w-full text-[16px] font-medium text-slate-700 border border-[#D1D5DB] bg-white text-center appearance-none px-4 rounded-[16px] h-[50px] shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
            >
              <option value="" className="text-slate-500 font-normal">শ্রেণি নির্বাচন করুন</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        <div className="relative w-full max-w-xs">
          <label className="block text-sm font-medium text-slate-500 mb-2 text-center">তারিখ নির্বাচন করুন</label>
          <div className="relative flex items-center">
            <Calendar className="absolute left-4 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => setSelectedDate(date)}
              dateFormat="dd-MM-yyyy"
              placeholderText="তারিখ নির্বাচন করুন"
              className="input-premium w-full text-[16px] font-medium text-slate-700 border border-[#D1D5DB] bg-white text-center rounded-[16px] h-[50px] px-10 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
              isClearable
            />
          </div>
        </div>

        <div className="relative w-full max-w-xs">
          <label className="block text-sm font-medium text-slate-500 mb-2 text-center">অনুপস্থিত শিক্ষার্থী খুঁজুন</label>
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="নাম বা রোল নম্বর..."
              value={mainSearchQuery}
              onChange={(e) => setMainSearchQuery(e.target.value)}
              className="input-premium w-full text-[16px] font-medium text-slate-700 border border-[#D1D5DB] bg-white text-center rounded-[16px] h-[50px] px-10 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {selectedClassId && classSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-premium p-4 bg-white border-l-4 border-l-[#0F5C7A]">
            <p className="text-sm font-medium text-slate-500 mb-1">মোট সেশন</p>
            <p className="text-2xl font-bold text-slate-800">{toBengaliNumber(classSessions.length)} টি</p>
          </div>
          <div className="card-premium p-4 bg-white border-l-4 border-l-[#0F5C7A]">
            <p className="text-sm font-medium text-slate-500 mb-1">গড় উপস্থিতি</p>
            <p className="text-2xl font-bold text-[#0F5C7A]">
              {toBengaliNumber(Math.round(classSessions.reduce((acc, s) => acc + (s.students.filter((st: any) => st.status === AttendanceStatus.Present).length / s.students.length) * 100, 0) / classSessions.length))}%
            </p>
          </div>
          <div className="card-premium p-4 bg-[#EF4444]/10 border-l-4 border-l-[#EF4444]">
            <p className="text-sm font-medium text-[#EF4444] mb-1">মোট অনুপস্থিতি (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-[#EF4444]">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + s.students.filter((st: any) => st.status === AttendanceStatus.Absent).length, 0))} জন
            </p>
          </div>
          <div className="card-premium p-4 bg-[#22C55E]/10 border-l-4 border-l-[#22C55E]">
            <p className="text-sm font-medium text-[#22C55E] mb-1">মোট উপস্থিতি (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-[#22C55E]">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + s.students.filter((st: any) => st.status === AttendanceStatus.Present).length, 0))} জন
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedSessions.map(session => {
          const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
          const className = classes.find(c => c.id === session.classId)?.name || "N/A";
          return (
            <div key={session.id} className="card-premium p-6 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-l-4 border-l-[#0F5C7A] bg-white shadow-sm hover:shadow-md border border-slate-100 flex flex-col relative" onClick={() => handleView(session)}>
              {session._syncStatus === "pending" && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                  <Clock className="w-3 h-3" />
                  সিঙ্ক হচ্ছে...
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-slate-600 space-y-2 flex-1">
                  <p className="text-lg font-bold text-[#0F5C7A] mb-1">{className}</p>
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">তারিখঃ</span> <span className="font-mono font-bold text-base bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{session.date ? toBengaliDate(session.date) : ""}</span></p>
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">সময়ঃ</span> <span className="font-mono font-bold text-base bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{session.time ? toBengaliTime(session.time) : ""}</span></p>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(session)} className="text-slate-400 hover:text-[#0F5C7A] p-2 hover:bg-[#0F5C7A]/10 rounded-xl transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSessionToDelete(session)} className="text-slate-400 hover:text-[#EF4444] p-2 hover:bg-[#EF4444]/10 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className={clsx("w-2.5 h-2.5 rounded-full", absentStudents.length > 0 ? "bg-[#EF4444] animate-pulse" : "bg-[#22C55E]")}></span>
                    {absentStudents.length > 0 ? `অনুপস্থিত (${toBengaliNumber(absentStudents.length)} জন)` : "সবাই উপস্থিত"}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#22C55E]/10 px-2 py-1 rounded-lg" title="উপস্থিত">
                      <span className="text-[10px] font-bold text-[#22C55E]">উপস্থিত:</span>
                      <span className="text-xs font-bold text-[#22C55E]">
                        {toBengaliNumber(session.students.filter((s: any) => s.status === AttendanceStatus.Present).length)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#EF4444]/10 px-2 py-1 rounded-lg" title="অনুপস্থিত">
                      <span className="text-[10px] font-bold text-[#EF4444]">অনুপস্থিত:</span>
                      <span className="text-xs font-bold text-[#EF4444]">
                        {toBengaliNumber(absentStudents.length)}
                      </span>
                    </div>
                  </div>
                </div>

                {absentStudents.length > 0 ? (
                  <div className="bg-[#EF4444]/5 rounded-xl p-3 border border-[#EF4444]/10">
                    <ul className="space-y-1.5">
                      {absentStudents.slice(0, 3).map((s: any) => (
                        <li key={s.studentId} className="text-xs font-medium text-[#EF4444] flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-[#EF4444]/80"></span>
                          {s.studentName}
                        </li>
                      ))}
                      {absentStudents.length > 3 && (
                        <li className="text-[10px] text-[#EF4444] italic pl-3">
                          আরও {toBengaliNumber(absentStudents.length - 3)} জন...
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-[#22C55E]/5 rounded-xl p-3 border border-[#22C55E]/10 flex items-center justify-center">
                    <p className="text-xs font-medium text-[#22C55E]">চমৎকার! সবাই উপস্থিত আছে।</p>
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
            দেখানো হচ্ছে <span className="font-medium">{toBengaliNumber((currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> থেকে <span className="font-medium">{toBengaliNumber(Math.min(currentPage * ITEMS_PER_PAGE, classSessions.length))}</span> পর্যন্ত, মোট <span className="font-medium">{toBengaliNumber(classSessions.length)}</span> টি রেকর্ড
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 rounded-[11.25px] text-sm font-bold text-white bg-[#0F5C7A] hover:bg-[#0C6C8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                          ? "bg-[#0F5C7A] text-white shadow-md"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {toBengaliNumber(page)}
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
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      )}

      {viewingSession && (
        <div className="fixed inset-0 z-[70] flex justify-center items-start sm:items-center bg-black/35 backdrop-blur-[6px] p-4 overflow-y-auto">
          <div className="w-[92%] max-w-[400px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden my-auto">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex-shrink-0 flex items-center justify-between px-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">হাজিরা বিস্তারিত</h3>
                  <p className="text-xs text-white/80">সেশনের তথ্য</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShare(viewingSession)}
                  className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  title="শেয়ার করুন"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => { setViewingSession(null); setSearchQuery(""); }}
                  className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col overflow-hidden max-h-[60vh]">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="শিক্ষার্থীর নাম বা রোল নম্বর দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F5C7A] focus:border-[#0F5C7A] sm:text-sm transition-colors"
                />
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {viewingSession.students.filter((student: any) => {
                  const rollValue = getStudentRoll(viewingSession.classId, student.studentId);
                  const roll = rollValue !== undefined && rollValue !== null ? rollValue.toString() : "";
                  const searchLower = searchQuery.toLowerCase();
                  const name = student.studentName || "";
                  return name.toLowerCase().includes(searchLower) || roll.includes(searchLower);
                }).sort((a: any, b: any) => {
                  if (a.status === b.status) return 0;
                  return a.status === AttendanceStatus.Absent ? -1 : 1;
                }).map((student: any) => (
                  <div key={student.studentId} className={clsx(
                    "flex justify-between items-center p-4 border rounded-[16px] transition-all duration-300",
                    student.status === AttendanceStatus.Absent 
                      ? "bg-[#EF4444]/5 border-[#EF4444]/20 shadow-sm" 
                      : "bg-white border-slate-100"
                  )}>
                    <div className="flex items-center gap-3">
                      {student.status === AttendanceStatus.Absent && (
                        <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></span>
                      )}
                      <div className="flex flex-col">
                        <span className={clsx(
                          "font-bold text-[15px]",
                          student.status === AttendanceStatus.Absent ? "text-[#EF4444]" : "text-slate-800"
                        )}>
                          {student.studentName}
                        </span>
                        <span className="text-slate-500 text-xs font-medium">
                          রোল: {toBengaliNumber(getStudentRoll(viewingSession.classId, student.studentId))}
                        </span>
                      </div>
                    </div>
                    <span className={clsx(
                      "px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm",
                      student.status === AttendanceStatus.Present 
                        ? "bg-[#DCFCE7] text-[#166534] border border-[#DCFCE7]" 
                        : "bg-[#FEE2E2] text-[#991B1B] border border-[#FEE2E2]"
                    )}>
                      {student.status === AttendanceStatus.Present ? "উপস্থিত" : "অনুপস্থিত"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#E5E7EB] flex-shrink-0">
              <button
                onClick={() => { setViewingSession(null); setSearchQuery(""); }}
                className="w-full bg-[#0F5C7A] text-white h-[48px] rounded-[14px] font-bold hover:bg-[#0D4D66] transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditMode && selectedSession && (
        <div className="fixed inset-0 z-[70] flex justify-center items-start sm:items-center bg-black/35 backdrop-blur-[6px] p-4 overflow-y-auto">
          <div className="w-[92%] max-w-[400px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden my-auto">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex-shrink-0 flex items-center justify-between px-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
                  <Edit2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">হাজিরা সম্পাদনা</h3>
                  <p className="text-xs text-white/80">সংশোধন করুন</p>
                </div>
              </div>
              <button
                onClick={() => { setIsEditMode(false); setSearchQuery(""); }}
                className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col overflow-hidden max-h-[60vh]">
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="শিক্ষার্থীর নাম বা রোল নম্বর দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F5C7A] focus:border-[#0F5C7A] sm:text-sm transition-colors"
                />
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {editedStudents.filter((student: any) => {
                  const rollValue = getStudentRoll(selectedSession.classId, student.studentId);
                  const roll = rollValue !== undefined && rollValue !== null ? rollValue.toString() : "";
                  const searchLower = searchQuery.toLowerCase();
                  const name = student.studentName || "";
                  return name.toLowerCase().includes(searchLower) || roll.includes(searchLower);
                }).map((student: any) => (
                  <div key={student.studentId} className="flex justify-between items-center p-4 border border-slate-100 rounded-[16px] hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] text-slate-800">
                        {student.studentName}
                      </span>
                      <span className="text-slate-500 text-xs font-medium">
                        রোল: {toBengaliNumber(getStudentRoll(selectedSession.classId, student.studentId))}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleStatusToggle(student.studentId, AttendanceStatus.Present)}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border",
                          student.status === AttendanceStatus.Present 
                            ? "bg-[#22C55E] text-white border-[#22C55E]/90" 
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
                            ? "bg-[#EF4444] text-white border-[#EF4444]/90" 
                            : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                        )}
                      >
                        অনুপস্থিত
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#E5E7EB] flex-shrink-0">
              <button
                onClick={handleSave}
                className="w-full bg-[#0F5C7A] text-white h-[48px] rounded-[14px] font-bold hover:bg-[#0D4D66] transition-colors"
              >
                সংরক্ষণ করুন
              </button>
            </div>
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
