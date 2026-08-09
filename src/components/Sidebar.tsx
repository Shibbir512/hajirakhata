import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";
import logo from '../assets/logo.svg';
import WhatsAppSupportButton from "./WhatsAppSupportButton";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NavLabel = ({ name }: { name: string }) => {
  if (name === "নাম কাটা") {
    return <span className="text-rose-200">{name}</span>;
  }
  return <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-cyan-100 font-semibold">{name}</span>;
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, photoURL, orgId, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    attendance: false,
    fees: false,
    results: false,
    students: false,
    settings: false
  });
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

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/attendance')) setOpenSections(prev => ({ ...prev, attendance: true }));
    else if (path.startsWith('/fees')) setOpenSections(prev => ({ ...prev, fees: true }));
    else if (path.startsWith('/result') || path.startsWith('/mark')) setOpenSections(prev => ({ ...prev, results: true }));
    else if (path.startsWith('/student') || path === '/alumni' || path === '/classes') setOpenSections(prev => ({ ...prev, students: true }));
    else if (path === '/settings' || path === '/calendar' || path === '/subjects' || path === '/exams' || path === '/academic-years' || path === '/reports' || path === '/announcements') setOpenSections(prev => ({ ...prev, settings: true }));
  }, [location.pathname]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  const topLinks = orgId ? [
    { name: "ড্যাশবোর্ড", path: "/", icon: LayoutDashboard },
  ] : [];

  const attendanceLinks = orgId ? [
    { name: "হাজিরা নিন", path: "/attendance", icon: CalendarCheck },
    { name: "হাজিরা ইতিহাস", path: "/attendance/history", icon: CalendarCheck },
    { name: "ছুটি", path: "/attendance/leave", icon: CalendarDays },
    { name: "নাম কাটা", path: "/attendance/struck-off", icon: Users },
  ] : [];

  const feeLinks = orgId ? [
    { name: "ফি আদায়", path: "/fees/collection", icon: ClipboardEdit },
    { name: "ফি রিপোর্ট", path: "/fees/reports", icon: BarChart3 },
    { name: "ফি সেটআপ", path: "/fees/setup", icon: Settings },
    { name: "ফি খাত", path: "/fees/categories", icon: BookOpen },
  ] : [];

  const resultLinks = orgId ? [
    { name: "ফলাফল এন্ট্রি", path: "/result-entry", icon: ClipboardEdit },
    { name: "ফলাফল", path: "/result-reports", icon: FileText },
    { name: "মার্কশিট", path: "/marksheet", icon: GraduationCap },
    { name: "ফলাফল অনুসন্ধান", path: "/result-search", icon: Search },
  ] : [];

  const studentLinks = orgId ? [
    { name: "শিক্ষার্থী", path: "/students", icon: Users },
    { name: "প্রাক্তন শিক্ষার্থী", path: "/alumni", icon: GraduationCap },
    { name: "শ্রেণি", path: "/classes", icon: BookOpen },
  ] : [];

  const settingsLinks = orgId ? [
    { name: "সেটিংস", path: "/settings", icon: Settings },
    { name: "ক্যালেন্ডার", path: "/calendar", icon: CalendarDays },
    { name: "বিষয়", path: "/subjects", icon: Book },
    { name: "পরীক্ষা", path: "/exams", icon: FileText },
    { name: "শিক্ষাবর্ষ", path: "/academic-years", icon: CalendarDays },
    { name: "রিপোর্ট", path: "/reports", icon: BarChart3 },
    { name: "ঘোষণা", path: "/announcements", icon: Megaphone },
    ...(isSuperAdmin ? [{ name: "সুপার অ্যাডমিন", path: "/super-admin", icon: ShieldAlert }] : []),
    { name: "প্রতিষ্ঠান পরিবর্তন", path: "/org-management", icon: Building2 },
  ] : [
    ...(isSuperAdmin ? [{ name: "সুপার অ্যাডমিন", path: "/super-admin", icon: ShieldAlert }] : []),
    { name: "প্রতিষ্ঠান পরিবর্তন", path: "/org-management", icon: Building2 },
  ];

  const renderTopLinks = (links: any[]) => {
    return links.map((link) => (
      <NavLink
        key={link.name}
        to={link.path}
        onClick={() => setIsOpen(false)}
        className={({ isActive }) =>
          clsx(
            "flex items-center px-4 py-3 mb-2 rounded-xl transition-all duration-200 font-semibold text-[15.5px] tracking-wide",
            isActive
              ? "bg-white/15 text-white shadow-sm"
              : "text-white/80 hover:bg-white/10 hover:text-white"
          )
        }
      >
        {({ isActive }) => (
          <>
            <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center mr-4 shadow-sm", isActive ? "bg-white/20 text-white" : "bg-white/5 text-white/70")}>
              <link.icon className={clsx("w-5 h-5")} />
            </div>
            <span className={clsx(isActive ? "text-white" : "text-white/90")}>{link.name}</span>
          </>
        )}
      </NavLink>
    ));
  };

  const renderSection = (title: string, sectionKey: string, Icon: React.ElementType, links: any[]) => {
    if (links.length === 0) return null;
    const isOpen = openSections[sectionKey];
    const isActive = links.some((link: any) => location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path + '/')));

    return (
      <div className="mb-1">
        <button 
          onClick={() => toggleSection(sectionKey)}
          className={clsx(
            "w-full flex justify-between items-center px-4 py-2.5 rounded-xl transition-all duration-200 focus:outline-none group",
            isActive || isOpen ? "bg-white/10" : "hover:bg-white/5"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors shadow-sm",
              isActive ? "bg-white/20 text-white" : isOpen ? "bg-white/10 text-white/90" : "bg-white/5 text-white/70 group-hover:text-white"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={clsx(
              "text-[15.5px] font-semibold tracking-wide transition-colors", 
              isActive || isOpen ? "text-white" : "text-white/80 group-hover:text-white"
            )}>
              {title}
            </span>
          </div>
          <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen ? "rotate-180 text-white" : "text-white/50 group-hover:text-white/80")} />
        </button>
        
        <div className={clsx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[800px] opacity-100 mt-1" : "max-h-0 opacity-0"
        )}>
          <div className="space-y-1 ml-[34px] pl-4 border-l border-white/15 my-2 py-1">
            {links.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center px-4 h-[40px] rounded-[10px] transition-all duration-200 text-[14.5px] font-medium",
                    isActive
                      ? "bg-white/15 text-white shadow-sm font-semibold"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <link.icon className={clsx("w-[18px] h-[18px] mr-3", isActive ? "text-white" : "text-white/40")} />
                    {link.name === "নাম কাটা" ? (
                      <span className="text-rose-200">{link.name}</span>
                    ) : (
                      <span>{link.name}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="dashboard-sidebar"
      className="hidden lg:flex relative z-[100] w-[280px] h-full flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 print:hidden"
      style={{ background: "linear-gradient(135deg, #0F5C7A 0%, #0C6C8A 40%, #14B8A6 100%)" }}
    >
      <div className="flex items-center justify-between h-[70px] border-b border-white/10 px-6 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logo} alt="হাজিরা খাতা" className="h-10 w-auto bg-white/10 p-1.5 rounded-xl shadow-sm" />
          <span className="text-[22px] font-bold text-white tracking-tight drop-shadow-sm">হাজিরা খাতা</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-5 text-white scrollbar-hide">
        <nav className="px-4 space-y-1">
          {topLinks.length > 0 && (
            <div className="mb-4">
              {renderTopLinks(topLinks)}
            </div>
          )}
          
          {renderSection('হাজিরা খাতা', 'attendance', CalendarCheck, attendanceLinks)}
          {renderSection('ফি', 'fees', ClipboardEdit, feeLinks)}
          {renderSection('ফলাফল', 'results', GraduationCap, resultLinks)}
          {renderSection('শিক্ষার্থী', 'students', Users, studentLinks)}
          {renderSection('সেটিংস', 'settings', Settings, settingsLinks)}
        </nav>
      </div>

      <div className="px-4 py-3 border-t border-white/10">
        <WhatsAppSupportButton variant="button" label="হোয়াটসঅ্যাপ সাপোর্ট" className="w-full text-xs" />
      </div>

      <div className="p-4 border-t border-white/10 w-full shrink-0 relative" ref={profileMenuRef}>
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
