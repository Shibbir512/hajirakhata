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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
      newMap.set(studentId, { ...currentEntry, status });
      return newMap;
    });
    setHasUnsavedChanges(true);
  };

  const toggleStatus = (studentId: string) => {
    setCurrentStatuses(prev => {
      const newMap = new Map(prev);
      const currentEntry = newMap.get(studentId) as { status: AttendanceStatus; note: string } | undefined;
      let newStatus = AttendanceStatus.Present;
      if (currentEntry?.status === AttendanceStatus.Present) {
          newStatus = AttendanceStatus.Absent;
      } else if (currentEntry?.status === AttendanceStatus.Absent) {
          newStatus = AttendanceStatus.Present; 
      }
      newMap.set(studentId, { status: newStatus, note: currentEntry?.note || '' });
      return newMap;
    });
    setHasUnsavedChanges(true);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setCurrentStatuses(prev => {
      const newMap = new Map(prev);
      students.forEach(student => {
        const currentEntry = (newMap.get(student.id) || { status: AttendanceStatus.Present, note: '' }) as { status: AttendanceStatus; note: string };
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
                let hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                timeStr = `${hours}:${minutes}:${seconds} ${ampm}`;
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

      <div className="bg-white rounded-t-xl border border-slate-200 shadow-sm sticky top-16 sm:top-[64px] z-40">
          <ClassSelector classes={classes} selectedClassId={selectedClassId} onSelectClass={onSelectClass} />

          {classData && (
              <div className="px-3 sm:px-4 py-2 border-b border-slate-100 flex gap-2">
                  <button 
                      onClick={() => handleMarkAll(AttendanceStatus.Present)}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
                  >
                      <i className="fa-solid fa-play"></i> হাজিরা শুরু করুন
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

      <div className="bg-slate-50 border-x border-b border-slate-200 rounded-b-xl shadow-sm mb-20 min-h-[200px] p-4 sm:p-6">
          {!classData ? (
             <div className="text-center py-10 text-gray-500">
                অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন।
             </div>
          ) : filteredStudents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredStudents.map(student => {
                    const status = currentStatuses.get(student.id)?.status;
                    const note = currentStatuses.get(student.id)?.note;
                    const isPresent = status === AttendanceStatus.Present;
                    const isAbsent = status === AttendanceStatus.Absent;
                    const isUnmarked = !status;

                    return (
                        <div 
                            key={student.id} 
                            onClick={() => toggleStatus(student.id)}
                            className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none
                                ${isPresent ? 'bg-emerald-50 border-emerald-400 shadow-sm shadow-emerald-100' : 
                                  isAbsent ? 'bg-rose-50 border-rose-400 shadow-sm shadow-rose-100' : 
                                  'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}
                            `}
                        >
                            <div className="absolute top-2 right-2 flex gap-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingNoteForStudent(student); }}
                                    className={`${note ? 'text-teal-600 hover:text-teal-800' : 'text-slate-300 hover:text-slate-500'} p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center`}
                                    title={note || "নোট যোগ করুন"}
                                >
                                    <i className={note ? "fa-solid fa-comment-dots" : "fa-regular fa-comment"}></i>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingStudent(student); }}
                                    className="text-slate-400 hover:text-slate-600 p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    title="এডিট"
                                >
                                    <EditIcon className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-2
                                ${isPresent ? 'bg-emerald-100 text-emerald-700' : 
                                  isAbsent ? 'bg-rose-100 text-rose-700' : 
                                  'bg-slate-100 text-slate-600'}
                            `}>
                                {student.roll}
                            </div>
                            
                            <h3 className="text-sm font-bold text-slate-800 text-center line-clamp-2 mb-1" onClick={(e) => { e.stopPropagation(); onSelectStudent(student); }}>
                                {student.name}
                            </h3>
                            
                            <div className="mt-auto pt-2">
                                {isPresent && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><i className="fa-solid fa-check"></i> উপস্থিত</span>}
                                {isAbsent && <span className="text-xs font-bold text-rose-600 flex items-center gap-1"><i className="fa-solid fa-xmark"></i> অনুপস্থিত</span>}
                                {isUnmarked && <span className="text-xs font-medium text-slate-400">চিহ্নিত করুন</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
          ) : (
              <div className="text-center py-10 text-gray-500">
                  কোনো ছাত্র/ছাত্রী খুঁজে পাওয়া যায়নি।
              </div>
          )}
      </div>

      {editingStudent && (
          <StudentEditModal 
              student={editingStudent}
              history={[]}
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