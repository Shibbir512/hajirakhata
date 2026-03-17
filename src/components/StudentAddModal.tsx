import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[6px]">
      <div className="w-[92%] max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">নতুন শিক্ষার্থী</h3>
              <p className="text-xs text-white/80">তথ্য যোগ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          <form id="add-student-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[14px] font-medium text-[#374151] mb-1">
                শিক্ষার্থীর নাম *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[52px] border border-[#D1D5DB] rounded-[16px] bg-[#F9FAFB] px-4 focus:border-[#14B8A6] outline-none"
                placeholder="নাম লিখুন"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#374151] mb-1">
                পিতার নাম
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full h-[52px] border border-[#D1D5DB] rounded-[16px] bg-[#F9FAFB] px-4 focus:border-[#14B8A6] outline-none"
                placeholder="পিতার নাম লিখুন"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#374151] mb-1">
                ফোন নম্বর
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-[52px] border border-[#D1D5DB] rounded-[16px] bg-[#F9FAFB] px-4 focus:border-[#14B8A6] outline-none"
                placeholder="ফোন নম্বর লিখুন"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#374151] mb-1">
                ঠিকানা
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-[100px] border border-[#D1D5DB] rounded-[16px] bg-[#F9FAFB] px-4 py-3 focus:border-[#14B8A6] outline-none"
                placeholder="ঠিকানা লিখুন"
              />
            </div>

            {error && <p className="text-sm text-[#EF4444] font-medium">{error}</p>}
          </form>
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-[#E5E7EB] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-[#F3F4F6] text-[#374151] h-[48px] rounded-[14px] font-bold hover:bg-[#E5E7EB] transition-colors"
          >
            বাতিল
          </button>
          <button
            type="submit"
            form="add-student-form"
            className="flex-1 bg-[#0F5C7A] text-white h-[48px] rounded-[14px] shadow-[0_6px_15px_rgba(15,92,122,0.35)] font-bold hover:bg-[#0C4A63] transition-colors"
          >
            যোগ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAddModal;
