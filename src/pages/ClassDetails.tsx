import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { ArrowLeft, Users, CalendarCheck, FileText, User, Eye } from "lucide-react";
import { toBengaliNumber } from "../utils/dateFormatter";
import { DataTable, Column } from "../components/DataTable";
import { Student } from "../types";

const ClassDetails: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  
  const selectedClass = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
  const classStudents = useMemo(() => (classId ? students[classId] || [] : []), [students, classId]);

  if (!selectedClass) {
    return <div className="p-8 text-center text-slate-500">শ্রেণি পাওয়া যায়নি।</div>;
  }

  const columns: Column<Student>[] = [
    {
      header: "রোল",
      accessorKey: "roll",
      sortable: true,
      cell: (student) => <span className="font-bold text-slate-700">{toBengaliNumber(student.roll)}</span>,
    },
    {
      header: "নাম",
      accessorKey: "name",
      sortable: true,
      className: "font-medium text-slate-800",
    },
    {
      header: "পিতার নাম",
      accessorKey: "fatherName",
      sortable: true,
      className: "text-slate-600",
    },
    {
      header: "মোবাইল",
      accessorKey: "phone",
      className: "text-slate-600 font-mono text-sm",
      cell: (student) => toBengaliNumber(student.phone),
    },
    {
      header: "রক্তের গ্রুপ",
      accessorKey: "bloodGroup",
      className: "text-slate-600",
      cell: (student) => student.bloodGroup ? (
        <span className="px-2 py-1 bg-red-50 text-red-600 rounded-md text-xs font-bold">
          {student.bloodGroup}
        </span>
      ) : <span className="text-slate-400">-</span>,
    },
    {
      header: "প্রোফাইল",
      className: "text-right",
      cell: (student) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/student-profile/${student.id}`);
            }}
            className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-lg transition-colors"
            title="প্রোফাইল দেখুন"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/classes")}
        className="flex items-center gap-2 text-slate-500 hover:text-[#0F5C7A] transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        শ্রেণির তালিকায় ফিরে যান
      </button>

      <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-sm border border-[#E5E7EB]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-bold text-[#0F5C7A] tracking-tight">{selectedClass.name}</h2>
            <div className="flex items-center gap-4 mt-2 text-slate-500">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                মোট শিক্ষার্থী: {toBengaliNumber(classStudents.length)} জন
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button 
              onClick={() => navigate("/attendance")}
              className="flex-1 md:flex-none btn-primary bg-emerald-600 hover:bg-emerald-700 h-[42px] px-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2"
            >
              <CalendarCheck className="w-4 h-4" />
              হাজিরা নিন
            </button>
            <button 
              onClick={() => navigate("/result-entry")}
              className="flex-1 md:flex-none btn-primary bg-[#0F5C7A] hover:bg-[#0F5C7A]/90 h-[42px] px-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              ফলাফল এন্ট্রি
            </button>
            <button 
              onClick={() => navigate("/students")}
              className="flex-1 md:flex-none btn-secondary h-[42px] px-4 text-sm font-bold flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              শিক্ষার্থী পরিচালনা
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-[#E5E7EB]">
        <h3 className="text-xl font-bold text-slate-800 mb-6">শিক্ষার্থীদের তালিকা</h3>
        {classStudents.length > 0 ? (
          <DataTable
            data={classStudents.sort((a, b) => a.roll - b.roll)}
            columns={columns}
            keyExtractor={(student) => student.id}
            emptyMessage="এই শ্রেণিতে কোনো শিক্ষার্থী নেই।"
          />
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">এই শ্রেণিতে কোনো শিক্ষার্থী নেই।</p>
            <button 
              onClick={() => navigate("/students")}
              className="mt-4 text-[#0F5C7A] font-medium hover:underline"
            >
              শিক্ষার্থী যুক্ত করুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassDetails;
