import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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

const ITEMS_PER_PAGE = 12;

const AttendanceHistory: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
      } else {
        toast.success("সকল অনুমোদিত ছুটির তথ্য ইতিমধ্যে হাজিরার সাথে সিঙ্ক রয়েছে।");
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
      
      
      <div className="card-premium p-6 flex flex-col sm:flex-row gap-6 items-center justify-center flex-wrap rounded-[20px] border border-[#E5E7EB] relative z-50">
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

        <div className="relative w-full max-w-xs z-50">
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

        <div className="flex items-end">
          <button
            onClick={handleSyncWithLeaves}
            disabled={isSyncingLeaves}
            className="flex items-center gap-2 px-5 h-[50px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[16px] hover:bg-emerald-100 transition-all text-sm font-semibold shadow-sm active:scale-95 disabled:opacity-50"
            title="অনুমোদিত ছুটির তথ্যের সাথে হাজিরা রেকর্ড সিঙ্ক করুন"
          >
            <RefreshCw className={clsx("w-4 h-4 text-emerald-600", isSyncingLeaves && "animate-spin")} />
            {isSyncingLeaves ? "সিঙ্ক হচ্ছে..." : "ছুটি সিঙ্ক"}
          </button>
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
              {toBengaliNumber(Math.round(classSessions.reduce((acc, s) => acc + ((s.students || []).filter((st: any) => st.status === AttendanceStatus.Present).length / (s.students?.length || 1)) * 100, 0) / (classSessions.length || 1)))}%
            </p>
          </div>
          <div className="card-premium p-4 bg-[#EF4444]/10 border-l-4 border-l-[#EF4444]">
            <p className="text-sm font-medium text-[#EF4444] mb-1">মোট অনুপস্থিতি (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-[#EF4444]">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + (s.students || []).filter((st: any) => st.status === AttendanceStatus.Absent).length, 0))} জন
            </p>
          </div>
          <div className="card-premium p-4 bg-[#22C55E]/10 border-l-4 border-l-[#22C55E]">
            <p className="text-sm font-medium text-[#22C55E] mb-1">মোট উপস্থিতি (সেশন ভিত্তিক)</p>
            <p className="text-2xl font-bold text-[#22C55E]">
              {toBengaliNumber(classSessions.reduce((acc, s) => acc + (s.students || []).filter((st: any) => st.status === AttendanceStatus.Present).length, 0))} জন
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedSessions.map(session => {
          const absentStudents = (session.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
          const className = classes.find(c => c.id === session.classId)?.name || "N/A";
          return (
            <div key={session.id} className="bg-white rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-[8px] border-l-[#4A9D9C] flex flex-col relative" onClick={() => handleView(session)}>
              {session._syncStatus === "pending" && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                  <Clock className="w-3 h-3" />
                  সিঙ্ক হচ্ছে...
                </div>
              )}
              
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-slate-800">{className}</h3>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(session)} className="bg-[#F1F5F9] text-[#4A9D9C] hover:bg-[#E2E8F0] p-2.5 rounded-full transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {(role === 'admin' || role === 'super_admin') && (
                    <button onClick={() => setSessionToDelete(session)} className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2] p-2.5 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotifySession(session);
                      setIsNotifyModalOpen(true);
                    }} 
                    className="bg-[#F1F5F9] text-slate-500 hover:bg-[#E2E8F0] p-2.5 rounded-full transition-colors"
                    title="অনুপস্থিতদের জানান"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Date & Time */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-slate-800 font-medium w-14">তারিখ:</span>
                  <div className="bg-[#F1F5F9] rounded-full px-4 py-1.5 flex items-center gap-2 flex-1">
                    <Calendar className="w-4 h-4 text-[#4A9D9C]" />
                    <span className="text-slate-800 font-medium text-[15px]">
                      {session.date ? `${getDayNameInBengali(session.date)}, ${toBengaliDate(session.date)}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-800 font-medium w-14">সময়:</span>
                  <div className="bg-[#F1F5F9] rounded-full px-4 py-1.5 flex items-center gap-2 flex-1">
                    <Clock className="w-4 h-4 text-[#4A9D9C]" />
                    <span className="text-slate-800 font-medium text-[15px]">
                      {session.time ? toBengaliTime(session.time) : ""}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Divider */}
              <div className="border-t border-slate-200 mb-4"></div>
              
              {/* Absent Section */}
              <div className="mt-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={clsx("w-3 h-3 rounded-full", absentStudents.length > 0 ? "bg-[#EF4444]" : "bg-[#22C55E]")}></span>
                    <h4 className="text-xl font-bold text-slate-800">
                      {absentStudents.length > 0 ? `অনুপস্থিত (${toBengaliNumber(absentStudents.length)} জন)` : "সবাই উপস্থিত"}
                    </h4>
                  </div>
                  <div className="bg-[#F1F5F9] text-slate-600 px-3 py-1 rounded-full text-sm font-medium">
                    মোট ছাত্র: {toBengaliNumber(session.students?.length || 0)}
                  </div>
                </div>

                {absentStudents.length > 0 ? (
                  <div className="bg-[#FEF2F2] rounded-2xl p-4">
                    <ul className="space-y-2.5">
                      {absentStudents.slice(0, 3).map((s: any, index: number) => {
                        const initials = s.studentName ? s.studentName.substring(0, 2) : "অজ্ঞাত";
                        const colors = [
                          "bg-[#DCFCE7] text-[#16A34A]", // Green
                          "bg-[#FCE7F3] text-[#DB2777]", // Pink
                          "bg-[#FFEDD5] text-[#EA580C]", // Orange
                          "bg-[#E0F2FE] text-[#0284C7]", // Blue
                        ];
                        const colorClass = colors[index % colors.length];
                        
                        return (
                          <li key={s.studentId} className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", colorClass)}>
                              {initials}
                            </div>
                            <span className="text-slate-800 font-medium text-lg">: {s.studentName}</span>
                          </li>
                        );
                      })}
                      {absentStudents.length > 3 && (
                        <li className="text-slate-500 font-medium mt-2 ml-6">
                          + আরও {toBengaliNumber(absentStudents.length - 3)} জন...
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-[#F0FDF4] rounded-2xl p-5 flex items-center justify-center">
                    <p className="text-lg font-medium text-[#16A34A]">চমৎকার! সবাই উপস্থিত আছে।</p>
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

      {viewingSession && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-start sm:items-center bg-black/35 backdrop-blur-[6px] p-4 overflow-y-auto">
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
                <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">হাজিরা নিয়েছেন</p>
                  <p className="text-sm font-bold text-[#0F5C7A]">{viewingSession.takenBy.name}</p>
                  <p className="text-[11px] text-slate-500">{viewingSession.takenBy.email}</p>
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0F5C7A] focus:border-[#0F5C7A] sm:text-sm transition-colors"
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
                      ? "bg-[#EF4444]/5 border-[#EF4444]/20 shadow-sm" 
                      : student.status === AttendanceStatus.Leave
                      ? "bg-orange-50 border-orange-200 shadow-sm"
                      : "bg-white border-slate-100"
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
                          student.status === AttendanceStatus.Absent ? "text-[#EF4444]" : student.status === AttendanceStatus.Leave ? "text-orange-600" : "text-slate-800"
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
                        : student.status === AttendanceStatus.Leave
                        ? "bg-orange-100 text-orange-700 border border-orange-200"
                        : "bg-[#FEE2E2] text-[#991B1B] border border-[#FEE2E2]"
                    )}>
                      {student.status === AttendanceStatus.Present ? "উপস্থিত" : student.status === AttendanceStatus.Leave ? "ছুটি" : "অনুপস্থিত"}
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
        </div>,
        document.body
      )}

      {isEditMode && selectedSession && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-start sm:items-center bg-black/35 backdrop-blur-[6px] p-4 overflow-y-auto">
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
                {(editedStudents || []).filter((student: any) => {
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
                      <button 
                        onClick={() => handleStatusToggle(student.studentId, AttendanceStatus.Leave)}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border",
                          student.status === AttendanceStatus.Leave 
                            ? "bg-orange-500 text-white border-orange-500/90" 
                            : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
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
            <div className="p-5 border-t border-[#E5E7EB] flex-shrink-0">
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 transition-all">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-200">
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
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-medium text-slate-600">
                  নিচের শিক্ষার্থীদের অভিভাবককে WhatsApp-এ মেসেজ পাঠান।
                </p>
                <button
                  onClick={() => {
                    const absentStudents = (notifySession.students || []).filter((s: any) => s.status === AttendanceStatus.Absent);
                    absentStudents.forEach((student: any) => {
                      const classStudents = students[notifySession.classId] || [];
                      const fullStudent = classStudents.find((s: any) => s.id === student.studentId);
                      const phone = fullStudent?.phone || student.phone || '';
                      if (phone) {
                        const message = `আসসালামু আলাইকুম, আপনার সন্তান ${student.studentName} আজ মাদরাসায় অনুপস্থিত। অনুগ্রহ করে কারণটি জানাবেন।`;
                        const formattedPhone = phone.startsWith('0') ? '88' + phone : phone;
                        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
                      }
                    });
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
                      <div key={student.studentId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-soft hover:shadow-md transition-all group">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 text-lg mb-1">{student.studentName}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-medium">রোল: {toBengaliNumber(getStudentRoll(notifySession.classId, student.studentId))}</span>
                            {phone ? (
                              <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg font-medium">মোবাইল: {toBengaliNumber(phone)}</span>
                            ) : (
                              <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg font-medium">মোবাইল নম্বর নেই</span>
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
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
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
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end flex-shrink-0">
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="px-8 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors w-full sm:w-auto"
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
