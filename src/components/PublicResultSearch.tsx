import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Loader2, Award, BookOpen, Calendar, Building2, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PublicResultSearch: React.FC = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchType, setSearchType] = useState<'individual' | 'class'>('individual');

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'organizations'));
        const orgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrganizations(orgs);
      } catch (err) {
        console.error("Error fetching organizations:", err);
      }
    };
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (!selectedOrg) {
      setAcademicYears([]);
      setClasses([]);
      setExams([]);
      return;
    }

    const fetchOrgData = async () => {
      try {
        const yearsSnap = await getDocs(collection(db, 'organizations', selectedOrg, 'academic_years'));
        setAcademicYears(yearsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const classesSnap = await getDocs(collection(db, 'organizations', selectedOrg, 'classes'));
        setClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const examsSnap = await getDocs(collection(db, 'organizations', selectedOrg, 'exams'));
        setExams(examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching org data:", err);
      }
    };

    fetchOrgData();
  }, [selectedOrg]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !selectedYear || !selectedClass || !selectedExam) {
      setError("অনুগ্রহ করে সব তথ্য প্রদান করুন।");
      return;
    }

    if (searchType === 'individual' && !rollNumber) {
      setError("অনুগ্রহ করে রোল নম্বর প্রদান করুন।");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (searchType === 'individual') {
        // Find the student
        const studentsRef = collection(db, 'organizations', selectedOrg, 'students');
        const studentQuery = query(
          studentsRef, 
          where('classId', '==', selectedClass),
          where('roll', '==', Number(rollNumber))
        );
        const studentSnap = await getDocs(studentQuery);

        if (studentSnap.empty) {
          setError("এই রোল নম্বরের কোনো শিক্ষার্থী পাওয়া যায়নি।");
          setLoading(false);
          return;
        }

        const foundStudent = { id: studentSnap.docs[0].id, ...studentSnap.docs[0].data() } as any;
        
        // Navigate to individual result view
        navigate(`/public-result/${selectedOrg}/${foundStudent.id}/${selectedExam}`);
      } else {
        // Navigate to class result view
        navigate(`/public-class-result/${selectedOrg}/${selectedClass}/${selectedExam}`);
      }
    } catch (err) {
      console.error("Error searching result:", err);
      setError("ফলাফল অনুসন্ধানে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0F766E] to-[#14B8A6]">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">শিক্ষার্থীর ফলাফল অনুসন্ধান</h2>
        <p className="text-teal-50 text-lg">সহজেই ফলাফল খুঁজুন</p>
      </div>

      <div className="w-full bg-white/95 backdrop-blur-md rounded-[32px] p-6 shadow-2xl border border-white/20">
        <div className="flex justify-center p-1 bg-slate-100 rounded-[24px] mb-8">
          <button
            onClick={() => setSearchType('individual')}
            className={`flex items-center gap-2 px-6 py-3 rounded-[20px] font-bold transition-all duration-200 flex-1 justify-center ${
              searchType === 'individual'
                ? 'bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ব্যক্তিগত ফলাফল
          </button>
          <button
            onClick={() => setSearchType('class')}
            className={`flex items-center gap-2 px-6 py-3 rounded-[20px] font-bold transition-all duration-200 flex-1 justify-center ${
              searchType === 'class'
                ? 'bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ক্লাস ভিত্তিক ফলাফল
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">প্রতিষ্ঠান</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  required
                >
                  <option value="">প্রতিষ্ঠান নির্বাচন করুন</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">শিক্ষাবর্ষ</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  required
                  disabled={!selectedOrg}
                >
                  <option value="">শিক্ষাবর্ষ নির্বাচন করুন</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.id}>{year.year_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">শ্রেণি</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  required
                  disabled={!selectedOrg}
                >
                  <option value="">শ্রেণি নির্বাচন করুন</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">পরীক্ষা</label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  required
                  disabled={!selectedOrg}
                >
                  <option value="">পরীক্ষা নির্বাচন করুন</option>
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id}>{exam.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {searchType === 'individual' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">রোল নম্বর</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="আপনার রোল নম্বর লিখুন"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-teal-500/30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-5 h-5" />}
            ফলাফল খুঁজুন
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicResultSearch;
