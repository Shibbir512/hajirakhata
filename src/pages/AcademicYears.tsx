import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { Plus, Edit, Trash2, CalendarDays, CheckCircle, Circle } from "lucide-react";
import { AcademicYear } from "../types";
import ConfirmationDialog from "../components/ConfirmationDialog";

const AcademicYears: React.FC = () => {
  const { user, orgId } = useAuth();
  const { academicYears, addAcademicYear, updateAcademicYear, deleteAcademicYear, setActiveAcademicYear } = useAcademicYears(orgId, user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);

  const [yearName, setYearName] = useState("");
  const [hijriYear, setHijriYear] = useState("");
  const [isActive, setIsActive] = useState(false);

  const openAddModal = () => {
    setYearName("");
    setHijriYear("");
    setIsActive(academicYears.length === 0); // Default to active if it's the first one
    setEditingYear(null);
    setIsModalOpen(true);
  };

  const openEditModal = (year: AcademicYear) => {
    setYearName(year.year_name);
    setHijriYear(year.hijri_year);
    setIsActive(year.is_active);
    setEditingYear(year);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingYear) {
      updateAcademicYear(editingYear.id, { year_name: yearName, hijri_year: hijriYear, is_active: isActive });
    } else {
      addAcademicYear(yearName, hijriYear, isActive);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-indigo-600" />
          শিক্ষাবর্ষ ব্যবস্থাপনা
        </h2>
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          নতুন শিক্ষাবর্ষ
        </button>
      </div>

      <div className="card-premium p-6">
        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[16px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10">
              <tr>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">শিক্ষাবর্ষ</th>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">হিজরি সন</th>
                <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">স্ট্যাটাস</th>
                <th className="text-right py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB]">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody>
              {academicYears.map((year) => (
                <tr key={year.id} className="border-b border-[#E5E7EB] hover:bg-gray-50 transition-all duration-200">
                  <td className="py-4 px-5 text-slate-800 font-medium">{year.year_name}</td>
                  <td className="py-4 px-5 text-slate-600">{year.hijri_year}</td>
                  <td className="py-4 px-5">
                    <button
                      onClick={() => !year.is_active && setActiveAcademicYear(year.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        year.is_active 
                          ? "bg-emerald-100 text-emerald-700 cursor-default" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                      }`}
                    >
                      {year.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      {year.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </button>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(year)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setYearToDelete(year)} 
                        className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                        disabled={year.is_active}
                        title={year.is_active ? "সক্রিয় শিক্ষাবর্ষ মুছে ফেলা যাবে না" : "মুছে ফেলুন"}
                      >
                        <Trash2 className={`w-4 h-4 ${year.is_active ? "opacity-50" : ""}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {academicYears.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">কোন শিক্ষাবর্ষ পাওয়া যায়নি।</td>
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
              <h3 className="text-lg font-bold text-slate-800">{editingYear ? "শিক্ষাবর্ষ সম্পাদনা" : "নতুন শিক্ষাবর্ষ যোগ"}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">শিক্ষাবর্ষের নাম</label>
                <input type="text" required value={yearName} onChange={(e) => setYearName(e.target.value)} className="input-premium w-full" placeholder="যেমন: ২০২৫-২০২৬" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">হিজরি সন</label>
                <input type="text" required value={hijriYear} onChange={(e) => setHijriYear(e.target.value)} className="input-premium w-full" placeholder="যেমন: ১৪৪৭ হিজরি" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)} 
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
                  এটি সক্রিয় শিক্ষাবর্ষ হিসেবে সেট করুন
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-outline">বাতিল</button>
                <button type="submit" className="btn-primary">সংরক্ষণ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {yearToDelete && (
        <ConfirmationDialog
          isOpen={!!yearToDelete}
          onClose={() => setYearToDelete(null)}
          onConfirm={() => {
            deleteAcademicYear(yearToDelete.id);
            setYearToDelete(null);
          }}
          title="শিক্ষাবর্ষ মুছে ফেলুন"
          message={`আপনি কি নিশ্চিত যে "${yearToDelete.year_name}" শিক্ষাবর্ষটি মুছে ফেলতে চান?`}
        />
      )}
    </div>
  );
};

export default AcademicYears;
