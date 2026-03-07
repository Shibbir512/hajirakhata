import React, { useState, useMemo, useEffect } from 'react';
import type { ClassData, Student, AttendanceRecord } from '../types';
import { AttendanceStatus } from '../types';
import Button from './common/Button';
import { EditIcon, ChatBubbleBottomCenterTextIcon } from './common/Icons';
import StudentEditModal from './StudentEditModal';
import NoteEditModal from './NoteEditModal';
import { normalizeSearchQuery, fuzzyMatch } from '../utils/search';
import ClassSelector from './ClassSelector';

interface AttendanceSheetProps {
  classes: ClassData[];
  selectedClassId: string | null;
  onSelectClass: (id: string) => void;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onTakeAttendance: (classId: string, studentStatuses: Map<string, { status: AttendanceStatus; note: string }>, date?: string) => void;
  onSelectStudent: (student: Student) => void;
  onUpdateStudentName: (studentId: string, newName: string) => void;
  selectedDate: string;
  onViewReport: () => void;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ 
  classes, 
  selectedClassId, 
  onSelectClass, 
  students, 
  attendanceRecords, 
  onTakeAttendance, 
  onSelectStudent, 
  onUpdateStudentName,
  selectedDate,
  onViewReport
}) => {
  const [currentStatuses, setCurrentStatuses] = useState<Map<string, { status: AttendanceStatus, note: string }>>(() => new Map());
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingNoteForStudent, setEditingNoteForStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const classData = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  const todaysRecords = useMemo(() => {
    if (!classData) return [];
    return attendanceRecords
      .filter(r => {
        if (r.classId !== classData.id) return false;
        const recordDate = new Date(r.timestamp);
        const selected = new Date(selectedDate);
        return recordDate.getDate() === selected.getDate() &&
               recordDate.getMonth() === selected.getMonth() &&
               recordDate.getFullYear() === selected.getFullYear();
      });
  }, [attendanceRecords, classData, selectedDate]);

  // Initialize statuses from selected date's records when class changes or records load
  useEffect(() => {
    if (students.length > 0) {
        const initialStatuses = new Map<string, { status: AttendanceStatus, note: string }>();
        students.forEach(student => {
            const record = todaysRecords.find(r => r.studentId === student.id);
            if (record) {
                initialStatuses.set(student.id, { status: record.status, note: record.note || '' });
            }
        });
        setCurrentStatuses(initialStatuses);
        setHasUnsavedChanges(false);
    }
  }, [students, todaysRecords]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const lowercasedQuery = searchQuery.toLowerCase();
    const normalizedRollQuery = normalizeSearchQuery(searchQuery);
    return students.filter(student => 
        fuzzyMatch(lowercasedQuery, student.name) || 
        student.roll.toString().includes(normalizedRollQuery)
    );
  }, [students, searchQuery]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setCurrentStatuses(prev => {
      const newMap = new Map(prev);
      const currentEntry = (newMap.get(studentId) || { status: AttendanceStatus.Present, note: '' }) as { status: AttendanceStatus; note: string };
      
      // If clicking the same status, toggle it off (remove from map)? 
      // Or just keep it. The UI uses radio buttons, so usually one is selected.
      // If we want to allow "unmarking", we can check if it's already set.
      // But for simplicity, let's just set it.
      
      newMap.set(studentId, { ...currentEntry, status });
      return newMap;
    });
    setHasUnsavedChanges(true);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setCurrentStatuses(prev => {
      const newMap = new Map(prev);
      students.forEach(student => {
        const currentEntry = (newMap.get(student.id) || { status: AttendanceStatus.Present, note: '' }) as { status: AttendanceStatus; note: string };
        // Only mark if not already marked? Or overwrite?
        // "Mark All Present" usually means overwrite or fill blanks.
        // Let's overwrite for consistency.
        newMap.set(student.id, { ...currentEntry, status });
      });
      return newMap;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveNote = (note: string) => {
    if (!editingNoteForStudent) return;
    setCurrentStatuses(prev => {
        const newMap = new Map(prev);
        const currentEntry = (newMap.get(editingNoteForStudent.id) || { status: AttendanceStatus.Present, note: '' }) as { status: AttendanceStatus; note: string };
        newMap.set(editingNoteForStudent.id, { status: currentEntry.status, note });
        return newMap;
    });
    setEditingNoteForStudent(null);
    setHasUnsavedChanges(true);
  };

  const handleSaveAttendance = () => {
    if (classData) {
        onTakeAttendance(classData.id, currentStatuses, selectedDate);
        setHasUnsavedChanges(false);
    }
  };

  const handleSaveStudentName = (newName: string) => {
    if (editingStudent) {
        onUpdateStudentName(editingStudent.id, newName);
    }
  };

  // Stats Calculation
  const totalStudents = students.length;
  const presentCount = Array.from(currentStatuses.values()).filter((s: { status: AttendanceStatus; note: string }) => s.status === AttendanceStatus.Present).length;
  const absentCount = Array.from(currentStatuses.values()).filter((s: { status: AttendanceStatus; note: string }) => s.status === AttendanceStatus.Absent).length;
  const remainingCount = totalStudents - (presentCount + absentCount);

  const teacherInfo = useMemo(() => {
    if (todaysRecords.length > 0) {
        const record = todaysRecords[0];
        if (record.teacherName) {
            let timeStr = '';
            if (record.takenAt) {
                const date = new Date(record.takenAt);
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                timeStr = `${hours}:${minutes}:${seconds}`;
            }
            return {
                name: record.teacherName,
                time: timeStr
            };
        }
    }
    return null;
  }, [todaysRecords]);

  return (
    <>
      {/* Stats Grid - Only show if class selected? Or show zeros? */}
      {classData && (
        <>
            {teacherInfo && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4 flex items-center gap-2 text-blue-800 text-sm">
                    <i className="fa-solid fa-circle-info"></i>
                    <span>
                        <strong>শিক্ষক:</strong> {teacherInfo.name} 
                        {teacherInfo.time && <span> | <strong>সময়:</strong> {teacherInfo.time}</span>}
                    </span>
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-lg"><i className="fa-solid fa-users"></i></div>
                <div>
                    <p className="text-xs text-slate-500 font-medium">মোট ছাত্র</p>
                    <p className="text-lg font-bold text-slate-800">{totalStudents} জন</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-lg"><i className="fa-solid fa-user-check"></i></div>
                <div>
                    <p className="text-xs text-slate-500 font-medium">উপস্থিত</p>
                    <p className="text-lg font-bold text-emerald-600">{presentCount} জন</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-lg"><i className="fa-solid fa-user-xmark"></i></div>
                <div>
                    <p className="text-xs text-slate-500 font-medium">অনুপস্থিত</p>
                    <p className="text-lg font-bold text-rose-600">{absentCount} জন</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-lg"><i className="fa-regular fa-clock"></i></div>
                <div>
                    <p className="text-xs text-slate-500 font-medium">বাকি আছে</p>
                    <p className="text-lg font-bold text-amber-600">{remainingCount} জন</p>
                </div>
            </div>
        </div>
        </>
      )}

      {/* Sticky Header: Tabs + Search */}
      <div className="bg-white rounded-t-xl border border-slate-200 shadow-sm sticky top-16 sm:top-[64px] z-40">
          <ClassSelector classes={classes} selectedClassId={selectedClassId} onSelectClass={onSelectClass} />

          {classData && (
              <div className="px-3 sm:px-4 py-2 border-b border-slate-100 flex gap-2">
                  <button 
                      className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2"
                      disabled
                  >
                      <i className="fa-solid fa-clipboard-check"></i> হাজিরা নিন
                  </button>
                  <button 
                      onClick={onViewReport}
                      className="flex-1 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-2"
                  >
                      <i className="fa-solid fa-chart-pie"></i> রিপোর্ট দেখুন
                  </button>
              </div>
          )}

          <div className="p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-80">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400"></i>
                  <input 
                    type="text" 
                    placeholder="রোল বা নাম দিয়ে খুঁজুন..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                    disabled={!classData}
                  />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={() => handleMarkAll(AttendanceStatus.Present)}
                    disabled={!classData}
                    className={`flex-1 sm:flex-none px-5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition shadow-sm flex items-center justify-center gap-2 ${!classData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <i className="fa-solid fa-check-double"></i> সবাইকে উপস্থিত করুন
                </button>
                {hasUnsavedChanges && (
                    <button 
                        onClick={handleSaveAttendance}
                        className="flex-1 sm:flex-none px-5 py-2 bg-teal-600 text-white border border-teal-600 rounded-lg text-sm font-bold hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2 animate-pulse"
                    >
                        <i className="fa-solid fa-save"></i> সংরক্ষণ করুন
                    </button>
                )}
              </div>
          </div>
      </div>

      {/* Student List */}
      <div className="bg-white border-x border-b border-slate-200 rounded-b-xl shadow-sm mb-20 min-h-[200px]">
          
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-2 text-center">রোল নং</div>
              <div className="col-span-4">ছাত্রের নাম</div>
              <div className="col-span-4 text-center">হাজিরা স্ট্যাটাস</div>
              <div className="col-span-2 text-right">মন্তব্য</div>
          </div>

          {!classData ? (
             <div className="text-center py-10 text-gray-500">
                অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন।
             </div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map(student => {
                const status = currentStatuses.get(student.id)?.status;
                const note = currentStatuses.get(student.id)?.note;
                const isPresent = status === AttendanceStatus.Present;
                const isAbsent = status === AttendanceStatus.Absent;

                return (
                    <div key={student.id} className={`px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 hover:bg-slate-50 transition group ${isAbsent ? 'bg-rose-50/30' : ''}`}>
                        {/* Mobile Layout */}
                        <div className="flex flex-col gap-3 sm:hidden">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-sm font-bold rounded-md border border-slate-200 min-w-[2.5rem] text-center">{student.roll}</span>
                                    <div className="flex items-center gap-2">
                                        <h3 
                                            className="text-base font-bold text-slate-800 cursor-pointer hover:text-teal-600 line-clamp-1"
                                            onClick={() => onSelectStudent(student)}
                                        >
                                            {student.name}
                                        </h3>
                                        <button onClick={() => setEditingStudent(student)} className="text-slate-300 hover:text-teal-600 transition-colors p-1" title="নাম পরিবর্তন করুন">
                                            <EditIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setEditingNoteForStudent(student)}
                                    className={`p-2 rounded-full transition relative ${note ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'}`} 
                                    title={note || "মন্তব্য যোগ করুন"}
                                >
                                    <i className={`fa-solid fa-comment-dots text-lg`}></i>
                                    {note && <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>}
                                </button>
                            </div>
                            
                            <div className="flex gap-2 w-full">
                                <input 
                                    type="radio" 
                                    name={`status_mobile_${student.id}`} 
                                    id={`present_mobile_${student.id}`} 
                                    className="hidden" 
                                    checked={isPresent}
                                    onChange={() => handleStatusChange(student.id, AttendanceStatus.Present)}
                                />
                                <label htmlFor={`present_mobile_${student.id}`} className={`flex-1 cursor-pointer px-2 py-2 text-sm font-semibold rounded-md border transition flex items-center justify-center gap-1.5 ${isPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                    <i className="fa-solid fa-check"></i> উপস্থিত
                                </label>
                                
                                <input 
                                    type="radio" 
                                    name={`status_mobile_${student.id}`} 
                                    id={`absent_mobile_${student.id}`} 
                                    className="hidden" 
                                    checked={isAbsent}
                                    onChange={() => handleStatusChange(student.id, AttendanceStatus.Absent)}
                                />
                                <label htmlFor={`absent_mobile_${student.id}`} className={`flex-1 cursor-pointer px-2 py-2 text-sm font-semibold rounded-md border transition flex items-center justify-center gap-1.5 ${isAbsent ? 'bg-rose-50 text-rose-600 border-rose-200 ring-1 ring-rose-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                    <i className="fa-solid fa-xmark"></i> অনুপস্থিত
                                </label>
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 flex items-center justify-center gap-3">
                                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-sm font-bold rounded-md border border-slate-200">{student.roll}</span>
                            </div>
                            <div className="col-span-4 flex items-center gap-3">
                                <h3 
                                    className="text-base font-bold text-slate-800 cursor-pointer hover:text-teal-600"
                                    onClick={() => onSelectStudent(student)}
                                >
                                    {student.name}
                                </h3>
                                <button onClick={() => setEditingStudent(student)} className="text-slate-300 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100" title="নাম পরিবর্তন করুন">
                                    <EditIcon className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="col-span-4 flex justify-center gap-2">
                                <input 
                                    type="radio" 
                                    name={`status_${student.id}`} 
                                    id={`present_${student.id}`} 
                                    className="status-radio hidden" 
                                    checked={isPresent}
                                    onChange={() => handleStatusChange(student.id, AttendanceStatus.Present)}
                                />
                                <label htmlFor={`present_${student.id}`} className={`present-btn cursor-pointer px-4 py-1.5 text-sm font-semibold rounded-md border transition flex items-center gap-1.5 ${isPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'}`}>
                                    <i className="fa-solid fa-check"></i> উপস্থিত
                                </label>
                                
                                <input 
                                    type="radio" 
                                    name={`status_${student.id}`} 
                                    id={`absent_${student.id}`} 
                                    className="status-radio hidden" 
                                    checked={isAbsent}
                                    onChange={() => handleStatusChange(student.id, AttendanceStatus.Absent)}
                                />
                                <label htmlFor={`absent_${student.id}`} className={`absent-btn cursor-pointer px-4 py-1.5 text-sm font-semibold rounded-md border transition flex items-center gap-1.5 ${isAbsent ? 'bg-rose-50 text-rose-600 border-rose-200 ring-1 ring-rose-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'}`}>
                                    <i className="fa-solid fa-xmark"></i> অনুপস্থিত
                                </label>
                            </div>
                            <div className="col-span-2 flex justify-end">
                                <button 
                                    onClick={() => setEditingNoteForStudent(student)}
                                    className={`p-2 rounded-full transition relative ${note ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'}`} 
                                    title={note || "মন্তব্য যোগ করুন"}
                                >
                                    <i className={`fa-solid fa-comment-dots text-lg`}></i>
                                    {note && <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })
          ) : (
              <div className="text-center py-10 text-gray-500">
                  কোনো ছাত্র/ছাত্রী খুঁজে পাওয়া যায়নি।
              </div>
          )}
      </div>

      {editingStudent && (
          <StudentEditModal 
              student={editingStudent}
              history={[]} // Pass empty or fetch if needed, but modal handles fetching? No, App passes it.
              // Wait, StudentDetailModal needs history. 
              // But here we are using StudentEditModal which is for editing name?
              // Let's check StudentEditModal.tsx.
              // Ah, I might have confused StudentDetailModal (history) with StudentEditModal (name edit).
              // The previous code used StudentEditModal for name edit.
              // And StudentDetailModal for history (in App.tsx).
              // Here I am using StudentEditModal for name edit. Correct.
              onClose={() => setEditingStudent(null)}
              onSave={handleSaveStudentName}
          />
      )}
      {editingNoteForStudent && (
          <NoteEditModal
              onClose={() => setEditingNoteForStudent(null)}
              onSave={handleSaveNote}
              initialNote={currentStatuses.get(editingNoteForStudent.id)?.note}
          />
      )}
    </>
  );
};

export default AttendanceSheet;