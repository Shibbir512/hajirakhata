import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { useStudents } from "../hooks/useStudents";
import { useAttendance } from "../hooks/useAttendance";
import { useStudentAttendance } from "../hooks/useStudentAttendance";
import { useAcademicYears } from "../hooks/useAcademicYears";
import { Plus, Edit, Trash2, Search, Eye, X, Upload, Download, ChevronDown, Calendar, User, CheckCircle, ArrowRight, Users, Printer, MoreHorizontal, Info } from "lucide-react";
import { Student } from "../types";
import { toBengaliNumber, toBengaliDate, toEnglishNumber } from "../utils/dateFormatter";
import clsx from "clsx";
import toast from "react-hot-toast";
import StudentAddModal from "../components/StudentAddModal";
import StudentEditModal from "../components/StudentEditModal";
import CustomFieldsModal from "../components/CustomFieldsModal";
import CsvImportInstructionsModal from "../components/CsvImportInstructionsModal";
import ImageModal from "../components/ImageModal";
import ConfirmationDialog from "../components/ConfirmationDialog";
import StudentPromotionModal from "../components/StudentPromotionModal";
import Papa from "papaparse";
import mammoth from "mammoth";
import Fuse from "fuse.js";

// Bengali character normalization
const normalizeBengali = (text: string) => {
  return text
    .replace(/[\u09BC\u09BE-\u09CD\u09D7]/g, '') // Remove diacritics/matras
    .replace(/[\u0981-\u0983]/g, '') // Remove chandrabindu, anusvara, visarga
    .toLowerCase();
};

