import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Search, FileText, GraduationCap, Calendar, User, Loader2, Trophy } from "lucide-react";
import { convertNumber } from "../utils/numeralConverter";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const PublicResultSearch: React.FC = () => {
  const { orgId: urlOrgId } = useParams<{ orgId: string }>();
  const [orgId, setOrgId] = useState<string | null>(urlOrgId || null);
  const [orgName, setOrgName] = useState<string>("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgSearchText, setOrgSearchText] = useState("");
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
  const [students, setStudents] = useState<any[]>([]);
  const [showOrgSuggestions, setShowOrgSuggestions] = useState(false);
  const [showStudentSuggestions, setShowStudentSuggestions] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        let currentOrgId = orgId;
        
        // 1. Fetch Org
        if (currentOrgId) {
          const orgDoc = await getDoc(doc(db, "organizations", currentOrgId));
          if (orgDoc.exists()) {
            setOrgName(orgDoc.data().name || "মাদরাসা");
          } else {
            toast.error("প্রতিষ্ঠান পাওয়া যায়নি।");
            setLoading(false);
            return;
          }
        } else {
          const orgsRef = collection(db, "organizations");
          const snapshot = await getDocs(orgsRef);
          const orgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setOrganizations(orgs);
          
          if (orgs.length === 0) {
            toast.error("কোনো প্রতিষ্ঠানের তথ্য পাওয়া যায়নি।");
            setLoading(false);
            return;
          }
          // Do not auto-select, let user select
          setLoading(false);
          return;
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
    const fetchOrgData = async () => {
      if (!orgId) {
        setAcademicYears([]);
        setClasses([]);
        setExams([]);
        return;
      }
      try {
        // Fetch Academic Years
        const yearsRef = collection(db, `organizations/${orgId}/academic_years`);
        const yearsSnap = await getDocs(yearsRef);
        const loadedYears = yearsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAcademicYears(loadedYears);
        
        const activeYear = loadedYears.find((ay: any) => ay.is_active);
        if (activeYear) {
          setSelectedAcademicYearId(activeYear.id);
        } else if (loadedYears.length > 0) {
          setSelectedAcademicYearId(loadedYears[0].id);
        }

        // Fetch Classes
        const classesSnap = await getDocs(collection(db, `organizations/${orgId}/classes`));
        const loadedClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClasses(loadedClasses);
        if (loadedClasses.length > 0) {
          setSelectedClassId(loadedClasses[0].id);
        }
      } catch (error) {
        console.error("Error fetching org data:", error);
      }
    };
    fetchOrgData();
  }, [orgId]);

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

  useEffect(() => {
    if (!orgId || !selectedClassId) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      try {
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const studentQuery = query(
          studentsRef, 
          where('classId', '==', selectedClassId)
        );
        const studentSnap = await getDocs(studentQuery);
        setStudents(studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((s: any) => s.isActive !== false));
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };

    fetchStudents();
  }, [orgId, selectedClassId]);

  const filteredOrganizations = organizations.filter(org => {
    if (!orgSearchText) return false;
    const orgCode = (org.orgCode || org.id.substring(0, 6).toUpperCase()).toLowerCase();
    const orgName = org.name.toLowerCase();
    const valLower = orgSearchText.toLowerCase();
    
    return (
      `${orgCode} - ${orgName}`.includes(valLower) ||
      orgCode.includes(valLower) ||
      orgName.includes(valLower)
    );
  });

  const filteredStudents = students.filter(student => {
    if (!rollNumber) return false;
    const idStr = student.studentUid ? `${student.studentUid} - ` : (student.studentId ? `${student.studentId} - ` : '');
    const rollStr = student.roll ? `রোল: ${student.roll} - ` : '';
    const combinedStr = `${idStr}${rollStr}${student.name}`.toLowerCase();
    const searchLower = rollNumber.toLowerCase();
    
    return (
      student.roll?.toString() === searchLower ||
      student.studentUid?.toLowerCase() === searchLower ||
      student.studentId?.toLowerCase() === searchLower ||
      student.name?.toLowerCase().includes(searchLower) ||
      combinedStr.includes(searchLower) ||
      searchLower.includes(student.name?.toLowerCase() || '')
    );
  });

  const handleOrgSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgSearchText(val);
    setShowOrgSuggestions(true);
    
    const matchedOrg = organizations.find(org => {
      const orgCode = (org.orgCode || org.id.substring(0, 6).toUpperCase()).toLowerCase();
      const orgName = org.name.toLowerCase();
      const valLower = val.toLowerCase();
      
      return (
        `${orgCode} - ${orgName}` === valLower ||
        orgCode === valLower ||
        orgName === valLower
      );
    });
    
    if (matchedOrg) {
      setOrgId(matchedOrg.id);
      setOrgName(matchedOrg.name);
    } else {
      setOrgId(null);
      setOrgName("");
    }
  };

  const handleOrgSelect = (org: any) => {
    const orgCode = org.orgCode || org.id.substring(0, 6).toUpperCase();
    setOrgSearchText(`${orgCode} - ${org.name}`);
    setOrgId(org.id);
    setOrgName(org.name);
    setShowOrgSuggestions(false);
  };

  const handleStudentSelect = (student: any) => {
    const idStr = student.studentUid ? `${student.studentUid} - ` : (student.studentId ? `${student.studentId} - ` : '');
    const rollStr = student.roll ? `রোল: ${student.roll} - ` : '';
    setRollNumber(`${idStr}${rollStr}${student.name}`);
    setShowStudentSuggestions(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !selectedAcademicYearId || !selectedClassId || !selectedExamId || !rollNumber) {
      toast.error("সবগুলো তথ্য প্রদান করুন।");
      return;
    }

    setSearching(true);
    try {
      // 1. Find the student by roll, ID, or name in the selected class
      const studentsRef = collection(db, `organizations/${orgId}/students`);
      const studentQuery = query(
        studentsRef, 
        where("classId", "==", selectedClassId)
      );
      const studentSnap = await getDocs(studentQuery);
      const activeStudents = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((s: any) => s.isActive !== false);

      const searchLower = rollNumber.toLowerCase().trim();
      const matchedStudentDoc = activeStudents.find((data: any) => {
        const idStr = data.studentUid ? `${data.studentUid} - ` : (data.studentId ? `${data.studentId} - ` : '');
        const rollStr = data.roll ? `রোল: ${data.roll} - ` : '';
        const combinedStr = `${idStr}${rollStr}${data.name}`.toLowerCase();
        
        return (
          data.roll?.toString() === searchLower ||
          data.studentUid?.toLowerCase() === searchLower ||
          data.studentId?.toLowerCase() === searchLower ||
          data.name?.toLowerCase() === searchLower ||
          combinedStr === searchLower ||
          combinedStr.includes(searchLower)
        );
      });

      if (!matchedStudentDoc) {
        toast.error("এই রোল, আইডি বা নামের কোনো শিক্ষার্থী পাওয়া যায়নি।");
        setSearching(false);
        return;
      }

      const studentId = matchedStudentDoc.id;

      // 2. Check if result exists and is published
      const resultsRef = collection(db, `organizations/${orgId}/results`);
      const resultQuery = query(
        resultsRef,
        where("student_id", "==", studentId),
        where("exam_id", "==", selectedExamId)
      );
      const resultSnap = await getDocs(resultQuery);
      
      const publishedResults = resultSnap.docs.filter(doc => doc.data().status === "published");

      if (publishedResults.length === 0) {
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
    navigate(`/public-class-result/${orgId}/${selectedAcademicYearId}/${selectedClassId}/${selectedExamId}`);
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{orgName || "ফলাফল অনুসন্ধান"}</h1>
          <p className="text-slate-600">আপনার রোল নম্বর দিয়ে ফলাফল দেখুন</p>
        </div>

        <div className="card-premium p-8 bg-white shadow-xl border border-slate-100">
          <form onSubmit={handleSearch} className="space-y-5">
            {!urlOrgId && (
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#0F5C7A]" />
                  প্রতিষ্ঠান
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={orgSearchText}
                    onChange={handleOrgSearchChange}
                    onFocus={() => setShowOrgSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowOrgSuggestions(false), 200)}
                    placeholder="প্রতিষ্ঠান আইডি বা নাম লিখুন"
                    className="input-premium w-full"
                    required
                  />
                  {showOrgSuggestions && orgSearchText && filteredOrganizations.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {filteredOrganizations.map(org => {
                        const orgCode = org.orgCode || org.id.substring(0, 6).toUpperCase();
                        return (
                          <li
                            key={org.id}
                            onClick={() => handleOrgSelect(org)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-slate-700 border-b border-slate-100 last:border-0"
                          >
                            <span className="font-medium text-[#0F5C7A]">{orgCode}</span> - {org.name}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

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

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0F5C7A]" />
                রোল, আইডি বা নাম
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => {
                    setRollNumber(e.target.value);
                    setShowStudentSuggestions(true);
                  }}
                  onFocus={() => setShowStudentSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowStudentSuggestions(false), 200)}
                  placeholder="আপনার রোল, আইডি বা নাম লিখুন"
                  className="input-premium w-full"
                  required
                />
                {showStudentSuggestions && rollNumber && filteredStudents.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {filteredStudents.map(student => {
                      const idStr = student.studentId ? `${student.studentId} - ` : '';
                      const rollStr = student.roll ? `রোল: ${student.roll} - ` : '';
                      return (
                        <li
                          key={student.id}
                          onClick={() => handleStudentSelect(student)}
                          className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-slate-700 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-[#0F5C7A]">{idStr}{rollStr}</span>{student.name}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
