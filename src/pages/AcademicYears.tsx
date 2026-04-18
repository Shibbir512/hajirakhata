import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { Plus, Edit, Trash2, CalendarDays, CheckCircle, Circle, X } from "lucide-react";
import { AcademicYear } from "../types";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { DataTable, Column } from "../components/DataTable";

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

  const columns: Column<AcademicYear>[] = [
    {
      header: "শিক্ষাবর্ষ",
      accessorKey: "year_name",
      sortable: true,
      className: "text-slate-800 font-medium",
    },
    {
      header: "হিজরি সন",
      accessorKey: "hijri_year",
      sortable: true,
      className: "text-slate-600",
    },
    {
      header: "স্ট্যাটাস",
      accessorKey: "is_active",
      sortable: true,
      cell: (year) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!year.is_active) setActiveAcademicYear(year.id);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
            year.is_active 
              ? "bg-[#22C55E]/10 text-[#22C55E] cursor-default" 
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
          }`}
        >
          {year.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
          {year.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
        </button>
      ),
    },
    {
      header: "কার্যক্রম",
      className: "text-right",
      cell: (year) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(year);
            }} 
            className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setYearToDelete(year);
            }} 
            className="p-2 text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 rounded-lg transition-colors"
            disabled={year.is_active}
            title={year.is_active ? "সক্রিয় শিক্ষাবর্ষ মুছে ফেলা যাবে না" : "মুছে ফেলুন"}
          >
            <Trash2 className={`w-4 h-4 ${year.is_active ? "opacity-50" : ""}`} />
          </button>
        </div>
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold gradient-text tracking-tight flex items-center gap-3">
          <CalendarDays className="w-8 h-8 text-[#0F5C7A]" />
          শিক্ষাবর্ষ ব্যবস্থাপনা
        </h2>
        <button onClick={openAddModal} className="btn-primary w-full sm:w-auto h-[42px] px-4 text-sm font-bold shadow-sm whitespace-nowrap flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          নতুন শিক্ষাবর্ষ
        </button>
      </div>

      <div className="card-premium p-6">
        <DataTable 
          data={academicYears} 
          columns={columns} 
          keyExtractor={(year) => year.id} 
          emptyMessage="কোন শিক্ষাবর্ষ পাওয়া যায়নি।"
          onRowClick={(year) => openEditModal(year)}
        />
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-[6px] p-4">
          <div className="w-[92%] max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
                  <CalendarDays className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold">{editingYear ? "শিক্ষাবর্ষ সম্পাদনা" : "নতুন শিক্ষাবর্ষ"}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[50vh]">
                <div>
                  <label className="block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">
                    শিক্ষাবর্ষের নাম
                  </label>
                  <input
                    type="text"
                    required
                    value={yearName}
                    onChange={(e) => setYearName(e.target.value)}
                    className="w-full h-[52px] px-4 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[16px] text-[14px] text-[#1F2937] focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                    placeholder="যেমন: ২০২৫-২০২৬"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">
                    হিজরি সন
                  </label>
                  <input
                    type="text"
                    required
                    value={hijriYear}
                    onChange={(e) => setHijriYear(e.target.value)}
                    className="w-full h-[52px] px-4 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[16px] text-[14px] text-[#1F2937] focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                    placeholder="যেমন: ১৪৪৭ হিজরি"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#F4F7FB] rounded-[16px] border border-[#E5E7EB]">
                  <input 
                    type="checkbox" 
                    id="isActive" 
                    checked={isActive} 
                    onChange={(e) => setIsActive(e.target.checked)} 
                    className="w-5 h-5 text-[#0F5C7A] rounded border-[#E5E7EB] focus:ring-[#0F5C7A]"
                  />
                  <label htmlFor="isActive" className="text-[14px] font-medium text-[#1F2937] cursor-pointer">
                    এটি সক্রিয় শিক্ষাবর্ষ হিসেবে সেট করুন
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-[#E5E7EB] flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-[#F3F4F6] text-[#374151] h-[48px] rounded-[14px] font-bold hover:bg-[#E5E7EB] transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#0F5C7A] text-white h-[48px] rounded-[14px] font-bold hover:bg-[#0D4D66] transition-colors"
                >
                  সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
