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
import { Download, Calendar, ChevronDown } from "lucide-react";
import clsx from "clsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import DatePicker from "react-datepicker";
import toast from "react-hot-toast";

import Papa from "papaparse";

const Reports: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { attendanceSessions } = useAttendance(orgId, user, classes, students, role);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1) // Default to start of current month
  );
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportPDF = async () => {
    const input = document.getElementById('report-container');
    if (!input) return;

    setIsExporting(true);
    const toastId = toast.loading("PDF তৈরি হচ্ছে...");

    try {
      const canvas = await html2canvas(input, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: input.scrollWidth,
        windowHeight: input.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('report-container');
          if (clonedElement) {
            clonedElement.style.width = `${input.offsetWidth}px`;
          }
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
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="bg-[#0a6ba3] text-white flex items-center px-4 py-2 rounded-[12px] hover:bg-[#0a6ba3]/90 transition-all duration-300 font-medium shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV এক্সপোর্ট
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="bg-[#0a6ba3] text-white flex items-center px-4 py-2 rounded-[12px] hover:bg-[#0a6ba3]/90 transition-all duration-300 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "প্রসেসিং..." : "PDF এক্সপোর্ট"}
          </button>
        </div>
      </div>

      <div id="report-container" className="card-premium p-4 sm:p-8 bg-white border border-[#0a6ba3]">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative min-w-[240px]">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input-premium w-full text-base font-medium text-[#0a4c87] border-[#0a6ba3] bg-white text-center appearance-none pr-10 rounded-xl py-3 shadow-sm hover:border-[#0a6ba3]/30 focus:border-[#0a6ba3] focus:ring-2 focus:ring-[#0a6ba3]/20 transition-all text-base"
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
              <div className="relative flex-1 sm:flex-none">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => date && setStartDate(date)}
                  dateFormat="dd MM yyyy"
                  className="input-premium pl-10 w-full text-base font-medium text-[#0766a9] border-[#0a6ba3] bg-white rounded-xl py-3 shadow-sm hover:border-[#0a6ba3]/30 focus:border-[#0a6ba3] focus:ring-2 focus:ring-[#0a6ba3]/20 transition-all"
                />
              </div>
              <span className="text-[#0a6ba3] font-medium text-xs sm:text-sm">থেকে</span>
              <div className="relative flex-1 sm:flex-none">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => date && setEndDate(date)}
                  dateFormat="dd MM yyyy"
                  className="input-premium pl-10 w-full text-base font-medium text-[#1d92e6] border-[#0a6ba3] bg-white rounded-xl py-3 shadow-sm hover:border-[#0a6ba3]/30 focus:border-[#0a6ba3] focus:ring-2 focus:ring-[#0a6ba3]/20 transition-all"
                />
              </div>
            </div>
        </div>

        {selectedClassId ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="h-80 bg-slate-50/50 rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-inner overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  হাজিরা ওভারভিউ
                </h3>
                <div className="w-full h-[calc(100%-2rem)]">
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
              </div>

              <div className="h-80 bg-slate-50/50 rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-inner overflow-hidden">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                  শিক্ষার্থীর পারফরম্যান্স (সেরা ১০)
                </h3>
                <div className="w-full h-[calc(100%-2rem)]">
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

            <div className="overflow-x-auto border border-[#E5E7EB] rounded-[16px] shadow-sm max-w-full">
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
                      key={student.roll}
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
            <p className="text-lg font-medium text-[#0a6ba3] mb-1">কোন শ্রেণি নির্বাচন করা হয়নি</p>
            <p className="text-sm">রিপোর্ট দেখার জন্য উপরের ড্রপডাউন থেকে একটি শ্রেণি নির্বাচন করুন।</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Reports);
