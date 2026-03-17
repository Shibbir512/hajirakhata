import React, { useState, useMemo, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { useStudentAttendance } from "../hooks/useStudentAttendance";
import { Plus, Edit, Trash2, Search, Eye, X, Upload, Download, ChevronDown, Calendar, User } from "lucide-react";
import { Student } from "../types";
import { toBengaliNumber, toBengaliDate } from "../utils/dateFormatter";
import clsx from "clsx";
import toast from "react-hot-toast";
import StudentAddModal from "../components/StudentAddModal";
import StudentEditModal from "../components/StudentEditModal";
import ConfirmationDialog from "../components/ConfirmationDialog";
import Papa from "papaparse";
import mammoth from "mammoth";
import Fuse from "fuse.js";

// Bengali character normalization
const normalizeBengali = (text: string) => {
  return text
    .replace(/[\u09BC\u09BE-\u09CD\u09D7]/g, '') // Remove diacritics/matras
    .replace(/[\u0981-\u0983]/g, '') // Remove chandrabindu, anusvara, visarga
    .toLowerCase();
};

const Students: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students, addStudent, updateStudent, deleteStudent, bulkAddStudents } =
    useStudents(orgId, user, role);
  const { attendanceSessions } = useAttendance(orgId, user, classes, students, role);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClassId]);

  const studentAttendance = useStudentAttendance(viewingStudent?.id || "", attendanceSessions);

  const allStudentsList = useMemo(() => {
    if (selectedClassId) {
      return students[selectedClassId] || [];
    }
    // Flatten all students from all classes
    return Object.values(students).flat();
  }, [selectedClassId, students]);

  const fuse = useMemo(() => {
    const normalizedStudents = allStudentsList.map(s => {
      const className = classes.find(c => c.id === s.classId)?.name || "";
      return {
        ...s,
        className,
        normalizedName: normalizeBengali(s.name),
        normalizedClassName: normalizeBengali(className)
      };
    });
    return new Fuse(normalizedStudents, {
      keys: ['normalizedName', 'roll', 'normalizedClassName'],
      threshold: 0.3,
    });
  }, [allStudentsList, classes]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return allStudentsList;
    const normalizedQuery = normalizeBengali(searchQuery);
    return fuse.search(normalizedQuery).map(result => result.item);
  }, [fuse, searchQuery, allStudentsList]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));

  // Ensure current page is valid when total pages or items per page change
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const handleAddStudent = (name: string, fatherName?: string, phone?: string, address?: string) => {
    if (selectedClassId) {
      addStudent(selectedClassId, name, fatherName, phone, address);
      setIsAddModalOpen(false);
    }
  };

  const handleUpdateStudent = (data: Partial<Student>) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, data);
      setEditingStudent(null);
    }
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedClassId) return;

    if (file.type === "text/csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const studentsList = results.data.map((row: any) => ({
            name: row.name,
            fatherName: row.fatherName,
            phone: row.phone,
            address: row.address,
          }));
          bulkAddStudents(selectedClassId, studentsList);
        },
      });
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const lines = result.value.split("\n");
      const studentsList = lines.map(line => {
        const [name, fatherName, phone, address] = line.split(",");
        return { name: name?.trim(), fatherName: fatherName?.trim(), phone: phone?.trim(), address: address?.trim() };
      }).filter(s => s.name);
      bulkAddStudents(selectedClassId, studentsList);
    } else {
      toast.error("Unsupported file type. Please upload a CSV or DOCX file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = async (format: 'csv' | 'docx') => {
    if (format === 'csv') {
      const csv = Papa.unparse(allStudentsList.map(s => ({
        Name: s.name,
        Roll: s.roll,
        Class: classes.find(c => c.id === s.classId)?.name || "N/A",
        FatherName: s.fatherName,
        Phone: s.phone,
        Address: s.address
      })));
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students.csv';
      a.click();
    } else if (format === 'docx') {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: "Student List", heading: "Heading1" }),
            ...allStudentsList.map(s => new Paragraph({
              children: [
                new TextRun({ text: `${s.roll}. ${s.name} (${classes.find(c => c.id === s.classId)?.name || "N/A"})`, bold: true }),
                new TextRun({ text: `\nFather: ${s.fatherName || "N/A"} | Phone: ${s.phone || "N/A"} | Address: ${s.address || "N/A"}\n\n` })
              ]
            }))
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students.docx';
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">শিক্ষার্থী</h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 w-full sm:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .docx"
            className="hidden"
          />
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={!selectedClassId}
            className={clsx(
              "btn-primary",
              !selectedClassId && "opacity-50 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
            শিক্ষার্থী যোগ
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedClassId}
            className={clsx(
              "btn-secondary",
              !selectedClassId && "opacity-50 cursor-not-allowed"
            )}
          >
            <Upload className="w-4 h-4" />
            আমদানি
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={allStudentsList.length === 0}
            className={clsx(
              "btn-outline",
              (allStudentsList.length === 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Download className="w-4 h-4" />
            CSV এক্সপোর্ট
          </button>
          <button
            onClick={() => handleExport('docx')}
            disabled={allStudentsList.length === 0}
            className={clsx(
              "btn-outline",
              (allStudentsList.length === 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Download className="w-4 h-4" />
            DOCX এক্সপোর্ট
          </button>
        </div>
      </div>

      <div className="card-premium p-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative min-w-[240px]">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="input-premium w-full text-base font-bold text-center text-[#078388] bg-white appearance-none pr-10 rounded-xl py-3 shadow-sm border-[#048791] focus:border-[#048791] focus:ring-2 focus:ring-[#048791]/20 transition-all"
            >
              <option value="" className="text-slate-500 font-normal">শ্রেণি নির্বাচন করুন</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>

          <div className="relative flex-1 bg-[#fbfbfb]">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="শিক্ষার্থীর নাম বা রোল দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium w-full text-base font-medium text-slate-700 bg-white pl-12 rounded-xl py-3 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] border border-[#E5E7EB]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10">
              <tr>
                <th className="py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  রোল
                </th>
                <th className="py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  আইডি
                </th>
                <th className="py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  শিক্ষার্থীর নাম
                </th>
                <th className="py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  শ্রেণি
                </th>
                <th className="py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB] hidden md:table-cell">
                  ফোন
                </th>
                <th className="text-right py-4 px-5 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  কার্যক্রম
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => (
                <tr
                  key={student.id}
                  className="border-b border-[#E5E7EB] hover:bg-slate-50 transition-all duration-200 group"
                  style={{ height: '72px' }}
                >
                  <td className="py-2 px-5 text-slate-800 font-bold">{toBengaliNumber(student.roll)}</td>
                  <td className="py-2 px-5 text-[#0F5C7A] font-mono text-[13px] font-semibold">{student.studentUid || "-"}</td>
                  <td className="py-2 px-5 text-slate-800 font-medium">
                    <div className="flex items-center gap-3 text-[14px]">
                      {student.name}
                    </div>
                  </td>
                  <td className="py-2 px-5 text-slate-600 text-[14px]">
                    {classes.find(c => c.id === student.classId)?.name || "N/A"}
                  </td>
                  <td className="py-2 px-5 text-slate-500 text-[14px] hidden md:table-cell">
                    {student.phone || "-"}
                  </td>
                  <td className="py-2 px-5 text-right">
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewingStudent(student)}
                        className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-lg transition-colors"
                        title="বিস্তারিত দেখুন"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-lg transition-colors"
                        title="সম্পাদনা"
                      >
                        <Edit className="w-4 h-4" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student)}
                        className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                        title="মুছুন"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    কোন শিক্ষার্থী পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages >= 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-sm text-slate-500">
                দেখানো হচ্ছে <span className="font-medium text-slate-700">{toBengaliNumber(filteredStudents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0)}</span> থেকে <span className="font-medium text-slate-700">{toBengaliNumber(Math.min(currentPage * itemsPerPage, filteredStudents.length))}</span> পর্যন্ত, মোট <span className="font-medium text-slate-700">{toBengaliNumber(filteredStudents.length)}</span> জন শিক্ষার্থী
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">প্রতি পাতায়:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {[5, 10, 20, 50, 100].map(val => (
                    <option key={val} value={val}>{toBengaliNumber(val)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                পূর্ববর্তী
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show current, first, last, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={clsx(
                          "w-9 h-9 rounded-xl text-sm transition-all duration-300",
                          currentPage === page
                            ? "bg-[#0F5C7A] text-white shadow-sm font-bold"
                            : "text-slate-600 hover:bg-slate-100 font-medium"
                        )}
                      >
                        {toBengaliNumber(page)}
                      </button>
                    );
                  }
                  // Show ellipsis
                  if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="px-2 text-slate-400">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                পরবর্তী
              </button>
            </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <StudentAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddStudent}
        />
      )}

      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={handleUpdateStudent}
        />
      )}

      {viewingStudent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="bg-slate-800 p-6 text-white relative">
              <button
                onClick={() => setViewingStudent(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#0F5C7A]/20 flex items-center justify-center border-2 border-[#0F5C7A]/30 shadow-sm">
                  <User className="w-8 h-8 text-[#0F5C7A]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{viewingStudent.name}</h3>
                  <p className="text-slate-300 text-sm">রোল: {toBengaliNumber(viewingStudent.roll)}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">পিতার নাম</p>
                  <p className="text-sm text-slate-800 font-medium">{viewingStudent.fatherName || "-"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ফোন নম্বর</p>
                  <p className="text-sm text-slate-800 font-medium">{viewingStudent.phone || "-"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ঠিকানা</p>
                  <p className="text-sm text-slate-800 font-medium">{viewingStudent.address || "-"}</p>
                </div>
              </div>
              
              {/* Attendance */}
              <div>
                <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0F5C7A]" />
                  সাম্প্রতিক হাজিরা
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                  {studentAttendance.length > 0 ? (
                    studentAttendance.map((record, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm">
                        <span className="text-slate-600 font-medium">{toBengaliDate(record.date)}</span>
                        <span className={clsx(
                          "font-bold px-4 py-1.5 rounded-full text-xs",
                          record.status === 'present' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                        )}>
                          {record.status === 'present' ? 'উপস্থিত' : 'অনুপস্থিত'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic bg-slate-50 p-6 rounded-2xl text-center">কোন হাজিরা রেকর্ড পাওয়া যায়নি।</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewingStudent(null)}
                className="btn-primary px-8 py-3 rounded-2xl shadow-md hover:shadow-lg"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
      {studentToDelete && (
        <ConfirmationDialog
          isOpen={!!studentToDelete}
          onClose={() => setStudentToDelete(null)}
          onConfirm={() => {
            if (studentToDelete) {
              deleteStudent(studentToDelete.id, studentToDelete.classId);
            }
            setStudentToDelete(null);
          }}
          title="শিক্ষার্থী মুছে ফেলুন"
          message={`আপনি কি নিশ্চিত যে শিক্ষার্থী ${studentToDelete.name}-কে মুছে ফেলতে চান? এই কাজটি অপরিবর্তনীয়।`}
        />
      )}
    </div>
  );
};

export default Students;
