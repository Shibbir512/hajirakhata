import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import OrgManagement from "../components/OrgManagement";

const OrgManagementPage: React.FC = () => {
  const { createOrganization, joinOrganization, removeVisitedOrg, logout, visitedOrgs } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/");
    // Fallback if navigate doesn't trigger a re-render or route change properly
    setTimeout(() => {
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
      <OrgManagement
        onCreateOrg={createOrganization}
        onJoinOrg={joinOrganization}
        onRemoveVisitedOrg={removeVisitedOrg}
        onLogout={logout}
        visitedOrgs={visitedOrgs}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default OrgManagementPage;
