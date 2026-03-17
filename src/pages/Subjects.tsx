import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useSubjects } from "../hooks/useSubjects";
import { Plus, Edit, Trash2, Book, X } from "lucide-react";
import { Subject } from "../types";
import clsx from "clsx";
import ConfirmationDialog from "../components/ConfirmationDialog";

const Subjects: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { subjects, addSubject, updateSubject, deleteSubject } = useSubjects(orgId, user);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const [subjectsList, setSubjectsList] = useState<{ name: string; nameAr: string; fullMarks: number; passMarks: number; subjectType: 'written' | 'oral' | 'practical'; subjectOrder: number }[]>(
    Array.from({ length: 7 }, (_, i) => ({ name: "", nameAr: "", fullMarks: 100, passMarks: 35, subjectType: 'written', subjectOrder: i + 1 }))
  );
  const [classId, setClassId] = useState("");

  const filteredSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    return subjects.filter(s => s.classId === selectedClassId).sort((a, b) => a.subjectOrder - b.subjectOrder);
  }, [subjects, selectedClassId]);

  const openAddModal = () => {
    setSubjectsList(Array.from({ length: 7 }, (_, i) => ({ name: "", nameAr: "", fullMarks: 100, passMarks: 35, subjectType: 'written', subjectOrder: i + 1 })));
    setClassId(selectedClassId || classes[0]?.id || "");
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setSubjectsList([{ 
      name: subject.name, 
      nameAr: subject.nameAr || "", 
      fullMarks: subject.fullMarks, 
      passMarks: subject.passMarks, 
      subjectOrder: subject.subjectOrder, 
      subjectType: subject.subjectType 
    }]);
    setClassId(subject.classId);
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject) {
      updateSubject(editingSubject.id, { 
        name: subjectsList[0].name, 
        nameAr: subjectsList[0].nameAr, 
        classId, 
        fullMarks: subjectsList[0].fullMarks, 
        passMarks: subjectsList[0].passMarks, 
        subjectOrder: subjectsList[0].subjectOrder, 
        subjectType: subjectsList[0].subjectType 
      });
    } else {
      for (const subject of subjectsList) {
        if (subject.name.trim() !== "") {
          await addSubject(subject.name, subject.nameAr, classId, subject.fullMarks, subject.passMarks, subject.subjectOrder, subject.subjectType);
        }
      }
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Book className="w-6 h-6 text-[#0F5C7A]" />
          বিষয় ব্যবস্থাপনা
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="input-premium min-w-[200px]"
          >
            <option value="">শ্রেণি নির্বাচন করুন</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button onClick={openAddModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            নতুন বিষয়
          </button>
        </div>
      </div>

      <div className="card-premium p-6">
        {!selectedClassId ? (
          <div className="text-center py-12 text-slate-500">
            <Book className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">বিষয়ের তালিকা দেখতে প্রথমে একটি শ্রেণি নির্বাচন করুন।</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E5E7EB] rounded-[16px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8F9FA] sticky top-0 z-10">
                <tr>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">বিষয়ের নাম</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">পূর্ণমান</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">পাস নম্বর</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">ধরন</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">অর্ডার</th>
                  <th className="text-right py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-all duration-200">
                    <td className="py-4 px-5 text-slate-800 font-medium">{subject.name}</td>
                    <td className="py-4 px-5 text-slate-600">{subject.fullMarks}</td>
                    <td className="py-4 px-5 text-slate-600">{subject.passMarks}</td>
                    <td className="py-4 px-5 text-slate-600 capitalize">{subject.subjectType}</td>
                    <td className="py-4 px-5 text-slate-600">{subject.subjectOrder}</td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(subject)} className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setSubjectToDelete(subject)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSubjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">এই শ্রেণিতে কোন বিষয় পাওয়া যায়নি।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[6px] p-4">
          <div className="w-[92%] max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
                  <Book className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold">{editingSubject ? "বিষয় সম্পাদনা" : "নতুন বিষয়"}</h3>
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
              <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
                <div>
                  <label className="block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">
                    শ্রেণি
                  </label>
                  <select
                    required
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full h-[52px] px-4 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[16px] text-[14px] text-[#1F2937] focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                  >
                    <option value="">শ্রেণি নির্বাচন করুন</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                {subjectsList.map((subject, index) => (
                  <div key={index} className="p-4 border border-[#E5E7EB] rounded-[16px] space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-[#0F5C7A]">বিষয় {index + 1}</h4>
                      {subjectsList.length > 1 && (
                        <button type="button" onClick={() => setSubjectsList(subjectsList.filter((_, i) => i !== index))} className="text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="নাম (বাংলা)" value={subject.name} onChange={(e) => { const newList = [...subjectsList]; newList[index] = { ...newList[index], name: e.target.value }; setSubjectsList(newList); }} className="w-full h-[40px] px-3 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[10px] text-[14px]" />
                      <input type="text" placeholder="নাম (আরবি)" value={subject.nameAr} onChange={(e) => { const newList = [...subjectsList]; newList[index] = { ...newList[index], nameAr: e.target.value }; setSubjectsList(newList); }} className="w-full h-[40px] px-3 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[10px] text-[14px]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="পূর্ণমান" value={subject.fullMarks} onChange={(e) => { const newList = [...subjectsList]; newList[index] = { ...newList[index], fullMarks: Number(e.target.value) }; setSubjectsList(newList); }} className="w-full h-[40px] px-3 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[10px] text-[14px]" />
                      <input type="number" placeholder="পাস" value={subject.passMarks} onChange={(e) => { const newList = [...subjectsList]; newList[index] = { ...newList[index], passMarks: Number(e.target.value) }; setSubjectsList(newList); }} className="w-full h-[40px] px-3 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[10px] text-[14px]" />
                      <input type="number" placeholder="অর্ডার" value={subject.subjectOrder} onChange={(e) => { const newList = [...subjectsList]; newList[index] = { ...newList[index], subjectOrder: Number(e.target.value) }; setSubjectsList(newList); }} className="w-full h-[40px] px-3 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[10px] text-[14px]" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setSubjectsList([...subjectsList, { name: "", nameAr: "", fullMarks: 100, passMarks: 35, subjectType: 'written', subjectOrder: subjectsList.length + 1 }])} className="w-full py-3 border-2 border-dashed border-[#0F5C7A] text-[#0F5C7A] rounded-[16px] font-bold">
                  + নতুন বিষয় যোগ করুন
                </button>
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

      {subjectToDelete && (
        <ConfirmationDialog
          isOpen={!!subjectToDelete}
          onClose={() => setSubjectToDelete(null)}
          onConfirm={() => {
            deleteSubject(subjectToDelete.id);
            setSubjectToDelete(null);
          }}
          title="বিষয় মুছে ফেলুন"
          message={`আপনি কি নিশ্চিত যে "${subjectToDelete.name}" বিষয়টি মুছে ফেলতে চান?`}
        />
      )}
    </div>
  );
};

export default Subjects;
