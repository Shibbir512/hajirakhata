import React, { useState } from "react";
import {
  Building2,
  LogIn,
  LogOut,
  Plus,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";

interface OrgManagementProps {
  onCreateOrg: (name: string) => Promise<void>;
  onJoinOrg: (id: string) => Promise<void>;
  onLogout: () => void;
  visitedOrgs?: { [key: string]: string };
}

const OrgManagement: React.FC<OrgManagementProps> = ({
  onCreateOrg,
  onJoinOrg,
  onLogout,
  visitedOrgs = {},
}) => {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      if (mode === "create") {
        await onCreateOrg(input);
      } else {
        await onJoinOrg(input);
      }
    } catch (error: any) {
      alert(error.message || "ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (id: string) => {
    setLoading(true);
    try {
      await onJoinOrg(id);
    } catch (error: any) {
      alert(error.message || "ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full card-premium p-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white">
            <Building2 className="w-10 h-10 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">
            প্রতিষ্ঠান সেটআপ
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            নতুন প্রতিষ্ঠান যুক্ত করুন অথবা অন্যান্য সদস্যদের সাথে কাজ করতে বিদ্যমান প্রতিষ্ঠানে যোগ দিন।
          </p>
        </div>

        {mode === "select" ? (
          <div className="space-y-6">
            {Object.keys(visitedOrgs).length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  সাম্প্রতিক প্রতিষ্ঠানসমূহ
                </h3>
                <div className="space-y-3">
                  {Object.entries(visitedOrgs).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => handleQuickJoin(id)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-4 bg-white border border-slate-200/60 hover:border-teal-300 hover:bg-teal-50/50 rounded-2xl transition-all duration-300 group text-left shadow-sm"
                    >
                      <div>
                        <span className="block font-semibold text-slate-800 group-hover:text-teal-700">
                          {name}
                        </span>
                        <span className="block text-xs text-slate-400 font-mono mt-1">
                          {id}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-teal-500 group-hover:text-white transition-all duration-300 shadow-sm border border-slate-100 group-hover:border-transparent">
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("join")}
                    className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all duration-300 text-slate-600 hover:text-slate-800 border border-slate-100 hover:border-slate-200 hover:shadow-sm"
                  >
                    <LogIn className="w-6 h-6 mb-3 text-indigo-500" />
                    <span className="text-sm font-medium">অন্যটিতে যোগ দিন</span>
                  </button>
                  <button
                    onClick={() => setMode("create")}
                    className="flex flex-col items-center justify-center p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all duration-300 text-slate-600 hover:text-slate-800 border border-slate-100 hover:border-slate-200 hover:shadow-sm"
                  >
                    <Plus className="w-6 h-6 mb-3 text-teal-500" />
                    <span className="text-sm font-medium">নতুন তৈরি করুন</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setMode("create")}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                >
                  <Plus className="w-5 h-5" />
                  নতুন প্রতিষ্ঠান যুক্ত করুন
                </button>
                <button
                  onClick={() => setMode("join")}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  বিদ্যমান প্রতিষ্ঠানে যোগ দিন
                </button>
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                সাইন আউট
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {mode === "create"
                  ? "প্রতিষ্ঠানের নাম"
                  : "প্রতিষ্ঠানের নাম বা আইডি"}
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === "create"
                    ? "যেমন: আমার প্রতিষ্ঠান"
                    : "যেমন: আমার প্রতিষ্ঠান বা আইডি"
                }
                className="input-premium"
                required
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode("select")}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                ফিরে যান
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 flex-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-medium"
              >
                {loading
                  ? "প্রক্রিয়াধীন..."
                  : mode === "create"
                    ? "তৈরি করুন"
                    : "যোগ দিন"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrgManagement;
