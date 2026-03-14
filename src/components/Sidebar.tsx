import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SUPER_ADMIN_EMAILS } from "../constants";
import { useAuth } from "../hooks/useAuth";
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
} from "lucide-react";
import clsx from "clsx";
import logo from '../assets/app-logo.png';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, photoURL } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div
      className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/60 h-full transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex items-center justify-between h-20 border-b border-slate-200/60 px-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="হাজিরা খাতা" className="h-10 w-auto" />
          <span className="text-2xl font-bold gradient-text tracking-tight">হাজিরা খাতা</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4 text-[#08457e]">
        <nav className="px-4 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "active-nav-item"
                    : "hover:bg-slate-50 hover:text-[#08457e]/80",
                )
              }
            >
              <link.icon className="w-5 h-5 mr-3" />
              {link.name}
            </NavLink>
          ))}
          <button
            onClick={() => {
              setIsOpen(false);
              navigate("/org-management");
            }}
            className="w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 hover:bg-slate-50 hover:text-[#08457e]/80"
          >
            <Building2 className="w-5 h-5 mr-3" />
            প্রতিষ্ঠান পরিবর্তন
          </button>
        </nav>
      </div>
      <div className="p-4 border-t border-slate-200/60 bg-[#045D5D] w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-teal-100 flex items-center justify-center text-[#FFFFFF] font-bold shadow-sm border border-white overflow-hidden shrink-0">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#FFFFFF] truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-slate-300 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
