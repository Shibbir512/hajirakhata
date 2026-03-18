import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";

import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import toast from "react-hot-toast";

const DashboardLayout: React.FC = () => {
  const { orgId, loading, role, user, status, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Notification sound
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPendingCountRef = useRef<number>(0);
  const prevJoinCountRef = useRef<number>(0);

  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => {
        // Ignore NotAllowedError (autoplay policy)
        if (e.name !== 'NotAllowedError') {
          console.error("Error playing sound:", e);
        }
      });
    }
  };

  // Listen for pending sign-up requests (Super Admin only)
  useEffect(() => {
    if (!user || user.email !== "shibbir.ahma.2025@gmail.com" || !db) return;

    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      if (count > prevPendingCountRef.current) {
        playNotificationSound();
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-[#0F5C7A]/10 flex items-center justify-center">
                    <Bell className="h-6 w-6 text-[#0F5C7A]" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    নতুন সাইন-আপ রিকোয়েস্ট!
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {count} জন ইউজার অনুমোদনের অপেক্ষায় আছেন।
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate("/settings");
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-[#0F5C7A] hover:text-[#0C6C8A] focus:outline-none"
              >
                দেখুন
              </button>
            </div>
          </div>
        ), { duration: 6000 });
      }
      prevPendingCountRef.current = count;
    });

    return () => unsubscribe();
  }, [user, db, navigate]);

  // Listen for pending join requests (Org Admin only)
  useEffect(() => {
    if (!user || !orgId || role !== "admin" || !db) return;

    const q = query(collection(db, "users"), where(`roles.${orgId}`, "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      if (count > prevJoinCountRef.current) {
        playNotificationSound();
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-[#0F5C7A]/10 flex items-center justify-center">
                    <Bell className="h-6 w-6 text-[#0F5C7A]" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    নতুন জয়েন রিকোয়েস্ট!
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    আপনার প্রতিষ্ঠানে {count} জন নতুন শিক্ষক যুক্ত হতে চাচ্ছেন।
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate("/settings");
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-[#0F5C7A] hover:text-[#0C6C8A] focus:outline-none"
              >
                দেখুন
              </button>
            </div>
          </div>
        ), { duration: 6000 });
      }
      prevJoinCountRef.current = count;
    });

    return () => unsubscribe();
  }, [user, orgId, role, db, navigate]);

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
        <div className="w-12 h-12 border-4 border-[#0F5C7A]/20 border-t-[#0F5C7A] rounded-full animate-spin"></div>
      </div>
    );
  }

  const isSuperAdmin = user?.email === "shibbir.ahma.2025@gmail.com";

  if (status === "pending" && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full card-premium p-10 border-2 border-amber-100 shadow-amber-900/5 text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white">
            <div className="w-10 h-10 text-amber-600 flex items-center justify-center text-3xl">⏳</div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-4">
            সিস্টেম অনুমোদনের অপেক্ষায়
          </h1>
          <p className="text-slate-500 mb-8">
            আপনার অ্যাকাউন্টটি সুপার অ্যাডমিনের অনুমোদনের অপেক্ষায় আছে। অনুমোদন পেলে আপনি সিস্টেম ব্যবহার করতে পারবেন।
          </p>
          <button
            onClick={logout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all duration-300 w-full py-3 rounded-xl font-bold"
          >
            লগআউট করুন
          </button>
        </div>
      </div>
    );
  }

  if (status === "rejected" && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full card-premium p-10 border-2 border-rose-100 shadow-rose-900/5 text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-rose-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white">
            <div className="w-10 h-10 text-rose-600 flex items-center justify-center text-3xl">🚫</div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-4">
            অ্যাকাউন্ট বাতিল
          </h1>
          <p className="text-slate-500 mb-8">
            আপনার অ্যাকাউন্টটি সিস্টেম অ্যাডমিন দ্বারা বাতিল করা হয়েছে।
          </p>
          <button
            onClick={logout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all duration-300 w-full py-3 rounded-xl font-bold"
          >
            লগআউট করুন
          </button>
        </div>
      </div>
    );
  }

  if (!orgId && location.pathname !== "/org-management" && !(isSuperAdmin && location.pathname === "/super-admin")) {
    return <Navigate to="/org-management" replace />;
  }

  if (role === "pending" && location.pathname !== "/org-management") {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full card-premium p-10 border-2 border-amber-100 shadow-amber-900/5 text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white">
            <div className="w-10 h-10 text-amber-600 flex items-center justify-center text-3xl">⏳</div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-4">
            অনুমোদনের অপেক্ষায়
          </h1>
          <p className="text-slate-500 mb-8">
            আপনার রিকোয়েস্ট অ্যাডমিনের কাছে পাঠানো হয়েছে। অ্যাডমিন অনুমোদন করলে আপনি ড্যাশবোর্ডে প্রবেশ করতে পারবেন।
          </p>
          <button
            onClick={() => navigate("/org-management")}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all duration-300 w-full py-3 rounded-xl font-bold"
          >
            অন্য প্রতিষ্ঠানে যান
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (location.pathname === "/attendance/history") {
      navigate("/attendance");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg-main)] overflow-hidden">
      {(orgId || isSuperAdmin) && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
      {(orgId || isSuperAdmin) && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {(orgId || isSuperAdmin) && <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--color-bg-main)] p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
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
