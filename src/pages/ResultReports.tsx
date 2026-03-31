import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useSubjects } from "../hooks/useSubjects";
import { useExams } from "../hooks/useExams";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { FileText, Printer, Download, Edit2, Save, Check, X, Search, ArrowUpDown, Filter, ChevronUp, ChevronDown, Calendar, Users } from "lucide-react";
import { Result } from "../types";
import { collection, query, where, getDocs, writeBatch, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import { addBengaliFont } from "../utils/pdfFont";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } from "docx";

const ResultReports: React.FC = () => {
  const { user, orgId, role, orgName } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { subjects } = useSubjects(orgId, user);
  const { exams } = useExams(orgId, user);
  const { academicYears } = useAcademicYears(orgId, user);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [numeralFormat, setNumeralFormat] = useState<'bn' | 'ar' | 'en'>('en');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'roll' | 'rank' | 'percentage' | 'totalMarks'>('roll');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [reportHeader, setReportHeader] = useState({
    orgName: "",
    address: "",
    examTitle: "",
    academicYearText: "",
    classNameText: "",
    publishDate: ""
  });

  useEffect(() => {
    const activeYear = academicYears.find(ay => ay.is_active);
    if (activeYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(activeYear.id);
    }
  }, [academicYears, selectedAcademicYearId]);

  const filteredExams = useMemo(() => {
    return exams.filter(e => (e.classId === selectedClassId || e.classId === "all") && e.academicYearId === selectedAcademicYearId);
  }, [exams, selectedClassId, selectedAcademicYearId]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => s.classId === selectedClassId).sort((a, b) => a.subjectOrder - b.subjectOrder);
  }, [subjects, selectedClassId]);

  const filteredStudents = useMemo(() => {
    return (students[selectedClassId] || [])
      .filter(s => s.isActive !== false)
      .sort((a, b) => a.roll - b.roll);
  }, [students, selectedClassId]);

  const allStudentResults = useMemo(() => {
    return filteredStudents.map(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const totalMarks = studentResults.reduce((sum, r) => sum + r.marks, 0);
      
      // Check if failed in any subject
      const hasFailed = filteredSubjects.some(subject => {
        const result = studentResults.find(r => r.subject_id === subject.id);
        const marks = result ? result.marks : 0;
        return marks < subject.passMarks;
      });
      
      return { studentId: student.id, totalMarks, hasFailed };
    });
  }, [filteredStudents, results, filteredSubjects]);

  const statistics = useMemo(() => {
    const stats = {
      total: filteredStudents.length,
      mumtaz: 0,
      jayyidJiddan: 0,
      jayyid: 0,
      maqbul: 0,
      raseb: 0
    };

    filteredStudents.forEach(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const { grade } = calculateResultMetrics(studentResults, filteredSubjects, allStudentResults);
      if (grade === "মুমতায") stats.mumtaz++;
      else if (grade === "জায়্যিদ জিদ্দান") stats.jayyidJiddan++;
      else if (grade === "জায়্যিদ") stats.jayyid++;
      else if (grade === "মকবুল") stats.maqbul++;
      else if (grade === "রাসেব") stats.raseb++;
    });

    return stats;
  }, [filteredStudents, results, filteredSubjects, allStudentResults]);

  const processedResults = useMemo(() => {
    const data = filteredStudents.map(student => {
      const studentResults = results.filter(r => r.student_id === student.id);
      const metrics = calculateResultMetrics(studentResults, filteredSubjects, allStudentResults);
      return {
        student,
        metrics
      };
    });

    let filteredData = data;
    
    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.student.name.toLowerCase().includes(lowerSearch) || 
        item.student.roll.toString().includes(lowerSearch)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(item => item.metrics.statusKey === statusFilter);
    }

    // Sorting
    return filteredData.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'roll') {
        comparison = a.student.roll - b.student.roll;
      } else if (sortBy === 'rank') {
        const rankA = a.metrics.rank === '-' ? Infinity : parseInt(a.metrics.rank);
        const rankB = b.metrics.rank === '-' ? Infinity : parseInt(b.metrics.rank);
        comparison = rankA - rankB;
      } else if (sortBy === 'percentage') {
        comparison = a.metrics.percentage - b.metrics.percentage;
      } else if (sortBy === 'totalMarks') {
        comparison = a.metrics.totalMarks - b.metrics.totalMarks;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredStudents, results, filteredSubjects, allStudentResults, sortBy, sortOrder, searchTerm, statusFilter]);

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const fetchResults = async () => {
    if (!orgId || !selectedAcademicYearId || !selectedClassId || !selectedExamId) return;
    setLoading(true);
    try {
      const resultsRef = collection(db, `organizations/${orgId}/results`);
      let q = query(
        resultsRef,
        where("academic_year_id", "==", selectedAcademicYearId),
        where("exam_id", "==", selectedExamId),
        where("class_id", "==", selectedClassId)
      );

      if (role !== 'admin' && role !== 'teacher') {
        q = query(q, where("status", "==", "published"));
      }

      const snapshot = await getDocs(q);
      const loadedResults = snapshot.docs.map(doc => doc.data() as Result);
      setResults(loadedResults);

      // Fetch report header
      const headerRef = doc(db, `organizations/${orgId}/report_configs`, `${selectedAcademicYearId}_${selectedExamId}_${selectedClassId}`);
      const headerSnap = await getDoc(headerRef);
      if (headerSnap.exists()) {
        setReportHeader(headerSnap.data() as any);
      } else {
        // Set defaults
        const currentClass = classes.find(c => c.id === selectedClassId);
        const currentExam = exams.find(e => e.id === selectedExamId);
        const currentYear = academicYears.find(ay => ay.id === selectedAcademicYearId);
        
        setReportHeader({
          orgName: orgName || "প্রতিষ্ঠানের নাম",
          address: "ঠিকানা এখানে লিখুন",
          examTitle: `${currentExam?.name || ""} পরীক্ষার ফলাফল`,
          academicYearText: `শিক্ষাবর্ষ: ${currentYear?.hijri_year || ""} হিজরী / ${currentYear?.year_name || ""} ঈসাব্দ`,
          classNameText: `জামাত: ${currentClass?.name || ""}`,
          publishDate: `ফলাফল প্রকাশের তারিখ: ${new Date().toLocaleDateString('bn-BD')}`
        });
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("ফলাফল লোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleMarkChange = (studentId: string, subjectId: string, newMarks: number) => {
    setHasChanges(true);
    setResults(prevResults => {
      const existingIndex = prevResults.findIndex(r => r.student_id === studentId && r.subject_id === subjectId);
      if (existingIndex > -1) {
        const updatedResults = [...prevResults];
        updatedResults[existingIndex] = { ...updatedResults[existingIndex], marks: newMarks };
        return updatedResults;
      } else {
        const newResult: Result = {
          id: `result-${Date.now()}-${studentId}-${subjectId}`,
          institution_id: orgId || "",
          student_id: studentId,
          class_id: selectedClassId,
          academic_year_id: selectedAcademicYearId,
          exam_id: selectedExamId,
          subject_id: subjectId,
          marks: newMarks,
          status: 'draft',
          created_by: user?.uid || "",
          updated_by: user?.uid || "",
          created_at: Date.now(),
          updated_at: Date.now(),
          version: 1,
        };
        return [...prevResults, newResult];
      }
    });
  };

  const saveAllResults = async () => {
    if (!orgId || !user) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      results.forEach(result => {
        const resultRef = doc(db, `organizations/${orgId}/results`, result.id);
        batch.set(resultRef, {
          ...result,
          updated_by: user.uid,
          updated_at: Date.now(),
          version: (result.version || 1) + 1
        }, { merge: true });
      });
      await batch.commit();

      // Save report header
      const headerRef = doc(db, `organizations/${orgId}/report_configs`, `${selectedAcademicYearId}_${selectedExamId}_${selectedClassId}`);
      await setDoc(headerRef, reportHeader);

      setHasChanges(false);
      setIsEditing(false);
      toast.success("সব ফলাফল ও হেডার সফলভাবে সংরক্ষিত হয়েছে!");
    } catch (error) {
      console.error("Error saving results:", error);
      toast.error("ফলাফল সংরক্ষণ করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF("l", "mm", "a4");
      
      // Load Bengali font
      const fontLoaded = await addBengaliFont(doc);
      if (fontLoaded) {
        doc.setFont('TiroBangla');
      }
      
      // Header
      doc.setFontSize(16);
      doc.text(reportHeader.orgName, 148, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(reportHeader.examTitle, 148, 22, { align: 'center' });

      // Table Data
      const head = [["রোল", "নাম", ...filteredSubjects.map(s => s.name), "মোট", "পূর্ণমান", "শতকরা", "বিভাগ", "মেধাক্রম"]];
      const body = processedResults.map(({ student, metrics }) => [
        student.roll.toString(),
        student.name,
        ...filteredSubjects.map(s => {
          const result = results.find(r => r.student_id === student.id && r.subject_id === s.id);
          return (result?.marks ?? 0).toString();
        }),
        metrics.totalMarks.toString(),
        metrics.totalFullMarks.toString(),
        `${metrics.percentage}%`,
        `${metrics.statusKey === 'pass' ? 'কৃতকার্য' : 'অকৃতকার্য'} (${metrics.grade})`,
        metrics.rank
      ]);

      autoTable(doc, {
        head,
        body,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 8, font: fontLoaded ? 'TiroBangla' : 'helvetica' },
        columnStyles: {
          0: { cellWidth: 15 }, // Roll
          1: { cellWidth: 30 }, // Name
          // Subject columns will automatically adjust
        }
      });

      doc.save("tabulation_sheet.pdf");
      toast.success("PDF ডাউনলোড সফল হয়েছে!");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("PDF ডাউনলোড করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToDOCX = async () => {
    const tableRows = processedResults.map(({ student, metrics }) => {
      const { totalMarks, totalFullMarks, percentage, grade, rank, statusKey } = metrics;
      const statusText = statusKey === 'pass' ? 'Pass' : 'Fail';
      const cells = [
        student.roll, 
        student.name, 
        ...filteredSubjects.map(s => {
          const result = results.find(r => r.student_id === student.id && r.subject_id === s.id);
          return result?.marks ?? 0;
        }), 
        totalMarks, 
        totalFullMarks, 
        `${percentage}%`, 
        `${statusText} (${grade})`, 
        rank
      ].map(text => new TableCell({ children: [new Paragraph({ text: String(text) })] }));
      return new TableRow({ children: cells });
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: "ফলাফল", bold: true, size: 32 })] }),
          new Table({
            rows: [
              new TableRow({ children: ["রোল", "নাম", ...filteredSubjects.map(s => s.name), "মোট", "পূর্ণমান", "শতকরা", "বিভাগ", "মেধাক্রম"].map(text => new TableCell({ children: [new Paragraph({ text: String(text) })] })) }),
              ...tableRows
            ]
          })
        ]
      }]
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tabulation_sheet.docx";
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#0F5C7A]" />
          ফলাফল
        </h2>
          <div className="flex flex-wrap gap-2 print:hidden w-full sm:w-auto">
            <select value={numeralFormat} onChange={(e) => setNumeralFormat(e.target.value as any)} className="input-premium h-9 py-1 text-sm">
              <option value="en">English (0-9)</option>
              <option value="bn">Bengali (০-৯)</option>
              <option value="ar">Arabic (٠-٩)</option>
            </select>
            {results.length > 0 && (
              <>
                {(role === 'admin' || role === 'teacher') && (
                  isEditing ? (
                    <>
                      <button onClick={saveAllResults} className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap">
                        <Save className="w-4 h-4" />
                        সংরক্ষণ করুন
                      </button>
                      <button onClick={() => { setIsEditing(false); fetchResults(); }} className="btn-secondary h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap">
                        <X className="w-4 h-4" />
                        বাতিল
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="btn-primary h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap">
                      <Edit2 className="w-4 h-4" />
                      এডিট মোড
                    </button>
                  )
                )}
                <button onClick={handlePrint} className="btn-secondary h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap">
                  <Printer className="w-4 h-4" />
                  প্রিন্ট করুন
                </button>
                <button onClick={exportToDOCX} disabled={isExporting} className="btn-secondary h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap">
                  <Download className="w-4 h-4" />
                  DOCX
                </button>
                <button onClick={exportToPDF} disabled={isExporting} className="btn-secondary h-9 px-3 text-sm w-full sm:w-auto whitespace-nowrap">
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </>
            )}
          </div>
      </div>

      <div className="card-premium p-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">শিক্ষাবর্ষ নির্বাচন করুন</label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => {
                setSelectedAcademicYearId(e.target.value);
                setSelectedExamId("");
                setResults([]);
              }}
              className="input-premium w-full"
            >
              <option value="">শিক্ষাবর্ষ নির্বাচন করুন</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.year_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">শ্রেণি নির্বাচন করুন</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedExamId("");
                setResults([]);
              }}
              className="input-premium w-full"
            >
              <option value="">শ্রেণি নির্বাচন করুন</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">পরীক্ষা নির্বাচন করুন</label>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setResults([]);
              }}
              className="input-premium w-full"
              disabled={!selectedClassId || !selectedAcademicYearId}
            >
              <option value="">পরীক্ষা নির্বাচন করুন</option>
              {filteredExams.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchResults}
              disabled={!selectedAcademicYearId || !selectedClassId || !selectedExamId || loading}
              className="btn-primary w-full h-[42px]"
            >
              {loading ? "লোড হচ্ছে..." : "রিপোর্ট দেখুন"}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="রোল বা নাম দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-premium pl-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-slate-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="input-premium flex-1"
              >
                <option value="all">সব ফলাফল</option>
                <option value="pass">কৃতকার্য</option>
                <option value="fail">অকৃতকার্য</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-slate-400 w-4 h-4" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [key, order] = e.target.value.split('-');
                  setSortBy(key as any);
                  setSortOrder(order as any);
                }}
                className="input-premium flex-1"
              >
                <option value="roll-asc">রোল (ছোট থেকে বড়)</option>
                <option value="roll-desc">রোল (বড় থেকে ছোট)</option>
                <option value="rank-asc">মেধাক্রম (১ম থেকে শেষ)</option>
                <option value="rank-desc">মেধাক্রম (শেষ থেকে ১ম)</option>
                <option value="totalMarks-desc">মোট নম্বর (বেশি থেকে কম)</option>
                <option value="totalMarks-asc">মোট নম্বর (কম থেকে বেশি)</option>
                <option value="percentage-desc">শতকরা (বেশি থেকে কম)</option>
                <option value="percentage-asc">শতকরা (কম থেকে বেশি)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {results.length > 0 ? (
        <div id="tabulation-sheet-container" className="card-premium p-8 print:shadow-none print:border-none print:p-0 bg-white">
          <div className="text-center mb-8">
            {isEditing ? (
              <div className="space-y-2 max-w-2xl mx-auto mb-6 no-print">
                <input
                  type="text"
                  value={reportHeader.orgName}
                  onChange={(e) => setReportHeader({ ...reportHeader, orgName: e.target.value })}
                  placeholder="প্রতিষ্ঠানের নাম"
                  className="w-full text-center text-2xl font-bold border-b border-dashed border-slate-300 focus:border-[#0F5C7A] outline-none py-1"
                />
                <input
                  type="text"
                  value={reportHeader.address}
                  onChange={(e) => setReportHeader({ ...reportHeader, address: e.target.value })}
                  placeholder="ঠিকানা"
                  className="w-full text-center text-slate-600 border-b border-dashed border-slate-300 focus:border-[#0F5C7A] outline-none py-1"
                />
                <input
                  type="text"
                  value={reportHeader.examTitle}
                  onChange={(e) => setReportHeader({ ...reportHeader, examTitle: e.target.value })}
                  placeholder="পরীক্ষার নাম"
                  className="w-full text-center text-slate-600 border-b border-dashed border-slate-300 focus:border-[#0F5C7A] outline-none py-1"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={reportHeader.academicYearText}
                    onChange={(e) => setReportHeader({ ...reportHeader, academicYearText: e.target.value })}
                    placeholder="শিক্ষাবর্ষ"
                    className="w-full text-center text-slate-600 border-b border-dashed border-slate-300 focus:border-[#0F5C7A] outline-none py-1"
                  />
                  <input
                    type="text"
                    value={reportHeader.classNameText}
                    onChange={(e) => setReportHeader({ ...reportHeader, classNameText: e.target.value })}
                    placeholder="জামাত/শ্রেণি"
                    className="w-full text-center text-slate-600 border-b border-dashed border-slate-300 focus:border-[#0F5C7A] outline-none py-1"
                  />
                </div>
                <input
                  type="text"
                  value={reportHeader.publishDate}
                  onChange={(e) => setReportHeader({ ...reportHeader, publishDate: e.target.value })}
                  placeholder="ফলাফল প্রকাশের তারিখ"
                  className="w-full text-center text-slate-600 border-b border-dashed border-slate-300 focus:border-[#0F5C7A] outline-none py-1"
                />
              </div>
            ) : (
              <div className="print:mb-10">
                <h1 className="text-3xl font-bold text-slate-900 mb-1">{reportHeader.orgName}</h1>
                <p className="text-slate-700 text-lg mb-1">{reportHeader.address}</p>
                <h2 className="text-xl font-bold text-slate-800 mb-1">{reportHeader.examTitle}</h2>
                <div className="flex justify-center gap-6 text-slate-700 mb-1">
                  <span>{reportHeader.academicYearText}</span>
                  <span>{reportHeader.classNameText}</span>
                </div>
                <p className="text-slate-700">{reportHeader.publishDate}</p>
              </div>
            )}
            
            {results[0]?.status === 'draft' && !isEditing && (
              <span className="inline-block mt-2 px-3 py-1 bg-[#F59E0B]/10 text-[#F59E0B] rounded-full text-xs font-bold print:hidden">
                খসড়া (Draft)
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-[#E5E7EB] rounded-[16px] print:border-none print:overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8F9FA] print:bg-transparent">
                <tr>
                  <th 
                    className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black sticky left-0 bg-[#F8F9FA] z-10 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('roll')}
                  >
                    <div className="flex items-center gap-1">
                      রোল
                      {sortBy === 'roll' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-[#0F5C7A]" /> : <ChevronDown className="w-4 h-4 text-[#0F5C7A]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black sticky left-[80px] bg-[#F8F9FA] z-10">নাম</th>
                  {filteredSubjects.map(subject => (
                    <th key={subject.id} className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">
                      {subject.name} <br/> <span className="text-[10px] font-normal">({convertNumber(subject.fullMarks, numeralFormat)})</span>
                    </th>
                  ))}
                  <th 
                    className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('totalMarks')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      মোট
                      {sortBy === 'totalMarks' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-[#0F5C7A]" /> : <ChevronDown className="w-4 h-4 text-[#0F5C7A]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">পূর্ণমান</th>
                  <th 
                    className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('percentage')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      শতকরা
                      {sortBy === 'percentage' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-[#0F5C7A]" /> : <ChevronDown className="w-4 h-4 text-[#0F5C7A]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center">বিভাগ</th>
                  <th 
                    className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-[#E5E7EB] print:border-black text-center cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleSort('rank')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      মেধাক্রম
                      {sortBy === 'rank' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-[#0F5C7A]" /> : <ChevronDown className="w-4 h-4 text-[#0F5C7A]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedResults.map(({ student, metrics }) => {
                  const studentResults = results.filter(r => r.student_id === student.id);
                  const { totalMarks, totalFullMarks, percentage, grade, rank, statusKey } = metrics;
                  
                  const rankNum = parseInt(rank);
                  const isTop3 = !isNaN(rankNum) && rankNum <= 3;
                  const statusText = statusKey === 'pass' ? 'কৃতকার্য' : 'অকৃতকার্য';

                  return (
                    <tr key={student.id} className={`border-b border-[#E5E7EB] print:border-black hover:bg-gray-50 transition-all duration-200 print:hover:bg-transparent ${isTop3 ? 'bg-yellow-50' : ''}`}>
                      <td className="py-4 px-5 text-slate-800 font-medium sticky left-0 bg-white z-10">{convertNumber(student.roll, numeralFormat)}</td>
                      <td className="py-4 px-5 text-slate-800 sticky left-[80px] bg-white z-10">{student.name}</td>
                      {filteredSubjects.map(subject => {
                        const result = results.find(r => r.student_id === student.id && r.subject_id === subject.id);
                        const isFail = !result || result.marks < subject.passMarks;

                        return (
                          <td key={subject.id} className="py-4 px-5 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                value={result?.marks ?? ""}
                                onChange={(e) => handleMarkChange(student.id, subject.id, Number(e.target.value))}
                                className={`w-16 h-10 text-center border rounded-lg focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all ${isFail ? "border-rose-300 text-rose-600" : "border-slate-200 text-slate-700"}`}
                                min="0"
                                max={subject.fullMarks}
                              />
                            ) : (
                              <span className={isFail ? "text-rose-600 font-bold" : "text-slate-700"}>
                                {result ? convertNumber(result.marks, numeralFormat) : "-"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-4 px-5 text-center font-bold text-slate-800">{convertNumber(totalMarks, numeralFormat)}</td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">{convertNumber(totalFullMarks, numeralFormat)}</td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">{convertNumber(percentage, numeralFormat)}%</td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">
                        <span className={statusKey === 'fail' ? 'text-[#EF4444]' : 'text-[#22C55E]'}>
                          {statusText} ({grade})
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-bold text-slate-800">{convertNumber(rank, numeralFormat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-4 print:grid-cols-6">
            <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">মোট শিক্ষার্থী</p>
              <p className="text-xl font-bold text-slate-800">{convertNumber(statistics.total, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#22C55E]/10 rounded-xl text-center border border-[#22C55E]/20">
              <p className="text-xs text-[#22C55E] mb-1">মুমতায</p>
              <p className="text-xl font-bold text-[#22C55E]">{convertNumber(statistics.mumtaz, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#14B8A6]/10 rounded-xl text-center border border-[#14B8A6]/20">
              <p className="text-xs text-[#14B8A6] mb-1">জায়্যিদ জিদ্দান</p>
              <p className="text-xl font-bold text-[#14B8A6]">{convertNumber(statistics.jayyidJiddan, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#0F5C7A]/10 rounded-xl text-center border border-[#0F5C7A]/20">
              <p className="text-xs text-[#0F5C7A] mb-1">জায়্যিদ</p>
              <p className="text-xl font-bold text-[#0F5C7A]">{convertNumber(statistics.jayyid, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#F59E0B]/10 rounded-xl text-center border border-[#F59E0B]/20">
              <p className="text-xs text-[#F59E0B] mb-1">মকবুল</p>
              <p className="text-xl font-bold text-[#F59E0B]">{convertNumber(statistics.maqbul, numeralFormat)}</p>
            </div>
            <div className="p-4 bg-[#EF4444]/10 rounded-xl text-center border border-[#EF4444]/20">
              <p className="text-xs text-[#EF4444] mb-1">রাসেব</p>
              <p className="text-xl font-bold text-[#EF4444]">{convertNumber(statistics.raseb, numeralFormat)}</p>
            </div>
          </div>
        </div>
      ) : (
        selectedExamId && !loading && (
          <div className="card-premium p-12 text-center text-slate-500">
            {role === 'viewer' ? 'ফলাফল এখনও প্রকাশিত হয়নি।' : 'কোন ফলাফল পাওয়া যায়নি।'}
          </div>
        )
      )}
    </div>
  );
};

export default ResultReports;
