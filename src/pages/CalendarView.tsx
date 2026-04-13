import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { useClasses } from "../hooks/useClasses";
import { useExams } from "../hooks/useExams";
import { useHolidays } from "../hooks/useHolidays";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Megaphone, 
  CheckCircle2, 
  FileText, 
  Palmtree, 
  Plus, 
  X, 
  Trash2,
  Clock,
  Info
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

const CalendarView: React.FC = () => {
  const { orgId, user, role } = useAuth();
  const { announcements } = useAnnouncements(orgId);
  const { classes } = useClasses(orgId, user, role);
  const { exams } = useExams(orgId, user);
  const { holidays, addHoliday, deleteHoliday } = useHolidays(orgId, user);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayStartDate, setHolidayStartDate] = useState("");
  const [holidayEndDate, setHolidayEndDate] = useState("");
  const [holidayType, setHolidayType] = useState<'holiday' | 'event'>('holiday');

  const isAdmin = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!orgId) return;
      setLoading(true);
      try {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        
        const q = query(
          collection(db, `organizations/${orgId}/attendance_sessions`),
          where("createdAt", ">=", Timestamp.fromDate(start)),
          where("createdAt", "<=", Timestamp.fromDate(end))
        );
        
        const snapshot = await getDocs(q);
        const sessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate() || new Date()
        }));
        
        setAttendanceSessions(sessions);
      } catch (error) {
        console.error("Error fetching attendance for calendar:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [orgId, currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName || !holidayStartDate || !holidayEndDate) {
      toast.error("সবগুলো ঘর পূরণ করুন");
      return;
    }
    
    const start = new Date(holidayStartDate).getTime();
    const end = new Date(holidayEndDate).getTime();
    
    addHoliday(holidayName, start, end, "", holidayType);
    setIsHolidayModalOpen(false);
    setHolidayName("");
    setHolidayStartDate("");
    setHolidayEndDate("");
  };

  const renderHeader = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-[#0F5C7A]" />
          ক্যালেন্ডার
        </h2>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>
            <span className="text-lg font-semibold text-slate-700 min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronRight className="w-6 h-6 text-slate-600" />
            </button>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsHolidayModalOpen(true)}
              className="btn-primary py-2 px-4 text-sm"
            >
              <Plus className="w-4 h-4" />
              ছুটি যোগ করুন
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-semibold text-sm text-slate-500 py-2">
          {format(addDays(startDate, i), "EEE")}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Find events for this day
        const dayAnnouncements = announcements.filter(a => {
          const createdAt: any = a.createdAt;
          const aDate = createdAt?.toDate ? createdAt.toDate() : (typeof createdAt === 'number' ? new Date(createdAt) : new Date());
          return isSameDay(aDate, cloneDay);
        });
        
        const dayAttendance = attendanceSessions.filter(s => isSameDay(s.date, cloneDay));
        
        const dayExams = exams.filter(e => e.examDate && isSameDay(new Date(e.examDate), cloneDay));
        
        const dayHolidays = holidays.filter(h => {
          const start = new Date(h.startDate);
          const end = new Date(h.endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          return isWithinInterval(cloneDay, { start, end });
        });

        days.push(
          <div
            key={day.toString()}
            onClick={() => setSelectedDate(cloneDay)}
            className={clsx(
              "min-h-[100px] p-2 border border-slate-100 transition-all cursor-pointer hover:bg-slate-50 relative",
              !isSameMonth(day, monthStart) ? "bg-slate-50/50 text-slate-400" : "bg-white text-slate-700",
              isSameDay(day, selectedDate || new Date()) ? "ring-2 ring-[#0F5C7A] ring-inset z-10" : "",
              isSameDay(day, new Date()) ? "bg-blue-50/30" : "",
              dayHolidays.length > 0 ? "bg-rose-50/30" : ""
            )}
          >
            <div className="flex justify-between items-start">
              <span className={clsx(
                "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                isSameDay(day, new Date()) ? "bg-[#0F5C7A] text-white" : ""
              )}>
                {formattedDate}
              </span>
            </div>
            
            <div className="mt-2 flex flex-col gap-1">
              {dayHolidays.length > 0 && (
                <div className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded flex items-center gap-1 truncate font-bold">
                  <Palmtree className="w-3 h-3 shrink-0" />
                  <span className="truncate">{dayHolidays[0].name}</span>
                </div>
              )}
              {dayExams.length > 0 && (
                <div className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded flex items-center gap-1 truncate font-bold">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{dayExams.length} পরীক্ষা</span>
                </div>
              )}
              {dayAnnouncements.length > 0 && (
                <div className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1 truncate">
                  <Megaphone className="w-3 h-3 shrink-0" />
                  <span className="truncate">{dayAnnouncements.length} ঘোষণা</span>
                </div>
              )}
              {dayAttendance.length > 0 && (
                <div className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{dayAttendance.length} হাজিরা</span>
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">{rows}</div>;
  };

  const renderSelectedDayDetails = () => {
    if (!selectedDate) return null;

    const dayAnnouncements = announcements.filter(a => {
      const createdAt: any = a.createdAt;
      const aDate = createdAt?.toDate ? createdAt.toDate() : (typeof createdAt === 'number' ? new Date(createdAt) : new Date());
      return isSameDay(aDate, selectedDate);
    });
    
    const dayAttendance = attendanceSessions.filter(s => isSameDay(s.date, selectedDate));
    
    const dayExams = exams.filter(e => e.examDate && isSameDay(new Date(e.examDate), selectedDate));
    
    const dayHolidays = holidays.filter(h => {
      const start = new Date(h.startDate);
      const end = new Date(h.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return isWithinInterval(selectedDate, { start, end });
    });

    const hasEvents = dayAnnouncements.length > 0 || dayAttendance.length > 0 || dayExams.length > 0 || dayHolidays.length > 0;

    return (
      <div className="mt-6 card-premium p-6 bg-white rounded-[20px]">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
          {format(selectedDate, "dd MMMM yyyy")} এর বিস্তারিত
        </h3>
        
        {!hasEvents ? (
          <div className="py-8 text-center">
            <CalendarIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 italic">এই দিনে কোনো ইভেন্ট বা কার্যক্রম নেই</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Holidays & Exams */}
            <div className="space-y-6">
              {dayHolidays.length > 0 && (
                <div>
                  <h4 className="font-semibold text-rose-700 flex items-center gap-2 mb-3">
                    <Palmtree className="w-4 h-4" />
                    ছুটি ও ইভেন্ট ({dayHolidays.length})
                  </h4>
                  <ul className="space-y-2">
                    {dayHolidays.map(h => (
                      <li key={h.id} className="bg-rose-50 p-3 rounded-lg text-sm text-slate-700 border border-rose-100 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-rose-900">{h.name}</p>
                          <p className="text-xs text-rose-600">
                            {format(new Date(h.startDate), "dd MMM")} - {format(new Date(h.endDate), "dd MMM")}
                          </p>
                        </div>
                        {isAdmin && (
                          <button 
                            onClick={() => deleteHoliday(h.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dayExams.length > 0 && (
                <div>
                  <h4 className="font-semibold text-indigo-700 flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4" />
                    পরীক্ষা ({dayExams.length})
                  </h4>
                  <ul className="space-y-2">
                    {dayExams.map(exam => {
                      const classData = classes.find(c => c.id === exam.classId);
                      return (
                        <li key={exam.id} className="bg-indigo-50 p-3 rounded-lg text-sm text-slate-700 border border-indigo-100">
                          <p className="font-bold text-indigo-900">{exam.name}</p>
                          <p className="text-xs text-indigo-600">শ্রেণি: {classData?.name || "সব শ্রেণি"}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Announcements & Attendance */}
            <div className="space-y-6">
              {dayAnnouncements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-amber-700 flex items-center gap-2 mb-3">
                    <Megaphone className="w-4 h-4" />
                    ঘোষণা ({dayAnnouncements.length})
                  </h4>
                  <ul className="space-y-2">
                    {dayAnnouncements.map(ann => (
                      <li key={ann.id} className="bg-amber-50 p-3 rounded-lg text-sm text-slate-700 border border-amber-100">
                        {ann.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {dayAttendance.length > 0 && (
                <div>
                  <h4 className="font-semibold text-emerald-700 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    হাজিরা সেশন ({dayAttendance.length})
                  </h4>
                  <ul className="space-y-2">
                    {dayAttendance.map(session => {
                      const classData = classes.find(c => c.id === session.classId);
                      const className = classData ? classData.name : `সেশন আইডি: ${session.id.substring(0, 8)}...`;
                      return (
                        <li key={session.id} className="bg-emerald-50 p-3 rounded-lg text-sm text-slate-700 border border-emerald-100 flex justify-between items-center">
                          <span>{className}</span>
                          <span className="text-xs font-medium bg-white px-2 py-1 rounded text-emerald-700">
                            {format(session.date, "hh:mm a")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {renderHeader()}
      <div className="card-premium p-4 bg-white rounded-[20px]">
        {renderDays()}
        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#0F5C7A]/20 border-t-[#0F5C7A] rounded-full animate-spin"></div>
          </div>
        ) : (
          renderCells()
        )}
      </div>
      {renderSelectedDayDetails()}

      {/* Holiday Modal */}
      {isHolidayModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-[6px] p-4">
          <div className="w-[92%] max-w-[400px] bg-white rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-6 text-white">
              <div className="flex items-center gap-3">
                <Palmtree className="w-6 h-6" />
                <h3 className="text-lg font-bold">নতুন ছুটি/ইভেন্ট</h3>
              </div>
              <button onClick={() => setIsHolidayModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">নাম</label>
                <input 
                  type="text" 
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="যেমন: ঈদুল ফিতর"
                  className="input-premium w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">শুরু</label>
                  <input 
                    type="date" 
                    value={holidayStartDate}
                    onChange={(e) => setHolidayStartDate(e.target.value)}
                    className="input-premium w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">শেষ</label>
                  <input 
                    type="date" 
                    value={holidayEndDate}
                    onChange={(e) => setHolidayEndDate(e.target.value)}
                    className="input-premium w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">ধরণ</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={holidayType === 'holiday'} 
                      onChange={() => setHolidayType('holiday')}
                      className="w-4 h-4 text-[#0F5C7A]"
                    />
                    <span className="text-sm">ছুটি</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={holidayType === 'event'} 
                      onChange={() => setHolidayType('event')}
                      className="w-4 h-4 text-[#0F5C7A]"
                    />
                    <span className="text-sm">ইভেন্ট</span>
                  </label>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  বাতিল
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#0F5C7A] text-white rounded-xl font-bold hover:bg-[#0D4D66] transition-all shadow-lg shadow-[#0F5C7A]/20"
                >
                  সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CalendarView;
