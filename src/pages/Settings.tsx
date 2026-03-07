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
      toast.success("Organization name updated successfully!");
    } catch (error) {
      console.error("Error updating organization name:", error);
      toast.error("Failed to update organization name.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyId = () => {
    if (orgId) {
      navigator.clipboard.writeText(orgId);
      toast.success("Organization ID copied to clipboard!");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">সেটিংস</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                প্রোফাইল সেটিংস
              </h3>
              <p className="text-sm text-slate-500">
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
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
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
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
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
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Organization Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                প্রতিষ্ঠান
              </h3>
              <p className="text-sm text-slate-500">
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                অর্গানাইজেশন আইডি
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 font-mono text-sm">
                  {orgId}
                </code>
                <button
                  onClick={handleCopyId}
                  className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  কপি
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                অন্যদের আমন্ত্রণ জানাতে এই আইডি শেয়ার করুন।
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSaveOrg}
                disabled={isSaving || !orgName.trim() || orgName === visitedOrgs[orgId || ""]}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <h3 className="text-lg font-semibold text-red-600 mb-4">
            ঝুঁকিপূর্ণ এলাকা
          </h3>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
            <div>
              <h4 className="font-medium text-red-900">সাইন আউট</h4>
              <p className="text-sm text-red-700">
                এই ডিভাইস থেকে আপনার অ্যাকাউন্ট থেকে সাইন আউট করুন
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
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
