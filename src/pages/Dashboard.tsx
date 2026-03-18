import React, { useMemo } from "react";
import { Users, UserCheck, UserX, BookOpen, CheckCircle, Clock } from "lucide-react";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { useClasses } from "../hooks/useClasses";
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

  const stats = useMemo(() => {
    const totalStudents = Object.values(students).flat().length;
    const totalClasses = classes.length;

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '); // dd mm yyyy
    const todaysSessions = attendanceSessions.filter((s) => s.date === today);

    const classesWithAttendanceToday = new Set(todaysSessions.map(s => s.classId)).size;
    const classesPendingAttendanceToday = Math.max(0, totalClasses - classesWithAttendanceToday);

    const presentTodaySet = new Set();
    const absentTodaySet = new Set();

    todaysSessions.forEach(s => {
      s.students.forEach((st: any) => {
        if (st.status === "present") {
          presentTodaySet.add(st.studentId);
          absentTodaySet.delete(st.studentId);
        } else {
          if (!presentTodaySet.has(st.studentId)) {
            absentTodaySet.add(st.studentId);
          }
        }
      });
    });

    const presentToday = presentTodaySet.size;
    const absentToday = absentTodaySet.size;

    return { totalStudents, totalClasses, presentToday, absentToday, classesWithAttendanceToday, classesPendingAttendanceToday };
  }, [students, classes, attendanceSessions]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' '); // dd mm yyyy

      const daySessions = attendanceSessions.filter((s) => s.date === dateStr);

      const presentSet = new Set();
      const absentSet = new Set();

      daySessions.forEach(s => {
        s.students.forEach((st: any) => {
          if (st.status === "present") {
            presentSet.add(st.studentId);
            absentSet.delete(st.studentId);
          } else {
            if (!presentSet.has(st.studentId)) {
              absentSet.add(st.studentId);
            }
          }
        });
      });

      data.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        Present: presentSet.size,
        Absent: absentSet.size,
      });
    }
    return data;
  }, [attendanceSessions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ড্যাশবোর্ড ওভারভিউ</h2>
        <StudentSearch />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="হাজিরা সম্পন্ন (শ্রেণি)"
          value={stats.classesWithAttendanceToday}
          icon={CheckCircle}
          color="text-[#0F5C7A]"
          gradient="bg-[#0F5C7A]/10"
          valueColor="text-[#0F5C7A]"
        />
        <StatCard
          title="হাজিরা বাকি (শ্রেণি)"
          value={stats.classesPendingAttendanceToday}
          icon={Clock}
          color="text-[#F59E0B]"
          gradient="bg-[#F59E0B]/10"
          valueColor="text-[#F59E0B]"
        />
        <StatCard
          title="মোট শিক্ষার্থী"
          value={stats.totalStudents}
          icon={Users}
          color="text-[#14B8A6]"
          gradient="bg-[#14B8A6]/10"
          valueColor="text-[#14B8A6]"
        />
        <StatCard
          title="আজ উপস্থিত"
          value={stats.presentToday}
          icon={UserCheck}
          color="text-[#22C55E]"
          gradient="bg-[#22C55E]/10"
          valueColor="text-[#22C55E]"
        />
        <StatCard
          title="আজ অনুপস্থিত"
          value={stats.absentToday}
          icon={UserX}
          color="text-[#EF4444]"
          gradient="bg-[#EF4444]/10"
          valueColor="text-[#EF4444]"
        />
        <StatCard
          title="মোট শ্রেণি"
          value={stats.totalClasses}
          icon={BookOpen}
          color="text-[#0F5C7A]"
          gradient="bg-[#0F5C7A]/10"
          valueColor="text-[#0F5C7A]"
        />
      </div>

      <div className="card-premium p-8">
        <h3 className="text-lg font-bold text-[#0F5C7A] mb-6 tracking-tight">
          সাপ্তাহিক হাজিরার প্রবণতা
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }} dx={-10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                  padding: "12px",
                }}
                cursor={{ fill: "#F3F4F6" }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 500, color: '#4B5563' }} />
              <Bar
                dataKey="Present"
                name="উপস্থিত"
                fill="#22C55E"
                radius={[6, 6, 0, 0]}
                barSize={32}
              />
              <Bar
                dataKey="Absent"
                name="অনুপস্থিত"
                fill="#EF4444"
                radius={[6, 6, 0, 0]}
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
  valueColor = "text-slate-800",
}) => {
  return (
    <div className="card-premium p-[20px] flex items-center justify-between group cursor-default">
      <div className="relative z-10 flex-1">
        <p className="text-[14px] font-medium text-slate-500 mb-1">{title}</p>
        <p className={clsx("text-[26px] font-bold", valueColor)}>{toBengaliNumber(value)}</p>
      </div>
      <div className={clsx("relative z-10 w-[40px] h-[40px] flex items-center justify-center rounded-full group-hover:scale-110 transition-transform duration-300 ml-4", gradient)}>
        <Icon className={clsx("w-5 h-5", color)} strokeWidth={2} />
      </div>
    </div>
  );
});

export default Dashboard;
