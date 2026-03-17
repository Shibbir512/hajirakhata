import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Search, FileText, GraduationCap, Calendar, User, Loader2, Trophy } from "lucide-react";
import { convertNumber } from "../utils/numeralConverter";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const PublicResultSearch: React.FC = () => {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Since this is public, we need to know which organization we are searching for
  // For now, we'll try to get it from the URL or a default one if applicable
  // But a better way is to let them select the institution or use a sub-domain/path
  // For this app, we'll assume there's a primary organization or they can enter an Org ID
  
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Default Org
        const orgsRef = collection(db, "organizations");
        const snapshot = await getDocs(orgsRef);
        console.log("Organizations found:", snapshot.size);
        
        let currentOrgId = orgId;
        if (!snapshot.empty) {
          const firstOrgDoc = snapshot.docs[0];
          const firstOrgData = firstOrgDoc.data();
          currentOrgId = firstOrgDoc.id;
          setOrgId(currentOrgId);
          setOrgName(firstOrgData.name || "মাদরাসা");
          console.log("Selected Org ID:", currentOrgId);
        } else {
          console.warn("No organizations found in database.");
          toast.error("কোনো প্রতিষ্ঠানের তথ্য পাওয়া যায়নি।");
          setLoading(false);
          return;
        }

        // 2. Fetch Academic Years
        const yearsRef = collection(db, `organizations/${currentOrgId}/academic_years`);
        const yearsSnap = await getDocs(yearsRef);
        console.log("Academic years found:", yearsSnap.size);
        
        const loadedYears = yearsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAcademicYears(loadedYears);
        
        if (loadedYears.length === 0) {
          toast.error("কোনো শিক্ষাবর্ষ পাওয়া যায়নি।");
        }

        const activeYear = loadedYears.find((ay: any) => ay.is_active);
        if (activeYear) {
          setSelectedAcademicYearId(activeYear.id);
        } else if (loadedYears.length > 0) {
          setSelectedAcademicYearId(loadedYears[0].id);
        }

        // 3. Fetch Classes
        const classesSnap = await getDocs(collection(db, `organizations/${currentOrgId}/classes`));
        console.log("Classes found:", classesSnap.size);
        const loadedClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClasses(loadedClasses);
        if (loadedClasses.length > 0) {
          setSelectedClassId(loadedClasses[0].id);
        } else {
          toast.error("কোনো শ্রেণি পাওয়া যায়নি।");
        }
      } catch (error: any) {
        console.error("Error fetching initial data:", error);
        toast.error("তথ্য লোড করতে সমস্যা হয়েছে: " + (error.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      if (!orgId || !selectedAcademicYearId || !selectedClassId) {
        setExams([]);
        return;
      }
      try {
        const examsQuery = query(
          collection(db, `organizations/${orgId}/exams`),
          where("academicYearId", "==", selectedAcademicYearId),
          where("classId", "==", selectedClassId)
        );
        const examsSnap = await getDocs(examsQuery);
        const loadedExams = examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExams(loadedExams);
        if (loadedExams.length > 0) {
          setSelectedExamId(loadedExams[0].id);
        } else {
          setSelectedExamId("");
        }
      } catch (error) {
        console.error("Error fetching exams:", error);
      }
    };
    fetchExams();
  }, [orgId, selectedAcademicYearId, selectedClassId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !selectedAcademicYearId || !selectedClassId || !selectedExamId || !rollNumber) {
      toast.error("সবগুলো তথ্য প্রদান করুন।");
      return;
    }

    setSearching(true);
    try {
      // 1. Find the student by roll in the selected class
      const studentsRef = collection(db, `organizations/${orgId}/students`);
      const studentQuery = query(
        studentsRef, 
        where("classId", "==", selectedClassId), 
        where("roll", "==", Number(rollNumber)),
        where("isActive", "==", true)
      );
      const studentSnap = await getDocs(studentQuery);

      if (studentSnap.empty) {
        toast.error("এই রোল নম্বরের কোনো শিক্ষার্থী পাওয়া যায়নি।");
        setSearching(false);
        return;
      }

      const studentId = studentSnap.docs[0].id;

      // 2. Check if result exists and is published
      const resultsRef = collection(db, `organizations/${orgId}/results`);
      const resultQuery = query(
        resultsRef,
        where("student_id", "==", studentId),
        where("exam_id", "==", selectedExamId),
        where("status", "==", "published")
      );
      const resultSnap = await getDocs(resultQuery);

      if (resultSnap.empty) {
        toast.error("ফলাফল এখনো প্রকাশিত হয়নি অথবা পাওয়া যায়নি।");
      } else {
        // Redirect to a public result view page
        navigate(`/public-result/${orgId}/${studentId}/${selectedExamId}`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("অনুসন্ধান করতে সমস্যা হয়েছে।");
    } finally {
      setSearching(false);
    }
  };

  const handleViewMeritList = () => {
    if (!orgId || !selectedAcademicYearId || !selectedClassId || !selectedExamId) {
      toast.error("মেধা তালিকা দেখতে শিক্ষাবর্ষ, শ্রেণি এবং পরীক্ষা নির্বাচন করুন।");
      return;
    }
    navigate(`/public-class-result/${orgId}/${selectedClassId}/${selectedExamId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#0F5C7A]/20 border-t-[#0F5C7A] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#0F5C7A] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0F5C7A]/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{orgName || "ফলাফল অনুসন্ধান"}</h1>
          <p className="text-slate-600">আপনার রোল নম্বর দিয়ে ফলাফল দেখুন</p>
        </div>

        <div className="card-premium p-8 bg-white shadow-xl border border-slate-100">
          <form onSubmit={handleSearch} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0F5C7A]" />
                শিক্ষাবর্ষ
              </label>
              <select
                value={selectedAcademicYearId}
                onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                className="input-premium w-full"
                required
              >
                <option value="">নির্বাচন করুন</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>{ay.year_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0F5C7A]" />
                পরীক্ষা
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="input-premium w-full"
                disabled={!selectedAcademicYearId}
                required
              >
                <option value="">নির্বাচন করুন</option>
                {exams.filter(e => e.academicYearId === selectedAcademicYearId).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#0F5C7A]" />
                শ্রেণি
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input-premium w-full"
                required
              >
                <option value="">নির্বাচন করুন</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0F5C7A]" />
                রোল নম্বর
              </label>
              <input
                type="number"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="আপনার রোল নম্বর লিখুন"
                className="input-premium w-full"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                type="submit"
                disabled={searching}
                className="btn-primary py-4 text-lg font-bold shadow-lg shadow-[#0F5C7A]/20"
              >
                {searching ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    ...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Search className="w-5 h-5" />
                    ফলাফল
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleViewMeritList}
                className="btn-secondary py-4 text-lg font-bold shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5" />
                  মেধা তালিকা
                </span>
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} {orgName}. সর্বস্বত্ব সংরক্ষিত।
        </div>
      </div>
    </div>
  );
};

export default PublicResultSearch;
