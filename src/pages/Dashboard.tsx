import React, { useMemo } from "react";
import { Users, UserCheck, UserX, BookOpen, CheckCircle, Clock } from "lucide-react";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { useClasses } from "../hooks/useClasses";
import { useAuth } from "../hooks/useAuth";
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

const Dashboard: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { students } = useStudents(orgId, user, role);
  const { classes } = useClasses(orgId, user, role);
  const { attendanceSessions } = useAttendance(orgId, user, classes, students, role);

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
      <h2 className="text-3xl font-bold gradient-text tracking-tight">ড্যাশবোর্ড ওভারভিউ</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="হাজিরা সম্পন্ন (শ্রেণি)"
          value={stats.classesWithAttendanceToday}
          icon={CheckCircle}
          color="bg-blue-500"
          gradient="from-blue-500 to-cyan-400"
        />
        <StatCard
          title="হাজিরা বাকি (শ্রেণি)"
          value={stats.classesPendingAttendanceToday}
          icon={Clock}
          color="bg-pink-500"
          gradient="from-pink-500 to-rose-400"
        />
        <StatCard
          title="মোট শিক্ষার্থী"
          value={stats.totalStudents}
          icon={Users}
          color="bg-violet-500"
          gradient="from-violet-500 to-purple-400"
        />
        <StatCard
          title="আজ উপস্থিত"
          value={stats.presentToday}
          icon={UserCheck}
          color="bg-emerald-500"
          gradient="from-emerald-500 to-teal-400"
        />
        <StatCard
          title="আজ অনুপস্থিত"
          value={stats.absentToday}
          icon={UserX}
          color="bg-rose-500"
          gradient="from-rose-500 to-red-400"
        />
        <StatCard
          title="মোট শ্রেণি"
          value={stats.totalClasses}
          icon={BookOpen}
          color="bg-amber-500"
          gradient="from-amber-500 to-orange-400"
        />
      </div>

      <div className="card-premium p-8">
        <h3 className="text-[19.75px] leading-[27.25px] font-bold text-[#26619c] mb-6 tracking-tight">
          সাপ্তাহিক হাজিরার প্রবণতা
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0, 0 / 0.1)",
                }}
                cursor={{ fill: "transparent" }}
              />
              <Legend />
              <Bar
                dataKey="Present"
                fill="#14b8a6"
                radius={[6, 6, 0, 0]}
                barSize={32}
              />
              <Bar
                dataKey="Absent"
                fill="#fb923c"
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
    <div className="card-premium p-6 flex items-center justify-between relative overflow-hidden group">
      <div className="relative z-10 flex-1">
        <p className="text-sm font-medium text-slate-500 mb-1 text-center">{title}</p>
        <p className={`text-3xl font-bold ${textColor} text-center`}>{value}</p>
      </div>
      <div className={`relative z-10 p-4 rounded-full bg-white shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300 ml-4`}>
        <Icon className={`w-7 h-7 drop-shadow-md ${textColor}`} />
      </div>
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
    </div>
  );
});

export default Dashboard;
