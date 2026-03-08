import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { User, LogOut, Building, Mail, Shield } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

const Settings: React.FC = () => {
  const { user, orgId, logout, visitedOrgs } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (orgId && visitedOrgs[orgId]) {
      setOrgName(visitedOrgs[orgId]);
    }
  }, [orgId, visitedOrgs]);

  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrgName(e.target.value);
  };

  const handleSaveOrg = async () => {
    if (!orgId || !orgName.trim()) return;
    setIsSaving(true);
    try {
      const orgRef = doc(db, "organizations", orgId);
      await updateDoc(orgRef, { name: orgName.trim() });
      toast.success("প্রতিষ্ঠানের নাম সফলভাবে আপডেট করা হয়েছে!");
    } catch (error) {
      console.error("Error updating organization name:", error);
      toast.error("প্রতিষ্ঠানের নাম আপডেট করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyId = () => {
    if (orgId) {
      navigator.clipboard.writeText(orgId);
      toast.success("অর্গানাইজেশন আইডি ক্লিপবোর্ডে কপি করা হয়েছে!");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold gradient-text tracking-tight">সেটিংস</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <div className="card-premium p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-100 to-teal-100 rounded-full flex items-center justify-center text-teal-600 shadow-inner border border-white">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                প্রোফাইল সেটিংস
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                আপনার অ্যাকাউন্টের তথ্য পরিচালনা করুন
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                পুরো নাম
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={user?.displayName || ""}
                  disabled
                  className="input-premium pl-10 bg-slate-50/50 cursor-not-allowed opacity-70"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ইমেইল ঠিকানা
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="input-premium pl-10 bg-slate-50/50 cursor-not-allowed opacity-70"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                পদবি (Role)
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value="অ্যাডমিন"
                  disabled
                  className="input-premium pl-10 bg-slate-50/50 cursor-not-allowed opacity-70"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Organization Section */}
        <div className="card-premium p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full flex items-center justify-center text-purple-600 shadow-inner border border-white">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                প্রতিষ্ঠান
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                আপনার প্রতিষ্ঠানের তথ্য পরিচালনা করুন
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                প্রতিষ্ঠানের নাম
              </label>
              <input
                type="text"
                value={orgName}
                onChange={handleOrgNameChange}
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                অর্গানাইজেশন আইডি
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-slate-600 font-mono text-sm shadow-inner">
                  {orgId}
                </code>
                <button
                  onClick={handleCopyId}
                  className="px-4 py-3 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100"
                >
                  কপি
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                অন্যদের আমন্ত্রণ জানাতে এই আইডি শেয়ার করুন।
              </p>
            </div>

            <div className="pt-6">
              <button
                onClick={handleSaveOrg}
                disabled={isSaving || !orgName.trim() || orgName === visitedOrgs[orgId || ""]}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 w-full py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="col-span-1 md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-rose-100/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-pink-400"></div>
          <h3 className="text-xl font-bold text-rose-600 mb-6 tracking-tight">
            ঝুঁকিপূর্ণ এলাকা
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-rose-50/50 rounded-2xl border border-rose-100 gap-4">
            <div>
              <h4 className="font-semibold text-rose-900 text-lg">সাইন আউট</h4>
              <p className="text-sm text-rose-700/80 mt-1">
                এই ডিভাইস থেকে আপনার অ্যাকাউন্ট থেকে সাইন আউট করুন
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-6 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 hover:text-rose-700 transition-all shadow-sm hover:shadow-md font-medium w-full sm:w-auto justify-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              সাইন আউট
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
