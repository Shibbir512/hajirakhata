import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Edit3, Camera, Upload } from "lucide-react";
import { Student } from "../types";
import { toBengaliNumber, toEnglishNumber } from "../utils/dateFormatter";
import { compressAndUploadImage } from "../utils/imageUpload";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import ImageCropper from "./ImageCropper";
import { base64ToFile } from "../utils/cropImage";

interface StudentEditModalProps {
  student: Student;
  onClose: () => void;
  onSave: (data: Partial<Student>) => void;
  history?: any[];
}

type CompressionLevel = 'high' | 'medium' | 'low';

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
  const [bloodGroup, setBloodGroup] = useState(student.bloodGroup || "");
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(student.photoUrl || null);
  const [compressionLevel, setCompressionLevel] = useState<'high' | 'medium' | 'low'>('medium');
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setCropImageSrc(e.target.result as string);
          setShowCropper(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageBase64: string) => {
    setImagePreview(croppedImageBase64);
    const croppedFile = base64ToFile(croppedImageBase64, 'cropped_image.jpg');
    setImageFile(croppedFile);
    setShowCropper(false);
    setCropImageSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropImageSrc(null);
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
        photoUrl = await compressAndUploadImage(imageFile, path, compressionLevel) || undefined;
      }

      onSave({
        name: name.trim(),
        fatherName: fatherName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        bloodGroup: bloodGroup,
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

              {/* Cropper Modal */}
              {showCropper && cropImageSrc && (
                <ImageCropper
                  imageSrc={cropImageSrc}
                  onCropComplete={handleCropComplete}
                  onCancel={handleCropCancel}
                />
              )}

              {imagePreview && (
                <div className="w-full mt-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ছবির কোয়ালিটি (Image Quality)</label>
                  <select
                    value={compressionLevel}
                    onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-[#0F5C7A] focus:border-[#0F5C7A] block p-2.5"
                  >
                    <option value="high">High Quality (Large size)</option>
                    <option value="medium">Medium Quality (Balanced)</option>
                    <option value="low">Low Quality (Fast upload)</option>
                  </select>
                </div>
              )}
              
              <div className="flex gap-2 mt-2">
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
                type="text"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(toEnglishNumber(e.target.value))}
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
