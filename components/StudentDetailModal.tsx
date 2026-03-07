import React, { useState, useMemo, useRef } from 'react';
import type { Student, AttendanceRecord } from '../types';
import { AttendanceStatus } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { EditIcon, ClipboardIcon, ChatBubbleBottomCenterTextIcon, ShareIcon, EnvelopeIcon, DocumentTextIcon } from './common/Icons';
import NoteEditModal from './NoteEditModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface StudentDetailModalProps {
  student: Student;
  history: AttendanceRecord[];
  onClose: () => void;
  onUpdateRecord: (recordId: string, newStatus: AttendanceStatus) => void;
  onUpdateRecordNote: (recordId: string, newNote: string) => void;
}

type SortKey = 'date' | 'status' | 'teacher';
type SortOrder = 'asc' | 'desc';

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ student, history, onClose, onUpdateRecord, onUpdateRecordNote }) => {
  const [editingRecordForNote, setEditingRecordForNote] = useState<AttendanceRecord | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedHistory = useMemo(() => {
    const sorted = [...history].sort((a, b) => {
      if (sortBy === 'date') {
        return a.timestamp - b.timestamp;
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      if (sortBy === 'teacher') {
        const nameA = a.teacherName || '';
        const nameB = b.teacherName || '';
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [history, sortBy, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const generateReportText = () => {
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
    return report;
  };

  const handleCopyReport = async () => {
    const report = generateReportText();
    try {
      await navigator.clipboard.writeText(report);
      alert('রিপোর্ট ক্লিপবোর্ডে কপি করা হয়েছে!');
    } catch (err) {
      console.error('Failed to copy report: ', err);
      alert('রিপোর্ট কপি করতে ব্যর্থ হয়েছে।');
    }
  };

  const handleShareReport = async () => {
    const report = generateReportText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${student.name} এর হাজিরার রিপোর্ট`,
          text: report,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyReport();
    }
  };

  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${student.name}_attendance_report.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('PDF তৈরি করতে সমস্যা হয়েছে।');
    }
  };

  const handleEmailReport = () => {
    const report = generateReportText();
    const subject = encodeURIComponent(`${student.name} এর হাজিরার রিপোর্ট`);
    const body = encodeURIComponent(report);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <div>
                   <p className="text-lg font-bold text-gray-800">{student.name}</p>
                   <p className="text-sm text-gray-500">রোল নম্বর: {student.roll}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                  <Button onClick={handleShareReport} variant="secondary" size="sm" title="শেয়ার করুন">
                      <ShareIcon className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">শেয়ার</span>
                  </Button>
                  <Button onClick={handleEmailReport} variant="secondary" size="sm" title="ইমেইল করুন">
                      <EnvelopeIcon className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">ইমেইল</span>
                  </Button>
                  <Button onClick={handleDownloadPDF} variant="secondary" size="sm" title="PDF ডাউনলোড করুন">
                      <DocumentTextIcon className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">PDF</span>
                  </Button>
                  <Button onClick={handleCopyReport} variant="secondary" size="sm" title="কপি করুন">
                      <ClipboardIcon className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">কপি</span>
                  </Button>
              </div>
          </div>
          
          <div ref={reportRef} className="bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b pb-2">
              <h4 className="text-md font-semibold text-gray-700">হাজিরার ইতিহাস</h4>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0" data-html2canvas-ignore>
                <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">সর্ট করুন:</span>
                <button 
                  onClick={() => toggleSort('date')}
                  className={`px-2 py-1 text-[10px] font-bold rounded border transition whitespace-nowrap ${sortBy === 'date' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  তারিখ {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  onClick={() => toggleSort('status')}
                  className={`px-2 py-1 text-[10px] font-bold rounded border transition whitespace-nowrap ${sortBy === 'status' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  স্ট্যাটাস {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  onClick={() => toggleSort('teacher')}
                  className={`px-2 py-1 text-[10px] font-bold rounded border transition whitespace-nowrap ${sortBy === 'teacher' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  শিক্ষক {sortBy === 'teacher' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
            
            {sortedHistory.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {sortedHistory.map(record => {
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
                          <div className="flex flex-col sm:flex-row gap-1" data-html2canvas-ignore>
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
          </div>

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