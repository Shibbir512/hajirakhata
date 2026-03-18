import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import { Search, Save, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown, Loader2, Users } from "lucide-react";
import { toBengaliNumber } from "../utils/dateFormatter";
import clsx from "clsx";
import toast from "react-hot-toast";

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
    let result = classStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.roll?.toString() || "").includes(searchQuery),
    );

    result.sort((a, b) => {
      if (sortConfig.key === 'roll') {
        return sortConfig.direction === 'asc' ? a.roll - b.roll : b.roll - a.roll;
      } else {
        return sortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
    });

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

  const handleSave = async () => {
    if (!selectedClassId) return;
    if (attendanceState.size === 0) {
      toast.error("এই শ্রেণিতে কোনো শিক্ষার্থী নেই। হাজিরা সংরক্ষণ করা সম্ভব নয়।");
      return;
    }
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

      <div className="card-premium p-8">
        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-md">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-[16px] font-medium text-slate-700 bg-white appearance-none px-4 pr-10 outline-none focus:border-[#0F5C7A] focus:ring-1 focus:ring-[#0F5C7A] transition-all"
              style={{ height: '50px', borderRadius: '16px', border: '1px solid #D1D5DB' }}
            >
              <option value="" className="text-slate-500 font-normal text-[16px]">শ্রেণি নির্বাচন করুন</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="text-[16px] font-medium">
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        {selectedClassId ? (
          <>
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              <button
                onClick={() => markAll(AttendanceStatus.Present)}
                className="text-white font-bold px-4 py-2 hover:bg-emerald-600 transition-all duration-300 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#22C55E', borderRadius: '14px', height: '44px' }}
              >
                <CheckCircle className="w-4 h-4" />
                সবাই উপস্থিত
              </button>
              <button
                onClick={() => markAll(AttendanceStatus.Absent)}
                className="text-[#EF4444] font-bold px-4 py-2 hover:bg-rose-50 transition-all duration-300 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'white', border: '1px solid #EF4444', borderRadius: '14px', height: '44px' }}
              >
                <XCircle className="w-4 h-4" />
                সবাই অনুপস্থিত
              </button>
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

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleSave}
                disabled={isTakingAttendance}
                className="btn-primary px-8 py-3 text-base"
                style={{ backgroundColor: '#0F5C7A' }}
              >
                {isTakingAttendance ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {isTakingAttendance ? 'সংরক্ষণ করা হচ্ছে...' : 'হাজিরা সংরক্ষণ করুন'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-slate-500 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-lg font-medium text-slate-600 mb-1">কোন শ্রেণি নির্বাচন করা হয়নি</p>
            <p className="text-sm">হাজিরা দেখার জন্য উপরের ড্রপডাউন থেকে একটি শ্রেণি নির্বাচন করুন।</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
