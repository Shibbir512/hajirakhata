import React, { useState } from "react";
import { X } from "lucide-react";
import { Student } from "../types";

interface StudentEditModalProps {
  student: Student;
  onClose: () => void;
  onSave: (data: Partial<Student>) => void;
  history?: any[];
}

const StudentEditModal: React.FC<StudentEditModalProps> = ({
  student,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(student.name);
  const [fatherName, setFatherName] = useState(student.fatherName || "");
  const [phone, setPhone] = useState(student.phone || "");
  const [address, setAddress] = useState(student.address || "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    
    onSave({
      name: name.trim(),
      fatherName: fatherName.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-white/20 max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">শিক্ষার্থীর তথ্য সম্পাদনা</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-lg font-bold">#</span>
              <div>
                <p className="text-xs text-slate-500 font-medium">রোল নম্বর</p>
                <p className="font-bold text-slate-800 text-lg">{student.roll}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                শিক্ষার্থীর নাম *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder="শিক্ষার্থীর নাম লিখুন"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                পিতার নাম
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder="পিতার নাম লিখুন"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                ফোন নম্বর
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder="ফোন নম্বর লিখুন"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                ঠিকানা
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                placeholder="ঠিকানা লিখুন"
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm hover:shadow transition-all duration-300 flex items-center justify-center px-4 py-3 rounded-xl font-bold text-sm"
          >
            বাতিল
          </button>
          <button
            type="submit"
            form="edit-student-form"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-300 px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center"
          >
            সংরক্ষণ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentEditModal;
