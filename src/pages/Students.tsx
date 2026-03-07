import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { Plus, Edit, Trash2, Search, Eye, X } from "lucide-react";
import { Student } from "../types";
import clsx from "clsx";
import StudentAddModal from "../components/StudentAddModal";
import StudentEditModal from "../components/StudentEditModal";

const Students: React.FC = () => {
  const { user, orgId } = useAuth();
  const { classes } = useClasses(orgId, user);
  const { students, addStudent, updateStudent, deleteStudent } =
    useStudents(orgId, user);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

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

  const handleAddStudent = (name: string, roll: number, fatherName?: string, phone?: string, address?: string) => {
    if (selectedClassId) {
      addStudent(selectedClassId, name, roll, fatherName, phone, address);
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
    if (window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      deleteStudent(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">শিক্ষার্থী</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={!selectedClassId}
          className={clsx(
            "flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm",
            !selectedClassId && "opacity-50 cursor-not-allowed",
          )}
        >
          <Plus className="w-4 h-4 mr-2" />
          শিক্ষার্থী যোগ করুন
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">শ্রেণি নির্বাচন করুন</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="শিক্ষার্থীর নাম বা রোল দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {selectedClassId ? (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
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
                    <td className="py-3 px-4 text-slate-800">{student.roll}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                      {student.phone || "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewingStudent(student)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="বিস্তারিত দেখুন"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="সম্পাদনা"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 overflow-hidden">
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
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
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
