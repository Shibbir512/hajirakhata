import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, Camera, Upload } from "lucide-react";
import { compressAndUploadImage } from "../utils/imageUpload";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

interface StudentAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, fatherName?: string, phone?: string, address?: string, photoUrl?: string, bloodGroup?: string) => void;
}

const StudentAddModal: React.FC<StudentAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const { orgId } = useAuth();
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
    let photoUrl = undefined;

    try {
      if (imageFile && orgId) {
        const safeFileName = imageFile.name ? imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_') : 'image.jpg';
        const path = `organizations/${orgId}/students/${Date.now()}_${safeFileName}`;
        photoUrl = await compressAndUploadImage(imageFile, path);
      }

      onAdd(name, fatherName, phone, address, photoUrl || undefined, bloodGroup);
      setName("");
      setFatherName("");
      setPhone("");
      setAddress("");
      setBloodGroup("");
      setImageFile(null);
      setImagePreview(null);
      setError("");
    } catch (err: any) {
      console.error("Upload error details:", err);
      
      // Check for specific Firebase Storage error codes
      let errorMessage = "ছবি আপলোড করতে সমস্যা হয়েছে।";
      
      if (err.code === 'storage/unauthorized') {
        errorMessage = "ছবি আপলোডের অনুমতি নেই (Storage Unauthorized)।";
      } else if (err.code === 'storage/retry-limit-exceeded') {
        errorMessage = "আপলোডের সময়সীমা শেষ হয়ে গেছে। আবার চেষ্টা করুন।";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-[6px]">
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
        <div className="p-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <form id="add-student-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Image Upload Section */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative group mb-4">
                <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg flex items-center justify-center bg-gradient-to-tr from-slate-100 to-slate-200 overflow-hidden relative">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">ছবি দিন</span>
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Remove Button */}
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors border-2 border-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                {!imagePreview && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      গ্যালারি
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      ক্যামেরা
                    </button>
                  </>
                )}
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

            <div className="relative">
              <label className="block text-[14px] font-medium text-[#374151] mb-1">
                রক্তের গ্রুপ
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full h-[52px] border border-[#D1D5DB] rounded-[16px] bg-[#F9FAFB] px-4 focus:border-[#14B8A6] outline-none appearance-none"
              >
                <option value="">রক্তের গ্রুপ নির্বাচন করুন</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              <div className="absolute inset-y-0 right-0 top-[28px] flex items-center px-4 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
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
            form="add-student-form"
            disabled={isUploading}
            className="flex-1 bg-[#0F5C7A] text-white h-[48px] rounded-[14px] shadow-[0_6px_15px_rgba(15,92,122,0.35)] font-bold hover:bg-[#0C4A63] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                আপলোড হচ্ছে...
              </>
            ) : (
              "যোগ করুন"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentAddModal;
