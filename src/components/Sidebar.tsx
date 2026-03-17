import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SUPER_ADMIN_EMAILS } from "../constants";
import { useAuth } from "../hooks/useAuth";
import IconBadge from "./IconBadge";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
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
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import clsx from "clsx";
import logo from '../assets/logo.svg';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, photoURL } = useAuth();
  const navigate = useNavigate();
  const [isResultMenuOpen, setIsResultMenuOpen] = useState(false);

  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  const links = [
    { name: "ড্যাশবোর্ড", path: "/", icon: LayoutDashboard },
    { name: "হাজিরা নিন", path: "/attendance", icon: CalendarCheck },
    { name: "হাজিরা ইতিহাস", path: "/attendance/history", icon: CalendarCheck },
    { name: "শিক্ষার্থী", path: "/students", icon: Users },
    { name: "শ্রেণি", path: "/classes", icon: BookOpen },
    { name: "রিপোর্ট", path: "/reports", icon: BarChart3 },
    { name: "সেটিংস", path: "/settings", icon: Settings },
    ...(isSuperAdmin ? [{ name: "সুপার অ্যাডমিন", path: "/super-admin", icon: ShieldAlert }] : []),
  ];

  const resultLinks = [
    { name: "বিষয়", path: "/subjects", icon: Book },
    { name: "পরীক্ষা", path: "/exams", icon: FileText },
    { name: "ফলাফল এন্ট্রি", path: "/result-entry", icon: ClipboardEdit },
    { name: "ট্যাবুলেশন শিট", path: "/result-reports", icon: FileText },
    { name: "মার্কশিট", path: "/marksheet", icon: GraduationCap },
    { name: "শিক্ষাবর্ষ", path: "/academic-years", icon: CalendarDays },
  ];

  return (
    <div
      className={clsx(
        "fixed inset-y-0 left-0 z-50 w-[260px] h-full transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
      style={{ background: "linear-gradient(135deg, #0F5C7A 0%, #0C6C8A 40%, #14B8A6 100%)" }}
    >
      <div className="flex items-center justify-between h-[70px] border-b border-white/10 px-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="হাজিরা খাতা" className="h-10 w-auto" />
          <span className="text-[22px] font-semibold text-white tracking-tight">হাজিরা খাতা</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-white hover:bg-white/10 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 text-white">
        <nav className="px-4 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 font-medium text-[16px]",
                  isActive
                    ? "bg-[rgba(255,255,255,0.18)] text-white shadow-sm"
                    : "hover:bg-[rgba(255,255,255,0.1)] hover:text-white",
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

          {/* Result Management Section */}
          <div className="pt-2">
            <button
              onClick={() => setIsResultMenuOpen(!isResultMenuOpen)}
              className="w-full flex items-center justify-between px-4 h-[48px] rounded-[14px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.1)] hover:text-white font-medium text-[16px] text-white"
            >
              <div className="flex items-center">
                <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3 bg-[rgba(255,255,255,0.1)]">
                  <GraduationCap className="w-5 h-5 text-white/70" />
                </div>
                ফলাফল ব্যবস্থাপনা
              </div>
              {isResultMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {isResultMenuOpen && (
              <div className="pl-4 mt-1 space-y-1">
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
                          : "hover:bg-[rgba(255,255,255,0.1)] hover:text-white text-white/80",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx("w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3", isActive ? "bg-[rgba(255,255,255,0.15)]" : "bg-transparent")}>
                          <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                        </div>
                        {link.name}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              navigate("/org-management");
            }}
            className="w-full flex items-center px-4 h-[48px] rounded-[14px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.1)] hover:text-white font-medium text-[16px] text-white mt-2"
          >
            <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center mr-3 bg-[rgba(255,255,255,0.1)]">
              <Building2 className="w-5 h-5 text-white/70" />
            </div>
            প্রতিষ্ঠান পরিবর্তন
          </button>
        </nav>
      </div>
      <div className="p-4 border-t border-white/10 w-full">
        <div className="flex items-center gap-3">
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
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
