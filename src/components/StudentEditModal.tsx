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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col border border-white/20">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">শিক্ষার্থীর তথ্য সম্পাদনা</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">#</span>
                রোল নম্বর:{" "}
                <span className="font-bold text-slate-800 text-base">{student.roll}</span>
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                শিক্ষার্থীর নাম *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-premium"
                placeholder="শিক্ষার্থীর নাম লিখুন"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                পিতার নাম
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="input-premium"
                placeholder="পিতার নাম লিখুন"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ফোন নম্বর
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-premium"
                placeholder="ফোন নম্বর লিখুন"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ঠিকানা
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-premium"
                placeholder="ঠিকানা লিখুন"
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-rose-500 hover:bg-rose-600 text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center px-6 py-2 rounded-xl font-bold"
          >
            <X className="w-5 h-5 mr-2" />
            বাতিল
          </button>
          <button
            type="submit"
            form="edit-student-form"
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-300 px-6 py-2 rounded-xl font-bold"
          >
            সংরক্ষণ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentEditModal;
