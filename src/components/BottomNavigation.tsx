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
  MoreHorizontal,
  X,
  CreditCard,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

type TabId = "dashboard" | "attendance" | "students" | "results" | "more";

const BottomNavigation: React.FC = () => {
  const { user, photoURL, orgId, logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState<TabId | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = Boolean(user?.email && SUPER_ADMIN_EMAILS.includes(user.email));

  // Close sheet on route change
  useEffect(() => {
    setActiveSheet(null);
  }, [location.pathname]);

  // Handle ESC or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveSheet(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!orgId && !isSuperAdmin) return null;

  // Active state checking
  const isDashboardActive = location.pathname === "/";
  const isAttendanceActive =
    location.pathname.startsWith("/attendance") || location.pathname === "/reports";
  const isStudentsActive =
    location.pathname.startsWith("/students") ||
    location.pathname.startsWith("/classes") ||
    location.pathname.startsWith("/alumni");
  const isResultsActive =
    location.pathname.startsWith("/result") ||
    location.pathname.startsWith("/marksheet");
  const isMoreActive =
    location.pathname.startsWith("/fees") ||
    location.pathname.startsWith("/calendar") ||
    location.pathname.startsWith("/subjects") ||
    location.pathname.startsWith("/exams") ||
    location.pathname.startsWith("/academic-years") ||
    location.pathname.startsWith("/announcements") ||
    location.pathname.startsWith("/settings") ||
    location.pathname.startsWith("/help") ||
    location.pathname.startsWith("/super-admin") ||
    location.pathname.startsWith("/org-management");

  const handleTabClick = (tabId: TabId) => {
    if (tabId === "dashboard") {
      navigate("/");
      setActiveSheet(null);
    } else {
      setActiveSheet(activeSheet === tabId ? null : tabId);
    }
  };

  // Submenu configuration
  const attendanceItems = [
    { name: "হাজিরা নিন", path: "/attendance", desc: "দৈনিক উপস্থিতি গ্রহণ", icon: CalendarCheck, color: "text-emerald-500 bg-emerald-500/10" },
    { name: "হাজিরা ইতিহাস", path: "/attendance/history", desc: "পূর্ববর্তী হাজিরা রেকর্ড", icon: CalendarCheck, color: "text-blue-500 bg-blue-500/10" },
    { name: "হাজিরা রিপোর্ট", path: "/reports", desc: "বিশ্লেষণ ও প্রিন্ট ভিউ", icon: BarChart3, color: "text-teal-500 bg-teal-500/10" },
    { name: "ছুটি ব্যবস্থাপনা", path: "/attendance/leave", desc: "শিক্ষার্থীদের ছুটির আবেদন", icon: CalendarDays, color: "text-amber-500 bg-amber-500/10" },
    { name: "নাম কাটা শিক্ষার্থী", path: "/attendance/struck-off", desc: "খারিজ বা স্থগিত তালিকা", icon: Users, color: "text-rose-500 bg-rose-500/10" },
  ];

  const studentItems = [
    { name: "শিক্ষার্থী তালিকা", path: "/students", desc: "সকল সক্রিয় ও আর্কাইভ শিক্ষার্থী", icon: Users, color: "text-teal-500 bg-teal-500/10" },
    { name: "শ্রেণি ব্যবস্থাপনা", path: "/classes", desc: "শ্রেণি ও শাখা পরিচালনা", icon: BookOpen, color: "text-blue-500 bg-blue-500/10" },
    { name: "প্রাক্তন শিক্ষার্থী", path: "/alumni", desc: "অ্যালামনাই ও উত্তীর্ণ ছাত্র", icon: GraduationCap, color: "text-purple-500 bg-purple-500/10" },
  ];

  const resultItems = [
    { name: "ফলাফল এন্ট্রি", path: "/result-entry", desc: "নম্বর ইনপুট ও আপডেট", icon: ClipboardEdit, color: "text-emerald-500 bg-emerald-500/10" },
    { name: "ফলাফল রিপোর্ট", path: "/result-reports", desc: "ট্যাবুলেশন ও সারাংশ", icon: FileText, color: "text-blue-500 bg-blue-500/10" },
    { name: "মার্কশিট", path: "/marksheet", desc: "মুদ্রণযোগ্য রেজাল্ট কার্ড", icon: GraduationCap, color: "text-amber-500 bg-amber-500/10" },
    { name: "ফলাফল অনুসন্ধান", path: "/result-search", desc: "রোল দিয়ে সরাসরি দেখুন", icon: Search, color: "text-cyan-500 bg-cyan-500/10" },
    ...(role === "admin"
      ? [{ name: "ফলাফল সেটিংস", path: "/result-settings", desc: "গ্রেডিং ও নম্বর বণ্টন", icon: Settings, color: "text-purple-500 bg-purple-500/10" }]
      : []),
  ];

  const feeItems = [
    { name: "ফি আদায় এন্ট্রি", path: "/fees/collection", icon: CreditCard },
    { name: "ফি আদায় রিপোর্ট", path: "/fees/reports", icon: BarChart3 },
    { name: "ফি সেটআপ", path: "/fees/setup", icon: Settings },
    { name: "ফি খাত", path: "/fees/categories", icon: BookOpen },
  ];

  const academicItems = [
    { name: "ক্যালেন্ডার", path: "/calendar", icon: CalendarDays },
    { name: "বিষয় ব্যবস্থাপনা", path: "/subjects", icon: Book },
    { name: "পরীক্ষা ব্যবস্থাপনা", path: "/exams", icon: FileText },
    { name: "শিক্ষাবর্ষ", path: "/academic-years", icon: CalendarDays },
    { name: "ঘোষণা ও নোটিশ", path: "/announcements", icon: Megaphone },
    { name: "সিস্টেম সেটিংস", path: "/settings", icon: Settings },
    { name: "সহায়তা ও গাইড", path: "/help", icon: HelpCircle },
    ...(isSuperAdmin ? [{ name: "সুপার অ্যাডমিন", path: "/super-admin", icon: ShieldAlert }] : []),
    { name: "প্রতিষ্ঠান পরিবর্তন", path: "/org-management", icon: Building2 },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 print:hidden select-none">
      {/* Backdrop overlay */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setActiveSheet(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sliding Bottom Drawer */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[82vh] flex flex-col bg-white dark:bg-[#111C2E] rounded-t-[28px] shadow-2xl border-t border-slate-200/80 dark:border-slate-800 overflow-hidden"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
          >
            {/* Drawer Drag Handle & Header */}
            <div className="pt-3 pb-2 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="w-10" />
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
              <button
                onClick={() => setActiveSheet(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors"
                aria-label="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content per Tab */}
            <div className="overflow-y-auto px-4 py-4 space-y-4">
              {/* 1. ATTENDANCE SHEET */}
              {activeSheet === "attendance" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-[#0F5C7A] dark:text-teal-400">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[16px]">হাজিরা খাতা ও একশন</h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">দৈনিক হাজিরা গ্রহণ, ছুটি ও রিপোর্ট</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {attendanceItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setActiveSheet(null)}
                          className={clsx(
                            "flex items-center justify-between p-3.5 rounded-2xl transition-all border",
                            isActive
                              ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 border-[#0F5C7A]/30 dark:border-teal-500/30 text-[#0F5C7A] dark:text-teal-300 font-semibold shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.color)}>
                              <item.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-[15px] font-semibold leading-tight truncate">{item.name}</p>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. STUDENTS SHEET */}
              {activeSheet === "students" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-[#0F5C7A] dark:text-teal-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[16px]">শিক্ষার্থী ও শ্রেণি</h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">ছাত্র তালিকা, নতুন ভর্তি ও শ্রেণি</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {studentItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setActiveSheet(null)}
                          className={clsx(
                            "flex items-center justify-between p-3.5 rounded-2xl transition-all border",
                            isActive
                              ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 border-[#0F5C7A]/30 dark:border-teal-500/30 text-[#0F5C7A] dark:text-teal-300 font-semibold shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.color)}>
                              <item.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-[15px] font-semibold leading-tight truncate">{item.name}</p>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. RESULTS SHEET */}
              {activeSheet === "results" && (
                <div>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-[#0F5C7A] dark:text-teal-400">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[16px]">পরীক্ষা ও ফলাফল</h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400">নম্বর এন্ট্রি, মার্কশিট ও সার্চ</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {resultItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setActiveSheet(null)}
                          className={clsx(
                            "flex items-center justify-between p-3.5 rounded-2xl transition-all border",
                            isActive
                              ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 border-[#0F5C7A]/30 dark:border-teal-500/30 text-[#0F5C7A] dark:text-teal-300 font-semibold shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", item.color)}>
                              <item.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-[15px] font-semibold leading-tight truncate">{item.name}</p>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. MORE MENU SHEET */}
              {activeSheet === "more" && (
                <div className="space-y-4">
                  {/* User Profile Capsule */}
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#0F5C7A]/10 to-[#14B8A6]/10 dark:from-slate-800 dark:to-slate-800/60 rounded-2xl border border-teal-500/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-[#0F5C7A] text-white flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 shadow-sm border-2 border-white/40">
                        {photoURL ? (
                          <img src={photoURL} alt="প্রোফাইল" className="w-full h-full object-cover" />
                        ) : (
                          <span>{user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[15px] text-slate-800 dark:text-slate-100 truncate">
                          {user?.displayName || "ব্যবহারকারী"}
                        </p>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveSheet(null);
                        logout();
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[13px] font-bold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                      লগআউট
                    </button>
                  </div>

                  {/* Section 1: Fee Management */}
                  <div>
                    <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
                      ফি আদায় ও ব্যবস্থাপনা
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {feeItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setActiveSheet(null)}
                            className={clsx(
                              "flex items-center gap-2.5 p-3 rounded-xl border text-[14px] font-medium transition-all",
                              isActive
                                ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 border-[#0F5C7A]/30 text-[#0F5C7A] dark:text-teal-300 font-bold"
                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <item.icon className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2: Academic & Settings */}
                  <div>
                    <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
                      একাডেমিক ও সেটিংস
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {academicItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setActiveSheet(null)}
                            className={clsx(
                              "flex items-center gap-2.5 p-3 rounded-xl border text-[14px] font-medium transition-all",
                              isActive
                                ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 border-[#0F5C7A]/30 text-[#0F5C7A] dark:text-teal-300 font-bold"
                                : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <item.icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 5-Button Bottom Bar */}
      <nav
        className="flex items-center justify-around h-[68px] px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.15)] bg-gradient-to-r from-[#0F5C7A] via-[#0C6C8A] to-[#14B8A6] dark:from-[#0A3344] dark:via-[#092B3A] dark:to-[#0F5C7A] border-t border-white/10"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
        aria-label="মোবাইল নেভিগেশন"
      >
        {/* 1. Dashboard (Home) */}
        <button
          onClick={() => handleTabClick("dashboard")}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 group relative",
            isDashboardActive && !activeSheet ? "text-white" : "text-white/60 hover:text-white/90"
          )}
        >
          <div
            className={clsx(
              "flex items-center justify-center w-11 h-8 rounded-full transition-all duration-200",
              isDashboardActive && !activeSheet ? "bg-white/20 shadow-sm scale-105" : "bg-transparent group-hover:bg-white/10"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-0.5">হোম</span>
          {isDashboardActive && !activeSheet && (
            <motion.div layoutId="bottomNavIndicator" className="w-1.5 h-1.5 rounded-full bg-teal-300 absolute -bottom-0.5" />
          )}
        </button>

        {/* 2. Attendance (Hajira Khata) */}
        <button
          onClick={() => handleTabClick("attendance")}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 group relative",
            isAttendanceActive || activeSheet === "attendance" ? "text-white" : "text-white/60 hover:text-white/90"
          )}
        >
          <div
            className={clsx(
              "flex items-center justify-center w-11 h-8 rounded-full transition-all duration-200",
              isAttendanceActive || activeSheet === "attendance" ? "bg-white/20 shadow-sm scale-105" : "bg-transparent group-hover:bg-white/10"
            )}
          >
            <CalendarCheck className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-0.5">হাজিরা খাতা</span>
          {(isAttendanceActive || activeSheet === "attendance") && (
            <motion.div layoutId="bottomNavIndicator" className="w-1.5 h-1.5 rounded-full bg-teal-300 absolute -bottom-0.5" />
          )}
        </button>

        {/* 3. Students */}
        <button
          onClick={() => handleTabClick("students")}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 group relative",
            isStudentsActive || activeSheet === "students" ? "text-white" : "text-white/60 hover:text-white/90"
          )}
        >
          <div
            className={clsx(
              "flex items-center justify-center w-11 h-8 rounded-full transition-all duration-200",
              isStudentsActive || activeSheet === "students" ? "bg-white/20 shadow-sm scale-105" : "bg-transparent group-hover:bg-white/10"
            )}
          >
            <Users className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-0.5">শিক্ষার্থী</span>
          {(isStudentsActive || activeSheet === "students") && (
            <motion.div layoutId="bottomNavIndicator" className="w-1.5 h-1.5 rounded-full bg-teal-300 absolute -bottom-0.5" />
          )}
        </button>

        {/* 4. Results */}
        <button
          onClick={() => handleTabClick("results")}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 group relative",
            isResultsActive || activeSheet === "results" ? "text-white" : "text-white/60 hover:text-white/90"
          )}
        >
          <div
            className={clsx(
              "flex items-center justify-center w-11 h-8 rounded-full transition-all duration-200",
              isResultsActive || activeSheet === "results" ? "bg-white/20 shadow-sm scale-105" : "bg-transparent group-hover:bg-white/10"
            )}
          >
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-0.5">ফলাফল</span>
          {(isResultsActive || activeSheet === "results") && (
            <motion.div layoutId="bottomNavIndicator" className="w-1.5 h-1.5 rounded-full bg-teal-300 absolute -bottom-0.5" />
          )}
        </button>

        {/* 5. More (Grid / Menu) */}
        <button
          onClick={() => handleTabClick("more")}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 group relative",
            isMoreActive || activeSheet === "more" ? "text-white" : "text-white/60 hover:text-white/90"
          )}
        >
          <div
            className={clsx(
              "flex items-center justify-center w-11 h-8 rounded-full transition-all duration-200",
              isMoreActive || activeSheet === "more" ? "bg-white/20 shadow-sm scale-105" : "bg-transparent group-hover:bg-white/10"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold tracking-tight mt-0.5">আরও</span>
          {(isMoreActive || activeSheet === "more") && (
            <motion.div layoutId="bottomNavIndicator" className="w-1.5 h-1.5 rounded-full bg-teal-300 absolute -bottom-0.5" />
          )}
        </button>
      </nav>
    </div>
  );
};

export default BottomNavigation;
