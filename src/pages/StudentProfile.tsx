import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { useExams } from "../hooks/useExams";
import { useSubjects } from "../hooks/useSubjects";
import { useStudents } from "../hooks/useStudents";
import StudentEditModal from "../components/StudentEditModal";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { User, BookOpen, ArrowLeft, Pencil, Phone, MapPin, GraduationCap, Award } from "lucide-react";
import { Student, Result, AttendanceStatus } from "../types";
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
  const [loading, setLoading] = useState(true);
  const [historyRanks, setHistoryRanks] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const fetchStudentAndAttendance = async () => {
      if (!orgId || !studentId) return;
      try {
        const studentRef = doc(db, `organizations/${orgId}/students`, studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          setStudent(studentSnap.data() as Student);
          
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-4 md:p-8 text-slate-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-6"
      >
        <div className="flex items-center gap-4 mb-2">
          <Link
            to="/students"
            className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all duration-300 border border-white/10"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-white">শিক্ষার্থীর প্রোফাইল</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="lg:col-span-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">{student.name}</h3>
              <p className="text-teal-400 font-mono text-sm font-bold mt-1">ID: {student.studentUid || "N/A"}</p>
              <p className="text-slate-400 text-sm">রোল: {toBengaliNumber(student.roll)}</p>
              
              <button
                onClick={() => setEditingStudent(student)}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" /> প্রোফাইল এডিট
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                <p className="text-[10px] uppercase font-bold text-emerald-400 mb-1">উপস্থিত</p>
                <p className="text-2xl font-bold text-white">{toBengaliNumber(attendanceStats.present)}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl text-center border border-white/5">
                <p className="text-[10px] uppercase font-bold text-rose-400 mb-1">অনুপস্থিত</p>
                <p className="text-2xl font-bold text-white">{toBengaliNumber(attendanceStats.absent)}</p>
              </div>
            </div>

            <div className="space-y-3 pt-6">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm text-slate-400 flex items-center gap-2"><GraduationCap className="w-4 h-4"/> শ্রেণি:</span>
                <span className="font-bold text-white">{classes.find(c => c.id === student.classId)?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm text-slate-400 flex items-center gap-2"><User className="w-4 h-4"/> পিতা:</span>
                <span className="font-bold text-white">{student.fatherName || "-"}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm text-slate-400 flex items-center gap-2"><Phone className="w-4 h-4"/> ফোন:</span>
                <span className="font-bold text-white">{student.phone || "-"}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-sm text-slate-400 flex items-center gap-2"><MapPin className="w-4 h-4"/> ঠিকানা:</span>
                <span className="font-bold text-white text-right">{student.address || "-"}</span>
              </div>
            </div>
          </motion.div>

          {/* Academic History */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-teal-400" />
              একাডেমিক ইতিহাস
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="py-4 px-4 text-xs font-bold uppercase">শিক্ষাবর্ষ</th>
                    <th className="py-4 px-4 text-xs font-bold uppercase">পরীক্ষা</th>
                    <th className="py-4 px-4 text-xs font-bold uppercase text-center">নম্বর</th>
                    <th className="py-4 px-4 text-xs font-bold uppercase text-center">বিভাগ</th>
                    <th className="py-4 px-4 text-xs font-bold uppercase text-center">মেধা</th>
                  </tr>
                </thead>
                <tbody>
                  {academicHistory.length > 0 ? (
                    academicHistory.map((item, idx) => (
                      <tr key={`${item.academicYear}-${item.exam}-${item.class}`} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                        <td className="py-4 px-4 text-sm font-medium text-white">{item.academicYear}</td>
                        <td className="py-4 px-4 text-sm text-slate-300">{item.exam}</td>
                        <td className="py-4 px-4 text-sm text-white text-center font-bold">{toBengaliNumber(item.totalMarks)}</td>
                        <td className="py-4 px-4 text-sm font-bold text-teal-400 text-center">{item.grade}</td>
                        <td className="py-4 px-4 text-sm font-bold text-teal-400 text-center">{item.rank}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                        কোন ফলাফল পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
        
        {editingStudent && (
          <StudentEditModal
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onSave={handleUpdateStudent}
          />
        )}
      </motion.div>
    </div>
  );
};

export default StudentProfile;
