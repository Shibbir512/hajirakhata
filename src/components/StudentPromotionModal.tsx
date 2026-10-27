import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Student, ClassData } from "../types";
import { X, ArrowRight, UserCheck, GraduationCap } from "lucide-react";
import { toBengaliNumber, formatAcademicYear, toEnglishNumber } from "../utils/dateFormatter";
import toast from "react-hot-toast";
import { ClassSelect } from "./ClassSelect";

interface StudentPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceClassId: string;
  classes: ClassData[];
  academicYears?: any[];
  students: Student[];
  onPromote: (promotions: { studentId: string; newClassId?: string; newRoll?: number; isAlumni?: boolean; graduationYearId?: string }[]) => Promise<void>;
}

const StudentPromotionModal: React.FC<StudentPromotionModalProps> = ({
  isOpen,
  onClose,
  sourceClassId,
  classes,
  academicYears = [],
  students,
  onPromote,
}) => {
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [graduationYearId, setGraduationYearId] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [newRolls, setNewRolls] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize selection and rolls when modal opens or students change
  useEffect(() => {
    if (isOpen) {
      const activeStudents = students.filter(s => s.isActive !== false);
      setSelectedStudents(new Set(activeStudents.map(s => s.id)));
      
      const initialRolls: { [key: string]: number } = {};
      activeStudents.forEach(s => {
        initialRolls[s.id] = s.roll;
      });
      setNewRolls(initialRolls);
      setTargetClassId("");
      setGraduationYearId("");
    }
  }, [isOpen, students]);

  if (!isOpen) return null;

  const activeStudents = students.filter(s => s.isActive !== false).sort((a, b) => a.roll - b.roll);
  const sourceClass = classes.find(c => c.id === sourceClassId);

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStudents(newSet);
  };

  const toggleAll = () => {
    if (selectedStudents.size === activeStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(activeStudents.map(s => s.id)));
    }
  };

  const handleRollChange = (id: string, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      setNewRolls(prev => ({ ...prev, [id]: num }));
    }
  };

  const handleSubmit = async () => {
    if (!targetClassId) {
      toast.error("অনুগ্রহ করে নতুন ক্লাস বা অ্যালামনাই নির্বাচন করুন।");
      return;
    }
    if (targetClassId === "alumni" && !graduationYearId) {
      toast.error("অনুগ্রহ করে পাসের শিক্ষাবর্ষ নির্বাচন করুন।");
      return;
    }
    if (selectedStudents.size === 0) {
      toast.error("অনুগ্রহ করে অন্তত একজন শিক্ষার্থী নির্বাচন করুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const promotions = Array.from(selectedStudents).map(studentId => {
        if (targetClassId === "alumni") {
          return {
            studentId,
            isAlumni: true,
            graduationYearId,
          };
        }
        return {
          studentId,
          newClassId: targetClassId,
          newRoll: newRolls[studentId] || 1,
        };
      });

      await onPromote(promotions);
      onClose();
    } catch (error) {
      console.error("Promotion failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[6px] p-2 sm:p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#111C2E] rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] border border-[#14B8A6] dark:border-teal-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">শিক্ষার্থী প্রমোশন</h3>
              <p className="text-xs text-white/80">
                বর্তমান ক্লাস: {sourceClass?.name || "অজানা"}
              </p>
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
          <div className="mb-6 bg-[#F9FAFB] dark:bg-slate-900/60 p-4 rounded-[16px] border border-[#E5E7EB] dark:border-slate-800 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-[#374151] dark:text-slate-200">নতুন ক্লাস/অবস্থা:</label>
              <ClassSelect
                value={targetClassId}
                onChange={(id) => setTargetClassId(id)}
                options={[
                  ...classes.filter(c => c.id !== sourceClassId).map(c => ({ id: c.id, name: c.name })),
                  { id: "alumni", name: "🎓 প্রাক্তন শিক্ষার্থী (Alumni)" }
                ]}
                placeholder="-- নির্বাচন করুন --"
                title="নতুন শ্রেণি বা অবস্থা নির্বাচন"
                icon={GraduationCap}
                className="w-full"
              />
            </div>

            {targetClassId === "alumni" && (
              <div className="flex flex-col gap-2 pt-4 border-t border-[#E5E7EB] dark:border-slate-800">
                <label className="text-[14px] font-medium text-[#374151] dark:text-slate-200">পাসের শিক্ষাবর্ষ:</label>
                <ClassSelect
                  value={graduationYearId}
                  onChange={(id) => setGraduationYearId(id)}
                  options={academicYears.map(year => ({ id: year.id, name: formatAcademicYear(year) }))}
                  placeholder="-- শিক্ষাবর্ষ নির্বাচন করুন --"
                  title="পাসের শিক্ষাবর্ষ নির্বাচন"
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div className="border border-[#E5E7EB] rounded-[16px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="p-3 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === activeStudents.length && activeStudents.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300 text-[#14B8A6] focus:ring-[#14B8A6]"
                      />
                    </th>
                    <th className="p-3 text-sm font-semibold text-[#374151]">রোল</th>
                    <th className="p-3 text-sm font-semibold text-[#374151]">নাম</th>
                    <th className="p-3 text-sm font-semibold text-[#374151]">আইডি</th>
                    <th className="p-3 text-sm font-semibold text-[#374151] w-24">
                      {targetClassId === "alumni" ? "অবস্থা" : "নতুন রোল"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map((student) => {
                    const isSelected = selectedStudents.has(student.id);
                    return (
                      <tr 
                        key={student.id} 
                        className={`border-b border-[#F3F4F6] last:border-0 transition-colors ${isSelected ? 'bg-[#14B8A6]/5' : 'hover:bg-[#F9FAFB]'}`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudent(student.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#14B8A6] focus:ring-[#14B8A6]"
                          />
                        </td>
                        <td className="p-3 text-sm font-medium text-[#1F2937]">{toBengaliNumber(student.roll)}</td>
                        <td className="p-3 text-sm font-medium text-[#1F2937]">{student.name}</td>
                        <td className="p-3 text-xs text-[#6B7280]">{student.studentUid || "-"}</td>
                        <td className="p-3">
                          {targetClassId === "alumni" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-teal-100 text-teal-800">
                              <GraduationCap className="w-3 h-3" />
                              প্রাক্তন
                            </span>
                          ) : (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={newRolls[student.id] || ""}
                              onChange={(e) => handleRollChange(student.id, toEnglishNumber(e.target.value))}
                              disabled={!isSelected}
                              className={`w-full px-2 py-1.5 rounded-lg border text-sm ${isSelected ? 'border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]' : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#9CA3AF]'} focus:outline-none`}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#E5E7EB] dark:border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-[#F3F4F6] dark:bg-slate-800 text-[#374151] dark:text-slate-200 h-[48px] rounded-[14px] font-bold hover:bg-[#E5E7EB] dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            বাতিল
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedStudents.size === 0 || !targetClassId}
            className="flex-1 bg-[#0F5C7A] text-white h-[48px] rounded-[14px] shadow-[0_6px_15px_rgba(15,92,122,0.35)] font-bold hover:bg-[#0C4A63] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "প্রসেস হচ্ছে..." : "প্রমোশন দিন"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StudentPromotionModal;
