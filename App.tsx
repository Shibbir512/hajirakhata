import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import OrgManagementPage from "./src/pages/OrgManagementPage";
import DashboardLayout from "./src/layouts/DashboardLayout";
import Login from "./src/pages/Login";
import Dashboard from "./src/pages/Dashboard";
import Attendance from "./src/pages/Attendance";
import AttendanceHistory from "./src/pages/AttendanceHistory";
import Students from "./src/pages/Students";
import Classes from "./src/pages/Classes";
import Reports from "./src/pages/Reports";
import Settings from "./src/pages/Settings";
import { useAuth, AuthProvider } from "./src/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)]">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/org-management" element={<ProtectedRoute><OrgManagementPage /></ProtectedRoute>} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="attendance/history" element={<AttendanceHistory />} />
            <Route path="students" element={<Students />} />
            <Route path="classes" element={<Classes />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
