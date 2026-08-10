import React, { useState } from "react";
import { HelpCircle, FileText, Phone, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Download, Mail } from "lucide-react";
import CsvImportInstructionsModal from "../components/CsvImportInstructionsModal";
import WhatsAppSupportButton from "../components/WhatsAppSupportButton";

const Help: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>("guide");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const toggleSection = (section: string) => {
    if (openSection === section) {
      setOpenSection(null);
    } else {
      setOpenSection(section);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <HelpCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold">হেল্প ও সাপোর্ট</h1>
          </div>
          <p className="text-blue-100 max-w-xl text-lg mt-2">
            আপনার যেকোনো জিজ্ঞাসা, সমস্যা বা মতামতের জন্য আমরা প্রস্তুত। নিচের অপশনগুলো থেকে আপনার প্রয়োজনীয়টি বেছে নিন।
          </p>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-32 w-40 h-40 bg-indigo-400/30 rounded-full blur-2xl translate-y-1/2 pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* User Guide Section */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
          <button 
            onClick={() => toggleSection('guide')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-slate-800">ব্যাবহার নির্দেশিকা</h2>
                <p className="text-sm text-slate-500 mt-1">সিস্টেমটি ব্যবহারের সাধারণ নিয়মাবলী এবং গাইডলাইন</p>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 transition-transform duration-300 ${openSection === 'guide' ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-5 h-5" />
            </div>
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${openSection === 'guide' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="p-6 pt-0 border-t border-slate-100">
                <div className="space-y-6 mt-4">
                  {/* CSV Import Rule Card */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                    <div className="flex items-start justify-between sm:items-center flex-col sm:flex-row gap-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <Download className="w-5 h-5 text-indigo-500" />
                          একসাথে অনেক শিক্ষার্থী যোগ (CSV Import)
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">কিভাবে এক্সেল বা CSV ফাইলের মাধ্যমে একসাথে পুরো ক্লাসের শিক্ষার্থী যোগ করবেন তার বিস্তারিত নিয়ম।</p>
                      </div>
                      <button 
                        onClick={() => setIsCsvModalOpen(true)}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center"
                      >
                        নিয়মাবলী দেখুন
                      </button>
                    </div>
                  </div>

                  {/* General Guidelines */}
                  <div className="space-y-6 mt-6">
                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">১. ড্যাশবোর্ড (Dashboard)</h3>
                      <ul className="space-y-2 list-disc pl-5 text-sm text-slate-600">
                        <li><strong>ওভারভিউ:</strong> ড্যাশবোর্ডে আপনি আজকের উপস্থিতির হার, মোট শিক্ষার্থী, এবং কতগুলো ক্লাসের হাজিরা বাকি আছে তার একনজরে পরিসংখ্যান দেখতে পারবেন।</li>
                        <li><strong>হাজিরা বাকি:</strong> "হাজিরা বাকি" কার্ডে ক্লিক করলে একটি পপআপ দেখাবে, যেখান থেকে সরাসরি নির্দিষ্ট ক্লাসের হাজিরা নেওয়া যাবে।</li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">২. হাজিরা খাতা (Attendance)</h3>
                      <ul className="space-y-2 list-disc pl-5 text-sm text-slate-600">
                        <li><strong>দৈনন্দিন হাজিরা:</strong> প্রথমে নির্দিষ্ট ক্লাস নির্বাচন করুন। এরপর প্রতিটি শিক্ষার্থীর নামের পাশে উপস্থিত, অনুপস্থিত অথবা ছুটি মার্ক করুন। কাজ শেষে অবশ্যই 'সেভ করুন' বাটনে চাপ দিন।</li>
                        <li><strong>এসএমএস (WhatsApp):</strong> যারা অনুপস্থিত থাকবে, হাজিরা সেভ করার পর চাইলে তাদের অভিভাবকদের নাম্বারে সরাসরি WhatsApp এর মাধ্যমে মেসেজ পাঠানো যাবে।</li>
                        <li><strong>ছুটি ব্যবস্থাপনা:</strong> 'ছুটি' সাব-মেনু থেকে কোনো শিক্ষার্থী অগ্রিম ছুটি নিলে তা এন্ট্রি করে রাখা যায়।</li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">৩. ফি (Fees) ব্যবস্থাপনা</h3>
                      <ul className="space-y-2 list-disc pl-5 text-sm text-slate-600">
                        <li><strong>ফি সেটআপ:</strong> প্রথমে 'ফি সেটআপ' থেকে ক্লাসভিত্তিক বা সাধারণ ফি-এর খাত (যেমন: মাসিক বেতন, ভর্তি ফি) তৈরি করে নিতে হবে।</li>
                        <li><strong>ফি আদায়:</strong> 'ফি আদায়' অপশনে গিয়ে শিক্ষার্থীর নাম বা রোল সার্চ করে ফি গ্রহণ করা যাবে এবং সাথে সাথে মানি রিসিট বা ইনভয়েস প্রিন্ট করা যাবে।</li>
                        <li><strong>রিপোর্ট:</strong> 'ফি রিপোর্ট' অপশন থেকে দৈনিক বা মাসিক কত টাকা আদায় হলো তার হিসাব দেখা যাবে।</li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">৪. ফলাফল (Results)</h3>
                      <ul className="space-y-2 list-disc pl-5 text-sm text-slate-600">
                        <li><strong>পরীক্ষা তৈরি:</strong> প্রথমে 'পরীক্ষা' সাব-মেনু থেকে নতুন একটি পরীক্ষার নাম, বছর ও বিষয় নির্ধারণ করে পরীক্ষা তৈরি করতে হবে।</li>
                        <li><strong>ফলাফল এন্ট্রি:</strong> 'ফলাফল এন্ট্রি' মেনুতে গিয়ে ক্লাস এবং পরীক্ষা নির্বাচন করে প্রতিটি শিক্ষার্থীর প্রাপ্ত নম্বর বসাতে হবে।</li>
                        <li><strong>মার্কশিট:</strong> 'মার্কশিট' মেনু থেকে পুরো ক্লাসের বা নির্দিষ্ট শিক্ষার্থীর মার্কশিট PDF আকারে তৈরি ও প্রিন্ট করা যাবে।</li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">৫. শিক্ষার্থী (Students)</h3>
                      <ul className="space-y-2 list-disc pl-5 text-sm text-slate-600">
                        <li><strong>নতুন ভর্তি:</strong> 'শিক্ষার্থী' মেনু থেকে 'শিক্ষার্থী যোগ' বাটনে ক্লিক করে নতুন শিক্ষার্থী ভর্তি করা যাবে। ছবি যুক্ত করলে তা মার্কশিট ও আইডিকার্ডে দেখাবে।</li>
                        <li><strong>একসাথে যোগ (CSV):</strong> এক্সেল ফাইলের মাধ্যমে পুরো ক্লাসের ডাটা একসাথে আপলোড করা যাবে (এর নিয়মাবলী উপরে দেওয়া আছে)।</li>
                        <li><strong>প্রমোশন:</strong> বছর শেষে এক ক্লাস থেকে অন্য ক্লাসে প্রমোশন দেওয়ার জন্য 'প্রমোশন' বাটনটি ব্যবহার করুন।</li>
                        <li><strong>নাম কাটা:</strong> কোনো শিক্ষার্থী চলে গেলে তার নামের পাশে থাকা মেনু থেকে 'নাম কাটুন' নির্বাচন করুন।</li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">৬. সেটিংস (Settings)</h3>
                      <ul className="space-y-2 list-disc pl-5 text-sm text-slate-600">
                        <li><strong>অতিরিক্ত ফিল্ড:</strong> শিক্ষার্থীর প্রোফাইলে যদি নতুন কোনো তথ্যের ঘর (যেমন: রক্তের গ্রুপ, ধর্ম) লাগে, তবে সেটিংস থেকে 'অতিরিক্ত ফিল্ড' যুক্ত করা যাবে।</li>
                        <li><strong>প্রতিষ্ঠান কোড:</strong> শিক্ষার্থীদের অনলাইনে রেজাল্ট দেখার জন্য আপনার প্রতিষ্ঠানের কোডটি সেটিংসে দেওয়া আছে।</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Issue Section */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
          <button 
            onClick={() => toggleSection('issue')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-slate-800">সমস্যা জানান</h2>
                <p className="text-sm text-slate-500 mt-1">সিস্টেমে কোনো সমস্যা বা ত্রুটি পেলে আমাদের জানান</p>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 transition-transform duration-300 ${openSection === 'issue' ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-5 h-5" />
            </div>
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${openSection === 'issue' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="p-6 pt-0 border-t border-slate-100">
                <div className="mt-4 space-y-4">
                  <p className="text-slate-600">যেকোনো টেকনিক্যাল সমস্যা দ্রুত সমাধানের জন্য আমাদের WhatsApp বা ইমেইলে সরাসরি স্ক্রিনশট সহ জানান।</p>
                  <div className="flex flex-wrap gap-3">
                    <a 
                      href="https://wa.me/8801911963117" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#128C7E] transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      WhatsApp এ জানান
                    </a>
                    <a 
                      href="mailto:shibbir.ahma.2025@gmail.com" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      ইমেইলে জানান
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
          <button 
            onClick={() => toggleSection('feedback')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-slate-800">মতামত ও ফিডব্যাক</h2>
                <p className="text-sm text-slate-500 mt-1">সিস্টেমের উন্নয়নে আপনার মূল্যবান পরামর্শ দিন</p>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 transition-transform duration-300 ${openSection === 'feedback' ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-5 h-5" />
            </div>
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${openSection === 'feedback' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="p-6 pt-0 border-t border-slate-100">
                <div className="mt-4 space-y-4">
                  <p className="text-slate-600">আমরা সবসময় সিস্টেমকে আরও উন্নত করার চেষ্টা করছি। নতুন কোনো ফিচার প্রয়োজন হলে বা কোনো পরামর্শ থাকলে আমাদের ইমেইল করে জানাতে পারেন।</p>
                  
                  <a 
                    href="mailto:shibbir.ahma.2025@gmail.com?subject=মতামত ও ফিডব্যাক" 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    মতামত পাঠান (Email)
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
          <button 
            onClick={() => toggleSection('contact')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-slate-800">যোগাযোগ</h2>
                <p className="text-sm text-slate-500 mt-1">সাপোর্ট টিমের সাথে যোগাযোগ করুন</p>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 transition-transform duration-300 ${openSection === 'contact' ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-5 h-5" />
            </div>
          </button>
          
          <div className={`grid transition-all duration-300 ease-in-out ${openSection === 'contact' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="p-6 pt-0 border-t border-slate-100">
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-blue-500 shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium mb-1.5">হটলাইন / WhatsApp</p>
                      <WhatsAppSupportButton variant="badge" label="মেসেজ দিন" className="mb-1.5" />
                      <p className="text-xs text-slate-400">সকাল ৯টা থেকে রাত ৮টা</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 text-blue-500 shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">ইমেইল</p>
                      <p className="font-bold text-slate-800 text-sm sm:text-base mt-0.5 break-all">shibbir.ahma.2025@gmail.com</p>
                      <p className="text-xs text-slate-400 mt-1">যেকোনো সময়</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <CsvImportInstructionsModal 
        isOpen={isCsvModalOpen} 
        onClose={() => setIsCsvModalOpen(false)} 
      />
    </div>
  );
};

export default Help;
