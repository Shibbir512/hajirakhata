import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { User, LogOut, Building, Mail, Shield, Users, Trash2, Ban, ShieldCheck, UserCog, UserMinus, Phone, List, X, Camera, Upload, Loader2 } from "lucide-react";
import { doc, updateDoc, collection, query, where, getDocs, getDoc, deleteField, deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { deleteUser, updateProfile } from "firebase/auth";
import { db, auth } from "../firebase";
import toast from "react-hot-toast";

const Settings: React.FC = () => {
  const { user, orgId, role, phone, photoURL, logout, visitedOrgs, isApprovalEnabled } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [loadingAllOrgs, setLoadingAllOrgs] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [isTogglingApproval, setIsTogglingApproval] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperAdmin = user?.email === "shibbir.ahma.2025@gmail.com";

  const toggleApproval = async () => {
    setIsTogglingApproval(true);
    try {
      await setDoc(doc(db, "globalSettings", "config"), { isApprovalEnabled: !isApprovalEnabled }, { merge: true });
      toast.success(isApprovalEnabled ? "নতুন ব্যবহারকারী অনুমোদন সিস্টেম বন্ধ করা হয়েছে।" : "নতুন ব্যবহারকারী অনুমোদন সিস্টেম চালু করা হয়েছে।");
    } catch (e) {
      console.error("Error toggling approval:", e);
      toast.error("সিস্টেম আপডেট করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsTogglingApproval(false);
    }
  };

  useEffect(() => {
    if (orgId && visitedOrgs[orgId]) {
      setOrgName(visitedOrgs[orgId]);
    }
  }, [orgId, visitedOrgs]);

  useEffect(() => {
    if (phone) {
      setUserPhone(phone);
    }
  }, [phone]);

  useEffect(() => {
    if (!orgId || role !== "admin" || !db) return;
    
    setLoadingStaff(true);
    const q = query(collection(db, "users"), where("organizationId", "==", orgId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(staffList);
      setLoadingStaff(false);
    }, (error) => {
      console.error("Error fetching staff:", error);
      setLoadingStaff(false);
    });

    return () => unsubscribe();
  }, [orgId, role]);

  useEffect(() => {
    if (isSuperAdmin && db) {
      const fetchAllOrgs = async () => {
        setLoadingAllOrgs(true);
        try {
          const q = query(collection(db, "organizations"));
          const snap = await getDocs(q);
          const orgsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // For orgs missing creator info, try to fetch from users collection
          const updatedOrgs = await Promise.all(orgsData.map(async (org: any) => {
            if ((!org.creatorName || org.creatorName === "অজানা") && org.createdBy) {
              try {
                const userSnap = await getDoc(doc(db, "users", org.createdBy));
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  return {
                    ...org,
                    creatorName: userData.displayName || userData.email?.split('@')[0] || "অজানা",
                    creatorEmail: userData.email || "ইমেইল নেই"
                  };
                }
              } catch (e) {
                console.error("Error fetching creator info for org:", org.id, e);
              }
            }
            return org;
          }));

          setAllOrgs(updatedOrgs);
        } catch (e) {
          console.error("Error fetching all orgs:", e);
        } finally {
          setLoadingAllOrgs(false);
        }
      };
      
      const fetchPendingUsers = () => {
        setLoadingPendingUsers(true);
        const q = query(collection(db, "users"), where("status", "==", "pending"));
        return onSnapshot(q, (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPendingUsers(usersData);
          setLoadingPendingUsers(false);
        }, (error) => {
          console.error("Error fetching pending users:", error);
          setLoadingPendingUsers(false);
        });
      };
      
      fetchAllOrgs();
      const unsubPending = fetchPendingUsers();
      
      return () => {
        unsubPending();
      };
    }
  }, [isSuperAdmin]);

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

  const handleSavePhone = async () => {
    if (!user) return;
    setIsSavingPhone(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { phone: userPhone.trim() });
      toast.success("ফোন নম্বর সফলভাবে আপডেট করা হয়েছে!");
    } catch (error) {
      console.error("Error updating phone number:", error);
      toast.error("ফোন নম্বর আপডেট করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsSavingPhone(false);
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 1MB for base64 storage in Firestore)
    if (file.size > 1024 * 1024) {
      toast.error("ছবিটি ১ মেগাবাইটের চেয়ে ছোট হতে হবে।");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("ছবি আপলোড করা হচ্ছে...");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // 1. Update Firestore
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { photoURL: base64String });
        
        // Note: We skip updateProfile(auth.currentUser, { photoURL: base64String }) 
        // because base64 strings are too long for Firebase Auth profile attributes.
        // The app uses the photoURL from Firestore via the useAuth hook.
        
        toast.success("প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে!", { id: toastId });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("ছবি আপলোড করতে ব্যর্থ হয়েছে।", { id: toastId });
      setIsUploading(false);
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

  const executeDeleteAccount = async () => {
    if (!user) {
      toast.error("ব্যবহারকারী খুঁজে পাওয়া যায়নি।");
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading("অ্যাকাউন্ট মুছে ফেলা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...");

    try {
      // 1. Delete from Firestore first
      const userRef = doc(db, "users", user.uid);
      await deleteDoc(userRef);
      
      // 2. Delete from Firebase Auth
      await deleteUser(user);
      
      toast.success("আপনার অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।", { id: toastId, duration: 5000 });
      logout();
    } catch (error: any) {
      console.error("Error deleting own account:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("নিরাপত্তার জন্য অনুগ্রহ করে লগআউট করে আবার লগইন করুন, তারপর চেষ্টা করুন।", { id: toastId, duration: 6000 });
      } else {
        toast.error(`অ্যাকাউন্ট মুছে ফেলতে ব্যর্থ হয়েছে: ${error.message || "অজানা ত্রুটি"}`, { id: toastId, duration: 6000 });
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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
            <div className="relative group">
              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-teal-100 rounded-full flex items-center justify-center text-teal-600 shadow-inner border-2 border-white overflow-hidden relative">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10" />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-teal-700 transition-colors border-2 border-white">
                <Camera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
              </label>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ফোন নম্বর
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="ফোন নম্বর লিখুন"
                    className="input-premium pl-10"
                  />
                </div>
                <button
                  onClick={handleSavePhone}
                  disabled={isSavingPhone || userPhone === (phone || "")}
                  className="px-4 py-2 bg-teal-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {isSavingPhone ? "..." : "সেভ"}
                </button>
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
                  className="w-full px-6 py-4 bg-white text-teal-600 border border-teal-100 shadow-md hover:shadow-lg hover:bg-teal-50 rounded-2xl transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <span className="font-semibold text-slate-800">
                              {s.displayName || s.name || (s.email ? s.email.split('@')[0] : "অজানা ব্যবহারকারী")}
                            </span>
                            <span className="text-xs text-slate-500">{s.email || "ইমেইল নেই"}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-mono" title="User ID">ID: {s.id}</span>
                              {s.id === user?.uid && (
                                <span className="text-[10px] bg-teal-50 text-teal-600 px-1 rounded border border-teal-100">আপনি</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            currentRole === "admin" 
                              ? "bg-purple-100 text-purple-700" 
                              : currentRole === "banned"
                              ? "bg-red-100 text-red-700"
                              : currentRole === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-teal-100 text-teal-700"
                          }`}>
                            {currentRole === "admin" ? "অ্যাডমিন" : currentRole === "banned" ? "ব্যানড" : currentRole === "pending" ? "অপেক্ষমান" : "শিক্ষক"}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {currentRole === "pending" ? (
                              <button
                                onClick={() => handleUpdateRole(s.id, "teacher")}
                                disabled={s.id === user?.uid}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="অনুমোদন করুন"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <>
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
                              </>
                            )}

                            <button
                              onClick={() => handleRemoveUser(s.id)}
                              disabled={s.id === user?.uid}
                              className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="প্রতিষ্ঠান থেকে সরিয়ে দিন"
                            >
                              <UserMinus className="w-4 h-4" />
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

        {/* Pending Users Section (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="col-span-1 md:col-span-2 card-premium p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-amber-100 to-orange-100 rounded-full flex items-center justify-center text-amber-600 shadow-inner border border-white">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                    অপেক্ষমান ব্যবহারকারী (সুপার অ্যাডমিন)
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    যেসব ব্যবহারকারী অনুমোদনের অপেক্ষায় আছেন
                  </p>
                </div>
              </div>
              <button
                onClick={toggleApproval}
                disabled={isTogglingApproval}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${isApprovalEnabled ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200"}`}
              >
                {isTogglingApproval ? "অপেক্ষা করুন..." : isApprovalEnabled ? "অনুমোদন সিস্টেম: চালু" : "অনুমোদন সিস্টেম: বন্ধ"}
              </button>
            </div>

            {loadingPendingUsers ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
            ) : pendingUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-sm">
                      <th className="pb-3 font-medium">নাম ও ইমেইল</th>
                      <th className="pb-3 font-medium">ফোন নম্বর</th>
                      <th className="pb-3 font-medium text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((pUser) => (
                      <tr key={pUser.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{pUser.displayName || "অজানা"}</span>
                            <span className="text-xs text-slate-500">{pUser.email || "ইমেইল নেই"}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-slate-700">{pUser.phone || "দেওয়া হয়নি"}</span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, "users", pUser.id), { status: "active" });
                                  toast.success("ব্যবহারকারীকে অনুমোদন দেওয়া হয়েছে।");
                                } catch (e) {
                                  console.error("Error approving user:", e);
                                  toast.error("অনুমোদন দিতে ব্যর্থ হয়েছে।");
                                }
                              }}
                              className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-medium transition-colors text-sm"
                            >
                              অনুমোদন দিন
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, "users", pUser.id), { status: "rejected" });
                                  toast.success("ব্যবহারকারীকে বাতিল করা হয়েছে।");
                                } catch (e) {
                                  console.error("Error rejecting user:", e);
                                  toast.error("বাতিল করতে ব্যর্থ হয়েছে।");
                                }
                              }}
                              className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg font-medium transition-colors text-sm"
                            >
                              বাতিল করুন
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">কোনো অপেক্ষমান ব্যবহারকারী নেই।</p>
            )}
          </div>
        )}

        {/* System Overview Section (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="col-span-1 md:col-span-2 card-premium p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-tr from-orange-100 to-yellow-100 rounded-full flex items-center justify-center text-orange-600 shadow-inner border border-white">
                <List className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                  সিস্টেম ওভারভিউ (সুপার অ্যাডমিন)
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  সিস্টেমের সকল প্রতিষ্ঠানের তালিকা
                </p>
              </div>
            </div>

            {loadingAllOrgs ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
              </div>
            ) : allOrgs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-sm">
                      <th className="pb-3 font-medium">প্রতিষ্ঠানের নাম ও আইডি</th>
                      <th className="pb-3 font-medium">তৈরি করেছেন</th>
                      <th className="pb-3 font-medium">তৈরির সময়</th>
                      <th className="pb-3 font-medium text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrgs.map((org) => (
                      <tr key={org.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">{org.name}</span>
                            <span className="text-xs text-slate-400 font-mono">ID: {org.id}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700">{org.creatorName || "অজানা"}</span>
                            <span className="text-xs text-slate-500">{org.creatorEmail || "ইমেইল নেই"}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-xs text-slate-500">
                            {org.createdAt?.toDate ? org.createdAt.toDate().toLocaleDateString('bn-BD') : "N/A"}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={async () => {
                              const isBanned = !!org.banned;
                              try {
                                await updateDoc(doc(db, "organizations", org.id), { banned: !isBanned });
                                setAllOrgs(allOrgs.map(o => o.id === org.id ? { ...o, banned: !isBanned } : o));
                                toast.success(isBanned ? "প্রতিষ্ঠানটি আনব্যান করা হয়েছে।" : "প্রতিষ্ঠানটি ব্যান করা হয়েছে।");
                              } catch (e) {
                                console.error("Error toggling ban:", e);
                                toast.error("ব্যর্থ হয়েছে।");
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors inline-flex items-center justify-center ${org.banned ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" : "text-rose-600 bg-rose-50 hover:bg-rose-100"}`}
                            title={org.banned ? "আনব্যান করুন" : "ব্যান করুন"}
                          >
                            {org.banned ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
                  <p className="text-teal-800 font-bold">মোট প্রতিষ্ঠান: {allOrgs.length}টি</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">কোনো প্রতিষ্ঠান পাওয়া যায়নি।</p>
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
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-rose-50/50 rounded-2xl border border-rose-100 gap-4 mt-4">
            <div>
              <h4 className="font-semibold text-rose-900 text-lg">অ্যাকাউন্ট মুছে ফেলুন</h4>
              <p className="text-sm text-rose-700/80 mt-1">
                সাবধান! আপনার অ্যাকাউন্ট এবং সমস্ত তথ্য চিরতরে মুছে ফেলা হবে।
              </p>
            </div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="bg-rose-500 hover:bg-rose-600 text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center px-4 py-3 rounded-xl font-bold text-sm w-full sm:w-auto justify-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  বাতিল
                </button>
                <button
                  onClick={executeDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-3 text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors text-sm font-medium flex items-center justify-center w-full sm:w-auto disabled:opacity-70"
                >
                  {isDeleting ? "মুছে ফেলা হচ্ছে..." : "হ্যাঁ, মুছে ফেলুন"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center px-6 py-3 bg-rose-600 border border-rose-700 text-white rounded-xl hover:bg-rose-700 transition-all shadow-sm hover:shadow-md font-medium w-full sm:w-auto justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                অ্যাকাউন্ট মুছে ফেলুন
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
