import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useLeaves } from "../hooks/useLeaves";
import { CalendarDays, Plus, List, Trash2, Edit, CheckCircle, X, Search, ChevronDown, Clock } from "lucide-react";
import { toBengaliNumber, toBengaliDate, getTodayISO, toEnglishNumber, normalizeDateToISO, isLeaveActiveNow } from "../utils/dateFormatter";
import clsx from "clsx";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";

const LeaveManagement: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { leaves, addLeaves, updateLeave, deleteLeave } = useLeaves(orgId, user);

  const [activeTab, setActiveTab] = useState<"today" | "add" | "view">("today");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(getTodayISO());
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [startTime, setStartTime] = useState<string>(currentTime);
  
  const [endDate, setEndDate] = useState<string>(getTodayISO());
  const [endTime, setEndTime] = useState<string>("14:00");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // View Tab Filters
  const [viewClassId, setViewClassId] = useState<string>("");
  const [viewSearchQuery, setViewSearchQuery] = useState("");
  
  // Edit/Delete Modals
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [deletingLeave, setDeletingLeave] = useState<any>(null);

  const classStudents = useMemo(() => {
    let list: any[] = [];
    if (selectedClassId) {
      list = students[selectedClassId] || [];
    } else {
      list = Object.values(students).flat();
    }
    return list.filter(s => s.isActive !== false);
  }, [selectedClassId, students]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery && !selectedClassId) return []; // Don't show all students if no class and no search
    if (!searchQuery) return classStudents;
    const query = searchQuery.toLowerCase();
    const englishQuery = toEnglishNumber(query);
    
    return classStudents.filter(s => {
      const nameMatch = s.name.toLowerCase().includes(query);
      const rollMatch = s.roll.toString().includes(englishQuery);
      
      const uidMatch = s.studentUid && s.studentUid.toLowerCase().includes(englishQuery);
      
      return nameMatch || rollMatch || uidMatch;
    });
  }, [classStudents, searchQuery]);

  const toggleStudentSelection = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleAddLeaves = () => {
    if (selectedStudents.size === 0) {
      toast.error("অন্তত একজন শিক্ষার্থী নির্বাচন করুন");
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      toast.error("তারিখ ও সময় নির্বাচন করুন");
      return;
    }

    const leaveData = Array.from(selectedStudents).map(studentId => {
      let studentClassId = selectedClassId;
      if (!studentClassId) {
        for (const cId in students) {
          if (students[cId].some(s => s.id === studentId)) {
            studentClassId = cId;
            break;
          }
        }
      }

      return {
        studentId,
        classId: studentClassId,
        startDate,
        startTime,
        endDate,
        endTime,
        note: studentNotes[studentId] || "",
        status: 'approved' as const,
      };
    });

    addLeaves(leaveData);
    setSelectedStudents(new Set());
    setStudentNotes({});
  };

  const getStudentName = (studentId: string, classId: string) => {
    const studentList = students[classId] || [];
    const student = studentList.find(s => s.id === studentId);
    return student ? student.name : "অজানা শিক্ষার্থী";
  };

  const getStudentRoll = (studentId: string, classId: string) => {
    const studentList = students[classId] || [];
    const student = studentList.find(s => s.id === studentId);
    return student ? student.roll : "-";
  };

  const getClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? cls.name : "অজানা শ্রেণি";
  };

  // Group leaves by date
  const groupedLeaves = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    // Filter leaves based on viewClassId and viewSearchQuery
    const filteredViewLeaves = leaves.filter(leave => {
      if (viewClassId && leave.classId !== viewClassId) return false;
      
      if (viewSearchQuery) {
        const studentName = getStudentName(leave.studentId, leave.classId).toLowerCase();
        const studentRoll = getStudentRoll(leave.studentId, leave.classId).toString();
        
        // Find student to get studentUid
        const studentList = students[leave.classId] || [];
        const student = studentList.find(s => s.id === leave.studentId);
        const studentUid = student?.studentUid?.toLowerCase() || "";

        const query = viewSearchQuery.toLowerCase();
        const englishQuery = toEnglishNumber(query);
        
        const matchesName = studentName.includes(query);
        const matchesRoll = studentRoll.includes(englishQuery);
        const matchesUid = studentUid && studentUid.includes(englishQuery);

        if (!matchesName && !matchesRoll && !matchesUid) {
          return false;
        }
      }
      
      return true;
    });

    filteredViewLeaves.forEach(leave => {
      const dateKey = leave.startDate || leave.date || "Unknown";
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(leave);
    });
    
    // Sort dates descending
    return Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => ({
      date,
      leaves: groups[date]
    }));
  }, [leaves, viewClassId, viewSearchQuery, students]);

  const todayLeavesList = useMemo(() => {
    return leaves.filter(leave => isLeaveActiveNow(leave));
  }, [leaves]);

  const leaveStats = useMemo(() => {
    const todayISO = getTodayISO();
    
    let activeNow = 0;
    let endingToday = 0;
    
    leaves.forEach(leave => {
      if (isLeaveActiveNow(leave)) {
        activeNow++;
        const eDate = normalizeDateToISO(leave.endDate || leave.date);
        if (eDate === todayISO) endingToday++;
      }
    });
    
    return { activeNow, endingToday };
  }, [leaves]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] min-h-screen p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-[#0a9880] border-l-4 border-[#1d45a4] pl-3 tracking-tight" style={{ fontFamily: "Georgia" }}>
          ছুটি ব্যবস্থাপনা
        </h2>

        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আজ ছুটিতে</p>
              <p className="text-lg font-bold text-blue-600 leading-tight">{toBengaliNumber(leaveStats.activeNow)} <span className="text-xs font-normal">জন</span></p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">আজ শেষ হবে</p>
              <p className="text-lg font-bold text-amber-600 leading-tight">{toBengaliNumber(leaveStats.endingToday)} <span className="text-xs font-normal">জন</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab("today")}
          className={clsx(
            "flex items-center whitespace-nowrap gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300",
            activeTab === "today" 
              ? "bg-[#0F5C7A] text-white shadow-md" 
              : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <CalendarDays className="w-5 h-5" />
          আজকের ছুটি
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={clsx(
            "flex items-center whitespace-nowrap gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300",
            activeTab === "add" 
              ? "bg-[#0F5C7A] text-white shadow-md" 
              : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <Plus className="w-5 h-5" />
          ছুটির তালিকায় যুক্ত করুন
        </button>
        <button
          onClick={() => setActiveTab("view")}
          className={clsx(
            "flex items-center whitespace-nowrap gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300",
            activeTab === "view" 
              ? "bg-[#0F5C7A] text-white shadow-md" 
              : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <List className="w-5 h-5" />
          তালিকা দেখুন
        </button>
      </div>

      {activeTab === "today" && (
        <div className="bg-white text-slate-800 rounded-3xl shadow-sm border border-slate-100 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
             <CalendarDays className="w-6 h-6 text-[#0F5C7A]" />
             আজকের ছুটিতে যারা আছে
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {todayLeavesList.length > 0 ? todayLeavesList.map(leave => {
               const todayISO = getTodayISO();
               const isEndingToday = normalizeDateToISO(leave.endDate || leave.date) === todayISO;
               
               return (
                 <div key={leave.id} className="p-5 border border-slate-200 rounded-2xl bg-[#F8FAFC] relative overflow-hidden group hover:shadow-md transition-all">
                   {isEndingToday && (
                     <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">
                       আজই ছুটি শেষ
                     </div>
                   )}
                   <div className="flex gap-4 items-center mb-4">
                     <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-[#0F5C7A] font-bold text-lg border border-slate-100">
                       {toBengaliNumber(getStudentRoll(leave.studentId, leave.classId))}
                     </div>
                     <div>
                       <h4 className="font-bold text-slate-800 text-lg leading-tight">{getStudentName(leave.studentId, leave.classId)}</h4>
                       <p className="text-sm font-medium text-slate-500">{getClassName(leave.classId)}</p>
                     </div>
                   </div>
                   <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2.5">
                     <div className="flex gap-2 text-[13px]">
                       <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                       <span className="text-slate-600 font-medium leading-snug">
                         {toBengaliDate(leave.startDate || leave.date)} {leave.startTime && `(${toBengaliNumber(leave.startTime)})`} <br/> থেকে <br/> {toBengaliDate(leave.endDate || leave.date)} {leave.endTime && `(${toBengaliNumber(leave.endTime)})`}
                       </span>
                     </div>
                     {leave.note && (
                       <div className="text-[13px] bg-blue-50/50 text-[#0F5C7A] px-3 py-2 rounded-lg font-semibold border border-blue-100/50">
                         কারণ: {leave.note}
                       </div>
                     )}
                   </div>
                 </div>
               );
             }) : (
               <div className="col-span-full py-16 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                 <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                   <CheckCircle className="w-8 h-8 text-emerald-400" />
                 </div>
                 <p className="font-bold text-lg text-slate-700">আজ কেউ ছুটিতে নেই!</p>
                 <p className="text-sm">সব শিক্ষার্থী ক্লাসের জন্য প্রস্তুত আছে।</p>
               </div>
             )}
           </div>
        </div>
      )}

      {activeTab === "add" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">শ্রেণি</label>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudents(new Set());
                  }}
                  className="w-full text-[16px] font-medium text-slate-700 bg-slate-50 border border-slate-200 appearance-none pr-10 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
                >
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">শুরুর তারিখ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-[16px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">শুরুর সময়</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-[16px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">শেষ তারিখ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-[16px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">শেষ সময়</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-[16px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="নাম, রোল বা আইডি দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-base font-medium text-slate-700 bg-slate-50 border border-slate-200 pl-12 rounded-xl py-3 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                নির্বাচিত: {toBengaliNumber(selectedStudents.size)} জন
              </span>
              <button
                onClick={handleAddLeaves}
                disabled={selectedStudents.size === 0}
                className={clsx(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300",
                  selectedStudents.size > 0
                    ? "bg-[#0F5C7A] text-white hover:bg-[#0C4A62] shadow-md"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                <CheckCircle className="w-5 h-5" />
                সংরক্ষণ করুন
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                        onChange={toggleAllSelection}
                        className="w-4 h-4 rounded border-slate-300 text-[#0F5C7A] focus:ring-[#0F5C7A] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-700">রোল</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-700">শিক্ষার্থীর নাম</th>
                    {!selectedClassId && (
                      <th className="py-3 px-4 text-xs font-bold text-slate-700">শ্রেণি</th>
                    )}
                    <th className="py-3 px-4 text-xs font-bold text-slate-700">নোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      let className = "";
                      if (!selectedClassId) {
                        for (const cId in students) {
                          if (students[cId].some(s => s.id === student.id)) {
                            const cls = classes.find(c => c.id === cId);
                            if (cls) className = cls.name;
                            break;
                          }
                        }
                      }
                      
                      return (
                        <tr 
                          key={student.id} 
                          className={clsx(
                            "hover:bg-slate-50 transition-colors cursor-pointer",
                            selectedStudents.has(student.id) && "bg-blue-50/50"
                          )}
                          onClick={() => toggleStudentSelection(student.id)}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(student.id)}
                              onChange={() => {}} // Handled by tr click
                              className="w-4 h-4 rounded border-slate-300 text-[#0F5C7A] focus:ring-[#0F5C7A] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium text-sm">{toBengaliNumber(student.roll)}</td>
                          <td className="py-3 px-4 font-bold text-[#0F5C7A]">
                            {student.name}
                            {student.studentUid && (
                              <div className="text-xs text-slate-400 font-normal font-mono">{student.studentUid}</div>
                            )}
                          </td>
                          {!selectedClassId && (
                            <td className="py-3 px-4 text-slate-600 text-sm whitespace-nowrap">{className}</td>
                          )}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="..."
                              value={studentNotes[student.id] || ""}
                              onChange={(e) => setStudentNotes(prev => ({ ...prev, [student.id]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-xs bg-white border border-slate-200 rounded-lg py-1.5 px-2 focus:border-[#0F5C7A] focus:ring-1 focus:ring-[#0F5C7A]/20 outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={!selectedClassId ? 5 : 4} className="py-12 text-center text-slate-500">
                        {!selectedClassId && !searchQuery
                          ? "অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন অথবা শিক্ষার্থীর নাম, রোল বা আইডি দিয়ে খুঁজুন।"
                          : "কোনো শিক্ষার্থী পাওয়া যায়নি"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "view" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
              
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-bold text-slate-700">শ্রেণি ফিল্টার (ঐচ্ছিক)</label>
                <div className="relative">
                  <select
                    value={viewClassId}
                    onChange={(e) => setViewClassId(e.target.value)}
                    className="w-full text-[16px] font-medium text-slate-700 bg-slate-50 border border-slate-200 appearance-none pr-10 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
                  >
                    <option value="">সকল শ্রেণি</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              <div className="flex-[2] w-full space-y-2">
                <label className="text-sm font-bold text-slate-700">শিক্ষার্থী খুঁজুন</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="নাম, রোল বা আইডি দিয়ে খুঁজুন..."
                    value={viewSearchQuery}
                    onChange={(e) => setViewSearchQuery(e.target.value)}
                    className="w-full text-base font-medium text-slate-700 bg-slate-50 border border-slate-200 pl-12 rounded-xl py-3 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
                  />
                </div>
              </div>

            </div>
          </div>

          {groupedLeaves.length > 0 ? (
            groupedLeaves.map((group) => {
              const dateObj = new Date(group.date);
              const dayName = new Intl.DateTimeFormat('bn-BD', { weekday: 'long' }).format(dateObj);
              const formattedDate = toBengaliDate(group.date);

              return (
                <div key={group.date} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0F5C7A]/10 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-[#0F5C7A]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{dayName}</h3>
                      <p className="text-sm text-slate-500">{formattedDate}</p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">শ্রেণি</th>
                          <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">রোল</th>
                          <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">শিক্ষার্থীর নাম</th>
                          <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">সময়কাল</th>
                          <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">স্ট্যাটাস</th>
                          <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {group.leaves.map((leave) => (
                          <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 text-sm text-slate-600">{getClassName(leave.classId)}</td>
                            <td className="py-4 px-6 text-sm font-medium text-slate-700">{toBengaliNumber(getStudentRoll(leave.studentId, leave.classId))}</td>
                            <td className="py-4 px-6">
                              <div className="text-sm font-bold text-slate-800">{getStudentName(leave.studentId, leave.classId)}</div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                {students[leave.classId]?.find(s => s.id === leave.studentId)?.studentUid || ''}
                              </div>
                              {leave.note && (
                                <div className="inline-flex items-center mt-1.5 px-2.5 py-1 bg-[#0F5C7A]/5 border border-[#0F5C7A]/10 rounded-md">
                                  <span className="text-[11px] font-semibold text-[#0F5C7A]">{leave.note}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm text-slate-600">
                              {leave.startDate && leave.endDate ? (
                                <div>
                                  <div>{toBengaliDate(leave.startDate)} {leave.startTime && `(${toBengaliNumber(leave.startTime)})`}</div>
                                  <div className="text-xs text-slate-400">থেকে</div>
                                  <div>{toBengaliDate(leave.endDate)} {leave.endTime && `(${toBengaliNumber(leave.endTime)})`}</div>
                                </div>
                              ) : (
                                <div>{toBengaliDate(leave.date || "")}</div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <select
                                value={leave.status || 'pending'}
                                onChange={(e) => updateLeave(leave.id, { status: e.target.value as any })}
                                className={clsx(
                                  "text-xs font-bold px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors",
                                  (!leave.status || leave.status === 'pending') && "bg-amber-50 text-amber-600 border-amber-200",
                                  leave.status === 'approved' && "bg-emerald-50 text-emerald-600 border-emerald-200",
                                  leave.status === 'rejected' && "bg-rose-50 text-rose-600 border-rose-200"
                                )}
                              >
                                <option value="pending">অপেক্ষমান</option>
                                <option value="approved">অনুমোদিত</option>
                                <option value="rejected">বাতিল</option>
                              </select>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingLeave(leave)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="এডিট করুন"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingLeave(leave)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">কোনো ছুটির রেকর্ড নেই</h3>
              <p className="text-slate-500">এখন পর্যন্ত কোনো শিক্ষার্থীর ছুটির রেকর্ড যুক্ত করা হয়নি।</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingLeave && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">ছুটি এডিট করুন</h3>
              <button
                onClick={() => setEditingLeave(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">শিক্ষার্থী</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium">
                  {getStudentName(editingLeave.studentId, editingLeave.classId)} (রোল: {toBengaliNumber(getStudentRoll(editingLeave.studentId, editingLeave.classId))})
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">শুরুর তারিখ</label>
                  <input
                    type="date"
                    value={editingLeave.startDate || editingLeave.date || ""}
                    onChange={(e) => setEditingLeave({ ...editingLeave, startDate: e.target.value })}
                    className="w-full text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">শুরুর সময়</label>
                  <input
                    type="time"
                    value={editingLeave.startTime || "08:00"}
                    onChange={(e) => setEditingLeave({ ...editingLeave, startTime: e.target.value })}
                    className="w-full text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">শেষ তারিখ</label>
                  <input
                    type="date"
                    value={editingLeave.endDate || editingLeave.date || ""}
                    onChange={(e) => setEditingLeave({ ...editingLeave, endDate: e.target.value })}
                    className="w-full text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">শেষ সময়</label>
                  <input
                    type="time"
                    value={editingLeave.endTime || "14:00"}
                    onChange={(e) => setEditingLeave({ ...editingLeave, endTime: e.target.value })}
                    className="w-full text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">নোট (ঐচ্ছিক)</label>
                <textarea
                  value={editingLeave.note || ""}
                  onChange={(e) => setEditingLeave({ ...editingLeave, note: e.target.value })}
                  className="w-full text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none resize-none h-24"
                  placeholder="ছুটির নোট লিখুন..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">স্ট্যাটাস</label>
                <select
                  value={editingLeave.status || 'pending'}
                  onChange={(e) => setEditingLeave({ ...editingLeave, status: e.target.value })}
                  className="w-full text-base font-medium text-slate-700 bg-white border border-slate-300 rounded-xl py-3 px-4 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all outline-none"
                >
                  <option value="pending">অপেক্ষমান</option>
                  <option value="approved">অনুমোদিত</option>
                  <option value="rejected">বাতিল</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setEditingLeave(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                বাতিল
              </button>
              <button
                onClick={() => {
                  updateLeave(editingLeave.id, { 
                    startDate: editingLeave.startDate, 
                    startTime: editingLeave.startTime,
                    endDate: editingLeave.endDate,
                    endTime: editingLeave.endTime,
                    note: editingLeave.note,
                    status: editingLeave.status || 'pending'
                  });
                  setEditingLeave(null);
                }}
                className="px-5 py-2.5 rounded-xl font-bold bg-[#0F5C7A] text-white hover:bg-[#0C4A62] transition-colors shadow-md"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Modal */}
      {deletingLeave && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">ছুটি মুছে ফেলবেন?</h3>
              <p className="text-slate-500 mb-6">
                আপনি কি নিশ্চিত যে আপনি <strong>{getStudentName(deletingLeave.studentId, deletingLeave.classId)}</strong> এর ছুটির রেকর্ড মুছে ফেলতে চান? এই অ্যাকশনটি বাতিল করা যাবে না।
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingLeave(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  onClick={() => {
                    deleteLeave(deletingLeave.id);
                    setDeletingLeave(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20"
                >
                  মুছে ফেলুন
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeaveManagement;
