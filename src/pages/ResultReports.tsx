import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useExams } from "../hooks/useExams";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { FileText, Printer, Download } from "lucide-react";
import { Result } from "../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } from "docx";

const ResultReports: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { subjects } = useSubjects(orgId, user);
  const { exams } = useExams(orgId, user);
  const { academicYears } = useAcademicYears(orgId, user);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
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
    return exams.filter(e => (e.classId === selectedClassId || e.classId === "all") && e.academicYearId === selectedAcademicYearId);
  }, [exams, selectedClassId, selectedAcademicYearId]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => s.classId === selectedClassId).sort((a, b) => a.subjectOrder - b.subjectOrder);
  }, [subjects, selectedClassId]);

  const filteredStudents = useMemo(() => {
    return (students[selectedClassId] || []).sort((a, b) => a.roll - b.roll);
  }, [students, selectedClassId]);

  const allStudentResults = useMemo(() => {
    return filteredStudents.map(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const totalMarks = studentResults.reduce((sum, r) => sum + r.marks, 0);
      
      // Check if failed in any subject
      const hasFailed = filteredSubjects.some(subject => {
        const result = studentResults.find(r => r.subject_id === subject.id);
        const marks = result ? result.marks : 0;
        return marks < subject.passMarks;
      });
      
      return { studentId: student.id, totalMarks, hasFailed };
    });
  }, [filteredStudents, results, filteredSubjects]);

  const statistics = useMemo(() => {
    const stats = {
      total: filteredStudents.length,
      mumtaz: 0,
      jayyidJiddan: 0,
      jayyid: 0,
      maqbul: 0,
      raseb: 0
    };

    filteredStudents.forEach(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const { grade } = calculateResultMetrics(studentResults, filteredSubjects, allStudentResults);
      if (grade === "মুমতায") stats.mumtaz++;
      else if (grade === "জায়্যিদ জিদ্দান") stats.jayyidJiddan++;
      else if (grade === "জায়্যিদ") stats.jayyid++;
      else if (grade === "মকবুল") stats.maqbul++;
      else if (grade === "রাসেব") stats.raseb++;
    });

    return stats;
  }, [filteredStudents, results, filteredSubjects, allStudentResults]);

  const fetchResults = async () => {
    if (!orgId || !selectedAcademicYearId || !selectedClassId || !selectedExamId) return;
    setLoading(true);
    try {
      const resultsRef = collection(db, `organizations/${orgId}/results`);
      let q = query(
        resultsRef,
        where("academic_year_id", "==", selectedAcademicYearId),
        where("exam_id", "==", selectedExamId),
        where("class_id", "==", selectedClassId)
      );

      if (role !== 'admin' && role !== 'teacher') {
        q = query(q, where("status", "==", "published"));
      }

      const snapshot = await getDocs(q);
      const loadedResults = snapshot.docs.map(doc => doc.data() as Result);
      setResults(loadedResults);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("ফলাফল লোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToPDF = async () => {
    const input = document.getElementById('tabulation-sheet-container');
    if (!input) return;

    setLoading(true);
    try {
      const canvas = await html2canvas(input, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Fix for oklab/oklch color parsing error in html2canvas
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            :root {
              color-scheme: light !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF("l", "mm", "a4");
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save("tabulation_sheet.pdf");
      toast.success("PDF ডাউনলোড সফল হয়েছে!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("PDF ডাউনলোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const exportToDOCX = async () => {
    const tableRows = filteredStudents.map(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const { totalMarks, totalFullMarks, percentage, grade, rank, statusKey } = calculateResultMetrics(studentResults, filteredSubjects, allStudentResults);
      const statusText = statusKey === 'pass' ? 'Pass' : 'Fail';
      const cells = [student.roll, student.name, ...filteredSubjects.map(s => studentResults.find(r => r.subject_id === s.id)?.marks || 0), totalMarks, totalFullMarks, `${percentage}%`, `${statusText} (${grade})`, rank].map(text => new TableCell({ children: [new Paragraph(String(text))] }));
      return new TableRow({ children: cells });
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: "ট্যাবুলেশন শিট", bold: true, size: 32 })] }),
          new Table({
            rows: [
              new TableRow({ children: ["রোল", "নাম", ...filteredSubjects.map(s => s.name), "মোট", "পূর্ণমান", "শতকরা", "গ্রেড", "র‍্যাঙ্ক"].map(text => new TableCell({ children: [new Paragraph(text)] })) }),
              ...tableRows
            ]
          })
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tabulation_sheet.docx";
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#0F5C7A]" />
          ট্যাবুলেশন শিট
        </h2>
        <div className="flex gap-2">
          <select value={numeralFormat} onChange={(e) => setNumeralFormat(e.target.value as any)} className="input-premium">
            <option value="en">English (0-9)</option>
            <option value="bn">Bengali (০-৯)</option>
            <option value="ar">Arabic (٠-٩)</option>
          </select>
          {results.length > 0 && (
            <>
              <button onClick={handlePrint} className="btn-primary">
                <Printer className="w-4 h-4" />
                প্রিন্ট করুন
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

      <div className="card-premium p-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">শিক্ষাবর্ষ নির্বাচন করুন</label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                setSelectedAcademicYearId(e.target.value);
                setSelectedExamId("");
                setResults([]);
              }}
              className="input-premium w-full"
            >
              <option value="">শিক্ষাবর্ষ নির্বাচন করুন</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.year_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">শ্রেণি নির্বাচন করুন</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedExamId("");
                setResults([]);
              }}
              className="input-premium w-full"
            >
              <option value="">শ্রেণি নির্বাচন করুন</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">পরীক্ষা নির্বাচন করুন</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setResults([]);
              }}
              className="input-premium w-full"
              disabled={!selectedClassId || !selectedAcademicYearId}
            >
              <option value="">পরীক্ষা নির্বাচন করুন</option>
              {filteredExams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchResults}
              disabled={!selectedAcademicYearId || !selectedClassId || !selectedExamId || loading}
              className="btn-primary w-full h-[42px]"
            >
              {loading ? "লোড হচ্ছে..." : "রিপোর্ট দেখুন"}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        <div id="tabulation-sheet-container" className="card-premium p-8 print:shadow-none print:border-none print:p-0 bg-white">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              {classes.find(c => c.id === selectedClassId)?.name} - {exams.find(e => e.id === selectedExamId)?.name}
            </h1>
            <p className="text-slate-600">
              শিক্ষাবর্ষ: {academicYears.find(ay => ay.id === selectedAcademicYearId)?.year_name} 
              ({academicYears.find(ay => ay.id === selectedAcademicYearId)?.hijri_year})
            </p>
            <p className="text-slate-600 mt-1">ট্যাবুলেশন শিট</p>
            {results[0]?.status === 'draft' && (
              <span className="inline-block mt-2 px-3 py-1 bg-[#F59E0B]/10 text-[#F59E0B] rounded-full text-xs font-bold">
                খসড়া (Draft)
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-[#E5E7EB] rounded-[16px] print:border-none print:overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8F9FA] print:bg-transparent">
                <tr>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black sticky left-0 bg-[#F8F9FA] z-10">রোল</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black sticky left-[80px] bg-[#F8F9FA] z-10">নাম</th>
                  {filteredSubjects.map(subject => (
                    <th key={subject.id} className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">
                      {subject.name} <br/> <span className="text-[10px] font-normal">({convertNumber(subject.fullMarks, numeralFormat)})</span>
                    </th>
                  ))}
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">মোট</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">পূর্ণমান</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">শতকরা</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">গ্রেড</th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">র‍্যাঙ্ক</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const studentResults = results.filter(r => r.student_id === student.id);
                  const { totalMarks, totalFullMarks, percentage, grade, rank, statusKey } = calculateResultMetrics(studentResults, filteredSubjects, allStudentResults);
                  
                  const rankNum = parseInt(rank);
                  const isTop3 = !isNaN(rankNum) && rankNum <= 3;
                  const statusText = statusKey === 'pass' ? 'কৃতকার্য' : 'অকৃতকার্য';

                  return (
                    <tr key={student.id} className={`border-b border-[#E5E7EB] print:border-black hover:bg-gray-50 transition-all duration-200 print:hover:bg-transparent ${isTop3 ? 'bg-yellow-50' : ''}`}>
                      <td className="py-4 px-5 text-slate-800 font-medium sticky left-0 bg-white z-10">{convertNumber(student.roll, numeralFormat)}</td>
                      <td className="py-4 px-5 text-slate-800 sticky left-[80px] bg-white z-10">{student.name}</td>
                      {filteredSubjects.map(subject => {
                        const result = results.find(r => r.student_id === student.id && r.subject_id === subject.id);
                        const isFail = !result || result.marks < subject.passMarks;

                        return (
                          <td key={subject.id} className="py-4 px-5 text-center">
                            <span className={isFail ? "text-rose-600 font-bold" : "text-slate-700"}>
                              {result ? convertNumber(result.marks, numeralFormat) : "-"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-4 px-5 text-center font-bold text-slate-800">{convertNumber(totalMarks, numeralFormat)}</td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">{convertNumber(totalFullMarks, numeralFormat)}</td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">{convertNumber(percentage, numeralFormat)}%</td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">
                        <span className={statusKey === 'fail' ? 'text-[#EF4444]' : 'text-[#22C55E]'}>
                          {statusText} ({grade})
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">{convertNumber(rank, numeralFormat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-4 print:grid-cols-6">
            <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">মোট শিক্ষার্থী</p>
              <p className="text-xl font-bold text-slate-800">{convertNumber(statistics.total, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#22C55E]/10 rounded-xl text-center border border-[#22C55E]/20">
              <p className="text-xs text-[#22C55E] mb-1">মুমতায</p>
              <p className="text-xl font-bold text-[#22C55E]">{convertNumber(statistics.mumtaz, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#14B8A6]/10 rounded-xl text-center border border-[#14B8A6]/20">
              <p className="text-xs text-[#14B8A6] mb-1">জায়্যিদ জিদ্দান</p>
              <p className="text-xl font-bold text-[#14B8A6]">{convertNumber(statistics.jayyidJiddan, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#0F5C7A]/10 rounded-xl text-center border border-[#0F5C7A]/20">
              <p className="text-xs text-[#0F5C7A] mb-1">জায়্যিদ</p>
              <p className="text-xl font-bold text-[#0F5C7A]">{convertNumber(statistics.jayyid, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#F59E0B]/10 rounded-xl text-center border border-[#F59E0B]/20">
              <p className="text-xs text-[#F59E0B] mb-1">মকবুল</p>
              <p className="text-xl font-bold text-[#F59E0B]">{convertNumber(statistics.maqbul, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#EF4444]/10 rounded-xl text-center border border-[#EF4444]/20">
              <p className="text-xs text-[#EF4444] mb-1">রাসেব</p>
              <p className="text-xl font-bold text-[#EF4444]">{convertNumber(statistics.raseb, numeralFormat)}</p>
            </div>
          </div>
        </div>
      ) : (
        selectedExamId && !loading && (
          <div className="card-premium p-12 text-center text-slate-500">
            {role === 'viewer' ? 'ফলাফল এখনও প্রকাশিত হয়নি।' : 'কোন ফলাফল পাওয়া যায়নি।'}
          </div>
        )
      )}
    </div>
  );
};

export default ResultReports;
