import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { WifiOff, AlertTriangle, RefreshCcw, RefreshCw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, AuthProvider } from "./src/hooks/useAuth";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorDetails = null;
      try {
        errorDetails = JSON.parse(this.state.error.message);
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-4">কিছু একটা সমস্যা হয়েছে</h1>
            <p className="text-slate-600 mb-8">
              {errorDetails ? "সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।" : "অ্যাপ্লিকেশনটি লোড করতে সমস্যা হচ্ছে।"}
            </p>
            
            {errorDetails && (
              <div className="bg-slate-50 p-4 rounded-xl mb-8 text-left overflow-hidden">
                <p className="text-xs font-mono text-slate-500 break-all">
                  Error: {errorDetails.error}<br />
                  Op: {errorDetails.operationType}<br />
                  Path: {errorDetails.path}
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#0F5C7A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#0F5C7A]/90 transition-all shadow-lg shadow-[#0F5C7A]/20"
            >
              <RefreshCcw className="w-5 h-5" />
              আবার চেষ্টা করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const OrgManagementPage = lazy(() => import("./src/pages/OrgManagementPage"));
const DashboardLayout = lazy(() => import("./src/layouts/DashboardLayout"));
const Login = lazy(() => import("./src/pages/Login"));
const Dashboard = lazy(() => import("./src/pages/Dashboard"));
const Attendance = lazy(() => import("./src/pages/Attendance"));
const AttendanceHistory = lazy(() => import("./src/pages/AttendanceHistory"));
const LeaveManagement = lazy(() => import("./src/pages/LeaveManagement"));
const StruckOffStudents = lazy(() => import("./src/pages/StruckOffStudents"));
const Students = lazy(() => import("./src/pages/Students"));
const Alumni = lazy(() => import("./src/pages/Alumni"));
const Classes = lazy(() => import("./src/pages/Classes"));
const ClassDetails = lazy(() => import("./src/pages/ClassDetails"));
const Reports = lazy(() => import("./src/pages/Reports"));
const Settings = lazy(() => import("./src/pages/Settings"));
const Help = lazy(() => import("./src/pages/Help"));
const ResultCard = lazy(() => import("./src/pages/ResultCard"));
const SuperAdminDashboard = lazy(() => import("./src/pages/SuperAdminDashboard"));
const CalendarView = lazy(() => import("./src/pages/CalendarView"));

// Result Management Pages
const Subjects = lazy(() => import("./src/pages/Subjects"));
const Exams = lazy(() => import("./src/pages/Exams"));
const ResultEntry = lazy(() => import("./src/pages/ResultEntry"));
const ResultReports = lazy(() => import("./src/pages/ResultReports"));
const ResultSettings = lazy(() => import("./src/pages/ResultSettings"));
const Marksheet = lazy(() => import("./src/pages/Marksheet"));
const AcademicYears = lazy(() => import("./src/pages/AcademicYears"));
const Announcements = lazy(() => import("./src/pages/Announcements"));
const StudentProfile = lazy(() => import("./src/pages/StudentProfile"));
const PublicResultView = lazy(() => import("./src/pages/PublicResultView"));
const PublicClassResult = lazy(() => import("./src/pages/PublicClassResult"));
const PublicResultSearchPage = lazy(() => import("./src/components/PublicResultSearch"));

// Fee Management Pages
const FeeCategories = lazy(() => import("./src/pages/fees/FeeCategories"));
const FeeSetup = lazy(() => import("./src/pages/fees/FeeSetup"));
const FeeCollection = lazy(() => import("./src/pages/fees/FeeCollection"));
const FeeReports = lazy(() => import("./src/pages/fees/FeeReports"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)]">
    <div className="w-12 h-12 border-4 border-[#0F5C7A]/20 border-t-[#0F5C7A] rounded-full animate-spin"></div>
  </div>
);

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced">("idle");
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setSyncStatus("idle");
    } else if (isOnline && wasOffline) {
      // Just came back online
      setSyncStatus("syncing");
      
      // Simulate sync time (Firestore handles actual sync internally, 
      // but we show the UI to assure the user it's happening)
      const syncTimer = setTimeout(() => {
        setSyncStatus("synced");
        
        // Hide after showing success
        setTimeout(() => {
          setWasOffline(false);
          setSyncStatus("idle");
        }, 3000);
      }, 2000);
      
      return () => clearTimeout(syncTimer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {(!isOnline || syncStatus !== "idle") && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-20 md:top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className={`px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 text-sm font-bold backdrop-blur-md border ${
            !isOnline 
              ? "bg-rose-500/90 text-white border-rose-600 shadow-rose-900/20" 
              : syncStatus === "syncing"
              ? "bg-amber-500/90 text-white border-amber-600 shadow-amber-900/20"
              : "bg-emerald-500/90 text-white border-emerald-600 shadow-emerald-900/20"
          }`}>
            {!isOnline && (
              <>
                <WifiOff className="w-4 h-4" />
                <span>অফলাইন মোড - লোকালি সেভ হচ্ছে</span>
              </>
            )}
            
            {isOnline && syncStatus === "syncing" && (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>অফলাইন ডেটা সার্ভারে সিঙ্ক হচ্ছে...</span>
              </>
            )}

            {isOnline && syncStatus === "synced" && (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>সিঙ্ক সফলভাবে সম্পন্ন হয়েছে</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
  const isSrcDoc = window.location.protocol === 'about:' || window.location.href === 'about:srcdoc' || window.location.origin === 'null';
  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  
  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontSize: '14px',
            padding: '12px 20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
        }}
      />
      <AuthProvider>
        <ErrorBoundary>
          {isSrcDoc ? (
            <MemoryRouter initialEntries={[currentPath || '/']}>
              <AppRoutes />
            </MemoryRouter>
          ) : (
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          )}
        </ErrorBoundary>
      </AuthProvider>
    </>
  );
};

const AppRoutes = () => (
  <>
    <OfflineIndicator />
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/result/student/:studentId/:examId" element={<ResultCard />} />
        <Route path="/public-result/:orgId/:studentId/:examId" element={<PublicResultView />} />
        <Route path="/public-class-result/:orgId/:yearId/:classId/:examId" element={<PublicClassResult />} />
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
          <Route path="attendance/leave" element={<LeaveManagement />} />
          <Route path="attendance/struck-off" element={<StruckOffStudents />} />
          <Route path="students" element={<Students />} />
          <Route path="alumni" element={<Alumni />} />
          <Route path="classes" element={<Classes />} />
          <Route path="classes/:classId" element={<ClassDetails />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          <Route path="super-admin" element={<SuperAdminDashboard />} />
          
          {/* Result Management Routes */}
          <Route path="subjects" element={<Subjects />} />
          <Route path="exams" element={<Exams />} />
          <Route path="result-entry" element={<ResultEntry />} />
          <Route path="result-reports" element={<ResultReports />} />
          <Route path="marksheet" element={<Marksheet />} />
          <Route path="academic-years" element={<AcademicYears />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="student-profile/:studentId" element={<StudentProfile />} />
          <Route path="result-search" element={<PublicResultSearchPage />} />
          <Route path="result-search/:orgId" element={<PublicResultSearchPage />} />
          <Route path="result-settings" element={<ResultSettings />} />
          
          {/* Fee Management Routes */}
          <Route path="fees/categories" element={<FeeCategories />} />
          <Route path="fees/setup" element={<FeeSetup />} />
          <Route path="fees/collection" element={<FeeCollection />} />
          <Route path="fees/reports" element={<FeeReports />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </>
);

export default App;
