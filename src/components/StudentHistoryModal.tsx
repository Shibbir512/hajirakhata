import React, { useState, useEffect } from "react";
import { XCircle, BookOpen, Calendar, Award } from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Result, AttendanceStatus } from "../types";
import { toBengaliNumber } from "../utils/dateFormatter";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { useExams } from "../hooks/useExams";
import { useSubjects } from "../hooks/useSubjects";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { useAuth } from "../hooks/useAuth";

interface StudentHistoryModalProps {
  studentId: string;
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
}

const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({ studentId, orgId, isOpen, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { academicYears } = useAcademicYears(orgId, user);
  const { exams } = useExams(orgId, user);
  const { subjects } = useSubjects(orgId, user);

  useEffect(() => {
    if (!isOpen) return;
    const fetchHistory = async () => {
      if (!studentId || !orgId) {
        setLoading(false);
        return;
      }
      try {
        // Fetch all results
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const resultsQuery = query(resultsRef, where("student_id", "==", studentId));
        const resultsSnap = await getDocs(resultsQuery);
        const results = resultsSnap.docs.map(doc => doc.data() as Result);

        // Fetch attendance sessions
        const sessionsRef = collection(db, `organizations/${orgId}/attendance_sessions`);
        const sessionsSnap = await getDocs(sessionsRef);
        
        const attendanceData: {[key: string]: {present: number, absent: number}} = {};

        sessionsSnap.docs.forEach(doc => {
          const session = doc.data();
          const yearId = session.academicYearId || "N/A";
          if (!attendanceData[yearId]) attendanceData[yearId] = { present: 0, absent: 0 };
          
          const studentRecord = session.students?.find((s: any) => s.studentId === studentId);
          if (studentRecord) {
            if (studentRecord.status === AttendanceStatus.Present) attendanceData[yearId].present++;
            else if (studentRecord.status === AttendanceStatus.Absent) attendanceData[yearId].absent++;
          }
        });

        // Group results by academic year and then by exam
        const grouped = results.reduce((acc, result) => {
          const yearId = result.academic_year_id || "N/A";
          if (!acc[yearId]) acc[yearId] = { exams: {}, attendance: attendanceData[yearId] || { present: 0, absent: 0 } };
          
          const examId = result.exam_id;
          if (!acc[yearId].exams[examId]) acc[yearId].exams[examId] = [];
          acc[yearId].exams[examId].push(result);
          
          return acc;
        }, {} as any);

        setHistory(Object.entries(grouped));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching history:", error);
        setLoading(false);
      }
    };

    fetchHistory();
  }, [studentId, orgId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#0F766E]" />
            বিস্তারিত একাডেমিক হিস্ট্রি
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="text-center py-10 text-slate-500">লোড হচ্ছে...</div>
          ) : history.length > 0 ? (
            history.map(([yearId, data]: [string, any]) => (
              <div key={yearId} className="border border-slate-100 rounded-2xl p-5 shadow-sm bg-white">
                <h4 className="text-lg font-bold text-[#0F766E] mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  শিক্ষাবর্ষ: {academicYears.find(ay => ay.id === yearId)?.year_name || yearId}
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-emerald-50 p-3 rounded-xl text-center">
                    <p className="text-xs font-bold text-emerald-600">উপস্থিতি</p>
                    <p className="text-lg font-bold text-emerald-700">{toBengaliNumber(data.attendance.present)} দিন</p>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-xl text-center">
                    <p className="text-xs font-bold text-rose-600">অনুপস্থিতি</p>
                    <p className="text-lg font-bold text-rose-700">{toBengaliNumber(data.attendance.absent)} দিন</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-bold text-slate-700 mb-2">পরীক্ষার ফলাফল:</h5>
                  {Object.keys(data.exams).length > 0 ? (
                    Object.entries(data.exams).map(([examId, examResults]: [string, any]) => {
                      const exam = exams.find(e => e.id === examId);
                      const examName = exam?.name || examId;
                      
                      const classId = examResults[0]?.class_id;
                      const examSubjects = subjects.filter(s => s.classId === classId);
                      
                      const metrics = calculateResultMetrics(examResults, examSubjects);
                      
                      return (
                        <div key={examId} className="flex flex-col p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-slate-800 text-base">{examName}</span>
                            <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                              metrics.hasFailed ? 'bg-rose-100 text-rose-700' : 'bg-teal-50 text-[#0F766E]'
                            }`}>
                              {metrics.grade}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-400">মোট নম্বর</span>
                              <span className="font-medium text-slate-700">{toBengaliNumber(metrics.totalMarks)} / {toBengaliNumber(metrics.totalFullMarks)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-400">শতকরা</span>
                              <span className="font-medium text-slate-700">{toBengaliNumber(metrics.percentage)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-500 italic">কোনো পরীক্ষার ফলাফল নেই</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-500">কোন তথ্য পাওয়া যায়নি।</div>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-colors">
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentHistoryModal;
