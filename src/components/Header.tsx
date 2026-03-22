import React, { useState, useRef, useEffect } from "react";
import { LogOut, Menu, ChevronDown, Building2, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout, orgName, orgId, visitedOrgs, joinOrganization, photoURL } = useAuth();
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
      case "/super-admin":
        return "সুপার অ্যাডমিন";
      default:
        return "ড্যাশবোর্ড";
    }
  };

  return (
    <header 
      className="text-white flex items-center justify-between px-4 md:px-8 z-[60]"
      style={{ 
        height: '70px',
        background: 'linear-gradient(to right, #14B8A6, #3B82F6)',
        boxShadow: '0px 2px 10px rgba(0,0,0,0.08)'
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="block relative" ref={dropdownRef}>
          <h1 className="text-xs md:text-sm font-medium text-white/80 tracking-tight">{getPageTitle()}</h1>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 text-left hover:bg-white/10 p-1 -ml-1 rounded-lg transition-colors w-full"
          >
            <p className="text-[14.875px] md:text-[22px] font-semibold text-white truncate max-w-[140px] sm:max-w-[200px] md:max-w-md">
              {orgName || (location.pathname === "/super-admin" ? "সুপার অ্যাডমিন ড্যাশবোর্ড" : "প্রতিষ্ঠান নির্বাচন করুন")}
            </p>
            <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 text-white transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.08)] border border-[#E5E7EB] py-2 z-[100]">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">আপনার প্রতিষ্ঠানসমূহ</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {Object.entries(visitedOrgs).map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => handleOrgSwitch(id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      id === orgId ? 'bg-[#0F5C7A]/5 text-[#0F5C7A]' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate font-medium pr-2">{name}</span>
                    {id === orgId && <Check className="w-4 h-4 text-[#0F5C7A] flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate("/org-management");
                  }}
                  className="w-full text-left px-4 py-3 flex items-center text-[#0F5C7A] hover:bg-slate-50 transition-colors font-medium"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  নতুন প্রতিষ্ঠান যুক্ত করুন
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
        <button
          onClick={logout}
          className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-white/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shadow-sm border border-white/30 overflow-hidden">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"
            )}
          </div>
          <div className="hidden md:block">
            <p className="text-[14px] font-medium text-white leading-none">
              {user?.displayName || "User"}
            </p>
            <p className="text-[12px] text-white/80 mt-1">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
