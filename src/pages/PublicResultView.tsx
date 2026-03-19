import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Result, Student, Subject, Exam, AcademicYear, ClassData } from "../types";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import { Printer, Download, Share2, ArrowLeft, GraduationCap, Calendar, FileBadge } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PublicResultView: React.FC = () => {
  const { orgId, studentId, examId } = useParams<{ orgId: string; studentId: string; examId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [cls, setCls] = useState<ClassData | null>(null);
  const [allStudentResults, setAllStudentResults] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId || !studentId || !examId) return;
      setLoading(true);
      try {
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
        navigate("/result-search");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, studentId, examId, navigate]);

  const { totalMarks, totalFullMarks, percentage, grade, rank, statusKey } = useMemo(() => 
    calculateResultMetrics(results, subjects, allStudentResults), 
    [results, subjects, allStudentResults]
  );

  const handlePrint = () => {
    window.print();
  };

  const exportToPDF = async () => {
    const input = document.getElementById('public-marksheet-container');
    if (!input) return;

    const toastId = toast.loading("PDF তৈরি হচ্ছে...");
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`Result_${student?.name}.pdf`);
      toast.success("PDF ডাউনলোড সফল হয়েছে!", { id: toastId });
    } catch (error) {
      toast.error("PDF তৈরি করতে ব্যর্থ হয়েছে।", { id: toastId });
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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button 
            onClick={() => navigate("/result-search")}
            className="flex items-center gap-2 text-slate-600 hover:text-[#0F5C7A] transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            ফিরে যান
          </button>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-secondary px-4 py-2">
              <Printer className="w-4 h-4" />
              প্রিন্ট
            </button>
            <button onClick={exportToPDF} className="btn-primary px-4 py-2">
              <Download className="w-4 h-4" />
              ডাউনলোড
            </button>
          </div>
        </div>

        <div id="public-marksheet-container" className="card-premium p-8 bg-white shadow-xl border border-slate-100">
          <div className="text-center mb-10 border-b-2 border-slate-100 pb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">আমানত ইসলামিক স্কুল</h1>
            <p className="text-slate-600 mb-4">দত্তপাড়া, নরসিংদী সদর, নরসিংদী</p>
            <div className="inline-block px-6 py-2 bg-[#0F5C7A]/5 rounded-2xl border border-[#0F5C7A]/10">
              <h2 className="text-xl font-bold text-[#0F5C7A]">{exam?.name} পরীক্ষার ফলাফল</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <FileBadge className="w-5 h-5 text-[#0F5C7A]" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">শিক্ষার্থীর নাম</p>
                  <p className="font-bold text-slate-800">{student?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-5 h-5 text-[#0F5C7A]" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">জামাত/শ্রেণি</p>
                  <p className="font-bold text-slate-800">{cls?.name}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Calendar className="w-5 h-5 text-[#0F5C7A]" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">শিক্ষাবর্ষ</p>
                  <p className="font-bold text-slate-800">{academicYear?.year_name} ({academicYear?.hijri_year})</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <FileBadge className="w-5 h-5 text-[#0F5C7A]" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">রোল নম্বর</p>
                  <p className="font-bold text-slate-800">{convertNumber(student?.roll || 0, 'bn')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-2xl mb-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700">বিষয়</th>
                  <th className="p-4 font-bold text-slate-700 text-center">পূর্ণমান</th>
                  <th className="p-4 font-bold text-slate-700 text-center">প্রাপ্ত নম্বর</th>
                  <th className="p-4 font-bold text-slate-700 text-center">বিভাগ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((subject) => {
                  const result = results.find(r => r.subject_id === subject.id);
                  const marks = result?.marks || 0;
                  const isFail = marks < subject.passMarks;
                  
                  return (
                    <tr key={subject.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-slate-800 font-medium">{subject.name}</td>
                      <td className="p-4 text-slate-600 text-center">{convertNumber(subject.fullMarks, 'bn')}</td>
                      <td className={`p-4 text-center font-bold ${isFail ? 'text-rose-600' : 'text-slate-800'}`}>
                        {convertNumber(marks, 'bn')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isFail ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {isFail ? 'F' : 'A+'} {/* Simplified grade for public view */}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <tr>
                  <td className="p-4 text-slate-800">সর্বমোট:</td>
                  <td className="p-4 text-center text-slate-800">{convertNumber(totalFullMarks, 'bn')}</td>
                  <td className="p-4 text-center text-[#0F5C7A] text-xl">{convertNumber(totalMarks, 'bn')}</td>
                  <td className="p-4 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-sm ${statusKey === 'pass' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {statusKey === 'pass' ? 'কৃতকার্য' : 'অকৃতকার্য'} ({grade})
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-xs text-slate-500 font-medium mb-1">শতকরা হার</p>
              <p className="text-xl font-bold text-slate-800">{convertNumber(percentage, 'bn')}%</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-xs text-slate-500 font-medium mb-1">মেধা স্থান</p>
              <p className="text-xl font-bold text-[#0F5C7A]">{convertNumber(rank, 'bn')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-xs text-slate-500 font-medium mb-1">মোট বিভাগ</p>
              <p className="text-xl font-bold text-slate-800">{grade}</p>
            </div>
          </div>

          <div className="text-center text-slate-400 text-xs italic">
            * এটি একটি অনলাইন কপি। মূল মার্কশিটের জন্য মাদরাসা অফিসে যোগাযোগ করুন।
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicResultView;
