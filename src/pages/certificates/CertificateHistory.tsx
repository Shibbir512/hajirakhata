import React, { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Eye,
  Edit3,
  Trash2,
  FilePlus2,
  Award,
  FileCheck2,
  FileOutput,
  Trophy,
  History,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../hooks/useAuth";
import { useClasses } from "../../hooks/useClasses";
import { useCertificates } from "../../hooks/useCertificates";
import { CertificateRecord, CertificateType } from "../../types";
import { CERTIFICATE_TYPE_META } from "../../utils/certificateTemplates";
import {
  toBengaliDate,
  toBengaliNumber,
  toEnglishNumber,
} from "../../utils/dateFormatter";
import { ClassSelect } from "../../components/ClassSelect";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { CertificatePreviewModal } from "../../components/certificates/CertificatePreviewModal";

const TYPE_ICONS: Record<CertificateType, React.ElementType> = {
  testimonial: Award,
  bonafide: FileCheck2,
  transfer: FileOutput,
  merit: Trophy,
};

const CertificateHistory: React.FC = () => {
  const { user, orgId, orgName, role } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { certificates, loading, deleteCertificate } = useCertificates(
    orgId,
    user
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialType = searchParams.get("type") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(initialType);
  const [classFilter, setClassFilter] = useState<string>("");
  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);
  const [certToDelete, setCertToDelete] = useState<CertificateRecord | null>(
    null
  );

  const filteredCertificates = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    const qEng = toEnglishNumber(qLower);

    return certificates.filter((cert) => {
      if (typeFilter && cert.certificateType !== typeFilter) return false;
      if (classFilter && cert.classId !== classFilter) return false;
      if (!qLower) return true;

      const matchName = cert.studentName?.toLowerCase().includes(qLower);
      const matchMemo = cert.memoNumber?.toLowerCase().includes(qLower);
      const matchRoll =
        cert.roll !== undefined &&
        (String(cert.roll).includes(qEng) ||
          toBengaliNumber(cert.roll).includes(qLower));
      const matchUid = cert.studentUid?.toLowerCase().includes(qEng);

      return matchName || matchMemo || matchRoll || matchUid;
    });
  }, [certificates, typeFilter, classFilter, searchQuery]);

  const filterTabs: { id: string; label: string }[] = [
    { id: "", label: "সকল" },
    { id: "testimonial", label: "প্রশংসা পত্র" },
    { id: "bonafide", label: "প্রত্যয়ন পত্র" },
    { id: "transfer", label: "ছাড়পত্র" },
    { id: "merit", label: "কৃতিত্ব পত্র" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/certificates"
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-[#0F5C7A] dark:text-teal-400" />
              <span>ইস্যুকৃত সনদপত্রের ইতিহাস</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              মোট {toBengaliNumber(filteredCertificates.length)} টি সনদপত্র পাওয়া গেছে
            </p>
          </div>
        </div>

        <Link
          to="/certificates/create/testimonial"
          className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0F5C7A] hover:bg-[#0D4D66] text-white flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>নতুন সনদ তৈরি</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
        {/* Segmented Type Filter */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-xl">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={clsx(
                "px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap",
                typeFilter === tab.id
                  ? "bg-white dark:bg-[#111C2E] text-[#0F5C7A] dark:text-teal-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Class Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="শিক্ষার্থীর নাম, রোল, আইডি বা স্মারক নম্বর দিয়ে খুঁজুন..."
              className="input-premium !h-[44px] pl-10 text-sm"
            />
          </div>

          <div className="md:col-span-4">
            <ClassSelect
              value={classFilter}
              onChange={setClassFilter}
              classes={classes}
              allOptionLabel="সকল শ্রেণি"
              placeholder="শ্রেণি অনুযায়ী ফিল্টার"
              icon={Users}
              size="sm"
              buttonClassName="!h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* List / Table */}
      <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
              কোনো সনদপত্র পাওয়া যায়নি
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              অনুসন্ধানের শর্ত পরিবর্তন করুন অথবা নতুন সনদ তৈরি করুন।
            </p>
            <Link
              to="/certificates/create/testimonial"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F5C7A] text-white text-sm font-bold hover:bg-[#0D4D66] transition-colors"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>সনদ তৈরি করুন</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">স্মারক নং</th>
                    <th className="py-3.5 px-4">শিক্ষার্থী</th>
                    <th className="py-3.5 px-4">শ্রেণি ও রোল</th>
                    <th className="py-3.5 px-4">সনদের ধরন</th>
                    <th className="py-3.5 px-4">ইস্যুর তারিখ</th>
                    <th className="py-3.5 px-4 text-right">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filteredCertificates.map((cert) => {
                    const meta = CERTIFICATE_TYPE_META[cert.certificateType];
                    return (
                      <tr
                        key={cert.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {cert.memoNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800 dark:text-slate-100">
                            {cert.studentName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            পিতা: {cert.fatherName}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {cert.className} · রোল{" "}
                          <span className="tabular-nums font-semibold">
                            {toBengaliNumber(cert.roll)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={clsx(
                              "text-xs font-bold",
                              meta.accentText
                            )}
                          >
                            {cert.customTitle || meta.titleBn}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                          {toBengaliDate(cert.issueDate)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewCert(cert)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F5C7A]/10 dark:bg-teal-500/15 text-[#0F5C7A] dark:text-teal-300 hover:bg-[#0F5C7A] hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>প্রিভিউ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/certificates/create/${cert.certificateType}?editId=${cert.id}`
                                )
                              }
                              className="p-2 rounded-lg text-slate-500 hover:text-[#0F5C7A] dark:text-slate-400 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="সম্পাদনা"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {role === "admin" && (
                              <button
                                type="button"
                                onClick={() => setCertToDelete(cert)}
                                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCertificates.map((cert) => {
                const meta = CERTIFICATE_TYPE_META[cert.certificateType];
                const Icon = TYPE_ICONS[cert.certificateType];
                return (
                  <div key={cert.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                            meta.accentBg,
                            meta.accentText,
                            meta.accentBorder
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {cert.studentName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {cert.customTitle || meta.titleBn} · {cert.className} (রোল{" "}
                            {toBengaliNumber(cert.roll)})
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        {cert.memoNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {toBengaliDate(cert.issueDate)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewCert(cert)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F5C7A] text-white inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>প্রিন্ট / PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/certificates/create/${cert.certificateType}?editId=${cert.id}`
                            )
                          }
                          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {role === "admin" && (
                          <button
                            type="button"
                            onClick={() => setCertToDelete(cert)}
                            className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      <CertificatePreviewModal
        certificate={previewCert}
        orgName={orgName || ""}
        onClose={() => setPreviewCert(null)}
        onEdit={(cert) => {
          setPreviewCert(null);
          navigate(
            `/certificates/create/${cert.certificateType}?editId=${cert.id}`
          );
        }}
      />

      {/* Delete Confirmation */}
      {certToDelete && (
        <ConfirmationDialog
          isOpen={!!certToDelete}
          onClose={() => setCertToDelete(null)}
          onConfirm={async () => {
            await deleteCertificate(certToDelete.id);
            setCertToDelete(null);
          }}
          title="সনদপত্র রেকর্ড মুছে ফেলুন"
          message={`আপনি কি নিশ্চিত যে "${certToDelete.studentName}"-এর ${
            CERTIFICATE_TYPE_META[certToDelete.certificateType].titleBn
          } (স্মারক: ${certToDelete.memoNumber}) রেকর্ডটি মুছে ফেলতে চান?`}
        />
      )}
    </div>
  );
};

export default CertificateHistory;
