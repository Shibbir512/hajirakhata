import React, { useMemo } from "react";
import { Users, UserCheck, UserX, BookOpen, CheckCircle, Clock, CalendarOff } from "lucide-react";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { useClasses } from "../hooks/useClasses";
import { useLeaves } from "../hooks/useLeaves";
import { useAuth } from "../hooks/useAuth";
import { toBengaliNumber } from "../utils/dateFormatter";
import clsx from "clsx";
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
  const { students } = useStudents(orgId, user, role);
  const { classes } = useClasses(orgId, user, role);
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
    const totalStudents = Object.values(students).flat().length;
    const totalClasses = classes.length;

    const todayDateObj = new Date();
    const today = todayDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '); // dd mm yyyy
    const todaysSessions = attendanceSessions.filter((s) => s.date === today);

    const classesWithAttendanceToday = new Set(todaysSessions.map(s => s.classId)).size;
    const classesPendingAttendanceToday = Math.max(0, totalClasses - classesWithAttendanceToday);

    const studentStatusMap = new Map();

    todaysSessions.forEach(s => {
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

    let presentToday = 0;
    let absentToday = 0;

    studentStatusMap.forEach((status) => {
      if (status === 'present') presentToday++;
      if (status === 'absent') absentToday++;
    });
    
    // Calculate leaves for today with exact time check
    const todayISO = todayDateObj.toISOString().split('T')[0];
    const currentHour = String(todayDateObj.getHours()).padStart(2, '0');
    const currentMinute = String(todayDateObj.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    const leavesOnTodaySet = new Set();

    leaves.forEach(leave => {
      if (leave.status === 'approved') {
        const sDate = leave.startDate || leave.date;
        const eDate = leave.endDate || leave.date;
        
        if (sDate && eDate && todayISO >= sDate && todayISO <= eDate) {
          let isActive = true;
          
          if (todayISO === sDate && leave.startTime && leave.startTime > currentTime) {
            isActive = false; // Hasn't started yet today
          }
          if (todayISO === eDate && leave.endTime && leave.endTime < currentTime) {
            isActive = false; // Already finished today
          }
          
          if (isActive) {
            leavesOnTodaySet.add(leave.studentId);
          }
        }
      }
    });
    
    const leavesOnToday = leavesOnTodaySet.size;

    return { totalStudents, totalClasses, presentToday, absentToday, classesWithAttendanceToday, classesPendingAttendanceToday, leavesOnToday };
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
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
        />
        <StatCard
          title="হাজিরা বাকি (শ্রেণি)"
          value={stats.classesPendingAttendanceToday}
          icon={Clock}
          color="text-[#F59E0B]"
          gradient="bg-[#F59E0B]/10"
          valueColor="text-[#debf0b] border-[#edb30e]"
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
}

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  icon: Icon,
  color,
  gradient,
  valueColor,
}) => {
  return (
    <div className="bg-white rounded-[20px] p-[18px] flex items-center gap-4 shadow-[0_6px_20px_rgba(0,0,0,0.08)] border border-[#E2E8F0] group cursor-default">
      <div className={clsx("w-[44px] h-[44px] rounded-full flex items-center justify-center", gradient)}>
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
