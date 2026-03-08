import React, { useState, useMemo, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { Plus, Edit, Trash2, Search, Eye, X, Upload, Download, ChevronDown } from "lucide-react";
import { Student } from "../types";
import clsx from "clsx";
import StudentAddModal from "../components/StudentAddModal";
import StudentEditModal from "../components/StudentEditModal";
import Papa from "papaparse";
import mammoth from "mammoth";

const Students: React.FC = () => {
  const { user, orgId } = useAuth();
  const { classes } = useClasses(orgId, user);
  const { students, addStudent, updateStudent, deleteStudent, bulkAddStudents } =
    useStudents(orgId, user);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students[selectedClassId] || [];
  }, [selectedClassId, students]);

  const filteredStudents = useMemo(() => {
    return classStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.roll.toString().includes(searchQuery),
    );
  }, [classStudents, searchQuery]);

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

  const handleDeleteStudent = (id: string) => {
    if (selectedClassId && window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      deleteStudent(id, selectedClassId);
    }
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
      alert("Unsupported file type. Please upload a CSV or DOCX file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = async (format: 'csv' | 'docx') => {
    if (format === 'csv') {
      const csv = Papa.unparse(classStudents.map(s => ({
        Name: s.name,
        Roll: s.roll,
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
            ...classStudents.map(s => new Paragraph({
              children: [
                new TextRun({ text: `${s.roll}. ${s.name}`, bold: true }),
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
        <h2 className="text-3xl font-bold gradient-text tracking-tight">শিক্ষার্থী</h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
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
              "flex items-center justify-center px-4 py-2 rounded-xl font-bold text-white shadow-lg transition-all duration-300 text-sm sm:text-base",
              selectedClassId 
                ? "bg-[#4CAF50] hover:bg-[#43a047] hover:shadow-green-200" 
                : "bg-slate-300 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4 mr-2" />
            শিক্ষার্থী যোগ
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedClassId}
            className={clsx(
              "flex items-center justify-center px-4 py-2 rounded-xl font-bold text-white shadow-md transition-all duration-300 text-sm sm:text-base",
              selectedClassId 
                ? "bg-amber-500 hover:bg-amber-600 hover:shadow-amber-100" 
                : "bg-slate-300 cursor-not-allowed"
            )}
          >
            <Upload className="w-4 h-4 mr-2" />
            আমদানি
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={!selectedClassId || classStudents.length === 0}
            className={clsx(
              "flex items-center justify-center px-4 py-2 rounded-xl font-bold text-white shadow-md transition-all duration-300 text-sm sm:text-base",
              (!selectedClassId || classStudents.length === 0)
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-sky-500 hover:bg-sky-600 hover:shadow-sky-100"
            )}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV এক্সপোর্ট
          </button>
          <button
            onClick={() => handleExport('docx')}
            disabled={!selectedClassId || classStudents.length === 0}
            className={clsx(
              "flex items-center justify-center px-4 py-2 rounded-xl font-bold text-white shadow-md transition-all duration-300 text-sm sm:text-base",
              (!selectedClassId || classStudents.length === 0)
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-rose-500 hover:bg-rose-600 hover:shadow-rose-100"
            )}
          >
            <Download className="w-4 h-4 mr-2" />
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
              className="input-premium w-full search-highlight text-lg font-bold text-teal-700 border-teal-200 bg-teal-50/30 text-center appearance-none pr-10"
            >
              <option value="" className="text-slate-500 font-normal">শ্রেণি নির্বাচন করুন</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-teal-600 w-5 h-5 pointer-events-none" />
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-500 w-5 h-5" />
            <input
              type="text"
              placeholder="শিক্ষার্থীর নাম বা রোল দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium pl-12 search-highlight"
            />
          </div>
        </div>

        {selectedClassId ? (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
                    রোল
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
                    শিক্ষার্থীর নাম
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200 hidden md:table-cell">
                    ফোন
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">
                    কার্যক্রম
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                  >
                    <td className="py-4 px-4 text-slate-800">{student.roll}</td>
                    <td className="py-4 px-4 text-slate-800 font-medium">
                      <div className="flex items-center gap-3">
                        {student.name}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 hidden md:table-cell">
                      {student.phone || "-"}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewingStudent(student)}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                          title="বিস্তারিত দেখুন"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="সম্পাদনা"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors"
                          title="মুছুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500">
                      কোন শিক্ষার্থী পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-lg font-medium text-slate-600 mb-1">কোন শ্রেণি নির্বাচন করা হয়নি</p>
            <p className="text-sm">শিক্ষার্থী ব্যবস্থাপনা করার জন্য উপরের ড্রপডাউন থেকে একটি শ্রেণি নির্বাচন করুন।</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/20">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">শিক্ষার্থীর বিস্তারিত</h3>
              <button
                onClick={() => setViewingStudent(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                <div className="col-span-1 text-sm font-medium text-slate-500">নাম</div>
                <div className="col-span-2 text-sm text-slate-900 font-medium">{viewingStudent.name}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                <div className="col-span-1 text-sm font-medium text-slate-500">রোল নম্বর</div>
                <div className="col-span-2 text-sm text-slate-900">{viewingStudent.roll}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                <div className="col-span-1 text-sm font-medium text-slate-500">পিতার নাম</div>
                <div className="col-span-2 text-sm text-slate-900">{viewingStudent.fatherName || "-"}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                <div className="col-span-1 text-sm font-medium text-slate-500">ফোন</div>
                <div className="col-span-2 text-sm text-slate-900">{viewingStudent.phone || "-"}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 text-sm font-medium text-slate-500">ঠিকানা</div>
                <div className="col-span-2 text-sm text-slate-900 whitespace-pre-wrap">{viewingStudent.address || "-"}</div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setViewingStudent(null)}
                className="btn-secondary"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
