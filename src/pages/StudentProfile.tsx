import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { useExams } from "../hooks/useExams";
import { useSubjects } from "../hooks/useSubjects";
import { useStudents } from "../hooks/useStudents";
import { useStudentAttendance } from "../hooks/useStudentAttendance";
import StudentEditModal from "../components/StudentEditModal";
import ImageModal from "../components/ImageModal";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { User, BookOpen, Calendar, ArrowLeft, CheckCircle, XCircle, Award, ArrowUpDown, Pencil } from "lucide-react";
import { Student, Result, Subject, AttendanceStatus } from "../types";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { toBengaliNumber, formatAcademicYear } from "../utils/dateFormatter";
import toast from "react-hot-toast";
import { clsx } from "clsx";

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
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0 });
  const [allAttendanceSessions, setAllAttendanceSessions] = useState<any[]>([]);
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
          const studentData = studentSnap.data() as Student;
          setStudent(studentData);
          
          // Fetch all attendance sessions for the class
          const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
          const attendanceQuery = query(sessionsRef, where("classId", "==", studentData.classId));
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          let presentCount = 0;
          let absentCount = 0;
          const sessions: any[] = [];
          
          attendanceSnapshot.docs.forEach(doc => {
            const session = doc.data();
            sessions.push({ id: doc.id, ...session });
            const studentRecord = session.students?.find((s: any) => s.studentId === studentId);
            if (studentRecord) {
              if (studentRecord.status === AttendanceStatus.Present) presentCount++;
              else if (studentRecord.status === AttendanceStatus.Absent) absentCount++;
            }
          });
          setAttendanceStats({ present: presentCount, absent: absentCount });
          setAllAttendanceSessions(sessions);
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
        academicYear: formatAcademicYear(ay),
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

  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);
  const [attendanceSortOrder, setAttendanceSortOrder] = useState<'asc' | 'desc'>('desc');

  const studentAttendance = useStudentAttendance(studentId || "", allAttendanceSessions);
  
  const sortedAttendance = useMemo(() => {
    const parseDateString = (dateStr: string) => {
      if (!dateStr) return 0;
      const parts = dateStr.split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day).getTime();
      }
      return new Date(dateStr).getTime() || 0;
    };

    return [...studentAttendance].sort((a, b) => {
      const dateA = parseDateString(a.date);
      const dateB = parseDateString(b.date);
      return attendanceSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [studentAttendance, attendanceSortOrder]);

  const handleUpdateStudent = (data: Partial<Student>) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, data);
      setStudent(prev => prev ? { ...prev, ...data } : null);
      setEditingStudent(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
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
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0F9D8A] to-[#3B82F6] pt-8 pb-24 px-4 rounded-b-[32px] shadow-lg relative z-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to="/students"
            className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full transition-all text-white shadow-sm active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-semibold text-white tracking-wide">শিক্ষার্থীর প্রোফাইল</h2>
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/20">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left Column: Profile & Stats & Info */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Card (Hero Section) */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden relative">
              {/* Top gradient header inside card */}
              <div className="h-24 bg-gradient-to-br from-[#0F9D8A]/10 to-[#3B82F6]/10 relative">
                {/* Glass effect overlay */}
                <div className="absolute inset-0 bg-white/30 backdrop-blur-sm"></div>
              </div>
              
              <div className="px-6 pb-8 -mt-12 relative flex flex-col items-center text-center">
                <div 
                  onClick={() => student.photoUrl && setIsImageModalOpen(true)}
                  className={clsx(
                    "relative w-24 h-24 rounded-full bg-white shadow-[0_8px_24px_rgba(15,157,138,0.15)] flex items-center justify-center overflow-hidden mb-4 border-4 border-white",
                    student.photoUrl && "cursor-pointer hover:scale-105 transition-transform"
                  )}
                >
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-12 h-12 text-[#0F9D8A]" />
                  )}
                </div>
                
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{student.name}</h3>
                
                {student.isActive === false && (
                  <span className="px-3 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-full mt-2 shadow-sm">
                    আর্কাইভ করা
                  </span>
                )}
                
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <span className="text-slate-500 font-medium">ID: <span className="text-[#3B82F6] font-mono font-bold">{student.studentUid || "N/A"}</span></span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-slate-500 font-medium">রোল: <span className="text-slate-700 font-bold">{toBengaliNumber(student.roll)}</span></span>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => setEditingStudent(student)}
                  className="absolute top-6 right-6 w-12 h-12 bg-gradient-to-br from-[#0F9D8A] to-[#22C55E] text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_12px_25px_rgba(34,197,94,0.4)] transition-all active:scale-95"
                  aria-label="Edit Profile"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            {/* Stats Section */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform duration-300 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#22C55E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="w-12 h-12 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0 shadow-inner">
                  <CheckCircle className="w-6 h-6 text-[#22C55E]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">উপস্থিত</p>
                  <p className="text-2xl font-bold text-slate-800">{toBengaliNumber(attendanceStats.present)}</p>
                </div>
              </div>

              <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 hover:-translate-y-1 transition-transform duration-300 flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#EF4444]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 flex items-center justify-center shrink-0 shadow-inner">
                  <XCircle className="w-6 h-6 text-[#EF4444]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-0.5">অনুপস্থিত</p>
                  <p className="text-2xl font-bold text-slate-800">{toBengaliNumber(attendanceStats.absent)}</p>
                </div>
              </div>
            </motion.div>

            {/* Info Section */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex items-center gap-2 px-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">ব্যক্তিগত তথ্য</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="bg-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] transition-shadow">
                  <p className="text-xs text-slate-400 font-medium mb-1">শিক্ষাবর্ষ</p>
                  <p className="font-bold text-slate-800">{formatAcademicYear(academicYears.find(ay => ay.is_active))}</p>
                </div>

                <div className="bg-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] transition-shadow">
                  <p className="text-xs text-slate-400 font-medium mb-1">শ্রেণি</p>
                  <p className="font-bold text-slate-800">{classes.find(c => c.id === student.classId)?.name || "N/A"}</p>
                </div>
                
                <div className="bg-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] transition-shadow">
                  <p className="text-xs text-slate-400 font-medium mb-1">পিতার নাম</p>
                  <p className="font-bold text-slate-800">{student.fatherName || "-"}</p>
                </div>
                
                <div className="bg-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] transition-shadow">
                  <p className="text-xs text-slate-400 font-medium mb-1">ফোন</p>
                  <p className="font-bold text-slate-800">
                    {student.phone ? (
                      <a href={`tel:${student.phone}`} className="hover:text-[#3B82F6] transition-colors">{student.phone}</a>
                    ) : "-"}
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] transition-shadow">
                  <p className="text-xs text-slate-400 font-medium mb-1">রক্তের গ্রুপ</p>
                  <p className="font-bold text-slate-800">{student.bloodGroup || "-"}</p>
                </div>
                
                <div className="bg-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] transition-shadow">
                  <p className="text-xs text-slate-400 font-medium mb-1">ঠিকানা</p>
                  <p className="font-bold text-slate-800">{student.address || "-"}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Academic History */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="flex items-center gap-2 px-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#0F9D8A]" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">একাডেমিক ইতিহাস</h4>
            </div>

            <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                      <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider">শিক্ষাবর্ষ</th>
                      <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider">পরীক্ষা</th>
                      <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider">শ্রেণি</th>
                      <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-center">মোট নম্বর</th>
                      <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-center">শতকরা</th>
                      <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-center">বিভাগ</th>
                      <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-center">মেধাক্রম</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {academicHistory.length > 0 ? (
                      academicHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-5 text-sm font-medium text-slate-800">{item.academicYear}</td>
                          <td className="py-4 px-5 text-sm text-slate-600">{item.exam}</td>
                          <td className="py-4 px-5 text-sm text-slate-600">{item.class}</td>
                          <td className="py-4 px-5 text-sm text-slate-800 text-center font-bold">{toBengaliNumber(item.totalMarks)}</td>
                          <td className="py-4 px-5 text-sm text-slate-600 text-center">{toBengaliNumber(item.percentage)}%</td>
                          <td className="py-4 px-5 text-sm font-bold text-[#0F9D8A] text-center">{item.grade}</td>
                          <td className="py-4 px-5 text-sm font-bold text-[#3B82F6] text-center">{item.rank}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                          কোন ফলাফল পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Attendance History Section */}
            <motion.div variants={itemVariants} className="mt-8">
              <div 
                onClick={() => setIsAttendanceExpanded(!isAttendanceExpanded)}
                className="flex items-center justify-between w-full gap-2 px-2 mb-4 bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">হাজিরা ইতিহাস</h4>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttendanceSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {attendanceSortOrder === 'asc' ? 'পুরানো থেকে নতুন' : 'নতুন থেকে পুরানো'}
                </button>
              </div>

              {isAttendanceExpanded && (
                <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                          <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider">তারিখ</th>
                          <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider">সময়</th>
                          <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-center">অবস্থা</th>
                          <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider">নোট</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sortedAttendance.length > 0 ? (
                          sortedAttendance.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-5 text-sm text-slate-800">{item.date}</td>
                              <td className="py-4 px-5 text-sm text-slate-600">{item.time}</td>
                              <td className="py-4 px-5 text-sm text-center">
                                <span className={clsx(
                                  "px-3 py-1 rounded-full text-xs font-bold",
                                  item.status === AttendanceStatus.Present 
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : "bg-rose-100 text-rose-700"
                                )}>
                                  {item.status === AttendanceStatus.Present ? "উপস্থিত" : "অনুপস্থিত"}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-sm text-slate-600">{item.note || "-"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-slate-400 text-sm">
                              কোন হাজিরা রেকর্ড পাওয়া যায়নি।
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
        
        {editingStudent && (
          <StudentEditModal
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onSave={handleUpdateStudent}
          />
        )}

        {student.photoUrl && (
          <ImageModal
            isOpen={isImageModalOpen}
            onClose={() => setIsImageModalOpen(false)}
            imageUrl={student.photoUrl}
            title={student.name}
          />
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
