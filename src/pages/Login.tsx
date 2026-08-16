import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { AlertCircle, Loader2, Copy, Check, Phone, Search, LogIn, ShieldCheck, Activity, Users, Star } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.svg';
import PublicResultSearch from '../components/PublicResultSearch';
import WhatsAppSupportButton from '../components/WhatsAppSupportButton';
import { toEnglishNumber } from '../utils/dateFormatter';
import { SUPER_ADMIN_EMAILS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

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
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('unauthorized-domain');
      } else if (error.message && (error.message.includes('Cross-Origin-Opener-Policy') || error.message.includes('COOP'))) {
        setError('coop-error');
      } else if (error.code === 'auth/network-request-failed') {
        setError('network-error');
      } else {
        setError(error.message || "লগইন শুরু করতে সমস্যা হয়েছে।");
      }
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_system');
    window.location.href = window.location.href;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyDomain = () => {
    navigator.clipboard.writeText(window.location.hostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden relative selection:bg-[#0F5C7A]/20">
      
      {/* Decorative Blur Backgrounds for Mobile */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#0F5C7A]/20 blur-[120px] rounded-full pointer-events-none md:hidden" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#14B8A6]/20 blur-[120px] rounded-full pointer-events-none md:hidden" />

      {/* LEFT PANEL - VISUAL (Hidden on very small screens) */}
      <div className="hidden md:flex md:w-[45%] lg:w-[50%] bg-gradient-to-br from-[#0F5C7A] via-[#0C6C8A] to-[#14B8A6] relative flex-col justify-between p-12 lg:p-20 text-white overflow-hidden shadow-2xl z-10">
        
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-[-10%] right-[-20%] w-[70%] h-[70%] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-[#14B8A6]/20 blur-3xl" />

        {/* Floating Elements (Visible on larger screens) */}
        <motion.div 
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="hidden xl:flex absolute top-[25%] right-[10%] bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl items-center gap-3 z-0"
        >
          <div className="bg-teal-400/20 p-2.5 rounded-full">
            <Users className="w-6 h-6 text-teal-200" />
          </div>
          <div>
            <div className="text-[17px] font-bold text-white tracking-wide">আপনিও যুক্ত হোন</div>
          </div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="hidden xl:flex absolute bottom-[30%] right-[15%] bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl items-center gap-3 z-0"
        >
          <div className="bg-amber-400/20 p-2.5 rounded-full">
            <Star className="w-6 h-6 text-amber-200 fill-amber-200" />
          </div>
          <div>
            <div className="text-2xl font-black">১০০%</div>
            <div className="text-sm text-teal-100 font-medium">নির্ভরযোগ্য</div>
          </div>
        </motion.div>

        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 flex items-center gap-4"
        >
          <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-teal-500/20">
            <img src={logo} alt="হাজিরা খাতা" className="w-9 h-9 object-contain" />
          </div>
          <span className="font-extrabold text-3xl tracking-tight">হাজিরা খাতা</span>
        </motion.div>

        {/* Glow behind text */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-teal-400/20 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Main Typography */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-10 my-auto"
        >
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6 drop-shadow-xl">
            আধুনিক শিক্ষা<br />
            ব্যবস্থাপনার<br />
            <span className="text-teal-200">স্মার্ট সমাধান</span>
          </h1>
          <p className="text-lg lg:text-xl text-teal-50/80 leading-relaxed max-w-md font-medium">
            উপস্থিতি, শিক্ষার্থী পরিচালনা এবং ফলাফল প্রস্তুতির একটি সম্পূর্ণ স্বয়ংক্রিয় ডিজিটাল প্ল্যাটফর্ম।
          </p>
          
          <div className="mt-12 space-y-4">
            <motion.div whileHover={{ scale: 1.02, x: 5 }} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-lg w-fit group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400/20 to-teal-500/10 flex items-center justify-center border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-teal-200" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">নিরাপদ ক্লাউড স্টোরেজ</h3>
                <p className="text-[13px] text-teal-50/70 mt-0.5">আপনার সকল তথ্য ১০০% সুরক্ষিত</p>
              </div>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.02, x: 5 }} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-lg w-fit group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400/20 to-teal-500/10 flex items-center justify-center border border-white/10 shrink-0 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 text-teal-200" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">রিয়েল-টাইম আপডেট</h3>
                <p className="text-[13px] text-teal-50/70 mt-0.5">উপস্থিতি ও ফলাফলের তাৎক্ষণিক নোটিফিকেশন</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="relative z-10 text-sm text-teal-100/60 font-medium"
        >
          &copy; {new Date().getFullYear()} হাজিরা খাতা অ্যাপ। সর্বস্বত্ব সংরক্ষিত।
        </motion.div>
      </div>

      {/* RIGHT PANEL - LOGIN AREA */}
      <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative z-20 min-h-[100dvh] overflow-y-auto">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden w-full flex items-center justify-center mb-8 mt-4 px-2"
        >
          <div className="flex items-center gap-3">
            <div className="bg-[#0F5C7A] p-2.5 rounded-xl shadow-md">
              <img src={logo} alt="হাজিরা খাতা" className="w-7 h-7 object-contain brightness-0 invert" />
            </div>
            <span className="font-extrabold text-2xl text-[#0F5C7A] tracking-tight">হাজিরা খাতা</span>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="w-full max-w-[480px] bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden relative my-auto"
        >
          {/* Tab Navigation */}
          <div className="flex p-1.5 mx-8 mt-8 bg-slate-100/80 backdrop-blur-sm rounded-2xl relative">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 relative z-10 ${
                activeTab === 'login' ? 'text-[#0F5C7A] shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <LogIn className="w-[18px] h-[18px]" />
              লগইন
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 relative z-10 ${
                activeTab === 'public' ? 'text-[#14B8A6] shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Search className="w-[18px] h-[18px]" />
              ফলাফল অনুসন্ধান
            </button>
          </div>

          <div className="p-6 sm:p-10 min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === 'public' ? (
                <motion.div 
                  key="public"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PublicResultSearch />
                </motion.div>
              ) : (
                <motion.div 
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-10">
                    <h2 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#0F5C7A] to-[#14B8A6] mb-3 tracking-tight drop-shadow-sm">স্বাগতম!</h2>
                    <p className="text-slate-500 text-sm sm:text-[15px] font-medium">অ্যাডমিন প্যানেলে নিরাপদ সাইন ইন করুন</p>
                  </div>

                  {/* Error & Warning Messages */}
                  {embeddedBrowser && (
                    <div className="bg-amber-50/80 border border-amber-200/50 rounded-2xl p-4 text-left shadow-sm">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-amber-800 text-sm">ব্রাউজার ইস্যু</h3>
                          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                            মেসেঞ্জার বা ইন-অ্যাপ ব্রাউজারে লগইন কাজ নাও করতে পারে।
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button onClick={openInNewTab} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-semibold text-xs shadow-sm shadow-amber-600/20">ব্রাউজারে খুলুন</button>
                            <button onClick={copyLink} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg font-semibold text-xs">{copied ? 'কপি হয়েছে' : 'লিঙ্ক কপি'}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error === 'unauthorized-domain' && (
                    <div className="bg-rose-50/80 border border-rose-200/50 rounded-2xl p-4 text-left shadow-sm">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-rose-800 text-sm">ডোমেইন অনুমোদিত নয়</h3>
                          <p className="text-xs text-rose-700 mt-1">ফায়ারবেস সেটিংসে এই ডোমেইনটি যোগ করুন।</p>
                          <div className="flex items-center gap-2 mt-3 bg-white border border-rose-100 rounded-lg px-3 py-2">
                            <code className="text-[11px] font-mono text-slate-600 flex-1 truncate">{window.location.hostname}</code>
                            <button onClick={copyDomain} className="text-slate-400 hover:text-slate-700">
                              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && !['unauthorized-domain'].includes(error) && (
                    <div className="bg-rose-50/80 border border-rose-200/50 rounded-2xl p-4 text-left shadow-sm flex gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-rose-800 font-medium">
                          {error === 'network-error' ? 'নেটওয়ার্ক ত্রুটি। ইন্টারনেট সংযোগ চেক করুন।' :
                           error === 'coop-error' ? 'ব্রাউজার সিকিউরিটি ইস্যু। নতুন ট্যাবে চেষ্টা করুন।' : 
                           error}
                        </p>
                        {error === 'coop-error' || error.includes('পপ-আপ') ? (
                          <button onClick={openInNewTab} className="mt-2 text-xs font-bold text-rose-600 underline underline-offset-2">নতুন ট্যাবে ওপেন করুন</button>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {!isNewUser ? (
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                          <Phone className="h-[20px] w-[20px] text-slate-400 group-focus-within:text-[#14B8A6] transition-colors duration-300" />
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
                          placeholder="ফোন নম্বর (নতুন হলে দিন)"
                          className="w-full pl-14 pr-4 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:ring-4 focus:ring-[#14B8A6]/10 focus:border-[#14B8A6] transition-all duration-300 font-semibold text-[16px] outline-none shadow-sm placeholder:text-slate-400 hover:border-slate-200"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                          <p className="text-xs text-emerald-800 font-medium leading-relaxed">অ্যাকাউন্ট ভেরিফিকেশনের জন্য আপনার ফোন নম্বরটি প্রয়োজন।</p>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Phone className="h-[20px] w-[20px] text-slate-400 group-focus-within:text-[#14B8A6] transition-colors duration-300" />
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
                            placeholder="ফোন নম্বর (বাধ্যতামূলক)"
                            className="w-full pl-14 pr-4 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl focus:ring-4 focus:ring-[#14B8A6]/10 focus:border-[#14B8A6] transition-all duration-300 font-semibold text-[16px] outline-none shadow-sm placeholder:text-slate-400 hover:border-slate-200"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={() => { auth?.signOut(); setIsNewUser(false); }}
                          className="w-full text-center text-[13px] font-bold text-slate-400 hover:text-slate-600 mt-2"
                        >
                          বাতিল করুন
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => isNewUser ? handleFinalizeSignup() : handleGoogleLogin()}
                      disabled={loading || !auth}
                      className="w-full group relative flex items-center justify-center gap-3 bg-gradient-to-r from-[#0F5C7A] to-[#14B8A6] text-white px-4 py-4 rounded-2xl font-bold text-[16px] transition-all duration-300 shadow-[0_8px_20px_rgba(20,184,166,0.25)] hover:shadow-[0_12px_28px_rgba(20,184,166,0.35)] hover:-translate-y-[2px] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-6"
                    >
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                      
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <div className="bg-white p-1 rounded-full flex items-center justify-center shadow-sm">
                          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-[18px] h-[18px]" />
                        </div>
                      )}
                      <span className="tracking-wide">
                        {loading ? 'অপেক্ষা করুন...' : isNewUser ? 'রেজিস্ট্রেশন সম্পন্ন করুন' : 'গুগল দিয়ে চালিয়ে যান'}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="mt-8 relative z-20 md:hidden pb-6 text-center">
          <p className="text-[13px] text-slate-400">
            &copy; {new Date().getFullYear()} হাজিরা খাতা অ্যাপ। সর্বস্বত্ব সংরক্ষিত।
          </p>
        </div>
        
        {/* Helper Box for desktop if they want support */}
        <div className="absolute bottom-6 right-6 hidden lg:block z-20">
          <WhatsAppSupportButton variant="floating" />
        </div>
      </div>
      
      {/* Floating WhatsApp Button for Mobile/Tablet */}
      <div className="lg:hidden">
        <WhatsAppSupportButton variant="floating" />
      </div>
    </div>
  );
};

export default Login;
