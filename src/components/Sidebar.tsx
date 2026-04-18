import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SUPER_ADMIN_EMAILS } from "../constants";
import { useAuth } from "../hooks/useAuth";
import {
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  BarChart3,
  Settings,
  Building2,
  X,
  ShieldAlert,
  GraduationCap,
  Book,
  FileText,
  ClipboardEdit,
  ChevronDown,
  CalendarDays,
  Search,
  Megaphone,
  LogOut,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import clsx from "clsx";
import logo from '../assets/logo.svg';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NavLabel = ({ name }: { name: string }) => {
  if (name === "নাম কাটা") {
    return <span className="text-red-400">{name}</span>;
  }
  return <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-cyan-100 font-semibold">{name}</span>;
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, photoURL, orgId, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  const topLinks = orgId ? [
    { name: "ড্যাশবোর্ড", path: "/", icon: LayoutDashboard },
    { name: "ক্যালেন্ডার", path: "/calendar", icon: CalendarIcon },
  ] : [];

  const bottomLinks = orgId ? [
    { name: "সেটিংস", path: "/settings", icon: Settings },
    ...(isSuperAdmin ? [{ name: "সুপার অ্যাডমিন", path: "/super-admin", icon: ShieldAlert }] : []),
  ] : [
    ...(isSuperAdmin ? [{ name: "সুপার অ্যাডমিন", path: "/super-admin", icon: ShieldAlert }] : []),
  ];

  const attendanceLinks = orgId ? [
    { name: "হাজিরা নিন", path: "/attendance", icon: CalendarCheck },
    { name: "হাজিরা ইতিহাস", path: "/attendance/history", icon: CalendarCheck },
    { name: "ছুটি", path: "/attendance/leave", icon: CalendarDays },
    { name: "নাম কাটা", path: "/attendance/struck-off", icon: Users },
  ] : [];

  const resultLinks = orgId ? [
    { name: "ফলাফল এন্ট্রি", path: "/result-entry", icon: ClipboardEdit },
    { name: "ফলাফল", path: "/result-reports", icon: FileText },
    { name: "মার্কশিট", path: "/marksheet", icon: GraduationCap },
  ] : [];

  const feeLinks = orgId ? [
    { name: "ফি আদায় এন্ট্রি", path: "/fees/collection", icon: ClipboardEdit },
    { name: "ফি আদায় রিপোর্ট", path: "/fees/reports", icon: BarChart3 },
    { name: "শ্রেণিভিত্তিক ফি নির্ধারণ", path: "/fees/setup", icon: Settings },
    { name: "ফি খাত", path: "/fees/categories", icon: BookOpen },
  ] : [];

  const studentLinks = orgId ? [
    { name: "শিক্ষার্থী", path: "/students", icon: Users },
    { name: "প্রাক্তন শিক্ষার্থী", path: "/alumni", icon: GraduationCap },
    { name: "শ্রেণি", path: "/classes", icon: BookOpen },
  ] : [];

  const configLinks = orgId ? [
    { name: "বিষয় ব্যবস্থাপনা", path: "/subjects", icon: Book },
    { name: "পরীক্ষা ব্যবস্থাপনা", path: "/exams", icon: FileText },
    { name: "ক্যালেন্ডার", path: "/calendar", icon: CalendarIcon },
    { name: "শিক্ষাবর্ষ ব্যবস্থাপনা", path: "/academic-years", icon: CalendarDays },
  ] : [];

  const otherLinks = orgId ? [
    { name: "রিপোর্ট", path: "/reports", icon: BarChart3 },
    { name: "ঘোষণা ব্যবস্থাপনা", path: "/announcements", icon: Megaphone },
    { name: "প্রতিষ্ঠান ব্যবস্থাপনা", path: "/org-management", icon: Building2 },
  ] : [
    { name: "প্রতিষ্ঠান ব্যবস্থাপনা", path: "/org-management", icon: Building2 },
  ];

  const getLinkLabel = (name: string) => {
    return <span>{name}</span>;
  };


  return (
    <div
      className="hidden lg:flex relative z-[100] w-[260px] h-full flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0"
      style={{ background: "linear-gradient(135deg, #0F5C7A 0%, #0C6C8A 40%, #14B8A6 100%)" }}
    >
      <div className="flex items-center justify-between h-[70px] border-b border-white/10 px-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="হাজিরা খাতা" className="h-10 w-auto" />
          <span className="text-[22px] font-semibold text-white tracking-tight">হাজিরা খাতা</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4 text-white">
        <nav className="px-4 space-y-4">
          {/* Dashboard Link */}
          {topLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                  isActive
                    ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                    : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02]",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-[rgba(255,255,255,0.1)]")}>
                    <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                  </div>
                  <span className="text-white">
                    {link.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* হাজিরা খাতা Group */}
          {attendanceLinks.length > 0 && (
            <div className="pt-2">
              <div className="px-4 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                হাজিরা খাতা
              </div>
              <div className="space-y-1">
                {attendanceLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                        isActive
                          ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                          : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-[rgba(255,255,255,0.1)]")}>
                          <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                        </div>
                        <span className={clsx(link.name === "নাম কাটা" ? "text-red-300" : "bg-clip-text text-transparent bg-gradient-to-r from-emerald-100 to-cyan-100")}>
                          {link.name}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {/* ফলাফল ব্যবস্থাপনা Group */}
          {resultLinks.length > 0 && (
            <div className="pt-2">
              <div className="px-4 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                ফলাফল ব্যবস্থাপনা
              </div>
              <div className="space-y-1">
                {resultLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                        isActive
                          ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                          : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-[rgba(255,255,255,0.1)]")}>
                          <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                        </div>
                        {link.name}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {/* ফি ব্যবস্থাপনা Group */}
          {feeLinks.length > 0 && (
            <div className="pt-2">
              <div className="px-4 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                ফি ব্যবস্থাপনা
              </div>
              <div className="space-y-1">
                {feeLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                        isActive
                          ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                          : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-[rgba(255,255,255,0.1)]")}>
                          <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                        </div>
                        {link.name}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {/* শিক্ষার্থী Group */}
          {studentLinks.length > 0 && (
            <div className="pt-2">
              <div className="px-4 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                শিক্ষার্থী
              </div>
              <div className="space-y-1">
                {studentLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                        isActive
                          ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                          : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-[rgba(255,255,255,0.1)]")}>
                          <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                        </div>
                        {link.name}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {/* কনফিগারেশন Group */}
          {configLinks.length > 0 && (
            <div className="pt-2">
              <div className="px-4 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                কনফিগারেশন
              </div>
              <div className="space-y-1">
                {configLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                        isActive
                          ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                          : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-[rgba(255,255,255,0.1)]")}>
                          <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                        </div>
                        {link.name}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {/* অন্যান্য Group */}
          {otherLinks.length > 0 && (
            <div className="pt-2">
              <div className="px-4 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                অন্যান্য
              </div>
              <div className="space-y-1">
                {otherLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                        isActive
                          ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                          : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-[rgba(255,255,255,0.1)]")}>
                          <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                        </div>
                        {link.name}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {/* সেটিংস Group */}
          {bottomLinks.length > 0 && (
            <div className="pt-2 pb-4">
              <div className="px-4 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                সেটিংস
              </div>
              <div className="space-y-1">
                {bottomLinks.map((link) => (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                        isActive
                          ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                          : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-[rgba(255,255,255,0.1)]")}>
                          <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                        </div>
                        {link.name}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>
      <div className="p-4 border-t border-white/10 w-full relative" ref={profileMenuRef}>
        {isProfileMenuOpen && (
          <div className="absolute bottom-[calc(100%-10px)] left-4 right-4 mb-2 bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[110] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 transition-colors font-medium text-[14px]"
            >
              <LogOut className="w-4 h-4 mr-3" />
              লগ আউট
            </button>
          </div>
        )}
        <button
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="w-full flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/10 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shadow-sm border border-white/30 overflow-hidden shrink-0">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-white truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-[12px] text-white/70 truncate">{user?.email}</p>
          </div>
          <ChevronDown className={clsx("w-4 h-4 text-white/70 transition-transform flex-shrink-0", isProfileMenuOpen && "rotate-180")} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
