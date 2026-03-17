import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useExams } from "../hooks/useExams";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { useClasses } from "../hooks/useClasses";
import { Plus, Edit, Trash2, FileText, X } from "lucide-react";
import { Exam } from "../types";
import ConfirmationDialog from "../components/ConfirmationDialog";

const Exams: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { exams, addExam, updateExam, deleteExam } = useExams(orgId, user);
  const { academicYears } = useAcademicYears(orgId, user);
  const { classes } = useClasses(orgId, user, role);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  const [name, setName] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");

  const openAddModal = () => {
    setName("");
    setAcademicYearId(academicYears.find(ay => ay.is_active)?.id || "");
    setClassId("");
    setEditingExam(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exam: Exam) => {
    setName(exam.name);
    setAcademicYearId(exam.academicYearId);
    setClassId(exam.classId);
    setEditingExam(exam);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalClassId = classId || "all";
    if (editingExam) {
      updateExam(editingExam.id, { name, academicYearId, classId: finalClassId });
    } else {
      addExam(name, academicYearId, finalClassId);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#0F5C7A]" />
          পরীক্ষা ব্যবস্থাপনা
        </h2>
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          নতুন পরীক্ষা
        </button>
      </div>

      <div className="card-premium p-6">
        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[16px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10">
              <tr>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">পরীক্ষার নাম</th>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">শিক্ষাবর্ষ</th>
                <th className="text-right py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id} className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-all duration-200">
                  <td className="py-4 px-5 text-slate-800 font-medium">{exam.name}</td>
                  <td className="py-4 px-5 text-slate-600">{academicYears.find(ay => ay.id === exam.academicYearId)?.year_name || "N/A"}</td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(exam)} className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExamToDelete(exam)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-500">কোন পরীক্ষা পাওয়া যায়নি।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[6px] p-4">
          <div className="w-[92%] max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold">{editingExam ? "পরীক্ষা সম্পাদনা" : "নতুন পরীক্ষা"}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[50vh]">
                <div>
                  <label className="block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">
                    পরীক্ষার নাম
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-[52px] px-4 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[16px] text-[14px] text-[#1F2937] focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                    placeholder="যেমন: Annual Exam"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">
                    শিক্ষাবর্ষ
                  </label>
                  <select
                    required
                    value={academicYearId}
                    onChange={(e) => setAcademicYearId(e.target.value)}
                    className="w-full h-[52px] px-4 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[16px] text-[14px] text-[#1F2937] focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                  >
                    <option value="">শিক্ষাবর্ষ নির্বাচন করুন</option>
                    {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.year_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">
                    শ্রেণি (ঐচ্ছিক)
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full h-[52px] px-4 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[16px] text-[14px] text-[#1F2937] focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                  >
                    <option value="">সব শ্রেণি</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-[#E5E7EB] flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-[#F3F4F6] text-[#374151] h-[48px] rounded-[14px] font-bold hover:bg-[#E5E7EB] transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0F5C7A] text-white h-[48px] rounded-[14px] font-bold hover:bg-[#0D4D66] transition-colors"
                >
                  সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {examToDelete && (
        <ConfirmationDialog
          isOpen={!!examToDelete}
          onClose={() => setExamToDelete(null)}
          onConfirm={() => {
            deleteExam(examToDelete.id);
            setExamToDelete(null);
          }}
          title="পরীক্ষা মুছে ফেলুন"
          message={`আপনি কি নিশ্চিত যে "${examToDelete.name}" পরীক্ষাটি মুছে ফেলতে চান?`}
        />
      )}
    </div>
  );
};

export default Exams;
