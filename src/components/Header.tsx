import React from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "react-router-dom";

const MosqueIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 4.5a2.5 2.5 0 0 0-1.5-2.3 2.5 2.5 0 0 1 2.5 2.3h-1Zm0 1.5A5.5 5.5 0 0 0 6.5 11.5v4.5H5v-2a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-2h3v4h2v-3a2 2 0 1 1 4 0v3h2v-4h3v2a1 1 0 1 0 2 0v-6a1 1 0 1 0-2 0v2h-1.5v-4.5A5.5 5.5 0 0 0 12 6Z" />
  </svg>
);

interface HeaderProps {
  onMenuClick: () => void;
  onTogglePresentationMode?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onTogglePresentationMode }) => {
  const { orgName } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname.startsWith("/attendance/history")) return "হাজিরা ইতিহাস";
    if (location.pathname.startsWith("/attendance/leave")) return "ছুটি ব্যবস্থাপনা";
    if (location.pathname.startsWith("/attendance/struck-off")) return "নাম কাটা শিক্ষার্থী";
    if (location.pathname.startsWith("/attendance")) return "হাজিরা নিন";

    if (location.pathname.startsWith("/result-entry")) return "ফলাফল এন্ট্রি";
    if (location.pathname.startsWith("/result-reports")) return "ফলাফল রিপোর্ট";
    if (location.pathname.startsWith("/marksheet")) return "মার্কশিট";

    if (location.pathname.startsWith("/fees/collection")) return "ফি আদায় এন্ট্রি";
    if (location.pathname.startsWith("/fees/reports")) return "ফি আদায় রিপোর্ট";
    if (location.pathname.startsWith("/fees/setup")) return "শ্রেণিভিত্তিক ফি নির্ধারণ";
    if (location.pathname.startsWith("/fees/categories")) return "ফি খাত";

    if (location.pathname.startsWith("/calendar")) return "ক্যালেন্ডার";
    if (location.pathname.startsWith("/alumni")) return "প্রাক্তন শিক্ষার্থী";
    if (location.pathname.startsWith("/subjects")) return "বিষয় ব্যবস্থাপনা";
    if (location.pathname.startsWith("/exams")) return "পরীক্ষা ব্যবস্থাপনা";
    if (location.pathname.startsWith("/academic-years")) return "শিক্ষাবর্ষ ব্যবস্থাপনা";
    if (location.pathname.startsWith("/holidays")) return "ছুটির তালিকা";
    if (location.pathname.startsWith("/announcements")) return "ঘোষণা";

    switch (location.pathname) {
      case "/": return "ড্যাশবোর্ড";
      case "/students": return "শিক্ষার্থী";
      case "/classes": return "শ্রেণি";
      case "/reports": return "রিপোর্ট";
      case "/settings": return "সেটিংস";
      case "/super-admin": return "সুপার অ্যাডমিন ড্যাশবোর্ড";
      default: return "";
    }
  };

  return (
    <header 
      className="sticky top-0 left-0 right-0 flex items-center justify-between px-4 z-[90] shrink-0 bg-[#0F5C7A] shadow-sm"
      style={{ 
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: '16px',
      }}
    >
      <div className="flex items-center gap-3 relative z-10 w-full">
        {/* Mosque Icon */}
        <div className="flex items-center justify-center shrink-0">
          <MosqueIcon className="w-7 h-7 text-white" />
        </div>
        
        {/* Title & Subtitle */}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <h1 className="text-[18px] font-bold text-white leading-tight truncate">
            {orgName || (location.pathname === "/super-admin" ? "সুপার অ্যাডমিন" : "দারুল উলুম দত্তপাড়া")}
          </h1>
          <p className="text-[13px] font-medium text-white/80 mt-0.5 truncate">
            {getPageTitle()}
          </p>
        </div>
        
        {/* Notification Bell */}
        <div className="shrink-0 ml-3">
          <button className="relative w-8 h-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center">
            <Bell className="w-[18px] h-[18px] text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
