import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useExams } from "../hooks/useExams";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { useResults } from "../hooks/useResults";
import { useClasses } from "../hooks/useClasses";
import { ClipboardEdit } from "lucide-react";
import { Result } from "../types";
import { calculateResultMetrics } from "../utils/resultCalculations";
import toast from "react-hot-toast";

const ResultEntry: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");

  const { academicYears } = useAcademicYears(orgId, user);
  const { exams } = useExams(orgId, user);
  const { students: studentsMap } = useStudents(orgId, user, role);
  const { subjects } = useSubjects(orgId, user);
  const { classes } = useClasses(orgId, user, role);
  const { results, saveResult, publishResults } = useResults(orgId, user, academicYearId, examId, classId);

  const filteredStudents = useMemo(() => studentsMap[classId] || [], [studentsMap, classId]);
  const filteredSubjects = useMemo(() => subjects.filter(s => s.classId === classId), [subjects, classId]);

  const isPublished = useMemo(() => {
    return results.length > 0 && results.every(r => r.status === 'published');
  }, [results]);

  const handlePublish = async () => {
    if (window.confirm("আপনি কি নিশ্চিত যে আপনি এই ফলাফলটি প্রকাশ করতে চান? একবার প্রকাশিত হলে এটি সবার জন্য দৃশ্যমান হবে।")) {
      await publishResults(academicYearId, examId, classId);
    }
  };

  const allStudentResults = useMemo(() => {
    return filteredStudents.map(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const totalMarks = studentResults.reduce((sum, r) => sum + r.marks, 0);
      return { studentId: student.id, totalMarks };
    });
  }, [filteredStudents, results]);

