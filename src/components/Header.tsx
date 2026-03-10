import React, { useState, useRef, useEffect } from "react";
import { LogOut, Menu, ChevronDown, Building2, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout, orgName, orgId, visitedOrgs, joinOrganization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOrgSwitch = async (targetOrgId: string) => {
    if (targetOrgId !== orgId) {
      await joinOrganization(targetOrgId);
      setIsDropdownOpen(false);
    }
  };

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
    <header className="bg-[#045D5D] text-[#116062] border-b border-teal-800/50 h-20 flex items-center justify-between px-4 md:px-8 z-10 shadow-md">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="block relative" ref={dropdownRef}>
          <h1 className="text-xs md:text-sm font-medium text-teal-100 tracking-tight drop-shadow-sm">{getPageTitle()}</h1>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 text-left hover:bg-white/10 p-1 -ml-1 rounded-lg transition-colors"
          >
            <p className="text-lg md:text-2xl font-bold text-white drop-shadow-sm truncate max-w-[150px] md:max-w-md">
              {orgName || "প্রতিষ্ঠান নির্বাচন করুন"}
            </p>
            <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">আপনার প্রতিষ্ঠানসমূহ</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {Object.entries(visitedOrgs).map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => handleOrgSwitch(id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      id === orgId ? 'bg-teal-50 text-teal-700' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate font-medium pr-2">{name}</span>
                    {id === orgId && <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate("/org-management");
                  }}
                  className="w-full text-left px-4 py-3 flex items-center text-teal-600 hover:bg-slate-50 transition-colors font-medium"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  নতুন প্রতিষ্ঠান যুক্ত করুন
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-4 border-l border-white/20">
          <div className="w-10 h-10 rounded-full bg-[#1C542D] flex items-center justify-center text-white font-bold shadow-sm border border-white/30 backdrop-blur-sm">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white leading-none drop-shadow-sm">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-white mt-1">
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
