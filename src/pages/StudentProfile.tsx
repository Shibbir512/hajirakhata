import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { useExams } from "../hooks/useExams";
import { useSubjects } from "../hooks/useSubjects";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { User, BookOpen, Calendar, ArrowLeft } from "lucide-react";
import { Student, Result, Subject } from "../types";
import { calculateResultMetrics } from "../utils/resultCalculations";
import toast from "react-hot-toast";

const StudentProfile: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { academicYears } = useAcademicYears(orgId, user);
  const { exams } = useExams(orgId, user);
  const { subjects } = useSubjects(orgId, user);

  const [student, setStudent] = useState<Student | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!orgId || !studentId) return;
      setLoading(true);
      try {
        // Fetch student info
        const studentRef = doc(db, `organizations/${orgId}/students`, studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          setStudent(studentSnap.data() as Student);
        } else {
          toast.error("শিক্ষার্থী খুঁজে পাওয়া যায়নি।");
          navigate("/students");
          return;
        }

        // Fetch all results for this student
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const q = query(resultsRef, where("student_id", "==", studentId));
        const snapshot = await getDocs(q);
        const loadedResults = snapshot.docs.map(doc => doc.data() as Result);
        setResults(loadedResults);
      } catch (error) {
        console.error("Error fetching student data:", error);
        toast.error("তথ্য লোড করতে ব্যর্থ হয়েছে।");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [orgId, studentId, navigate]);

  const academicHistory = useMemo(() => {
    if (!student || results.length === 0) return [];

    // Group results by academic year and exam
    const grouped = results.reduce((acc, result) => {
      const key = `${result.academic_year_id}-${result.exam_id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(result);
      return acc;
    }, {} as { [key: string]: Result[] });

    const history = Object.entries(grouped).map(([key, examResults]) => {
      const [ayId, examId] = key.split("-");
      const ay = academicYears.find(a => a.id === ayId);
      const exam = exams.find(e => e.id === examId);
      const classData = classes.find(c => c.id === examResults[0].class_id);
      
      const examSubjects = subjects.filter(s => s.classId === examResults[0].class_id);
      
      // For rank, we'd ideally need all results for that exam, but here we just show metrics
      const { totalMarks, percentage, grade } = calculateResultMetrics(examResults, examSubjects);

      return {
        academicYear: ay?.year_name || "N/A",
        exam: exam?.name || "N/A",
        class: classData?.name || "N/A",
        totalMarks,
        percentage,
        grade,
        academicYearId: ayId
      };
    });

    // Sort by academic year (assuming year_name can be sorted or we use ID)
    return history.sort((a, b) => b.academicYear.localeCompare(a.academicYear));
  }, [student, results, academicYears, exams, classes, subjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">শিক্ষার্থীর প্রোফাইল</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Info Card */}
        <div className="card-premium p-6 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
            <p className="text-indigo-600 font-mono text-sm font-bold mt-1">ID: {student.studentUid || "N/A"}</p>
            <p className="text-slate-500 text-sm">রোল: {student.roll}</p>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">শ্রেণি:</span>
              <span className="font-medium text-slate-800">
                {classes.find(c => c.id === student.classId)?.name || "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">পিতার নাম:</span>
              <span className="font-medium text-slate-800">{student.fatherName || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ফোন:</span>
              <span className="font-medium text-slate-800">{student.phone || "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ঠিকানা:</span>
              <span className="font-medium text-slate-800 text-right">{student.address || "-"}</span>
            </div>
          </div>
        </div>

        {/* Academic History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-premium p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              একাডেমিক ইতিহাস
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase border-b">শিক্ষাবর্ষ</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase border-b">পরীক্ষা</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase border-b">শ্রেণি</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase border-b text-center">মোট নম্বর</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase border-b text-center">শতকরা</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase border-b text-center">গ্রেড</th>
                  </tr>
                </thead>
                <tbody>
                  {academicHistory.length > 0 ? (
                    academicHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 text-sm text-slate-700 border-b">{item.academicYear}</td>
                        <td className="py-4 px-4 text-sm text-slate-700 border-b">{item.exam}</td>
                        <td className="py-4 px-4 text-sm text-slate-700 border-b">{item.class}</td>
                        <td className="py-4 px-4 text-sm text-slate-700 border-b text-center font-medium">{item.totalMarks}</td>
                        <td className="py-4 px-4 text-sm text-slate-700 border-b text-center">{item.percentage}%</td>
                        <td className="py-4 px-4 text-sm font-bold text-indigo-600 border-b text-center">{item.grade}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        কোন ফলাফল পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
