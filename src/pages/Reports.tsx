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

import { startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";
import { toBengaliNumber, toEnglishNumber } from "../utils/dateFormatter";

const Reports: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const [showAllAbsent, setShowAllAbsent] = useState(false);

  const setDailyReport = () => {
    const today = new Date();
    setStartDate(startOfDay(today));
    setEndDate(endOfDay(today));
  };

  const setWeeklyReport = () => {
    const today = new Date();
    setStartDate(startOfWeek(today, { weekStartsOn: 6 })); // Assuming week starts on Saturday in Bangladesh
    setEndDate(endOfDay(today));
  };

  const setMonthlyReport = () => {
    const today = new Date();
    setStartDate(startOfMonth(today));
    setEndDate(endOfDay(today));
  };

  const { attendanceSessions } = useAttendance(orgId, user, classes, students, role, {
    classId: selectedClassId || undefined,
    startDate,
    endDate,
  });

  const reportData = useMemo(() => {
    if (selectedClassId) {
      const classStudents = (students[selectedClassId] || []).filter(s => s.isActive !== false);
      const statsMap = new Map<string, { present: number, absent: number, leave: number }>();
      
      classStudents.forEach(s => statsMap.set(s.id, { present: 0, absent: 0, leave: 0 }));

      // Group sessions by date to avoid counting the same day multiple times
      const sessionsByDate = new Map<string, any[]>();
      attendanceSessions.forEach(session => {
        const date = session.date;
        if (!sessionsByDate.has(date)) {
          sessionsByDate.set(date, []);
        }
        sessionsByDate.get(date)?.push(session);
      });

      // Process each date exactly once
      sessionsByDate.forEach((sessionsOnDate) => {
        const dailyStatusMap = new Map<string, string>();
        
        sessionsOnDate.forEach(session => {
          session.students.forEach((st: any) => {
             const sid = st.studentId;
             if (st.status === AttendanceStatus.Present || st.status === AttendanceStatus.Late) {
               dailyStatusMap.set(sid, 'present');
             } else if (st.status === AttendanceStatus.Leave) {
               if (dailyStatusMap.get(sid) !== 'present') dailyStatusMap.set(sid, 'leave');
             } else {
               if (dailyStatusMap.get(sid) !== 'present') dailyStatusMap.set(sid, 'absent');
             }
          });
        });

        dailyStatusMap.forEach((status, sid) => {
          const stats = statsMap.get(sid);
          if (stats) {
            if (status === 'present') stats.present++;
            else if (status === 'absent') stats.absent++;
            else if (status === 'leave') stats.leave++;
          }
        });
      });

      return classStudents
        .map((student) => {
          const stats = statsMap.get(student.id) || { present: 0, absent: 0, leave: 0 };
          const total = stats.present + stats.absent + stats.leave;
          const percentage = total > 0 ? Math.round((stats.present / total) * 100) : 0;

          return {
            id: student.id,
            name: student.name,
            displayName: `${student.name} (${student.roll})`,
            roll: student.roll,
            present: stats.present,
            absent: stats.absent,
            leave: stats.leave,
            percentage,
          };
        })
        .sort((a, b) => a.roll - b.roll);
    } else {
      // Combined Report: Class-wise summaries
      return classes.map(cls => {
        let present = 0;
        let absent = 0;
        let leave = 0;
        
        const classStudents = students[cls.id] || [];
        const activeStudentIds = new Set(classStudents.filter(s => s.isActive !== false).map(s => s.id));

        const classSessions = attendanceSessions.filter(s => s.classId === cls.id);
        
        const sessionsByDate = new Map<string, any[]>();
        classSessions.forEach(session => {
          const date = session.date;
          if (!sessionsByDate.has(date)) {
            sessionsByDate.set(date, []);
          }
          sessionsByDate.get(date)?.push(session);
        });

        sessionsByDate.forEach((sessionsOnDate) => {
          const dailyStatusMap = new Map<string, string>();
          
          sessionsOnDate.forEach(session => {
            session.students.forEach((st: any) => {
              if (!activeStudentIds.has(st.studentId)) return;
              
              const sid = st.studentId;
              if (st.status === AttendanceStatus.Present || st.status === AttendanceStatus.Late) {
                dailyStatusMap.set(sid, 'present');
              } else if (st.status === AttendanceStatus.Leave) {
                if (dailyStatusMap.get(sid) !== 'present') dailyStatusMap.set(sid, 'leave');
              } else {
                if (dailyStatusMap.get(sid) !== 'present') dailyStatusMap.set(sid, 'absent');
              }
            });
          });

          dailyStatusMap.forEach((status) => {
            if (status === 'present') present++;
            else if (status === 'absent') absent++;
            else if (status === 'leave') leave++;
          });
        });

        const total = present + absent + leave;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          id: cls.id,
          name: cls.name,
          displayName: cls.name,
          present,
          absent,
          leave,
          percentage,
          roll: 0 // Not applicable for classes
        };
      }).filter(c => c.present + c.absent + c.leave > 0);
    }
  }, [selectedClassId, attendanceSessions, students, classes]);

  const absentStudentsList = useMemo(() => {
    const list: any[] = [];
    
    // Group sessions by date and class
    const sessionsByDateAndClass = new Map<string, any[]>();
    
    attendanceSessions.forEach(session => {
      const key = `${session.date}_${session.classId}`;
      if (!sessionsByDateAndClass.has(key)) {
        sessionsByDateAndClass.set(key, []);
      }
      sessionsByDateAndClass.get(key)?.push(session);
    });

    sessionsByDateAndClass.forEach((sessions, key) => {
      const classId = sessions[0].classId;
      const date = sessions[0].date;
      const time = sessions[sessions.length - 1].time; // Use the latest time

      const classIndex = classes.findIndex(c => c.id === classId);
      const className = classIndex !== -1 ? classes[classIndex].name : "অজানা শ্রেণি";
      const classStudents = students[classId] || [];
      
      const dailyStatusMap = new Map<string, any>();
      
      sessions.forEach(session => {
        session.students.forEach((st: any) => {
          const sid = st.studentId;
          if (!dailyStatusMap.has(sid)) {
            dailyStatusMap.set(sid, { status: st.status, studentName: st.studentName, roll: st.roll });
          } else {
            // Update status resolving duplicates
            if (st.status === AttendanceStatus.Present || st.status === AttendanceStatus.Late) {
              dailyStatusMap.get(sid).status = 'present';
            } else if (st.status === AttendanceStatus.Leave) {
              if (dailyStatusMap.get(sid).status !== 'present') dailyStatusMap.get(sid).status = 'leave';
            } else {
              if (dailyStatusMap.get(sid).status !== 'present') dailyStatusMap.get(sid).status = 'absent';
            }
          }
        });
      });

      dailyStatusMap.forEach((data, sid) => {
        if (data.status === AttendanceStatus.Absent || data.status === 'absent') {
          const studentInfo = classStudents.find(s => s.id === sid);
          
          if (!studentInfo || studentInfo.isActive === false) return;

          const rawRoll = studentInfo ? studentInfo.roll : (data.roll ? parseInt(toEnglishNumber(data.roll.toString())) : 9999);
          const roll = studentInfo ? toBengaliNumber(studentInfo.roll) : (data.roll ? toBengaliNumber(data.roll) : "N/A");
          
          list.push({
            id: `${date}-${classId}-${sid}`,
            name: data.studentName,
            roll: roll,
            rawRoll: isNaN(rawRoll) ? 9999 : rawRoll,
            className,
            classIndex: classIndex !== -1 ? classIndex : 999,
            date: date,
            time: time
          });
        }
      });
    });

    // Sort by date (newest first), then class index, then roll
    return list.sort((a, b) => {
      const [d1, m1, y1] = a.date.split(" ").map(Number);
      const [d2, m2, y2] = b.date.split(" ").map(Number);
      const timeDiff = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
      
      if (timeDiff !== 0) return timeDiff;
      if (a.classIndex !== b.classIndex) return a.classIndex - b.classIndex;
      return a.rawRoll - b.rawRoll;
    });
  }, [attendanceSessions, classes, students]);

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
    // Aggregate present/total by date
    const dailyData: { [date: string]: { present: number, total: number } } = {};
    
    attendanceSessions.forEach(session => {
      if (!dailyData[session.date]) {
        dailyData[session.date] = { present: 0, total: 0 };
      }
      
      const classStudents = students[session.classId] || [];
      const activeStudentIds = new Set(classStudents.filter(s => s.isActive !== false).map(s => s.id));

      session.students.forEach((st: any) => {
        if (!activeStudentIds.has(st.studentId)) return; // Skip archived/deleted students

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
  }, [attendanceSessions, students]);

  const sessionData = useMemo(() => {
    return attendanceSessions.map(session => {
        let present = 0;
        let total = 0;
        
        const classStudents = students[session.classId] || [];
        const activeStudentIds = new Set(classStudents.filter(s => s.isActive !== false).map(s => s.id));

        session.students.forEach((st: any) => {
            if (!activeStudentIds.has(st.studentId)) return; // Skip archived/deleted students
            
            total++;
            if (st.status === AttendanceStatus.Present || st.status === AttendanceStatus.Late) {
                present++;
            }
        });
        const className = classes.find(c => c.id === session.classId)?.name || "";
        return {
            id: session.id,
            session: `${className} | ${session.date}`,
            percentage: total > 0 ? Math.round((present / total) * 100) : 0
        };
    });
  }, [attendanceSessions, classes, students]);

  const heatmapData = useMemo(() => {
    // Aggregate present/total by date
    const dailyData: { [date: string]: { present: number, total: number } } = {};
    
    attendanceSessions.forEach(session => {
      if (!dailyData[session.date]) {
        dailyData[session.date] = { present: 0, total: 0 };
      }
      
      const classStudents = students[session.classId] || [];
      const activeStudentIds = new Set(classStudents.filter(s => s.isActive !== false).map(s => s.id));

      session.students.forEach((st: any) => {
        if (!activeStudentIds.has(st.studentId)) return; // Skip archived/deleted students

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
  }, [attendanceSessions, students]);

  const pieData = useMemo(() => {
    const totalPresent = reportData.reduce(
      (acc, curr) => acc + curr.present,
      0,
    );
    const totalAbsent = reportData.reduce((acc, curr) => acc + curr.absent, 0);
    const totalLeave = reportData.reduce((acc, curr) => acc + (curr.leave || 0), 0);
    return [
      { name: "Present", value: totalPresent },
      { name: "Absent", value: totalAbsent },
      { name: "Leave", value: totalLeave },
    ];
  }, [reportData]);

  const COLORS = ["#22c55e", "#ef4444", "#f97316"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold gradient-text tracking-tight">রিপোর্ট</h2>
        <div className="flex flex-row gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex-1 h-[52px] px-4 bg-[#F1F5F9] text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-200 transition-all shadow-soft flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex-1 h-[52px] px-4 bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-soft flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "..." : "PDF"}
          </button>
        </div>
      </div>

      <div id="report-container" className="p-4 sm:p-8">
        <div className="flex flex-col gap-4 mb-8">
          <div className="relative w-full">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full pl-12 pr-10 h-[52px] bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#0F5C7A]/20 focus:border-[#0F5C7A] transition-all appearance-none cursor-pointer font-bold text-[#0c81a3] text-center shadow-soft text-base"
            >
              <option value="">সকল শ্রেণি (সম্মিলিত)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={setDailyReport}
              className="flex-1 h-[40px] bg-[#F1F5F9] text-[#0F5C7A] font-bold rounded-xl border border-slate-200 hover:bg-[#E2E8F0] transition-all text-sm"
            >
              আজকের
            </button>
            <button
              onClick={setWeeklyReport}
              className="flex-1 h-[40px] bg-[#F1F5F9] text-[#0F5C7A] font-bold rounded-xl border border-slate-200 hover:bg-[#E2E8F0] transition-all text-sm"
            >
              সাপ্তাহিক
            </button>
            <button
              onClick={setMonthlyReport}
              className="flex-1 h-[40px] bg-[#F1F5F9] text-[#0F5C7A] font-bold rounded-xl border border-slate-200 hover:bg-[#E2E8F0] transition-all text-sm"
            >
              মাসিক
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1 min-w-0">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) => date && setStartDate(date)}
                dateFormat="dd-MM-yyyy"
                className="w-full pl-10 pr-2 h-[52px] text-sm font-bold text-slate-700 bg-white border border-slate-100 rounded-2xl shadow-soft focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all text-center"
              />
            </div>
            <span className="text-slate-500 font-medium shrink-0">থেকে</span>
            <div className="relative flex-1 min-w-0">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => date && setEndDate(date)}
                dateFormat="dd-MM-yyyy"
                className="w-full pl-10 pr-2 h-[52px] text-sm font-bold text-slate-700 bg-white border border-slate-100 rounded-2xl shadow-soft focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all text-center"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="h-80 bg-white rounded-3xl p-6 border border-slate-100 shadow-soft overflow-hidden">
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
              {selectedClassId ? "সেশন অনুযায়ী উপস্থিতি (%)" : "শ্রেণি অনুযায়ী উপস্থিতি (%)"}
            </h3>
            <div className="w-full h-[calc(100%-2rem)]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={(selectedClassId ? sessionData : reportData) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={selectedClassId ? "session" : "name"} axisLine={false} tickLine={false} />
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
        </div>

        {!selectedClassId && absentStudentsList.length > 0 && (
          <div className="mb-8 overflow-hidden border border-rose-100 rounded-[20px] shadow-soft bg-rose-50/30">
            <div className="bg-rose-500 px-6 py-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Users className="w-5 h-5" />
                অনুপস্থিত শিক্ষার্থীদের তালিকা (সকল শ্রেণি)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-rose-50">
                  <tr>
                    <th className="py-3 px-5 text-xs font-bold text-rose-600 uppercase tracking-wider border-b border-rose-100">রোল</th>
                    <th className="py-3 px-5 text-xs font-bold text-rose-600 uppercase tracking-wider border-b border-rose-100">নাম</th>
                    <th className="py-3 px-5 text-xs font-bold text-rose-600 uppercase tracking-wider border-b border-rose-100">শ্রেণি</th>
                    <th className="py-3 px-5 text-xs font-bold text-rose-600 uppercase tracking-wider border-b border-rose-100">তারিখ</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllAbsent ? absentStudentsList : absentStudentsList.slice(0, 50)).map((s) => (
                    <tr key={s.id} className="border-b border-rose-50 hover:bg-rose-100/50 transition-colors">
                      <td className="py-3 px-5 text-slate-700 font-medium text-sm">{s.roll}</td>
                      <td className="py-3 px-5 text-slate-700 font-bold text-sm">{s.name}</td>
                      <td className="py-3 px-5 text-slate-700 font-medium text-sm">
                        <span className="bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-600 text-xs">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-500 text-xs">{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!showAllAbsent && absentStudentsList.length > 50 && (
                <button 
                  onClick={() => setShowAllAbsent(true)}
                  className="w-full p-3 text-center text-xs text-rose-600 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  আরও {toBengaliNumber(absentStudentsList.length - 50)} জন অনুপস্থিত আছে... (সব দেখুন)
                </button>
              )}
              {showAllAbsent && absentStudentsList.length > 50 && (
                <button 
                  onClick={() => setShowAllAbsent(false)}
                  className="w-full p-3 text-center text-xs text-rose-600 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  সংক্ষিপ্ত করুন
                </button>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] max-w-full">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
            <h3 className="text-slate-700 font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedClassId ? "শিক্ষার্থীর পারফরম্যান্স" : "শ্রেণি ভিত্তিক পারফরম্যান্স"}
            </h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  {selectedClassId ? "রোল" : "#"}
                </th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  {selectedClassId ? "শিক্ষার্থীর নাম" : "শ্রেণির নাম"}
                </th>
                <th className="hidden sm:table-cell text-center py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  উপস্থিত
                </th>
                <th className="hidden sm:table-cell text-center py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  অনুপস্থিত
                </th>
                <th className="hidden sm:table-cell text-center py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  ছুটি
                </th>
                <th className="text-center py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  শতকরা
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, index) => (
                <tr
                  key={item.id}
                  className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-5 text-slate-800 font-medium text-sm sm:text-base">
                    {selectedClassId ? toBengaliNumber(item.roll) : toBengaliNumber(index + 1)}
                  </td>
                  <td className="py-4 px-5 text-slate-800 font-bold text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">
                    {item.name}
                  </td>
                  <td className="hidden sm:table-cell py-4 px-5 text-center text-emerald-600 font-medium text-sm sm:text-base">
                    {item.present}
                  </td>
                  <td className="hidden sm:table-cell py-4 px-5 text-center text-rose-600 font-medium text-sm sm:text-base">
                    {item.absent}
                  </td>
                  <td className="hidden sm:table-cell py-4 px-5 text-center text-orange-600 font-medium text-sm sm:text-base">
                    {item.leave}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span
                      className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-bold",
                        item.percentage >= 75
                          ? "bg-emerald-100 text-emerald-700"
                          : item.percentage >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700",
                      )}
                    >
                      {item.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    এই সময়ের জন্য কোন হাজিরার রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Reports);
