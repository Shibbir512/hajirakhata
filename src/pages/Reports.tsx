import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceStatus } from "../types";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { Download, Calendar, ChevronDown, Users } from "lucide-react";
import clsx from "clsx";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";
import DatePicker from "react-datepicker";
import toast from "react-hot-toast";

import Papa from "papaparse";

const Reports: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1) // Default to start of current month
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);

  const { attendanceSessions } = useAttendance(orgId, user, classes, students, role, {
    classId: selectedClassId || undefined,
    startDate,
    endDate,
  });

  const reportData = useMemo(() => {
    if (!selectedClassId) return [];

    const classStudents = students[selectedClassId] || [];
    const statsMap = new Map<string, { present: number, absent: number }>();
    
    classStudents.forEach(s => statsMap.set(s.id, { present: 0, absent: 0 }));

    attendanceSessions.forEach(session => {
      session.students.forEach((studentRecord: any) => {
        const stats = statsMap.get(studentRecord.studentId);
        if (stats) {
          if (studentRecord.status === AttendanceStatus.Present || studentRecord.status === AttendanceStatus.Late) {
            stats.present++;
          } else if (studentRecord.status === AttendanceStatus.Absent) {
            stats.absent++;
          }
        }
      });
    });

    return classStudents
      .map((student) => {
        const stats = statsMap.get(student.id) || { present: 0, absent: 0 };
        const total = stats.present + stats.absent;
        const percentage = total > 0 ? Math.round((stats.present / total) * 100) : 0;

        return {
          id: student.id,
          name: student.name,
          displayName: `${student.name} (${student.roll})`,
          roll: student.roll,
          present: stats.present,
          absent: stats.absent,
          percentage,
        };
      })
      .sort((a, b) => a.roll - b.roll);
  }, [selectedClassId, attendanceSessions, students]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    const toastId = toast.loading("PDF তৈরি হচ্ছে...");

    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for React to render loading state
      const input = document.getElementById('report-container');
      if (!input) throw new Error("Report container not found");

      const canvas = await toCanvas(input, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: input.scrollWidth,
        height: input.scrollHeight,
        style: {
          width: `${input.offsetWidth}px`,
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF ডাউনলোড সফল হয়েছে!", { id: toastId });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("PDF ডাউনলোড করতে ব্যর্থ হয়েছে।", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(reportData.map(s => ({
      Roll: s.roll,
      Name: s.name,
      Present: s.present,
      Absent: s.absent,
      Percentage: `${s.percentage}%`
    })));
    const csvWithBOM = "\uFEFF" + csv;
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const trendData = useMemo(() => {
    if (!selectedClassId) return [];
    
    // Aggregate present/total by date
    const dailyData: { [date: string]: { present: number, total: number } } = {};
    
    attendanceSessions.forEach(session => {
      if (!dailyData[session.date]) {
        dailyData[session.date] = { present: 0, total: 0 };
      }
      
      session.students.forEach((st: any) => {
        dailyData[session.date].total++;
        if (st.status === AttendanceStatus.Present || st.status === AttendanceStatus.Late) {
          dailyData[session.date].present++;
        }
      });
    });
    
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
    })).sort((a, b) => {
        const [d1, m1, y1] = a.date.split(" ").map(Number);
        const [d2, m2, y2] = b.date.split(" ").map(Number);
        return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
    });
  }, [selectedClassId, attendanceSessions]);

  const sessionData = useMemo(() => {
    if (!selectedClassId) return [];
    
    return attendanceSessions.map(session => {
        let present = 0;
        let total = session.students.length;
        session.students.forEach((st: any) => {
            if (st.status === AttendanceStatus.Present || st.status === AttendanceStatus.Late) {
                present++;
            }
        });
        return {
            id: session.id,
            session: `${session.date} ${session.time} (${session.id.substring(0, 4)})`,
            percentage: total > 0 ? Math.round((present / total) * 100) : 0
        };
    });
  }, [selectedClassId, attendanceSessions]);

  const heatmapData = useMemo(() => {
    if (!selectedClassId) return [];
    
    // Aggregate present/total by date
    const dailyData: { [date: string]: { present: number, total: number } } = {};
    
    attendanceSessions.forEach(session => {
      if (!dailyData[session.date]) {
        dailyData[session.date] = { present: 0, total: 0 };
      }
      
      session.students.forEach((st: any) => {
        dailyData[session.date].total++;
        if (st.status === AttendanceStatus.Present || st.status === AttendanceStatus.Late) {
          dailyData[session.date].present++;
        }
      });
    });
    
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
    }));
  }, [selectedClassId, attendanceSessions]);

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
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">রিপোর্ট</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleExportCSV}
            className="w-full sm:w-auto h-[48px] px-6 bg-[#0F5C7A] text-white font-bold rounded-xl hover:bg-[#0C6C8A] transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Download className="w-5 h-5" />
            CSV এক্সপোর্ট
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="w-full sm:w-auto h-[48px] px-6 bg-[#0F5C7A] text-white font-bold rounded-xl hover:bg-[#0C6C8A] transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            {isExporting ? "প্রসেসিং..." : "PDF এক্সপোর্ট"}
          </button>
        </div>
      </div>

      <div id="report-container" className="card-premium p-4 sm:p-8 bg-white border border-[#E5E7EB]">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative min-w-[240px]">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input-premium w-full text-base font-medium text-[#0F5C7A] border-[#D1D5DB] bg-white text-center appearance-none pr-10 rounded-xl py-3 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all text-base"
            >
              <option value="" className="text-slate-500 font-normal">শ্রেণি নির্বাচন করুন</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>

            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="relative flex-1 sm:flex-none min-w-[140px]">
                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => date && setStartDate(date)}
                  dateFormat="dd-MM-yyyy"
                  className="input-premium pl-8 pr-2 w-full text-sm sm:text-base font-medium text-[#0F5C7A] border-[#D1D5DB] bg-white rounded-xl py-3 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                />
              </div>
              <span className="text-[#0F5C7A] font-medium text-xs sm:text-sm">থেকে</span>
              <div className="relative flex-1 sm:flex-none min-w-[140px]">
                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => date && setEndDate(date)}
                  dateFormat="dd-MM-yyyy"
                  className="input-premium pl-8 pr-2 w-full text-sm sm:text-base font-medium text-[#0F5C7A] border-[#D1D5DB] bg-white rounded-xl py-3 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                />
              </div>
            </div>
        </div>

        {selectedClassId ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="h-80 bg-white rounded-[20px] p-4 sm:p-6 border border-[#E5E7EB] shadow-[0_8px_20px_rgba(0,0,0,0.05)] overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  হাজিরা ওভারভিউ
                </h3>
                <div className="w-full h-[calc(100%-2rem)]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
              </div>

              <div className="h-80 bg-white rounded-[20px] p-4 sm:p-6 border border-[#E5E7EB] shadow-[0_8px_20px_rgba(0,0,0,0.05)] overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  হাজিরা ট্রেন্ড (লাইন চার্ট)
                </h3>
                <div className="w-full h-[calc(100%-2rem)]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="percentage" stroke="#0F5C7A" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="h-80 bg-white rounded-[20px] p-4 sm:p-6 border border-[#E5E7EB] shadow-[0_8px_20px_rgba(0,0,0,0.05)] overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  সেশন অনুযায়ী উপস্থিতি (%)
                </h3>
                <div className="w-full h-[calc(100%-2rem)]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={sessionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="session" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#0F5C7A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="h-80 bg-white rounded-[20px] p-4 sm:p-6 border border-[#E5E7EB] shadow-[0_8px_20px_rgba(0,0,0,0.05)] overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  দৈনিক হাজিরার হিটম্যাপ
                </h3>
                <div className="flex flex-wrap gap-2 overflow-y-auto h-[calc(100%-2rem)]">
                  {heatmapData.map(d => (
                    <div key={d.date} className={clsx("w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold text-white", d.percentage > 75 ? "bg-emerald-500" : d.percentage > 50 ? "bg-amber-500" : "bg-rose-500")} title={`${d.date}: ${d.percentage}%`}>
                      {d.percentage}%
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-80 bg-white rounded-[20px] p-4 sm:p-6 border border-[#E5E7EB] shadow-[0_8px_20px_rgba(0,0,0,0.05)] overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  শিক্ষার্থীর পারফরম্যান্স (সেরা ১০)
                </h3>
                <div className="w-full h-[calc(100%-2rem)]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={reportData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="displayName" axisLine={false} tickLine={false} />
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
                      barSize={15}
                    />
                    <Bar
                      dataKey="absent"
                      name="অনুপস্থিত"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      barSize={15}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] max-w-full">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                      রোল
                    </th>
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                      শিক্ষার্থীর নাম
                    </th>
                    <th className="hidden sm:table-cell text-center py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                      উপস্থিত
                    </th>
                    <th className="hidden sm:table-cell text-center py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                      অনুপস্থিত
                    </th>
                    <th className="text-center py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                      শতকরা
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-5 text-slate-800 font-medium text-sm sm:text-base">
                        {student.roll}
                      </td>
                      <td className="py-4 px-5 text-slate-800 font-medium text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">
                        {student.name}
                      </td>
                      <td className="hidden sm:table-cell py-4 px-5 text-center text-emerald-600 font-medium text-sm sm:text-base">
                        {student.present}
                      </td>
                      <td className="hidden sm:table-cell py-4 px-5 text-center text-rose-600 font-medium text-sm sm:text-base">
                        {student.absent}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span
                          className={clsx(
                            "px-2.5 py-1 rounded-full text-xs font-bold",
                            student.percentage >= 75
                              ? "bg-emerald-100 text-emerald-700"
                              : student.percentage >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700",
                          )}
                        >
                          {student.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500">
                        এই সময়ের জন্য কোন হাজিরার রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-slate-500 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-lg font-medium text-[#0F5C7A] mb-1">কোন শ্রেণি নির্বাচন করা হয়নি</p>
            <p className="text-sm">রিপোর্ট দেখার জন্য উপরের ড্রপডাউন থেকে একটি শ্রেণি নির্বাচন করুন।</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Reports);
