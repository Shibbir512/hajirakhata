import React from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
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
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">{getPageTitle()}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-slate-100 relative transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-sm">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-900 leading-none">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors ml-2"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
