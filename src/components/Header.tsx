import React from "react";
import { MonitorPlay, Bell } from "lucide-react";
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
    switch (location.pathname) {
      case "/": return "ড্যাশবোর্ড";
      case "/attendance": return "হাজিরা";
      case "/students": return "শিক্ষার্থী";
      case "/classes": return "শ্রেণি";
      case "/reports": return "রিপোর্ট";
      case "/settings": return "সেটিংস";
      case "/super-admin": return "সুপার অ্যাডমিন";
      default: return "ড্যাশবোর্ড";
    }
  };

  return (
    <header 
      className="relative flex items-center justify-between px-5 z-[90] shrink-0"
      style={{ 
        height: '115px',
        paddingTop: '35px', // Simulates status bar space
        background: 'linear-gradient(180deg, #0d7587 0%, #24b5a6 100%)',
      }}
    >
      {/* Bottom Glow Effect (আস্তে আস্তে নিচের দিকে এগিয়ে আসা) */}
      <div className="absolute -bottom-5 left-0 right-0 h-5 bg-gradient-to-b from-[#24b5a6]/40 to-transparent blur-sm pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/30 pointer-events-none"></div>
      
      <div className="flex items-center gap-4 relative z-10">
        {/* Mosque Icon */}
        <div className="flex items-center justify-center">
          <MosqueIcon className="w-11 h-11 text-white drop-shadow-sm" />
        </div>
        
        {/* Title & Subtitle */}
        <div className="flex flex-col justify-center">
          <h1 className="text-[22px] font-bold text-white leading-tight tracking-tight max-w-[220px] sm:max-w-[300px] truncate drop-shadow-sm">
            {orgName || (location.pathname === "/super-admin" ? "সুপার অ্যাডমিন" : "দারুল উলুম দত্তপাড়া")}
          </h1>
          <p className="text-[14px] font-medium text-white/90 mt-0.5 tracking-wide">
            {getPageTitle()}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 relative z-10">
        {onTogglePresentationMode && (
          <button 
            onClick={onTogglePresentationMode}
            className="w-11 h-11 bg-[#38c1b1] hover:bg-[#2fa89a] rounded-[14px] transition-colors flex items-center justify-center shadow-sm"
            title="প্রেজেন্টেশন মোড"
          >
            <MonitorPlay className="w-5 h-5 text-white" />
          </button>
        )}
        
        {/* Notification Bell */}
        <button className="relative w-11 h-11 bg-[#38c1b1] hover:bg-[#2fa89a] rounded-[14px] transition-colors flex items-center justify-center shadow-sm">
          <Bell className="w-6 h-6 text-white" fill="currentColor" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#38c1b1]">
            ৭
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
