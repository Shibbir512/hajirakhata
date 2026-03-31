import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Result, Student, Subject, Exam, AcademicYear, ClassData } from "../types";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import { Printer, Download, Share2, ArrowLeft, FileBadge } from "lucide-react";
import { MARKSHEET_TRANSLATIONS } from "../constants";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";

const PublicResultView: React.FC = () => {
  const { orgId, studentId, examId } = useParams<{ orgId: string; studentId: string; examId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [cls, setCls] = useState<ClassData | null>(null);
  const [allStudentResults, setAllStudentResults] = useState<any[]>([]);
  const [orgName, setOrgName] = useState("মাদরাসা");

  const [numeralFormat, setNumeralFormat] = useState<'bn' | 'ar' | 'en'>('bn');
  const [marksheetLanguage, setMarksheetLanguage] = useState<'bn' | 'ar' | 'en'>('bn');
  const [fontStyle, setFontStyle] = useState<'modern' | 'classic'>('modern');

  const t = MARKSHEET_TRANSLATIONS[marksheetLanguage];

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId || !studentId || !examId) return;
      setLoading(true);
      try {
        // Fetch Org Name
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if (orgSnap.exists()) {
          setOrgName(orgSnap.data().name || "মাদরাসা");
        }

        // 1. Fetch Student
        const studentSnap = await getDoc(doc(db, `organizations/${orgId}/students`, studentId));
        if (!studentSnap.exists()) throw new Error("Student not found");
        const studentData = studentSnap.data() as Student;
        setStudent(studentData);

        // 2. Fetch Results (only published)
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const resultQuery = query(
          resultsRef,
          where("student_id", "==", studentId),
          where("exam_id", "==", examId),
          where("status", "==", "published")
        );
        const resultSnap = await getDocs(resultQuery);
        const loadedResults = resultSnap.docs.map(doc => doc.data() as Result);
        setResults(loadedResults);

        if (loadedResults.length === 0) throw new Error("Results not found or not published");

        const classId = loadedResults[0].class_id;
        const yearId = loadedResults[0].academic_year_id;

        // 3. Fetch Subjects for the class
        const subjectsRef = collection(db, `organizations/${orgId}/subjects`);
        const subjectsSnap = await getDocs(query(subjectsRef, where("classId", "==", classId)));
        setSubjects(subjectsSnap.docs.map(doc => doc.data() as Subject));

        // 4. Fetch Exam, Year, Class
        const [examSnap, yearSnap, classSnap] = await Promise.all([
          getDoc(doc(db, `organizations/${orgId}/exams`, examId)),
          getDoc(doc(db, `organizations/${orgId}/academic_years`, yearId)),
          getDoc(doc(db, `organizations/${orgId}/classes`, classId))
        ]);

        if (examSnap.exists()) setExam(examSnap.data() as Exam);
        if (yearSnap.exists()) setAcademicYear(yearSnap.data() as AcademicYear);
        if (classSnap.exists()) setCls(classSnap.data() as ClassData);

        // 5. Fetch all results for rank calculation
        const allResultsQuery = query(
          resultsRef,
          where("academic_year_id", "==", yearId),
          where("exam_id", "==", examId),
          where("class_id", "==", classId),
          where("status", "==", "published")
        );
        const allResultsSnap = await getDocs(allResultsQuery);
        const allResults = allResultsSnap.docs.map(doc => doc.data() as Result);

        // Group by student for rank
        const studentsInClassSnap = await getDocs(query(collection(db, `organizations/${orgId}/students`), where("classId", "==", classId)));
        const studentsInClass = studentsInClassSnap.docs.map(doc => doc.data() as Student);

        const metrics = studentsInClass.map(s => {
          const sResults = allResults.filter(r => r.student_id === s.id);
          const totalMarks = sResults.reduce((sum, r) => sum + r.marks, 0);
          return { studentId: s.id, totalMarks };
        });
        setAllStudentResults(metrics);

      } catch (error: any) {
        console.error("Fetch error:", error);
        toast.error(error.message || "ফলাফল লোড করতে সমস্যা হয়েছে।");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, studentId, examId, navigate]);

  const { totalMarks: calculatedTotalMarks, percentage, grade, rank, statusKey } = useMemo(() => 
    calculateResultMetrics(results, subjects, allStudentResults), 
    [results, subjects, allStudentResults]
  );

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const exportToPDF = async () => {
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
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
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

      pdf.save(`Result_${student?.name}.pdf`);
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
      const fileName = `Result_${student?.name}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t.title,
          text: `${student?.name} - ${t.title}`,
        });
      } else {
        const shareUrl = window.location.href;
        const shareText = `${student?.name} এর মার্কশিট।`;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#0F5C7A]/20 border-t-[#0F5C7A] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-[#0F5C7A] transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            ফিরে যান
          </button>
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
            <div className="flex flex-wrap items-end gap-2">
              <button onClick={handlePrint} disabled={isExporting} className="btn-secondary h-9 px-3" title={t.print}>
                  <Printer className="w-4 h-4" />
              </button>
              <button onClick={exportToPDF} disabled={isExporting} className="btn-secondary h-9 px-3" title="PDF">
                  <Download className="w-4 h-4" />
              </button>
              <button onClick={handleShare} disabled={isExporting} className="btn-secondary h-9 px-3" title={t.share}>
                  <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {results.length > 0 && student && (
          <div className="w-full overflow-x-auto pb-4">
            <div 
              id="marksheet-container" 
              className={`card-premium print:shadow-none print:border-none print:p-0 bg-white border-4 border-[#0F5C7A] rounded-2xl ${marksheetLanguage === 'ar' ? 'rtl' : 'ltr'} ${fontStyle === 'modern' ? 'font-modern' : 'font-classic'}`}
              dir={marksheetLanguage === 'ar' ? 'rtl' : 'ltr'}
            >
            <div className="text-center mb-8 border-b-4 border-[#0F5C7A] pb-6">
              <h1 className="text-4xl font-bold text-[#0F5C7A] mb-2">{orgName}</h1>
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">
                {exam?.name} পরীক্ষার ফলাফল
              </h2>
              <p className="text-slate-600 font-medium">
                {t.academicYear}: {academicYear?.year_name} 
                ({academicYear?.hijri_year})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8 text-slate-800">
              <div className="space-y-2">
                <p><span className="font-semibold w-32 inline-block">{t.studentName}:</span> {student.name}</p>
                <p><span className="font-semibold w-32 inline-block">{t.class}:</span> {cls?.name}</p>
                <p><span className="font-semibold w-32 inline-block">{t.roll}:</span> {convertNumber(student.roll, numeralFormat)}</p>
              </div>
              <div className="space-y-2">
                <p><span className="font-semibold w-32 inline-block">{t.fatherName}:</span> {student.fatherName || "N/A"}</p>
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
                  {subjects.map((subject) => {
                    const result = results.find(r => r.subject_id === subject.id);
                    const isFail = !result || result.marks < subject.passMarks;
                    
                    return (
                      <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                        <td className={`p-4 text-slate-800 font-medium border border-slate-300 ${marksheetLanguage === 'ar' ? 'text-right' : 'text-left'}`}>{subject.name}</td>
                        <td className="p-4 text-slate-600 text-center border border-slate-300">{convertNumber(subject.fullMarks, numeralFormat)}</td>
                        <td className="p-4 text-slate-600 text-center border border-slate-300">{convertNumber(subject.passMarks, numeralFormat)}</td>
                        <td className={`p-4 text-center font-bold border border-slate-300 ${isFail ? 'text-[#EF4444]' : 'text-slate-800'}`}>
                          {result ? convertNumber(result.marks, numeralFormat) : "-"}
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
            
            <div className="text-center text-slate-400 text-xs italic mt-8">
              * এটি একটি অনলাইন কপি। মূল মার্কশিটের জন্য মাদরাসা অফিসে যোগাযোগ করুন।
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicResultView;
