import React, { useState, useMemo } from "react";
import { Search, User, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudents } from "../hooks/useStudents";
import { useAuth } from "../hooks/useAuth";
import Fuse from "fuse.js";

const StudentSearch: React.FC = () => {
  const navigate = useNavigate();
  const { user, orgId, role } = useAuth();
  const { students } = useStudents(orgId, user, role);
  const [query, setQuery] = useState("");

  const allStudents = useMemo(() => {
    return Object.values(students).flat();
  }, [students]);

  const fuse = useMemo(() => {
    return new Fuse(allStudents, {
      keys: ["name", "roll", "id"],
      threshold: 0.3,
    });
  }, [allStudents]);

  const results = useMemo(() => {
    if (!query) return [];
    return fuse.search(query).slice(0, 5).map(r => r.item);
  }, [fuse, query]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="শিক্ষার্থীর নাম, রোল বা আইডি দিয়ে খুঁজুন..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input-premium pl-12 w-full"
        />
      </div>

      {query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100]">
          {results.length > 0 ? (
            results.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  navigate(`/student-profile/${student.id}`);
                  setQuery("");
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">রোল: {student.roll} | আইডি: {student.id.slice(-6)}</p>
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
