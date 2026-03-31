import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Student, ClassData } from "../types";
import { X, ArrowRight, UserCheck, GraduationCap } from "lucide-react";
import { toBengaliNumber } from "../utils/dateFormatter";
import toast from "react-hot-toast";

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">শিক্ষার্থী প্রমোশন (Bulk Promotion)</h2>
              <p className="text-sm text-gray-500">
                বর্তমান ক্লাস: <span className="font-semibold text-gray-700">{sourceClass?.name || "অজানা"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="font-semibold text-gray-700 whitespace-nowrap">নতুন ক্লাস/অবস্থা:</span>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="flex-1 sm:w-64 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- নির্বাচন করুন --</option>
                  {classes.filter(c => c.id !== sourceClassId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="alumni" className="font-bold text-teal-600">🎓 প্রাক্তন শিক্ষার্থী (Alumni)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100/50 px-3 py-1.5 rounded-lg">
                <ArrowRight className="w-4 h-4" />
                <span>নির্বাচিত শিক্ষার্থী: {toBengaliNumber(selectedStudents.size)} জন</span>
              </div>
            </div>

            {targetClassId === "alumni" && (
              <div className="flex items-center gap-3 w-full sm:w-auto mt-2 pt-4 border-t border-blue-200">
                <span className="font-semibold text-gray-700 whitespace-nowrap">পাসের শিক্ষাবর্ষ:</span>
                <select
                  value={graduationYearId}
                  onChange={(e) => setGraduationYearId(e.target.value)}
                  className="flex-1 sm:w-64 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- শিক্ষাবর্ষ নির্বাচন করুন --</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>{year.year_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === activeStudents.length && activeStudents.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-3 text-sm font-semibold text-gray-600">বর্তমান রোল</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">শিক্ষার্থীর নাম</th>
                  <th className="p-3 text-sm font-semibold text-gray-600">স্টুডেন্ট আইডি</th>
                  <th className="p-3 text-sm font-semibold text-gray-600 w-32">
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
                      className={`border-b border-gray-100 last:border-0 transition-colors ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(student.id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 font-medium text-gray-700">{toBengaliNumber(student.roll)}</td>
                      <td className="p-3 font-medium text-gray-900">{student.name}</td>
                      <td className="p-3 text-sm text-gray-500">{student.studentUid || "-"}</td>
                      <td className="p-3">
                        {targetClassId === "alumni" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-teal-100 text-teal-800">
                            <GraduationCap className="w-4 h-4" />
                            প্রাক্তন
                          </span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            value={newRolls[student.id] || ""}
                            onChange={(e) => handleRollChange(student.id, e.target.value)}
                            disabled={!isSelected}
                            className={`w-full px-3 py-1.5 rounded-lg border ${isSelected ? 'border-indigo-300 focus:ring-2 focus:ring-indigo-500' : 'border-gray-200 bg-gray-50 text-gray-400'} focus:outline-none`}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {activeStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      এই ক্লাসে কোনো সক্রিয় শিক্ষার্থী নেই।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            বাতিল
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedStudents.size === 0 || !targetClassId}
            className="px-6 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
