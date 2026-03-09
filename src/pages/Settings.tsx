import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { User, LogOut, Building, Mail, Shield, Users, Trash2, Ban, ShieldCheck, UserCog } from "lucide-react";
import { doc, updateDoc, collection, query, where, getDocs, deleteField } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

const Settings: React.FC = () => {
  const { user, orgId, role, logout, visitedOrgs } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    if (orgId && visitedOrgs[orgId]) {
      setOrgName(visitedOrgs[orgId]);
    }
  }, [orgId, visitedOrgs]);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!orgId || role !== "admin") return;
      setLoadingStaff(true);
      try {
        const q = query(collection(db, "users"), where("organizationId", "==", orgId));
        const snapshot = await getDocs(q);
        const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStaff(staffList);
      } catch (error) {
        console.error("Error fetching staff:", error);
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaff();
  }, [orgId, role]);

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

  const handleRemoveUser = async (userId: string) => {
    if (userId === user?.uid) {
      toast.error("আপনি নিজেকে মুছে ফেলতে পারবেন না।");
      return;
    }
    if (!window.confirm("আপনি কি নিশ্চিত যে আপনি এই ব্যবহারকারীকে প্রতিষ্ঠান থেকে মুছে ফেলতে চান?")) return;
    
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        organizationId: null,
        [`visitedOrgs.${orgId}`]: deleteField(),
        [`roles.${orgId}`]: deleteField()
      });
      setStaff(staff.filter(s => s.id !== userId));
      toast.success("ব্যবহারকারীকে সফলভাবে মুছে ফেলা হয়েছে।");
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("ব্যবহারকারীকে মুছে ফেলতে ব্যর্থ হয়েছে।");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (userId === user?.uid) {
      toast.error("আপনি নিজের পদবি পরিবর্তন করতে পারবেন না।");
      return;
    }
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [`roles.${orgId}`]: newRole
      });
      setStaff(staff.map(s => s.id === userId ? { ...s, roles: { ...s.roles, [orgId!]: newRole } } : s));
      toast.success("ব্যবহারকারীর পদবি আপডেট করা হয়েছে।");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("পদবি আপডেট করতে ব্যর্থ হয়েছে।");
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
                  value={role === "admin" ? "অ্যাডমিন" : "শিক্ষক"}
                  disabled
                  className="input-premium pl-10 bg-slate-50/50 cursor-not-allowed opacity-70 font-bold text-teal-700"
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
                disabled={role !== "admin"}
                className={`input-premium ${role !== "admin" ? "bg-slate-50/50 cursor-not-allowed opacity-70" : ""}`}
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

            {role === "admin" && (
              <div className="pt-6">
                <button
                  onClick={handleSaveOrg}
                  disabled={isSaving || !orgName.trim() || orgName === visitedOrgs[orgId || ""]}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 w-full py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Staff Management Section (Admin Only) */}
        {role === "admin" && (
          <div className="col-span-1 md:col-span-2 card-premium p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-cyan-100 rounded-full flex items-center justify-center text-blue-600 shadow-inner border border-white">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                  স্টাফ ম্যানেজমেন্ট
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  আপনার প্রতিষ্ঠানের ব্যবহারকারীদের পরিচালনা করুন
                </p>
              </div>
            </div>

            {loadingStaff ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
            ) : staff.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-sm">
                      <th className="pb-3 font-medium">ব্যবহারকারী</th>
                      <th className="pb-3 font-medium">পদবি</th>
                      <th className="pb-3 font-medium text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s) => {
                      const currentRole = (s.roles && s.roles[orgId!]) || s.role || "teacher";
                      return (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{s.displayName || s.id}</span>
                            <span className="text-xs text-slate-500">{s.email || "ইমেইল নেই"}</span>
                            {s.displayName && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5" title="User ID">{s.id}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            currentRole === "admin" 
                              ? "bg-purple-100 text-purple-700" 
                              : currentRole === "banned"
                              ? "bg-red-100 text-red-700"
                              : "bg-teal-100 text-teal-700"
                          }`}>
                            {currentRole === "admin" ? "অ্যাডমিন" : currentRole === "banned" ? "ব্যানড" : "শিক্ষক"}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {currentRole !== "admin" ? (
                              <button
                                onClick={() => handleUpdateRole(s.id, "admin")}
                                disabled={s.id === user?.uid}
                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="অ্যাডমিন/মডারেটর বানান"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateRole(s.id, "teacher")}
                                disabled={s.id === user?.uid}
                                className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="শিক্ষক বানান"
                              >
                                <UserCog className="w-4 h-4" />
                              </button>
                            )}
                            
                            {currentRole !== "banned" ? (
                              <button
                                onClick={() => handleUpdateRole(s.id, "banned")}
                                disabled={s.id === user?.uid || currentRole === "admin"}
                                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="ব্যান করুন"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateRole(s.id, "teacher")}
                                disabled={s.id === user?.uid}
                                className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="ব্যান তুলে নিন"
                              >
                                <UserCog className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleRemoveUser(s.id)}
                              disabled={s.id === user?.uid}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="প্রতিষ্ঠান থেকে মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">কোনো স্টাফ পাওয়া যায়নি।</p>
            )}
          </div>
        )}

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
