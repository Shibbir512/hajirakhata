import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { useClasses } from "../hooks/useClasses";
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
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Megaphone, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

const CalendarView: React.FC = () => {
  const { orgId, user, role } = useAuth();
  const { announcements } = useAnnouncements(orgId);
  const { classes } = useClasses(orgId, user, role);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-[#0F5C7A]" />
          ক্যালেন্ডার
        </h2>
        <div className="flex items-center gap-4">
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

        days.push(
          <div
            key={day.toString()}
            onClick={() => setSelectedDate(cloneDay)}
            className={clsx(
              "min-h-[100px] p-2 border border-slate-100 transition-all cursor-pointer hover:bg-slate-50",
              !isSameMonth(day, monthStart) ? "bg-slate-50/50 text-slate-400" : "bg-white text-slate-700",
              isSameDay(day, selectedDate || new Date()) ? "ring-2 ring-[#0F5C7A] ring-inset" : "",
              isSameDay(day, new Date()) ? "bg-blue-50/30" : ""
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
              {dayAnnouncements.length > 0 && (
                <div className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1 truncate">
                  <Megaphone className="w-3 h-3 shrink-0" />
                  <span className="truncate">{dayAnnouncements.length} ঘোষণা</span>
                </div>
              )}
              {dayAttendance.length > 0 && (
                <div className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{dayAttendance.length} হাজিরা সেশন</span>
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

    return (
      <div className="mt-6 card-premium p-6 bg-white rounded-[20px]">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
          {format(selectedDate, "dd MMMM yyyy")} এর বিস্তারিত
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-amber-500" />
              ঘোষণা ({dayAnnouncements.length})
            </h4>
            {dayAnnouncements.length > 0 ? (
              <ul className="space-y-2">
                {dayAnnouncements.map(ann => (
                  <li key={ann.id} className="bg-amber-50 p-3 rounded-lg text-sm text-slate-700 border border-amber-100">
                    {ann.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">কোনো ঘোষণা নেই</p>
            )}
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              হাজিরা সেশন ({dayAttendance.length})
            </h4>
            {dayAttendance.length > 0 ? (
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
            ) : (
              <p className="text-sm text-slate-500 italic">কোনো হাজিরা সেশন নেই</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
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
    </div>
  );
};

export default CalendarView;
