import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Edit3, Camera, Upload } from "lucide-react";
import { Student } from "../types";
import { toBengaliNumber } from "../utils/dateFormatter";
import { compressAndUploadImage } from "../utils/imageUpload";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

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
  const { orgId } = useAuth();
  const [name, setName] = useState(student.name);
  const [fatherName, setFatherName] = useState(student.fatherName || "");
  const [phone, setPhone] = useState(student.phone || "");
  const [address, setAddress] = useState(student.address || "");
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(student.photoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Removed strict file.type check to prevent blocking valid images on some Android devices
      // where the camera might return a file with an empty or incorrect type.
      setImageFile(file);
      
      // Use FileReader for better compatibility on older Android WebViews
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    
    setIsUploading(true);
    let photoUrl = student.photoUrl;

    try {
      if (imageFile && orgId) {
        const safeFileName = imageFile.name ? imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_') : 'image.jpg';
        const path = `organizations/${orgId}/students/${Date.now()}_${safeFileName}`;
        photoUrl = await compressAndUploadImage(imageFile, path) || undefined;
      }

      onSave({
        name: name.trim(),
        fatherName: fatherName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        photoUrl: photoUrl,
      });
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      const errMsg = err?.message || "";
      if (errMsg.includes("unauthorized") || errMsg.includes("permission") || errMsg.includes("স্টোরেজ পারমিশন")) {
        toast.error("স্টোরেজ পারমিশন নেই! ফায়ারবেস স্টোরেজ রুলস আপডেট করুন।");
      } else {
        toast.error(`ছবি আপলোড করতে সমস্যা হয়েছে: ${errMsg}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-[6px]">
      <div className="w-[92%] max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-[#14B8A6] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
              <Edit3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">তথ্য সম্পাদনা</h3>
              <p className="text-xs text-white/80">শিক্ষার্থীর তথ্য</p>
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
        <div className="p-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Image Upload Section */}
            <div className="flex flex-col items-center justify-center gap-3 mb-4">
              <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-[#D1D5DB] flex items-center justify-center bg-[#F9FAFB] overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Edit3 className="w-8 h-8 text-[#9CA3AF]" />
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                  className="hidden"
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handleImageChange}
                  onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F3F4F6] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#E5E7EB] transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  গ্যালারি
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F3F4F6] text-[#374151] rounded-lg text-sm font-medium hover:bg-[#E5E7EB] transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  ক্যামেরা
                </button>
              </div>
            </div>

            <div className="bg-[#F9FAFB] p-4 rounded-[16px] border border-[#E5E7EB] flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-[#0F5C7A]/10 text-[#0F5C7A] flex items-center justify-center text-lg font-bold">#</span>
              <div>
                <p className="text-[12px] text-[#6B7280] font-medium">রোল নম্বর</p>
                <p className="font-bold text-[#1F2937] text-[16px]">{toBengaliNumber(student.roll)}</p>
              </div>
            </div>
            
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
            disabled={isUploading}
            className="flex-1 bg-[#F3F4F6] text-[#374151] h-[48px] rounded-[14px] font-bold hover:bg-[#E5E7EB] transition-colors disabled:opacity-50"
          >
            বাতিল
          </button>
          <button
            type="submit"
            form="edit-student-form"
            disabled={isUploading}
            className="flex-1 bg-[#0F5C7A] text-white h-[48px] rounded-[14px] shadow-[0_6px_15px_rgba(15,92,122,0.35)] font-bold hover:bg-[#0C4A63] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                আপলোড হচ্ছে...
              </>
            ) : (
              "সংরক্ষণ করুন"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentEditModal;
