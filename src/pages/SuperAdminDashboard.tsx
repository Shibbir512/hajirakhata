import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
import { Users, BookOpen, Lock, Unlock, Trash2, CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationDialog from "../components/ConfirmationDialog";

interface OrgStats {
  id: string;
  name: string;
  orgCode?: string;
  studentCount: number;
  teacherCount: number;
  isBlocked?: boolean;
  status?: string;
  isApproved?: boolean;
  createdBy?: string;
  creatorName?: string;
  creatorEmail?: string;
  createdAt?: any;
}

const SuperAdminDashboard: React.FC = () => {
  const [activeOrgs, setActiveOrgs] = useState<OrgStats[]>([]);
  const [pendingOrgs, setPendingOrgs] = useState<OrgStats[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "active">("active");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const orgsSnapshot = await getDocs(collection(db, "organizations"));
      const usersSnapshot = await getDocs(collection(db, "users"));
      const allUsers = usersSnapshot.docs;

      const activeList: OrgStats[] = [];
      const pendingList: OrgStats[] = [];

      for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id;
        const orgData = orgDoc.data();
        const orgName = orgData.name;
        const isBlocked = orgData.isBlocked || false;
        const isPending = orgData.status === "pending" || orgData.isApproved === false;
        
        let orgCode = orgData.orgCode;
        if (!orgCode && !isPending) {
          orgCode = Math.floor(100000 + Math.random() * 900000).toString();
          await updateDoc(doc(db, "organizations", orgId), { orgCode }).catch(() => {});
        }

        let studentCount = 0;
        if (!isPending) {
          try {
            const studentsSnapshot = await getDocs(collection(db, `organizations/${orgId}/students`));
            studentCount = studentsSnapshot.size;
          } catch (e) {
            studentCount = 0;
          }
        }

        const teacherCount = allUsers.filter(
          (userDoc) => userDoc.data().organizationId === orgId
        ).length;

        const orgObj: OrgStats = {
          id: orgId,
          name: orgName,
          orgCode,
          studentCount,
          teacherCount,
          isBlocked,
          status: orgData.status || (orgData.isApproved === false ? "pending" : "active"),
          isApproved: orgData.isApproved ?? (orgData.status !== "pending"),
          createdBy: orgData.createdBy,
          creatorName: orgData.creatorName || "অজানা ব্যবহারকারী",
          creatorEmail: orgData.creatorEmail || "",
          createdAt: orgData.createdAt
        };

        if (isPending) {
          pendingList.push(orgObj);
        } else {
          activeList.push(orgObj);
        }
      }

      setActiveOrgs(activeList);
      setPendingOrgs(pendingList);

      // Auto switch to pending tab if there are pending orgs
      if (pendingList.length > 0) {
        setActiveTab("pending");
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("ডেটা লোড করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Approve organization
  const approveOrganization = async (org: OrgStats) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "organizations", org.id), {
        status: "active",
        isApproved: true,
      });

      if (org.createdBy) {
        await updateDoc(doc(db, "users", org.createdBy), {
          [`roles.${org.id}`]: "admin",
          organizationId: org.id,
          status: "active"
        }).catch(() => {});
      }

      setPendingOrgs(prev => prev.filter(item => item.id !== org.id));
      setActiveOrgs(prev => [{ ...org, status: "active", isApproved: true }, ...prev]);
      toast.success(`"${org.name}" প্রতিষ্ঠানটি সফলভাবে অনুমোদন করা হয়েছে!`);
    } catch (error: any) {
      console.error("Error approving org:", error);
      toast.error(`অনুমোদন করতে ব্যর্থ হয়েছে: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject organization
  const rejectOrganization = async (org: OrgStats) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "organizations", org.id), {
        status: "rejected",
        isApproved: false,
      });

      if (org.createdBy) {
        await updateDoc(doc(db, "users", org.createdBy), {
          [`roles.${org.id}`]: "rejected",
        }).catch(() => {});
      }

      setPendingOrgs(prev => prev.filter(item => item.id !== org.id));
      toast.success(`"${org.name}" প্রতিষ্ঠান তৈরির অনুরোধ বাতিল করা হয়েছে।`);
    } catch (error: any) {
      console.error("Error rejecting org:", error);
      toast.error(`বাতিল করতে সমস্যা হয়েছে: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteOrganization = async (orgId: string, orgName: string) => {
    setActionLoading(true);
    const loadingToast = toast.loading("ডেটা ডিলিট করা হচ্ছে, দয়া করে অপেক্ষা করুন...");
    
    try {
      const deleteInBatches = async (snapshot: any, name: string) => {
        const total = snapshot.docs.length;
        if (total === 0) return;
        
        const chunks = [];
        let i = 0;
        while (i < total) {
          chunks.push(snapshot.docs.slice(i, i + 500));
          i += 500;
        }
        
        let deletedCount = 0;
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((doc: any) => batch.delete(doc.ref));
          await batch.commit();
          deletedCount += chunk.length;
        }
      };
      
      try {
        const usersQuery = query(collection(db, "users"), where("organizationId", "==", orgId));
        const usersSnapshot = await getDocs(usersQuery);
        await deleteInBatches(usersSnapshot, "শিক্ষক ও স্টাফ");
      } catch (e) {
        console.error("Error deleting users:", e);
      }

      const subcollections = [
        { path: "students", name: "শিক্ষার্থী" },
        { path: "classes", name: "ক্লাস" },
        { path: "subjects", name: "বিষয়" },
        { path: "exams", name: "পরীক্ষা" },
        { path: "results", name: "ফলাফল" },
        { path: "academic_years", name: "শিক্ষাবর্ষ" },
        { path: "attendance_sessions", name: "হাজিরার সেশন" },
        { path: "attendance", name: "হাজিরার ইতিহাস" },
        { path: "reminders", name: "রিমাইন্ডার" }
      ];
      
      for (const sub of subcollections) {
        try {
          const subSnapshot = await getDocs(collection(db, `organizations/${orgId}/${sub.path}`));
          await deleteInBatches(subSnapshot, sub.name);
        } catch (e) {
          console.error(`Error deleting subcollection ${sub.path}:`, e);
        }
      }

      try {
        await deleteDoc(doc(db, "organizations", orgId));
      } catch (e) {
        console.error("Error deleting main organization doc:", e);
      }
      
      setActiveOrgs((prev) => prev.filter((org) => org.id !== orgId));
      setPendingOrgs((prev) => prev.filter((org) => org.id !== orgId));
      toast.success("প্রতিষ্ঠান এবং এর সকল ডেটা সফলভাবে ডিলিট করা হয়েছে!", { id: loadingToast });

    } catch (error: any) {
      console.error("ফায়ারবেস এরর:", error);
      toast.error(`ডিলিট সম্পন্ন হয়নি: ${error.message}`, { id: loadingToast });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleBlockStatus = async (orgId: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "organizations", orgId), {
        isBlocked: newStatus,
      });
      
      setActiveOrgs((prev) => prev.map(org => 
        org.id === orgId ? { ...org, isBlocked: newStatus } : org
      ));
      toast.success(`প্রতিষ্ঠানটি সফলভাবে ${newStatus ? "ব্লক" : "আনব্লক"} করা হয়েছে।`);

    } catch (error) {
      console.error("Error toggling block status:", error);
      toast.error("অবস্থা পরিবর্তন করতে ব্যর্থ হয়েছে।");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-lg font-bold text-slate-600">ডেটা লোড হচ্ছে...</div>;

  return (
    <div className="p-8 space-y-6 relative">
      {actionLoading && (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 bg-white/40 backdrop-blur-[1px]">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl font-medium">
            প্রসেস করা হচ্ছে, দয়া করে অপেক্ষা করুন...
          </div>
        </div>
      )}

      {/* Tabs for Pending vs Active Orgs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === "pending"
              ? "bg-amber-500 text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>অনুমোদনের অপেক্ষায়</span>
          {pendingOrgs.length > 0 && (
            <span className="bg-white text-amber-600 font-extrabold px-2.5 py-0.5 text-xs rounded-full shadow-sm animate-pulse">
              {pendingOrgs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
            activeTab === "active"
              ? "bg-[#0F5C7A] text-white shadow-md"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>সক্রিয় প্রতিষ্ঠানসমূহ ({activeOrgs.length})</span>
        </button>
      </div>

      {/* Pending Orgs Section */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                ⏳
              </div>
              <div>
                <h3 className="font-bold text-amber-900">নতুন প্রতিষ্ঠান তৈরির অনুরোধ</h3>
                <p className="text-xs text-amber-700">যেসব নতুন প্রতিষ্ঠানের আবেদনের অনুমোদন এখনো দেওয়া হয়নি</p>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-800 bg-amber-200/60 px-3 py-1 rounded-lg">
              মোট: {pendingOrgs.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {pendingOrgs.map((org) => (
              <div key={org.id} className="bg-white border-2 border-amber-200/70 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-slate-800">{org.name}</h3>
                      <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> অপেক্ষমান
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-500">আবেদনকারী:</span>{" "}
                        <span className="font-bold text-slate-800">{org.creatorName}</span>
                      </div>
                      {org.creatorEmail && (
                        <div>
                          <span className="font-semibold text-slate-500">ইমেইল:</span>{" "}
                          <span className="font-mono text-slate-700">{org.creatorEmail}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-500">আইডি:</span>{" "}
                        <span className="font-mono text-slate-600">{org.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end lg:self-center pt-2 lg:pt-0">
                    <button
                      disabled={actionLoading}
                      onClick={() => approveOrganization(org)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      অনুমোদন করুন
                    </button>

                    <button
                      disabled={actionLoading}
                      onClick={() => rejectOrganization(org)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                      বাতিল করুন
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {pendingOrgs.length === 0 && (
              <div className="text-center bg-white border border-slate-200 rounded-2xl py-12 px-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-600 font-bold">কোনো নতুন প্রতিষ্ঠান অনুমোদনের অপেক্ষায় নেই।</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Orgs Section */}
      {activeTab === "active" && (
        <div className="grid grid-cols-1 gap-6">
          {activeOrgs.map((org) => (
            <div key={org.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 transition-all hover:shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{org.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold px-2 py-1 bg-teal-100 text-teal-800 rounded-md">
                      ID: {org.orgCode || org.id.substring(0, 6).toUpperCase()}
                    </span>
                    <p className="text-sm text-slate-500 font-mono truncate max-w-[150px] sm:max-w-none">{org.id}</p>
                  </div>
                  {org.creatorEmail && (
                    <p className="text-xs text-slate-400 mt-1">তৈরি করেছেন: {org.creatorName} ({org.creatorEmail})</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#0F5C7A]" />
                    <span className="font-bold text-slate-700">{org.studentCount} ছাত্র</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#F59E0B]" />
                    <span className="font-bold text-slate-700">{org.teacherCount} শিক্ষক</span>
                  </div>
                  
                  <button
                    disabled={actionLoading}
                    onClick={() => toggleBlockStatus(org.id, org.isBlocked || false)}
                    className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
                      org.isBlocked ? "bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20" : "bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20"
                    }`}
                    title={org.isBlocked ? "আনব্লক করুন" : "ব্লক করুন"}
                  >
                    {org.isBlocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </button>
                  
                  <button
                    disabled={actionLoading}
                    onClick={() => setOrgToDelete({ id: org.id, name: org.name })}
                    className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50 cursor-pointer"
                    title="ডিলিট করুন"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {activeOrgs.length === 0 && !loading && (
            <p className="text-center text-slate-500 py-10">কোনো সক্রিয় প্রতিষ্ঠান পাওয়া যায়নি।</p>
          )}
        </div>
      )}

      {orgToDelete && (
        <ConfirmationDialog
          isOpen={!!orgToDelete}
          onClose={() => setOrgToDelete(null)}
          onConfirm={() => {
            deleteOrganization(orgToDelete.id, orgToDelete.name);
            setOrgToDelete(null);
          }}
          title="প্রতিষ্ঠান ডিলিট করুন"
          message={`আপনি কি নিশ্চিত যে আপনি "${orgToDelete.name}" প্রতিষ্ঠানটি এবং এর সকল ডেটা (ছাত্র, শিক্ষক, ক্লাস ইত্যাদি) স্থায়ীভাবে ডিলিট করতে চান?`}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;
