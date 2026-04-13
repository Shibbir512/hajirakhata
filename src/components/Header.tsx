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
      className="relative flex items-center justify-between px-4 z-[90] shrink-0"
      style={{ 
        height: '100px', // Reduced height
        paddingTop: '16px', // Reduced top padding
        background: 'linear-gradient(to bottom right, #0FAF9A, #3B82F6)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderBottomLeftRadius: '20px', // Adjusted radius
        borderBottomRightRadius: '20px', // Adjusted radius
      }}
    >
      <div className="flex items-center gap-[10px] relative z-10 w-full">
        {/* Mosque Icon */}
        <div className="flex items-center justify-center shrink-0">
          <MosqueIcon className="w-8 h-8 text-white" />
        </div>
        
        {/* Title & Subtitle */}
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <h1 className="text-[18px] font-bold text-white leading-[1.1] tracking-tight truncate">
            {orgName || (location.pathname === "/super-admin" ? "সুপার অ্যাডমিন" : "দারুল উলুম দত্তপাড়া")}
          </h1>
          <div className="h-[1px]"></div>
          <p className="text-[13px] font-medium text-white/65 tracking-wide">
            {getPageTitle()}
          </p>
        </div>
        
        {/* Notification Bell */}
        <div className="shrink-0 ml-[10px]">
          <button className="relative w-9 h-9 bg-white/15 hover:bg-white/25 rounded-xl transition-colors flex items-center justify-center backdrop-blur-md">
            <Bell className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
