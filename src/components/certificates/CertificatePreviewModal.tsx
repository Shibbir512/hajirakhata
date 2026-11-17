import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Download, Loader2, Edit3 } from "lucide-react";
import { CertificateRecord } from "../../types";
import { CertificateFrame } from "./CertificateFrame";
import { generateCertificatePdfBlob } from "../../utils/certificatePdf";
import { CERTIFICATE_TYPE_META } from "../../utils/certificateTemplates";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";

interface CertificatePreviewModalProps {
  certificate: CertificateRecord | null;
  orgName: string;
  onClose: () => void;
  onEdit?: (cert: CertificateRecord) => void;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  certificate,
  orgName,
  onClose,
  onEdit,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!viewportRef.current) return;
      const availableWidth = viewportRef.current.clientWidth - 32;
      if (availableWidth > 0 && availableWidth < 794) {
        setScale(availableWidth / 794);
      } else {
        setScale(1);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [certificate]);

  if (!certificate || typeof document === "undefined") return null;

  const meta = CERTIFICATE_TYPE_META[certificate.certificateType];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading("PDF তৈরি হচ্ছে...");
    try {
      const blob = await generateCertificatePdfBlob("certificate-modal-pdf-source");
      const safeName = (certificate.studentName || "certificate").replace(/\s+/g, "_");
      const safeMemo = (certificate.memoNumber || certificate.id).replace(/[\/\\]/g, "-");
      saveAs(blob, `${meta.prefix}-${safeName}-${safeMemo}.pdf`);
      toast.success("PDF ডাউনলোড সফল হয়েছে!", { id: toastId });
    } catch (error) {
      console.error("Certificate PDF Error:", error);
      toast.error("PDF তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে প্রিন্ট অপশন ব্যবহার করুন।", {
        id: toastId,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const frameProps = {
    certificateType: certificate.certificateType,
    templateStyle: certificate.templateStyle || "classic",
    memoNumber: certificate.memoNumber,
    issueDate: certificate.issueDate,
    studentName: certificate.studentName,
    fatherName: certificate.fatherName,
    motherName: certificate.motherName,
    address: certificate.address,
    roll: certificate.roll,
    studentUid: certificate.studentUid,
    className: certificate.className,
    academicYear: certificate.academicYear,
    customTitle: certificate.customTitle,
    customBody: certificate.customBody,
    padSettings: certificate.padSettings || {},
    orgName,
    issuedByName: certificate.issuedBy?.name,
  };

  return createPortal(
    <div className="certificate-modal-portal fixed inset-0 z-[9999] flex flex-col bg-slate-950/80 backdrop-blur-sm">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-[#111C2E] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg truncate">
            {certificate.customTitle || meta.titleBn} · {certificate.studentName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            স্মারক নং: {certificate.memoNumber} · {certificate.className}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(certificate)}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">সম্পাদনা</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#0F5C7A] hover:bg-[#0D4D66] text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable A4 Sheet Viewport */}
      <div
        ref={viewportRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 print:p-0 flex justify-center items-start"
      >
        <div
          id="certificate-print-container"
          style={{
            width: `${794 * scale}px`,
            height: `${1123 * scale}px`,
          }}
        >
          <div
            className="shadow-2xl origin-top-left"
            style={{
              width: "794px",
              transform: `scale(${scale})`,
            }}
          >
            <CertificateFrame {...frameProps} />
          </div>
        </div>
      </div>

      {/* Offscreen Unscaled 1:1 Source for PDF Capture */}
      <div
        className="print:hidden"
        style={{ position: "fixed", left: "-9999px", top: 0, pointerEvents: "none" }}
      >
        <div id="certificate-modal-pdf-source">
          <CertificateFrame {...frameProps} />
        </div>
      </div>
    </div>,
    document.body
  );
};
