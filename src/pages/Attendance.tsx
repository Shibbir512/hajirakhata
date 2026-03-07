import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import { Search, Save, CheckCircle, XCircle, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import clsx from "clsx";

const ITEMS_PER_PAGE = 10;

const Attendance: React.FC = () => {
  const { user, orgId } = useAuth();
  const { classes } = useClasses(orgId, user);
  const { students } = useStudents(orgId, user);
  const { attendance, takeAttendance } = useAttendance(
    orgId,
    user,
    classes,
    students,
  );

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'roll' | 'name', direction: 'asc' | 'desc' }>({ key: 'roll', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [attendanceState, setAttendanceState] = useState<
    Map<string, { status: AttendanceStatus; note: string }>
  >(new Map());

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students[selectedClassId] || [];
  }, [selectedClassId, students]);

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
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClassId]);

  // Initialize attendance state from existing records
  useMemo(() => {
    if (!selectedClassId) return;

    const date = new Date(selectedDate);
    const existingRecords = attendance.filter((r) => {
      const rDate = new Date(r.timestamp);
      return (
        r.classId === selectedClassId &&
        rDate.getDate() === date.getDate() &&
        rDate.getMonth() === date.getMonth() &&
        rDate.getFullYear() === date.getFullYear()
      );
    });

    const newMap = new Map();
    classStudents.forEach((student) => {
      const record = existingRecords.find((r) => r.studentId === student.id);
      if (record) {
        newMap.set(student.id, { status: record.status, note: record.note });
      }
    });
    setAttendanceState(newMap);
  }, [selectedClassId, selectedDate, attendance, classStudents]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(studentId) || { status: undefined, note: "" };
      newMap.set(studentId, { ...(current as any), status });
      return newMap;
    });
  };

  const handleSave = () => {
    if (!selectedClassId) return;
    takeAttendance(selectedClassId, attendanceState, selectedDate);
  };

  const markAll = (status: AttendanceStatus) => {
    setAttendanceState((prev) => {
      const newMap = new Map(prev);
      classStudents.forEach((student) => {
        const current = newMap.get(student.id) || {
          status: undefined,
          note: "",
        };
        newMap.set(student.id, { ...(current as any), status });
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
        <h2 className="text-2xl font-bold text-slate-800">হাজিরা</h2>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            সংরক্ষণ
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">শ্রেণি নির্বাচন করুন</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="শিক্ষার্থীর নাম বা রোল দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {selectedClassId ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => markAll(AttendanceStatus.Present)}
                className="text-sm text-green-600 hover:text-green-700 font-medium px-3 py-1 rounded-md hover:bg-green-50 transition-colors"
              >
                সবাইকে উপস্থিত করুন
              </button>
              <span className="text-slate-300 self-center">|</span>
              <button
                onClick={() => markAll(AttendanceStatus.Absent)}
                className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
              >
                সবাইকে অনুপস্থিত করুন
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th 
                      className="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('roll')}
                    >
                      <div className="flex items-center gap-1">
                        রোল <ArrowUpDown className="w-4 h-4 text-slate-400" />
                      </div>
                    </th>
                    <th 
                      className="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        শিক্ষার্থীর নাম <ArrowUpDown className="w-4 h-4 text-slate-400" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
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
                        className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors group"
                      >
                        <td className="py-3 px-4 text-slate-800">
                          {student.roll}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {student.name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  student.id,
                                  AttendanceStatus.Present,
                                )
                              }
                              className={clsx(
                                "p-2 rounded-lg transition-all flex items-center gap-2 border",
                                status === AttendanceStatus.Present
                                  ? "bg-green-100 text-green-700 border-green-200 shadow-sm"
                                  : "text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600",
                              )}
                            >
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-medium hidden sm:inline">
                                উপস্থিত
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  student.id,
                                  AttendanceStatus.Absent,
                                )
                              }
                              className={clsx(
                                "p-2 rounded-lg transition-all flex items-center gap-2 border",
                                status === AttendanceStatus.Absent
                                  ? "bg-red-100 text-red-700 border-red-200 shadow-sm"
                                  : "text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600",
                              )}
                            >
                              <XCircle className="w-5 h-5" />
                              <span className="text-sm font-medium hidden sm:inline">
                                অনুপস্থিত
                              </span>
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
          </>
        ) : (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p className="text-lg font-medium text-slate-600 mb-1">কোন শ্রেণি নির্বাচন করা হয়নি</p>
            <p className="text-sm">হাজিরা দেখার জন্য উপরের ড্রপডাউন থেকে একটি শ্রেণি নির্বাচন করুন।</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
