import React, { useState } from 'react';
import type { Student, AttendanceRecord } from '../types';
import { AttendanceStatus } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { EditIcon, ClipboardIcon, ChatBubbleBottomCenterTextIcon } from './common/Icons';
import NoteEditModal from './NoteEditModal';

interface StudentDetailModalProps {
  student: Student;
  history: AttendanceRecord[];
  onClose: () => void;
  onUpdateRecord: (recordId: string, newStatus: AttendanceStatus) => void;
  onUpdateRecordNote: (recordId: string, newNote: string) => void;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, history, onClose, onUpdateRecord, onUpdateRecordNote }) => {
  const [editingRecordForNote, setEditingRecordForNote] = useState<AttendanceRecord | null>(null);

  const handleCopyReport = async () => {
    const presentCount = history.filter(r => r.status === AttendanceStatus.Present).length;
    const absentCount = history.filter(r => r.status === AttendanceStatus.Absent).length;

    let report = `হাজিরার রিপোর্ট\n`;
    report += `ছাত্র/ছাত্রীর নাম: ${student.name}\n`;
    report += `রোল: ${student.roll}\n`;
    report += `মোট ক্লাস: ${history.length}\n`;
    report += `উপস্থিত: ${presentCount} দিন\n`;
    report += `অনুপস্থিত: ${absentCount} দিন\n`;
    report += `------------------------------------\n`;
    
      if (history.length > 0) {
        history.forEach(record => {
          const date = new Date(record.timestamp);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          let hours = date.getHours();
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          
          const formattedDate = `${day} ${month} ${year}`;
          const formattedTime = `${hours}:${minutes}:${seconds} ${ampm}`;

          const status = record.status === AttendanceStatus.Present ? 'উপস্থিত' : 'অনুপস্থিত';
          report += `- ডেইট: ${formattedDate}, টাইম: ${formattedTime} - ${status}\n`;
          if (record.teacherName) {
              report += `  শিক্ষক: ${record.teacherName} (টাইম ${formattedTime}, ডেইট ${formattedDate})\n`;
          }
          if (record.note) {
            report += `  নোট: ${record.note}\n`;
          }
        });
      } else {
      report += "কোনো রেকর্ড নেই।\n";
    }

    try {
      await navigator.clipboard.writeText(report);
      alert('রিপোর্ট ক্লিপবোর্ডে কপি করা হয়েছে!');
    } catch (err) {
      console.error('Failed to copy report: ', err);
      alert('রিপোর্ট কপি করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleSaveNote = (note: string) => {
    if (editingRecordForNote) {
        onUpdateRecordNote(editingRecordForNote.id, note);
    }
    setEditingRecordForNote(null);
  };

  return (
    <>
      <Modal onClose={onClose} title={`রিপোর্ট: ${student.name}`}>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
              <div>
                   <p className="text-lg font-bold text-gray-800">{student.name}</p>
                   <p className="text-sm text-gray-500">রোল নম্বর: {student.roll}</p>
              </div>
              <Button onClick={handleCopyReport} variant="secondary" size="sm">
                  <ClipboardIcon className="w-4 h-4 mr-2" />
                  রিপোর্ট কপি করুন
              </Button>
          </div>
          
          <h4 className="text-md font-semibold mb-3 text-gray-700 border-b pb-2">হাজিরার ইতিহাস</h4>
          
          {history.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {history.map(record => {
                const date = new Date(record.timestamp);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                let hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                
                const formattedDate = `${day} ${month} ${year}`;
                const formattedTime = `${hours}:${minutes}:${seconds} ${ampm}`;

                const isPresent = record.status === AttendanceStatus.Present;
                return (
                  <div key={record.id} className={`p-3 rounded-lg border ${isPresent ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className={`font-medium ${isPresent ? 'text-green-800' : 'text-red-800'}`}>
                              ডেইট: {formattedDate}
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isPresent ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                {isPresent ? 'উপস্থিত' : 'অনুপস্থিত'}
                              </span>
                            </p>
                            <p className={`text-sm ${isPresent ? 'text-green-600' : 'text-red-600'}`}>টাইম: {formattedTime}</p>
                            {record.teacherName && (
                                <p className="text-xs text-gray-500 mt-1">
                                    শিক্ষক: {record.teacherName} (টাইম {formattedTime}, ডেইট {formattedDate})
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingRecordForNote(record)}
                                title="নোট এডিট করুন"
                            >
                                <ChatBubbleBottomCenterTextIcon className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">নোট</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onUpdateRecord(record.id, isPresent ? AttendanceStatus.Absent : AttendanceStatus.Present)}
                                title={isPresent ? "অনুপস্থিত হিসেবে চিহ্নিত করুন" : "উপস্থিত হিসেবে চিহ্নিত করুন"}
                            >
                                <EditIcon className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">স্ট্যাটাস পরিবর্তন</span>
                            </Button>
                        </div>
                    </div>
                    {record.note && (
                        <p className={`text-xs mt-2 pt-2 pl-2 border-t ${isPresent ? 'text-green-700 border-green-200' : 'text-red-700 border-red-200'}`}>
                            <strong>নোট:</strong> {record.note}
                        </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">এই ছাত্র/ছাত্রীর কোনো হাজিরার রেকর্ড নেই।</p>
          )}

          <div className="mt-6 text-right">
            <Button onClick={onClose} variant="secondary">বন্ধ করুন</Button>
          </div>
        </div>
      </Modal>

      {editingRecordForNote && (
        <NoteEditModal
            onClose={() => setEditingRecordForNote(null)}
            onSave={handleSaveNote}
            initialNote={editingRecordForNote.note}
        />
      )}
    </>
  );
};

export default StudentDetailModal;