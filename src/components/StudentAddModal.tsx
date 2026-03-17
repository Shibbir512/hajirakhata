import React, { useState } from "react";
import { X } from "lucide-react";

interface StudentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, fatherName?: string, phone?: string, address?: string) => void;
}

const StudentAddModal: React.FC<StudentAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    onAdd(name, fatherName, phone, address);
    setName("");
    setFatherName("");
    setPhone("");
    setAddress("");
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col border border-white/20">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            নতুন শিক্ষার্থী যোগ করুন
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="add-student-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
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

            <div className="bg-[#0F5C7A]/10 p-4 rounded-2xl border border-[#0F5C7A]/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0F5C7A]/20 text-[#0F5C7A] flex items-center justify-center font-bold text-sm">i</div>
              <p className="text-sm text-[#0F5C7A] font-medium">
                রোল নম্বর স্বয়ংক্রিয়ভাবে বরাদ্দ করা হবে।
              </p>
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

            {error && <p className="text-sm text-[#EF4444] font-medium">{error}</p>}
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#EF4444] hover:bg-[#EF4444]/90 text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center px-6 py-2 rounded-xl font-bold"
          >
            <X className="w-5 h-5 mr-2" />
            বাতিল
          </button>
          <button
            type="submit"
            form="add-student-form"
            className="bg-white text-[#0F5C7A] border border-[#0F5C7A]/20 shadow-md hover:shadow-lg hover:bg-[#0F5C7A]/10 transition-all duration-300 px-6 py-2 rounded-2xl font-bold"
          >
            যোগ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAddModal;
