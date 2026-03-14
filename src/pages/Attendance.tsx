import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import { Search, Save, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, ArrowUpDown, ChevronDown, Loader2, Users } from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  icon: Icon,
  color,
  gradient,
}) => {
  const textColor = color.replace('bg-', 'text-');
  return (
    <div className="card-premium p-2 sm:p-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between relative overflow-hidden group">
      <div className="relative z-10 flex-1">
        <p className="text-[10px] sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1 text-center sm:text-left">{title}</p>
        <p className={`text-lg sm:text-3xl font-bold ${textColor} text-center sm:text-left`}>{value}</p>
      </div>
      <div className={`relative z-10 p-1.5 sm:p-4 rounded-lg sm:rounded-2xl bg-white/30 backdrop-blur-md border border-white/50 shadow-sm sm:shadow-lg group-hover:scale-110 transition-transform duration-300 mt-1 sm:mt-0 sm:ml-4`}>
        <Icon className={`w-4 h-4 sm:w-7 sm:h-7 ${textColor}`} />
      </div>
      <div className={`absolute -bottom-4 -right-4 w-12 h-12 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-xl sm:blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
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
  );

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'roll' | 'name', direction: 'asc' | 'desc' }>({ key: 'roll', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [attendanceState, setAttendanceState] = useState<
    Map<string, { status: AttendanceStatus; studentName: string }>
  >(new Map());

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students[selectedClassId] || [];
  }, [selectedClassId, students]);

  // Initialize attendance state with Default Present
  useEffect(() => {
    if (!selectedClassId) {
      setAttendanceState(new Map());
      return;
    }
    
    const newMap = new Map();
    classStudents.forEach((student) => {
      newMap.set(student.id, { status: AttendanceStatus.Present, studentName: student.name });
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
        student.roll.toString().includes(searchQuery),
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
      const newMap = new Map<string, { status: AttendanceStatus; studentName: string }>(prev);
      const current = newMap.get(studentId);
      if (current) {
        newMap.set(studentId, { status, studentName: current.studentName });
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
      newMap.forEach((value: { status: AttendanceStatus; studentName: string }, key: string) => {
        newMap.set(key, { status, studentName: value.studentName });
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
        <h2 className="text-3xl font-bold gradient-text tracking-tight">হাজিরা</h2>
      </div>

      {/* Live Counter */}
      {selectedClassId && (
        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          <StatCard
            title="মোট শিক্ষার্থী"
            value={liveCounter.total}
            icon={Users}
            color="bg-slate-500"
            gradient="from-slate-500 to-slate-400"
          />
          <StatCard
            title="উপস্থিত"
            value={liveCounter.present}
            icon={CheckCircle}
            color="bg-emerald-500"
            gradient="from-emerald-500 to-teal-400"
          />
          <StatCard
            title="অনুপস্থিত"
            value={liveCounter.absent}
            icon={XCircle}
            color="bg-rose-500"
            gradient="from-rose-500 to-red-400"
          />
        </div>
      )}

      <div className="card-premium p-8">
        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-md">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input-premium w-full search-highlight text-xl sm:text-2xl font-bold text-teal-700 border-teal-200 bg-teal-50/30 text-center appearance-none pr-10 py-3"
            >
              <option value="" className="text-slate-500 font-normal text-lg">শ্রেণি নির্বাচন করুন</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} className="text-lg sm:text-xl font-medium">
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-teal-600 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        {selectedClassId ? (
          <>
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              <button
                onClick={() => markAll(AttendanceStatus.Present)}
                className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 font-bold px-3 py-2 rounded-xl hover:bg-emerald-50 transition-all duration-300 border border-emerald-100 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                সবাই উপস্থিত
              </button>
              <button
                onClick={() => markAll(AttendanceStatus.Absent)}
                className="text-xs sm:text-sm text-rose-600 hover:text-rose-700 font-bold px-3 py-2 rounded-xl hover:bg-rose-50 transition-all duration-300 border border-rose-100 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                সবাই অনুপস্থিত
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
                  <tr>
                    <th 
                      className="py-3 px-2 sm:py-4 sm:px-4 font-semibold text-slate-600 border-b border-slate-200/60 cursor-pointer hover:bg-slate-100/50 transition-colors text-xs sm:text-sm w-10 sm:w-16"
                      onClick={() => handleSort('roll')}
                    >
                      <div className="flex items-center gap-1 sm:gap-2">
                        রোল <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      className="py-3 px-2 sm:py-4 sm:px-4 font-semibold text-slate-600 border-b border-slate-200/60 cursor-pointer hover:bg-slate-100/50 transition-colors text-xs sm:text-sm w-full"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1 sm:gap-2">
                        শিক্ষার্থীর নাম <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-2 sm:py-4 sm:px-4 font-semibold text-slate-600 border-b border-slate-200/60 text-xs sm:text-sm whitespace-nowrap">
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
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="py-3 px-2 sm:py-4 sm:px-4 text-slate-800 font-mono text-sm sm:text-base w-10 sm:w-16">
                          {student.roll}
                        </td>
                        <td className="py-3 px-2 sm:py-4 sm:px-4 text-slate-800 font-bold text-sm sm:text-xl w-full">
                          <div className="flex flex-col">
                            <span>{student.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-1 sm:py-4 sm:px-4 whitespace-nowrap">
                          <div className="flex flex-row justify-start gap-1.5 sm:gap-2">
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  student.id,
                                  AttendanceStatus.Present,
                                )
                              }
                              title="উপস্থিত"
                              className={clsx(
                                "p-2 sm:px-3 sm:py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 border-2 text-[10px] sm:text-xs",
                                status === AttendanceStatus.Present
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-lg scale-105"
                                  : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-slate-600",
                              )}
                            >
                              <CheckCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                              <span className="font-bold hidden sm:inline">উপস্থিত</span>
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
                                "p-2 sm:px-3 sm:py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 border-2 text-[10px] sm:text-xs",
                                status === AttendanceStatus.Absent
                                  ? "bg-rose-500 text-white border-rose-600 shadow-lg scale-105"
                                  : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-slate-600",
                              )}
                            >
                              <XCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                              <span className="font-bold hidden sm:inline">অনুপস্থিত</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center py-8 text-slate-500"
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
                  <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> থেকে <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedStudents.length)}</span> পর্যন্ত, মোট <span className="font-medium">{filteredAndSortedStudents.length}</span> জন শিক্ষার্থী
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
                    পৃষ্ঠা {currentPage} এর {totalPages}
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
                className="bg-white text-teal-600 border border-teal-100 shadow-md hover:shadow-lg hover:bg-teal-50 transition-all duration-300 flex items-center px-8 py-3 rounded-2xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:scale-95"
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
