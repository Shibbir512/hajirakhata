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
import { Download, Calendar, ChevronDown, Users, Printer, Database, Filter } from "lucide-react";
import clsx from "clsx";
import DatePicker from "react-datepicker";
import toast from "react-hot-toast";
import DataBackupModal from "../components/DataBackupModal";

import { startOfDay, endOfDay, startOfWeek, startOfMonth, format } from "date-fns";
import { toBengaliNumber, toEnglishNumber, getTodayISO } from "../utils/dateFormatter";
import AttendanceNavTabs from "../components/AttendanceNavTabs";
import { ClassSelect } from "../components/ClassSelect";

const Reports: React.FC = () => {
  const { user, orgId, role, orgName } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const [showAllAbsent, setShowAllAbsent] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [absentFilterClassId, setAbsentFilterClassId] = useState<string>("");
  const [absentFilterStartDate, setAbsentFilterStartDate] = useState<string>("");
  const [absentFilterEndDate, setAbsentFilterEndDate] = useState<string>("");

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

  // Unique class names from absent students for filter dropdown, sorted by classes page order
  const absentFilterOptions = useMemo(() => {
    const absentClassNames = new Set<string>();
    absentStudentsList.forEach(s => {
      absentClassNames.add(s.className);
    });
    // Keep only classes that have absent students, in the same order as the classes array
    const classNames = classes
      .map(c => c.name)
      .filter(name => absentClassNames.has(name));
    return { classNames };
  }, [absentStudentsList, classes]);

  // Helper: parse "dd mm yyyy" date string to Date object for comparison
  const parseAbsentDate = (dateStr: string): Date => {
    const [d, m, y] = dateStr.split(" ").map(Number);
    return new Date(y, m - 1, d);
  };

  // Helper: parse "yyyy-mm-dd" (from input[type=date]) to local Date
  const parseInputDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Filtered absent students list
  const filteredAbsentStudents = useMemo(() => {
    // If only one date is given, use it as both start and end (single day filter)
    const rawStart = absentFilterStartDate || absentFilterEndDate || null;
    const rawEnd = absentFilterEndDate || absentFilterStartDate || null;
    const startDateObj = rawStart ? parseInputDate(rawStart) : null;
    const endDateObj = rawEnd ? parseInputDate(rawEnd) : null;
    // Set end date to end of day for inclusive comparison
    if (endDateObj) endDateObj.setHours(23, 59, 59, 999);

    return absentStudentsList.filter(s => {
      if (absentFilterClassId && s.className !== absentFilterClassId) return false;
      if (startDateObj || endDateObj) {
        const sDate = parseAbsentDate(s.date);
        if (startDateObj && sDate < startDateObj) return false;
        if (endDateObj && sDate > endDateObj) return false;
      }
      return true;
    });
  }, [absentStudentsList, absentFilterClassId, absentFilterStartDate, absentFilterEndDate]);

  const isAbsentFilterActive = !!(absentFilterClassId || absentFilterStartDate || absentFilterEndDate);

  const handleExportPDF = async () => {
    setIsExporting(true);
    const toastId = toast.loading("PDF তৈরি হচ্ছে...");

    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for React to render loading state
      const input = document.getElementById('report-container');
      if (!input) throw new Error("Report container not found");

      const { toCanvas } = await import("html-to-image");
      const { default: jsPDF } = await import("jspdf");

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
      
      pdf.save(`attendance-report-${getTodayISO()}.pdf`);
      toast.success("PDF ডাউনলোড সফল হয়েছে!", { id: toastId });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("PDF ডাউনলোড করতে ব্যর্থ হয়েছে।", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    const { default: Papa } = await import("papaparse");
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
    a.download = `attendance-report-${getTodayISO()}.csv`;
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

  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || 'সকল শ্রেণি (সম্মিলিত)';
  const formattedStartDate = format(startDate, "dd/MM/yyyy");
  const formattedEndDate = format(endDate, "dd/MM/yyyy");

  return (
    <div className="space-y-6">
      <AttendanceNavTabs />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">হাজিরা রিপোর্ট</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">উপস্থিতি ও অনুপস্থিতির সার্বিক পরিসংখ্যান</p>
        </div>
        <div className="flex flex-wrap sm:flex-row gap-3 print:hidden">
          <button 
            onClick={() => setIsBackupModalOpen(true)}
            className="h-[52px] px-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all shadow-soft flex items-center justify-center gap-2 text-sm shrink-0"
            title="সম্পূর্ণ ডাটাবেজ ব্যাকআপ (JSON)"
          >
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            JSON ব্যাকআপ
          </button>
          <button 
            onClick={() => window.print()}
            className="h-[52px] px-4 bg-[#0F5C7A] text-white font-bold rounded-xl hover:bg-[#0c4b63] transition-all shadow-soft flex items-center justify-center gap-2 text-sm"
            title="প্রিন্ট করুন"
          >
            <Printer className="w-4 h-4" />
            প্রিন্ট
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex-1 h-[52px] px-4 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-soft flex items-center justify-center gap-2 text-sm"
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
        {/* Official Printable Header (Appears only on print) */}
        <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold text-black">{orgName || "মাদরাসা / প্রতিষ্ঠান"}</h1>
          <h2 className="text-lg font-bold text-black mt-1">শিক্ষার্থী হাজিরা বিবরণী ও পারফরম্যান্স রিপোর্ট</h2>
          <div className="flex justify-center gap-6 mt-2 text-sm text-black">
            <span><strong>শ্রেণি:</strong> {selectedClassName}</span>
            <span><strong>সময়কাল:</strong> {formattedStartDate} থেকে {formattedEndDate}</span>
            <span><strong>প্রিন্টের তারিখ:</strong> {new Date().toLocaleDateString('bn-BD')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-8 print:hidden">
          <div className="w-full">
            <ClassSelect
              value={selectedClassId}
              onChange={(id) => setSelectedClassId(id)}
              classes={classes}
              allOptionLabel="সকল শ্রেণি (সম্মিলিত)"
              placeholder="শ্রেণি নির্বাচন করুন"
            />
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={setDailyReport}
              className="flex-1 h-[40px] bg-[#F1F5F9] dark:bg-slate-800 text-[#0F5C7A] dark:text-teal-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-all text-sm"
            >
              আজকের
            </button>
            <button
              onClick={setWeeklyReport}
              className="flex-1 h-[40px] bg-[#F1F5F9] dark:bg-slate-800 text-[#0F5C7A] dark:text-teal-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-all text-sm"
            >
              সাপ্তাহিক
            </button>
            <button
              onClick={setMonthlyReport}
              className="flex-1 h-[40px] bg-[#F1F5F9] dark:bg-slate-800 text-[#0F5C7A] dark:text-teal-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-all text-sm"
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
                className="w-full pl-10 pr-2 h-[52px] text-sm font-bold text-slate-700 dark:text-slate-100 bg-white dark:bg-[#111C2E] border border-slate-100 dark:border-slate-700 rounded-2xl shadow-soft focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all text-center"
              />
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">থেকে</span>
            <div className="relative flex-1 min-w-0">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 z-10" />
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) => date && setEndDate(date)}
                dateFormat="dd-MM-yyyy"
                className="w-full pl-10 pr-2 h-[52px] text-sm font-bold text-slate-700 dark:text-slate-100 bg-white dark:bg-[#111C2E] border border-slate-100 dark:border-slate-700 rounded-2xl shadow-soft focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all text-center"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 print:hidden">
          <div className="h-80 bg-white dark:bg-[#111C2E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100 mb-4 text-center">
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
                    backgroundColor: "#111C2E",
                    color: "#F8FAFC",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          </div>

          <div className="h-80 bg-white dark:bg-[#111C2E] rounded-[20px] p-4 sm:p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-[0_8px_20px_rgba(0,0,0,0.05)] overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100 mb-4 text-center">
              হাজিরা ট্রেন্ড (লাইন চার্ট)
            </h3>
            <div className="w-full h-[calc(100%-2rem)]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} stroke="#94A3B8" />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} stroke="#94A3B8" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#111C2E",
                      color: "#F8FAFC",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
                    }}
                  />
                  <Line type="monotone" dataKey="percentage" stroke="#0F5C7A" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="h-80 bg-white dark:bg-[#111C2E] rounded-[20px] p-4 sm:p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-[0_8px_20px_rgba(0,0,0,0.05)] overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100 mb-4 text-center">
              {selectedClassId ? "সেশন অনুযায়ী উপস্থিতি (%)" : "শ্রেণি অনুযায়ী উপস্থিতি (%)"}
            </h3>
            <div className="w-full h-[calc(100%-2rem)]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={(selectedClassId ? sessionData : reportData) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                  <XAxis dataKey={selectedClassId ? "session" : "name"} axisLine={false} tickLine={false} stroke="#94A3B8" />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} stroke="#94A3B8" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "#111C2E",
                      color: "#F8FAFC",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
                    }}
                  />
                  <Bar dataKey="percentage" fill="#0F5C7A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="h-80 bg-white dark:bg-[#111C2E] rounded-[20px] p-4 sm:p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-[0_8px_20px_rgba(0,0,0,0.05)] overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100 mb-4 text-center">
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
          <div className="mb-8 overflow-hidden border border-rose-100 dark:border-rose-950/60 rounded-[20px] shadow-soft bg-rose-50/30 dark:bg-rose-950/20">
            <div className="bg-rose-500 px-4 sm:px-6 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-white font-bold flex items-center gap-2 shrink-0">
                  <Users className="w-5 h-5" />
                  অনুপস্থিত শিক্ষার্থীদের তালিকা
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <ClassSelect
                      value={absentFilterClassId}
                      onChange={(id) => { setAbsentFilterClassId(id); setShowAllAbsent(false); }}
                      options={absentFilterOptions.classNames.map(cn => ({ id: cn, name: cn }))}
                      allOptionLabel="সকল শ্রেণি"
                      placeholder="সকল শ্রেণি"
                      size="sm"
                      icon={Filter}
                      title="অনুপস্থিত শ্রেণি নির্বাচন"
                      className="min-w-[140px]"
                      buttonClassName="bg-white/95 dark:bg-slate-900/95 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400 pointer-events-none" />
                      <input
                        type="date"
                        value={absentFilterStartDate}
                        onChange={(e) => { setAbsentFilterStartDate(e.target.value); setShowAllAbsent(false); }}
                        className="pl-7 pr-2 py-1.5 text-xs font-bold rounded-lg bg-white/90 dark:bg-slate-900/90 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-800 focus:ring-2 focus:ring-white/30 focus:border-white cursor-pointer w-[130px]"
                        title="শুরুর তারিখ"
                      />
                    </div>
                    <span className="text-white/80 text-xs font-medium">থেকে</span>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400 pointer-events-none" />
                      <input
                        type="date"
                        value={absentFilterEndDate}
                        onChange={(e) => { setAbsentFilterEndDate(e.target.value); setShowAllAbsent(false); }}
                        className="pl-7 pr-2 py-1.5 text-xs font-bold rounded-lg bg-white/90 dark:bg-slate-900/90 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-800 focus:ring-2 focus:ring-white/30 focus:border-white cursor-pointer w-[130px]"
                        title="শেষ তারিখ"
                      />
                    </div>
                  </div>
                  {isAbsentFilterActive && (
                    <button
                      onClick={() => { setAbsentFilterClassId(""); setAbsentFilterStartDate(""); setAbsentFilterEndDate(""); setShowAllAbsent(false); }}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-colors cursor-pointer"
                    >
                      রিসেট
                    </button>
                  )}
                </div>
              </div>
              {isAbsentFilterActive && (
                <div className="mt-2 text-rose-100 text-xs font-medium">
                  ফলাফল: {toBengaliNumber(filteredAbsentStudents.length)} জন
                  {absentFilterClassId && <span> | শ্রেণি: {absentFilterClassId}</span>}
                  {absentFilterStartDate && <span> | শুরু: {absentFilterStartDate.split('-').reverse().join('.')}</span>}
                  {absentFilterEndDate && <span> | শেষ: {absentFilterEndDate.split('-').reverse().join('.')}</span>}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-rose-50 dark:bg-rose-950/60">
                  <tr>
                    <th className="py-3 px-5 text-xs font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wider border-b border-rose-100 dark:border-rose-900/60">রোল</th>
                    <th className="py-3 px-5 text-xs font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wider border-b border-rose-100 dark:border-rose-900/60">নাম</th>
                    <th className="py-3 px-5 text-xs font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wider border-b border-rose-100 dark:border-rose-900/60">শ্রেণি</th>
                    <th className="py-3 px-5 text-xs font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wider border-b border-rose-100 dark:border-rose-900/60">তারিখ</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllAbsent ? filteredAbsentStudents : filteredAbsentStudents.slice(0, 50)).map((s) => (
                    <tr key={s.id} className="border-b border-rose-50 dark:border-rose-950/40 hover:bg-rose-100/50 dark:hover:bg-rose-950/30 transition-colors">
                      <td className="py-3 px-5 text-slate-700 dark:text-slate-200 font-medium text-sm">{s.roll}</td>
                      <td className="py-3 px-5 text-slate-700 dark:text-slate-100 font-bold text-sm">{s.name}</td>
                      <td className="py-3 px-5 text-slate-700 dark:text-slate-200 font-medium text-sm">
                        <span className="bg-white dark:bg-rose-900/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-200 text-xs">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-500 dark:text-slate-400 text-xs">{s.date}</td>
                    </tr>
                  ))}
                  {filteredAbsentStudents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                        এই ফিল্টারে কোন অনুপস্থিত শিক্ষার্থী পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {!showAllAbsent && filteredAbsentStudents.length > 50 && (
                <button 
                  onClick={() => setShowAllAbsent(true)}
                  className="w-full p-3 text-center text-xs text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  আরও {toBengaliNumber(filteredAbsentStudents.length - 50)} জন অনুপস্থিত আছে... (সব দেখুন)
                </button>
              )}
              {showAllAbsent && filteredAbsentStudents.length > 50 && (
                <button 
                  onClick={() => setShowAllAbsent(false)}
                  className="w-full p-3 text-center text-xs text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  সংক্ষিপ্ত করুন
                </button>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-[#111C2E] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] max-w-full">
          <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedClassId ? "শিক্ষার্থীর পারফরম্যান্স" : "শ্রেণি ভিত্তিক পারফরম্যান্স"}
            </h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8F9FA] dark:bg-slate-900/90 sticky top-0 z-10">
              <tr>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB] dark:border-slate-800">
                  {selectedClassId ? "রোল" : "#"}
                </th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB] dark:border-slate-800">
                  {selectedClassId ? "শিক্ষার্থীর নাম" : "শ্রেণির নাম"}
                </th>
                <th className="hidden sm:table-cell text-center py-3.5 px-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB] dark:border-slate-800">
                  উপস্থিত
                </th>
                <th className="hidden sm:table-cell text-center py-3.5 px-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB] dark:border-slate-800">
                  অনুপস্থিত
                </th>
                <th className="hidden sm:table-cell text-center py-3.5 px-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB] dark:border-slate-800">
                  ছুটি
                </th>
                <th className="text-center py-3.5 px-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-[#E5E7EB] dark:border-slate-800">
                  শতকরা
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, index) => (
                <tr
                  key={item.id}
                  className="border-b border-[#E5E7EB] dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-4 px-5 text-slate-800 dark:text-slate-200 font-medium text-sm sm:text-base">
                    {selectedClassId ? toBengaliNumber(item.roll) : toBengaliNumber(index + 1)}
                  </td>
                  <td className="py-4 px-5 text-slate-800 dark:text-slate-100 font-bold text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">
                    {item.name}
                  </td>
                  <td className="hidden sm:table-cell py-4 px-5 text-center text-emerald-600 dark:text-emerald-400 font-medium text-sm sm:text-base">
                    {item.present}
                  </td>
                  <td className="hidden sm:table-cell py-4 px-5 text-center text-rose-600 dark:text-rose-400 font-medium text-sm sm:text-base">
                    {item.absent}
                  </td>
                  <td className="hidden sm:table-cell py-4 px-5 text-center text-orange-600 dark:text-orange-400 font-medium text-sm sm:text-base">
                    {item.leave}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span
                      className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-bold border",
                        item.percentage >= 75
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : item.percentage >= 50
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
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
      <DataBackupModal isOpen={isBackupModalOpen} onClose={() => setIsBackupModalOpen(false)} />
    </div>
  );
};

export default React.memo(Reports);
