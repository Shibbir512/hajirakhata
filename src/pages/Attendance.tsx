import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { useLeaves } from "../hooks/useLeaves";
import { AttendanceStatus } from "../types";
import { useStruckOffStudents } from "../hooks/useStruckOffStudents";
import { Search, Save, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown, Loader2, Users, MessageCircle, X, AlertTriangle, Check } from "lucide-react";
import { toBengaliNumber, toEnglishNumber } from "../utils/dateFormatter";
import clsx from "clsx";
import toast from "react-hot-toast";
import ConfirmationDialog from "../components/ConfirmationDialog";
import ImageModal from "../components/ImageModal";

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

  const { leaves } = useLeaves(orgId, user);

  const { struckOffStudents, loading: struckOffLoading, markAsActionTaken } = useStruckOffStudents(orgId, students);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'roll' | 'name', direction: 'asc' | 'desc' }>({ key: 'roll', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingImage, setViewingImage] = useState<{ url: string; name: string } | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [attendanceState, setAttendanceState] = useState<
    Map<string, { status: AttendanceStatus; studentName: string; note?: string }>
  >(new Map());

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return (students[selectedClassId] || []).filter(s => s.isActive !== false);
  }, [selectedClassId, students]);

  // Initialize attendance state with Default Present or Leave
  useEffect(() => {
    if (!selectedClassId) {
      setAttendanceState(new Map());
      return;
    }
    
    const newMap = new Map();
    const now = new Date();
    
    classStudents.forEach((student) => {
      // Check if student is on leave right now
      let isOnLeave = false;
      let leaveNote = '';
      
      for (const leave of leaves) {
        if (leave.studentId === student.id) {
          const start = new Date(`${leave.startDate || leave.date}T${leave.startTime || '00:00'}:00`);
          const end = new Date(`${leave.endDate || leave.date}T${leave.endTime || '23:59'}:59`);
          
          if (now >= start && now <= end) {
            isOnLeave = true;
            leaveNote = leave.note || 'ছুটি';
            break;
          }
        }
      }
      
      if (isOnLeave) {
        newMap.set(student.id, { status: AttendanceStatus.Leave, studentName: student.name, note: leaveNote });
      } else {
        newMap.set(student.id, { status: AttendanceStatus.Present, studentName: student.name, note: '' });
      }
    });
    setAttendanceState(newMap);
  }, [selectedClassId, classStudents, leaves]);

  const liveCounter = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    attendanceState.forEach((val) => {
      if (val.status === AttendanceStatus.Present) present++;
      else if (val.status === AttendanceStatus.Absent) absent++;
      else if (val.status === AttendanceStatus.Leave) leave++;
    });
    return { total: attendanceState.size, present, absent, leave };
  }, [attendanceState]);

  const filteredAndSortedStudents = useMemo(() => {
    let result = classStudents;
    let exactMatches: typeof classStudents = [];
    let fuzzyMatches: typeof classStudents = [];
    
    if (searchQuery) {
      const queryStr = searchQuery.trim();
      const englishQuery = toEnglishNumber(queryStr);
      
      exactMatches = classStudents.filter(s => {
        const rollStr = s.roll.toString();
        const uidStr = (s.studentUid || "").toLowerCase();
        const idStr = s.id.toLowerCase();
        
        return rollStr === englishQuery || 
               uidStr === englishQuery || 
               idStr === englishQuery ||
               (uidStr.length >= 3 && uidStr.endsWith(englishQuery)) ||
               (idStr.length >= 3 && idStr.endsWith(englishQuery));
      });
      
      const exactMatchIds = new Set(exactMatches.map(s => s.id));
      
      fuzzyMatches = classStudents.filter(s => {
        if (exactMatchIds.has(s.id)) return false;
        
        const nameMatch = s.name.toLowerCase().includes(queryStr.toLowerCase());
        const rollMatch = s.roll.toString().includes(englishQuery);
        const uidMatch = (s.studentUid || "").toLowerCase().includes(englishQuery);
        
        return nameMatch || rollMatch || uidMatch;
      });
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
    return filteredAndSortedStudents.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [filteredAndSortedStudents, currentPage]);

  // Reset page when search or class changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClassId]);

  // Infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentPage < totalPages) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, currentPage, totalPages]);

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

  const sendWhatsAppToAbsentees = () => {
    const absentees = classStudents.filter(s => attendanceState.get(s.id)?.status === AttendanceStatus.Absent);
    
    if (absentees.length === 0) {
      toast.error("কোনো অনুপস্থিত শিক্ষার্থী পাওয়া যায়নি।");
      return;
    }

    const absenteesWithPhone = absentees.filter(s => s.phone && s.phone.trim().length > 0);
    const absenteesWithoutPhone = absentees.filter(s => !s.phone || s.phone.trim().length === 0);

    if (absenteesWithoutPhone.length > 0) {
      const names = absenteesWithoutPhone.map(s => `${s.name} (রোল: ${s.roll})`).join(", ");
      toast.error(`এই অনুপস্থিত শিক্ষার্থীদের ফোন নাম্বার নেই: ${names}`);
    }

    if (absenteesWithPhone.length === 0) {
      return;
    }

    const todayDate = new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    absenteesWithPhone.forEach((student, index) => {
      const message = `আসসালামু আলাইকুম, আপনার সন্তান ${student.name} আজ (${todayDate}) মাদরাসায় অনুপস্থিত। অনুগ্রহ করে কারণটি জানাবেন।`;
      let phone = student.phone!.replace(/\D/g, ''); // Remove non-digits
      if (phone.startsWith('0')) {
          phone = '88' + phone;
      }
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      
      // Open with delay to avoid browser blocking
      setTimeout(() => {
        window.open(url, '_blank');
      }, index * 500);
    });
  };

  const confirmSave = async () => {
    setIsConfirmDialogOpen(false);
    await takeAttendance(selectedClassId, attendanceState);
    
    // Check if there are any absentees - if so, auto-open the notification modal
    const absentCount = classStudents.filter(s => attendanceState.get(s.id)?.status === AttendanceStatus.Absent).length;
    if (absentCount > 0) {
      setTimeout(() => {
        setIsNotifyModalOpen(true);
      }, 500);
    }
  };

  const markAll = (status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const newMap = new Map(prev);
      newMap.forEach((value: { status: AttendanceStatus; studentName: string; note?: string }, key: string) => {
        if (value.status !== AttendanceStatus.Leave) {
          newMap.set(key, { ...value, status });
        }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          
          <p className="text-slate-500 mt-1 text-sm sm:text-base">শিক্ষার্থীদের দৈনিক উপস্থিতি রেকর্ড করুন</p>
        </div>
        
        {/* Class Selection Input Top Level */}
        <div className="w-full sm:w-72">
          <div className="relative w-full">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full pl-12 pr-10 h-[52px] bg-white border border-[#0fa2b0] rounded-2xl focus:ring-2 focus:ring-[#0F5C7A]/20 focus:border-[#0F5C7A] transition-all appearance-none cursor-pointer font-bold text-[#089191] shadow-soft text-[16px]"
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
      </div>

      {/* Live Counter */}
      {selectedClassId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-6">
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
          <StatCard
            title="ছুটি"
            value={liveCounter.leave}
            icon={Clock}
            color="text-orange-600"
            gradient="bg-orange-50"
            valueColor="text-orange-500"
          />
        </div>
      )}

      {selectedClassId ? (
        <div className="card-premium p-6 sm:p-8 border border-[#f7f7f7]">
            {/* Bulk Action - Segmented Control */}
            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 h-[52px] mb-4 shadow-soft">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => markAll(AttendanceStatus.Present)}
                className={clsx(
                  "flex-1 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  attendanceState.size > 0 && Array.from(attendanceState.values()).every(s => s.status === AttendanceStatus.Present)
                    ? "bg-[#22C55E] text-white shadow-md shadow-[#22C55E]/20"
                    : "text-[#22C55E] hover:bg-emerald-50"
                )}
              >
                <CheckCircle className="w-4 h-4" />
                সবাই উপস্থিত
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => markAll(AttendanceStatus.Absent)}
                className={clsx(
                  "flex-1 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  attendanceState.size > 0 && Array.from(attendanceState.values()).every(s => s.status === AttendanceStatus.Absent)
                    ? "bg-[#EF4444] text-white shadow-md shadow-[#EF4444]/20"
                    : "text-[#EF4444] hover:bg-rose-50"
                )}
              >
                <XCircle className="w-4 h-4" />
                সবাই অনুপস্থিত
              </motion.button>
            </div>

            {/* Search */}
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
                className="w-full h-[52px] text-base font-medium text-slate-700 bg-white pl-12 rounded-2xl shadow-soft border border-slate-100 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
              />
            </div>

            <div className="space-y-3">
              {paginatedStudents.map((student) => {
                const statusData = attendanceState.get(student.id);
                const status = statusData?.status;
                const isPresent = status === AttendanceStatus.Present;
                const isAbsent = status === AttendanceStatus.Absent;
                const isLeave = status === AttendanceStatus.Leave;

                return (
                  <div key={student.id} className={clsx("bg-white p-3 rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] mb-3", isLeave && "opacity-80 border border-orange-200")}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        {student.photoUrl ? (
                          <img 
                            src={student.photoUrl} 
                            alt={student.name} 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 cursor-pointer hover:scale-110 transition-transform" 
                            referrerPolicy="no-referrer"
                            onClick={() => setViewingImage({ url: student.photoUrl!, name: student.name })}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#0F5C7A]/10 flex items-center justify-center text-[#0F5C7A] font-bold text-sm">
                            {student.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-[16px]">{toBengaliNumber(student.roll)}. {student.name}</span>
                          {isLeave && statusData?.note && (
                            <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full w-fit mt-1">
                              কারণ: {statusData.note}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {isLeave ? (
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg font-bold text-sm flex items-center gap-1.5"
                          >
                            <Clock className="w-4 h-4" />
                            ছুটি
                          </motion.div>
                        ) : (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              animate={isPresent ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                              transition={{ duration: 0.3 }}
                              onClick={() => handleStatusChange(student.id, AttendanceStatus.Present)}
                              className={clsx(
                                "w-9 h-9 rounded-full flex items-center justify-center transition-colors outline-none",
                                isPresent ? "bg-[#22C55E] text-white shadow-md shadow-[#22C55E]/30" : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500"
                              )}
                            >
                              <CheckCircle className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              animate={isAbsent ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                              transition={{ duration: 0.3 }}
                              onClick={() => handleStatusChange(student.id, AttendanceStatus.Absent)}
                              className={clsx(
                                "w-9 h-9 rounded-full flex items-center justify-center transition-colors border outline-none",
                                isAbsent ? "bg-[#EF4444] text-white border-[#EF4444] shadow-md shadow-[#EF4444]/30" : "bg-white text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
                              )}
                            >
                              <XCircle className="w-5 h-5" />
                            </motion.button>
                          </>
                        )}
                      </div>
                    </div>
                    {!isLeave && (
                      <input
                        type="text"
                        placeholder="+ নোট যোগ করুন"
                        value={statusData?.note || ''}
                        onChange={(e) => handleNoteChange(student.id, e.target.value)}
                        className="w-full text-sm text-slate-500 bg-slate-50 p-2 rounded-lg outline-none"
                      />
                    )}
                  </div>
                );
              })}
              {paginatedStudents.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  কোন শিক্ষার্থী পাওয়া যায়নি।
                </div>
              )}
            </div>

            {/* Infinite Scroll Target */}
            {currentPage < totalPages && (
              <div ref={observerTarget} className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#0F5C7A]" />
              </div>
            )}
            
            {totalPages > 1 && currentPage === totalPages && (
              <div className="text-center py-4 text-sm text-slate-500">
                সব শিক্ষার্থী দেখানো হয়েছে (মোট {toBengaliNumber(filteredAndSortedStudents.length)} জন)
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
              <button
                onClick={handleSave}
                disabled={isTakingAttendance}
                className="w-full h-[52px] bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                {isTakingAttendance ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isTakingAttendance ? 'সংরক্ষণ করা হচ্ছে...' : 'হাজিরা সংরক্ষণ করুন'}
              </button>

              {liveCounter.absent > 0 && (
                <button
                  onClick={() => setIsNotifyModalOpen(true)}
                  className="w-full h-[52px] bg-[#F1F5F9] text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200"
                >
                  <MessageCircle className="w-5 h-5" />
                  অনুপস্থিতদের জানান
                </button>
              )}
            </div>
        </div>
        ) : (
          <div className="text-center py-24 text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-[#0F5C7A]/50" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">কোনো শ্রেণি নির্বাচন করা হয়নি</h3>
            <p className="text-base text-slate-500 max-w-sm mx-auto">হাজিরা দেখতে বা রেকর্ড করতে পৃষ্ঠার উপরের ডানদিক থেকে প্রথমে একটি শ্রেণি নির্বাচন করুন।</p>
          </div>
        )}

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
                  onClick={sendWhatsAppToAbsentees}
                  className="bg-[#0F5C7A] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#0C6C8A] transition-colors shadow-soft"
                >
                  সবাইকে পাঠান
                </button>
              </div>
              <div className="space-y-4">
                {classStudents
                  .filter(student => attendanceState.get(student.id)?.status === AttendanceStatus.Absent)
                  .map(student => {
                    const phone = student.phone || '';
                    const todayDate = new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
                    const message = `আসসালামু আলাইকুম, আপনার সন্তান ${student.name} আজ (${todayDate}) মাদরাসায় অনুপস্থিত। অনুগ্রহ করে কারণটি জানাবেন।`;
                    
                    // Sanitize phone: remove non-digits
                    let rawPhone = phone.replace(/\D/g, ''); 
                    if (rawPhone.startsWith('0')) {
                        rawPhone = '88' + rawPhone;
                    }
                    
                    const isValidPhone = rawPhone.length >= 10;
                    const whatsappUrl = isValidPhone ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}` : '#';
                    
                    return (
                      <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-soft hover:shadow-md transition-all group">
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 text-lg mb-1">{student.name}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-medium">রোল: {toBengaliNumber(student.roll)}</span>
                            {isValidPhone ? (
                              <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg font-medium">মোবাইল: {toBengaliNumber(phone)}</span>
                            ) : (
                              <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg font-medium">মোবাইল নম্বর সঠিক নয়</span>
                            )}
                          </div>
                        </div>
                        <a
                          href={whatsappUrl}
                          target={isValidPhone ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className={clsx(
                            "h-[48px] px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 w-full sm:w-auto",
                            isValidPhone 
                              ? "bg-[#25D366] text-white hover:bg-[#20b858] shadow-soft" 
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          )}
                          onClick={(e) => {
                            if (!isValidPhone) {
                              e.preventDefault();
                              toast.error('এই শিক্ষার্থীর মোবাইল নম্বরটি সঠিক নয় (অন্তত ১০ ডিজিট আবশ্যক)।');
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

      {viewingImage && (
        <ImageModal
          isOpen={!!viewingImage}
          onClose={() => setViewingImage(null)}
          imageUrl={viewingImage.url}
          title={viewingImage.name}
        />
      )}
    </div>
  );
};

export default Attendance;
