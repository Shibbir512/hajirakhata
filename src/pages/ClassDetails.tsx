import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { ArrowLeft, Users, Calendar, User } from "lucide-react";
import { toBengaliNumber, toBengaliDate } from "../utils/dateFormatter";
import clsx from "clsx";

const ClassDetails: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  
  const selectedClass = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
  const classStudents = useMemo(() => (classId ? students[classId] || [] : []), [students, classId]);

  const { attendanceSessions } = useAttendance(orgId, user, classes, students, role);

  if (!selectedClass) {
    return <div className="p-8 text-center text-slate-500">শ্রেণি পাওয়া যায়নি।</div>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/classes")}
        className="flex items-center gap-2 text-slate-500 hover:text-[#0F5C7A] transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        শ্রেণির তালিকায় ফিরে যান
      </button>

      <div className="bg-white p-8 rounded-[24px] shadow-sm border border-[#E5E7EB]">
        <h2 className="text-3xl font-bold text-[#0F5C7A] tracking-tight">{selectedClass.name}</h2>
        <p className="text-slate-500 mt-1">মোট শিক্ষার্থী: {toBengaliNumber(classStudents.length)} জন</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {classStudents.map(student => {
          const studentAttendance = attendanceSessions
            .flatMap(session => (session.attendance || []).filter(a => a.studentId === student.id))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

          return (
            <div key={student.id} className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E5E7EB]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{student.name}</h3>
                  <p className="text-sm text-slate-500">রোল: {toBengaliNumber(student.roll)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[15px] font-bold text-[#1F2937] mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0F5C7A]" />
                  সাম্প্রতিক হাজিরা
                </h4>
                <div className="space-y-2">
                  {studentAttendance.length > 0 ? (
                    studentAttendance.map((record, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[14px] text-[13px]">
                        <span className="text-[#6B7280] font-medium">{toBengaliDate(record.date)}</span>
                        <span className={clsx(
                          "font-bold px-3 py-1 rounded-full text-[11px]",
                          record.status === 'present' ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]"
                        )}>
                          {record.status === 'present' ? 'উপস্থিত' : 'অনুপস্থিত'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[13px] text-[#6B7280] italic bg-[#F4F7FB] p-4 rounded-[14px] text-center">কোন হাজিরা রেকর্ড পাওয়া যায়নি।</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassDetails;
