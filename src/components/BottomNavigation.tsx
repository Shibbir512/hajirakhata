import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SUPER_ADMIN_EMAILS } from "../constants";
import {
  LayoutDashboard,
  CalendarCheck,
  GraduationCap,
  Users,
  Settings,
  HelpCircle,
  BookOpen,
  BarChart3,
  ShieldAlert,
  Book,
  FileText,
  ClipboardEdit,
  CalendarDays,
  Search,
  Megaphone,
  Building2,
  LogOut,
  UserCircle,
} from "lucide-react";
import clsx from "clsx";

const BottomNavigation: React.FC = () => {
  const { user, photoURL, orgId, logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  // Close sub-menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close sub-menu on route change
  useEffect(() => {
    setActiveTab(null);
  }, [location.pathname]);

  if (!orgId && !isSuperAdmin) return null;

  const tabs = [
    { id: "dashboard", name: "ড্যাশবোর্ড", icon: LayoutDashboard, path: "/" },
    { id: "attendance", name: "হাজিরা খাতা", icon: CalendarCheck },
    { id: "fees", name: "ফি", icon: ClipboardEdit },
    { id: "results", name: "ফলাফল", icon: GraduationCap },
    { id: "students", name: "শিক্ষার্থী", icon: Users },
    { id: "settings", name: "সেটিংস", icon: Settings },
    { id: "help", name: "হেল্প", icon: HelpCircle, path: "/help" },
    { id: "profile", name: "প্রোফাইল", icon: UserCircle },
  ];

  const subMenus: Record<string, any[]> = {
    attendance: [
      { name: "হাজিরা নিন", path: "/attendance", icon: CalendarCheck },
      { name: "হাজিরা ইতিহাস", path: "/attendance/history", icon: CalendarCheck },
      { name: "ছুটি", path: "/attendance/leave", icon: CalendarDays },
      { name: "নাম কাটা", path: "/attendance/struck-off", icon: Users },
    ],
    fees: [
      { name: "ফি আদায়", path: "/fees/collection", icon: ClipboardEdit },
      { name: "ফি রিপোর্ট", path: "/fees/reports", icon: BarChart3 },
      { name: "ফি সেটআপ", path: "/fees/setup", icon: Settings },
      { name: "ফি খাত", path: "/fees/categories", icon: BookOpen },
    ],
    results: [
      { name: "ফলাফল এন্ট্রি", path: "/result-entry", icon: ClipboardEdit },
      { name: "ফলাফল", path: "/result-reports", icon: FileText },
      { name: "মার্কশিট", path: "/marksheet", icon: GraduationCap },
      { name: "ফলাফল অনুসন্ধান", path: "/result-search", icon: Search },
      ...(role === "admin" ? [{ name: "ফলাফল সেটিংস", path: "/result-settings", icon: Settings }] : [])
    ],
    students: [
      { name: "শিক্ষার্থী", path: "/students", icon: Users },
      { name: "প্রাক্তন শিক্ষার্থী", path: "/alumni", icon: GraduationCap },
      { name: "শ্রেণি", path: "/classes", icon: BookOpen },
    ],
    settings: [
      { name: "সেটিংস", path: "/settings", icon: Settings },
      { name: "ক্যালেন্ডার", path: "/calendar", icon: CalendarDays },
      { name: "বিষয়", path: "/subjects", icon: Book },
      { name: "পরীক্ষা", path: "/exams", icon: FileText },
      { name: "শিক্ষাবর্ষ", path: "/academic-years", icon: CalendarDays },
      { name: "রিপোর্ট", path: "/reports", icon: BarChart3 },
      { name: "ঘোষণা", path: "/announcements", icon: Megaphone },
      ...(isSuperAdmin ? [{ name: "সুপার অ্যাডমিন", path: "/super-admin", icon: ShieldAlert }] : []),
      { name: "প্রতিষ্ঠান পরিবর্তন", path: "/org-management", icon: Building2 },
    ],
  };

  const handleTabClick = (tabId: string, path?: string) => {
    if (path) {
      navigate(path);
      setActiveTab(null);
    } else {
      setActiveTab(activeTab === tabId ? null : tabId);
    }
  };

  return (
    <div ref={navRef} className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Sub-navigation — regular menus */}
      {activeTab && subMenus[activeTab] && (
        <div 
          className="absolute bottom-full left-0 right-0 p-4 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          style={{ background: "linear-gradient(135deg, #0F5C7A 0%, #0C6C8A 40%, #14B8A6 100%)" }}
        >
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {subMenus[activeTab].map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                    isActive
                      ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                      : "hover:bg-[rgba(255,255,255,0.15)] hover:text-white hover:scale-[1.02] text-white/90"
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

      {/* Profile sub-menu */}
      {activeTab === "profile" && (
        <div
          className="absolute bottom-full left-0 right-0 p-4 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          style={{ background: "linear-gradient(135deg, #0F5C7A 0%, #0C6C8A 40%, #14B8A6 100%)" }}
        >
          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {photoURL ? (
                <img src={photoURL} alt="প্রোফাইল" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-lg">
                  {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-[15px] truncate">{user?.displayName || "ব্যবহারকারী"}</p>
              <p className="text-white/60 text-[12px] truncate">{user?.email}</p>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => { logout(); setActiveTab(null); }}
            className="w-full flex items-center gap-3 px-4 h-[48px] rounded-[14px] bg-red-500/20 hover:bg-red-500/30 text-white font-medium text-[16px] transition-colors"
          >
            <div className="w-[36px] h-[36px] rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-red-200" />
            </div>
            সাইন আউট
          </button>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <div 
        className="flex items-center justify-around h-[70px] px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
        style={{ background: "linear-gradient(135deg, #0F5C7A 0%, #0C6C8A 40%, #14B8A6 100%)" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.path ? location.pathname === tab.path : activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.path)}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200",
                isActive ? "text-white" : "text-white/60 hover:text-white/90"
              )}
            >
              <div className={clsx(
                "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-transparent"
              )}>
                <tab.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
              </div>
              <span className="text-[10px] font-medium truncate w-full text-center px-1">
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
