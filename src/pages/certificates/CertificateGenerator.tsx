import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Printer,
  Download,
  RefreshCw,
  Loader2,
  User,
  Users,
  FileText,
  Sparkles,
  CheckCircle2,
  Eye,
  Edit3,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import DatePicker from "react-datepicker";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useAuth } from "../../hooks/useAuth";
import { useClasses } from "../../hooks/useClasses";
import { useStudents } from "../../hooks/useStudents";
import { useAcademicYears } from "../../hooks/useAcademicYears";
import { useCertificates } from "../../hooks/useCertificates";
import {
  CertificatePadSettings,
  CertificateTemplateStyle,
  CertificateType,
} from "../../types";
import {
  CERTIFICATE_TYPE_META,
  TEMPLATE_STYLE_OPTIONS,
  buildCertificateBody,
  generateNextMemoNumber,
  getTodayDDMMYYYY,
} from "../../utils/certificateTemplates";
import {
  formatAcademicYear,
  toBengaliNumber,
} from "../../utils/dateFormatter";
import { ClassSelect } from "../../components/ClassSelect";
import { CertificateFrame } from "../../components/certificates/CertificateFrame";
import { generateCertificatePdfBlob } from "../../utils/certificatePdf";

const VALID_TYPES: CertificateType[] = [
  "testimonial",
  "bonafide",
  "transfer",
  "merit",
];

const parseDDMMYYYYToDate = (str: string): Date => {
  if (!str) return new Date();
  const parts = str.split(/[\s-]+/).map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date();
};

const formatDateToDDMMYYYY = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
};

