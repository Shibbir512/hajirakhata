import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Result, Student, Subject, Exam, AcademicYear, ClassData } from "../types";
import { calculateResultMetrics } from "../utils/resultCalculations";
import { convertNumber } from "../utils/numeralConverter";
import { formatAcademicYear } from "../utils/dateFormatter";
import { Printer, Download, ArrowLeft, Search, ArrowUpDown, Filter, ChevronUp, ChevronDown, FileText } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } from "docx";

const PublicClassResult: React.FC = () => {
  const { orgId, yearId, classId, examId } = useParams<{ orgId: string; yearId: string; classId: string; examId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradingSystem, setGradingSystem] = useState<'madrasa' | 'general'>('madrasa');
  
  const [numeralFormat, setNumeralFormat] = useState<'bn' | 'ar' | 'en'>('en');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'roll' | 'rank' | 'percentage' | 'totalMarks'>('roll');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [printSize, setPrintSize] = useState<'A4 landscape' | 'A4 portrait' | 'legal landscape'>('A4 landscape');
  const [printMargin, setPrintMargin] = useState('10mm');

  const [reportHeader, setReportHeader] = useState({
    orgName: "",
    address: "",
    examTitle: "",
    academicYearText: "",
    classNameText: "",
    publishDate: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId || !yearId || !classId || !examId) return;
      setLoading(true);
      try {
        // 1. Fetch Org Info
        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        const orgName = orgSnap.exists() ? orgSnap.data().name : "";
        if (orgSnap.exists() && orgSnap.data().gradingSystem) {
          setGradingSystem(orgSnap.data().gradingSystem);
        }

        // 2. Fetch Students in class
        const studentsRef = collection(db, `organizations/${orgId}/students`);
        const studentsSnap = await getDocs(query(studentsRef, where("classId", "==", classId)));
        const loadedStudents = studentsSnap.docs.map(doc => doc.data() as Student).filter(s => s.isActive !== false).sort((a, b) => a.roll - b.roll);
        setStudents(loadedStudents);

        // 3. Fetch Results (only published)
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const resultQuery = query(
          resultsRef,
          where("academic_year_id", "==", yearId),
          where("class_id", "==", classId),
          where("exam_id", "==", examId),
          where("status", "==", "published")
        );
        const resultSnap = await getDocs(resultQuery);
        const loadedResults = resultSnap.docs.map(doc => doc.data() as Result);
        setAllResults(loadedResults);

        if (loadedResults.length === 0) {
          toast.error("এই পরীক্ষার কোনো ফলাফল এখনো প্রকাশিত হয়নি।");
          navigate(-1);
          return;
        }

        // 4. Fetch Subjects for the class
        const subjectsRef = collection(db, `organizations/${orgId}/subjects`);
        const subjectsSnap = await getDocs(query(subjectsRef, where("classId", "==", classId)));
        const loadedSubjects = subjectsSnap.docs.map(doc => doc.data() as Subject).sort((a, b) => a.subjectOrder - b.subjectOrder);
        setSubjects(loadedSubjects);

        // 5. Fetch Exam, Year, Class
        const [examSnap, yearSnap, classSnap] = await Promise.all([
          getDoc(doc(db, `organizations/${orgId}/exams`, examId)),
          getDoc(doc(db, `organizations/${orgId}/academic_years`, yearId)),
          getDoc(doc(db, `organizations/${orgId}/classes`, classId))
        ]);

        const examData = examSnap.exists() ? (examSnap.data() as Exam) : null;
        const yearData = yearSnap.exists() ? (yearSnap.data() as AcademicYear) : null;
        const classData = classSnap.exists() ? (classSnap.data() as ClassData) : null;

        // 6. Fetch report header
        const headerRef = doc(db, `organizations/${orgId}/report_configs`, `${yearId}_${examId}_${classId}`);
        const headerSnap = await getDoc(headerRef);
        if (headerSnap.exists()) {
          setReportHeader(headerSnap.data() as any);
        } else {
          setReportHeader({
            orgName: orgName || "প্রতিষ্ঠানের নাম",
            address: "",
            examTitle: `${examData?.name || ""} পরীক্ষার ফলাফল`,
            academicYearText: `শিক্ষাবর্ষ: ${formatAcademicYear(yearData)}`,
            classNameText: `জামাত: ${classData?.name || ""}`,
            publishDate: `ফলাফল প্রকাশের তারিখ: ${new Date().toLocaleDateString('bn-BD')}`
          });
        }

      } catch (error: any) {
        console.error("Fetch error:", error);
        toast.error("তথ্য লোড করতে সমস্যা হয়েছে।");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, yearId, classId, examId, navigate]);

  const allStudentMetrics = useMemo(() => {
    return students.map(student => {
      const studentResults = allResults.filter(r => r.student_id === student.id);
      const totalMarks = studentResults.reduce((sum, r) => sum + r.marks, 0);
      
      const hasFailed = subjects.some(subject => {
        const result = studentResults.find(r => r.subject_id === subject.id);
        const marks = result ? result.marks : 0;
        return marks < subject.passMarks;
      });
      
      return { studentId: student.id, totalMarks, hasFailed };
    });
  }, [students, allResults, subjects]);

  const statistics = useMemo(() => {
    const stats = {
      total: students.length,
      mumtaz: 0,
      jayyidJiddan: 0,
      jayyid: 0,
      maqbul: 0,
      raseb: 0
    };

    students.forEach(student => {
      const studentResults = allResults.filter(r => r.student_id === student.id);
      const { grade } = calculateResultMetrics(studentResults, subjects, allStudentMetrics, gradingSystem);
      if (grade === "মুমতায") stats.mumtaz++;
      else if (grade === "জায়্যিদ জিদ্দান") stats.jayyidJiddan++;
      else if (grade === "জায়্যিদ") stats.jayyid++;
      else if (grade === "মকবুল") stats.maqbul++;
      else if (grade === "রাসেব") stats.raseb++;
    });

    return stats;
  }, [students, allResults, subjects, allStudentMetrics]);

  const processedResults = useMemo(() => {
    const data = students.map(student => {
      const studentResults = allResults.filter(r => r.student_id === student.id);
      const metrics = calculateResultMetrics(studentResults, subjects, allStudentMetrics, gradingSystem);
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
  }, [students, allResults, subjects, allStudentMetrics, sortBy, sortOrder, searchTerm, statusFilter]);

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToPDF = async () => {
    const toastId = toast.loading("PDF তৈরি হচ্ছে...");
    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for React to render loading state

      const input = document.getElementById('tabulation-sheet-container');
      if (!input) throw new Error("Tabulation sheet container not found");

      const originalWidth = input.style.width;
      const originalMaxWidth = input.style.maxWidth;
      const originalPosition = input.style.position;
      
      const overflowDiv = input.querySelector('.overflow-x-auto') as HTMLElement;
      let originalOverflowChild = '';
      if (overflowDiv) {
        originalOverflowChild = overflowDiv.style.overflow;
        overflowDiv.style.overflow = 'visible';
      }

      input.style.width = 'max-content';
      input.style.maxWidth = 'none';
      input.style.position = 'absolute';
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const width = input.scrollWidth;
      const height = input.scrollHeight;

      const canvas = await toCanvas(input, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: width,
        height: height,
        style: {
          height: 'auto',
          maxHeight: 'none',
          overflow: 'visible',
          position: 'absolute',
          top: '0',
          left: '0',
          width: width + 'px',
        }
      });
      
      input.style.width = originalWidth;
      input.style.maxWidth = originalMaxWidth;
      input.style.position = originalPosition;
      if (overflowDiv) {
        overflowDiv.style.overflow = originalOverflowChild;
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF("l", "mm", "a4");
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save("tabulation_sheet.pdf");
      toast.success("PDF ডাউনলোড সফল হয়েছে!", { id: toastId });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("PDF ডাউনলোড করতে ব্যর্থ হয়েছে।", { id: toastId });
    }
  };

  const exportToDOCX = async () => {
    const tableRows = processedResults.map(({ student, metrics }) => {
      const { totalMarks, totalFullMarks, percentage, grade, rank, statusKey } = metrics;
      const statusText = statusKey === 'pass' ? 'Pass' : 'Fail';
      const cells = [
        student.roll, 
        student.name, 
        ...subjects.map(s => {
          const result = allResults.find(r => r.student_id === student.id && r.subject_id === s.id);
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
              new TableRow({ children: ["রোল", "নাম", ...subjects.map(s => s.name), "মোট", "পূর্ণমান", "শতকরা", "বিভাগ", "মেধাক্রম"].map(text => new TableCell({ children: [new Paragraph({ text: String(text) })] })) }),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#0F5C7A]/20 border-t-[#0F5C7A] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <style>
        {`
          @media print {
            @page { size: ${printSize}; margin: ${printMargin}; }
          }
        `}
      </style>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-[#0F5C7A] transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              ফিরে যান
            </button>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#0F5C7A]" />
              ফলাফল
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden w-full sm:w-auto">
            <select value={printSize} onChange={(e) => setPrintSize(e.target.value as any)} className="input-premium h-9 py-1 text-sm bg-white border-slate-200" title="প্রিন্ট সাইজ">
              <option value="A4 landscape">A4 Landscape</option>
              <option value="A4 portrait">A4 Portrait</option>
              <option value="legal landscape">Legal Landscape</option>
            </select>
            <select value={printMargin} onChange={(e) => setPrintMargin(e.target.value)} className="input-premium h-9 py-1 text-sm bg-white border-slate-200" title="প্রিন্ট মার্জিন">
              <option value="10mm">সাধারন মার্জিন (10mm)</option>
              <option value="5mm">চিকন মার্জিন (5mm)</option>
              <option value="15mm">চওড়া মার্জিন (15mm)</option>
            </select>
            <select value={numeralFormat} onChange={(e) => setNumeralFormat(e.target.value as any)} className="input-premium h-9 py-1 text-sm">
              <option value="en">English (0-9)</option>
              <option value="bn">Bengali (০-৯)</option>
              <option value="ar">Arabic (٠-٩)</option>
            </select>
            {allResults.length > 0 && (
              <>
                <button onClick={handlePrint} className="btn-secondary h-9 px-3 text-sm">
                  <Printer className="w-4 h-4" />
                  প্রিন্ট করুন
                </button>
                <button onClick={exportToDOCX} className="btn-secondary h-9 px-3 text-sm">
                  <Download className="w-4 h-4" />
                  DOCX
                </button>
                <button onClick={exportToPDF} className="btn-secondary h-9 px-3 text-sm">
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </>
            )}
          </div>
        </div>

        {allResults.length > 0 && (
          <div className="card-premium p-6 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        )}

        {allResults.length > 0 ? (
          <div id="tabulation-sheet-container" className="card-premium p-8 print:shadow-none print:border-none print:p-0 bg-white">
            <div className="text-center mb-8">
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
                    {subjects.map(subject => (
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
                    const { totalMarks, totalFullMarks, percentage, grade, rank, statusKey } = metrics;
                    
                    const rankNum = parseInt(rank);
                    const isTop3 = !isNaN(rankNum) && rankNum <= 3;
                    const statusText = statusKey === 'pass' ? 'কৃতকার্য' : 'অকৃতকার্য';

                    return (
                      <tr key={student.id} className={`border-b border-[#E5E7EB] print:border-black hover:bg-gray-50 transition-all duration-200 print:hover:bg-transparent ${isTop3 ? 'bg-yellow-50' : ''}`}>
                        <td className="py-4 px-5 text-slate-800 font-medium sticky left-0 bg-white z-10">{convertNumber(student.roll, numeralFormat)}</td>
                        <td className="py-4 px-5 text-slate-800 sticky left-[80px] bg-white z-10">{student.name}</td>
                        {subjects.map(subject => {
                          const result = allResults.find(r => r.student_id === student.id && r.subject_id === subject.id);
                          const isFail = !result || result.marks < subject.passMarks;

                          return (
                            <td key={subject.id} className="py-4 px-5 text-center">
                              <span className={isFail ? "text-rose-600 font-bold" : "text-slate-700"}>
                                {result ? convertNumber(result.marks, numeralFormat) : "-"}
                              </span>
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
            
            <div className="mt-12 text-center text-slate-400 text-xs italic">
              * এটি একটি অনলাইন ফলাফল তালিকা। বিস্তারিত তথ্যের জন্য মাদরাসা অফিসে যোগাযোগ করুন।
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PublicClassResult;
