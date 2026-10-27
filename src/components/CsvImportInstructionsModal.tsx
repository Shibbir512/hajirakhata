import React from "react";
import { X, FileSpreadsheet, Download, Info, CheckCircle2 } from "lucide-react";

interface CsvImportInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CsvImportInstructionsModal: React.FC<CsvImportInstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    // Add UTF-8 BOM for proper Bengali character rendering in Excel
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = "নাম,পিতার নাম,ফোন নম্বর,ঠিকানা,রক্তের গ্রুপ\nমোহাম্মদ আলী,আব্দুর রহমান,01700000000,ঢাকা,A+\nআব্দুল্লাহ,আব্দুল করিম,01800000000,রাজশাহী,B+";
    const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-[24px] w-full max-w-3xl overflow-hidden shadow-2xl my-4 sm:my-8 flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between bg-[#F8FAFC] dark:bg-slate-900/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1E293B] dark:text-slate-100">CSV আমদানির নিয়মাবলী</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">একসাথে অনেক শিক্ষার্থী যোগ করার সঠিক নিয়ম</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto text-slate-700 dark:text-slate-200 space-y-8">
          
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/80 p-4 rounded-xl flex gap-3 text-blue-800 dark:text-blue-200">
            <Info className="w-6 h-6 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold mb-1">CSV ফাইল কী?</p>
              <p>CSV (Comma Separated Values) হলো একটি সাধারণ স্প্রেডশিট ফাইল যা Excel, Google Sheets, বা যেকোনো টেক্সট এডিটর দিয়ে তৈরি করা যায়। একসাথে অনেক তথ্য আপলোড করার জন্য এটি ব্যবহৃত হয়।</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">১. ফাইলের কলাম (হেডার) সেটআপ</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">ফাইলের প্রথম সারিতে (Row 1) অবশ্যই কলামের নামগুলো নিচের মতো করে লিখতে হবে। কলামের নামগুলো ঠিক বাংলায় অথবা ইংরেজিতে যেভাবে দেওয়া আছে, সেভাবেই লিখতে হবে:</p>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold">কলামের নাম (বাংলা)</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold">অথবা (ইংরেজি)</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold">বিবরণ</th>
                    <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold text-center">আবশ্যক?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">নাম</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Name</td>
                    <td className="px-4 py-3">শিক্ষার্থীর পুরো নাম</td>
                    <td className="px-4 py-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">হ্যাঁ</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">পিতার নাম</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Father Name</td>
                    <td className="px-4 py-3">পিতার নাম</td>
                    <td className="px-4 py-3 text-center text-slate-400 dark:text-slate-500">না</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">ফোন নম্বর</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Phone</td>
                    <td className="px-4 py-3">অভিভাবকের মোবাইল নম্বর</td>
                    <td className="px-4 py-3 text-center text-slate-400 dark:text-slate-500">না</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">ঠিকানা</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Address</td>
                    <td className="px-4 py-3">বর্তমান বা স্থায়ী ঠিকানা</td>
                    <td className="px-4 py-3 text-center text-slate-400 dark:text-slate-500">না</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">রক্তের গ্রুপ</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">Blood Group</td>
                    <td className="px-4 py-3">যেমন: A+, O-, B+</td>
                    <td className="px-4 py-3 text-center text-slate-400 dark:text-slate-500">না</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
              <strong>নোট:</strong> কলামের সিরিয়াল আগে-পিছে হলে সমস্যা নেই, তবে কলামের নাম (Header) ঠিক থাকতে হবে।
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">২. কীভাবে ফাইলটি তৈরি করবেন?</h3>
            <ul className="space-y-3 text-sm list-disc pl-5 text-slate-600 dark:text-slate-300">
              <li>আপনার কম্পিউটারে <strong>Microsoft Excel</strong> বা <strong>Google Sheets</strong> খুলুন।</li>
              <li>প্রথম সারিতে (১ম লাইনে) কলামের নামগুলো লিখুন (যেমন: নাম, পিতার নাম, ফোন নম্বর ইত্যাদি)।</li>
              <li>দ্বিতীয় সারি থেকে শিক্ষার্থীদের তথ্য পূরণ করা শুরু করুন।</li>
              <li>কাজ শেষ হলে, ফাইলটি সেভ করার সময় <strong>Save As</strong> এ গিয়ে ফাইলের ধরন <strong>CSV (Comma delimited) (*.csv)</strong> সিলেক্ট করে সেভ করুন।</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">৩. ডেমো / টেমপ্লেট ফাইল</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">আপনি চাইলে আমাদের তৈরি করা একটি রেডিমেড ডেমো CSV ফাইল ডাউনলোড করে নিতে পারেন। সেখানে শুধু ডেমো তথ্যগুলো মুছে আপনার শিক্ষার্থীদের তথ্য বসিয়ে সেভ করলেই হবে।</p>
            
            <button
              onClick={handleDownloadTemplate}
              className="mt-2 flex items-center gap-2 px-6 py-3 bg-[#0F5C7A] text-white rounded-xl font-bold hover:bg-[#0C4A63] transition-colors shadow-md"
            >
              <Download className="w-5 h-5" />
              টেমপ্লেট CSV ফাইলটি ডাউনলোড করুন
            </button>
          </div>

        </div>

        <div className="p-6 border-t border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end sticky bottom-0">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

export default CsvImportInstructionsModal;
