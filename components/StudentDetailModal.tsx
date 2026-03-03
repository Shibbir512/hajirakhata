import React, { useState } from 'react';
import type { Student, AttendanceRecord } from '../types';
import { AttendanceStatus } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { EditIcon, ClipboardIcon, ChatBubbleBottomCenterTextIcon } from './common/Icons';
import NoteEditModal from './NoteEditModal';

interface StudentDetailModalProps {
  student: Student;
  absences: AttendanceRecord[];
  onClose: () => void;
  onUpdateRecord: (recordId: string, newStatus: AttendanceStatus) => void;
  onUpdateRecordNote: (recordId: string, newNote: string) => void;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, absences, onClose, onUpdateRecord, onUpdateRecordNote }) => {
  const [editingRecordForNote, setEditingRecordForNote] = useState<AttendanceRecord | null>(null);

  const handleCopyReport = async () => {
    let report = `অনুপস্থিতির রিপোর্ট\n`;
    report += `ছাত্র/ছাত্রীর নাম: ${student.name}\n`;
    report += `রোল: ${student.roll}\n`;
    report += `------------------------------------\n`;
    if (absences.length > 0) {
      absences.forEach(record => {
        const date = new Date(record.timestamp);
        report += `- তারিখ: ${date.toLocaleDateString('bn-BD')}, সময়: ${date.toLocaleTimeString('bn-BD')}\n`;
        if (record.note) {
          report += `  নোট: ${record.note}\n`;
        }
      });
    } else {
      report += "কোনো অনুপস্থিতি নেই।\n";
    }
    report += `\nমোট অনুপস্থিত: ${absences.length} দিন`;

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
          
          <h4 className="text-md font-semibold mb-3 text-gray-700 border-b pb-2">অনুপস্থিতির তালিকা</h4>
          
          {absences.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {absences.map(record => {
                const date = new Date(record.timestamp);
                return (
                  <div key={record.id} className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="font-medium text-red-800">তারিখ: {date.toLocaleDateString('bn-BD')}</p>
                            <p className="text-sm text-red-600">সময়: {date.toLocaleTimeString('bn-BD')}</p>
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
                                onClick={() => onUpdateRecord(record.id, AttendanceStatus.Present)}
                                title="উপস্থিত হিসাবে চিহ্নিত করুন"
                            >
                                <EditIcon className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">এডিট</span>
                            </Button>
                        </div>
                    </div>
                    {record.note && (
                        <p className="text-xs text-gray-700 mt-2 pt-2 pl-2 border-t border-red-200">
                            <strong>নোট:</strong> {record.note}
                        </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">এই ছাত্র/ছাত্রী কখনো অনুপস্থিত ছিল না।</p>
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