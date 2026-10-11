import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, UserCheck, UserX, BookOpen, CheckCircle, Clock, CalendarOff, X, ChevronRight, Search, ArrowRight } from "lucide-react";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { useClasses } from "../hooks/useClasses";
import { useLeaves } from "../hooks/useLeaves";
import { useAuth } from "../hooks/useAuth";
import { toBengaliNumber, getTodayISO, normalizeDateToISO, isLeaveActiveNow } from "../utils/dateFormatter";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import StudentSearch from "../components/StudentSearch";

const Dashboard: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const navigate = useNavigate();
  const { students } = useStudents(orgId, user, role);
  const { classes } = useClasses(orgId, user, role);
  const [isPendingClassesModalOpen, setIsPendingClassesModalOpen] = useState(false);
  const [isCompletedClassesModalOpen, setIsCompletedClassesModalOpen] = useState(false);
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  const [completedSearchQuery, setCompletedSearchQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPendingClassesModalOpen(false);
        setIsCompletedClassesModalOpen(false);
      }
    };
    if (isPendingClassesModalOpen || isCompletedClassesModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPendingClassesModalOpen, isCompletedClassesModalOpen]);

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const endDate = useMemo(() => new Date(), []);

  const { attendanceSessions } = useAttendance(orgId, user, classes, students, role, {
    startDate,
    endDate
  });
  
  const { leaves } = useLeaves(orgId, user);

  const stats = useMemo(() => {
    const activeStudents = Object.values(students).flat().filter(s => s.isActive !== false);
    const totalStudents = activeStudents.length;
    const totalClasses = classes.length;

    const todayDateObj = new Date();
    const today = todayDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '); // dd mm yyyy
    const todayISO = getTodayISO();
    const todaysSessions = attendanceSessions.filter((s) => {
      if (!s.date) return false;
      return s.date === today || normalizeDateToISO(s.date) === todayISO;
    });

    const classesWithAttendanceTodayIds = new Set(todaysSessions.map(s => s.classId));
    // আজকের হাজিরা সম্পন্ন এবং বাকি থাকা শ্রেণির তালিকা
    const completedClassesList = classes.filter(c => classesWithAttendanceTodayIds.has(c.id));
    const pendingClassesList = classes.filter(c => !classesWithAttendanceTodayIds.has(c.id));
    const classesWithAttendanceToday = completedClassesList.length;
    const classesPendingAttendanceToday = pendingClassesList.length;

    const studentStatusMap = new Map();

    todaysSessions.forEach(s => {
      s.students.forEach((st: any) => {
        const sid = st.studentId || st.id;
        if (!sid) return;
        
        if (st.status === "present") {
          studentStatusMap.set(sid, "present");
        } else if (st.status === "leave") {
          if (studentStatusMap.get(sid) !== "present") {
            studentStatusMap.set(sid, "leave");
          }
        } else {
          if (studentStatusMap.get(sid) !== "present") {
            studentStatusMap.set(sid, "absent");
          }
        }
      });
    });

    // Fallback leaves count (for students whose attendance is not yet taken today)
    const leavesOnTodaySet = new Set();
    leaves.forEach(leave => {
      if (isLeaveActiveNow(leave)) {
        leavesOnTodaySet.add(leave.studentId);
      }
    });

    let presentToday = 0;
    let absentToday = 0;
    let leavesOnToday = 0;

    activeStudents.forEach((student) => {
      const sid = student.id;
      const status = studentStatusMap.get(sid);
      
      if (status === 'present') {
        presentToday++;
      } else if (status === 'absent') {
        absentToday++;
      } else if (status === 'leave') {
        leavesOnToday++;
      } else {
        // Attendance not taken yet for this student
        if (leavesOnTodaySet.has(sid)) {
          leavesOnToday++;
        }
      }
    });

    return { totalStudents, totalClasses, presentToday, absentToday, classesWithAttendanceToday, classesPendingAttendanceToday, pendingClassesList, completedClassesList, leavesOnToday };
  }, [students, classes, attendanceSessions, leaves]);

  const filteredPendingClasses = useMemo(() => {
    if (!pendingSearchQuery.trim()) return stats.pendingClassesList;
    return stats.pendingClassesList.filter(c => 
      c.name.toLowerCase().includes(pendingSearchQuery.toLowerCase())
    );
  }, [stats.pendingClassesList, pendingSearchQuery]);

  const filteredCompletedClasses = useMemo(() => {
    if (!completedSearchQuery.trim()) return stats.completedClassesList;
    return stats.completedClassesList.filter(c => 
      c.name.toLowerCase().includes(completedSearchQuery.toLowerCase())
    );
  }, [stats.completedClassesList, completedSearchQuery]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '); // dd mm yyyy

      const daySessions = attendanceSessions.filter((s) => s.date === dateStr);

      const studentStatusMap = new Map();

      daySessions.forEach(s => {
        s.students.forEach((st: any) => {
          const sid = st.studentId || st.id || st.name;
          if (st.status === "present") {
            studentStatusMap.set(sid, "present");
          } else if (st.status === "leave") {
            if (studentStatusMap.get(sid) !== "present") {
              studentStatusMap.set(sid, "leave");
            }
          } else {
            if (studentStatusMap.get(sid) !== "present") {
              studentStatusMap.set(sid, "absent");
            }
          }
        });
      });

      let presentCount = 0;
      let absentCount = 0;

      studentStatusMap.forEach((status) => {
        if (status === 'present') presentCount++;
        if (status === 'absent') absentCount++;
      });

      data.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        Present: presentCount,
        Absent: absentCount,
      });
    }
    return data;
  }, [attendanceSessions]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] min-h-screen p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <StudentSearch />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="হাজিরা সম্পন্ন (শ্রেণি)"
          value={stats.classesWithAttendanceToday}
          icon={CheckCircle}
          color="text-[#22C55E]"
          gradient="bg-[#22C55E]/10"
          valueColor="text-[#0fb063]"
          onClick={() => {
            setCompletedSearchQuery("");
            setIsCompletedClassesModalOpen(true);
          }}
          actionText="তালিকা দেখতে ক্লিক করুন"
          hoverBorderColor="hover:border-emerald-400"
        />
        <StatCard
          title="হাজিরা বাকি (শ্রেণি)"
          value={stats.classesPendingAttendanceToday}
          icon={Clock}
          color="text-[#F59E0B]"
          gradient="bg-[#F59E0B]/10"
          valueColor="text-[#debf0b] border-[#edb30e]"
          onClick={() => {
            setPendingSearchQuery("");
            setIsPendingClassesModalOpen(true);
          }}
          actionText="শ্রেণি দেখতে ক্লিক করুন"
          hoverBorderColor="hover:border-amber-400"
        />
        <StatCard
          title="মোট শিক্ষার্থী"
          value={stats.totalStudents}
          icon={Users}
          color="text-[#3B82F6]"
          gradient="bg-[#3B82F6]/10"
          valueColor="text-[#2158d7]"
        />
        <StatCard
          title="আজ উপস্থিত"
          value={stats.presentToday}
          icon={UserCheck}
          color="text-[#22C55E]"
          gradient="bg-[#22C55E]/10"
          valueColor="text-[#08c268]"
        />
        <StatCard
          title="আজ অনুপস্থিত"
          value={stats.absentToday}
          icon={UserX}
          color="text-[#EF4444]"
          gradient="bg-[#EF4444]/10"
          valueColor="text-[#f92e2e]"
        />
        <StatCard
          title="আজ ছুটিতে"
          value={stats.leavesOnToday}
          icon={CalendarOff}
          color="text-[#8B5CF6]"
          gradient="bg-[#8B5CF6]/10"
          valueColor="text-[#7C3AED]"
          onClick={() => navigate('/attendance/leave')}
          actionText="ছুটির তালিকা দেখুন"
          hoverBorderColor="hover:border-purple-400"
        />
        <StatCard
          title="মোট শ্রেণি"
          value={stats.totalClasses}
          icon={BookOpen}
          color="text-[#3B82F6]"
          gradient="bg-[#3B82F6]/10"
          valueColor="text-[#2158d7] border-[#1354ea]"
        />
      </div>

        <div className="bg-white p-6 rounded-[20px] shadow-[0_6px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0]">
        <h3 className="font-bold mb-6 tracking-tight text-center text-[#079999] text-[17.875px]">
          সাপ্তাহিক হাজিরার প্রবণতা
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#16A34A" />
                </linearGradient>
                <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} dx={-10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                  padding: "12px",
                }}
                cursor={{ fill: "#F8FAFC" }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 500, color: '#4B5563' }} />
              <Bar
                dataKey="Present"
                name="উপস্থিত"
                fill="url(#presentGradient)"
                radius={[8, 8, 8, 8]}
                barSize={32}
              />
              <Bar
                dataKey="Absent"
                name="অনুপস্থিত"
                fill="url(#absentGradient)"
                radius={[8, 8, 8, 8]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isPendingClassesModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsPendingClassesModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-4 border border-slate-100">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/70 to-orange-50/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">হাজিরা বাকি থাকা শ্রেণি</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {toBengaliNumber(stats.classesPendingAttendanceToday)}টি
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">আজকের হাজিরা এখনও নেওয়া হয়নি</p>
                </div>
              </div>
              <button
                onClick={() => setIsPendingClassesModalOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search if more than 3 classes */}
            {stats.pendingClassesList.length > 3 && (
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pendingSearchQuery}
                    onChange={(e) => setPendingSearchQuery(e.target.value)}
                    placeholder="শ্রেণির নাম দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                  />
                  {pendingSearchQuery && (
                    <button
                      onClick={() => setPendingSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
              {stats.pendingClassesList.length > 0 ? (
                filteredPendingClasses.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredPendingClasses.map((c) => {
                      const studentCount = (students[c.id] || []).filter(s => s.isActive !== false).length;
                      return (
                        <div 
                          key={c.id} 
                          className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50 hover:bg-amber-50/40 rounded-2xl border border-slate-200/80 hover:border-amber-300 transition-all duration-200 group"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-800 text-base sm:text-lg group-hover:text-amber-900 transition-colors truncate">
                                {c.name}
                              </h3>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100/80 text-amber-700 shrink-0">
                                বাকি
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                              মোট শিক্ষার্থী: <span className="font-bold text-slate-700">{toBengaliNumber(studentCount)}</span> জন
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setIsPendingClassesModalOpen(false);
                              navigate(`/attendance?classId=${c.id}`);
                            }}
                            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#0F5C7A] hover:bg-[#0c4a63] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <span>হাজিরা নিন</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    "{pendingSearchQuery}" নামে কোনো শ্রেণি পাওয়া যায়নি।
                  </div>
                )
              ) : (
                <div className="text-center py-10 px-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-emerald-900 mb-1">আলহামদুলিল্লাহ! সব শ্রেণির হাজিরা সম্পন্ন হয়েছে</h3>
                  <p className="text-xs sm:text-sm text-emerald-700">আজকের জন্য আর কোনো শ্রেণির হাজিরা বাকি নেই।</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
              <span>মোট বাকি শ্রেণি: {toBengaliNumber(stats.classesPendingAttendanceToday)} টি</span>
              <button
                onClick={() => setIsPendingClassesModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {isCompletedClassesModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsCompletedClassesModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-4 border border-slate-100">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 to-teal-50/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">হাজিরা সম্পন্ন হওয়া শ্রেণি</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {toBengaliNumber(stats.classesWithAttendanceToday)}টি
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">আজকের হাজিরা সম্পন্ন হয়েছে</p>
                </div>
              </div>
              <button
                onClick={() => setIsCompletedClassesModalOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search if more than 3 classes */}
            {stats.completedClassesList.length > 3 && (
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={completedSearchQuery}
                    onChange={(e) => setCompletedSearchQuery(e.target.value)}
                    placeholder="শ্রেণির নাম দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all"
                  />
                  {completedSearchQuery && (
                    <button
                      onClick={() => setCompletedSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content List */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
              {stats.completedClassesList.length > 0 ? (
                filteredCompletedClasses.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredCompletedClasses.map((c) => {
                      const studentCount = (students[c.id] || []).filter(s => s.isActive !== false).length;
                      return (
                        <div 
                          key={c.id} 
                          className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl border border-slate-200/80 hover:border-emerald-300 transition-all duration-200 group"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-800 text-base sm:text-lg group-hover:text-emerald-900 transition-colors truncate">
                                {c.name}
                              </h3>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 shrink-0">
                                সম্পন্ন
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                              মোট শিক্ষার্থী: <span className="font-bold text-slate-700">{toBengaliNumber(studentCount)}</span> জন
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setIsCompletedClassesModalOpen(false);
                              navigate(`/attendance/history?classId=${c.id}`);
                            }}
                            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                          >
                            <span>হাজিরা দেখুন</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    "{completedSearchQuery}" নামে কোনো শ্রেণি পাওয়া যায়নি।
                  </div>
                )
              ) : (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">আজকের কোনো শ্রেণির হাজিরা এখনও সম্পন্ন হয়নি!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
              <span>মোট সম্পন্ন শ্রেণি: {toBengaliNumber(stats.classesWithAttendanceToday)} টি</span>
              <button
                onClick={() => setIsCompletedClassesModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  gradient: string;
  valueColor?: string;
  onClick?: () => void;
  actionText?: string;
  hoverBorderColor?: string;
}

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  icon: Icon,
  color,
  gradient,
  valueColor,
  onClick,
  actionText,
  hoverBorderColor = "hover:border-slate-300",
}) => {
  return (
    <div 
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={clsx(
        "bg-white rounded-[20px] p-[18px] flex items-center justify-between shadow-[0_6px_20px_rgba(0,0,0,0.08)] border transition-all duration-200 group text-left",
        onClick 
          ? `cursor-pointer border-[#E2E8F0] ${hoverBorderColor} hover:shadow-[0_10px_25px_rgba(0,0,0,0.12)] active:scale-[0.98]` 
          : "cursor-default border-[#E2E8F0]"
      )}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className={clsx("w-[46px] h-[46px] rounded-2xl flex items-center justify-center transition-transform shrink-0 shadow-sm", onClick && "group-hover:scale-105", gradient)}>
          <Icon className={clsx("w-6 h-6", color)} strokeWidth={2} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-[13px] sm:text-[14px] text-[#64748B] font-medium truncate">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className={clsx("text-[26px] sm:text-[28px] font-bold leading-tight", valueColor || "text-[#0F172A]")}>{toBengaliNumber(value)}</p>
          </div>
          {actionText && (
            <p className="text-[11px] font-medium text-slate-500 group-hover:text-slate-800 flex items-center gap-1 mt-0.5 transition-colors">
              <span>{actionText}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          )}
        </div>
      </div>
      {onClick && (
        <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 ml-2">
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      )}
    </div>
  );
});

export default Dashboard;
