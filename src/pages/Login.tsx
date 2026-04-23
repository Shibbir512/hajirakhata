import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { AlertCircle, Loader2, Copy, Check, Phone, Search, LogIn, GraduationCap, Users, UserCheck, BookOpen, BarChart3 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.svg';
import PublicResultSearch from '../components/PublicResultSearch';
import { toEnglishNumber } from '../utils/dateFormatter';
import { SUPER_ADMIN_EMAILS } from '../constants';

const Login: React.FC = () => {
  const { user, phone, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'login'>('login');

  const isEmbeddedBrowser = () => {
    // Basic UserAgent checks for Messenger, Facebook
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Instagram") > -1) || (ua.indexOf("Messenger") > -1);
  };

  const [embeddedBrowser, setEmbeddedBrowser] = useState(isEmbeddedBrowser());

  useEffect(() => {
    let isMounted = true;
    const processUser = async () => {
      if (user && !authLoading) {
        const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
        const storedPhone = localStorage.getItem('tempPhone');
        
        if (storedPhone && !phone) {
          try {
            if (isMounted) setLoading(true);
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { phone: storedPhone });
            localStorage.removeItem('tempPhone');
          } catch(e) {
            console.error("Error setting stored phone:", e);
          } finally {
            if (isMounted) setLoading(false);
          }
        } else if (!isSuperAdmin && !phone && !storedPhone) {
          if (isMounted) {
            setIsNewUser(true);
            setLoading(false);
          }
        } else {
          // Clear the loading spinner if they are an existing user
          if (isMounted) setLoading(false);
        }
      }
    };
    processUser();
    return () => { isMounted = false; };
  }, [user, phone, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-[#0F766E] animate-spin mb-4" />
        <p className="text-slate-600 font-medium animate-pulse">লগইন চেক করা হচ্ছে...</p>
      </div>
    );
  }

  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
  const needsPhone = !isSuperAdmin && !phone;

  if (user && !loading && !needsPhone && !isNewUser) {
    return <Navigate to="/" replace />;
  }

  // Prevent UI flash while waiting for the newly added phone number to sync from Firestore
  if (user && !loading && needsPhone && !isNewUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-[#0F766E] animate-spin mb-4" />
        <p className="text-slate-600 font-medium animate-pulse">ডাটাবেস সিঙ্ক হচ্ছে...</p>
      </div>
    );
  }

  const handleFinalizeSignup = async () => {
    if (!auth.currentUser || !db || !phoneNumber.trim()) {
      setError("অনুগ্রহ করে আপনার ফোন নম্বরটি প্রদান করুন।");
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const isNew = !userDoc.exists();
      
      const userData: any = {
        displayName: user.displayName || "ব্যবহারকারী",
        email: user.email || "ইমেইল নেই",
        photoURL: user.photoURL || "",
        phone: phoneNumber.trim(),
        lastLogin: serverTimestamp()
      };
      
      if (isNew) {
        const configSnap = await getDoc(doc(db, "globalSettings", "config"));
        const approvalEnabled = configSnap.exists() ? (configSnap.data().isApprovalEnabled ?? true) : true;
        userData.status = approvalEnabled ? "pending" : "active";
        await setDoc(userRef, userData, { merge: true });
      } else {
        await setDoc(userRef, userData, { merge: true });
      }
      setIsNewUser(false);
    } catch (error: any) {
      console.error("Signup failed", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
      setError("ফায়ারবেস কনফিগারেশন পাওয়া যায়নি।");
      return;
    }
    setError(null);
    setLoading(true);
    
    if (phoneNumber.trim()) {
      localStorage.setItem('tempPhone', phoneNumber.trim());
    }
    
    try {
      await signInWithPopup(auth, googleProvider);
      setLoading(false);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        setError("পপ-আপ ব্লক করা হয়েছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপ-আপ এলাউ করুন।");
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        setError("পপ-আপ বন্ধ করে দেওয়া হয়েছে। পুনরায় চেষ্টা করুন।");
      } else {
        setError(error.message || "লগইন শুরু করতে সমস্যা হয়েছে।");
      }
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    // Try to open in new tab
    window.open(window.location.href, '_system');
    // Fallback: try to navigate current window
    window.location.href = window.location.href;
  };

  return (
    <div className="min-h-screen bg-[#0E3531] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs/Patterns */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#124B45] rounded-full blur-[120px] opacity-60"></div>
        <div className="absolute top-[60%] -right-[10%] w-[30%] h-[50%] bg-[#0A4B42] rounded-full blur-[100px] opacity-80"></div>
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[30%] bg-[#1A6059] rounded-full blur-[80px] opacity-40"></div>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-2xl flex flex-col lg:flex-row shadow-2xl relative z-10 overflow-hidden transform animate-in zoom-in-95 duration-500">
        
        {/* LEFT PANEL - Desktop Only */}
        <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 bg-gradient-to-br from-[#126b60] to-[#0b423b] overflow-hidden">
          {/* Decorative Glassmorphism Circles & Hexagons */}
          <div className="absolute top-10 right-20 w-16 h-16 bg-white/10 rounded-full border border-white/20 backdrop-blur-md animate-[float_8s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-32 right-10 w-10 h-10 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm animate-[float_6s_ease-in-out_infinite_reverse]"></div>
          <div className="absolute top-40 left-10 w-6 h-6 bg-white/20 rounded-full animate-pulse"></div>
          
          <div className="absolute top-[25%] left-[60%] w-24 h-24 bg-gradient-to-tr from-white/5 to-white/20 rounded-t-full rounded-l-full border border-white/10 backdrop-blur-md rotate-45"></div>

          <div className="relative z-10 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-white" />
            <span className="text-white font-bold text-xl tracking-wide">হাজিরা খাতা</span>
          </div>

          {/* Central Illustration Area */}
          <div className="relative z-10 flex-1 flex justify-center items-center my-8">
            <div className="relative w-56 h-56 flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm animate-[float_5s_ease-in-out_infinite]"></div>
              {/* Outer faint circle */}
              <div className="absolute -inset-4 border border-white/5 rounded-full"></div>
              {/* Stars/Dots */}
              <div className="absolute top-0 right-8 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
              <div className="absolute bottom-10 left-4 w-1.5 h-1.5 bg-teal-200 rounded-full shadow-[0_0_8px_#99f6e4]"></div>
              
              <div className="relative flex flex-col items-center">
                <GraduationCap className="w-24 h-24 text-white -mb-8 relative z-20 drop-shadow-xl" />
                <BookOpen className="w-28 h-28 text-white/90 drop-shadow-lg" />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-auto">
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">স্বাগতম</h1>
            <p className="text-teal-100/90 text-lg font-light mb-10">আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা সহজ করুন</p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 bg-[#0A3D36]/60 backdrop-blur-md border border-[#148375]/50 rounded-xl px-4 py-2.5">
                <Users className="w-5 h-5 text-teal-300" />
                <span className="text-white text-sm font-medium leading-tight">ছাত্র-ছাত্রী<br/>ব্যবস্থাপনা</span>
              </div>
              <div className="flex items-center gap-3 bg-[#0A3D36]/60 backdrop-blur-md border border-[#148375]/50 rounded-xl px-4 py-2.5">
                <UserCheck className="w-5 h-5 text-teal-300" />
                <span className="text-white text-sm font-medium leading-tight">উপস্থিতি<br/>ট্র্যাকিং</span>
              </div>
              <div className="flex items-center gap-3 bg-[#0A3D36]/60 backdrop-blur-md border border-[#148375]/50 rounded-xl px-4 py-2.5">
                <BarChart3 className="w-5 h-5 text-teal-300" />
                <span className="text-white text-sm font-medium leading-tight">ফলাফল<br/>প্রকাশ</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Login Form */}
        <div className="w-full lg:w-[45%] bg-white p-8 sm:p-12 flex flex-col relative z-20 items-center justify-center">
          
          {activeTab === 'public' ? (
            <div className="w-full animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#113a36]">ফলাফল অনুসন্ধান</h2>
                <button onClick={() => setActiveTab('login')} className="text-sm text-teal-600 hover:underline">
                  লগইন এ ফিরে যান
                </button>
              </div>
              <PublicResultSearch />
            </div>
          ) : (
            <div className="w-full max-w-sm mx-auto flex flex-col h-full">
              <div className="flex-1 flex flex-col justify-center">
                
                {/* Logo Badge */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-[#E8F3F0] rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                    <div className="w-14 h-14 bg-[#148375] rounded-full flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold text-center text-[#113A36] mb-2 tracking-tight">অ্যাডমিন প্যানেল</h2>
                <p className="text-center text-slate-500 text-sm mb-10">আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা সহজ করুন।</p>

                {embeddedBrowser && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-left">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-800">
                          মেসেঞ্জার বা অন্য অ্যাপের ভেতর গুগল লগইন কাজ নাও করতে পারে।
                        </p>
                        <button onClick={openInNewTab} className="mt-2 text-xs text-amber-700 font-bold hover:underline">
                          ব্রাউজারে ওপেন করুন
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-left flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 font-medium">
                      {error === 'unauthorized-domain' ? 'এই ডোমেইনটি ফায়ারবেস অনুমোদিত নয়।' : error === 'network-error' ? 'নেটওয়ার্ক ত্রুটি। ইন্টারনেট চেক করুন।' : error}
                    </p>
                  </div>
                )}

                {/* Optional Phone Input (Only if new user or existing logic requires) */}
                <div className="mb-4 relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600/60 w-5 h-5 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
                    placeholder={isNewUser ? "ফোন নম্বর (বাধ্যতামূলক)" : "ফোন নম্বর (লগইনে ঐচ্ছিক)"}
                    className="w-full pl-12 pr-4 py-3.5 bg-[#F4FAF9] border border-teal-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-[#113A36] placeholder:text-teal-900/30"
                  />
                </div>

                <button
                  onClick={isNewUser ? handleFinalizeSignup : handleGoogleLogin}
                  disabled={loading || !auth}
                  className="w-full py-3.5 bg-gradient-to-r from-[#148375] to-[#0E6C5F] hover:from-[#117669] hover:to-[#0B5C51] text-white rounded-xl flex items-center justify-center gap-3 font-semibold shadow-lg shadow-teal-900/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white/80" />
                  ) : (
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 brightness-0 invert" />
                  )}
                  <span>{loading ? 'অপেক্ষা করুন...' : isNewUser ? 'রেজিস্ট্রেশন সম্পন্ন করুন' : 'গুগল দিয়ে চালিয়ে যান'}</span>
                </button>

                <div className="relative py-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center px-4">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <span className="relative bg-white px-4 text-xs text-slate-400 font-medium">অথবা</span>
                </div>

                <button
                  onClick={() => setActiveTab('public')}
                  className="w-full py-3.5 bg-white border border-slate-200 text-[#113A36] rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-slate-400" />
                  ফলাফল অনুসন্ধান করুন
                </button>

                {isNewUser && (
                  <button
                    onClick={() => {
                      auth?.signOut();
                      setIsNewUser(false);
                    }}
                    className="mt-6 text-slate-400 hover:text-slate-600 text-xs font-medium"
                  >
                    শুরুতে ফিরে যান
                  </button>
                )}
              </div>

              <div className="mt-8 text-center border-t border-slate-50 pt-4">
                <p className="text-[11px] text-slate-400 font-medium">
                  Copyright &copy; {new Date().getFullYear()} Hajira Khata. All rights reserved.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
