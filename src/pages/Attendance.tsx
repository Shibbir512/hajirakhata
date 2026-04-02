import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import { Search, Save, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown, Loader2, Users, MessageCircle, X } from "lucide-react";
import { toBengaliNumber, toEnglishNumber } from "../utils/dateFormatter";
import clsx from "clsx";
import toast from "react-hot-toast";
import ConfirmationDialog from "../components/ConfirmationDialog";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  gradient: string;
  valueColor?: string;
}

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  icon: Icon,
  color,
  gradient,
  valueColor = "text-slate-800",
}) => {
  return (
    <div className="card-premium p-4 sm:p-6 flex items-center justify-between group cursor-default">
      <div className="relative z-10 flex-1">
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <p className={clsx("text-xl sm:text-3xl font-bold", valueColor)}>{toBengaliNumber(value)}</p>
      </div>
      <div className={`relative z-10 p-2 sm:p-3.5 rounded-[14px] ${gradient} group-hover:scale-110 transition-transform duration-300 ml-2 sm:ml-4`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} strokeWidth={2} />
      </div>
    </div>
  );
});

const ITEMS_PER_PAGE = 10;

const Attendance: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { attendanceSessions, takeAttendance, isTakingAttendance } = useAttendance(
    orgId,
    user,
    classes,
    students,
    role,
    { skipFetch: true }
  );

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'roll' | 'name', direction: 'asc' | 'desc' }>({ key: 'roll', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [attendanceState, setAttendanceState] = useState<
    Map<string, { status: AttendanceStatus; studentName: string; note?: string }>
  >(new Map());

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return (students[selectedClassId] || []).filter(s => s.isActive !== false);
  }, [selectedClassId, students]);

  // Initialize attendance state with Default Present
  useEffect(() => {
    if (!selectedClassId) {
      setAttendanceState(new Map());
      return;
    }
    
    const newMap = new Map();
    classStudents.forEach((student) => {
      newMap.set(student.id, { status: AttendanceStatus.Present, studentName: student.name, note: '' });
    });
    setAttendanceState(newMap);
  }, [selectedClassId, classStudents]);

  const liveCounter = useMemo(() => {
    let present = 0;
    let absent = 0;
    attendanceState.forEach((val) => {
      if (val.status === AttendanceStatus.Present) present++;
      else if (val.status === AttendanceStatus.Absent) absent++;
    });
    return { total: attendanceState.size, present, absent };
  }, [attendanceState]);

  const filteredAndSortedStudents = useMemo(() => {
    let result = classStudents;
    let exactMatches: typeof classStudents = [];
    let fuzzyMatches: typeof classStudents = [];
    
    if (searchQuery) {
      const queryStr = searchQuery.trim();
      const englishQuery = toEnglishNumber(queryStr);
      
      exactMatches = classStudents.filter(s => 
        s.roll.toString() === englishQuery || 
        (s.studentUid && s.studentUid === englishQuery)
      );
      
      const exactMatchIds = new Set(exactMatches.map(s => s.id));
      
      fuzzyMatches = classStudents.filter(s => 
        !exactMatchIds.has(s.id) &&
        (s.name.toLowerCase().includes(queryStr.toLowerCase()) ||
         (s.roll?.toString() || "").includes(englishQuery))
      );
    } else {
      fuzzyMatches = classStudents;
    }

    const sortFn = (a: any, b: any) => {
      if (sortConfig.key === 'roll') {
        return sortConfig.direction === 'asc' ? a.roll - b.roll : b.roll - a.roll;
      } else {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
    };

    if (searchQuery && exactMatches.length > 0) {
      exactMatches.sort(sortFn);
      fuzzyMatches.sort(sortFn);
      result = [...exactMatches, ...fuzzyMatches];
    } else {
      fuzzyMatches.sort(sortFn);
      result = fuzzyMatches;
    }

    return result;
  }, [classStudents, searchQuery, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedStudents, currentPage]);

  // Reset page when search or class changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClassId]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const newMap = new Map<string, { status: AttendanceStatus; studentName: string; note?: string }>(prev);
      const current = newMap.get(studentId);
      if (current) {
        newMap.set(studentId, { ...current, status });
      }
      return newMap;
    });
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceState((prev) => {
      const newMap = new Map<string, { status: AttendanceStatus; studentName: string; note?: string }>(prev);
      const current = newMap.get(studentId);
      if (current) {
        newMap.set(studentId, { ...current, note });
      }
      return newMap;
    });
  };

  const handleSave = () => {
    if (!selectedClassId) return;
    if (attendanceState.size === 0) {
      toast.error("এই শ্রেণিতে কোনো শিক্ষার্থী নেই। হাজিরা সংরক্ষণ করা সম্ভব নয়।");
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  const confirmSave = async () => {
    setIsConfirmDialogOpen(false);
    await takeAttendance(selectedClassId, attendanceState);
  };

  const markAll = (status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const newMap = new Map(prev);
      newMap.forEach((value: { status: AttendanceStatus; studentName: string; note?: string }, key: string) => {
        newMap.set(key, { ...value, status });
      });
      return newMap;
    });
  };

  const handleSort = (key: 'roll' | 'name') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">হাজিরা</h2>
      </div>

      {/* Live Counter */}
      {selectedClassId && (
        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          <StatCard
            title="মোট শিক্ষার্থী"
            value={liveCounter.total}
            icon={Users}
            color="text-slate-600"
            gradient="bg-slate-50"
            valueColor="text-[#0F5C7A]"
          />
          <StatCard
            title="উপস্থিত"
            value={liveCounter.present}
            icon={CheckCircle}
            color="text-emerald-600"
            gradient="bg-emerald-50"
            valueColor="text-[#22C55E]"
          />
          <StatCard
            title="অনুপস্থিত"
            value={liveCounter.absent}
            icon={XCircle}
            color="text-rose-600"
            gradient="bg-rose-50"
            valueColor="text-[#EF4444]"
          />
        </div>
      )}

      <div className="card-premium p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
          <div className="relative w-full max-w-md">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full pl-12 pr-10 h-[50px] bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#0F5C7A]/20 focus:border-[#0F5C7A] transition-all appearance-none cursor-pointer font-bold text-slate-700 shadow-sm text-lg"
            >
              <option value="">শ্রেণি নির্বাচন করুন</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        {selectedClassId ? (
          <>
            <div className="flex flex-row gap-3 mb-4">
              <button
                onClick={() => markAll(AttendanceStatus.Present)}
                className="flex-1 h-[48px] px-2 sm:px-6 bg-[#22C55E] text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base"
              >
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                সবাই উপস্থিত
              </button>
              <button
                onClick={() => markAll(AttendanceStatus.Absent)}
                className="flex-1 h-[48px] px-2 sm:px-6 bg-white text-[#EF4444] border-2 border-[#EF4444] font-bold rounded-xl hover:bg-rose-50 transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base"
              >
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                সবাই অনুপস্থিত
              </button>
            </div>

            <div className="relative w-full mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="শিক্ষার্থীর নাম বা রোল দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-premium w-full text-base font-medium text-slate-700 bg-white pl-12 rounded-xl py-3 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
              />
            </div>

            <div className="overflow-x-auto bg-white rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] border border-[#E5E7EB]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10">
                  <tr>
                    <th 
                      className="py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB] cursor-pointer hover:bg-slate-100/50 transition-colors w-10 sm:w-16"
                      onClick={() => handleSort('roll')}
                    >
                      <div className="flex items-center gap-1 sm:gap-2">
                        রোল <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      className="py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB] cursor-pointer hover:bg-slate-100/50 transition-colors w-full"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1 sm:gap-2">
                        শিক্ষার্থীর নাম <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                      </div>
                    </th>
                    <th className="text-left py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB] whitespace-nowrap">
                      অবস্থা
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => {
                    const status = attendanceState.get(student.id)?.status;
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-[#E5E7EB] hover:bg-slate-50 transition-colors group"
                        style={{ height: '72px' }}
                      >
                        <td className="py-2 px-5 text-slate-800 font-bold text-[15px] w-10 sm:w-16">
                          {toBengaliNumber(student.roll)}
                        </td>
                        <td className="py-2 px-5 text-slate-800 font-medium text-sm sm:text-base w-full">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-medium">{student.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-5 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-row justify-start gap-2">
                              <button
                                onClick={() =>
                                  handleStatusChange(
                                    student.id,
                                    AttendanceStatus.Present,
                                  )
                                }
                                title="উপস্থিত"
                                className={clsx(
                                  "transition-all duration-300 flex items-center justify-center gap-1.5 font-medium text-[13px]",
                                  status === AttendanceStatus.Present
                                    ? "bg-[#22C55E] text-white shadow-md"
                                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50",
                                )}
                                style={{ borderRadius: '12px', padding: '10px 18px' }}
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">উপস্থিত</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusChange(
                                    student.id,
                                    AttendanceStatus.Absent,
                                  )
                                }
                                title="অনুপস্থিত"
                                className={clsx(
                                  "transition-all duration-300 flex items-center justify-center gap-1.5 font-medium text-[13px]",
                                  status === AttendanceStatus.Absent
                                    ? "bg-[#FEE2E2] text-[#EF4444] shadow-md"
                                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50",
                                )}
                                style={{ borderRadius: '12px', padding: '10px 18px' }}
                              >
                                <XCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">অনুপস্থিত</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="নোট (ঐচ্ছিক)"
                              value={attendanceState.get(student.id)?.note || ''}
                              onChange={(e) => handleNoteChange(student.id, e.target.value)}
                              className="text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F5C7A] focus:ring-1 focus:ring-[#0F5C7A] transition-all"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-12 text-slate-500"
                      >
                        কোন শিক্ষার্থী পাওয়া যায়নি।
                      </td>
                    </tr>
                  )
                  }
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-sm text-slate-500">
                  <span className="font-bold">{toBengaliNumber((currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> থেকে <span className="font-medium">{toBengaliNumber(Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedStudents.length))}</span> পর্যন্ত, মোট <span className="font-medium">{toBengaliNumber(filteredAndSortedStudents.length)}</span> জন শিক্ষার্থী
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    পৃষ্ঠা {toBengaliNumber(currentPage)} এর {toBengaliNumber(totalPages)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleSave}
                disabled={isTakingAttendance}
                className="btn-primary px-8 py-3 text-base w-full sm:w-auto"
                style={{ backgroundColor: '#0F5C7A' }}
              >
                {isTakingAttendance ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {isTakingAttendance ? 'সংরক্ষণ করা হচ্ছে...' : 'হাজিরা সংরক্ষণ করুন'}
              </button>

              {liveCounter.absent > 0 && (
                <button
                  onClick={() => setIsNotifyModalOpen(true)}
                  className="px-8 py-3 text-base font-bold text-white rounded-[16px] flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 w-full sm:w-auto"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  অনুপস্থিতদের জানান
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-slate-500 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-lg font-medium text-slate-600 mb-1">কোন শ্রেণি নির্বাচন করা হয়নি</p>
            <p className="text-sm">হাজিরা দেখার জন্য উপরের ড্রপডাউন থেকে একটি শ্রেণি নির্বাচন করুন।</p>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={confirmSave}
        title="হাজিরা সংরক্ষণ"
        message="আপনি কি নিশ্চিত যে আপনি এই হাজিরা সংরক্ষণ করতে চান?"
      />

      {/* Notify Absentees Modal */}
      {isNotifyModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 transition-all">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex-shrink-0 flex items-center justify-between px-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-white" />
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
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <p className="text-sm font-medium text-slate-600 mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                নিচের শিক্ষার্থীদের অভিভাবককে WhatsApp-এ মেসেজ পাঠাতে নামের পাশের বাটনে ক্লিক করুন।
              </p>
              <div className="space-y-4">
                {classStudents
                  .filter(student => attendanceState.get(student.id)?.status === AttendanceStatus.Absent)
                  .map(student => {
                    const phone = student.phone || '';
                    const message = `আসসালামু আলাইকুম, আপনার সন্তান ${student.name} আজ মাদরাসায় অনুপস্থিত। অনুগ্রহ করে কারণটি জানাবেন।`;
                    const formattedPhone = phone.startsWith('0') ? '88' + phone : phone;
                    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
                    
                    return (
                      <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 text-lg mb-1">{student.name}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-medium">রোল: {toBengaliNumber(student.roll)}</span>
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
                            "px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 w-full sm:w-auto",
                            phone 
                              ? "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white hover:shadow-lg hover:shadow-[#25D366]/20" 
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
                {classStudents.filter(student => attendanceState.get(student.id)?.status === AttendanceStatus.Absent).length === 0 && (
                  <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">আজ কেউ অনুপস্থিত নেই!</p>
                  </div>
                )}
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
    </div>
  );
};

export default Attendance;
