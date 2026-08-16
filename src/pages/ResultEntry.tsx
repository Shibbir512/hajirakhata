import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useExams } from "../hooks/useExams";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { useResults } from "../hooks/useResults";
import { useClasses } from "../hooks/useClasses";
import { ClipboardEdit, EyeOff, Trash2, ChevronUp, ChevronDown, UserMinus, UserPlus } from "lucide-react";
import { Result } from "../types";
import { useResultSettings } from "../hooks/useResultSettings";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { formatAcademicYear, toEnglishNumber } from "../utils/dateFormatter";
import toast from "react-hot-toast";
import ConfirmationDialog from "../components/ConfirmationDialog";

const ResultEntry: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const { gradingSystem, defaultPassMark, strictFailing } = useResultSettings(orgId);

  const { academicYears } = useAcademicYears(orgId, user);
  const { exams } = useExams(orgId, user);
  const { students: studentsMap, updateStudent } = useStudents(orgId, user, role);
  const { subjects } = useSubjects(orgId, user);
  const { classes } = useClasses(orgId, user, role);
  const { results, resultsConfig, saveResultsConfig, saveResult, publishResults, hideResults, deleteResults } = useResults(orgId, user, academicYearId, examId, classId);

  const rawClassStudents = useMemo(() => (studentsMap[classId] || []).filter(s => s.isActive !== false), [studentsMap, classId]);
  const filteredSubjects = useMemo(() => (subjects || []).filter(s => s.classId === classId), [subjects, classId]);

  const excludedStudentIds = useMemo(() => resultsConfig?.excludedStudents || [], [resultsConfig]);
  const studentOrderIds = useMemo(() => resultsConfig?.studentOrder || [], [resultsConfig]);

  const { includedStudents, excludedStudents } = useMemo(() => {
    const included: any[] = [];
    const excluded: any[] = [];

    rawClassStudents.forEach(student => {
      if (excludedStudentIds.includes(student.id)) {
        excluded.push(student);
      } else {
        included.push(student);
      }
    });

    if (studentOrderIds.length > 0) {
      included.sort((a, b) => {
        const indexA = studentOrderIds.indexOf(a.id);
        const indexB = studentOrderIds.indexOf(b.id);

        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.roll - b.roll;
      });
    } else {
      included.sort((a, b) => a.roll - b.roll);
    }

    return { includedStudents: included, excludedStudents: excluded };
  }, [rawClassStudents, excludedStudentIds, studentOrderIds]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newOrder = includedStudents.map(s => s.id);
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    saveResultsConfig(newOrder, excludedStudentIds);
  }, [includedStudents, excludedStudentIds, saveResultsConfig]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === includedStudents.length - 1) return;
    const newOrder = includedStudents.map(s => s.id);
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    saveResultsConfig(newOrder, excludedStudentIds);
  }, [includedStudents, excludedStudentIds, saveResultsConfig]);

  const handleExclude = useCallback((studentId: string) => {
    const newExcluded = [...excludedStudentIds, studentId];
    const newOrder = studentOrderIds.length > 0 ? studentOrderIds.filter(id => id !== studentId) : [];
    saveResultsConfig(newOrder, newExcluded, true);
  }, [excludedStudentIds, studentOrderIds, saveResultsConfig]);

  const handleInclude = useCallback((studentId: string) => {
    const newExcluded = excludedStudentIds.filter(id => id !== studentId);
    const newOrder = studentOrderIds.length > 0 ? [...includedStudents.map(s => s.id), studentId] : [];
    saveResultsConfig(newOrder, newExcluded, true);
  }, [excludedStudentIds, includedStudents, studentOrderIds, saveResultsConfig]);

  const handleRollChange = useCallback((studentId: string, newRoll: number) => {
    updateStudent(studentId, { roll: newRoll }).then(() => {
      // If we change a roll number, the teacher expects native roll-based sorting.
      // We can clear the custom order (if it exists) to allow the automatic roll sort to handle it,
      // which gracefully prevents bugs with 'stuck' elements.
      if (studentOrderIds.length > 0) {
        saveResultsConfig([], excludedStudentIds, true);
      }
    }).catch(err => {
      console.error(err);
      toast.error("রোল আপডেট করতে ব্যর্থ হয়েছে!");
    });
  }, [updateStudent, studentOrderIds, excludedStudentIds, saveResultsConfig]);

  const isPublished = useMemo(() => {
    return results.length > 0 && results.every(r => r.status === 'published');
  }, [results]);

  const isHidden = useMemo(() => {
    return results.length > 0 && results.every(r => r.status === 'hidden');
  }, [results]);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHideModalOpen, setIsHideModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handlePublish = async () => {
    setIsPublishModalOpen(true);
  };

  const confirmPublish = async () => {
    await publishResults(academicYearId, examId, classId);
    setIsPublishModalOpen(false);
  };

  const handleHide = async () => {
    setIsHideModalOpen(true);
  };

  const confirmHide = async () => {
    await hideResults(academicYearId, examId, classId);
    setIsHideModalOpen(false);
  };

  const handleDelete = async () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    await deleteResults(academicYearId, examId, classId);
    setIsDeleteModalOpen(false);
  };

  const allStudentResults = useMemo(() => {
    return includedStudents.map(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const totalMarks = studentResults.reduce((sum, r) => sum + r.marks, 0);
      return { studentId: student.id, totalMarks };
    });
  }, [includedStudents, results]);

  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const getCellKey = (rowIndex: number, colIndex: number) => `${rowIndex}-${colIndex}`;

  const moveFocus = (rowDelta: number, colDelta: number) => {
    if (!focusedCell) return;
    const nextRow = Math.max(0, Math.min(includedStudents.length - 1, focusedCell.rowIndex + rowDelta));
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
        if ((e.target as HTMLInputElement).selectionStart === 0) {
          e.preventDefault();
          moveFocus(0, -1);
        }
        break;
      case "ArrowRight":
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
      if (targetRowIndex >= includedStudents.length) return;
      
      const student = includedStudents[targetRowIndex];
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
        
        {academicYearId && examId && classId && results.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <span className={`px-4 h-[42px] flex items-center rounded-full text-xs font-bold ${isPublished ? 'bg-[#22C55E]/10 text-[#22C55E]' : isHidden ? 'bg-slate-100 text-slate-500' : 'bg-[#F59E0B]/10 text-[#F59E0B]'} whitespace-nowrap`}>
              {isPublished ? 'প্রকাশিত' : isHidden ? 'গোপন' : 'খসড়া (Draft)'}
            </span>
            {role === 'admin' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePublish}
                  disabled={isPublished}
                  className={`h-[42px] px-6 rounded-xl font-bold transition-all duration-300 shadow-sm w-full sm:w-auto whitespace-nowrap ${isPublished ? 'opacity-50 cursor-not-allowed bg-[#22C55E] text-white' : 'bg-[#0F5C7A] text-white hover:bg-[#0D4D66]'}`}
                >
                  {isPublished ? 'প্রকাশিত' : 'ফলাফল প্রকাশ করুন'}
                </button>
                {isPublished && (
                  <button
                    onClick={handleHide}
                    className="h-[42px] w-[42px] flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-slate-200 transition-colors bg-white"
                    title="ফলাফল গোপন করুন"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="h-[42px] w-[42px] flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors bg-white"
                  title="ফলাফল ডিলিট করুন"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-premium p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="input-premium">
          <option value="">শিক্ষাবর্ষ নির্বাচন করুন</option>
          {academicYears.map(ay => <option key={ay.id} value={ay.id}>{formatAcademicYear(ay)}</option>)}
        </select>
        <select value={examId} onChange={(e) => setExamId(e.target.value)} className="input-premium">
          <option value="">পরীক্ষা নির্বাচন করুন</option>
          {exams.filter(e => e.academicYearId === academicYearId).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="input-premium">
          <option value="">শ্রেণী নির্বাচন করুন</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {classId && examId && academicYearId && (
        <div className="space-y-4">
          <div className="card-premium p-0 overflow-hidden border border-slate-200 shadow-xl">
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${16 + 64 + 32 + filteredSubjects.length * 24 + 20 + 20 + 20 + 32 + 20}rem` }}>
                {/* Header */}
                <div className="flex bg-slate-100 border-b border-slate-200 sticky top-0 z-20">
                  <div className="w-16 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center sticky left-0 bg-slate-100 z-30">
                    রোল
                  </div>
                  <div className="w-64 py-3 px-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center sticky left-16 bg-slate-100 z-30">
                    নাম ও অ্যাকশন
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
                    বিভাগ
                  </div>
                  <div className="w-20 py-3 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center">
                    মেধাক্রম
                  </div>
                </div>

                {/* Student List */}
                <div className="flex flex-col">
                  {includedStudents.map((student, index) => (
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
                      handleMoveUp={handleMoveUp}
                      handleMoveDown={handleMoveDown}
                      handleExclude={handleExclude}
                      handleRollChange={handleRollChange}
                      isLast={index === includedStudents.length - 1}
                      gradingSystem={gradingSystem}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <div>মোট শিক্ষার্থী: {includedStudents.length}</div>
            </div>
          </div>

          {excludedStudents.length > 0 && (
            <div className="card-premium p-6 border-rose-100 bg-rose-50/20 mt-4 -mx-4 sm:-mx-6 lg:mx-0 lg:-mt-2">
              <h3 className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-rose-600" />
                বাদ দেওয়া বা পরীক্ষায় অনুপস্থিত শিক্ষার্থীদের তালিকা
              </h3>
              <div className="flex flex-wrap gap-2">
                {excludedStudents.map(student => (
                  <div key={student.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-rose-200 rounded-lg shadow-sm text-sm">
                    <span className="font-bold text-rose-700">রোল {student.roll}</span>
                    <span className="text-slate-700">{student.name}</span>
                    <button
                      onClick={() => handleInclude(student.id)}
                      className="p-1 hover:bg-rose-50 text-emerald-600 rounded-md transition-colors"
                      title="পুনরায় রেজাল্ট শীটে যুক্ত করুন"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isPublishModalOpen && (
        <ConfirmationDialog
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          onConfirm={confirmPublish}
          title="ফলাফল প্রকাশ করুন"
          message="আপনি কি নিশ্চিত যে আপনি এই ফলাফলটি প্রকাশ করতে চান? একবার প্রকাশিত হলে এটি সবার জন্য দৃশ্যমান হবে।"
        />
      )}
      {isHideModalOpen && (
        <ConfirmationDialog
          isOpen={isHideModalOpen}
          onClose={() => setIsHideModalOpen(false)}
          onConfirm={confirmHide}
          title="ফলাফল গোপন করুন"
          message="আপনি কি নিশ্চিত যে আপনি এই ফলাফলটি গোপন করতে চান? গোপন করলে এটি আর সাধারণ ব্যবহারকারীদের জন্য দৃশ্যমান থাকবে না।"
        />
      )}
      {isDeleteModalOpen && (
        <ConfirmationDialog
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="ফলাফল ডিলিট করুন"
          message="আপনি কি নিশ্চিত যে আপনি এই ফলাফলটি ডিলিট করতে চান? এই প্রক্রিয়াটি বাতিল করা যাবে না।"
        />
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
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={(e) => setLocalValue(toEnglishNumber(e.target.value))}
        onBlur={handleBlur}
        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIdx)}
        onPaste={(e) => handlePaste(e, rowIndex, colIdx)}
        onFocus={() => setFocusedCell({ rowIndex, colIndex: colIdx })}
        className={`w-full h-full text-center focus:outline-none focus:ring-2 focus:ring-[#0F5C7A]/50 transition-all ${
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
  getCellKey,
  handleMoveUp,
  handleMoveDown,
  handleExclude,
  handleRollChange,
  isLast,
  gradingSystem
}: any) => {
  const [localRoll, setLocalRoll] = useState(String(student.roll));
  
  useEffect(() => {
    setLocalRoll(String(student.roll));
  }, [student.roll]);

  const handleRollBlur = () => {
    const newRoll = Number(toEnglishNumber(localRoll));
    if (!isNaN(newRoll) && newRoll > 0 && newRoll !== student.roll) {
      handleRollChange(student.id, newRoll);
    } else {
      setLocalRoll(String(student.roll));
    }
  };

  const studentResults = useMemo(() => results.filter((r: any) => r.student_id === student.id), [results, student.id]);
  const { totalMarks, totalFullMarks, percentage, grade, rank } = calculateResultMetrics(studentResults, filteredSubjects, allStudentResults, gradingSystem);

  return (
    <div className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors group">
      <div className="w-16 py-3 px-1 border-r border-slate-200 flex items-center justify-center font-bold text-slate-600 sticky left-0 bg-white z-10 group-hover:bg-slate-50">
        <input 
          type="text"
          inputMode="numeric"
          value={localRoll}
          onChange={(e) => setLocalRoll(e.target.value)}
          onBlur={handleRollBlur}
          className="w-full h-full text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-[#0F5C7A]/50 rounded"
          title="রোল নাম্বার পরিবর্তন করুন"
        />
      </div>
      <div className="w-64 py-3 px-3 border-r border-slate-200 flex items-center font-medium text-slate-800 sticky left-16 bg-white z-10 group-hover:bg-slate-50 gap-2">
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => handleMoveUp(index)}
            disabled={index === 0}
            className="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
            title="উপরে নিন"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button 
            onClick={() => handleMoveDown(index)}
            disabled={isLast}
            className="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
            title="নিচে নিন"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 truncate">{student.name}</div>
        <button 
          onClick={() => handleExclude(student.id)}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-100 text-rose-500 rounded transition-all shrink-0"
          title="রেজাল্ট শীট থেকে বাদ দিন"
        >
          <UserMinus className="w-4 h-4" />
        </button>
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
      <div className="w-32 py-3 px-3 border-r border-slate-200 flex items-center justify-center font-bold text-[#0F5C7A]">
        {grade}
      </div>
      <div className="w-20 py-3 px-3 flex items-center justify-center font-black text-slate-900">
        {rank}
      </div>
    </div>
  );
});

export default ResultEntry;
