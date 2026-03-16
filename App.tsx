import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { WifiOff } from "lucide-react";
import { useAuth, AuthProvider } from "./src/hooks/useAuth";

const OrgManagementPage = lazy(() => import("./src/pages/OrgManagementPage"));
const DashboardLayout = lazy(() => import("./src/layouts/DashboardLayout"));
const Login = lazy(() => import("./src/pages/Login"));
const Dashboard = lazy(() => import("./src/pages/Dashboard"));
const Attendance = lazy(() => import("./src/pages/Attendance"));
const AttendanceHistory = lazy(() => import("./src/pages/AttendanceHistory"));
const Students = lazy(() => import("./src/pages/Students"));
const Classes = lazy(() => import("./src/pages/Classes"));
const Reports = lazy(() => import("./src/pages/Reports"));
const Settings = lazy(() => import("./src/pages/Settings"));
const ResultCard = lazy(() => import("./src/pages/ResultCard"));
const SuperAdminDashboard = lazy(() => import("./src/pages/SuperAdminDashboard"));

// Result Management Pages
const Subjects = lazy(() => import("./src/pages/Subjects"));
const Exams = lazy(() => import("./src/pages/Exams"));
const ResultEntry = lazy(() => import("./src/pages/ResultEntry"));
const ResultReports = lazy(() => import("./src/pages/ResultReports"));
const AcademicYears = lazy(() => import("./src/pages/AcademicYears"));
const StudentProfile = lazy(() => import("./src/pages/StudentProfile"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)]">
    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
  </div>
);

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium animate-bounce">
      <WifiOff className="w-4 h-4 text-red-400" />
      আপনি অফলাইনে আছেন
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, status, logout, isApprovalEnabled } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (status === "pending" && isApprovalEnabled && user.email !== "shibbir.ahma.2025@gmail.com") {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full card-premium p-10 border-2 border-amber-100 shadow-amber-900/5 text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white">
            <div className="w-10 h-10 text-amber-600 flex items-center justify-center text-3xl">⏳</div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-4">
            অ্যাকাউন্ট অনুমোদনের অপেক্ষায়
          </h1>
          <p className="text-slate-500 mb-8">
            আপনার অ্যাকাউন্টটি সুপার অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন পেলে আপনি সিস্টেমে প্রবেশ করতে পারবেন।
          </p>
          <button
            onClick={logout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all duration-300 w-full py-3 rounded-xl font-bold"
          >
            সাইন আউট করুন
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OfflineIndicator />
        <Toaster position="top-right" />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/result/student/:studentId/:examId" element={<ResultCard />} />
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
              <Route path="super-admin" element={<SuperAdminDashboard />} />
              
              {/* Result Management Routes */}
              <Route path="subjects" element={<Subjects />} />
              <Route path="exams" element={<Exams />} />
              <Route path="result-entry" element={<ResultEntry />} />
              <Route path="result-reports" element={<ResultReports />} />
              <Route path="academic-years" element={<AcademicYears />} />
              <Route path="student-profile/:studentId" element={<StudentProfile />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
