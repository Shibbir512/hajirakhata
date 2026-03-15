import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Users, BookOpen, Lock, Unlock } from "lucide-react";
import toast from "react-hot-toast";

interface OrgStats {
  id: string;
  name: string;
  studentCount: number;
  teacherCount: number;
  isBlocked?: boolean;
}

const SuperAdminDashboard: React.FC = () => {
  const [orgStats, setOrgStats] = useState<OrgStats[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Count Students
        const studentsSnapshot = await getDocs(collection(db, `organizations/${orgId}/students`));
        const studentCount = studentsSnapshot.size;

        // Count Teachers
        const usersSnapshot = await getDocs(collection(db, "users"));
        const teacherCount = usersSnapshot.docs.filter(
          (userDoc) => userDoc.data().organizationId === orgId
        ).length;

        stats.push({ id: orgId, name: orgName, studentCount, teacherCount, isBlocked });
      }
      setOrgStats(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const toggleBlockStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "organizations", orgId), {
        isBlocked: !currentStatus,
      });
      toast.success(`প্রতিষ্ঠানটি সফলভাবে ${!currentStatus ? "ব্লক" : "আনব্লক"} করা হয়েছে।`);
      fetchStats();
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast.error("অবস্থা পরিবর্তন করতে ব্যর্থ হয়েছে।");
    }
  };

  if (loading) return <div className="p-8 text-center">লোড হচ্ছে...</div>;

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-3xl font-bold text-slate-800 tracking-tight">সুপার অ্যাডমিন ড্যাশবোর্ড</h2>
      <div className="grid grid-cols-1 gap-6">
        {orgStats.map((org) => (
          <div key={org.id} className="card-premium p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{org.name}</h3>
                <p className="text-sm text-slate-500 font-mono truncate max-w-[200px] sm:max-w-none">{org.id}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0a5682]" />
                  <span className="font-bold text-slate-700">{org.studentCount} ছাত্র</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-slate-700">{org.teacherCount} শিক্ষক</span>
                </div>
                <button
                  onClick={() => toggleBlockStatus(org.id, org.isBlocked || false)}
                  className={`p-2 rounded-full transition-colors ${
                    org.isBlocked ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                  title={org.isBlocked ? "আনব্লক করুন" : "ব্লক করুন"}
                >
                  {org.isBlocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
