import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useExams } from "../hooks/useExams";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { FileBadge, Printer, Search, Download, Share2 } from "lucide-react";
import { Result } from "../types";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  const [isEditing, setIsEditing] = useState(false);
  const [numeralFormat, setNumeralFormat] = useState<'bn' | 'ar' | 'en'>('en');
  const [marksheetLanguage, setMarksheetLanguage] = useState<'bn' | 'ar' | 'en'>('bn');
  const [fontStyle, setFontStyle] = useState<'modern' | 'classic'>('modern');

  const translations = {
    bn: {
      title: "মাদরাসা ফলাফল পত্র",
      academicYear: "শিক্ষাবর্ষ",
      studentName: "শিক্ষার্থীর নাম",
      class: "শ্রেণি",
      roll: "রোল নম্বর",
      fatherName: "পিতার নাম",
      rank: "র‍্যাঙ্ক",
      result: "ফলাফল",
      subject: "বিষয়",
      fullMarks: "পূর্ণমান",
      passMarks: "পাস নম্বর",
      obtainedMarks: "প্রাপ্ত নম্বর",
      total: "সর্বমোট",
      percentage: "শতকরা",
      grade: "গ্রেড",
      teacherSignature: "শ্রেণি শিক্ষকের স্বাক্ষর",
      principalSignature: "অধ্যক্ষের স্বাক্ষর",
      historyTitle: "শিক্ষার্থীর একাডেমিক ইতিহাস",
      exam: "পরীক্ষা",
      viewMarksheet: "মার্কশিট দেখুন",
      loading: "লোড হচ্ছে...",
      select: "নির্বাচন করুন",
      academicYearLabel: "শিক্ষাবর্ষ",
      classLabel: "শ্রেণি",
      examLabel: "পরীক্ষা",
      studentLabel: "শিক্ষার্থী",
      print: "প্রিন্ট",
      share: "শেয়ার",
      save: "সংরক্ষণ করুন",
      edit: "সম্পাদনা",
      cancel: "বাতিল",
      pass: "কৃতকার্য",
      fail: "অকৃতকার্য"
    },
    en: {
      title: "Madrasa Result Sheet",
      academicYear: "Academic Year",
      studentName: "Student Name",
      class: "Class",
      roll: "Roll No",
      fatherName: "Father's Name",
      rank: "Rank",
      result: "Result",
      subject: "Subject",
      fullMarks: "Full Marks",
      passMarks: "Pass Marks",
      obtainedMarks: "Obtained Marks",
      total: "Total",
      percentage: "Percentage",
      grade: "Grade",
      teacherSignature: "Class Teacher's Signature",
      principalSignature: "Principal's Signature",
      historyTitle: "Student Academic History",
      exam: "Exam",
      viewMarksheet: "View Marksheet",
      loading: "Loading...",
      select: "Select",
      academicYearLabel: "Academic Year",
      classLabel: "Class",
      examLabel: "Exam",
      studentLabel: "Student",
      print: "Print",
      share: "Share",
      save: "Save",
      edit: "Edit",
      cancel: "Cancel",
      pass: "Pass",
      fail: "Fail"
    },
    ar: {
      title: "كشف درجات المدرسة",
      academicYear: "السنة الدراسية",
      studentName: "اسم الطالب",
      class: "الفصل",
      roll: "رقم الجلوس",
      fatherName: "اسم الأب",
      rank: "الرتبة",
      result: "النتيجة",
      subject: "المادة",
      fullMarks: "الدرجة الكاملة",
      passMarks: "درجة النجاح",
      obtainedMarks: "الدرجة الحاصل عليها",
      total: "المجموع",
      percentage: "النسبة المئوية",
      grade: "التقدير",
      teacherSignature: "توقيع معلم الفصل",
      principalSignature: "توقيع المدير",
      historyTitle: "السجل الأكاديمي للطالب",
      exam: "الامتحان",
      viewMarksheet: "عرض كشف الدرجات",
      loading: "جاري التحميل...",
      select: "اختر",
      academicYearLabel: "السنة الدراسية",
      classLabel: "الفصل",
      examLabel: "الامتحان",
      studentLabel: "الطالب",
      print: "طباعة",
      share: "مشاركة",
      save: "حفظ",
      edit: "تعديل",
      cancel: "إلغاء",
      pass: "ناجح",
      fail: "راسب"
    }
  };

  const t = translations[marksheetLanguage];

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

  const { totalMarks, totalFullMarks, percentage, grade, rank, statusKey } = useMemo(() => 
    calculateResultMetrics(results.filter(r => r.student_id === selectedStudentId), filteredSubjects, allStudentResults), 
    [results, filteredSubjects, selectedStudentId, allStudentResults]
  );

  const [academicHistory, setAcademicHistory] = useState<any[]>([]);

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

  const academicHistoryTable = useMemo(() => {
    // Group results by academic year and exam
    const groups: { [key: string]: Result[] } = {};
    academicHistory.forEach(r => {
      const key = `${r.academic_year_id}-${r.exam_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    return Object.entries(groups).map(([key, groupResults]) => {
      const [yearId, examId] = key.split('-');
      const classId = groupResults[0].class_id;
      
      // We need subjects for this class to calculate metrics
      const classSubjects = subjects.filter(s => s.classId === classId);
      
      // For rank, we'd need all results for that exam/class, which we don't have here easily.
      // For now, we'll calculate what we can.
      const { totalMarks, percentage, grade, statusKey } = calculateResultMetrics(groupResults, classSubjects);

      return {
        year: academicYears.find(ay => ay.id === yearId)?.year_name || "N/A",
        exam: exams.find(e => e.id === examId)?.name || "N/A",
        class: classes.find(c => c.id === classId)?.name || "N/A",
        totalMarks,
        percentage,
        grade: `${t[statusKey as keyof typeof t]} (${grade})`,
        rank: "-" // Rank is hard to calculate without full exam data
      };
    }).sort((a, b) => b.year.localeCompare(a.year));
  }, [academicHistory, academicYears, exams, classes, subjects]);

  const exportToPDF = async () => {
    const input = document.getElementById('marksheet-container');
    if (!input) return;

    setLoading(true);
    try {
      await document.fonts.ready;
      
      const width = input.scrollWidth;
      const height = input.scrollHeight;

      const canvas = await html2canvas(input, { 
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: width,
        height: height,
        windowWidth: width,
        windowHeight: height,
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

          const clonedElement = clonedDoc.getElementById('marksheet-container');
          if (clonedElement) {
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.position = 'absolute';
            clonedElement.style.top = '0';
            clonedElement.style.left = '0';
            clonedElement.style.width = width + 'px';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(pdfWidth / imgProps.width, (pdfHeight - 10) / imgProps.height);
      
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      
      const x = (pdfWidth - imgWidth) / 2;
      const y = 5;

      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
      pdf.save(`marksheet_${selectedStudent?.name}.pdf`);
      toast.success("PDF ডাউনলোড সফল হয়েছে!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("PDF ডাউনলোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const input = document.getElementById('marksheet-container');
    if (!input) return;

    setLoading(true);
    try {
      await document.fonts.ready;
      
      const width = input.scrollWidth;
      const height = input.scrollHeight;

      const canvas = await html2canvas(input, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: width,
        height: height,
        windowWidth: width,
        windowHeight: height,
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

          const clonedElement = clonedDoc.getElementById('marksheet-container');
          if (clonedElement) {
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.position = 'absolute';
            clonedElement.style.top = '0';
            clonedElement.style.left = '0';
            clonedElement.style.width = width + 'px';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(pdfWidth / imgProps.width, (pdfHeight - 10) / imgProps.height);
      
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      const x = (pdfWidth - imgWidth) / 2;

      pdf.addImage(imgData, 'JPEG', x, 5, imgWidth, imgHeight);
      
      const pdfBlob = pdf.output('blob');
      const fileName = `marksheet_${selectedStudent?.name}.pdf`;
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
      setLoading(false);
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
        <div className="flex gap-2">
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
                <div className="flex items-end gap-2">
                    {(role === 'admin' || role === 'teacher') && (
                      <>
                        {isEditing ? (
                          <>
                            <button onClick={saveResults} className="btn-primary h-9 px-3 text-sm" title={t.save}>
                                {t.save}
                            </button>
                            <button onClick={() => setIsEditing(false)} className="btn-outline h-9 px-3 text-sm" title={t.cancel}>
                                {t.cancel}
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setIsEditing(true)} className="btn-secondary h-9 px-3 text-sm" title={t.edit}>
                              {t.edit}
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={handlePrint} className="btn-secondary h-9 px-3" title={t.print}>
                        <Printer className="w-4 h-4" />
                    </button>
                    <button onClick={exportToPDF} className="btn-secondary h-9 px-3" title="PDF">
                        <Download className="w-4 h-4" />
                    </button>
                    <button onClick={handleShare} className="btn-secondary h-9 px-3" title={t.share}>
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      </div>
      
      {/* ... (rest of the component) ... */}

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

      {results.length > 0 && selectedStudent && (
        <div 
          id="marksheet-container" 
          className={`card-premium p-8 print:shadow-none print:border-none print:p-0 max-w-4xl mx-auto bg-white ${marksheetLanguage === 'ar' ? 'rtl' : 'ltr'} ${fontStyle === 'modern' ? 'font-modern' : 'font-classic'}`}
          dir={marksheetLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{t.title}</h1>
            <h2 className="text-xl font-semibold text-slate-700 mb-1">
              {exams.find(e => e.id === selectedExamId)?.name}
            </h2>
            <p className="text-slate-600 font-medium">
              {t.academicYear}: {academicYears.find(ay => ay.id === selectedAcademicYearId)?.year_name} 
              ({academicYears.find(ay => ay.id === selectedAcademicYearId)?.hijri_year})
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
                  <th className={`p-4 font-semibold text-slate-800 ${marksheetLanguage === 'ar' ? 'text-right border-l' : 'text-left border-r'} border-slate-300`}>{t.subject}</th>
                  <th className={`p-4 font-semibold text-slate-800 text-center ${marksheetLanguage === 'ar' ? 'border-l' : 'border-r'} border-slate-300`}>{t.fullMarks}</th>
                  <th className={`p-4 font-semibold text-slate-800 text-center ${marksheetLanguage === 'ar' ? 'border-l' : 'border-r'} border-slate-300`}>{t.passMarks}</th>
                  <th className="p-4 font-semibold text-slate-800 text-center">{t.obtainedMarks}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredSubjects.map((subject) => {
                  const result = results.find(r => r.subject_id === subject.id);
                  const isFail = !result || result.marks < subject.passMarks;
                  
                  return (
                    <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                      <td className={`p-4 text-slate-800 font-medium ${marksheetLanguage === 'ar' ? 'text-right border-l' : 'text-left border-r'} border-slate-300`}>{subject.name}</td>
                      <td className={`p-4 text-slate-600 text-center ${marksheetLanguage === 'ar' ? 'border-l' : 'border-r'} border-slate-300`}>{convertNumber(subject.fullMarks, numeralFormat)}</td>
                      <td className={`p-4 text-slate-600 text-center ${marksheetLanguage === 'ar' ? 'border-l' : 'border-r'} border-slate-300`}>{convertNumber(subject.passMarks, numeralFormat)}</td>
                      <td className={`p-4 text-center font-bold ${isFail ? 'text-[#EF4444]' : 'text-slate-800'}`}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={result?.marks ?? 0}
                            onChange={(e) => handleMarkChange(subject.id, e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-center focus:ring-2 focus:ring-[#0F5C7A] outline-none"
                            max={subject.fullMarks}
                            min={0}
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
                  <td className={`p-4 font-bold text-slate-800 ${marksheetLanguage === 'ar' ? 'text-left border-l' : 'text-right border-r'} border-slate-300`}>{t.total}:</td>
                  <td className={`p-4 font-bold text-slate-800 text-center ${marksheetLanguage === 'ar' ? 'border-l' : 'border-r'} border-slate-300`}>{convertNumber(totalFullMarks, numeralFormat)}</td>
                  <td className={`p-4 font-bold text-slate-800 text-center ${marksheetLanguage === 'ar' ? 'border-l' : 'border-r'} border-slate-300`}>{t.rank}:</td>
                  <td className="p-4 font-bold text-slate-800 text-center">{convertNumber(rank, numeralFormat)}</td>
                </tr>
                <tr>
                  <td className={`p-4 font-bold text-slate-800 ${marksheetLanguage === 'ar' ? 'text-left border-l' : 'text-right border-r'} border-slate-300`}>{t.percentage}:</td>
                  <td className={`p-4 font-bold text-slate-800 text-center ${marksheetLanguage === 'ar' ? 'border-l' : 'border-r'} border-slate-300`}>{convertNumber(percentage, numeralFormat)}%</td>
                  <td className={`p-4 font-bold text-slate-800 text-center ${marksheetLanguage === 'ar' ? 'border-l' : 'border-r'} border-slate-300`}>{t.grade}:</td>
                  <td className="p-4 font-bold text-slate-800 text-center">{grade}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-24 flex justify-between px-8">
            <div className="text-center">
              <div className="w-40 border-t border-slate-800 mb-2"></div>
              <p className="font-medium text-slate-800">{t.teacherSignature}</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-slate-800 mb-2"></div>
              <p className="font-medium text-slate-800">{t.principalSignature}</p>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && (
        <div className="card-premium p-8 mt-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">{t.historyTitle}</h3>
          <table className="w-full text-left border-collapse">
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
