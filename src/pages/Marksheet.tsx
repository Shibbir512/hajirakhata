import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useExams } from "../hooks/useExams";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { FileBadge, Printer, Search, Download, Share2 } from "lucide-react";
import { MARKSHEET_TRANSLATIONS } from "../constants";
import { Result } from "../types";
import { MarksheetFilter } from "../components/MarksheetFilter";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import { formatAcademicYear, toEnglishNumber } from "../utils/dateFormatter";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from "docx";
import { saveAs } from "file-saver";

const Marksheet: React.FC = () => {
  const { user, orgId, role, orgName } = useAuth();
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
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [numeralFormat, setNumeralFormat] = useState<'bn' | 'ar' | 'en'>('en');
  const [marksheetLanguage, setMarksheetLanguage] = useState<'bn' | 'ar' | 'en'>('bn');
  const [fontStyle, setFontStyle] = useState<'modern' | 'classic'>('modern');

  const t = MARKSHEET_TRANSLATIONS[marksheetLanguage];

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
    return subjects.filter(s => s.classId === selectedClassId);
  }, [subjects, selectedClassId]);

  const filteredStudents = useMemo(() => {
    return (students[selectedClassId] || [])
      .filter(s => s.isActive !== false)
      .sort((a, b) => a.roll - b.roll);
  }, [students, selectedClassId]);

  const selectedStudent = useMemo(() => {
    return filteredStudents.find(s => s.id === selectedStudentId);
  }, [filteredStudents, selectedStudentId]);

  const fetchResults = async () => {
    if (!orgId || !selectedAcademicYearId || !selectedClassId || !selectedExamId || !selectedStudentId) return;
    setLoading(true);
    setIsEditing(false);
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
      toast.error("মার্কশিট লোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const saveResults = async () => {
    if (!orgId || !user || results.length === 0) return;
    setLoading(true);
    try {
      const batch = results.filter(r => r.student_id === selectedStudentId).map(result => {
        const resultRef = doc(db, `organizations/${orgId}/results`, result.id);
        return setDoc(resultRef, {
          ...result,
          updated_at: Date.now(),
          updated_by: user.uid
        }, { merge: true });
      });
      await Promise.all(batch);
      toast.success("ফলাফল সফলভাবে সংরক্ষিত হয়েছে!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving results:", error);
      toast.error("ফলাফল সংরক্ষণ করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (subjectId: string, value: string) => {
    const marks = Number(value);
    setResults(prev => prev.map(r => 
      (r.subject_id === subjectId && r.student_id === selectedStudentId) ? { ...r, marks } : r
    ));
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 500);
  };

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

  const { totalMarks: calculatedTotalMarks, totalFullMarks, percentage, grade, rank, statusKey } = useMemo(() => 
    calculateResultMetrics(results.filter(r => r.student_id === selectedStudentId), filteredSubjects, allStudentResults), 
    [results, filteredSubjects, selectedStudentId, allStudentResults]
  );

  const [academicHistory, setAcademicHistory] = useState<any[]>([]);
  const [historyRanks, setHistoryRanks] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const fetchAcademicHistory = async () => {
      if (!orgId || !selectedStudentId) return;
      try {
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const q = query(resultsRef, where("student_id", "==", selectedStudentId));
        const snapshot = await getDocs(q);
        const history = snapshot.docs.map(doc => doc.data());
        setAcademicHistory(history);
      } catch (error) {
        console.error("Error fetching academic history:", error);
      }
    };
    fetchAcademicHistory();
  }, [orgId, selectedStudentId]);

  useEffect(() => {
    const fetchHistoryRanks = async () => {
      if (!orgId || academicHistory.length === 0) return;
      
      const groups: { [key: string]: Result[] } = {};
      academicHistory.forEach(r => {
        const key = `${r.academic_year_id}_${r.exam_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });

      const newRanks: {[key: string]: string} = {};

      for (const [key, groupResults] of Object.entries(groups)) {
        const [yearId, examId] = key.split('_');
        const classId = groupResults[0].class_id;
        
        try {
          const resultsRef = collection(db, `organizations/${orgId}/results`);
          const q = query(
            resultsRef,
            where("academic_year_id", "==", yearId),
            where("exam_id", "==", examId),
            where("class_id", "==", classId)
          );
          const snapshot = await getDocs(q);
          const allResults = snapshot.docs.map(doc => doc.data() as Result);
          
          const studentTotals: { [key: string]: number } = {};
          allResults.forEach(r => {
            studentTotals[r.student_id] = (studentTotals[r.student_id] || 0) + r.marks;
          });
          
          const allStudentMetrics = Object.entries(studentTotals).map(([sId, total]) => ({
            studentId: sId,
            totalMarks: total,
            hasFailed: false // Simplified
          }));

          const classSubjects = subjects.filter(s => s.classId === classId);
          const { rank } = calculateResultMetrics(groupResults, classSubjects, allStudentMetrics);
          newRanks[key] = rank;
        } catch (error) {
          console.error("Error fetching rank for history:", error);
        }
      }
      
      setHistoryRanks(newRanks);
    };
    
    fetchHistoryRanks();
  }, [orgId, academicHistory, subjects]);

  const academicHistoryTable = useMemo(() => {
    // Group results by academic year and exam
    const groups: { [key: string]: Result[] } = {};
    academicHistory.forEach(r => {
      const key = `${r.academic_year_id}_${r.exam_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return Object.entries(groups).map(([key, groupResults]) => {
      const [yearId, examId] = key.split('_');
      const classId = groupResults[0].class_id;
      
      // We need subjects for this class to calculate metrics
      const classSubjects = subjects.filter(s => s.classId === classId);
      
      // For rank, we'd need all results for that exam/class, which we don't have here easily.
      // For now, we'll calculate what we can.
      const metrics = calculateResultMetrics(groupResults, classSubjects);

      // Fallback to ID if name not found (in case IDs are names or lists not loaded)
      const yearName = formatAcademicYear(academicYears.find(ay => ay.id === yearId));
      const examName = exams.find(e => e.id === examId)?.name || examId;

      return {
        year: yearName,
        exam: examName,
        class: classes.find(c => c.id === classId)?.name || classId,
        totalMarks: metrics.totalMarks,
        percentage: metrics.percentage,
        grade: `${t[metrics.statusKey as keyof typeof t]} (${metrics.grade})`,
        rank: historyRanks[key] ? convertNumber(historyRanks[key], numeralFormat) : "-"
      };
    }).sort((a, b) => b.year.localeCompare(a.year));
  }, [academicHistory, academicYears, exams, classes, subjects, historyRanks, t, numeralFormat]);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for React to render loading state
      
      const input = document.getElementById('marksheet-container');
      if (!input) throw new Error("Marksheet container not found");
      
      // হাই কোয়ালিটি ইমেজ ক্যাপচার
      const canvas = await toCanvas(input, { 
        pixelRatio: 2, 
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // প্রথম পেজ
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // কন্টেন্ট বেশি হলে পরবর্তী পেজগুলোতে ভাগ করা
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Result_${selectedStudent?.name}.pdf`);
      toast.success("PDF ডাউনলোড সফল হয়েছে!");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("PDF ডাউনলোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setIsExporting(true);
    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for React to render loading state
      
      const input = document.getElementById('marksheet-container');
      if (!input) throw new Error("Marksheet container not found");
      
      const canvas = await toCanvas(input, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const pdfBlob = pdf.output('blob');
      const fileName = `Result_${selectedStudent?.name}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t.title,
          text: `${selectedStudent?.name} - ${t.title}`,
        });
      } else {
        // Fallback for browsers that don't support file sharing
        const shareUrl = window.location.href;
        const shareText = `${selectedStudent?.name} এর মার্কশিট।`;
        
        // Create a temporary link for WhatsApp/Telegram
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        
        // Show a simple custom dialog or just open WhatsApp as default fallback
        window.open(whatsappUrl, '_blank');
        toast.success("WhatsApp এ শেয়ার করার জন্য ওপেন করা হচ্ছে।");
      }
    } catch (error) {
      console.error("Share Error:", error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error("শেয়ার করতে ব্যর্থ হয়েছে।");
      }
    } finally {
      setIsExporting(false);
    }
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
          <FileBadge className="w-6 h-6 text-[#0F5C7A]" />
          মার্কশিট
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-medium ml-1">সংখ্যা ফরম্যাট</span>
              <select value={numeralFormat} onChange={(e) => setNumeralFormat(e.target.value as any)} className="input-premium py-1 h-9 text-sm">
                  <option value="en">English (0-9)</option>
                  <option value="bn">Bengali (০-৯)</option>
                  <option value="ar">Arabic (٠-٩)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-medium ml-1">ভাষা</span>
              <select value={marksheetLanguage} onChange={(e) => setMarksheetLanguage(e.target.value as any)} className="input-premium py-1 h-9 text-sm">
                  <option value="bn">বাংলা</option>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-medium ml-1">ফন্ট স্টাইল</span>
              <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value as any)} className="input-premium py-1 h-9 text-sm">
                  <option value="modern">আধুনিক (Modern)</option>
                  <option value="classic">ক্লাসিক (Classic)</option>
              </select>
            </div>
            {results.length > 0 && (
                <div className="flex flex-wrap items-end gap-2">
                    {(role === 'admin' || role === 'teacher') && (
                      <>
                        {isEditing ? (
                          <>
                            <button onClick={saveResults} className="btn-primary h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap" title={t.save}>
                                {t.save}
                            </button>
                            <button onClick={() => setIsEditing(false)} className="btn-outline h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap" title={t.cancel}>
                                {t.cancel}
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setIsEditing(true)} className="btn-secondary h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap" title={t.edit}>
                              {t.edit}
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={handlePrint} disabled={isExporting} className="btn-secondary h-9 px-3 w-full sm:w-auto whitespace-nowrap" title={t.print}>
                        <Printer className="w-4 h-4" />
                    </button>
                    <button onClick={exportToPDF} disabled={isExporting} className="btn-secondary h-9 px-3 w-full sm:w-auto whitespace-nowrap" title="PDF">
                        <Download className="w-4 h-4" />
                    </button>
                    <button onClick={handleShare} disabled={isExporting} className="btn-secondary h-9 px-3 w-full sm:w-auto whitespace-nowrap" title={t.share}>
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      </div>
      
      {/* ... (rest of the component) ... */}

      <MarksheetFilter
        t={t}
        selectedAcademicYearId={selectedAcademicYearId}
        setSelectedAcademicYearId={setSelectedAcademicYearId}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        selectedStudentId={selectedStudentId}
        setSelectedStudentId={setSelectedStudentId}
        academicYears={academicYears}
        classes={classes}
        filteredExams={filteredExams}
        filteredStudents={filteredStudents}
        fetchResults={fetchResults}
        loading={loading}
        setResults={setResults}
      />

      {results.length > 0 && selectedStudent && (
        <div className="w-full overflow-x-auto pb-4">
          <div 
            id="marksheet-container" 
            className={`card-premium print:shadow-none print:border-none print:p-0 bg-white border-4 border-[#0F5C7A] rounded-2xl ${marksheetLanguage === 'ar' ? 'rtl' : 'ltr'} ${fontStyle === 'modern' ? 'font-modern' : 'font-classic'}`}
            dir={marksheetLanguage === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="text-center mb-8 border-b-4 border-[#0F5C7A] pb-6">
              <h1 className="text-4xl font-bold text-[#0F5C7A] mb-2">{orgName || "দারুল উলুম দত্তপাড়া মাদরাসা, নরসিংদী"}</h1>
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                {exams.find(e => e.id === selectedExamId)?.name} পরীক্ষার ফলাফল
              </h2>
              <p className="text-slate-600 font-medium">
                {t.academicYear}: {formatAcademicYear(academicYears.find(ay => ay.id === selectedAcademicYearId))}
              </p>
            </div>

          <div className="grid grid-cols-2 gap-6 mb-8 text-slate-800">
            <div className="space-y-2">
              <p><span className="font-semibold w-32 inline-block">{t.studentName}:</span> {selectedStudent.name}</p>
              <p><span className="font-semibold w-32 inline-block">{t.class}:</span> {classes.find(c => c.id === selectedClassId)?.name}</p>
              <p><span className="font-semibold w-32 inline-block">{t.roll}:</span> {convertNumber(selectedStudent.roll, numeralFormat)}</p>
            </div>
            <div className="space-y-2">
              <p><span className="font-semibold w-32 inline-block">{t.fatherName}:</span> {selectedStudent.fatherName || "N/A"}</p>
              <p><span className="font-semibold w-32 inline-block">{t.rank}:</span> <span className="font-bold">{convertNumber(rank, numeralFormat)}</span></p>
              <p><span className="font-semibold w-32 inline-block">{t.result}:</span> <span className={`font-bold ${statusKey === 'pass' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{t[statusKey as keyof typeof t]} ({grade})</span></p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-lg mb-8">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className={`p-4 font-semibold text-slate-800 border border-slate-300 ${marksheetLanguage === 'ar' ? 'text-right' : 'text-left'}`}>{t.subject}</th>
                  <th className="p-4 font-semibold text-slate-800 text-center border border-slate-300">{t.fullMarks}</th>
                  <th className="p-4 font-semibold text-slate-800 text-center border border-slate-300">{t.passMarks}</th>
                  <th className="p-4 font-semibold text-slate-800 text-center border border-slate-300">{t.obtainedMarks}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredSubjects.map((subject) => {
                  const result = results.find(r => r.subject_id === subject.id);
                  const isFail = !result || result.marks < subject.passMarks;
                  
                  return (
                    <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`p-4 text-slate-800 font-medium border border-slate-300 ${marksheetLanguage === 'ar' ? 'text-right' : 'text-left'}`}>{subject.name}</td>
                      <td className="p-4 text-slate-600 text-center border border-slate-300">{convertNumber(subject.fullMarks, numeralFormat)}</td>
                      <td className="p-4 text-slate-600 text-center border border-slate-300">{convertNumber(subject.passMarks, numeralFormat)}</td>
                      <td className={`p-4 text-center font-bold border border-slate-300 ${isFail ? 'text-[#EF4444]' : 'text-slate-800'}`}>
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={result?.marks ?? 0}
                            onChange={(e) => handleMarkChange(subject.id, toEnglishNumber(e.target.value))}
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-center focus:ring-2 focus:ring-[#0F5C7A] outline-none"
                          />
                        ) : (
                          result ? convertNumber(result.marks, numeralFormat) : "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td className={`p-4 font-bold text-slate-800 border border-slate-300 ${marksheetLanguage === 'ar' ? 'text-left' : 'text-right'}`}>{t.total}:</td>
                  <td className="p-4 font-bold text-slate-800 text-center border border-slate-300">{convertNumber(calculatedTotalMarks, numeralFormat)}</td>
                  <td className="p-4 font-bold text-slate-800 text-center border border-slate-300">{t.rank}:</td>
                  <td className="p-4 font-bold text-slate-800 text-center border border-slate-300">{convertNumber(rank, numeralFormat)}</td>
                </tr>
                <tr>
                  <td className={`p-4 font-bold text-slate-800 border border-slate-300 ${marksheetLanguage === 'ar' ? 'text-left' : 'text-right'}`}>{t.percentage}:</td>
                  <td className="p-4 font-bold text-slate-800 text-center border border-slate-300">{convertNumber(percentage, numeralFormat)}%</td>
                  <td className="p-4 font-bold text-slate-800 text-center border border-slate-300">{t.grade}:</td>
                  <td className="p-4 font-bold text-slate-800 text-center border border-slate-300">{grade}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-24 flex flex-wrap justify-around gap-8 px-4">
            <div className="text-center min-w-[160px]">
              <div className="w-full border-t border-slate-800 mb-2"></div>
              <p className="font-medium text-slate-800">{t.teacherSignature}</p>
            </div>
            <div className="text-center min-w-[160px]">
              <div className="w-full border-t border-slate-800 mb-2"></div>
              <p className="font-medium text-slate-800">{t.principalSignature}</p>
            </div>
          </div>
        </div>
        </div>
      )}

      {selectedStudent && (
        <div className="card-premium p-8 mt-8 overflow-x-auto">
          <h3 className="text-xl font-bold text-slate-800 mb-4">{t.historyTitle}</h3>
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-100 border-b border-slate-300">
              <tr>
                <th className="p-4">{t.academicYear}</th>
                <th className="p-4">{t.exam}</th>
                <th className="p-4">{t.class}</th>
                <th className="p-4">{t.obtainedMarks}</th>
                <th className="p-4">{t.percentage}</th>
                <th className="p-4">{t.grade}</th>
                <th className="p-4">{t.rank}</th>
              </tr>
            </thead>
            <tbody>
              {academicHistoryTable.map((row, index) => (
                <tr key={`${row.year}-${row.exam}-${row.class}`} className="border-b border-slate-200">
                  <td className="p-4">{row.year}</td>
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
