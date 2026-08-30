import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Users, UserCheck, UserX, BookOpen, CheckCircle, Clock, CalendarOff, X } from "lucide-react";
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
    const todaysSessions = attendanceSessions.filter((s) => s.date === today);

    const classesWithAttendanceTodayIds = new Set(todaysSessions.map(s => s.classId));
    const classesWithAttendanceToday = classesWithAttendanceTodayIds.size;
    const completedClassesList = classes.filter(c => classesWithAttendanceTodayIds.has(c.id));
    const pendingClassesList = classes.filter(c => !classesWithAttendanceTodayIds.has(c.id));
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

    const todayISO = getTodayISO();
    
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
          onClick={() => setIsCompletedClassesModalOpen(true)}
        />
        <StatCard
          title="হাজিরা বাকি (শ্রেণি)"
          value={stats.classesPendingAttendanceToday}
          icon={Clock}
          color="text-[#F59E0B]"
          gradient="bg-[#F59E0B]/10"
          valueColor="text-[#debf0b] border-[#edb30e]"
          onClick={() => setIsPendingClassesModalOpen(true)}
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
        <div className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-8 sm:my-0">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1E293B]">হাজিরা বাকি থাকা শ্রেণি</h2>
                  <p className="text-sm text-slate-500 font-medium">আজকের হাজিরা বাকি আছে</p>
                </div>
              </div>
              <button
                onClick={() => setIsPendingClassesModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {stats.pendingClassesList.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {stats.pendingClassesList.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{c.name}</h3>
                        <p className="text-sm text-slate-500">
                          মোট শিক্ষার্থী: {toBengaliNumber(Object.values(students).flat().filter(s => s.classId === c.id && s.isActive !== false).length)} জন
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsPendingClassesModalOpen(false);
                          navigate(`/attendance?classId=${c.id}`);
                        }}
                        className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-bold transition-colors"
                      >
                        হাজিরা নিন
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">সব শ্রেণির হাজিরা সম্পন্ন হয়েছে!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {isCompletedClassesModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-8 sm:my-0">
            <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1E293B]">হাজিরা সম্পন্ন হওয়া শ্রেণি</h2>
                  <p className="text-sm text-slate-500 font-medium">আজকের হাজিরা সম্পন্ন হয়েছে</p>
                </div>
              </div>
              <button
                onClick={() => setIsCompletedClassesModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {stats.completedClassesList.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {stats.completedClassesList.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{c.name}</h3>
                        <p className="text-sm text-slate-500">
                          মোট শিক্ষার্থী: {toBengaliNumber(Object.values(students).flat().filter(s => s.classId === c.id && s.isActive !== false).length)} জন
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsCompletedClassesModalOpen(false);
                          navigate(`/attendance?classId=${c.id}`);
                        }}
                        className="px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm font-bold transition-colors"
                      >
                        বিস্তারিত দেখুন
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">কোনো শ্রেণির হাজিরা সম্পন্ন হয়নি!</p>
                </div>
              )}
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
}

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  icon: Icon,
  color,
  gradient,
  valueColor,
  onClick,
}) => {
  return (
    <div 
      onClick={onClick}
      className={clsx(
        "bg-white rounded-[20px] p-[18px] flex items-center gap-4 shadow-[0_6px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0] group",
        onClick ? "cursor-pointer hover:shadow-[0_8px_25px_rgba(0,0,0,0.12)] transition-shadow" : "cursor-default"
      )}
    >
      <div className={clsx("w-[44px] h-[44px] rounded-full flex items-center justify-center transition-transform", onClick && "group-hover:scale-110", gradient)}>
        <Icon className={clsx("w-6 h-6", color)} strokeWidth={2} />
      </div>
      <div className="flex flex-col">
        <p className="text-[14px] text-[#64748B]">{title}</p>
        <p className={clsx("text-[28px] font-bold", valueColor || "text-[#0F172A]")}>{toBengaliNumber(value)}</p>
      </div>
    </div>
  );
});

export default Dashboard;
