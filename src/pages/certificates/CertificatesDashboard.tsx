import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  FileCheck2,
  FileOutput,
  ScrollText,
  Trophy,
  History,
  Settings2,
  ArrowRight,
  Eye,
  FilePlus2,
  Search,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useCertificates } from "../../hooks/useCertificates";
import { CertificateRecord, CertificateType } from "../../types";
import { CERTIFICATE_TYPE_META } from "../../utils/certificateTemplates";
import { toBengaliDate, toBengaliNumber } from "../../utils/dateFormatter";
import { CertificatePreviewModal } from "../../components/certificates/CertificatePreviewModal";
import { PadSettingsModal } from "../../components/certificates/PadSettingsModal";
import clsx from "clsx";

const TYPE_ICONS: Record<CertificateType, React.ElementType> = {
  testimonial: Award,
  bonafide: FileCheck2,
  transfer: FileOutput,
  merit: Trophy,
};

const CertificatesDashboard: React.FC = () => {
  const { user, orgId, orgName, role } = useAuth();
  const navigate = useNavigate();
  const {
    certificates,
    padSettings,
    loading,
    savePadSettings,
  } = useCertificates(orgId, user);

  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);
  const [isPadModalOpen, setIsPadModalOpen] = useState(false);

  const stats = useMemo(() => {
    const counts: Record<CertificateType, number> = {
      testimonial: 0,
      bonafide: 0,
      transfer: 0,
      merit: 0,
    };
    certificates.forEach((c) => {
      if (counts[c.certificateType] !== undefined) {
        counts[c.certificateType]++;
      }
    });
    return counts;
  }, [certificates]);

  const recentCertificates = useMemo(() => certificates.slice(0, 6), [certificates]);

  const certificateTypes: CertificateType[] = [
    "testimonial",
    "bonafide",
    "transfer",
    "merit",
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0F5C7A]/10 dark:bg-teal-500/15 text-[#0F5C7A] dark:text-teal-300 flex items-center justify-center shrink-0">
              <ScrollText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                সনদপত্র ব্যবস্থাপনা
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                শিক্ষার্থীদের প্রশংসা পত্র, প্রত্যয়ন পত্র, ছাড়পত্র ও কৃতিত্ব পত্র তৈরি ও আর্কাইভ
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {role === "admin" && (
            <button
              type="button"
              onClick={() => setIsPadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-[#0F5C7A] dark:text-teal-400" />
              <span>প্যাড সেটিংস</span>
            </button>
          )}
          <Link
            to="/certificates/history"
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
          >
            <History className="w-4 h-4 text-[#0F5C7A] dark:text-teal-400" />
            <span>ইস্যু ইতিহাস ({toBengaliNumber(certificates.length)})</span>
          </Link>
          <Link
            to="/certificates/create/testimonial"
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0F5C7A] hover:bg-[#0D4D66] text-white flex items-center gap-2 transition-colors shadow-sm"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>নতুন সনদ তৈরি</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            মোট ইস্যুকৃত সনদ
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#0F5C7A] dark:text-teal-300 mt-1 tabular-nums">
            {toBengaliNumber(certificates.length)} টি
          </p>
        </div>
        {certificateTypes.map((type) => {
          const meta = CERTIFICATE_TYPE_META[type];
          return (
            <div
              key={type}
              className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {meta.titleBn}
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 tabular-nums">
                {toBengaliNumber(stats[type])} টি
              </p>
            </div>
          );
        })}
      </div>

      {/* 4 Certificate Type Action Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            সনদপত্রের ধরন নির্বাচন করুন
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {certificateTypes.map((type) => {
            const meta = CERTIFICATE_TYPE_META[type];
            const Icon = TYPE_ICONS[type];

            return (
              <div
                key={type}
                className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:border-[#0F5C7A]/50 dark:hover:border-teal-500/40 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={clsx(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                          meta.accentBg,
                          meta.accentText,
                          meta.accentBorder
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                          {meta.titleBn}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {meta.titleEn} · কোড: {meta.prefix}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {toBengaliNumber(stats[type])} টি ইস্যুকৃত
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                    {meta.shortDesc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <Link
                    to={`/certificates/history?type=${type}`}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0F5C7A] dark:hover:text-teal-300 transition-colors"
                  >
                    পূর্বের তালিকা দেখুন
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigate(`/certificates/create/${type}`)}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-[#0F5C7A]/10 dark:bg-teal-500/15 text-[#0F5C7A] dark:text-teal-300 hover:bg-[#0F5C7A] hover:text-white dark:hover:bg-teal-600 dark:hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>তৈরি করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Issued Certificates */}
      <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              সাম্প্রতিক ইস্যুকৃত সনদপত্র
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              সর্বশেষ তৈরি ও সংরক্ষিত সনদসমূহ
            </p>
          </div>
          {certificates.length > 0 && (
            <Link
              to="/certificates/history"
              className="text-xs sm:text-sm font-bold text-[#0F5C7A] dark:text-teal-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>সব দেখুন</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : recentCertificates.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
              এখনও কোনো সনদপত্র ইস্যু করা হয়নি
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
              উপরের যেকোনো সনদের ধরন নির্বাচন করে শিক্ষার্থীর তথ্যসহ সরাসরি প্রিন্ট ও PDF ডাউনলোড করুন।
            </p>
            <button
              type="button"
              onClick={() => navigate("/certificates/create/testimonial")}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0F5C7A] hover:bg-[#0D4D66] text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>প্রথম সনদ তৈরি করুন</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentCertificates.map((cert) => {
              const meta = CERTIFICATE_TYPE_META[cert.certificateType];
              const Icon = TYPE_ICONS[cert.certificateType];
              return (
                <div
                  key={cert.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
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
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">
                        {cert.studentName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {meta.titleBn} · {cert.className} (রোল: {toBengaliNumber(cert.roll)}) · স্মারক: {cert.memoNumber} · {toBengaliDate(cert.issueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setPreviewCert(cert)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0F5C7A]/10 dark:bg-teal-500/15 text-[#0F5C7A] dark:text-teal-300 hover:bg-[#0F5C7A] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>দেখুন ও প্রিন্ট</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CertificatePreviewModal
        certificate={previewCert}
        orgName={orgName || ""}
        onClose={() => setPreviewCert(null)}
        onEdit={(cert) => {
          setPreviewCert(null);
          navigate(`/certificates/create/${cert.certificateType}?editId=${cert.id}`);
        }}
      />

      <PadSettingsModal
        isOpen={isPadModalOpen}
        initialSettings={padSettings}
        orgName={orgName || ""}
        onClose={() => setIsPadModalOpen(false)}
        onSave={savePadSettings}
      />
    </div>
  );
};

export default CertificatesDashboard;
