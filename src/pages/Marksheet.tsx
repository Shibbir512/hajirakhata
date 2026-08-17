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
import { collection, query, where, getDocs, getDoc, doc, setDoc } from "firebase/firestore";
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
  const [resultsConfig, setResultsConfig] = useState<any>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [numeralFormat, setNumeralFormat] = useState<'bn' | 'ar' | 'en'>('en');
  const [marksheetLanguage, setMarksheetLanguage] = useState<'bn' | 'ar' | 'en'>('bn');
  const [fontStyle, setFontStyle] = useState<'modern' | 'classic'>('modern');
  const [gradingSystem, setGradingSystem] = useState<'madrasa' | 'general'>('madrasa');

  useEffect(() => {
    if (orgId) {
      getDoc(doc(db, "organizations", orgId)).then(docSnap => {
        if (docSnap.exists() && docSnap.data().gradingSystem) {
          setGradingSystem(docSnap.data().gradingSystem);
        }
      });
    }
  }, [orgId]);

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
    let list = (students[selectedClassId] || []).filter(s => s.isActive !== false);
    
    if (resultsConfig) {
      const excluded = resultsConfig.excludedStudents || [];
      const order = resultsConfig.studentOrder || [];
      
      list = list.filter(s => !excluded.includes(s.id));
      
      if (order.length > 0) {
        list.sort((a, b) => {
          const idxA = order.indexOf(a.id);
          const idxB = order.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.roll - b.roll;
        });
      } else {
        list.sort((a, b) => a.roll - b.roll);
      }
    } else {
      list.sort((a, b) => a.roll - b.roll);
    }
    return list;
  }, [students, selectedClassId, resultsConfig]);

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
      const loadedResults: Result[] = [];
      let foundConfig: any = null;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'config') {
          foundConfig = data;
        } else if (!data.isDeleted) {
          loadedResults.push(data as Result);
        }
      });
      setResults(loadedResults);
      setResultsConfig(foundConfig);
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
    window.print();
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
    calculateResultMetrics(results.filter(r => r.student_id === selectedStudentId), filteredSubjects, allStudentResults, gradingSystem), 
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
          const { rank } = calculateResultMetrics(groupResults, classSubjects, allStudentMetrics, gradingSystem);
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
      const metrics = calculateResultMetrics(groupResults, classSubjects, undefined, gradingSystem);

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

  const generatePDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF("p", "mm", "a4");
    const { addBengaliFont } = await import("../utils/pdfFont");
    const hasFont = await addBengaliFont(pdf);
    
    if (hasFont) {
      pdf.setFont("TiroBangla");
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    let currentY = 20;

    // Header
    pdf.setFontSize(22);
    pdf.text(orgName || "দারুল উলুম দত্তপাড়া মাদরাসা, নরসিংদী", pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    pdf.setFontSize(16);
    const examName = exams.find(e => e.id === selectedExamId)?.name || "";
    pdf.text(`${examName} পরীক্ষার ফলাফল`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    pdf.setFontSize(12);
    const academicYear = academicYears.find(ay => ay.id === selectedAcademicYearId);
    pdf.text(`${t.academicYear}: ${formatAcademicYear(academicYear)}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Student Info
    pdf.setFontSize(12);
    const startX = 14;
    const col2StartX = pageWidth / 2 + 10;
    
    const studentName = selectedStudent?.name || "";
    const className = classes.find(c => c.id === selectedClassId)?.name || "";
    const rollNum = convertNumber(selectedStudent?.roll || 0, numeralFormat).toString();
    const fatherName = selectedStudent?.fatherName || "N/A";
    const rankStr = convertNumber(rank, numeralFormat).toString();
    const statusText = t[statusKey as keyof typeof t];
    const resultStr = `${statusText} (${grade})`;

    // Left Column
    pdf.text(`${t.studentName}: ${studentName}`, startX, currentY);
    pdf.text(`${t.class}: ${className}`, startX, currentY + 7);
    pdf.text(`${t.roll}: ${rollNum}`, startX, currentY + 14);

    // Right Column
    pdf.text(`${t.fatherName}: ${fatherName}`, col2StartX, currentY);
    pdf.text(`${t.rank}: ${rankStr}`, col2StartX, currentY + 7);
    pdf.text(`${t.result}: ${resultStr}`, col2StartX, currentY + 14);
    
    currentY += 25;

    // Table
    const head = [[t.subject, t.fullMarks, t.passMarks, t.obtainedMarks]];
    const body = filteredSubjects.map(subject => {
      const result = results.find(r => r.subject_id === subject.id);
      return [
        subject.name,
        convertNumber(subject.fullMarks, numeralFormat).toString(),
        convertNumber(subject.passMarks, numeralFormat).toString(),
        result ? convertNumber(result.marks, numeralFormat).toString() : "-"
      ];
    });

    const foot = [
      [t.total + ":", convertNumber(calculatedTotalMarks, numeralFormat).toString(), t.rank + ":", rankStr],
      [t.percentage + ":", convertNumber(percentage, numeralFormat).toString() + "%", t.grade + ":", grade]
    ];

    autoTable(pdf, {
      head: head,
      body: body,
      foot: foot,
      startY: currentY,
      styles: {
        font: hasFont ? 'TiroBangla' : 'helvetica',
        fontSize: 11,
        cellPadding: 4,
        valign: 'middle',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: marksheetLanguage === 'ar' ? 'right' : 'left' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    // Signatures
    // @ts-ignore
    const finalY = pdf.lastAutoTable.finalY + 40;
    
    if (finalY > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      currentY = 30;
    } else {
      currentY = finalY;
    }

    pdf.line(20, currentY, 70, currentY);
    pdf.text(t.teacherSignature, 45, currentY + 6, { align: 'center' });

    pdf.line(pageWidth - 70, currentY, pageWidth - 20, currentY);
    pdf.text(t.principalSignature, pageWidth - 45, currentY + 6, { align: 'center' });

    return pdf;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = await generatePDF();
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
      const pdf = await generatePDF();
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
        const shareUrl = window.location.href;
        const shareText = `${selectedStudent?.name} এর মার্কশিট।`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
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
      <style>
        {`
          @media print {
            @page { size: portrait; margin: 15mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print\\:overflow-visible { overflow: visible !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:border-none { border: none !important; }
            .print\\:p-0 { padding: 0 !important; }
            table { page-break-inside: auto; width: 100% !important; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            #marksheet-container { width: 100% !important; max-width: 100% !important; overflow: visible !important; }
            .overflow-x-auto { overflow-x: visible !important; }
          }
        `}
      </style>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        
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
