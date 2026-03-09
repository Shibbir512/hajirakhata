import React from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout, orgName } = useAuth();
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
      default:
        return "ড্যাশবোর্ড";
    }
  };

  return (
    <header className="bg-[#008080] text-white border-b border-teal-800/50 h-20 flex items-center justify-between px-4 md:px-8 z-10 shadow-md">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden lg:block">
          <h1 className="text-sm font-medium text-teal-100 tracking-tight drop-shadow-sm">{getPageTitle()}</h1>
          {orgName && <p className="text-2xl font-bold text-white drop-shadow-sm mt-0.5">{orgName}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-4 border-l border-white/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shadow-sm border border-white/30 backdrop-blur-sm">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white leading-none drop-shadow-sm">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-teal-100 mt-1">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-full hover:bg-red-500/20 text-white/80 hover:text-red-200 transition-colors ml-2"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
