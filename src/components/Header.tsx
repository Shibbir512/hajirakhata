import React from "react";
import { Menu, MonitorPlay } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
  onTogglePresentationMode?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onTogglePresentationMode }) => {
  const { orgName, orgId } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "ড্যাশবোর্ড";
      case "/attendance":
        return "হাজিরা";
      case "/students":
        return "শিক্ষার্থী";
      case "/classes":
        return "শ্রেণি";
      case "/reports":
        return "রিপোর্ট";
      case "/settings":
        return "সেটিংস";
      case "/super-admin":
        return "সুপার অ্যাডমিন";
      default:
        return "ড্যাশবোর্ড";
    }
  };

  return (
    <header 
      className="text-white flex items-center justify-between px-4 md:px-8 z-[90]"
      style={{ 
        height: '70px',
        background: 'linear-gradient(to right, #14B8A6, #3B82F6)',
        boxShadow: '0px 2px 10px rgba(0,0,0,0.08)'
      }}
    >
      <div className="flex items-center gap-4">
        <div className="block relative">
          <h1 className="text-xs md:text-sm font-medium text-white/80 tracking-tight">{getPageTitle()}</h1>
          <p className="text-[14.875px] md:text-[22px] font-semibold text-white truncate max-w-[200px] sm:max-w-[300px] md:max-w-xl">
            {orgName || (location.pathname === "/super-admin" ? "সুপার অ্যাডমিন ড্যাশবোর্ড" : "প্রতিষ্ঠান নির্বাচন করুন")}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {onTogglePresentationMode && (
          <button 
            onClick={onTogglePresentationMode}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
            title="প্রেজেন্টেশন মোড"
          >
            <MonitorPlay className="w-4 h-4 md:w-5 md:h-5 text-white" />
            <span className="hidden md:inline">প্রেজেন্টেশন</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
