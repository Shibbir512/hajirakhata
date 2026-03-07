
import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  orgId: string | null;
  onLogout: () => void;
  onLeaveOrg: () => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  onNavigate: (view: 'attendance' | 'report' | 'manageClasses' | 'reminders') => void;
}

const Header: React.FC<HeaderProps> = ({ user, orgId, onLogout, onLeaveOrg, selectedDate, onDateChange, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('attendance')}>
                    <div className="bg-teal-500 text-white p-2 rounded-lg shadow-sm">
                        <i className="fa-solid fa-clipboard-user text-lg"></i>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">ছাত্র হাজিরা খাতা</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:border-teal-300 transition cursor-pointer">
                        <i className="fa-regular fa-calendar-days text-teal-600 mr-2"></i>
                        <input 
                            type="date" 
                            className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer" 
                            value={selectedDate || today}
                            onChange={(e) => onDateChange && onDateChange(e.target.value)}
                        />
                    </div>

                    {user && (
                        <div className="relative" ref={menuRef}>
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                            >
                                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold border border-teal-200">
                                    {user.displayName ? getInitials(user.displayName) : 'U'}
                                </div>
                                <i className={`fa-solid fa-chevron-down text-slate-400 text-xs transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}></i>
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-3 border-b border-slate-100 mb-1">
                                        <p className="text-sm font-bold text-slate-800">{user.displayName || 'User'}</p>
                                        <p className="text-xs text-slate-500 font-medium">শিক্ষক</p>
                                    </div>
                                    
                                    <button onClick={() => { onNavigate('attendance'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-3 transition-colors">
                                        <i className="fa-solid fa-clipboard-check text-slate-400 w-4"></i> হাজিরা
                                    </button>
                                    <button onClick={() => { onNavigate('reminders'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-3 transition-colors">
                                        <i className="fa-regular fa-bell text-slate-400 w-4"></i> রিমাইন্ডার
                                    </button>
                                    <button onClick={() => { onNavigate('manageClasses'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-3 transition-colors">
                                        <i className="fa-solid fa-gear text-slate-400 w-4"></i> শ্রেণি পরিচালনা
                                    </button>
                                    <button onClick={() => { onNavigate('report'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-3 transition-colors">
                                        <i className="fa-solid fa-chart-pie text-slate-400 w-4"></i> রিপোর্ট
                                    </button>
                                    
                                    <div className="border-t border-slate-100 my-1 mt-1"></div>

                                    <button onClick={() => { onLeaveOrg(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-3 transition-colors">
                                        <i className="fa-solid fa-building-circle-arrow-right text-slate-400 w-4"></i> মাদরাসা পরিবর্তন
                                    </button>
                                    
                                    <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors">
                                        <i className="fa-solid fa-right-from-bracket w-4"></i> লগ আউট
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </header>
  );
};

export default Header;
