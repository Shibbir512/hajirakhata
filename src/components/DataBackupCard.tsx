import React, { useState } from "react";
import { 
  Database, 
  Download, 
  FileJson, 
  CheckCircle2, 
  Loader2, 
  CalendarCheck, 
  GraduationCap, 
  Users, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  HardDrive
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { saveAs } from "file-saver";

interface DataBackupCardProps {
  className?: string;
  variant?: "full" | "compact";
}

export const DataBackupCard: React.FC<DataBackupCardProps> = ({ 
  className = "",
  variant = "full"
}) => {
  const { user, orgId, orgName, role } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeResults, setIncludeResults] = useState(true);
  const [includeContext, setIncludeContext] = useState(true);
  const [prettyJson, setPrettyJson] = useState(true);
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    date: string;
    attendanceCount: number;
    resultsCount: number;
    sizeKb: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem(`last_backup_info_${orgId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const sanitizeFirestoreData = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (typeof data.toDate === "function") {
      return {
        _type: "firestore_timestamp",
        iso: data.toDate().toISOString(),
        seconds: data.seconds,
        nanoseconds: data.nanoseconds,
      };
    }
    if (Array.isArray(data)) {
      return data.map((item) => sanitizeFirestoreData(item));
    }
    if (typeof data === "object") {
      const copy: any = {};
      for (const key of Object.keys(data)) {
        copy[key] = sanitizeFirestoreData(data[key]);
      }
      return copy;
    }
    return data;
  };

  const handleExportBackup = async () => {
    if (!orgId) {
      toast.error("প্রতিষ্ঠান নির্বাচন করা নেই।");
      return;
    }

    if (!includeAttendance && !includeResults) {
      toast.error("অনুগ্রহ করে অন্তত হাজিরা অথবা ফলাফল নির্বাচন করুন।");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("ডাটাবেজ ব্যাকআপ তৈরি হচ্ছে...");

    try {
      let attendanceSessions: any[] = [];
      let resultsData: any[] = [];
      let studentsData: any[] = [];
      let classesData: any[] = [];
      let examsData: any[] = [];
      let subjectsData: any[] = [];
      let academicYearsData: any[] = [];
      let leavesData: any[] = [];
      let reportConfigsData: any[] = [];

      // 1. Fetch Attendance Sessions
      if (includeAttendance) {
        setCurrentStep("হাজিরা সেশন ডাউনলোড হচ্ছে...");
        const attendanceRef = collection(db, `organizations/${orgId}/attendance_sessions`);
        const attendanceSnap = await getDocs(attendanceRef);
        attendanceSessions = attendanceSnap.docs.map((d) => ({
          id: d.id,
          ...sanitizeFirestoreData(d.data()),
        }));
      }

      // 2. Fetch Results
      if (includeResults) {
        setCurrentStep("পরীক্ষার ফলাফল ডাটা ডাউনলোড হচ্ছে...");
        const resultsRef = collection(db, `organizations/${orgId}/results`);
        const resultsSnap = await getDocs(resultsRef);
        resultsData = resultsSnap.docs.map((d) => ({
          id: d.id,
          ...sanitizeFirestoreData(d.data()),
        }));
      }

      // 3. Fetch Context / Reference Data (Students, Classes, Exams, Subjects, Years)
      if (includeContext) {
        setCurrentStep("শিক্ষার্থী, শ্রেণি ও অন্যান্য রেফারেন্স তথ্য লোড হচ্ছে...");
        const [
          studentsSnap,
          classesSnap,
          examsSnap,
          subjectsSnap,
          yearsSnap,
          leavesSnap,
          configsSnap
        ] = await Promise.all([
          getDocs(collection(db, `organizations/${orgId}/students`)).catch(() => ({ docs: [] })),
          getDocs(collection(db, `organizations/${orgId}/classes`)).catch(() => ({ docs: [] })),
          getDocs(collection(db, `organizations/${orgId}/exams`)).catch(() => ({ docs: [] })),
          getDocs(collection(db, `organizations/${orgId}/subjects`)).catch(() => ({ docs: [] })),
          getDocs(collection(db, `organizations/${orgId}/academic_years`)).catch(() => ({ docs: [] })),
          getDocs(collection(db, `organizations/${orgId}/leaves`)).catch(() => ({ docs: [] })),
          getDocs(collection(db, `organizations/${orgId}/report_configs`)).catch(() => ({ docs: [] })),
        ]);

        studentsData = studentsSnap.docs.map((d) => ({ id: d.id, ...sanitizeFirestoreData(d.data()) }));
        classesData = classesSnap.docs.map((d) => ({ id: d.id, ...sanitizeFirestoreData(d.data()) }));
        examsData = examsSnap.docs.map((d) => ({ id: d.id, ...sanitizeFirestoreData(d.data()) }));
        subjectsData = subjectsSnap.docs.map((d) => ({ id: d.id, ...sanitizeFirestoreData(d.data()) }));
        academicYearsData = yearsSnap.docs.map((d) => ({ id: d.id, ...sanitizeFirestoreData(d.data()) }));
        leavesData = leavesSnap.docs.map((d) => ({ id: d.id, ...sanitizeFirestoreData(d.data()) }));
        reportConfigsData = configsSnap.docs.map((d) => ({ id: d.id, ...sanitizeFirestoreData(d.data()) }));
      }

      setCurrentStep("JSON ফাইল প্রস্তুত হচ্ছে...");

      const now = new Date();
      const exportTimestamp = now.toISOString();
      const formattedDate = now.toLocaleDateString("bn-BD", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }) + " " + now.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });

      const backupPayload = {
        _metadata: {
          title: "মাদরাসা/বিদ্যালয় উপস্থিতি ও ফলাফল ডাটাবেজ ব্যাকআপ",
          system: "Student Attendance & Academic Management System",
          version: "1.0",
          exportDateISO: exportTimestamp,
          exportDateFormatted: formattedDate,
          institution: {
            id: orgId,
            name: orgName || "প্রতিষ্ঠান",
          },
          exportedBy: {
            uid: user?.uid || "",
            name: user?.displayName || "ব্যবহারকারী",
            email: user?.email || "",
            role: role || "admin",
          },
          summaryCounts: {
            attendanceSessionsCount: attendanceSessions.length,
            resultsCount: resultsData.length,
            studentsCount: studentsData.length,
            classesCount: classesData.length,
            examsCount: examsData.length,
            subjectsCount: subjectsData.length,
            academicYearsCount: academicYearsData.length,
            leavesCount: leavesData.length,
          },
          includedModules: {
            attendance: includeAttendance,
            results: includeResults,
            referenceData: includeContext,
          },
        },
        attendance_sessions: attendanceSessions,
        results: resultsData,
        ...(includeContext ? {
          reference_data: {
            students: studentsData,
            classes: classesData,
            exams: examsData,
            subjects: subjectsData,
            academic_years: academicYearsData,
            leaves: leavesData,
            report_configs: reportConfigsData,
          }
        } : {})
      };

      const jsonString = prettyJson 
        ? JSON.stringify(backupPayload, null, 2) 
        : JSON.stringify(backupPayload);

      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const sizeInKb = (blob.size / 1024).toFixed(1);

      // Sanitize institution name for filename
      const cleanOrgName = (orgName || "institution")
        .replace(/[\/\\:*?"<>|.\s]+/g, "_")
        .substring(0, 30);
      const dateStr = now.toISOString().split("T")[0];
      const filename = `${cleanOrgName}_backup_${dateStr}.json`;

      saveAs(blob, filename);

      const info = {
        date: formattedDate,
        attendanceCount: attendanceSessions.length,
        resultsCount: resultsData.length,
        sizeKb: `${sizeInKb} KB`,
      };
      setLastBackupInfo(info);
      try {
        localStorage.setItem(`last_backup_info_${orgId}`, JSON.stringify(info));
      } catch (err) {
        console.warn("Could not save to localStorage", err);
      }

      toast.success("ডাটাবেজ ব্যাকআপ (JSON) সফলভাবে ডাউনলোড সম্পন্ন হয়েছে!", {
        id: toastId,
        duration: 5000,
      });
    } catch (error: any) {
      console.error("Backup export error:", error);
      toast.error(`ব্যাকআপ তৈরিতে সমস্যা হয়েছে: ${error.message || "অজানা ত্রুটি"}`, {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
      setCurrentStep("");
    }
  };

  if (variant === "compact") {
    return (
      <div className={`card-premium p-5 border border-emerald-100 dark:border-slate-800 bg-gradient-to-br from-white to-emerald-50/20 dark:from-[#111C2E] dark:to-slate-900 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">ডাটা ব্যাকআপ (JSON)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">হাজিরা ও ফলাফলের সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন</p>
            </div>
          </div>
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-xs font-bold flex items-center gap-2 shrink-0 shadow-sm"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isExporting ? "প্রস্তুত হচ্ছে..." : "JSON ব্যাকআপ"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`card-premium p-6 sm:p-8 border border-emerald-100 dark:border-slate-800 bg-gradient-to-br from-white via-white to-emerald-50/25 dark:from-[#111C2E] dark:via-[#111C2E] dark:to-slate-900 relative overflow-hidden ${className}`}>
      {/* Decorative top ribbon */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-[#0F5C7A]"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                ডাটা ব্যাকআপ ও এক্সপোর্ট (JSON Backup)
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                অফলাইন সেফ
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              আপনার প্রতিষ্ঠানের সমস্ত হাজিরা খাতা এবং পরীক্ষার ফলাফলের একটি সম্পূর্ণ ম্যানুয়াল কপি JSON ফাইল হিসেবে আপনার ডিভাইসে সংরক্ষণ করুন।
            </p>
          </div>
        </div>
      </div>

      {/* Features & Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Attendance Option */}
        <label 
          className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
            includeAttendance 
              ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 shadow-sm" 
              : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
          }`}
        >
          <input
            type="checkbox"
            checked={includeAttendance}
            onChange={(e) => setIncludeAttendance(e.target.checked)}
            className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          />
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-sm">
              <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              হাজিরা রেকর্ড (Attendance)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              সকল তারিখের দৈনিক হাজিরা, অনুপস্থিতি ও ছুটির সম্পূর্ণ সেশন রেকর্ড।
            </p>
          </div>
        </label>

        {/* Results Option */}
        <label 
          className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
            includeResults 
              ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 shadow-sm" 
              : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
          }`}
        >
          <input
            type="checkbox"
            checked={includeResults}
            onChange={(e) => setIncludeResults(e.target.checked)}
            className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          />
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-sm">
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ফলাফল ডাটা (Exam Results)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              সকল পরীক্ষা, শ্রেণি ও বিষয়ভিত্তিক শিক্ষার্থীদের প্রাপ্ত নম্বর ও গ্রেড।
            </p>
          </div>
        </label>

        {/* Context Option */}
        <label 
          className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
            includeContext 
              ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 shadow-sm" 
              : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
          }`}
        >
          <input
            type="checkbox"
            checked={includeContext}
            onChange={(e) => setIncludeContext(e.target.checked)}
            className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          />
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-sm">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              রেফারেন্স তথ্য (Students & Classes)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              শিক্ষার্থী তালিকা, শ্রেণি, বিষয় ও পরীক্ষার নামসমূহ যাতে ব্যাকআপ পূর্ণাঙ্গ হয়।
            </p>
          </div>
        </label>
      </div>

      {/* Formatting & Last Backup Details */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 mb-6">
        <div className="flex items-center gap-3">
          <HardDrive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>
            {lastBackupInfo ? (
              <>সর্বশেষ ব্যাকআপ: <strong className="text-slate-800 dark:text-white">{lastBackupInfo.date}</strong> ({lastBackupInfo.sizeKb})</>
            ) : (
              "এই ডিভাইসে এখনো কোনো ব্যাকআপ নেওয়া হয়নি।"
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={prettyJson}
              onChange={(e) => setPrettyJson(e.target.checked)}
              className="h-3.5 w-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            />
            <span className="text-slate-700 dark:text-slate-200 font-medium">সহজে পড়ার উপযোগী ফরম্যাট (Pretty JSON)</span>
          </label>
        </div>
      </div>

      {/* Status when downloading */}
      {isExporting && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{currentStep || "ডাটাবেজ প্রক্রিয়াকরণ চলছে..."}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">দয়া করে ব্রাউজার ট্যাব বন্ধ করবেন না</p>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>ব্যাকআপ ফাইলটি আপনার ডিভাইসে নিরাপদ স্থানে বা গুগল ড্রাইভে সংরক্ষণ করুন</span>
        </div>

        <button
          onClick={handleExportBackup}
          disabled={isExporting}
          className="w-full sm:w-auto btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2.5 shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>ব্যাকআপ প্রস্তুত হচ্ছে...</span>
            </>
          ) : (
            <>
              <FileJson className="w-5 h-5" />
              <span>সম্পূর্ণ ডাটাবেজ ব্যাকআপ (JSON) ডাউনলোড করুন</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default DataBackupCard;
