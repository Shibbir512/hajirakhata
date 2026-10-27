import React, { useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { Edit2, X, ChevronDown, Trash2, Calendar, Share2, Clock, Search, Users, MessageCircle, CheckCircle, Printer, RefreshCw } from "lucide-react";
import { toBengaliDate, toBengaliTime, toBengaliNumber, getDayNameInBengali } from "../utils/dateFormatter";
import clsx from "clsx";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { SyncManager } from "../services/SyncManager";
import AttendanceNavTabs from "../components/AttendanceNavTabs";
import { ClassSelect } from "../components/ClassSelect";

const ITEMS_PER_PAGE = 12;

const AttendanceHistory: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);

  const [searchParams] = useSearchParams();
  const urlClassId = searchParams.get("classId");
  const [selectedClassId, setSelectedClassId] = useState<string>(urlClassId || "");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (urlClassId && classes.some(c => c.id === urlClassId)) {
      setSelectedClassId(urlClassId);
    }
  }, [urlClassId, classes]);

  const { attendanceSessions, updateAttendanceSession, deleteAttendanceSession } = useAttendance(orgId, user, classes, students, role, {
    classId: selectedClassId || undefined,
    startDate: selectedDate || undefined,
    endDate: selectedDate || undefined,
  });
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [viewingSession, setViewingSession] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStudents, setEditedStudents] = useState<any[]>([]);
  const [sessionToDelete, setSessionToDelete] = useState<any | null>(null);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifySession, setNotifySession] = useState<any | null>(null);
  const [isConfirmSaveDialogOpen, setIsConfirmSaveDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [mainSearchQuery, setMainSearchQuery] = useState("");
  const [isSyncingLeaves, setIsSyncingLeaves] = useState(false);

  const handleSyncWithLeaves = async () => {
    if (!orgId) return;
    setIsSyncingLeaves(true);
    try {
      const result = await SyncManager.syncAllApprovedLeaves(orgId);
      if (result.updatedStudentsCount > 0) {
        toast.success(`${toBengaliNumber(result.updatedStudentsCount)} জন শিক্ষার্থীর অনুপস্থিতি সফলভাবে ছুটিতে রূপান্তরিত হয়েছে (${toBengaliNumber(result.updatedSessionsCount)} টি সেশন)!`);
      }
    } catch (err) {
      console.error("Error syncing leaves:", err);
      toast.error("ছুটি সিঙ্ক করতে সমস্যা হয়েছে।");
    } finally {
      setIsSyncingLeaves(false);
    }
  };

  const getStudentRoll = useCallback((classId: string, studentId: string) => {
    const classStudents = students[classId] || [];
    const student = classStudents.find(s => s.id === studentId);
    return student ? student.roll : "";
  }, [students]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassId, selectedDate, mainSearchQuery]);

  const classSessions = useMemo(() => {
    let filtered = [...attendanceSessions];
    
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
  }, [attendanceSessions, mainSearchQuery, students]);

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

  const handleSave = () => {
    if (!selectedSession) return;
    setIsConfirmSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    if (!selectedSession) return;
    setIsConfirmSaveDialogOpen(false);
    await updateAttendanceSession(selectedSession.id, editedStudents, selectedSession.version || 1);
    setIsEditMode(false);
    setSelectedSession(null);
    setSearchQuery("");
  };

  const handleShare = async (session: any) => {
    const className = classes.find(c => c.id === session.classId)?.name || "N/A";
    const formattedDate = toBengaliDate(session.date);
    const formattedTime = toBengaliTime(session.time);
    const presentCount = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Present).length;
    const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
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
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(text);
      toast.success('রিপোর্ট কপি করা হয়েছে!');
    }
  };

  const handlePrintAbsentees = useCallback((session: any) => {
    if (!session) return;
    const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent).map((s:any) => {
       const classStudents = students[session.classId] || [];
       const student = classStudents.find(st => st.id === s.studentId);
       return {
          roll: student ? student.roll : "",
          name: student ? student.name : s.studentName,
          phone: student ? student.phone : ""
       };
    }).sort((a: any, b: any) => parseFloat(a.roll) - parseFloat(b.roll));

    if (absentStudents.length === 0) {
      toast.error("এই সেশনে কেউ অনুপস্থিত নেই।");
      return;
    }

    const className = classes.find(c => c.id === session.classId)?.name || "";
    const dateFormatted = toBengaliDate(session.date);

    let printContents = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="text-align: center; color: #000; margin-bottom: 5px;">অনুপস্থিত শিক্ষার্থীদের তালিকা</h2>
        <p style="text-align: center; font-size: 14px; margin-top: 0; margin-bottom: 20px;">শ্রেণি: ${className} | তারিখ: ${dateFormatted}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">রোল</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">নাম</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">মোবাইল নম্বর</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">মন্তব্য</th>
            </tr>
          </thead>
          <tbody>
    `;

    absentStudents.forEach((student: any) => {
      printContents += `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${toBengaliNumber(student.roll)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${student.name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${toBengaliNumber(student.phone) || '-'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;"></td>
        </tr>
      `;
    });

    printContents += `
          </tbody>
        </table>
        <div style="margin-top: 60px; display: flex; justify-content: space-between;">
           <p style="border-top: 1px solid #000; padding-top: 5px;">স্বাক্ষর</p>
           <p style="border-top: 1px solid #000; padding-top: 5px;">তারিখ</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>অনুপস্থিত শিক্ষার্থীদের তালিকা</title></head><body onload="window.print();window.close()">');
      printWindow.document.write(printContents);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
    } else {
       toast.error("পপ-আপ ব্লক করা আছে। দয়া করে পপ-আপ আনব্লক করুন।");
    }
  }, [students, classes]);

  return (
    <div className="space-y-6">
      <AttendanceNavTabs />
      <div className="card-premium p-6 flex flex-col sm:flex-row gap-6 items-center justify-center flex-wrap rounded-[20px] border border-[#E5E7EB] relative z-50">
        <div className="relative w-full max-w-xs">
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 text-center">শ্রেণি নির্বাচন করুন</label>
          <ClassSelect
            value={selectedClassId}
            onChange={(id) => setSelectedClassId(id)}
            classes={classes}
            placeholder="শ্রেণি নির্বাচন করুন"
          />
        </div>

        <div className="relative w-full max-w-xs z-50">
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 text-center">তারিখ নির্বাচন করুন</label>
          <div className="relative flex items-center">
            <Calendar className="absolute left-4 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => setSelectedDate(date)}
              dateFormat="dd-MM-yyyy"
              placeholderText="তারিখ নির্বাচন করুন"
              className="input-premium w-full text-[16px] font-medium text-slate-700 dark:text-slate-100 border border-[#D1D5DB] dark:border-slate-700 bg-white dark:bg-[#111C2E] text-center rounded-[16px] h-[50px] px-10 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
              isClearable
            />
          </div>
        </div>

        <div className="relative w-full max-w-xs">
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 text-center">অনুপস্থিত শিক্ষার্থী খুঁজুন</label>
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="নাম বা রোল নম্বর..."
              value={mainSearchQuery}
              onChange={(e) => setMainSearchQuery(e.target.value)}
              className="input-premium w-full text-[16px] font-medium text-slate-700 dark:text-slate-100 border border-[#D1D5DB] dark:border-slate-700 bg-white dark:bg-[#111C2E] text-center rounded-[16px] h-[50px] px-10 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSyncWithLeaves}
            disabled={isSyncingLeaves}
            className="flex items-center gap-2 px-5 h-[50px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-[16px] hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all text-sm font-semibold shadow-sm active:scale-95 disabled:opacity-50"
            title="অনুমোদিত ছুটির তথ্যের সাথে হাজিরা রেকর্ড সিঙ্ক করুন"
          >
            <RefreshCw className={clsx("w-4 h-4 text-emerald-600 dark:text-emerald-400", isSyncingLeaves && "animate-spin")} />
            {isSyncingLeaves ? "সিঙ্ক হচ্ছে..." : "ছুটি সিঙ্ক"}
          </button>
        </div>
      </div>

      {selectedClassId && classSessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-premium p-4 bg-white dark:bg-[#111C2E] border-l-4 border-l-[#0F5C7A] border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">মোট সেশন</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{toBengaliNumber(classSessions.length)} টি</p>
          </div>
          <div className="card-premium p-4 bg-white dark:bg-[#111C2E] border-l-4 border-l-[#0F5C7A] border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">গড় উপস্থিতি</p>
            <p className="text-2xl font-bold text-[#0F5C7A] dark:text-[#2DD4BF]">
              {toBengaliNumber(Math.round(classSessions.reduce((acc, s) => acc + ((s.students || []).filter((st: any) => st.status === AttendanceStatus.Present).length / (s.students?.length || 1)) * 100, 0) / (classSessions.length || 1)))}%
            </p>
          </div>
          <div className="card-premium p-4 bg-[#EF4444]/10 dark:bg-rose-950/20 border-l-4 border-l-[#EF4444] border border-transparent dark:border-rose-900/30">
            <p className="text-sm font-medium text-[#EF4444] dark:text-rose-400 mb-1">মোট অনুপস্থিতি (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-[#EF4444] dark:text-rose-400">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + (s.students || []).filter((st: any) => st.status === AttendanceStatus.Absent).length, 0))} জন
            </p>
          </div>
          <div className="card-premium p-4 bg-[#22C55E]/10 dark:bg-emerald-950/20 border-l-4 border-l-[#22C55E] border border-transparent dark:border-emerald-900/30">
            <p className="text-sm font-medium text-[#22C55E] dark:text-emerald-400 mb-1">মোট উপস্থিতি (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-[#22C55E] dark:text-emerald-400">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + (s.students || []).filter((st: any) => st.status === AttendanceStatus.Present).length, 0))} জন
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedSessions.map((session, index) => {
          const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
          const className = classes.find(c => c.id === session.classId)?.name || "N/A";
          
          const currentDate = session.date || "";
          const prevDate = index > 0 ? paginatedSessions[index - 1].date || "" : "";
          const showDateHeader = currentDate !== prevDate;
          const displayDate = session.date ? `${getDayNameInBengali(session.date)}, ${toBengaliDate(session.date)}` : "অজানা তারিখ";

          return (
            <React.Fragment key={session.id}>
              {showDateHeader && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center py-2 mt-4 mb-2">
                  <div className="flex-grow h-[1px] bg-slate-200 dark:bg-slate-800"></div>
                  <div className="px-5 py-2 rounded-full bg-[#0F5C7A]/10 text-[#0F5C7A] dark:text-teal-300 font-bold text-[16px] flex items-center gap-2.5 border border-[#0F5C7A]/20 dark:border-teal-700/40 shadow-sm">
                    <Calendar className="w-5 h-5 text-[#0F5C7A] dark:text-teal-400" />
                    {displayDate}
                  </div>
                  <div className="flex-grow h-[1px] bg-slate-200 dark:bg-slate-800"></div>
                </div>
              )}
              <div className="bg-white dark:bg-[#111C2E] border border-slate-100 dark:border-slate-800 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-[8px] border-l-[#4A9D9C] flex flex-col relative" onClick={() => handleView(session)}>
                {session._syncStatus === "pending" && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse border border-amber-200 dark:border-amber-800">
                    <Clock className="w-3 h-3" />
                    সিঙ্ক হচ্ছে...
                  </div>
                )}
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{className}</h3>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEdit(session)} className="bg-[#F1F5F9] dark:bg-slate-800 text-[#4A9D9C] dark:text-[#2DD4BF] hover:bg-[#E2E8F0] dark:hover:bg-slate-700 p-2.5 rounded-full transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {(role === 'admin' || role === 'super_admin') && (
                      <button onClick={() => setSessionToDelete(session)} className="bg-[#FEF2F2] dark:bg-rose-950/40 text-[#EF4444] dark:text-rose-400 hover:bg-[#FEE2E2] dark:hover:bg-rose-900/50 p-2.5 rounded-full transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotifySession(session);
                        setIsNotifyModalOpen(true);
                      }} 
                      className="bg-[#F1F5F9] dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 p-2.5 rounded-full transition-colors"
                      title="অনুপস্থিতদের জানান"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Date & Time */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-800 dark:text-slate-300 font-medium w-14">তারিখ:</span>
                    <div className="bg-[#F1F5F9] dark:bg-slate-800/80 rounded-full px-4 py-1.5 flex items-center gap-2 flex-1 border border-transparent dark:border-slate-700/60">
                      <Calendar className="w-4 h-4 text-[#4A9D9C] dark:text-teal-400" />
                      <span className="text-slate-800 dark:text-slate-200 font-medium text-[15px]">
                        {session.date ? `${getDayNameInBengali(session.date)}, ${toBengaliDate(session.date)}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-800 dark:text-slate-300 font-medium w-14">সময়:</span>
                    <div className="bg-[#F1F5F9] dark:bg-slate-800/80 rounded-full px-4 py-1.5 flex items-center gap-2 flex-1 border border-transparent dark:border-slate-700/60">
                      <Clock className="w-4 h-4 text-[#4A9D9C] dark:text-teal-400" />
                      <span className="text-slate-800 dark:text-slate-200 font-medium text-[15px]">
                        {session.time ? toBengaliTime(session.time) : ""}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="border-t border-slate-200 dark:border-slate-800 mb-4"></div>
                
                {/* Absent Section */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={clsx("w-3 h-3 rounded-full", absentStudents.length > 0 ? "bg-[#EF4444]" : "bg-[#22C55E]")}></span>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {absentStudents.length > 0 ? `অনুপস্থিত (${toBengaliNumber(absentStudents.length)} জন)` : "সবাই উপস্থিত"}
                      </h4>
                    </div>
                    <div className="bg-[#F1F5F9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-medium border border-transparent dark:border-slate-700">
                      মোট ছাত্র: {toBengaliNumber(session.students?.length || 0)}
                    </div>
                  </div>

                  {absentStudents.length > 0 ? (
                    <div className="bg-[#FEF2F2] dark:bg-rose-950/25 border border-transparent dark:border-rose-900/30 rounded-2xl p-4">
                      <ul className="space-y-2.5">
                        {absentStudents.slice(0, 3).map((s: any, index: number) => {
                          const initials = s.studentName ? s.studentName.substring(0, 2) : "অজ্ঞাত";
                          const colors = [
                            "bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-300", // Green
                            "bg-[#FCE7F3] dark:bg-pink-950/60 text-[#DB2777] dark:text-pink-300", // Pink
                            "bg-[#FFEDD5] dark:bg-orange-950/60 text-[#EA580C] dark:text-orange-300", // Orange
                            "bg-[#E0F2FE] dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-300", // Blue
                          ];
                          const colorClass = colors[index % colors.length];
                          
                          return (
                            <li key={s.studentId} className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                              <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border border-transparent dark:border-white/10", colorClass)}>
                                {initials}
                              </div>
                              <span className="text-slate-800 dark:text-slate-200 font-medium text-lg">: {s.studentName}</span>
                            </li>
                          );
                        })}
                        {absentStudents.length > 3 && (
                          <li className="text-slate-500 dark:text-slate-400 font-medium mt-2 ml-6">
                            + আরও {toBengaliNumber(absentStudents.length - 3)} জন...
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-[#F0FDF4] dark:bg-emerald-950/25 border border-transparent dark:border-emerald-900/30 rounded-2xl p-5 flex items-center justify-center">
                      <p className="text-lg font-medium text-[#16A34A] dark:text-emerald-400">চমৎকার! সবাই উপস্থিত আছে।</p>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {classSessions.length === 0 && selectedClassId && (
          <div className="col-span-full text-center py-16 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            এই শ্রেণির জন্য কোন হাজিরা রেকর্ড পাওয়া যায়নি।
          </div>
        )}
        {!selectedClassId && (
          <div className="col-span-full text-center py-16 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            হাজিরা ইতিহাস দেখতে একটি শ্রেণি নির্বাচন করুন।
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            দেখানো হচ্ছে <span className="font-medium text-slate-800 dark:text-slate-200">{toBengaliNumber((currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> থেকে <span className="font-medium text-slate-800 dark:text-slate-200">{toBengaliNumber(Math.min(currentPage * ITEMS_PER_PAGE, classSessions.length))}</span> পর্যন্ত, মোট <span className="font-medium text-slate-800 dark:text-slate-200">{toBengaliNumber(classSessions.length)}</span> টি রেকর্ড
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-[11.25px] text-sm font-bold text-white bg-[#0F5C7A] hover:bg-[#0C6C8A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              পরবর্তী
            </button>
          </div>
        </div>
      )}

      {viewingSession && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-start sm:items-center bg-black/50 backdrop-blur-[6px] p-4 overflow-y-auto">
          <div className="w-[92%] max-w-[400px] bg-white dark:bg-[#111C2E] border border-slate-100 dark:border-slate-800 rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden my-auto">
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
                  onClick={() => handlePrintAbsentees(viewingSession)}
                  className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  title="অনুপস্থিতদের তালিকা প্রিন্ট করুন"
                >
                  <Printer className="w-5 h-5 text-white" />
                </button>
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
            <div className="p-5 flex flex-col overflow-hidden max-h-[65vh]">
              {/* Attendance Taker Info */}
              {viewingSession.takenBy && (
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">হাজিরা নিয়েছেন</p>
                  <p className="text-sm font-bold text-[#0F5C7A] dark:text-teal-400">{viewingSession.takenBy.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{viewingSession.takenBy.email}</p>
                </div>
              )}

              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="শিক্ষার্থীর নাম বা রোল নম্বর দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-[#0F5C7A] focus:border-[#0F5C7A] sm:text-sm transition-colors"
                />
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {(viewingSession.students || []).filter((student: any) => {
                  const rollValue = getStudentRoll(viewingSession.classId, student.studentId);
                  const roll = rollValue !== undefined && rollValue !== null ? rollValue.toString() : "";
                  const searchLower = searchQuery.toLowerCase();
                  const name = student.studentName || "";
                  const matchesSearch = name.toLowerCase().includes(searchLower) || roll.includes(searchLower);
                  return matchesSearch && (student.status === AttendanceStatus.Absent || student.status === AttendanceStatus.Leave);
                }).map((student: any) => (
                  <div key={student.studentId} className={clsx(
                    "flex justify-between items-center p-4 border rounded-[16px] transition-all duration-300",
                    student.status === AttendanceStatus.Absent 
                      ? "bg-[#EF4444]/5 dark:bg-rose-950/20 border-[#EF4444]/20 dark:border-rose-900/30 shadow-sm" 
                      : student.status === AttendanceStatus.Leave
                      ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30 shadow-sm"
                      : "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
                  )}>
                    <div className="flex items-center gap-3">
                      {student.status === AttendanceStatus.Absent && (
                        <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></span>
                      )}
                      {student.status === AttendanceStatus.Leave && (
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      )}
                      <div className="flex flex-col">
                        <span className={clsx(
                          "font-bold text-[15px]",
                          student.status === AttendanceStatus.Absent ? "text-[#EF4444] dark:text-rose-400" : student.status === AttendanceStatus.Leave ? "text-orange-600 dark:text-orange-400" : "text-slate-800 dark:text-slate-100"
                        )}>
                          {student.studentName}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                          রোল: {toBengaliNumber(getStudentRoll(viewingSession.classId, student.studentId))}
                        </span>
                      </div>
                    </div>
                    <span className={clsx(
                      "px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm",
                      student.status === AttendanceStatus.Present 
                        ? "bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#166534] dark:text-emerald-300 border border-[#DCFCE7] dark:border-emerald-800/40" 
                        : student.status === AttendanceStatus.Leave
                        ? "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40"
                        : "bg-[#FEE2E2] dark:bg-rose-950/60 text-[#991B1B] dark:text-rose-300 border border-[#FEE2E2] dark:border-rose-800/40"
                    )}>
                      {student.status === AttendanceStatus.Present ? "উপস্থিত" : student.status === AttendanceStatus.Leave ? "ছুটি" : "অনুপস্থিত"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#E5E7EB] dark:border-slate-800 flex-shrink-0">
              <button
                onClick={() => { setViewingSession(null); setSearchQuery(""); }}
                className="w-full bg-[#0F5C7A] text-white h-[48px] rounded-[14px] font-bold hover:bg-[#0D4D66] transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isEditMode && selectedSession && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-start sm:items-center bg-black/50 backdrop-blur-[6px] p-4 overflow-y-auto">
          <div className="w-[92%] max-w-[400px] bg-white dark:bg-[#111C2E] border border-slate-100 dark:border-slate-800 rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden my-auto">
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-[#0F5C7A] focus:border-[#0F5C7A] sm:text-sm transition-colors"
                />
              </div>

              <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {(editedStudents || []).filter((student: any) => {
                  const rollValue = getStudentRoll(selectedSession.classId, student.studentId);
                  const roll = rollValue !== undefined && rollValue !== null ? rollValue.toString() : "";
                  const searchLower = searchQuery.toLowerCase();
                  const name = student.studentName || "";
                  return name.toLowerCase().includes(searchLower) || roll.includes(searchLower);
                }).map((student: any) => (
                  <div key={student.studentId} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-700 rounded-[16px] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-[15px] text-slate-800 dark:text-slate-100">
                        {student.studentName}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
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
                            : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
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
                            : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}
                      >
                        অনুপস্থিত
                      </button>
                      <button 
                        onClick={() => handleStatusToggle(student.studentId, AttendanceStatus.Leave)}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border",
                          student.status === AttendanceStatus.Leave 
                            ? "bg-orange-500 text-white border-orange-500/90" 
                            : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}
                      >
                        ছুটি
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[#E5E7EB] dark:border-slate-800 flex-shrink-0">
              <button
                onClick={handleSave}
                className="w-full bg-[#0F5C7A] text-white h-[48px] rounded-[14px] font-bold hover:bg-[#0D4D66] transition-colors"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>,
        document.body
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
      {isNotifyModalOpen && notifySession && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 transition-all">
          <div className="bg-white dark:bg-[#111C2E] border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[80px] flex-shrink-0 flex items-center justify-between px-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-[48px] h-[48px] rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">অনুপস্থিতদের জানান</h3>
                  <p className="text-xs text-white/80">WhatsApp মেসেজ</p>
                </div>
              </div>
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-900/40">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  নিচের শিক্ষার্থীদের অভিভাবককে WhatsApp-এ মেসেজ পাঠান।
                </p>
                <button
                  onClick={async () => {
                    const absentStudents = (notifySession.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
                    const studentsWithPhone = absentStudents.filter((student: any) => {
                      const classStudents = students[notifySession.classId] || [];
                      const fullStudent = classStudents.find((s: any) => s.id === student.studentId);
                      const phone = fullStudent?.phone || student.phone || '';
                      return !!phone;
                    });

                    if (studentsWithPhone.length === 0) {
                      toast.error("কোনো শিক্ষার্থীর মোবাইল নম্বর পাওয়া যায়নি।");
                      return;
                    }

                    toast.success(`${toBengaliNumber(studentsWithPhone.length)} জনকে WhatsApp মেসেজ পাঠানো হচ্ছে...`);

                    // Open windows one by one with delay to avoid popup blocking
                    for (let i = 0; i < studentsWithPhone.length; i++) {
                      const student = studentsWithPhone[i];
                      const classStudents = students[notifySession.classId] || [];
                      const fullStudent = classStudents.find((s: any) => s.id === student.studentId);
                      const phone = fullStudent?.phone || student.phone || '';
                      const message = `আসসালামু আলাইকুম, আপনার সন্তান ${student.studentName} আজ মাদরাসায় অনুপস্থিত। অনুগ্রহ করে কারণটি জানাবেন।`;
                      const formattedPhone = phone.startsWith('0') ? '88' + phone : phone;
                      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
                      // Wait between opens to avoid popup blocker
                      if (i < studentsWithPhone.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                      }
                    }
                  }}
                  className="bg-[#0F5C7A] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#0C6C8A] transition-colors shadow-soft"
                >
                  সবাইকে পাঠান
                </button>
              </div>
              <div className="space-y-4">
                {(notifySession.students || [])
                  .filter((student: any) => student.status === AttendanceStatus.Absent)
                  .map((student: any) => {
                    const classStudents = students[notifySession.classId] || [];
                    const fullStudent = classStudents.find((s: any) => s.id === student.studentId);
                    const phone = fullStudent?.phone || student.phone || '';
                    const message = `আসসালামু আলাইকুম, আপনার সন্তান ${student.studentName} আজ মাদরাসায় অনুপস্থিত। অনুগ্রহ করে কারণটি জানাবেন।`;
                    const formattedPhone = phone.startsWith('0') ? '88' + phone : phone;
                    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
                    
                    return (
                      <div key={student.studentId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-[#111C2E] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-soft hover:shadow-md transition-all group">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">{student.studentName}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-medium text-slate-700 dark:text-slate-300">রোল: {toBengaliNumber(getStudentRoll(notifySession.classId, student.studentId))}</span>
                            {phone ? (
                              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg font-medium">মোবাইল: {toBengaliNumber(phone)}</span>
                            ) : (
                              <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-lg font-medium">মোবাইল নম্বর নেই</span>
                            )}
                          </div>
                        </div>
                        <a
                          href={phone ? whatsappUrl : '#'}
                          target={phone ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className={clsx(
                            "h-[48px] px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 w-full sm:w-auto",
                            phone 
                              ? "bg-[#25D366] text-white hover:bg-[#20b858] shadow-soft" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                          )}
                          onClick={(e) => {
                            if (!phone) {
                              e.preventDefault();
                              toast.error('এই শিক্ষার্থীর মোবাইল নম্বর দেওয়া নেই।');
                            }
                          }}
                        >
                          <MessageCircle className="w-5 h-5" />
                          মেসেজ
                        </a>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111C2E] flex justify-end flex-shrink-0">
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="px-8 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full sm:w-auto"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <ConfirmationDialog
        isOpen={isConfirmSaveDialogOpen}
        onClose={() => setIsConfirmSaveDialogOpen(false)}
        onConfirm={confirmSave}
        title="হাজিরা আপডেট"
        message="আপনি কি নিশ্চিত যে আপনি এই হাজিরার পরিবর্তনগুলো সংরক্ষণ করতে চান?"
      />
    </div>
  );
};

export default AttendanceHistory;
