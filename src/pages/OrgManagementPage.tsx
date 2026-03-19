import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import OrgManagement from "../components/OrgManagement";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

const OrgManagementPage: React.FC = () => {
  const { user, createOrganization, joinOrganization, removeVisitedOrg, logout, visitedOrgs } = useAuth();
  const navigate = useNavigate();
  const [allOrgs, setAllOrgs] = useState<{ [key: string]: string }>({});
  
  const isSuperAdmin = user?.email === "shibbir.ahma.2025@gmail.com";

  useEffect(() => {
    if (isSuperAdmin && db) {
      const fetchAllOrgs = async () => {
        try {
          const orgsSnapshot = await getDocs(collection(db, "organizations"));
          const orgsData: { [key: string]: string } = {};
          orgsSnapshot.docs.forEach(doc => {
            orgsData[doc.id] = doc.data().name || "অজানা প্রতিষ্ঠান";
          });
          setAllOrgs(orgsData);
          if (orgsSnapshot.empty) {
            console.log("No organizations found in the database.");
          }
        } catch (error: any) {
          console.error("Error fetching all orgs:", error);
          toast.error("প্রতিষ্ঠান তালিকা লোড করতে ব্যর্থ হয়েছে: " + (error.message || "অজানা ত্রুটি"));
        }
      };
      fetchAllOrgs();
    }
  }, [isSuperAdmin]);

  const handleSuccess = () => {
    navigate("/");
    // Fallback if navigate doesn't trigger a re-render or route change properly
    setTimeout(() => {
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }, 100);
  };

  // For super admin, merge visitedOrgs with allOrgs
  const displayOrgs = isSuperAdmin ? { ...visitedOrgs, ...allOrgs } : visitedOrgs;

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
      <OrgManagement
        onCreateOrg={createOrganization}
        onJoinOrg={joinOrganization}
        onRemoveVisitedOrg={removeVisitedOrg}
        onLogout={logout}
        visitedOrgs={displayOrgs}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default OrgManagementPage;