const Students: React.FC = () => {
  const navigate = useNavigate();
  const { user, orgId, role, orgName } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { academicYears } = useAcademicYears(orgId, user);
  const { students, addStudent, updateStudent, archiveStudent, permanentDeleteStudent, bulkAddStudents, deleteAllArchivedStudents, promoteStudents } =
    useStudents(orgId, user, role);

  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

  const { attendanceSessions } = useAttendance(orgId, user, classes, students, role, {
    skipFetch: !viewingStudent
  });

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; name: string } | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToPermanentDelete, setStudentToPermanentDelete] = useState<Student | null>(null);
  const [showDeleteAllArchivedModal, setShowDeleteAllArchivedModal] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [isCsvInstructionsModalOpen, setIsCsvInstructionsModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStudentSelection = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedStudents.size === paginatedStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(paginatedStudents.map(s => s.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedStudents.size === 0) return;
    
    // Store size before clearing
    const count = selectedStudents.size;
    
    // Process sequentially or using Promise.all to ensure completion
    const promises = Array.from(selectedStudents).map(studentId => {
      const student = allStudentsList.find(s => s.id === studentId);
      if (student) {
        return archiveStudent(student.id, student.classId);
      }
      return Promise.resolve();
    });
    
    await Promise.all(promises);
    
    setSelectedStudents(new Set());
    toast.success(`${toBengaliNumber(count)} জন শিক্ষার্থীকে আর্কাইভ করা হয়েছে।`);
  };

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedStudents(new Set());
  }, [searchQuery, selectedClassId]);

  const studentAttendance = useStudentAttendance(viewingStudent?.id || "", attendanceSessions);

  const allStudentsList = useMemo(() => {
    let list: Student[] = [];
    if (selectedClassId) {
      list = students[selectedClassId] || [];
    } else {
      list = Object.values(students).flat();
    }
    
    return list.filter(s => showArchived ? (!s.isActive && !s.isAlumni) : s.isActive !== false);
  }, [selectedClassId, students, showArchived]);

  const fuse = useMemo(() => {
    const normalizedStudents = allStudentsList.map(s => {
      const className = classes.find(c => c.id === s.classId)?.name || "";
      return {
        ...s,
        className,
        normalizedName: normalizeBengali(s.name),
        normalizedClassName: normalizeBengali(className),
        normalizedPhone: s.phone ? toEnglishNumber(s.phone) : "",
        normalizedAddress: s.address ? normalizeBengali(s.address) : ""
      };
    });
    return new Fuse(normalizedStudents, {
      keys: ['normalizedName', 'roll', 'normalizedClassName', 'studentUid', 'normalizedPhone', 'normalizedAddress'],
      threshold: 0.3,
    });
  }, [allStudentsList, classes]);

  const filteredStudents = useMemo(() => {
    let list = allStudentsList;
    
    if (searchQuery) {
      const queryStr = searchQuery.trim();
      const normalizedQuery = normalizeBengali(queryStr);
      const englishQuery = toEnglishNumber(queryStr);
      
      const exactMatches = list.filter(s => 
        s.roll.toString().includes(englishQuery) || 
        (s.studentUid && s.studentUid.includes(englishQuery)) ||
        (s.phone && toEnglishNumber(s.phone).includes(englishQuery))
      );
      
      if (exactMatches.length > 0) {
        const exactMatchIds = new Set(exactMatches.map(s => s.id));
        const fuzzyMatches = fuse.search(normalizedQuery)
          .map(result => result.item)
          .filter(item => !exactMatchIds.has(item.id));
          
        list = [...exactMatches, ...fuzzyMatches];
      } else {
        list = fuse.search(normalizedQuery).map(result => result.item);
      }
    }
    
    if (bloodGroupFilter) {
      list = list.filter(s => s.bloodGroup === bloodGroupFilter);
    }
    
    return list;
  }, [fuse, searchQuery, allStudentsList, bloodGroupFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));

  // Ensure current page is valid when total pages or items per page change
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const handleAddStudent = (name: string, fatherName?: string, phone?: string, address?: string, photoUrl?: string, bloodGroup?: string, gender?: string, customFields?: Record<string, string>) => {
    if (selectedClassId) {
      addStudent(selectedClassId, name, fatherName, phone, address, photoUrl, bloodGroup, gender, customFields);
      setIsAddModalOpen(false);
    }
  };

  const handleUpdateStudent = (data: Partial<Student>) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, data);
      setEditingStudent(null);
    }
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedClassId) return;

    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const studentsList = results.data.map((row: any) => {
            // Normalize keys to handle things like "১. নাম (Name)" or "Phone Number"
            const normalizedRow: Record<string, string> = {};
            Object.keys(row).forEach(key => {
              const normalizedKey = key.toLowerCase().replace(/[\d.()]/g, '').trim();
              normalizedRow[normalizedKey] = row[key];
            });

            const name = normalizedRow['নাম'] || normalizedRow['name'] || normalizedRow['শিক্ষার্থীর নাম'] || normalizedRow['student name'] || row['নাম'] || row['Name'] || row['name'];
            const fatherName = normalizedRow['পিতার নাম'] || normalizedRow['fathername'] || normalizedRow['father name'] || normalizedRow['পিতা'] || row['পিতার নাম'] || row['Father Name'] || row['fatherName'];
            const phone = normalizedRow['ফোন নম্বর'] || normalizedRow['ফোন'] || normalizedRow['phone'] || normalizedRow['mobile'] || row['ফোন নম্বর'] || row['Phone'] || row['phone'];
            const address = normalizedRow['ঠিকানা'] || normalizedRow['address'] || row['ঠিকানা'] || row['Address'] || row['address'];
            const bloodGroup = normalizedRow['রক্তের গ্রুপ'] || normalizedRow['bloodgroup'] || normalizedRow['blood group'] || normalizedRow['blood'] || row['রক্তের গ্রুপ'] || row['Blood Group'] || row['bloodGroup'];

            // Check if any recognized header was found
            const hasRecognizedHeader = name || fatherName || phone || address || bloodGroup;

            // If headers don't match at all, fallback to values array
            const values = Object.values(row) as string[];
            
            let finalPhone = (phone || (!hasRecognizedHeader ? values[2] : "") || "").trim();
            let finalAddress = (address || (!hasRecognizedHeader ? values[3] : "") || "").trim();
            
            // Smart swap if finalPhone contains letters and finalAddress looks like a phone number
            // Also handle Bengali numbers
            const isNumeric = (str: string) => /^[\d\u09E6-\u09EF\+\-\s()]+$/.test(str.trim());
            const hasLetters = (str: string) => /[a-zA-Z\u0980-\u09E5\u09F0-\u09FF]/.test(str);
            
            // If phone has letters (like "ঢাকা") OR address is purely numeric (like "01712345678")
            if ((hasLetters(finalPhone) && isNumeric(finalAddress)) || (!isNumeric(finalPhone) && isNumeric(finalAddress))) {
               const temp = finalPhone;
               finalPhone = finalAddress;
               finalAddress = temp;
            }

            return {
              name: (name || (!hasRecognizedHeader ? values[0] : "") || "").trim(),
              fatherName: (fatherName || (!hasRecognizedHeader ? values[1] : "") || "").trim(),
              phone: finalPhone,
              address: finalAddress,
              bloodGroup: (bloodGroup || (!hasRecognizedHeader ? values[4] : "") || "").trim(),
            };
          }).filter(s => s.name && s.name !== "");
          
          bulkAddStudents(selectedClassId, studentsList);
        },
      });
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const lines = result.value.split("\n");
      const studentsList = lines.map(line => {
        const [name, fatherName, phone, address, bloodGroup] = line.split(",");
        return { 
          name: name?.trim(), 
          fatherName: fatherName?.trim(), 
          phone: phone?.trim(), 
          address: address?.trim(),
          bloodGroup: bloodGroup?.trim()
        };
      }).filter(s => s.name);
      bulkAddStudents(selectedClassId, studentsList);
    } else {
      toast.error("Unsupported file type. Please upload a CSV or DOCX file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = async (format: 'csv' | 'docx') => {
    if (format === 'csv') {
      const csvData = allStudentsList.map(s => ({
        'শিক্ষার্থী আইডি': s.studentUid || 'N/A',
        'নাম': s.name,
        'রোল': s.roll,
        'শ্রেণি': classes.find(c => c.id === s.classId)?.name || "N/A",
        'ফোন নম্বর': s.phone || 'N/A',
        'ঠিকানা': s.address || 'N/A',
        'রক্তের গ্রুপ': s.bloodGroup || 'N/A'
      }));
      
      const csv = Papa.unparse(csvData);
      // Add UTF-8 BOM for Excel to correctly display Bengali characters
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students_list.csv';
      a.click();
    } else if (format === 'docx') {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: "Student List", heading: "Heading1" }),
            ...allStudentsList.map(s => new Paragraph({
              children: [
                new TextRun({ text: `${s.roll}. ${s.name} (${classes.find(c => c.id === s.classId)?.name || "N/A"})`, bold: true }),
                new TextRun({ text: `\nFather: ${s.fatherName || "N/A"} | Phone: ${s.phone || "N/A"} | Address: ${s.address || "N/A"}\n\n` })
              ]
            }))
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students.docx';
      a.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Pop-up blocker is preventing printing. Please allow pop-ups for this site.");
      return;
    }

    const className = selectedClassId ? classes.find(c => c.id === selectedClassId)?.name : 'সকল শিক্ষার্থী';
    
    // Sort students by roll number for printing
    const sortedStudents = [...filteredStudents].sort((a, b) => a.roll - b.roll);

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
        <head>
          <meta charset="UTF-8">
          <title>শিক্ষার্থীর তালিকা - ${className}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 20px; }
            h1 { margin: 0 0 5px 0; font-size: 24px; }
            h2 { margin: 0; font-size: 18px; color: #444; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 14px; }
            th { background-color: #f4f4f4; font-weight: bold; }
            @media print {
              @page { margin: 15mm; }
              body { padding: 0; }
              th { background-color: #f4f4f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${orgName || 'প্রতিষ্ঠান'}</h1>
            <h2>শ্রেণি: ${className}</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%;">রোল</th>
                <th style="width: 20%;">ইউনিক আইডি</th>
                <th style="width: 35%;">নাম</th>
                <th style="width: 35%;">পিতার নাম</th>
              </tr>
            </thead>
            <tbody>
              ${sortedStudents.map(s => `
                <tr>
                  <td>${toBengaliNumber(s.roll)}</td>
                  <td>${s.studentUid ? toBengaliNumber(s.studentUid) : '-'}</td>
                  <td>${s.name}</td>
                  <td>${s.fatherName || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const isAssignedTeacher = selectedClass?.teacherIds?.includes(user?.uid || "") || false;
  const canManageStudents = role === 'admin' || role === 'super_admin' || isAssignedTeacher;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {selectedStudents.size > 0 && canManageStudents && (
          <button
            onClick={handleDeleteSelected}
            className="btn-primary w-full md:w-auto whitespace-nowrap !h-[44px] !py-2"
          >
            <Trash2 className="w-4 h-4" />
            মুছে ফেলুন ({toBengaliNumber(selectedStudents.size)})
          </button>
          )}
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 w-full md:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .docx"
            className="hidden"
          />
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={!selectedClassId || !canManageStudents}
            className={clsx(
              "btn-primary w-full md:w-auto whitespace-nowrap !h-[44px] !py-2",
              (!selectedClassId || !canManageStudents) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
            শিক্ষার্থী যোগ
          </button>
          {role === "admin" && (
            <button
              onClick={() => setIsCustomFieldsModalOpen(true)}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full md:w-auto whitespace-nowrap !h-[44px] !py-2"
            >
              <Plus className="w-4 h-4" />
              অতিরিক্ত ফিল্ড
            </button>
          )}
          
          {/* Desktop version (hidden on mobile) */}
          <div className="hidden md:flex flex-wrap gap-3">
            <button
              onClick={() => setIsPromotionModalOpen(true)}
              disabled={!selectedClassId || !canManageStudents || allStudentsList.filter(s => s.isActive !== false).length === 0}
              className={clsx(
                "btn-primary whitespace-nowrap !h-[44px] !py-2",
                (!selectedClassId || !canManageStudents || allStudentsList.filter(s => s.isActive !== false).length === 0) && "opacity-50 cursor-not-allowed"
              )}
            >
              <ArrowRight className="w-4 h-4" />
              প্রমোশন
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!selectedClassId || !canManageStudents}
              className={clsx(
                "btn-primary whitespace-nowrap !h-[44px] !py-2",
                (!selectedClassId || !canManageStudents) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Upload className="w-4 h-4" />
              CSV আমদানি
            </button>
            <button
              onClick={() => setIsCsvInstructionsModalOpen(true)}
              className="btn-primary whitespace-nowrap !h-[44px] !py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200"
              title="CSV আমদানির নিয়মাবলী"
            >
              <Info className="w-4 h-4" />
              নিয়মাবলী
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={allStudentsList.length === 0}
              className={clsx(
                "btn-primary whitespace-nowrap !h-[44px] !py-2",
                (allStudentsList.length === 0) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Download className="w-4 h-4" />
              CSV এক্সপোর্ট
            </button>
            <button
              onClick={() => handleExport('docx')}
              disabled={allStudentsList.length === 0}
              className={clsx(
                "btn-primary whitespace-nowrap !h-[44px] !py-2",
                (allStudentsList.length === 0) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Download className="w-4 h-4" />
              DOCX এক্সপোর্ট
            </button>
            <button
              onClick={handlePrint}
              disabled={allStudentsList.length === 0}
              className={clsx(
                "btn-primary whitespace-nowrap !h-[44px] !py-2",
                (allStudentsList.length === 0) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট করুন
            </button>
          </div>

          {/* Mobile version (dropdown) */}
          <div className="md:hidden relative" ref={actionMenuRef}>
            <button
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className="btn-primary w-full whitespace-nowrap !h-[44px] !py-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <MoreHorizontal className="w-5 h-5" />
              আরও
            </button>
            
            {isActionMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col p-2 gap-1 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => { setIsPromotionModalOpen(true); setIsActionMenuOpen(false); }}
                  disabled={!selectedClassId || !canManageStudents || allStudentsList.filter(s => s.isActive !== false).length === 0}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg text-left transition-colors",
                    (!selectedClassId || !canManageStudents || allStudentsList.filter(s => s.isActive !== false).length === 0) 
                      ? "opacity-50 cursor-not-allowed text-slate-400" 
                      : "text-slate-700 hover:bg-slate-50 hover:text-[#0F5C7A]"
                  )}
                >
                  <ArrowRight className="w-4 h-4" />
                  প্রমোশন
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setIsActionMenuOpen(false); }}
                  disabled={!selectedClassId || !canManageStudents}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg text-left transition-colors",
                    (!selectedClassId || !canManageStudents) 
                      ? "opacity-50 cursor-not-allowed text-slate-400" 
                      : "text-slate-700 hover:bg-slate-50 hover:text-[#0F5C7A]"
                  )}
                >
                  <Upload className="w-4 h-4" />
                  CSV আমদানি
                </button>
                <button
                  onClick={() => { setIsCsvInstructionsModalOpen(true); setIsActionMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg text-left transition-colors text-indigo-600 hover:bg-indigo-50"
                >
                  <Info className="w-4 h-4" />
                  CSV আমদানির নিয়মাবলী
                </button>
                <button
                  onClick={() => { handleExport('csv'); setIsActionMenuOpen(false); }}
                  disabled={allStudentsList.length === 0}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg text-left transition-colors",
                    (allStudentsList.length === 0) 
                      ? "opacity-50 cursor-not-allowed text-slate-400" 
                      : "text-slate-700 hover:bg-slate-50 hover:text-[#0F5C7A]"
                  )}
                >
                  <Download className="w-4 h-4" />
                  CSV এক্সপোর্ট
                </button>
                <button
                  onClick={() => { handleExport('docx'); setIsActionMenuOpen(false); }}
                  disabled={allStudentsList.length === 0}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg text-left transition-colors",
                    (allStudentsList.length === 0) 
                      ? "opacity-50 cursor-not-allowed text-slate-400" 
                      : "text-slate-700 hover:bg-slate-50 hover:text-[#0F5C7A]"
                  )}
                >
                  <Download className="w-4 h-4" />
                  DOCX এক্সপোর্ট
                </button>
                <button
                  onClick={() => { handlePrint(); setIsActionMenuOpen(false); }}
                  disabled={allStudentsList.length === 0}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg text-left transition-colors",
                    (allStudentsList.length === 0) 
                      ? "opacity-50 cursor-not-allowed text-slate-400" 
                      : "text-slate-700 hover:bg-slate-50 hover:text-[#0F5C7A]"
                  )}
                >
                  <Printer className="w-4 h-4" />
                  প্রিন্ট করুন
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      <div className="card-premium p-8 border-[#0aa7a7]">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative min-w-[240px]">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-[18px] font-bold text-center text-[#0a7e7d] bg-[#fbfbfb] border-2 border-[#0b9a89] appearance-none pr-10 rounded-xl py-3 shadow-sm focus:border-[#0b9a89] focus:ring-2 focus:ring-[#0b9a89]/20 transition-all"
            >
              <option value="" className="text-slate-500 font-normal">শ্রেণি নির্বাচন করুন</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>

          <div className="relative flex-1 bg-[#fbfbfb]">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="নাম, রোল, ফোন বা ঠিকানা দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium w-full text-base font-medium text-slate-700 bg-white pl-12 rounded-xl py-3 shadow-sm hover:border-[#0F5C7A]/30 focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
            />
          </div>

          <div className="relative bg-[#fbfbfb]">
            <select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              className="w-full h-[52px] border border-[#D1D5DB] rounded-xl bg-white px-4 focus:border-[#0F5C7A] outline-none appearance-none text-slate-700 font-medium"
            >
              <option value="">সব রক্তের গ্রুপ</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-sm font-medium text-slate-600 cursor-pointer flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={showArchived} 
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-slate-300 text-[#0F5C7A] focus:ring-[#0F5C7A]"
                />
                আর্কাইভ করা শিক্ষার্থী দেখুন
              </label>
            </div>
            {showArchived && role === 'admin' && (
              <button
                onClick={() => setShowDeleteAllArchivedModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors text-sm font-bold whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                সকল আর্কাইভ মুছুন
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.05)] border border-[#E5E7EB]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10">
              <tr>
                <th className="py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  <input
                    type="checkbox"
                    checked={selectedStudents.size === paginatedStudents.length && paginatedStudents.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded border-slate-300 text-[#0F5C7A] focus:ring-[#0F5C7A]"
                  />
                </th>
                <th className="py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  রোল
                </th>
                <th className="py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  আইডি
                </th>
                <th className="py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  শিক্ষার্থীর নাম
                </th>
                <th className="py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  শ্রেণি
                </th>
                <th className="py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB] hidden md:table-cell">
                  ফোন
                </th>
                <th className="py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB] hidden lg:table-cell">
                  ঠিকানা
                </th>
                <th className="py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB] hidden lg:table-cell">
                  রক্তের গ্রুপ
                </th>
                <th className="text-right py-4 px-3 text-[12px] font-semibold text-slate-500 uppercase tracking-wider border-b border-[#E5E7EB]">
                  কার্যক্রম
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => (
                <tr
                  key={student.id}
                  className={clsx(
                    "border-b border-[#E5E7EB] hover:bg-slate-50 transition-all duration-200 group",
                    selectedStudents.has(student.id) && "bg-[#0F5C7A]/5"
                  )}
                  style={{ height: '72px' }}
                >
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="rounded border-slate-300 text-[#0F5C7A] focus:ring-[#0F5C7A]"
                    />
                  </td>
                  <td className="py-2 px-3 text-slate-800 font-bold">{toBengaliNumber(student.roll)}</td>
                  <td className="py-2 px-3 text-[#0F5C7A] font-mono text-[13px] font-semibold">{student.studentUid || "-"}</td>
                  <td className="py-2 px-3 text-slate-800 font-medium">
                    <button 
                      onClick={() => navigate(`/student-profile/${student.id}`)}
                      className="flex items-center gap-3 text-[14px] hover:text-[#0F5C7A] transition-colors text-left"
                    >
                      {student.photoUrl ? (
                        <img 
                          src={student.photoUrl} 
                          alt={student.name} 
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform" 
                          referrerPolicy="no-referrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingImage({ url: student.photoUrl!, name: student.name });
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#0F5C7A]/10 flex items-center justify-center text-[#0F5C7A] font-bold text-xs flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                      )}
                      <span className="line-clamp-2">{student.name}</span>
                    </button>
                  </td>
                  <td className="py-2 px-3 text-slate-600 text-[14px] whitespace-nowrap">
                    {classes.find(c => c.id === student.classId)?.name || "N/A"}
                  </td>
                  <td className="py-2 px-3 text-slate-500 text-[14px] hidden md:table-cell whitespace-nowrap">
                    {student.phone || "-"}
                  </td>
                  <td className="py-2 px-3 text-slate-500 text-[14px] hidden lg:table-cell max-w-[150px] truncate" title={student.address}>
                    {student.address || "-"}
                  </td>
                  <td className="py-2 px-3 text-slate-500 text-[14px] hidden lg:table-cell whitespace-nowrap">
                    {student.bloodGroup ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                        {student.bloodGroup}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewingStudent(student)}
                        className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-lg transition-colors"
                        title="বিস্তারিত দেখুন"
                      >
                        <Eye className="w-4 h-4" strokeWidth={2} />
                      </button>
                      {canManageStudents && (
                        <>
                          <button
                            onClick={() => setEditingStudent(student)}
                            className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-lg transition-colors"
                            title="সম্পাদনা"
                          >
                            <Edit className="w-4 h-4" strokeWidth={2} />
                          </button>
                          {student.isActive === false ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  updateStudent(student.id, { isActive: true }, student.version);
                                  toast.success(`${student.name}-কে পুনরায় সক্রিয় করা হয়েছে।`);
                                }}
                                className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                title="পুনরায় সক্রিয় করুন"
                              >
                                <CheckCircle className="w-4 h-4" strokeWidth={2} />
                              </button>
                              {role === 'admin' && (
                                <button
                                  onClick={() => setStudentToPermanentDelete(student)}
                                  className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                  title="স্থায়ীভাবে মুছুন"
                                >
                                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteStudent(student)}
                              className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                              title="আর্কাইভ করুন"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={2} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    কোন শিক্ষার্থী পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages >= 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-sm text-slate-500">
                দেখানো হচ্ছে <span className="font-medium text-slate-700">{toBengaliNumber(filteredStudents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0)}</span> থেকে <span className="font-medium text-slate-700">{toBengaliNumber(Math.min(currentPage * itemsPerPage, filteredStudents.length))}</span> পর্যন্ত, মোট <span className="font-medium text-slate-700">{toBengaliNumber(filteredStudents.length)}</span> জন শিক্ষার্থী
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">প্রতি পাতায়:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {[5, 10, 20, 50, 100].map(val => (
                    <option key={val} value={val}>{toBengaliNumber(val)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                পূর্ববর্তী
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show current, first, last, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={clsx(
                          "w-9 h-9 rounded-xl text-sm transition-all duration-300",
                          currentPage === page
                            ? "bg-[#0F5C7A] text-white shadow-sm font-bold"
                            : "text-slate-600 hover:bg-slate-100 font-medium"
                        )}
                      >
                        {toBengaliNumber(page)}
                      </button>
                    );
                  }
                  // Show ellipsis
                  if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="px-2 text-slate-400">...</span>;
                  }
                  return null;
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                পরবর্তী
              </button>
            </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <StudentAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddStudent}
        />
      )}

      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={handleUpdateStudent}
        />
      )}

      {viewingStudent && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-center items-start sm:items-center bg-black/35 backdrop-blur-[6px] p-4 overflow-y-auto">
          <div className="w-[92%] max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden my-auto">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex-shrink-0 flex items-center justify-between px-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">বিস্তারিত</h3>
                  <p className="text-xs text-white/80">শিক্ষার্থীর তথ্য</p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="flex items-center gap-4 bg-[#F4F7FB] p-4 rounded-[16px] border border-[#E5E7EB]">
                {viewingStudent.photoUrl ? (
                  <img src={viewingStudent.photoUrl} alt={viewingStudent.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#0F5C7A]/10 flex items-center justify-center text-[#0F5C7A] font-bold text-2xl border-2 border-white shadow-sm">
                    {viewingStudent.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-[16px] font-bold text-[#1F2937] mb-1">{viewingStudent.name}</h4>
                  <p className="text-[14px] text-[#6B7280]">রোল: {toBengaliNumber(viewingStudent.roll)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white p-3 rounded-[16px] border border-[#E5E7EB]">
                  <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">পিতার নাম</p>
                  <p className="text-[14px] text-[#1F2937] font-medium">{viewingStudent.fatherName || "-"}</p>
                </div>
                <div className="bg-white p-3 rounded-[16px] border border-[#E5E7EB]">
                  <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">ফোন নম্বর</p>
                  <p className="text-[14px] text-[#1F2937] font-medium">{viewingStudent.phone || "-"}</p>
                </div>
                <div className="bg-white p-3 rounded-[16px] border border-[#E5E7EB]">
                  <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">রক্তের গ্রুপ</p>
                  <p className="text-[14px] text-[#1F2937] font-medium">{viewingStudent.bloodGroup || "-"}</p>
                </div>
                <div className="bg-white p-3 rounded-[16px] border border-[#E5E7EB]">
                  <p className="text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">ঠিকানা</p>
                  <p className="text-[14px] text-[#1F2937] font-medium">{viewingStudent.address || "-"}</p>
                </div>
              </div>
              
              {/* Attendance */}
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
            
            {/* Footer */}
            <div className="p-5 border-t border-[#E5E7EB] flex-shrink-0 flex gap-3">
              <button
                onClick={() => {
                  setEditingStudent(viewingStudent);
                  setViewingStudent(null);
                }}
                className="flex-1 bg-emerald-600 text-white h-[48px] rounded-[14px] font-bold hover:bg-emerald-700 transition-colors"
              >
                সম্পাদনা
              </button>
              <button
                onClick={() => setViewingStudent(null)}
                className="flex-1 bg-slate-100 text-slate-700 h-[48px] rounded-[14px] font-bold hover:bg-slate-200 transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {studentToDelete && (
        <ConfirmationDialog
          isOpen={!!studentToDelete}
          onClose={() => setStudentToDelete(null)}
          onConfirm={() => {
            if (studentToDelete) {
              archiveStudent(studentToDelete.id, studentToDelete.classId);
            }
            setStudentToDelete(null);
          }}
          title="শিক্ষার্থী আর্কাইভ করুন"
          message={`আপনি কি নিশ্চিত যে শিক্ষার্থী ${studentToDelete.name}-কে আর্কাইভ করতে চান? আর্কাইভ করলে তার আগের সব রেকর্ড (হাজিরা, ফলাফল) সংরক্ষিত থাকবে কিন্তু সে বর্তমান তালিকা থেকে সরে যাবে।`}
        />
      )}

      {studentToPermanentDelete && (
        <ConfirmationDialog
          isOpen={!!studentToPermanentDelete}
          onClose={() => setStudentToPermanentDelete(null)}
          onConfirm={() => {
            if (studentToPermanentDelete) {
              permanentDeleteStudent(studentToPermanentDelete.id, studentToPermanentDelete.classId);
            }
            setStudentToPermanentDelete(null);
          }}
          title="স্থায়ীভাবে মুছে ফেলুন"
          message={`আপনি কি নিশ্চিত যে শিক্ষার্থী ${studentToPermanentDelete.name}-কে স্থায়ীভাবে মুছে ফেলতে চান? এটি করলে তার হাজিরা এবং ফলাফল সহ যাবতীয় রেকর্ড চিরতরে মুছে যাবে এবং তা আর ফিরে পাওয়া যাবে না।`}
        />
      )}

      {showDeleteAllArchivedModal && (
        <ConfirmationDialog
          isOpen={showDeleteAllArchivedModal}
          onClose={() => setShowDeleteAllArchivedModal(false)}
          onConfirm={() => {
            deleteAllArchivedStudents();
            setShowDeleteAllArchivedModal(false);
          }}
          title="সকল আর্কাইভ করা শিক্ষার্থী মুছুন"
          message="আপনি কি নিশ্চিত যে আপনি আর্কাইভ করা সকল শিক্ষার্থীকে স্থায়ীভাবে মুছে ফেলতে চান? এটি করলে তাদের হাজিরা এবং ফলাফল সহ যাবতীয় রেকর্ড চিরতরে মুছে যাবে এবং তা আর ফিরে পাওয়া যাবে না।"
        />
      )}

      {isPromotionModalOpen && selectedClassId && (
        <StudentPromotionModal
          isOpen={isPromotionModalOpen}
          onClose={() => setIsPromotionModalOpen(false)}
          sourceClassId={selectedClassId}
          classes={classes}
          academicYears={academicYears}
          students={allStudentsList}
          onPromote={promoteStudents}
        />
      )}

      {isCustomFieldsModalOpen && orgId && (
        <CustomFieldsModal
          isOpen={isCustomFieldsModalOpen}
          onClose={() => setIsCustomFieldsModalOpen(false)}
          orgId={orgId}
        />
      )}

      {isCsvInstructionsModalOpen && (
        <CsvImportInstructionsModal
          isOpen={isCsvInstructionsModalOpen}
          onClose={() => setIsCsvInstructionsModalOpen(false)}
        />
      )}

      {viewingImage && (
        <ImageModal
          isOpen={!!viewingImage}
          onClose={() => setViewingImage(null)}
          imageUrl={viewingImage.url}
          title={viewingImage.name}
        />
      )}
    </div>
  );
};

export default Students;