const CertificateGenerator: React.FC = () => {
  const { type: routeType } = useParams<{ type?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const editId = searchParams.get("editId");
  const paramStudentId = searchParams.get("studentId");
  const paramClassId = searchParams.get("classId");

  const { user, orgId, orgName, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { students } = useStudents(orgId, user, role);
  const { academicYears } = useAcademicYears(orgId, user);
  const { certificates, padSettings, issueCertificate } = useCertificates(
    orgId,
    user
  );

  const initialType: CertificateType = VALID_TYPES.includes(
    routeType as CertificateType
  )
    ? (routeType as CertificateType)
    : "testimonial";

  const [certificateType, setCertificateType] =
    useState<CertificateType>(initialType);
  const [templateStyle, setTemplateStyle] =
    useState<CertificateTemplateStyle>("classic");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [studentName, setStudentName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [address, setAddress] = useState("");
  const [roll, setRoll] = useState<string>("");
  const [studentUid, setStudentUid] = useState<string>("");
  const [classNameText, setClassNameText] = useState<string>("");
  const [academicYearText, setAcademicYearText] = useState<string>("");
  const [memoNumber, setMemoNumber] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(getTodayDDMMYYYY());
  const [purposeOrReason, setPurposeOrReason] = useState<string>("");
  const [achievementDetails, setAchievementDetails] = useState<string>("");
  const [characterRemarks, setCharacterRemarks] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");
  const [isBodyManuallyEdited, setIsBodyManuallyEdited] = useState(false);

  const [localPad, setLocalPad] = useState<CertificatePadSettings>({});
  const [showPadOverrides, setShowPadOverrides] = useState(false);

  const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | undefined>(
    undefined
  );
  const [loadedEditId, setLoadedEditId] = useState<string | null>(null);

  // Sync route param changes when not editing
  useEffect(() => {
    if (
      !editId &&
      routeType &&
      VALID_TYPES.includes(routeType as CertificateType)
    ) {
      setCertificateType(routeType as CertificateType);
    }
  }, [routeType, editId]);

  // Initialize pad settings once fetched
  useEffect(() => {
    if (Object.keys(padSettings).length > 0 && !loadedEditId) {
      setLocalPad((prev) => ({
        orgNameBn: prev.orgNameBn ?? padSettings.orgNameBn ?? orgName ?? "",
        address: prev.address ?? padSettings.address ?? "",
        phone: prev.phone ?? padSettings.phone ?? "",
        email: prev.email ?? padSettings.email ?? "",
        established: prev.established ?? padSettings.established ?? "",
        eiinOrCode: prev.eiinOrCode ?? padSettings.eiinOrCode ?? "",
        logoUrl: prev.logoUrl ?? padSettings.logoUrl ?? "/icon.png",
        principalTitle:
          prev.principalTitle ??
          padSettings.principalTitle ??
          "মুহতামিম / অধ্যক্ষ",
        principalName: prev.principalName ?? padSettings.principalName ?? "",
        showBismillah: prev.showBismillah ?? padSettings.showBismillah ?? true,
        showWatermark: prev.showWatermark ?? padSettings.showWatermark ?? true,
        showQrCode: prev.showQrCode ?? padSettings.showQrCode ?? true,
      }));
    }
  }, [padSettings, orgName, loadedEditId]);

  // Default active academic year
  useEffect(() => {
    if (!academicYearText && academicYears.length > 0 && !editId) {
      const active =
        academicYears.find((ay) => ay.is_active) || academicYears[0];
      if (active) {
        setAcademicYearText(formatAcademicYear(active));
      }
    }
  }, [academicYears, academicYearText, editId]);

  // Auto-generate memo number when type changes (for new records)
  useEffect(() => {
    if (!editId && !savedRecordId) {
      setMemoNumber(generateNextMemoNumber(certificateType, certificates));
    }
  }, [certificateType, certificates, editId, savedRecordId]);

  // Populate defaults for purpose/achievement/character when switching type on new certificate
  useEffect(() => {
    if (!editId) {
      const meta = CERTIFICATE_TYPE_META[certificateType];
      setCharacterRemarks(meta.defaultCharacter);
      if (certificateType === "bonafide" || certificateType === "transfer") {
        setPurposeOrReason(meta.defaultPurpose);
      } else {
        setPurposeOrReason("");
      }
      if (certificateType === "merit") {
        setAchievementDetails(meta.defaultAchievement);
      } else {
        setAchievementDetails("");
      }
      setIsBodyManuallyEdited(false);
    }
  }, [certificateType, editId]);

  // Load existing certificate for edit/reprint
  useEffect(() => {
    if (editId && certificates.length > 0 && loadedEditId !== editId) {
      const target = certificates.find((c) => c.id === editId);
      if (target) {
        setLoadedEditId(editId);
        setSavedRecordId(target.id);
        setCertificateType(target.certificateType);
        setTemplateStyle(target.templateStyle || "classic");
        setSelectedClassId(target.classId || "");
        setSelectedStudentId(target.studentId || "");
        setStudentName(target.studentName || "");
        setFatherName(target.fatherName || "");
        setMotherName(target.motherName || "");
        setAddress(target.address || "");
        setRoll(target.roll ? String(target.roll) : "");
        setStudentUid(target.studentUid || "");
        setClassNameText(target.className || "");
        setAcademicYearText(target.academicYear || "");
        setMemoNumber(target.memoNumber || "");
        setIssueDate(target.issueDate || getTodayDDMMYYYY());
        setPurposeOrReason(target.purposeOrReason || "");
        setAchievementDetails(target.achievementDetails || "");
        setCharacterRemarks(target.characterRemarks || "");
        setCustomTitle(target.customTitle || "");
        setCustomBody(target.customBody || "");
        setIsBodyManuallyEdited(true);
        if (target.padSettings) {
          setLocalPad(target.padSettings);
        }
      }
    }
  }, [editId, certificates, loadedEditId]);

  // Pre-select student if passed via URL query params (?studentId=...&classId=...)
  useEffect(() => {
    if (editId || !paramStudentId) return;
    if (paramClassId && !selectedClassId) {
      setSelectedClassId(paramClassId);
    }
    // Search student across all classes if classId not supplied
    const allClassKeys = Object.keys(students);
    for (const cId of allClassKeys) {
      const found = (students[cId] || []).find((s) => s.id === paramStudentId);
      if (found) {
        setSelectedClassId(cId);
        setSelectedStudentId(found.id);
        break;
      }
    }
  }, [paramStudentId, paramClassId, students, editId, selectedClassId]);

  // Students inside selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const list = [...(students[selectedClassId] || [])];
    return list.sort((a, b) => a.roll - b.roll);
  }, [students, selectedClassId]);

  // Populate student details when selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId || (editId && loadedEditId === editId)) return;
    const st = classStudents.find((s) => s.id === selectedStudentId);
    const cls = classes.find((c) => c.id === selectedClassId);
    if (st) {
      setStudentName(st.name || "");
      setFatherName(st.fatherName || "");
      setAddress(st.address || "");
      setRoll(st.roll ? String(st.roll) : "");
      setStudentUid(st.studentUid || "");
      setClassNameText(cls?.name || "");
      setIsBodyManuallyEdited(false);
    }
  }, [selectedStudentId, classStudents, classes, selectedClassId, editId, loadedEditId]);

  // Update classNameText when class changes cleanly
  useEffect(() => {
    if (selectedClassId && !editId) {
      const cls = classes.find((c) => c.id === selectedClassId);
      if (cls) setClassNameText(cls.name);
    }
  }, [selectedClassId, classes, editId]);

  // Live rebuild certificate body if not manually edited
  useEffect(() => {
    if (isBodyManuallyEdited) return;
    const generated = buildCertificateBody(certificateType, {
      orgName: localPad.orgNameBn || orgName || "",
      studentName,
      fatherName,
      motherName,
      address,
      className: classNameText,
      roll,
      studentUid,
      academicYear: academicYearText,
      purposeOrReason,
      achievementDetails,
      characterRemarks,
    });
    setCustomBody(generated);
  }, [
    isBodyManuallyEdited,
    certificateType,
    localPad.orgNameBn,
    orgName,
    studentName,
    fatherName,
    motherName,
    address,
    classNameText,
    roll,
    studentUid,
    academicYearText,
    purposeOrReason,
    achievementDetails,
    characterRemarks,
  ]);

  // Responsive preview scaling using ResizeObserver
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.7);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      const available = el.clientWidth - 16;
      if (available > 0) {
        setPreviewScale(Math.min(1, available / 794));
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mobileTab]);

  const handleResetTemplateBody = () => {
    setIsBodyManuallyEdited(false);
    toast.success("টেমপ্লেটের মূল বয়ানে ফিরিয়ে আনা হয়েছে।");
  };

  const validateForm = (): boolean => {
    if (!studentName.trim()) {
      toast.error("অনুগ্রহ করে শিক্ষার্থীর নাম লিখুন অথবা তালিকা থেকে নির্বাচন করুন।");
      return false;
    }
    if (!classNameText.trim()) {
      toast.error("অনুগ্রহ করে শ্রেণি নির্বাচন বা উল্লেখ করুন।");
      return false;
    }
    if (!memoNumber.trim()) {
      toast.error("স্মারক নম্বর প্রদান করুন।");
      return false;
    }
    return true;
  };

  const handleSave = async (silent = false) => {
    if (!validateForm()) return null;
    setIsSaving(true);
    try {
      const existingCreated = savedRecordId
        ? certificates.find((c) => c.id === savedRecordId)?.createdAt
        : undefined;

      const result = await issueCertificate({
        ...(savedRecordId ? { id: savedRecordId, createdAt: existingCreated } : {}),
        certificateType,
        memoNumber: memoNumber.trim(),
        studentId: selectedStudentId || "manual",
        studentUid: studentUid.trim() || undefined,
        studentName: studentName.trim(),
        fatherName: fatherName.trim() || "—",
        motherName: motherName.trim() || undefined,
        address: address.trim() || undefined,
        roll: parseInt(roll, 10) || 0,
        classId: selectedClassId || "manual",
        className: classNameText.trim(),
        academicYear: academicYearText.trim() || toBengaliNumber(new Date().getFullYear()),
        issueDate,
        purposeOrReason: purposeOrReason.trim() || undefined,
        achievementDetails: achievementDetails.trim() || undefined,
        characterRemarks: characterRemarks.trim() || undefined,
        customTitle: customTitle.trim() || undefined,
        customBody,
        templateStyle,
        padSettings: localPad,
      });

      if (result) {
        setSavedRecordId(result.id);
      }
      return result;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndPrint = async () => {
    const saved = await handleSave();
    if (saved) {
      setTimeout(() => {
        window.print();
      }, 250);
    }
  };

  const handleDownloadPdf = async () => {
    if (!validateForm()) return;
    setIsExporting(true);
    const toastId = toast.loading("সনদপত্র সংরক্ষণ ও PDF তৈরি হচ্ছে...");
    try {
      // Save record silently first if not yet saved or modified
      await handleSave(true);

      const blob = await generateCertificatePdfBlob("certificate-pdf-source");
      const meta = CERTIFICATE_TYPE_META[certificateType];
      const safeName = (studentName || "certificate").replace(/\s+/g, "_");
      const safeMemo = (memoNumber || "doc").replace(/[\/\\]/g, "-");
      saveAs(blob, `${meta.prefix}-${safeName}-${safeMemo}.pdf`);
      toast.success("PDF ডাউনলোড সফল হয়েছে!", { id: toastId });
    } catch (error) {
      console.error("Certificate PDF Export Error:", error);
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে। প্রিন্ট বাটন ব্যবহার করে PDF সেভ করুন।", {
        id: toastId,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const currentMeta = CERTIFICATE_TYPE_META[certificateType];

  const frameProps = {
    certificateType,
    templateStyle,
    memoNumber,
    issueDate,
    studentName,
    fatherName,
    motherName,
    address,
    roll,
    studentUid,
    className: classNameText,
    academicYear: academicYearText,
    customTitle,
    customBody,
    padSettings: localPad,
    orgName: orgName || "",
    issuedByName: user?.displayName || user?.email?.split("@")[0] || "",
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/certificates"
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                {currentMeta.titleBn} তৈরি
              </h1>
              {savedRecordId && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  সংরক্ষিত
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {currentMeta.shortDesc}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/certificates/history"
            className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <History className="w-4 h-4" />
            <span>ইতিহাস</span>
          </Link>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave(false)}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-[#111C2E] border border-[#0F5C7A] dark:border-teal-500/60 text-[#0F5C7A] dark:text-teal-300 hover:bg-[#0F5C7A]/5 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{savedRecordId ? "আপডেট করুন" : "সংরক্ষণ করুন"}</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAndPrint}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0F5C7A] hover:bg-[#0D4D66] text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
          >
            <Printer className="w-4 h-4" />
            <span>সংরক্ষণ ও প্রিন্ট</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>PDF ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* Certificate Type Segmented Bar */}
      <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 print:hidden">
        {VALID_TYPES.map((tKey) => {
          const meta = CERTIFICATE_TYPE_META[tKey];
          const active = certificateType === tKey;
          return (
            <button
              key={tKey}
              type="button"
              onClick={() => {
                setCertificateType(tKey);
                if (!editId && !savedRecordId) {
                  navigate(`/certificates/create/${tKey}`, { replace: true });
                }
              }}
              className={clsx(
                "py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap truncate",
                active
                  ? "bg-[#0F5C7A] text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
              )}
            >
              {meta.titleBn}
            </button>
          );
        })}
      </div>

      {/* Mobile Tab Switcher (Form vs Live Preview) */}
      <div className="lg:hidden bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl grid grid-cols-2 gap-1 print:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("form")}
          className={clsx(
            "py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
            mobileTab === "form"
              ? "bg-white dark:bg-[#111C2E] text-[#0F5C7A] dark:text-teal-300 shadow-sm"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <Edit3 className="w-4 h-4" />
          <span>তথ্য পূরণ</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={clsx(
            "py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
            mobileTab === "preview"
              ? "bg-white dark:bg-[#111C2E] text-[#0F5C7A] dark:text-teal-300 shadow-sm"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <Eye className="w-4 h-4" />
          <span>লাইভ প্রিভিউ (A4)</span>
        </button>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FORM EDITOR */}
        <div
          className={clsx(
            "lg:col-span-5 space-y-5 print:hidden",
            mobileTab === "preview" ? "hidden lg:block" : "block"
          )}
        >
          {/* Student Selection Card */}
          <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0F5C7A] dark:text-teal-400" />
              <span>শিক্ষার্থী নির্বাচন ও তথ্য</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  শ্রেণি নির্বাচন করুন
                </label>
                <ClassSelect
                  value={selectedClassId}
                  onChange={(val) => {
                    setSelectedClassId(val);
                    setSelectedStudentId("");
                  }}
                  classes={classes}
                  placeholder="শ্রেণি বাছাই করুন"
                  icon={Users}
                  size="sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  শিক্ষার্থী নির্বাচন করুন
                </label>
                <ClassSelect
                  value={selectedStudentId}
                  onChange={(val) => {
                    setLoadedEditId(null);
                    setSelectedStudentId(val);
                  }}
                  options={classStudents.map((s) => ({
                    id: s.id,
                    name: `${toBengaliNumber(s.roll)}. ${s.name}${
                      s.isActive === false ? " (প্রাক্তন/আর্কাইভ)" : ""
                    }`,
                  }))}
                  placeholder={
                    selectedClassId
                      ? "শিক্ষার্থী বাছাই করুন"
                      : "আগে শ্রেণি বাছাই করুন"
                  }
                  title="শিক্ষার্থী নির্বাচন করুন"
                  subtitle="তালিকা থেকে নাম বা রোল খুঁজে সিলেক্ট করুন"
                  disabled={!selectedClassId}
                  icon={User}
                  size="sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  শিক্ষার্থীর নাম *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="শিক্ষার্থীর পূর্ণ নাম"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  পিতার নাম
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="পিতার নাম"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  মাতার নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="মাতার নাম"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  শ্রেণি / জামাত *
                </label>
                <input
                  type="text"
                  value={classNameText}
                  onChange={(e) => setClassNameText(e.target.value)}
                  placeholder="যেমন: মিজান / ৫ম শ্রেণি"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  রোল নম্বর
                </label>
                <input
                  type="text"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  placeholder="রোল নম্বর"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  শিক্ষার্থী আইডি (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={studentUid}
                  onChange={(e) => setStudentUid(e.target.value)}
                  placeholder="আইডি নম্বর"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  শিক্ষাবর্ষ
                </label>
                <input
                  type="text"
                  value={academicYearText}
                  onChange={(e) => setAcademicYearText(e.target.value)}
                  placeholder="যেমন: ১৪৪৭ হি. ২০২৬ ইং"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  স্থায়ী ঠিকানা (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="গ্রাম, ডাকঘর, উপজেলা, জেলা"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Certificate Content & Details Card */}
          <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0F5C7A] dark:text-teal-400" />
              <span>সনদের তথ্য ও বয়ান</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  স্মারক নম্বর *
                </label>
                <input
                  type="text"
                  value={memoNumber}
                  onChange={(e) => setMemoNumber(e.target.value)}
                  className="input-premium !h-[42px] text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  ইস্যুর তারিখ
                </label>
                <DatePicker
                  selected={parseDDMMYYYYToDate(issueDate)}
                  onChange={(d: Date | null) =>
                    d && setIssueDate(formatDateToDDMMYYYY(d))
                  }
                  dateFormat="dd-MM-yyyy"
                  className="input-premium !h-[42px] text-sm text-center font-semibold"
                />
              </div>

              {(certificateType === "bonafide" ||
                certificateType === "transfer") && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {certificateType === "transfer"
                      ? "প্রতিষ্ঠান ত্যাগের / ছাড়পত্রের কারণ"
                      : "প্রত্যয়নের উদ্দেশ্য / কারণ"}
                  </label>
                  <input
                    type="text"
                    value={purposeOrReason}
                    onChange={(e) => setPurposeOrReason(e.target.value)}
                    placeholder="কারণ বা উদ্দেশ্য লিখুন..."
                    className="input-premium !h-[42px] text-sm"
                  />
                </div>
              )}

              {certificateType === "merit" && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    কৃতিত্ব / অর্জনের বিবরণ
                  </label>
                  <input
                    type="text"
                    value={achievementDetails}
                    onChange={(e) => setAchievementDetails(e.target.value)}
                    placeholder="যেমন: হিফজুল কুরআন সমাপনী / বার্ষিক পরীক্ষায় ১ম স্থান"
                    className="input-premium !h-[42px] text-sm"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  চারিত্রিক মন্তব্য
                </label>
                <input
                  type="text"
                  value={characterRemarks}
                  onChange={(e) => setCharacterRemarks(e.target.value)}
                  placeholder="যেমন: উত্তম ও প্রশংসনীয়"
                  className="input-premium !h-[42px] text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  কাস্টম শিরোনাম (ঐচ্ছিক, খালি রাখলে ডিফল্ট বসবে)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={currentMeta.titleBn}
                  className="input-premium !h-[42px] text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  সনদপত্রের মূল বয়ান (সম্পাদনাযোগ্য)
                </label>
                {isBodyManuallyEdited && (
                  <button
                    type="button"
                    onClick={handleResetTemplateBody}
                    className="text-xs font-semibold text-[#0F5C7A] dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>ডিফল্ট বয়ানে রিসেট</span>
                  </button>
                )}
              </div>
              <textarea
                rows={7}
                value={customBody}
                onChange={(e) => {
                  setIsBodyManuallyEdited(true);
                  setCustomBody(e.target.value);
                }}
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F5C7A]/30 focus:border-[#0F5C7A]"
              />
            </div>
          </div>

          {/* Design Template & Pad Overrides Card */}
          <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0F5C7A] dark:text-teal-400" />
              <span>ফ্রেম ডিজাইন ও প্যাড অপশন</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TEMPLATE_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTemplateStyle(opt.id)}
                  className={clsx(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer",
                    templateStyle === opt.id
                      ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 border-[#0F5C7A] dark:border-teal-400 text-[#0F5C7A] dark:text-teal-300"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                >
                  <p className="text-xs font-bold">{opt.name}</p>
                  <p className="text-[11px] opacity-75 mt-0.5 leading-snug">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPad.showBismillah ?? true}
                  onChange={(e) =>
                    setLocalPad({ ...localPad, showBismillah: e.target.checked })
                  }
                  className="accent-[#0F5C7A]"
                />
                বিসমিল্লাহ
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPad.showWatermark ?? true}
                  onChange={(e) =>
                    setLocalPad({ ...localPad, showWatermark: e.target.checked })
                  }
                  className="accent-[#0F5C7A]"
                />
                জলছাপ
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPad.showQrCode ?? true}
                  onChange={(e) =>
                    setLocalPad({ ...localPad, showQrCode: e.target.checked })
                  }
                  className="accent-[#0F5C7A]"
                />
                QR কোড
              </label>
            </div>

            <button
              type="button"
              onClick={() => setShowPadOverrides(!showPadOverrides)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>প্যাডের ঠিকানা ও স্বাক্ষরকারী পরিবর্তন করুন (এই সনদের জন্য)</span>
              {showPadOverrides ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showPadOverrides && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    প্রতিষ্ঠানের নাম
                  </label>
                  <input
                    type="text"
                    value={localPad.orgNameBn || ""}
                    onChange={(e) =>
                      setLocalPad({ ...localPad, orgNameBn: e.target.value })
                    }
                    className="input-premium !h-[40px] text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    প্রতিষ্ঠানের ঠিকানা
                  </label>
                  <input
                    type="text"
                    value={localPad.address || ""}
                    onChange={(e) =>
                      setLocalPad({ ...localPad, address: e.target.value })
                    }
                    className="input-premium !h-[40px] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    প্রধানের পদবি
                  </label>
                  <input
                    type="text"
                    value={localPad.principalTitle || ""}
                    onChange={(e) =>
                      setLocalPad({ ...localPad, principalTitle: e.target.value })
                    }
                    className="input-premium !h-[40px] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    প্রধানের নাম
                  </label>
                  <input
                    type="text"
                    value={localPad.principalName || ""}
                    onChange={(e) =>
                      setLocalPad({ ...localPad, principalName: e.target.value })
                    }
                    className="input-premium !h-[40px] text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE A4 PREVIEW */}
        <div
          className={clsx(
            "lg:col-span-7 lg:sticky lg:top-6",
            mobileTab === "form" ? "hidden lg:block print:block" : "block"
          )}
        >
          <div className="bg-slate-200/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 print:p-0 print:border-none print:bg-transparent">
            <div className="flex items-center justify-between mb-3 px-1 print:hidden">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                লাইভ A4 প্রিন্ট প্রিভিউ ({Math.round(previewScale * 100)}%)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                A4 পোর্ট্রেট · প্রিন্ট-রেডি
              </span>
            </div>

            <div
              ref={previewContainerRef}
              className="w-full flex justify-center overflow-hidden print:overflow-visible"
            >
              <div
                id="certificate-print-container"
                style={{
                  width: `${794 * previewScale}px`,
                  height: `${1123 * previewScale}px`,
                }}
              >
                <div
                  className="shadow-xl origin-top-left print:shadow-none"
                  style={{
                    width: "794px",
                    transform: `scale(${previewScale})`,
                  }}
                >
                  <CertificateFrame {...frameProps} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offscreen 1:1 Unscaled Source for Crystal-Clear PDF Capture */}
      <div
        className="print:hidden"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          pointerEvents: "none",
        }}
      >
        <div id="certificate-pdf-source">
          <CertificateFrame {...frameProps} />
        </div>
      </div>
    </div>
  );
};

export default CertificateGenerator;
