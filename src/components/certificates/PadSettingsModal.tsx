import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save, Building2, Loader2 } from "lucide-react";
import { CertificatePadSettings } from "../../types";

interface PadSettingsModalProps {
  isOpen: boolean;
  initialSettings: CertificatePadSettings;
  orgName: string;
  onClose: () => void;
  onSave: (settings: CertificatePadSettings) => Promise<boolean>;
}

export const PadSettingsModal: React.FC<PadSettingsModalProps> = ({
  isOpen,
  initialSettings,
  orgName,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<CertificatePadSettings>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        orgNameBn: initialSettings.orgNameBn || orgName || "",
        address: initialSettings.address || "",
        phone: initialSettings.phone || "",
        email: initialSettings.email || "",
        established: initialSettings.established || "",
        eiinOrCode: initialSettings.eiinOrCode || "",
        logoUrl: initialSettings.logoUrl || "/icon.png",
        principalTitle: initialSettings.principalTitle || "মুহতামিম / অধ্যক্ষ",
        principalName: initialSettings.principalName || "",
        showBismillah: initialSettings.showBismillah ?? true,
        showWatermark: initialSettings.showWatermark ?? true,
        showQrCode: initialSettings.showQrCode ?? true,
      });
    }
  }, [isOpen, initialSettings, orgName]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#0F5C7A] to-[#14B8A6] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">প্রতিষ্ঠানের প্যাড ও স্বাক্ষর সেটিংস</h3>
              <p className="text-xs text-white/80">সকল সনদপত্রে স্বয়ংক্রিয়ভাবে ব্যবহৃত হেডার ও স্বাক্ষর তথ্য</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                প্রতিষ্ঠানের পূর্ণ নাম (প্যাডের শিরোনাম)
              </label>
              <input
                type="text"
                value={form.orgNameBn || ""}
                onChange={(e) => setForm({ ...form, orgNameBn: e.target.value })}
                placeholder="যেমন: জামিয়া আরাবিয়া দারুল উলূম..."
                className="input-premium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                প্রতিষ্ঠানের ঠিকানা
              </label>
              <input
                type="text"
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="গ্রাম/মহল্লা, ডাকঘর, উপজেলা, জেলা"
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                স্থাপিত সন
              </label>
              <input
                type="text"
                value={form.established || ""}
                onChange={(e) => setForm({ ...form, established: e.target.value })}
                placeholder="যেমন: ১৯৯৫ ইং / ১৪১৫ হি."
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                প্রতিষ্ঠান কোড / ইআইআইএন
              </label>
              <input
                type="text"
                value={form.eiinOrCode || ""}
                onChange={(e) => setForm({ ...form, eiinOrCode: e.target.value })}
                placeholder="প্রতিষ্ঠান কোড"
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                মোবাইল নম্বর
              </label>
              <input
                type="text"
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="০১XXXXXXXXX"
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                ইমেইল (ঐচ্ছিক)
              </label>
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="info@madrasa.org"
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                প্রধানের পদবি (স্বাক্ষর লাইন)
              </label>
              <input
                type="text"
                value={form.principalTitle || ""}
                onChange={(e) => setForm({ ...form, principalTitle: e.target.value })}
                placeholder="মুহতামিম / অধ্যক্ষ / প্রধান শিক্ষক"
                className="input-premium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                প্রধানের নাম (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={form.principalName || ""}
                onChange={(e) => setForm({ ...form, principalName: e.target.value })}
                placeholder="মাওলানা / অধ্যক্ষের নাম"
                className="input-premium"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showBismillah ?? true}
                onChange={(e) => setForm({ ...form, showBismillah: e.target.checked })}
                className="w-4 h-4 accent-[#0F5C7A]"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                বিসমিল্লাহ শিরোনাম
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showWatermark ?? true}
                onChange={(e) => setForm({ ...form, showWatermark: e.target.checked })}
                className="w-4 h-4 accent-[#0F5C7A]"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                জলছাপ (Watermark)
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.showQrCode ?? true}
                onChange={(e) => setForm({ ...form, showQrCode: e.target.checked })}
                className="w-4 h-4 accent-[#0F5C7A]"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                QR কোড যাচাইকরণ
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-[#0F5C7A] hover:bg-[#0D4D66] text-white flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
