import React from "react";
import { AcademicYear, ClassData, Exam, Student } from "../types";
import { Calendar, Users, FileText, User, ChevronDown } from "lucide-react";

interface MarksheetFilterProps {
  t: any;
  selectedAcademicYearId: string;
  setSelectedAcademicYearId: (id: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedExamId: string;
  setSelectedExamId: (id: string) => void;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  academicYears: AcademicYear[];
  classes: ClassData[];
  filteredExams: Exam[];
  filteredStudents: Student[];
  fetchResults: () => void;
  loading: boolean;
  setResults: (results: any[]) => void;
}

export const MarksheetFilter: React.FC<MarksheetFilterProps> = ({
  t,
  selectedAcademicYearId,
  setSelectedAcademicYearId,
  selectedClassId,
  setSelectedClassId,
  selectedExamId,
  setSelectedExamId,
  selectedStudentId,
  setSelectedStudentId,
  academicYears,
  classes,
  filteredExams,
  filteredStudents,
  fetchResults,
  loading,
  setResults
}) => {
  return (
    <div className="card-premium p-6 print:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">{t.academicYearLabel}</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                setSelectedAcademicYearId(e.target.value);
                setSelectedExamId("");
                setResults([]);
              }}
              className="w-full pl-9 pr-8 h-[42px] bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F5C7A]/20 focus:border-[#0F5C7A] transition-all appearance-none cursor-pointer font-medium text-sm"
            >
              <option value="">{t.select}</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.year_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">{t.classLabel}</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedExamId("");
                setSelectedStudentId("");
                setResults([]);
              }}
              className="w-full pl-9 pr-8 h-[42px] bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F5C7A]/20 focus:border-[#0F5C7A] transition-all appearance-none cursor-pointer font-medium text-sm"
            >
              <option value="">{t.select}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">{t.examLabel}</label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setResults([]);
              }}
              className="w-full pl-9 pr-8 h-[42px] bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F5C7A]/20 focus:border-[#0F5C7A] transition-all appearance-none cursor-pointer font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedClassId || !selectedAcademicYearId}
            >
              <option value="">{t.select}</option>
              {filteredExams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">{t.studentLabel}</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setResults([]);
              }}
              className="w-full pl-9 pr-8 h-[42px] bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F5C7A]/20 focus:border-[#0F5C7A] transition-all appearance-none cursor-pointer font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedClassId}
            >
              <option value="">{t.select}</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.roll} - {s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchResults}
            disabled={!selectedAcademicYearId || !selectedClassId || !selectedExamId || !selectedStudentId || loading}
            className="btn-primary w-full h-[42px] text-sm font-bold shadow-sm"
          >
            {loading ? t.loading : t.viewMarksheet}
          </button>
        </div>
      </div>
    </div>
  );
};
