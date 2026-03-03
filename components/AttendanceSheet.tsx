import React, { useState, useMemo } from 'react';
import type { ClassData, Student, AttendanceRecord } from '../types';
import { AttendanceStatus } from '../types';
import Button from './common/Button';
import { EditIcon, HistoryIcon, UserIcon, ChatBubbleBottomCenterTextIcon, MagnifyingGlassIcon } from './common/Icons';
import StudentEditModal from './StudentEditModal';
import NoteEditModal from './NoteEditModal';
import { normalizeSearchQuery, fuzzyMatch } from '../utils/search';


interface AttendanceSheetProps {
  classData: ClassData;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onTakeAttendance: (classId: string, studentStatuses: Map<string, { status: AttendanceStatus; note: string }>) => void;
  onSelectStudent: (student: Student) => void;
  onUpdateStudentName: (studentId: string, newName: string) => void;
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({ classData, students, attendanceRecords, onTakeAttendance, onSelectStudent, onUpdateStudentName }) => {
  const [isTakingAttendance, setIsTakingAttendance] = useState(false);
  const [currentStatuses, setCurrentStatuses] = useState<Map<string, { status: AttendanceStatus, note: string }>>(() => new Map());
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingNoteForStudent, setEditingNoteForStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  const todaysRecords = useMemo(() => {
    return attendanceRecords
      .filter(r => r.classId === classData.id && r.timestamp >= todayTimestamp)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [attendanceRecords, classData.id, todayTimestamp]);

  const groupedTodaysRecords = useMemo(() => {
    const groups = new Map<number, AttendanceRecord[]>();
    todaysRecords.forEach(record => {
      if (!groups.has(record.timestamp)) {
        groups.set(record.timestamp, []);
      }
      groups.get(record.timestamp)!.push(record);
    });
    return Array.from(groups.entries());
  }, [todaysRecords]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const lowercasedQuery = searchQuery.toLowerCase();
    const normalizedRollQuery = normalizeSearchQuery(searchQuery);
    return students.filter(student => 
        fuzzyMatch(lowercasedQuery, student.name) || 
        student.roll.toString().includes(normalizedRollQuery)
    );
  }, [students, searchQuery]);

  const filteredGroupedTodaysRecords = useMemo(() => {
    if (!searchQuery) return groupedTodaysRecords;
    const lowercasedQuery = searchQuery.toLowerCase();
    const normalizedRollQuery = normalizeSearchQuery(searchQuery);
    
    return groupedTodaysRecords.map(([timestamp, records]) => {
        const filteredRecords = records.filter(record => {
            const student = students.find(s => s.id === record.studentId);
            if (!student) return false;
            return fuzzyMatch(lowercasedQuery, student.name) || student.roll.toString().includes(normalizedRollQuery);
        });
        return [timestamp, filteredRecords] as [number, AttendanceRecord[]];
    }).filter(([, records]) => records.length > 0);
  }, [groupedTodaysRecords, searchQuery, students]);


  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setCurrentStatuses(prev => {
      const newMap = new Map(prev);
      // Fix: Cast to the correct type to avoid 'unknown' type error.
      const currentEntry = (newMap.get(studentId) || { status: AttendanceStatus.Present, note: '' }) as { status: AttendanceStatus; note: string };
      newMap.set(studentId, { note: currentEntry.note, status });
      return newMap;
    });
  };
  
  const handleSaveNote = (note: string) => {
    if (!editingNoteForStudent) return;
    setCurrentStatuses(prev => {
        const newMap = new Map(prev);
        // Fix: Cast to the correct type to avoid 'unknown' type error.
        const currentEntry = (newMap.get(editingNoteForStudent.id) || { status: AttendanceStatus.Present, note: '' }) as { status: AttendanceStatus; note: string };
        newMap.set(editingNoteForStudent.id, { status: currentEntry.status, note });
        return newMap;
    });
    setEditingNoteForStudent(null);
  };

  const handleSaveAttendance = () => {
    onTakeAttendance(classData.id, currentStatuses);
    setIsTakingAttendance(false);
    setSearchQuery('');
  };
  
  const handleStartAttendance = () => {
    setCurrentStatuses(new Map(students.map(s => [s.id, { status: AttendanceStatus.Present, note: '' }])));
    setIsTakingAttendance(true);
  }
  
