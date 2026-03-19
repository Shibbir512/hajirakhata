import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { useExams } from "../hooks/useExams";
import { useSubjects } from "../hooks/useSubjects";
import { useStudents } from "../hooks/useStudents";
import StudentEditModal from "../components/StudentEditModal";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { User, BookOpen, Calendar, ArrowLeft, CheckCircle, XCircle, Award, ArrowUpDown, Pencil } from "lucide-react";
import { Student, Result, Subject, AttendanceStatus } from "../types";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { toBengaliNumber } from "../utils/dateFormatter";
import toast from "react-hot-toast";

const StudentProfile: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { academicYears } = useAcademicYears(orgId, user);
  const { exams } = useExams(orgId, user);
  const { subjects } = useSubjects(orgId, user);
  const { updateStudent } = useStudents(orgId, user, role);

  const [student, setStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0 });
  const [lastExamRank, setLastExamRank] = useState<string>("-");
  const [lastExamGrade, setLastExamGrade] = useState<string>("-");
  const [loading, setLoading] = useState(true);
  const [historyRanks, setHistoryRanks] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const fetchStudentAndAttendance = async () => {
      if (!orgId || !studentId) return;
      try {
        // Fetch student info
        const studentRef = doc(db, `organizations/${orgId}/students`, studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          setStudent(studentSnap.data() as Student);
          
          // Fetch attendance stats
          const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
          const attendanceQuery = query(sessionsRef, where("classId", "==", studentSnap.data()?.classId));
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          let presentCount = 0;
          let absentCount = 0;
          
          attendanceSnapshot.docs.forEach(doc => {
            const session = doc.data();
            const studentRecord = session.students?.find((s: any) => s.studentId === studentId);
            if (studentRecord) {
              if (studentRecord.status === AttendanceStatus.Present) presentCount++;
              else if (studentRecord.status === AttendanceStatus.Absent) absentCount++;
            }
          });
          setAttendanceStats({ present: presentCount, absent: absentCount });
        } else {
          toast.error("শিক্ষার্থী খুঁজে পাওয়া যায়নি।");
          navigate("/students");
        }
      } catch (error) {
        console.error("Error fetching student/attendance:", error);
      }
    };

    fetchStudentAndAttendance();
  }, [orgId, studentId, navigate]);

  // Real-time results listener
  useEffect(() => {
    if (!orgId || !studentId) return;

    const resultsRef = collection(db, `organizations/${orgId}/results`);
    let q = query(resultsRef, where("student_id", "==", studentId));
    
    if (role !== 'admin' && role !== 'teacher') {
      q = query(q, where("status", "==", "published"));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const loadedResults = snapshot.docs.map(doc => doc.data() as Result);
      setResults(loadedResults);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to results:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [orgId, studentId, role]);

  // Rank calculation effect
  useEffect(() => {
    const calculateRank = async () => {
      if (!orgId || !studentId || results.length === 0 || subjects.length === 0) {
        setLastExamRank("-");
        setLastExamGrade("-");
        return;
      }

      try {
        // Find the latest result to identify the latest exam
        const sortedResults = [...results].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        const latestResult = sortedResults[0];
        
        if (!latestResult) {
          setLastExamRank("-");
          setLastExamGrade("-");
          return;
        }

        const latestExamId = latestResult.exam_id;
        const latestClassId = latestResult.class_id;

        const resultsRef = collection(db, `organizations/${orgId}/results`);
        let allResultsQuery = query(
          resultsRef, 
          where("exam_id", "==", latestExamId),
          where("class_id", "==", latestClassId)
        );
        
        if (role !== 'admin' && role !== 'teacher') {
          allResultsQuery = query(allResultsQuery, where("status", "==", "published"));
        }
        
        const allResultsSnapshot = await getDocs(allResultsQuery);
        const allResults = allResultsSnapshot.docs.map(doc => doc.data() as Result);

        // Group by student
        const studentTotals = allResults.reduce((acc, r) => {
          if (!acc[r.student_id]) acc[r.student_id] = 0;
          acc[r.student_id] += r.marks;
          return acc;
        }, {} as { [key: string]: number });

        const examSubjects = subjects.filter(s => s.classId === latestClassId);
        const studentResults = results.filter(r => r.exam_id === latestExamId);
        
        const allStudentMetrics = Object.entries(studentTotals).map(([sId, total]) => ({
          studentId: sId,
          totalMarks: total,
          hasFailed: false // Simplified for rank calculation
        }));

        const { grade, rank } = calculateResultMetrics(studentResults, examSubjects, allStudentMetrics);
        setLastExamGrade(grade);
        setLastExamRank(rank);
      } catch (error) {
        console.error("Error calculating rank:", error);
      }
    };

    calculateRank();
  }, [orgId, studentId, results, subjects, role]);

  useEffect(() => {
    const fetchHistoryRanks = async () => {
      if (!orgId || results.length === 0) return;
      
      const grouped = results.reduce((acc, result) => {
        const key = `${result.academic_year_id}_${result.exam_id}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(result);
        return acc;
      }, {} as { [key: string]: Result[] });

      const newRanks: {[key: string]: string} = {};

      for (const [key, groupResults] of Object.entries(grouped)) {
        const [yearId, examId] = key.split('_');
        const classId = groupResults[0].class_id;
        
        try {
          const resultsRef = collection(db, `organizations/${orgId}/results`);
          let q = query(
            resultsRef,
            where("academic_year_id", "==", yearId),
            where("exam_id", "==", examId),
            where("class_id", "==", classId)
          );
          
          if (role !== 'admin' && role !== 'teacher') {
            q = query(q, where("status", "==", "published"));
          }
          
          const snapshot = await getDocs(q);
          const allResults = snapshot.docs.map(doc => doc.data() as Result);
          
          const studentTotals: { [key: string]: number } = {};
          allResults.forEach(r => {
            studentTotals[r.student_id] = (studentTotals[r.student_id] || 0) + r.marks;
          });
          
          const allStudentMetrics = Object.entries(studentTotals).map(([sId, total]) => ({
            studentId: sId,
            totalMarks: total,
            hasFailed: false
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
  }, [orgId, results, subjects, role]);

  const academicHistory = useMemo(() => {
    if (!student || results.length === 0) return [];

    // Group results by academic year and exam
    const grouped = results.reduce((acc, result) => {
      const key = `${result.academic_year_id}_${result.exam_id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(result);
      return acc;
    }, {} as { [key: string]: Result[] });

    const history = Object.entries(grouped).map(([key, examResults]) => {
      const [ayId, examId] = key.split("_");
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
        rank: historyRanks[key] ? toBengaliNumber(historyRanks[key]) : "-",
        academicYearId: ayId
      };
    });

    // Sort by academic year (assuming year_name can be sorted or we use ID)
    return history.sort((a, b) => b.academicYear.localeCompare(a.academicYear));
  }, [student, results, academicYears, exams, classes, subjects, historyRanks]);

  const handleUpdateStudent = (data: Partial<Student>) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, data);
      setStudent(prev => prev ? { ...prev, ...data } : null);
      setEditingStudent(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F5C7A]"></div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link
            to="/students"
            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-100 rounded-full transition-colors shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">শিক্ষার্থীর প্রোফাইল</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info Card */}
          <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-[#E2E8F0] overflow-hidden">
            {/* Gradient Header */}
            <div className="h-32 bg-gradient-to-r from-[#0F766E] to-[#14B8A6]"></div>
            
            <div className="px-6 pb-6 -mt-12">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full bg-gradient-to-br from-[#0F766E] to-[#14B8A6] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center overflow-hidden mb-4">
                  {/* Inner glow */}
                  <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.15)]"></div>
                  
                  {/* Content */}
                  <User className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{student.name}</h3>
                {student.isActive === false && (
                  <span className="px-3 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-full mt-2">
                    আর্কাইভ করা
                  </span>
                )}
                <p className="text-[#0F766E] font-mono text-sm font-bold mt-1">ID: {student.studentUid || "N/A"}</p>
                <p className="text-slate-500 text-sm">রোল: {toBengaliNumber(student.roll)}</p>
                <button
                  onClick={() => setEditingStudent(student)}
                  className="mt-4 p-2 bg-white/50 hover:bg-white/80 text-[#0F766E] rounded-full transition-colors shadow-sm"
                  aria-label="Edit Profile"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6">
                <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">উপস্থিত</p>
                  <p className="text-2xl font-bold text-emerald-700">{toBengaliNumber(attendanceStats.present)}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-2xl text-center border border-rose-100">
                  <p className="text-[10px] uppercase font-bold text-rose-600 mb-1">অনুপস্থিত</p>
                  <p className="text-2xl font-bold text-rose-700">{toBengaliNumber(attendanceStats.absent)}</p>
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm text-slate-500">শ্রেণি:</span>
                  <span className="font-bold text-slate-900">
                    {classes.find(c => c.id === student.classId)?.name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm text-slate-500">পিতার নাম:</span>
                  <span className="font-bold text-slate-900">{student.fatherName || "-"}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm text-slate-500">ফোন:</span>
                  <span className="font-bold text-slate-900">{student.phone || "-"}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm text-slate-500">ঠিকানা:</span>
                  <span className="font-bold text-slate-900 text-right">{student.address || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Academic History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#0F766E]" />
                একাডেমিক ইতিহাস
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100">
                      <th className="py-4 px-4 text-xs font-bold uppercase">শিক্ষাবর্ষ</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase">পরীক্ষা</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase">শ্রেণি</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase text-center">মোট নম্বর</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase text-center">শতকরা</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase text-center">বিভাগ</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase text-center">মেধাক্রম</th>
                    </tr>
                  </thead>
                  <tbody>
                    {academicHistory.length > 0 ? (
                      academicHistory.map((item, idx) => (
                        <tr key={`${item.academicYear}-${item.exam}-${item.class}`} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                          <td className="py-4 px-4 text-sm font-medium text-slate-900">{item.academicYear}</td>
                          <td className="py-4 px-4 text-sm text-slate-700">{item.exam}</td>
                          <td className="py-4 px-4 text-sm text-slate-700">{item.class}</td>
                          <td className="py-4 px-4 text-sm text-slate-900 text-center font-bold">{toBengaliNumber(item.totalMarks)}</td>
                          <td className="py-4 px-4 text-sm text-slate-700 text-center">{toBengaliNumber(item.percentage)}%</td>
                          <td className="py-4 px-4 text-sm font-bold text-[#0F766E] text-center">{item.grade}</td>
                          <td className="py-4 px-4 text-sm font-bold text-[#0F766E] text-center">{item.rank}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
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
        {editingStudent && (
          <StudentEditModal
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onSave={handleUpdateStudent}
          />
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
