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
    await updateAttendanceSession(selectedSession.id, editedStudents);
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
      
      <div className="card-premium p-6 flex flex-col sm:flex-row gap-6 items-center justify-center flex-wrap rounded-none border-inset">
        <div className="relative w-full max-w-xs">
          <label className="block text-sm font-medium text-slate-500 mb-2 text-center">শ্রেণি নির্বাচন করুন</label>
          <div className="relative">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input-premium w-full text-base font-medium text-slate-700 border border-slate-200 bg-white text-center appearance-none px-4 rounded-xl py-3 shadow-sm hover:border-[#0a5682]/30 focus:border-[#0a5682] focus:ring-2 focus:ring-[#0a5682]/20 transition-all"
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
              dateFormat="dd MM yyyy"
              placeholderText="তারিখ নির্বাচন করুন"
              className="input-premium w-full text-base font-medium text-slate-700 border border-slate-200 bg-white text-center rounded-xl py-3 px-10 shadow-sm hover:border-[#0a5682]/30 focus:border-[#0a5682] focus:ring-2 focus:ring-[#0a5682]/20 transition-all"
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
              className="input-premium w-full text-base font-medium text-slate-700 border border-slate-200 bg-white text-center rounded-xl py-3 px-10 shadow-sm hover:border-[#0a5682]/30 focus:border-[#0a5682] focus:ring-2 focus:ring-[#0a5682]/20 transition-all placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {selectedClassId && classSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-premium p-4 bg-white border-l-4 border-l-[#0a5682]">
            <p className="text-sm font-medium text-slate-500 mb-1">মোট সেশন</p>
            <p className="text-2xl font-bold text-slate-800">{toBengaliNumber(classSessions.length)} টি</p>
          </div>
          <div className="card-premium p-4 bg-white border-l-4 border-l-[#0a5682]">
            <p className="text-sm font-medium text-slate-500 mb-1">গড় উপস্থিতি</p>
            <p className="text-2xl font-bold text-[#0a5682]">
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
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedSessions.map(session => {
          const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
          const className = classes.find(c => c.id === session.classId)?.name || "N/A";
          return (
            <div key={session.id} className="card-premium p-6 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-l-4 border-l-[#0a5682] bg-white shadow-sm hover:shadow-md border border-slate-100 flex flex-col" onClick={() => handleView(session)}>
              <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-slate-600 space-y-2 flex-1">
                  <p className="text-lg font-bold text-[#0a5682] mb-1">{className}</p>
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">তারিখঃ</span> <span className="font-mono font-bold text-base bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{session.date ? toBengaliDate(session.date) : ""}</span></p>
                  <p className="flex items-center gap-2"><span className="font-semibold text-slate-900">সময়ঃ</span> <span className="font-mono font-bold text-base bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{session.time ? toBengaliTime(session.time) : ""}</span></p>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(session)} className="text-slate-400 hover:text-[#0a5682] p-2 hover:bg-[#0a5682]/10 rounded-xl transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSessionToDelete(session)} className="text-slate-400 hover:text-pink-600 p-2 hover:bg-pink-50 rounded-xl transition-colors">
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
            দেখানো হচ্ছে <span className="font-medium">{toBengaliNumber((currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> থেকে <span className="font-medium">{toBengaliNumber(Math.min(currentPage * ITEMS_PER_PAGE, classSessions.length))}</span> পর্যন্ত, মোট <span className="font-medium">{toBengaliNumber(classSessions.length)}</span> টি রেকর্ড
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 rounded-[11.25px] text-sm font-bold text-white bg-[#0e70a7] hover:bg-[#0e70a7]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20 p-4 sm:p-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">হাজিরা বিস্তারিত</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handleShare(viewingSession)} className="text-[#0a5682] hover:text-[#0a5682]/80 transition-colors bg-[#0a5682]/10 hover:bg-[#0a5682]/20 p-2 rounded-full"><Share2 className="w-5 h-5" /></button>
                <button onClick={() => { setViewingSession(null); setSearchQuery(""); }} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="mb-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="শিক্ষার্থীর নাম বা রোল নম্বর দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
            </div>
            <div className="space-y-3">
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
                    <span className="text-slate-500 font-mono text-sm mr-2">{toBengaliNumber(getStudentRoll(viewingSession.classId, student.studentId))}</span>
                    {student.studentName}
                  </span>
                  <span className={clsx(
                    "px-4 py-2 rounded-xl text-sm font-bold shadow-sm text-[#0a5682]",
                    student.status === AttendanceStatus.Present 
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                      : "bg-rose-600 text-white border border-rose-700"
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20 p-4 sm:p-8">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">হাজিরা সম্পাদনা</h3>
              <button onClick={() => { setIsEditMode(false); setSearchQuery(""); }} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="শিক্ষার্থীর নাম বা রোল নম্বর দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
            </div>
            <div className="space-y-3">
              {editedStudents.filter((student: any) => {
                const rollValue = getStudentRoll(selectedSession.classId, student.studentId);
                const roll = rollValue !== undefined && rollValue !== null ? rollValue.toString() : "";
                const searchLower = searchQuery.toLowerCase();
                const name = student.studentName || "";
                return name.toLowerCase().includes(searchLower) || roll.includes(searchLower);
              }).map((student: any) => (
                <div key={student.studentId} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                  <span className="font-medium text-slate-800 flex items-center gap-3">
                    <span className="text-slate-500 font-mono text-sm mr-2">{toBengaliNumber(getStudentRoll(selectedSession.classId, student.studentId))}</span>
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
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSave} className="btn-primary w-full mt-8 py-3 text-base">সংরক্ষণ করুন</button>
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