  const handleCancelAttendance = () => {
    setIsTakingAttendance(false);
    setSearchQuery('');
  }

  const handleSaveStudentName = (newName: string) => {
    if (editingStudent) {
        onUpdateStudentName(editingStudent.id, newName);
    }
  };

  if (isTakingAttendance) {
    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 text-indigo-700">নতুন হাজিরা - {classData.name}</h3>
           <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              </span>
              <input
                  type="text"
                  placeholder="ছাত্র/ছাত্রী খুঁজুন (নাম বা রোল)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <div key={student.id} className="flex items-center justify-between p-3 rounded-md border">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{student.roll}. {student.name}</p>
                      <button onClick={() => setEditingStudent(student)} className="text-gray-400 hover:text-indigo-600 transition-colors" title="নাম পরিবর্তন করুন">
                        <EditIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingNoteForStudent(student)} title="নোট যোগ করুন">
                        <ChatBubbleBottomCenterTextIcon className={`w-5 h-5 ${currentStatuses.get(student.id)?.note ? 'text-indigo-600' : 'text-gray-400'}`} />
                      </Button>
                      <Button 
                        size="sm"
                        variant={currentStatuses.get(student.id)?.status === AttendanceStatus.Present ? 'success' : 'ghost'} 
                        onClick={() => handleStatusChange(student.id, AttendanceStatus.Present)}>
                        উপস্থিত
                      </Button>
                      <Button 
                        size="sm"
                        variant={currentStatuses.get(student.id)?.status === AttendanceStatus.Absent ? 'danger' : 'ghost'} 
                        onClick={() => handleStatusChange(student.id, AttendanceStatus.Absent)}>
                        অনুপস্থিত
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
                <div className="text-center py-6 text-gray-500">
                    কোনো ছাত্র/ছাত্রী খুঁজে পাওয়া যায়নি।
                </div>
            )}
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSaveAttendance}>সংরক্ষণ করুন</Button>
            <Button variant="secondary" onClick={handleCancelAttendance}>বাতিল করুন</Button>
          </div>
        </div>

        {editingStudent && (
            <StudentEditModal 
                student={editingStudent}
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
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-700 mb-2 md:mb-0">{classData.name} - হাজিরা</h3>
        <Button onClick={handleStartAttendance}>নতুন হাজিরা নিন</Button>
      </div>
       <div className="relative mb-4">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
            </span>
            <input
                type="text"
                placeholder="ছাত্র/ছাত্রী খুঁজুন (নাম বা রোল)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
        </div>
       <div className="space-y-4">
        {groupedTodaysRecords.length > 0 ? (
          filteredGroupedTodaysRecords.length > 0 ? (
            filteredGroupedTodaysRecords.map(([timestamp, records]) => {
               const presentCount = records.filter(r => r.status === AttendanceStatus.Present).length;
               const absentCount = records.length - presentCount;
              return (
                <div key={timestamp} className="border rounded-lg p-4">
                   <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-lg text-indigo-700 flex items-center gap-2">
                          <HistoryIcon className="w-5 h-5"/>
                          হাজিরার সময়: {new Date(timestamp).toLocaleTimeString('bn-BD')}
                      </h4>
                       <div className="flex gap-4 text-sm font-semibold">
                           <span className="text-green-600">উপস্থিত: {presentCount}</span>
                           <span className="text-red-600">অনুপস্থিত: {absentCount}</span>
                       </div>
                   </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {records.map(record => {
                      const student = students.find(s => s.id === record.studentId);
                      if (!student) return null;
                      const isAbsent = record.status === AttendanceStatus.Absent;
                      return (
                        <button 
                          key={record.id} 
                          onClick={() => onSelectStudent(student)}
                          className={`p-3 rounded-md text-left transition-colors flex items-center justify-between ${isAbsent ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}>
                          <div>
                            <p className="font-semibold">{student.roll}. {student.name}</p>
                            <p className="text-xs">{isAbsent ? 'অনুপস্থিত' : 'উপস্থিত'}</p>
                          </div>
                          <UserIcon className="w-5 h-5 opacity-60"/>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
             <div className="text-center py-10">
                <p className="text-gray-500">আপনার সার্চের সাথে মেলে এমন কোনো ছাত্র/ছাত্রী পাওয়া যায়নি।</p>
             </div>
          )
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">আজকের জন্য কোনো হাজিরা নেওয়া হয়নি।</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceSheet;