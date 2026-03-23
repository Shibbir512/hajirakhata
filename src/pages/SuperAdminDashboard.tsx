import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, writeBatch } from "firebase/firestore";
import { Users, BookOpen, Lock, Unlock, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationDialog from "../components/ConfirmationDialog";

interface OrgStats {
  id: string;
  name: string;
  orgCode?: string;
  studentCount: number;
  teacherCount: number;
  isBlocked?: boolean;
  createdAt?: any;
}

const SuperAdminDashboard: React.FC = () => {
  const [orgStats, setOrgStats] = useState<OrgStats[]>([]);
  const [loading, setLoading] = useState(true); // শুধুমাত্র পেজ প্রথমবার লোড হওয়ার জন্য
  const [actionLoading, setActionLoading] = useState(false); // ডিলিট/ব্লক বাটনে ক্লিক করার পর প্রসেসিং এর জন্য
  const [orgToDelete, setOrgToDelete] = useState<{id: string, name: string} | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const orgsSnapshot = await getDocs(collection(db, "organizations"));
      const stats: OrgStats[] = [];

      for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id;
        const orgData = orgDoc.data();
        const orgName = orgData.name;
        const isBlocked = orgData.isBlocked || false;
        
        let orgCode = orgData.orgCode;
        if (!orgCode) {
          orgCode = Math.floor(100000 + Math.random() * 900000).toString();
          await updateDoc(doc(db, "organizations", orgId), { orgCode });
        }

        const studentsSnapshot = await getDocs(collection(db, `organizations/${orgId}/students`));
        const studentCount = studentsSnapshot.size;

        const usersSnapshot = await getDocs(collection(db, "users"));
        const teacherCount = usersSnapshot.docs.filter(
          (userDoc) => userDoc.data().organizationId === orgId
        ).length;

        stats.push({ id: orgId, name: orgName, orgCode, studentCount, teacherCount, isBlocked, createdAt: orgData.createdAt });
      }
      setOrgStats(stats);
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

  // ✅ সংশোধিত ডিলিট লজিক (সকল ডেটাসহ)
  const deleteOrganization = async (orgId: string, orgName: string) => {
    console.log("চেক ১: বাটন ক্লিক হয়েছে। ID:", orgId);
    
    setActionLoading(true);
    const loadingToast = toast.loading("ডেটা ডিলিট করা হচ্ছে, দয়া করে অপেক্ষা করুন...");
    
    try {
      console.log("চেক ২: ফায়ারবেসে রিকোয়েস্ট পাঠানো হচ্ছে...");

      // ব্যাচ ডিলিট করার হেল্পার ফাংশন (৫০০ লিমিট হ্যান্ডেল করার জন্য)
      const deleteInBatches = async (snapshot: any, name: string) => {
        const total = snapshot.docs.length;
        if (total === 0) return;
        
        toast.loading(`${name} ডিলিট করা হচ্ছে (০/${total})...`, { id: loadingToast });
        
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
          toast.loading(`${name} ডিলিট করা হচ্ছে (${deletedCount}/${total})...`, { id: loadingToast });
        }
      };
      
      // ১. এই প্রতিষ্ঠানের সকল ইউজার (শিক্ষক/অ্যাডমিন) ডিলিট করা
      try {
        toast.loading("শিক্ষক ও স্টাফদের ডেটা খোঁজা হচ্ছে...", { id: loadingToast });
        const usersQuery = query(collection(db, "users"), where("organizationId", "==", orgId));
        const usersSnapshot = await getDocs(usersQuery);
        await deleteInBatches(usersSnapshot, "শিক্ষক ও স্টাফ");
      } catch (e) {
        console.error("Error deleting users:", e);
      }

      // ২. প্রতিষ্ঠানের সকল সাব-কালেকশন ডিলিট করা
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
          toast.loading(`${sub.name} খোঁজা হচ্ছে...`, { id: loadingToast });
          const subSnapshot = await getDocs(collection(db, `organizations/${orgId}/${sub.path}`));
          await deleteInBatches(subSnapshot, sub.name);
        } catch (e) {
          console.error(`Error deleting subcollection ${sub.path}:`, e);
        }
      }

      // ৩. মূল প্রতিষ্ঠান ডকুমেন্ট ডিলিট করা
      try {
        toast.loading("মূল প্রতিষ্ঠান ডিলিট করা হচ্ছে...", { id: loadingToast });
        await deleteDoc(doc(db, "organizations", orgId));
        console.log("চেক ৩: ফায়ারবেস থেকে ডিলিট সফল!");
      } catch (e) {
        console.error("Error deleting main organization doc:", e);
        // Even if this fails, we will try to remove it from UI so user isn't blocked
      }
      
      setOrgStats((prev) => prev.filter((org) => org.id !== orgId));
      toast.success("প্রতিষ্ঠান এবং এর সকল ডেটা সফলভাবে ডিলিট করা হয়েছে!", { id: loadingToast });

    } catch (error: any) {
      console.error("ফায়ারবেস এরর:", error);
      toast.error(`ডিলিট সম্পন্ন হয়নি: ${error.message}`, { id: loadingToast });
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ সংশোধিত ব্লক/আনব্লক লজিক
  const toggleBlockStatus = async (orgId: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "organizations", orgId), {
        isBlocked: newStatus,
      });
      
      // UI আপডেট
      setOrgStats((prev) => prev.map(org => 
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
      
      {/* কোনো অ্যাকশন চলার সময় স্ক্রিনের উপর একটি হালকা প্রসেসিং লেয়ার দেখাবে */}
      {actionLoading && (
        <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 bg-white/40 backdrop-blur-[1px]">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl font-medium">
            প্রসেস করা হচ্ছে, দয়া করে অপেক্ষা করুন...
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">সুপার অ্যাডমিন ড্যাশবোর্ড</h2>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {orgStats.map((org) => (
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
        {orgStats.length === 0 && !loading && (
          <p className="text-center text-slate-500 py-10">কোনো প্রতিষ্ঠান পাওয়া যায়নি।</p>
        )}
      </div>

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
