import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Calendar } from "lucide-react";
import clsx from "clsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Reports: React.FC = () => {
  const { user, orgId } = useAuth();
  const { classes } = useClasses(orgId, user);
  const { students } = useStudents(orgId, user);
  const { attendanceSessions } = useAttendance(orgId, user, classes, students);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const reportData = useMemo(() => {
    if (!selectedClassId) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const classStudents = students[selectedClassId] || [];

    // Filter sessions by date range and class
    const filteredSessions = attendanceSessions.filter((s) => {
      const [day, month, year] = s.date.split("-").map(Number);
      const sDate = new Date(year, month - 1, day);
      return s.classId === selectedClassId && sDate >= start && sDate <= end;
    });

    // Calculate stats per student
    return classStudents
      .map((student) => {
        let present = 0;
        let absent = 0;
        
        filteredSessions.forEach(session => {
          const studentRecord = session.students.find((st: any) => st.studentId === student.id);
          if (studentRecord) {
            if (studentRecord.status === "present") present++;
            else absent++;
          }
        });

        const total = present + absent;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          name: student.name,
          roll: student.roll,
          present,
          absent,
          percentage,
        };
      })
      .sort((a, b) => a.roll - b.roll);
  }, [selectedClassId, startDate, endDate, attendanceSessions, students]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 15);
    autoTable(doc, {
      head: [['Roll', 'Name', 'Present', 'Absent', 'Percentage']],
      body: reportData.map(s => [s.roll, s.name, s.present, s.absent, s.percentage + '%']),
    });
    doc.save("attendance-report.pdf");
  };

  const pieData = useMemo(() => {
    const totalPresent = reportData.reduce(
      (acc, curr) => acc + curr.present,
      0,
    );
    const totalAbsent = reportData.reduce((acc, curr) => acc + curr.absent, 0);
    return [
      { name: "Present", value: totalPresent },
      { name: "Absent", value: totalAbsent },
    ];
  }, [reportData]);

  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">রিপোর্ট</h2>
        <button 
          onClick={handleExportPDF}
          className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          PDF এক্সপোর্ট
        </button>
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

          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-slate-500 font-medium">থেকে</span>
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {selectedClassId ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="h-80 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  হাজিরা ওভারভিউ
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="h-80 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  শিক্ষার্থীর পারফরম্যান্স (সেরা ১০)
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="present"
                      name="উপস্থিত"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="absent"
                      name="অনুপস্থিত"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
                      রোল
                    </th>
                    <th className="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
                      শিক্ষার্থীর নাম
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
                      উপস্থিত
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
                      অনুপস্থিত
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
                      শতকরা
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((student) => (
                    <tr
                      key={student.roll}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-800">
                        {student.roll}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {student.name}
                      </td>
                      <td className="py-3 px-4 text-center text-green-600 font-medium">
                        {student.present}
                      </td>
                      <td className="py-3 px-4 text-center text-red-600 font-medium">
                        {student.absent}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={clsx(
                            "px-2 py-1 rounded-full text-xs font-bold",
                            student.percentage >= 75
                              ? "bg-green-100 text-green-700"
                              : student.percentage >= 50
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700",
                          )}
                        >
                          {student.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500">
                        এই সময়ের জন্য কোন হাজিরার রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p className="text-lg font-medium text-slate-600 mb-1">কোন শ্রেণি নির্বাচন করা হয়নি</p>
            <p className="text-sm">রিপোর্ট দেখার জন্য উপরের ড্রপডাউন থেকে একটি শ্রেণি নির্বাচন করুন।</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Reports);