// Focus management
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const getCellKey = (rowIndex: number, colIndex: number) => `${rowIndex}-${colIndex}`;

  const moveFocus = (rowDelta: number, colDelta: number) => {
    if (!focusedCell) return;
    const nextRow = Math.max(0, Math.min(filteredStudents.length - 1, focusedCell.rowIndex + rowDelta));
    const nextCol = Math.max(0, Math.min(filteredSubjects.length - 1, focusedCell.colIndex + colDelta));
    
    setFocusedCell({ rowIndex: nextRow, colIndex: nextCol });
  };

  useEffect(() => {
    if (focusedCell) {
      const key = getCellKey(focusedCell.rowIndex, focusedCell.colIndex);
      const input = inputRefs.current[key];
      if (input && document.activeElement !== input) {
        input.focus();
        input.select();
      }
    }
  }, [focusedCell]);

  const handleMarkChange = useCallback((studentId: string, subjectId: string, value: string, fullMarks: number) => {
    const marks = Math.min(Number(value), fullMarks);
    const resultId = `result-${academicYearId}-${examId}-${classId}-${studentId}-${subjectId}`;
    saveResult({
      id: resultId,
      institution_id: orgId!,
      student_id: studentId,
      class_id: classId,
      academic_year_id: academicYearId,
      exam_id: examId,
      subject_id: subjectId,
      marks
    });
  }, [academicYearId, examId, classId, orgId, saveResult]);

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        moveFocus(1, 0);
        break;
      case "Tab":
        e.preventDefault();
        moveFocus(0, e.shiftKey ? -1 : 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(-1, 0);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocus(1, 0);
        break;
      case "ArrowLeft":
        // Only move if cursor is at start
        if ((e.target as HTMLInputElement).selectionStart === 0) {
          e.preventDefault();
          moveFocus(0, -1);
        }
        break;
      case "ArrowRight":
        // Only move if cursor is at end
        if ((e.target as HTMLInputElement).selectionEnd === (e.target as HTMLInputElement).value.length) {
          e.preventDefault();
          moveFocus(0, 1);
        }
        break;
    }
  };

  const handlePaste = (e: React.ClipboardEvent, startRowIndex: number, startColIndex: number) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const rows = pasteData.split(/\r?\n/).filter(row => row.length > 0);
    
    rows.forEach((row, rIdx) => {
      const targetRowIndex = startRowIndex + rIdx;
      if (targetRowIndex >= filteredStudents.length) return;
      
      const student = filteredStudents[targetRowIndex];
      const values = row.split("\t");
      
      values.forEach((val, cIdx) => {
        const targetColIndex = startColIndex + cIdx;
        if (targetColIndex >= filteredSubjects.length) return;
        
        const subject = filteredSubjects[targetColIndex];
        const markValue = val.trim();
        if (markValue !== "" && !isNaN(Number(markValue))) {
          handleMarkChange(student.id, subject.id, markValue, subject.fullMarks);
        }
      });
    });
    toast.success("ডেটা পেস্ট করা হয়েছে!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <ClipboardEdit className="w-6 h-6 text-indigo-600" />
          ফলাফল এন্ট্রি (Spreadsheet Mode)
        </h2>
        {academicYearId && examId && classId && results.length > 0 && (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isPublished ? 'প্রকাশিত' : 'খসড়া (Draft)'}
            </span>
            {role === 'admin' && (
              <button
                onClick={handlePublish}
                disabled={isPublished}
                className={`btn-primary ${isPublished ? 'opacity-50 cursor-not-allowed bg-emerald-600' : ''}`}
              >
                {isPublished ? 'প্রকাশিত' : 'ফলাফল প্রকাশ করুন'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card-premium p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="input-premium">
          <option value="">শিক্ষাবর্ষ নির্বাচন করুন</option>
          {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.year_name}</option>)}
        </select>
        <select value={examId} onChange={(e) => setExamId(e.target.value)} className="input-premium">
          <option value="">পরীক্ষা নির্বাচন করুন</option>
          {exams.filter(e => e.academicYearId === academicYearId).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-premium">
          <option value="">শ্রেণি নির্বাচন করুন</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {classId && examId && academicYearId && (
        <div className="card-premium p-0 overflow-hidden border border-slate-200 shadow-xl">
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${16 + 48 + 32 + filteredSubjects.length * 24 + 20 + 20 + 20 + 32 + 20}rem` }}>
              {/* Header */}
              <div className="flex bg-slate-100 border-b border-slate-200 sticky top-0 z-20">
                <div className="w-16 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center sticky left-0 bg-slate-100 z-30">
                  রোল
                </div>
                <div className="w-48 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center sticky left-16 bg-slate-100 z-30">
                  নাম
                </div>
                <div className="w-32 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center bg-slate-100">
                  আইডি
                </div>
                {filteredSubjects.map(s => (
                  <div key={s.id} className="w-24 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center text-center">
                    {s.name}
                  </div>
                ))}
                <div className="w-20 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center">
                  মোট
                </div>
                <div className="w-20 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center">
                  পূর্ণমান
                </div>
                <div className="w-20 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center">
                  শতকরা
                </div>
                <div className="w-32 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center">
                  গ্রেড
                </div>
                <div className="w-20 py-3 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center">
                  র‍্যাঙ্ক
                </div>
              </div>

              {/* Student List */}
              <div className="flex flex-col">
                {filteredStudents.map((student, index) => (
                  <ResultRow
                    key={student.id}
                    index={index}
                    student={student}
                    results={results}
                    filteredSubjects={filteredSubjects}
                    allStudentResults={allStudentResults}
                    handleMarkChange={handleMarkChange}
                    handleKeyDown={handleKeyDown}
                    handlePaste={handlePaste}
                    setFocusedCell={setFocusedCell}
                    inputRefs={inputRefs}
                    getCellKey={getCellKey}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <div>মোট শিক্ষার্থী: {filteredStudents.length}</div>
            <div className="flex gap-4">
              <span>Enter: নিচের সেল</span>
              <span>Tab: পরের সেল</span>
              <span>Arrows: নেভিগেশন</span>
              <span className="text-indigo-600 font-bold">Excel থেকে কপি-পেস্ট সাপোর্ট করে</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ResultCell = React.memo(({ 
  studentId, 
  subject, 
  rowIndex, 
  colIdx, 
  initialMark, 
  handleMarkChange, 
  handleKeyDown, 
  handlePaste, 
  setFocusedCell, 
  inputRefs, 
  getCellKey 
}: any) => {
  const [localValue, setLocalValue] = useState(initialMark);

  useEffect(() => {
    setLocalValue(initialMark);
  }, [initialMark]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (localValue !== initialMark) {
      handleMarkChange(studentId, subject.id, localValue, subject.fullMarks);
    }
  };

  const isBelowPass = localValue !== "" && Number(localValue) < subject.passMarks;

  return (
    <div className="w-24 border-r border-slate-200 flex items-center justify-center p-0">
      <input
        ref={(el) => { inputRefs.current[getCellKey(rowIndex, colIdx)] = el; }}
        type="number"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIdx)}
        onPaste={(e) => handlePaste(e, rowIndex, colIdx)}
        onFocus={() => setFocusedCell({ rowIndex, colIndex: colIdx })}
        className={`w-full h-full text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
          isBelowPass ? "bg-slate-200 text-slate-600" : "bg-transparent text-slate-800"
        }`}
        placeholder="-"
      />
    </div>
  );
});

const ResultRow = React.memo(({ 
  index, 
  student, 
  results, 
  filteredSubjects, 
  allStudentResults, 
  handleMarkChange, 
  handleKeyDown, 
  handlePaste, 
  setFocusedCell, 
  inputRefs, 
  getCellKey 
}: any) => {
  const studentResults = useMemo(() => results.filter((r: any) => r.student_id === student.id), [results, student.id]);
  const { totalMarks, totalFullMarks, percentage, grade, rank } = calculateResultMetrics(studentResults, filteredSubjects, allStudentResults);

  return (
    <div className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors group">
      <div className="w-16 py-3 px-3 border-r border-slate-200 flex items-center justify-center font-bold text-slate-600 sticky left-0 bg-white z-10 group-hover:bg-slate-50">
        {student.roll}
      </div>
      <div className="w-48 py-3 px-3 border-r border-slate-200 flex items-center font-medium text-slate-800 sticky left-16 bg-white z-10 group-hover:bg-slate-50 truncate">
        {student.name}
      </div>
      <div className="w-32 py-3 px-3 border-r border-slate-200 flex items-center justify-center text-xs font-mono text-slate-500 bg-slate-50/30">
        {student.studentUid || "N/A"}
      </div>
      {filteredSubjects.map((s: any, colIdx: number) => {
        const mark = studentResults.find((r: any) => r.subject_id === s.id)?.marks ?? "";
        return (
          <ResultCell
            key={s.id}
            studentId={student.id}
            subject={s}
            rowIndex={index}
            colIdx={colIdx}
            initialMark={mark}
            handleMarkChange={handleMarkChange}
            handleKeyDown={handleKeyDown}
            handlePaste={handlePaste}
            setFocusedCell={setFocusedCell}
            inputRefs={inputRefs}
            getCellKey={getCellKey}
          />
        );
      })}
      <div className="w-20 py-3 px-3 border-r border-slate-200 flex items-center justify-center font-bold text-slate-700 bg-slate-50/50">
        {totalMarks}
      </div>
      <div className="w-20 py-3 px-3 border-r border-slate-200 flex items-center justify-center text-slate-500 text-sm">
        {totalFullMarks}
      </div>
      <div className="w-20 py-3 px-3 border-r border-slate-200 flex items-center justify-center text-slate-600 font-medium">
        {percentage}%
      </div>
      <div className="w-32 py-3 px-3 border-r border-slate-200 flex items-center justify-center font-bold text-indigo-600">
        {grade}
      </div>
      <div className="w-20 py-3 px-3 flex items-center justify-center font-black text-slate-900">
        {rank}
      </div>
    </div>
  );
});

export default ResultEntry;
