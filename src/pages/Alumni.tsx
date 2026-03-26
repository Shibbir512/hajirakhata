import React, { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { Search, GraduationCap, User, Calendar, BookOpen, ChevronDown } from "lucide-react";
import { toBengaliNumber } from "../utils/dateFormatter";
import StudentHistoryModal from "../components/StudentHistoryModal";
import { Student } from "../types";

const Alumni: React.FC = () => {
  const { user, orgId } = useAuth();
  const { academicYears } = useAcademicYears(orgId, user);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!user || !db || !orgId) return;

    const fetchAlumni = async () => {
      setLoading(true);
      try {
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const q = query(studentsRef, where("isAlumni", "==", true));
        const snapshot = await getDocs(q);
        
        const alumniData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setAlumni(alumniData);
      } catch (error) {
        console.error("Error fetching alumni:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlumni();
  }, [user, orgId]);

  const filteredAlumni = useMemo(() => {
    return alumni.filter(student => {
      const matchesYear = selectedYearId ? student.graduationYearId === selectedYearId : true;
      const searchLower = searchText.toLowerCase();
      const matchesSearch = 
        !searchText || 
        student.name.toLowerCase().includes(searchLower) ||
        (student.studentUid && student.studentUid.toLowerCase().includes(searchLower)) ||
        student.roll.toString().includes(searchLower);
        
      return matchesYear && matchesSearch;
    });
  }, [alumni, selectedYearId, searchText]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-teal-600" />
            প্রাক্তন শিক্ষার্থী (Alumni)
          </h1>
          <p className="text-slate-500 mt-1">পাস করে যাওয়া শিক্ষার্থীদের তালিকা ও প্রোফাইল</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">পাসের শিক্ষাবর্ষ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              >
                <option value="">সকল শিক্ষাবর্ষ</option>
                {academicYears.map(year => (
                  <option key={year.id} value={year.id}>{year.year_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">অনুসন্ধান করুন</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="নাম, আইডি বা রোল লিখুন..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      ) : filteredAlumni.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-600">কোনো প্রাক্তন শিক্ষার্থী পাওয়া যায়নি</h3>
          <p className="text-slate-500 mt-2">শিক্ষাবর্ষ বা অনুসন্ধানের শর্ত পরিবর্তন করে দেখুন</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlumni.map(student => (
            <div 
              key={student.id}
              onClick={() => setViewingStudent(student as Student)}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                    আইডি: {student.studentUid || '-'}
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-teal-600 transition-colors">
                {student.name}
              </h3>
              
              <div className="space-y-2 mt-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span>সর্বশেষ রোল: {toBengaliNumber(student.roll)}</span>
                </div>
                {student.graduationYearId && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>পাসের শিক্ষাবর্ষ: {academicYears.find(y => y.id === student.graduationYearId)?.year_name || '-'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingStudent && (
        <StudentHistoryModal
          isOpen={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          studentId={viewingStudent.id}
          orgId={orgId!}
        />
      )}
    </div>
  );
};

export default Alumni;
