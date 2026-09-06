import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-white/30 transition-colors backdrop-blur-sm"
        title="অ্যাপ ইনস্টল করুন"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">ইনস্টল</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-white/30 transition-colors backdrop-blur-sm"
          title="অ্যাপ ইনস্টল করুন"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ইনস্টল</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4 pb-8 sm:pb-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl relative animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-[17px] font-semibold text-slate-900 mb-4 pr-8">আইফোনে ইনস্টল করার নিয়ম</h3>
              <div className="space-y-4 text-[15px] text-slate-600">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-medium text-sm mt-0.5">১</div>
                  <p>নিচের সাফারী টুলবার থেকে <strong>Share</strong> (শেয়ার) বাটনে চাপ দিন।</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-medium text-sm mt-0.5">২</div>
                  <p>নিচের দিকে স্ক্রল করে <strong>Add to Home Screen</strong> নির্বাচন করুন।</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-[15px] font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
              >
                বুঝতে পেরেছি
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
