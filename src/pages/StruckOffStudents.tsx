import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useStruckOffStudents } from "../hooks/useStruckOffStudents";
import { AlertTriangle, Check, Loader2, CheckCircle } from "lucide-react";
import { toBengaliNumber } from "../utils/dateFormatter";
import toast from "react-hot-toast";

const StruckOffStudents: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { struckOffStudents, loading, markAsActionTaken } = useStruckOffStudents(orgId, students);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
            নাম কাটা
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">টানা ৬ দিন অনুপস্থিত শিক্ষার্থীদের তালিকা</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-rose-50/30">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">টানা ৬ দিন অনুপস্থিত শিক্ষার্থীদের তালিকা</h2>
              <p className="text-sm text-slate-500 mt-1">
                এই শিক্ষার্থীরা শুক্রবার বাদে টানা ৬ দিন অনুপস্থিত রয়েছে। বাস্তব খাতা থেকে নাম কাটার পর "ব্যবস্থা নেওয়া হয়েছে" বাটনে ক্লিক করুন।
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          ) : struckOffStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">সবকিছু ঠিক আছে</h3>
              <p className="text-slate-500 mt-1">টানা ৬ দিন অনুপস্থিত কোনো শিক্ষার্থী নেই।</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-100">
                    <th className="p-4 text-sm font-semibold text-slate-600">শিক্ষার্থীর নাম</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">জামাত (ক্লাস)</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">রোল</th>
                    <th className="p-4 text-sm font-semibold text-slate-600 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {struckOffStudents.map((student) => {
                    const className = classes.find(c => c.id === student.classId)?.name || 'অজানা জামাত';
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{student.name}</div>
                          {student.phone && <div className="text-xs text-slate-500 mt-0.5">{toBengaliNumber(student.phone)}</div>}
                        </td>
                        <td className="p-4 text-sm text-slate-600 font-medium">{className}</td>
                        <td className="p-4 text-sm text-slate-600">{toBengaliNumber(student.roll)}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              toast.promise(markAsActionTaken(student.id), {
                                loading: 'আপডেট করা হচ্ছে...',
                                success: 'তালিকা থেকে সরানো হয়েছে!',
                                error: 'সমস্যা হয়েছে। আবার চেষ্টা করুন।'
                              });
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            ব্যবস্থা নেওয়া হয়েছে
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StruckOffStudents;
