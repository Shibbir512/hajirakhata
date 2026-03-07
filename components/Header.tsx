
import React from 'react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  orgId: string | null;
  onLogout: () => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

const Header: React.FC<HeaderProps> = ({ user, orgId, onLogout, selectedDate, onDateChange }) => {
  const today = new Date().toISOString().split('T')[0];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-3 sm:py-0 gap-4 sm:gap-0">
                
                <div className="flex items-center gap-3">
                    <div className="bg-teal-500 text-white p-2 rounded-lg shadow-sm">
                        <i className="fa-solid fa-clipboard-user text-lg"></i>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">ছাত্র হাজিরা খাতা</h1>
                </div>

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
                  <div className="flex items-center gap-3 border-l border-slate-200 pl-4 hidden sm:flex">
                      <div className="text-right">
                          <p className="text-sm font-bold text-slate-700">{user.displayName || 'User'}</p>
                          <p className="text-xs text-slate-500 font-medium">শিক্ষক</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold border border-teal-200">
                          {user.displayName ? getInitials(user.displayName) : 'U'}
                      </div>
                      <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition ml-2" title="লগ আউট">
                        <i className="fa-solid fa-right-from-bracket"></i>
                      </button>
                  </div>
                )}
            </div>
        </div>
    </header>
  );
};

export default Header;
