import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useExams } from "../hooks/useExams";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { FileBadge, Printer, Search, Download } from "lucide-react";
import { Result } from "../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from "docx";
import { saveAs } from "file-saver";

const Marksheet: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { subjects } = useSubjects(orgId, user);
  const { exams } = useExams(orgId, user);
  const { academicYears } = useAcademicYears(orgId, user);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [numeralFormat, setNumeralFormat] = useState<'bn' | 'ar' | 'en'>('en');

  useEffect(() => {
    const activeYear = academicYears.find(ay => ay.is_active);
    if (activeYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(activeYear.id);
    }
  }, [academicYears, selectedAcademicYearId]);

  const filteredExams = useMemo(() => {
    return exams.filter(e => e.classId === selectedClassId && e.academicYearId === selectedAcademicYearId);
  }, [exams, selectedClassId, selectedAcademicYearId]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => s.classId === selectedClassId);
  }, [subjects, selectedClassId]);

  const filteredStudents = useMemo(() => {
    return (students[selectedClassId] || []).sort((a, b) => a.roll - b.roll);
  }, [students, selectedClassId]);

  const selectedStudent = useMemo(() => {
    return filteredStudents.find(s => s.id === selectedStudentId);
  }, [filteredStudents, selectedStudentId]);

  const fetchResults = async () => {
    if (!orgId || !selectedAcademicYearId || !selectedClassId || !selectedExamId || !selectedStudentId) return;
    setLoading(true);
    try {
      const resultsRef = collection(db, `organizations/${orgId}/results`);
      const q = query(
        resultsRef,
        where("academicYearId", "==", selectedAcademicYearId),
        where("examId", "==", selectedExamId),
        where("classId", "==", selectedClassId),
        where("studentId", "==", selectedStudentId)
      );
      const snapshot = await getDocs(q);
      const loadedResults = snapshot.docs.map(doc => doc.data() as Result);
      setResults(loadedResults);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("মার্কশিট লোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const allStudentResults = useMemo(() => {
    return filteredStudents.map(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const totalMarks = studentResults.reduce((sum, r) => sum + r.marks, 0);
      return { studentId: student.id, totalMarks };
    });
  }, [filteredStudents, results]);

  const { totalMarks, totalFullMarks, percentage, grade, rank } = useMemo(() => 
    calculateResultMetrics(results.filter(r => r.student_id === selectedStudentId), filteredSubjects, allStudentResults), 
    [results, filteredSubjects, selectedStudentId, allStudentResults]
  );

  const [academicHistory, setAcademicHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchAcademicHistory = async () => {
      if (!orgId || !selectedStudentId) return;
      try {
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const q = query(resultsRef, where("studentId", "==", selectedStudentId));
        const snapshot = await getDocs(q);
        const history = snapshot.docs.map(doc => doc.data());
        setAcademicHistory(history);
      } catch (error) {
        console.error("Error fetching academic history:", error);
      }
    };
    fetchAcademicHistory();
  }, [orgId, selectedStudentId]);

  const academicHistoryTable = useMemo(() => {
    return academicHistory.map(r => ({
        year: academicYears.find(ay => ay.id === r.academicYearId)?.year_name || "N/A",
        exam: exams.find(e => e.id === r.examId)?.name || "N/A",
        class: classes.find(c => c.id === r.classId)?.name || "N/A",
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        grade: r.grade,
        rank: r.rank
    })).sort((a, b) => a.year.localeCompare(b.year));
  }, [academicHistory, academicYears, exams, classes]);

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.text("Marksheet", 40, 40);
    autoTable(doc, {
      head: [['Subject', 'Full Marks', 'Obtained']],
      body: filteredSubjects.map(s => [s.name, s.fullMarks, results.find(r => r.subject_id === s.id)?.marks || 0]),
    });
    doc.save(`marksheet_${selectedStudent?.name}.pdf`);
  };

  const exportToDOCX = async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun("Marksheet")] }),
          new Table({
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Subject")] }), new TableCell({ children: [new Paragraph("Full Marks")] }), new TableCell({ children: [new Paragraph("Obtained")] })] }),
              ...filteredSubjects.map(s => new TableRow({ children: [new TableCell({ children: [new Paragraph(s.name)] }), new TableCell({ children: [new Paragraph(s.fullMarks.toString())] }), new TableCell({ children: [new Paragraph((results.find(r => r.subject_id === s.id)?.marks || 0).toString())] })] }))
            ]
          })
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `marksheet_${selectedStudent?.name}.docx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileBadge className="w-6 h-6 text-indigo-600" />
          মার্কশিট
        </h2>
        <div className="flex gap-2">
            <select value={numeralFormat} onChange={(e) => setNumeralFormat(e.target.value as any)} className="input-premium">
                <option value="en">English (0-9)</option>
                <option value="bn">Bengali (০-৯)</option>
                <option value="ar">Arabic (٠-٩)</option>
            </select>
            {results.length > 0 && (
                <>
                    <button onClick={handlePrint} className="btn-secondary">
                        <Printer className="w-4 h-4" />
                        প্রিন্ট
                    </button>
                    <button onClick={exportToPDF} className="btn-secondary">
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                    <button onClick={exportToDOCX} className="btn-secondary">
                        <Download className="w-4 h-4" />
                        DOCX
                    </button>
                </>
            )}
        </div>
      </div>
      
      {/* ... (rest of the component) ... */}

      <div className="card-premium p-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">শিক্ষাবর্ষ</label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                setSelectedAcademicYearId(e.target.value);
                setSelectedExamId("");
                setResults([]);
              }}
              className="input-premium w-full"
            >
              <option value="">নির্বাচন করুন</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.year_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">শ্রেণি</label>
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
              <option value="">নির্বাচন করুন</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">পরীক্ষা</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setResults([]);
              }}
              className="input-premium w-full"
              disabled={!selectedClassId || !selectedAcademicYearId}
            >
              <option value="">নির্বাচন করুন</option>
              {filteredExams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">শিক্ষার্থী</label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setResults([]);
              }}
              className="input-premium w-full"
              disabled={!selectedClassId}
            >
              <option value="">নির্বাচন করুন</option>
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
              {loading ? "লোড হচ্ছে..." : "মার্কশিট দেখুন"}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && selectedStudent && (
        <div className="card-premium p-8 print:shadow-none print:border-none print:p-0 max-w-4xl mx-auto">
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">মাদরাসা ফলাফল পত্র</h1>
            <h2 className="text-xl font-semibold text-slate-700 mb-1">
              {exams.find(e => e.id === selectedExamId)?.name}
            </h2>
            <p className="text-slate-600 font-medium">
              শিক্ষাবর্ষ: {academicYears.find(ay => ay.id === selectedAcademicYearId)?.year_name} 
              ({academicYears.find(ay => ay.id === selectedAcademicYearId)?.hijri_year})
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 text-slate-800">
            <div>
              <p className="mb-2"><span className="font-semibold w-24 inline-block">শিক্ষার্থীর নাম:</span> {selectedStudent.name}</p>
              <p className="mb-2"><span className="font-semibold w-24 inline-block">শ্রেণি:</span> {classes.find(c => c.id === selectedClassId)?.name}</p>
              <p className="mb-2"><span className="font-semibold w-24 inline-block">রোল নম্বর:</span> {convertNumber(selectedStudent.roll, numeralFormat)}</p>
            </div>
            <div>
              <p className="mb-2"><span className="font-semibold w-24 inline-block">পিতার নাম:</span> {selectedStudent.fatherName || "N/A"}</p>
              <p className="mb-2"><span className="font-semibold w-24 inline-block">র‍্যাঙ্ক:</span> <span className="font-bold">{convertNumber(rank, numeralFormat)}</span></p>
              <p className="mb-2"><span className="font-semibold w-24 inline-block">ফলাফল:</span> <span className={`font-bold ${grade !== 'রাসেব' ? 'text-green-600' : 'text-red-600'}`}>{grade}</span></p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-lg mb-8">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="p-4 font-semibold text-slate-800 border-r border-slate-300">বিষয়</th>
                  <th className="p-4 font-semibold text-slate-800 text-center border-r border-slate-300">পূর্ণমান</th>
                  <th className="p-4 font-semibold text-slate-800 text-center border-r border-slate-300">পাস নম্বর</th>
                  <th className="p-4 font-semibold text-slate-800 text-center">প্রাপ্ত নম্বর</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredSubjects.map((subject) => {
                  const result = results.find(r => r.subject_id === subject.id);
                  const isFail = !result || result.marks < subject.passMarks;
                  
                  return (
                    <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-800 font-medium border-r border-slate-300">{subject.name}</td>
                      <td className="p-4 text-slate-600 text-center border-r border-slate-300">{convertNumber(subject.fullMarks, numeralFormat)}</td>
                      <td className="p-4 text-slate-600 text-center border-r border-slate-300">{convertNumber(subject.passMarks, numeralFormat)}</td>
                      <td className={`p-4 text-center font-bold ${isFail ? 'text-red-600' : 'text-slate-800'}`}>
                        {result ? convertNumber(result.marks, numeralFormat) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td className="p-4 font-bold text-slate-800 text-right border-r border-slate-300">সর্বমোট:</td>
                  <td className="p-4 font-bold text-slate-800 text-center border-r border-slate-300">{convertNumber(totalFullMarks, numeralFormat)}</td>
                  <td className="p-4 font-bold text-slate-800 text-center border-r border-slate-300">র‍্যাঙ্ক:</td>
                  <td className="p-4 font-bold text-slate-800 text-center">{convertNumber(rank, numeralFormat)}</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-slate-800 text-right border-r border-slate-300">শতকরা:</td>
                  <td className="p-4 font-bold text-slate-800 text-center border-r border-slate-300">{convertNumber(percentage, numeralFormat)}%</td>
                  <td className="p-4 font-bold text-slate-800 text-center border-r border-slate-300">গ্রেড:</td>
                  <td className="p-4 font-bold text-slate-800 text-center">{grade}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-24 flex justify-between px-8">
            <div className="text-center">
              <div className="w-40 border-t border-slate-800 mb-2"></div>
              <p className="font-medium text-slate-800">শ্রেণি শিক্ষকের স্বাক্ষর</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-slate-800 mb-2"></div>
              <p className="font-medium text-slate-800">অধ্যক্ষের স্বাক্ষর</p>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="card-premium p-8 mt-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Student Academic History</h3>
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 border-b border-slate-300">
              <tr>
                <th className="p-4">Academic Year</th>
                <th className="p-4">Exam</th>
                <th className="p-4">Class</th>
                <th className="p-4">Total Marks</th>
                <th className="p-4">Percentage</th>
                <th className="p-4">Grade</th>
                <th className="p-4">Rank</th>
              </tr>
            </thead>
            <tbody>
              {academicHistoryTable.map((row, index) => (
                <tr key={index} className="border-b border-slate-200">
                  <td className="p-4">{convertNumber(row.year, numeralFormat)}</td>
                  <td className="p-4">{row.exam}</td>
                  <td className="p-4">{row.class}</td>
                  <td className="p-4">{convertNumber(row.totalMarks, numeralFormat)}</td>
                  <td className="p-4">{convertNumber(row.percentage, numeralFormat)}%</td>
                  <td className="p-4">{row.grade}</td>
                  <td className="p-4">{convertNumber(row.rank, numeralFormat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Marksheet;
