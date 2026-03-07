import React, { useMemo } from "react";
import { Users, UserCheck, UserX, BookOpen } from "lucide-react";
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
  const { user, orgId } = useAuth();
  const { students } = useStudents(orgId, user);
  const { classes } = useClasses(orgId, user);
  const { attendanceSessions } = useAttendance(orgId, user, classes, students);

  const stats = useMemo(() => {
    const totalStudents = Object.values(students).flat().length;
    const totalClasses = classes.length;

    const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const todaysSessions = attendanceSessions.filter((s) => s.date === today);

    let presentToday = 0;
    let absentToday = 0;
    todaysSessions.forEach(s => {
      s.students.forEach((st: any) => {
        if (st.status === "present") presentToday++;
        else absentToday++;
      });
    });

    return { totalStudents, totalClasses, presentToday, absentToday };
  }, [students, classes, attendanceSessions]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-GB').replace(/\//g, '-');

      const daySessions = attendanceSessions.filter((s) => s.date === dateStr);

      let present = 0;
      let absent = 0;
      daySessions.forEach(s => {
        s.students.forEach((st: any) => {
          if (st.status === "present") present++;
          else absent++;
        });
      });

      data.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        Present: present,
        Absent: absent,
      });
    }
    return data;
  }, [attendanceSessions]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">ড্যাশবোর্ড ওভারভিউ</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="মোট শিক্ষার্থী"
          value={stats.totalStudents}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="আজ উপস্থিত"
          value={stats.presentToday}
          icon={UserCheck}
          color="bg-green-500"
        />
        <StatCard
          title="আজ অনুপস্থিত"
          value={stats.absentToday}
          icon={UserX}
          color="bg-red-500"
        />
        <StatCard
          title="মোট শ্রেণি"
          value={stats.totalClasses}
          icon={BookOpen}
          color="bg-purple-500"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
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
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              <Bar
                dataKey="Absent"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={40}
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
}

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  icon: Icon,
  color,
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace("bg-", "text-")}`} />
    </div>
  </div>
));

export default Dashboard;
