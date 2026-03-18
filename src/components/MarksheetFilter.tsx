import React from "react";
import { AcademicYear, ClassData, Exam, Student } from "../types";

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.academicYearLabel}</label>
          <select
            value={selectedAcademicYearId}
            onChange={(e) => {
              setSelectedAcademicYearId(e.target.value);
              setSelectedExamId("");
              setResults([]);
            }}
            className="input-premium w-full"
          >
            <option value="">{t.select}</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>{ay.year_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.classLabel}</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedExamId("");
              setSelectedStudentId("");
              setResults([]);
            }}
            className="input-premium w-full"
          >
            <option value="">{t.select}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.examLabel}</label>
          <select
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              setResults([]);
            }}
            className="input-premium w-full"
            disabled={!selectedClassId || !selectedAcademicYearId}
          >
            <option value="">{t.select}</option>
            {filteredExams.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.studentLabel}</label>
          <select
            value={selectedStudentId}
            onChange={(e) => {
              setSelectedStudentId(e.target.value);
              setResults([]);
            }}
            className="input-premium w-full"
            disabled={!selectedClassId}
          >
            <option value="">{t.select}</option>
            {filteredStudents.map((s) => (
              <option key={s.id} value={s.id}>{s.roll} - {s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchResults}
            disabled={!selectedAcademicYearId || !selectedClassId || !selectedExamId || !selectedStudentId || loading}
            className="btn-primary w-full h-[42px]"
          >
            {loading ? t.loading : t.viewMarksheet}
          </button>
        </div>
      </div>
    </div>
  );
};
