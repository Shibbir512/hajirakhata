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
      alert(error.message || "Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (id: string) => {
    setLoading(true);
    try {
      await onJoinOrg(id);
    } catch (error: any) {
      alert(error.message || "Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Organization Setup
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Create a new organization or join an existing one to collaborate
            with other members.
          </p>
        </div>

        {mode === "select" ? (
          <div className="space-y-6">
            {Object.keys(visitedOrgs).length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Recent Organizations
                </h3>
                <div className="space-y-3">
                  {Object.entries(visitedOrgs).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => handleQuickJoin(id)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-all group text-left"
                    >
                      <div>
                        <span className="block font-semibold text-slate-800 group-hover:text-blue-700">
                          {name}
                        </span>
                        <span className="block text-xs text-slate-400 font-mono mt-1">
                          {id}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("join")}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-slate-800"
                  >
                    <LogIn className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">Join Other</span>
                  </button>
                  <button
                    onClick={() => setMode("create")}
                    className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-slate-800"
                  >
                    <Plus className="w-5 h-5 mb-2" />
                    <span className="text-sm font-medium">Create New</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setMode("create")}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  Create New Organization
                </button>
                <button
                  onClick={() => setMode("join")}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium shadow-sm"
                >
                  <LogIn className="w-5 h-5" />
                  Join Existing Organization
                </button>
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {mode === "create"
                  ? "Organization Name"
                  : "Organization Name or ID"}
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === "create"
                    ? "e.g. My Organization"
                    : "e.g. My Organization or ID"
                }
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode("select")}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex-1 flex items-center justify-center py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading
                  ? "Processing..."
                  : mode === "create"
                    ? "Create"
                    : "Join"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrgManagement;
