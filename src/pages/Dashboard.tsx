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
  const { attendance } = useAttendance(orgId, user, classes, students);

  const stats = useMemo(() => {
    const totalStudents = Object.values(students).flat().length;
    const totalClasses = classes.length;

    const today = new Date().toISOString().split("T")[0];
    const todaysAttendance = attendance.filter((r) => {
      const recordDate = new Date(r.timestamp).toISOString().split("T")[0];
      return recordDate === today;
    });

    const presentToday = todaysAttendance.filter(
      (r) => r.status === "present",
    ).length;
    const absentToday = todaysAttendance.filter(
      (r) => r.status === "absent",
    ).length;

    return { totalStudents, totalClasses, presentToday, absentToday };
  }, [students, classes, attendance]);

  const chartData = useMemo(() => {
    // Generate data for the last 7 days
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayAttendance = attendance.filter((r) => {
        const recordDate = new Date(r.timestamp).toISOString().split("T")[0];
        return recordDate === dateStr;
      });

      const present = dayAttendance.filter(
        (r) => r.status === "present",
      ).length;
      const absent = dayAttendance.filter((r) => r.status === "absent").length;

      data.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        Present: present,
        Absent: absent,
      });
    }
    return data;
  }, [attendance]);

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
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
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
