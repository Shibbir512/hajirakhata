import React, { useState } from "react";
import {
  Building2,
  LogIn,
  LogOut,
  Plus,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Building,
} from "lucide-react";
import toast from "react-hot-toast";

interface OrgManagementProps {
  onCreateOrg: (name: string) => Promise<string | null>;
  onJoinOrg: (id: string) => Promise<string | null>;
  onRemoveVisitedOrg?: (id: string) => Promise<void>;
  onLogout: () => void;
  visitedOrgs?: { [key: string]: string };
  onSuccess?: () => void;
}

const OrgManagement: React.FC<OrgManagementProps> = ({
  onCreateOrg,
  onJoinOrg,
  onRemoveVisitedOrg,
  onLogout,
  visitedOrgs = {},
  onSuccess,
}) => {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      let result;
      if (mode === "create") {
        result = await onCreateOrg(input);
      } else {
        result = await onJoinOrg(input);
      }
      if (result && onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (id: string) => {
    setLoading(true);
    try {
      const result = await onJoinOrg(id);
      if (result && onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOrg = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("আপনি কি নিশ্চিত যে আপনি এই প্রতিষ্ঠানটি তালিকা থেকে মুছে ফেলতে চান?")) {
      setLoading(true);
      try {
        if (onRemoveVisitedOrg) {
          await onRemoveVisitedOrg(id);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full card-premium p-10 border-2 border-teal-100 shadow-teal-900/5">
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
                    <div key={id} className="relative group flex items-center bg-white border-2 border-teal-100 hover:border-teal-400 hover:bg-teal-50/50 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md">
                      <button
                        onClick={() => handleQuickJoin(id)}
                        disabled={loading}
                        className="flex-1 flex items-center justify-between p-4 text-left rounded-l-2xl"
                      >
                        <div>
                          <span className="block font-bold text-teal-800 group-hover:text-teal-900">
                            {name}
                          </span>
                          <span className="block text-xs text-teal-600 font-mono mt-1">
                            {id}
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-[#045F5F] group-hover:text-white transition-all duration-300 shadow-sm border border-teal-100 group-hover:border-transparent mr-2">
                          <ArrowRight className="w-5 h-5 text-teal-600 group-hover:text-white" />
                        </div>
                      </button>
                      <div className="pr-4 pl-2 border-l border-teal-100 h-full flex items-center">
                        <button
                          onClick={(e) => handleRemoveOrg(e, id)}
                          disabled={loading}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="তালিকা থেকে মুছুন"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("join")}
                    className="flex flex-col items-center justify-center p-5 bg-teal-50 hover:bg-teal-100 rounded-2xl transition-all duration-300 text-teal-700 hover:text-teal-900 border border-teal-100 hover:border-teal-200 hover:shadow-sm"
                  >
                    <LogIn className="w-6 h-6 mb-3 text-teal-600" />
                    <span className="text-sm font-bold">অন্যটিতে যোগ দিন</span>
                  </button>
                  <button
                    onClick={() => setMode("create")}
                    className="flex flex-col items-center justify-center p-5 bg-teal-50 hover:bg-teal-100 rounded-2xl transition-all duration-300 text-teal-700 hover:text-teal-900 border border-teal-100 hover:border-teal-200 hover:shadow-sm"
                  >
                    <Plus className="w-6 h-6 mb-3 text-teal-600" />
                    <span className="text-sm font-bold">নতুন তৈরি করুন</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setMode("create")}
                  className="bg-white text-teal-600 border border-teal-100 shadow-md hover:shadow-lg hover:bg-teal-50 transition-all duration-300 w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold"
                >
                  <Plus className="w-5 h-5" />
                  নতুন প্রতিষ্ঠান যুক্ত করুন
                </button>
                <button
                  onClick={() => setMode("join")}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-white border-2 border-teal-100 text-teal-800 rounded-2xl font-bold hover:bg-teal-50 hover:border-teal-200 transition-all shadow-sm"
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
              <div className="relative w-full">
                <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-500 w-6 h-6" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    mode === "create"
                      ? "যেমন: আমার প্রতিষ্ঠান"
                      : "যেমন: আমার প্রতিষ্ঠান বা আইডি"
                  }
                  className="w-full pl-14 pr-4 py-4 border-2 border-teal-100 bg-white focus:border-teal-400 transition-all text-base rounded-2xl"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode("select")}
                className="bg-white text-teal-600 border border-teal-100 shadow-md hover:shadow-lg hover:bg-teal-50 transition-all duration-300 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                ফিরে যান
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-white text-teal-600 border border-teal-100 shadow-md hover:shadow-lg hover:bg-teal-50 transition-all duration-300 flex-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-2xl font-bold"
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
