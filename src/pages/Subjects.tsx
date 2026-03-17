import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useSubjects } from "../hooks/useSubjects";
import { Plus, Edit, Trash2, Book } from "lucide-react";
import { Subject } from "../types";
import clsx from "clsx";
import ConfirmationDialog from "../components/ConfirmationDialog";

const Subjects: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { subjects, addSubject, updateSubject, deleteSubject } = useSubjects(orgId, user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [fullMarks, setFullMarks] = useState(100);
  const [passMarks, setPassMarks] = useState(33);
  const [subjectOrder, setSubjectOrder] = useState(1);
  const [subjectType, setSubjectType] = useState<'written' | 'oral' | 'practical'>('written');

  const openAddModal = () => {
    setName("");
    setClassId(classes[0]?.id || "");
    setFullMarks(100);
    setPassMarks(33);
    setSubjectOrder(subjects.length + 1);
    setSubjectType('written');
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setName(subject.name);
    setClassId(subject.classId);
    setFullMarks(subject.fullMarks);
    setPassMarks(subject.passMarks);
    setSubjectOrder(subject.subjectOrder);
    setSubjectType(subject.subjectType);
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject) {
      updateSubject(editingSubject.id, { name, classId, fullMarks, passMarks, subjectOrder, subjectType });
    } else {
      addSubject(name, classId, fullMarks, passMarks, subjectOrder, subjectType);
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
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          নতুন বিষয়
        </button>
      </div>

      <div className="card-premium p-6">
        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[16px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10">
              <tr>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">বিষয়ের নাম</th>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">শ্রেণি</th>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">পূর্ণমান</th>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">পাস নম্বর</th>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">ধরন</th>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">অর্ডার</th>
                <th className="text-right py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-all duration-200">
                  <td className="py-4 px-5 text-slate-800 font-medium">{subject.name}</td>
                  <td className="py-4 px-5 text-slate-600">{classes.find(c => c.id === subject.classId)?.name || "N/A"}</td>
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
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">কোন বিষয় পাওয়া যায়নি।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">{editingSubject ? "বিষয় সম্পাদনা" : "নতুন বিষয় যোগ"}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">বিষয়ের নাম</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-premium w-full" placeholder="যেমন: বাংলা" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">শ্রেণি</label>
                <select required value={classId} onChange={(e) => setClassId(e.target.value)} className="input-premium w-full">
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">পূর্ণমান</label>
                  <input type="number" required min="1" value={fullMarks} onChange={(e) => setFullMarks(Number(e.target.value))} className="input-premium w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">পাস নম্বর</label>
                  <input type="number" required min="1" value={passMarks} onChange={(e) => setPassMarks(Number(e.target.value))} className="input-premium w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ধরন</label>
                  <select required value={subjectType} onChange={(e) => setSubjectType(e.target.value as any)} className="input-premium w-full">
                    <option value="written">Written</option>
                    <option value="oral">Oral</option>
                    <option value="practical">Practical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">অর্ডার</label>
                  <input type="number" required min="1" value={subjectOrder} onChange={(e) => setSubjectOrder(Number(e.target.value))} className="input-premium w-full" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">বাতিল</button>
                <button type="submit" className="btn-primary">সংরক্ষণ করুন</button>
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
