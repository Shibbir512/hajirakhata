import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useResultSettings } from "../hooks/useResultSettings";
import { Settings as SettingsIcon } from "lucide-react";
import { Navigate } from "react-router-dom";

const ResultSettings: React.FC = () => {
  const { orgId, role } = useAuth();
  const { gradingSystem, defaultPassMark, strictFailing, updateSetting } = useResultSettings(orgId);

  // Only admins can access this page
  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="card-premium p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-[#0F5C7A]/10 to-[#14B8A6]/10 rounded-full flex items-center justify-center text-[#0F5C7A] shadow-inner border border-white">
            <SettingsIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              ফলাফল সেটিংস
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              পরীক্ষার ফলাফল ও গ্রেডিং সম্পর্কিত সেটিংস
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">গ্রেডিং সিস্টেম</label>
              <select
                value={gradingSystem || "madrasa"}
                onChange={(e) => updateSetting("gradingSystem", e.target.value)}
                className="input-premium w-full"
              >
                <option value="madrasa">মাদরাসা গ্রেডিং</option>
                <option value="general">জেনারেল গ্রেডিং</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ডিফল্ট পাস মার্ক</label>
              <input
                type="number"
                value={defaultPassMark !== undefined ? defaultPassMark : 33}
                onChange={(e) => updateSetting("defaultPassMark", Number(e.target.value))}
                className="input-premium w-full"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <h4 className="font-medium text-slate-800">কঠোর ফেল নীতি (Strict Failing)</h4>
              <p className="text-sm text-slate-500 mt-1">যেকোনো এক বিষয়ে পাস মার্কের নিচে পেলে পুরো পরীক্ষায় ফেল হিসেবে গণ্য হবে</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={strictFailing ?? true}
                onChange={(e) => updateSetting("strictFailing", e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5C7A]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSettings;
