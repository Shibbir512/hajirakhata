import React from "react";
import { NavLink } from "react-router-dom";
import { CalendarCheck, CalendarDays, BarChart3, Users, Clock } from "lucide-react";
import clsx from "clsx";

export const AttendanceNavTabs: React.FC = () => {
  const tabs = [
    { name: "হাজিরা নিন", path: "/attendance", icon: CalendarCheck, exact: true },
    { name: "হাজিরা ইতিহাস", path: "/attendance/history", icon: Clock },
    { name: "হাজিরা রিপোর্ট", path: "/reports", icon: BarChart3 },
    { name: "ছুটি", path: "/attendance/leave", icon: CalendarDays },
    { name: "নাম কাটা", path: "/attendance/struck-off", icon: Users },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4 print:hidden">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.exact}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 border",
              isActive
                ? "bg-[#0F5C7A] text-white border-[#0F5C7A] shadow-md shadow-[#0F5C7A]/20"
                : "bg-white dark:bg-[#111C2E] text-slate-600 dark:text-slate-300 hover:text-[#0F5C7A] dark:hover:text-[#2DD4BF] hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800 shadow-xs"
            )
          }
        >
          <tab.icon className="w-4 h-4" />
          <span>{tab.name}</span>
        </NavLink>
      ))}
    </div>
  );
};

export default AttendanceNavTabs;
