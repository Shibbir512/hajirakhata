import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Users, ChevronDown, Check, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export interface ClassOption {
  id?: string;
  value?: string;
  name?: string;
  label?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  classes?: ClassOption[];
  options?: ClassOption[];
  placeholder?: string;
  allOptionLabel?: string;
  className?: string;
  buttonClassName?: string;
  icon?: React.ElementType;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ClassSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  classes,
  options,
  placeholder = "শ্রেণি নির্বাচন করুন",
  allOptionLabel,
  className = "",
  buttonClassName = "",
  icon: Icon = Users,
  title,
  subtitle,
  disabled = false,
  size = "md",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize both classes and options formats
  const rawList = classes || options || [];
  const normalizedItems = rawList.map((item) => ({
    id: String(item.id ?? item.value ?? ""),
    name: String(item.name ?? item.label ?? ""),
  }));

  const selectedItem = normalizedItems.find((c) => c.id === value);
  const displayLabel =
    value === "" && allOptionLabel
      ? allOptionLabel
      : selectedItem
      ? selectedItem.name
      : placeholder;

  const modalTitle =
    title ||
    (classes ? "শ্রেণি নির্বাচন করুন" : "নির্বাচন করুন");
  const modalSubtitle =
    subtitle || "নিচের তালিকা থেকে আপনার কাঙ্ক্ষিত অপশন বেছে নিন";

  // Close on outside click for desktop dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Lock body scroll on mobile when sheet is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Filter items by search
  const filteredItems = normalizedItems.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  };

  const heightClass =
    size === "sm"
      ? "h-[40px] text-xs px-3 rounded-xl"
      : size === "lg"
      ? "h-[54px] text-[17px] px-5 rounded-2xl"
      : "h-[52px] text-[15px] px-4 rounded-2xl";

  return (
    <div className={clsx("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full flex items-center justify-between gap-2.5 border transition-all font-bold shadow-sm select-none cursor-pointer outline-none",
          heightClass,
          disabled && "opacity-50 cursor-not-allowed",
          value
            ? "bg-white dark:bg-[#111C2E] border-[#0F5C7A] dark:border-teal-500/50 text-[#0F5C7A] dark:text-teal-300 ring-2 ring-[#0F5C7A]/10 dark:ring-teal-500/20"
            : "bg-white dark:bg-[#111C2E] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0F5C7A]/40 dark:hover:border-teal-500/40",
          buttonClassName
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={clsx(
              "rounded-lg bg-[#0F5C7A]/10 dark:bg-teal-500/20 flex items-center justify-center shrink-0",
              size === "sm" ? "w-6 h-6" : "w-7 h-7"
            )}
          >
            <Icon
              className={clsx(
                "text-[#0F5C7A] dark:text-teal-400",
                size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
              )}
            />
          </div>
          <span className="truncate text-left">{displayLabel}</span>
        </div>
        <ChevronDown
          className={clsx(
            "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-[#0F5C7A] dark:text-teal-400"
          )}
        />
      </button>

      {/* Mobile Bottom Sheet Drawer (< 768px) teleported to document.body */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="md:hidden">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsOpen(false)}
                  className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[99999]"
                />

                {/* Bottom Sheet Modal */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  className="fixed bottom-0 left-0 right-0 z-[100000] max-h-[82vh] flex flex-col bg-white dark:bg-[#111C2E] rounded-t-[28px] shadow-2xl border-t border-slate-200 dark:border-slate-800 overflow-hidden"
                  style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
                >
                  {/* Drawer Pull Handle */}
                  <div className="pt-3 pb-2 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
                    <div className="w-8" />
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title & Search */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center text-[#0F5C7A] dark:text-teal-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[16px]">
                          {modalTitle}
                        </h3>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400">
                          {modalSubtitle}
                        </p>
                      </div>
                    </div>

                    {normalizedItems.length > 5 && (
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="নাম দিয়ে খুঁজুন..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-[#0F5C7A] dark:focus:border-teal-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="overflow-y-auto p-4 space-y-2 max-h-[50vh]">
                    {allOptionLabel && (
                      <button
                        type="button"
                        onClick={() => handleSelect("")}
                        className={clsx(
                          "w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left border cursor-pointer",
                          value === ""
                            ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 border-[#0F5C7A]/30 dark:border-teal-500/30 text-[#0F5C7A] dark:text-teal-300 font-bold shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <span className="text-[15px]">{allOptionLabel}</span>
                        {value === "" && (
                          <Check className="w-5 h-5 text-[#0F5C7A] dark:text-teal-400 shrink-0" />
                        )}
                      </button>
                    )}

                    {filteredItems.map((item) => {
                      const isSelected = value === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item.id)}
                          className={clsx(
                            "w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left border cursor-pointer",
                            isSelected
                              ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 border-[#0F5C7A]/30 dark:border-teal-500/30 text-[#0F5C7A] dark:text-teal-300 font-bold shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <span className="text-[15px]">{item.name}</span>
                          {isSelected && (
                            <Check className="w-5 h-5 text-[#0F5C7A] dark:text-teal-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}

                    {filteredItems.length === 0 && (
                      <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                        কোন অপশন পাওয়া যায়নি
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Desktop Floating Dropdown (>= 768px) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="hidden md:flex flex-col absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-80"
          >
            {normalizedItems.length > 6 && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#111C2E] z-10">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="খুঁজুন..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-[#0F5C7A] dark:focus:border-teal-500"
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto p-1.5 space-y-1">
              {allOptionLabel && (
                <button
                  type="button"
                  onClick={() => handleSelect("")}
                  className={clsx(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-all cursor-pointer",
                    value === ""
                      ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 text-[#0F5C7A] dark:text-teal-300 font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{allOptionLabel}</span>
                  {value === "" && (
                    <Check className="w-4 h-4 text-[#0F5C7A] dark:text-teal-400 shrink-0" />
                  )}
                </button>
              )}

              {filteredItems.map((item) => {
                const isSelected = value === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={clsx(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-all cursor-pointer",
                      isSelected
                        ? "bg-[#0F5C7A]/10 dark:bg-teal-500/15 text-[#0F5C7A] dark:text-teal-300 font-bold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>{item.name}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#0F5C7A] dark:text-teal-400 shrink-0" />
                    )}
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  কোন অপশন পাওয়া যায়নি
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const CustomSelect = ClassSelect;
export default ClassSelect;
