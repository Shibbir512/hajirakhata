import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Result, Student, Subject, Exam, AcademicYear, ClassData } from "../types";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import { Printer, Download, ArrowLeft, GraduationCap, Calendar, Trophy, Medal } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const PublicClassResult: React.FC = () => {
  const { orgId, classId, examId } = useParams<{ orgId: string; classId: string; examId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [academicYear, setAcademicYear] = useState<AcademicYear | null>(null);
  const [cls, setCls] = useState<ClassData | null>(null);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId || !classId || !examId) return;
      setLoading(true);
      try {
        // 1. Fetch Org Info
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if (orgSnap.exists()) setOrgName(orgSnap.data().name);

        // 2. Fetch Students in class
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const studentsSnap = await getDocs(query(studentsRef, where("classId", "==", classId), where("isActive", "==", true)));
        const loadedStudents = studentsSnap.docs.map(doc => doc.data() as Student);
        setStudents(loadedStudents);

        // 3. Fetch Results (only published)
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const resultQuery = query(
          resultsRef,
          where("class_id", "==", classId),
          where("exam_id", "==", examId),
          where("status", "==", "published")
        );
        const resultSnap = await getDocs(resultQuery);
        const loadedResults = resultSnap.docs.map(doc => doc.data() as Result);
        setAllResults(loadedResults);

        if (loadedResults.length === 0) {
          toast.error("এই পরীক্ষার কোনো ফলাফল এখনো প্রকাশিত হয়নি।");
          navigate("/result-search");
          return;
        }

        const yearId = loadedResults[0].academic_year_id;

        // 4. Fetch Subjects for the class
        const subjectsRef = collection(db, `organizations/${orgId}/subjects`);
        const subjectsSnap = await getDocs(query(subjectsRef, where("classId", "==", classId)));
        setSubjects(subjectsSnap.docs.map(doc => doc.data() as Subject));

        // 5. Fetch Exam, Year, Class
        const [examSnap, yearSnap, classSnap] = await Promise.all([
          getDoc(doc(db, `organizations/${orgId}/exams`, examId)),
          getDoc(doc(db, `organizations/${orgId}/academic_years`, yearId)),
          getDoc(doc(db, `organizations/${orgId}/classes`, classId))
        ]);

        if (examSnap.exists()) setExam(examSnap.data() as Exam);
        if (yearSnap.exists()) setAcademicYear(yearSnap.data() as AcademicYear);
        if (classSnap.exists()) setCls(classSnap.data() as ClassData);

      } catch (error: any) {
        console.error("Fetch error:", error);
        toast.error("তথ্য লোড করতে সমস্যা হয়েছে।");
        navigate("/result-search");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, classId, examId, navigate]);

  const meritList = useMemo(() => {
    // Calculate metrics for each student to build allStudentMetrics
    const allStudentMetrics = students.map(s => {
      const sResults = allResults.filter(r => r.student_id === s.id);
      let totalMarks = 0;
      let hasFailed = false;

      subjects.forEach(subject => {
        const result = sResults.find(r => r.subject_id === subject.id);
        const marks = result ? result.marks : 0;
        totalMarks += marks;
        if (marks < subject.passMarks) hasFailed = true;
      });

      return { studentId: s.id, totalMarks, hasFailed };
    });

    return students.map(student => {
      const studentResults = allResults.filter(r => r.student_id === student.id);
      const metrics = calculateResultMetrics(studentResults, subjects, allStudentMetrics);
      return {
        ...student,
        ...metrics,
        rankNum: metrics.rank === "-" ? 9999 : parseInt(metrics.rank)
      };
    }).sort((a, b) => a.rankNum - b.rankNum);
  }, [students, allResults, subjects]);

  const handlePrint = () => {
    window.print();
  };

  const exportToPDF = async () => {
    const input = document.getElementById('merit-list-container');
    if (!input) return;

    const toastId = toast.loading("PDF তৈরি হচ্ছে...");
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Handle multiple pages if needed
      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`MeritList_${cls?.name}_${exam?.name}.pdf`);
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
      <div className="max-w-5xl mx-auto">
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

        <div id="merit-list-container" className="card-premium p-8 bg-white shadow-xl border border-slate-100">
          <div className="text-center mb-10 border-b-2 border-slate-100 pb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{orgName}</h1>
            <p className="text-slate-600 mb-4">মেধা তালিকা (Merit List)</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-[#0F5C7A]">
              <span className="px-4 py-1.5 bg-[#0F5C7A]/5 rounded-full border border-[#0F5C7A]/10 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                জামাত: {cls?.name}
              </span>
              <span className="px-4 py-1.5 bg-[#0F5C7A]/5 rounded-full border border-[#0F5C7A]/10 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                শিক্ষাবর্ষ: {academicYear?.year_name}
              </span>
              <span className="px-4 py-1.5 bg-[#0F5C7A]/5 rounded-full border border-[#0F5C7A]/10 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                পরীক্ষা: {exam?.name}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700 text-center w-16">স্থান</th>
                  <th className="p-4 font-bold text-slate-700 text-center w-20">রোল</th>
                  <th className="p-4 font-bold text-slate-700">শিক্ষার্থীর নাম</th>
                  <th className="p-4 font-bold text-slate-700 text-center">মোট নম্বর</th>
                  <th className="p-4 font-bold text-slate-700 text-center">শতকরা</th>
                  <th className="p-4 font-bold text-slate-700 text-center">গ্রেড</th>
                  <th className="p-4 font-bold text-slate-700 text-center">ফলাফল</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meritList.map((student) => {
                  const isTop3 = student.rankNum <= 3;
                  return (
                    <tr key={student.id} className={`hover:bg-slate-50/50 transition-colors ${isTop3 ? 'bg-amber-50/20' : ''}`}>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {student.rankNum === 1 ? (
                            <Medal className="w-6 h-6 text-yellow-500" />
                          ) : student.rankNum === 2 ? (
                            <Medal className="w-6 h-6 text-slate-400" />
                          ) : student.rankNum === 3 ? (
                            <Medal className="w-6 h-6 text-amber-600" />
                          ) : (
                            <span className="font-bold text-slate-500">{student.rank === "-" ? "-" : convertNumber(student.rank, 'bn')}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center font-medium text-slate-600">
                        {convertNumber(student.roll, 'bn')}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.fatherName}</p>
                      </td>
                      <td className="p-4 text-center font-bold text-[#0F5C7A]">
                        {convertNumber(student.totalMarks, 'bn')}
                      </td>
                      <td className="p-4 text-center text-slate-600">
                        {convertNumber(student.percentage, 'bn')}%
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700">
                        {student.grade}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${student.statusKey === 'pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {student.statusKey === 'pass' ? 'কৃতকার্য' : 'অকৃতকার্য'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center print:hidden">
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-sm text-emerald-600 font-bold mb-1">মোট পরীক্ষার্থী</p>
              <p className="text-3xl font-black text-emerald-700">{convertNumber(students.length, 'bn')}</p>
            </div>
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-sm text-blue-600 font-bold mb-1">কৃতকার্য</p>
              <p className="text-3xl font-black text-blue-700">{convertNumber(meritList.filter(s => s.statusKey === 'pass').length, 'bn')}</p>
            </div>
            <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
              <p className="text-sm text-rose-600 font-bold mb-1">অকৃতকার্য</p>
              <p className="text-3xl font-black text-rose-700">{convertNumber(meritList.filter(s => s.statusKey === 'fail').length, 'bn')}</p>
            </div>
          </div>

          <div className="mt-12 text-center text-slate-400 text-xs italic">
            * এটি একটি অনলাইন মেধা তালিকা। বিস্তারিত তথ্যের জন্য মাদরাসা অফিসে যোগাযোগ করুন।
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicClassResult;
