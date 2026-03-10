import React, { useState, useEffect } from "react";
import { Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const DashboardLayout: React.FC = () => {
  const { orgId, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handle mobile hardware back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Browser back button or mobile back gesture handles this automatically
      // but we can add custom logic here if needed
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!orgId && location.pathname !== "/org-management") {
    return <Navigate to="/org-management" replace />;
  }

  const handleBack = () => {
    if (location.pathname === "/attendance/history") {
      navigate("/attendance");
    } else {
      navigate("/");
    }
  };

  const showBackButton = location.pathname !== "/" && location.pathname !== "/org-management";

  return (
    <div className="flex h-screen bg-[var(--color-bg-main)] overflow-hidden">
      {orgId && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
      {orgId && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {orgId && <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--color-bg-main)] p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {showBackButton && (
              <div className="mb-6">
                <button
                  onClick={handleBack}
                  className="bg-[#045F5F] hover:bg-[#006666] text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center px-4 py-2 rounded-xl font-bold text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ফিরে যান
                </button>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
