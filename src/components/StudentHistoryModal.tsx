import React, { useState, useEffect } from "react";
import { XCircle, BookOpen, Calendar, Award, Activity } from "lucide-react";
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
  const [totalAttendance, setTotalAttendance] = useState({ total: 0, present: 0, absent: 0 });
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
        let totalSessions = 0;
        let totalPresent = 0;
        let totalAbsent = 0;

        sessionsSnap.docs.forEach(doc => {
          const session = doc.data();
          const studentRecord = session.students?.find((s: any) => s.studentId === studentId);
          
          if (studentRecord) {
            totalSessions++;
            const isPresent = studentRecord.status === AttendanceStatus.Present;
            const isAbsent = studentRecord.status === AttendanceStatus.Absent;
            
            if (isPresent) totalPresent++;
            if (isAbsent) totalAbsent++;

            const yearId = session.academicYearId || "N/A";
            if (!attendanceData[yearId]) attendanceData[yearId] = { present: 0, absent: 0 };
            
            if (isPresent) attendanceData[yearId].present++;
            if (isAbsent) attendanceData[yearId].absent++;
          }
        });

        setTotalAttendance({ total: totalSessions, present: totalPresent, absent: totalAbsent });

        // Group results and attendance by academic year
        const grouped: any = {};
        
        // Add all years from attendance
        Object.keys(attendanceData).forEach(yearId => {
          grouped[yearId] = { exams: {}, attendance: attendanceData[yearId] };
        });

        // Add results
        results.forEach(result => {
          const yearId = result.academic_year_id || "N/A";
          if (!grouped[yearId]) {
            grouped[yearId] = { exams: {}, attendance: { present: 0, absent: 0 } };
          }
          
          const examId = result.exam_id;
          if (!grouped[yearId].exams[examId]) grouped[yearId].exams[examId] = [];
          grouped[yearId].exams[examId].push(result);
        });

        // Sort by academic year (assuming newer years might be at the top, but we'll just convert to array)
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

  const presentPercentage = totalAttendance.total > 0 ? Math.round((totalAttendance.present / totalAttendance.total) * 100) : 0;
  const absentPercentage = totalAttendance.total > 0 ? Math.round((totalAttendance.absent / totalAttendance.total) * 100) : 0;

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
          ) : (
            <>
              {/* Total Attendance Summary */}
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-6 border border-teal-100 shadow-sm">
                <h4 className="text-lg font-bold text-teal-800 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  পুরা শিক্ষা জীবনের উপস্থিতি
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl text-center shadow-sm border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 mb-1">মোট সেশন</p>
                    <p className="text-2xl font-bold text-slate-800">{toBengaliNumber(totalAttendance.total)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl text-center shadow-sm border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-600 mb-1">উপস্থিতির হার</p>
                    <p className="text-2xl font-bold text-emerald-700">{toBengaliNumber(presentPercentage)}%</p>
                    <p className="text-[10px] text-emerald-500 mt-1">{toBengaliNumber(totalAttendance.present)} দিন</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl text-center shadow-sm border border-rose-100">
                    <p className="text-xs font-bold text-rose-600 mb-1">অনুপস্থিতির হার</p>
                    <p className="text-2xl font-bold text-rose-700">{toBengaliNumber(absentPercentage)}%</p>
                    <p className="text-[10px] text-rose-500 mt-1">{toBengaliNumber(totalAttendance.absent)} দিন</p>
                  </div>
                </div>
              </div>

              {history.length > 0 ? (
                history.map(([yearId, data]: [string, any]) => {
                  const yearPresentPct = (data.attendance.present + data.attendance.absent) > 0 
                    ? Math.round((data.attendance.present / (data.attendance.present + data.attendance.absent)) * 100) 
                    : 0;
                  const yearAbsentPct = (data.attendance.present + data.attendance.absent) > 0 
                    ? Math.round((data.attendance.absent / (data.attendance.present + data.attendance.absent)) * 100) 
                    : 0;

                  return (
                    <div key={yearId} className="border border-slate-100 rounded-2xl p-5 shadow-sm bg-white">
                      <h4 className="text-lg font-bold text-[#0F766E] mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        শিক্ষাবর্ষ: {academicYears.find(ay => ay.id === yearId)?.year_name || yearId}
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-emerald-50 p-3 rounded-xl text-center flex flex-col justify-center">
                          <p className="text-xs font-bold text-emerald-600">উপস্থিতি</p>
                          <div className="flex items-baseline justify-center gap-1">
                            <p className="text-lg font-bold text-emerald-700">{toBengaliNumber(data.attendance.present)} দিন</p>
                            <span className="text-xs text-emerald-600 font-medium">({toBengaliNumber(yearPresentPct)}%)</span>
                          </div>
                        </div>
                        <div className="bg-rose-50 p-3 rounded-xl text-center flex flex-col justify-center">
                          <p className="text-xs font-bold text-rose-600">অনুপস্থিতি</p>
                          <div className="flex items-baseline justify-center gap-1">
                            <p className="text-lg font-bold text-rose-700">{toBengaliNumber(data.attendance.absent)} দিন</p>
                            <span className="text-xs text-rose-600 font-medium">({toBengaliNumber(yearAbsentPct)}%)</span>
                          </div>
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
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-500">কোন ইতিহাস পাওয়া যায়নি।</div>
              )}
            </>
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
