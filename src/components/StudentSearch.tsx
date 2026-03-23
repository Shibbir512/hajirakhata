import React, { useState, useMemo } from "react";
import { Search, User, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudents } from "../hooks/useStudents";
import { useClasses } from "../hooks/useClasses";
import { useAuth } from "../hooks/useAuth";
import { toEnglishNumber } from "../utils/dateFormatter";
import Fuse from "fuse.js";

const StudentSearch: React.FC = () => {
  const navigate = useNavigate();
  const { user, orgId, role } = useAuth();
  const { students } = useStudents(orgId, user, role);
  const { classes } = useClasses(orgId, user, role);
  const [query, setQuery] = useState("");

  const allStudents = useMemo(() => {
    return Object.values(students).flat();
  }, [students]);

  const getClassById = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || "অজানা শ্রেণি";
  };

  const fuse = useMemo(() => {
    return new Fuse(allStudents, {
      keys: ["name", "roll", "id", "studentUid"],
      threshold: 0.3,
    });
  }, [allStudents]);

  const results = useMemo(() => {
    if (!query) return [];
    
    const queryStr = query.trim();
    const englishQuery = toEnglishNumber(queryStr);
    
    // First, try to find exact matches for roll number or student ID
    const exactMatches = allStudents.filter(s => 
      s.roll.toString() === englishQuery || 
      (s.studentUid && s.studentUid === englishQuery)
    );
    
    if (exactMatches.length > 0) {
      const exactMatchIds = new Set(exactMatches.map(s => s.id));
      const fuzzyMatches = fuse.search(queryStr)
        .map(result => result.item)
        .filter(item => !exactMatchIds.has(item.id));
        
      return [...exactMatches, ...fuzzyMatches].slice(0, 5);
    }
    
    return fuse.search(queryStr).slice(0, 5).map(r => r.item);
  }, [fuse, query, allStudents]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="শিক্ষার্থীর নাম, রোল বা আইডি দিয়ে খুঁজুন..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all shadow-sm text-[#0F172A] placeholder:text-slate-400"
        />
      </div>

      {query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.08)] border border-[#E2E8F0] overflow-hidden z-[100]">
          {results.length > 0 ? (
            results.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  navigate(`/student-profile/${student.id}`);
                  setQuery("");
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6]/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#3B82F6]" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[#0F172A]">{student.name}</p>
                    <p className="text-xs text-slate-500">শ্রেণি: {getClassById(student.classId)} | রোল: {student.roll} | আইডি: {student.studentUid}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500 italic">
              কোন শিক্ষার্থী পাওয়া যায়নি।
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSearch;
