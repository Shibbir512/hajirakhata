import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { AlertCircle, Loader2, Copy, Check, Phone, Search, LogIn, Users, Star, GraduationCap, BookOpen, PieChart, CheckCircle2 } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-[#0B3A4C] via-[#0F5C7A] to-[#062430] flex flex-col md:flex-row overflow-hidden relative selection:bg-white/20">
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#14B8A6]/20 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#14B8A6]/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* LEFT PANEL - VISUAL */}
      <div className="hidden md:flex flex-col w-[50%] lg:w-[55%] relative z-10 p-12 lg:p-16 xl:p-20 justify-between">
        
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3"
        >
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-2xl text-white tracking-tight">হাজিরা খাতা</span>
        </motion.div>

        {/* Central Graphic */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative w-full max-w-[400px] mx-auto flex items-center justify-center my-12"
        >
          {/* Glowing Background Circle */}
          <div className="absolute w-[280px] h-[280px] bg-gradient-to-tr from-teal-400/20 to-teal-200/10 rounded-full blur-2xl" />
          <div className="absolute w-[240px] h-[240px] border border-white/20 rounded-full" />
          <div className="absolute w-[280px] h-[280px] border border-white/10 rounded-full border-dashed" />
          
          {/* Floating Bubbles */}
          <motion.div 
            animate={{ y: [-15, 15, -15], x: [-5, 5, -5], rotate: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] right-[15%] w-12 h-12 border-2 border-white/30 rounded-full backdrop-blur-sm"
          />
          <motion.div 
            animate={{ y: [15, -15, 15], x: [5, -5, 5], rotate: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[20%] left-[10%] w-16 h-16 border-2 border-white/20 rounded-full backdrop-blur-sm"
          />
          <motion.div 
            animate={{ y: [-10, 10, -10], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-[40%] left-[5%] w-6 h-6 bg-white/20 rounded-full"
          />
          <motion.div 
            animate={{ y: [10, -10, 10], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute bottom-[10%] right-[20%] w-8 h-8 bg-teal-400/30 rounded-full"
          />

          {/* Main Icons Overlay */}
          <div className="relative z-10 flex flex-col items-center">
            <GraduationCap className="w-32 h-32 text-white drop-shadow-2xl absolute -top-12 z-20" strokeWidth={1.5} />
            <BookOpen className="w-40 h-40 text-teal-100/90 drop-shadow-2xl mt-8" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Bottom Text & Badges */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full"
        >
          <h1 className="text-5xl lg:text-6xl font-extrabold text-white mb-2 drop-shadow-lg tracking-tight">স্বাগতম</h1>
          <p className="text-lg text-teal-100/80 font-medium mb-10">আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা সহজ করুন</p>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg">
              <div className="bg-teal-400/20 p-1.5 rounded-full"><Users className="w-4 h-4 text-teal-200" /></div>
              <span className="text-white text-sm font-semibold">ছাত্র-ছাত্রী ব্যবস্থাপনা</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg">
              <div className="bg-teal-400/20 p-1.5 rounded-full"><CheckCircle2 className="w-4 h-4 text-teal-200" /></div>
              <span className="text-white text-sm font-semibold">উপস্থিতি ট্র্যাকিং</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg">
              <div className="bg-teal-400/20 p-1.5 rounded-full"><PieChart className="w-4 h-4 text-teal-200" /></div>
              <span className="text-white text-sm font-semibold">ফলাফল প্রকাশ</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL - LOGIN AREA */}
      <div className="w-full md:w-[50%] lg:w-[45%] flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative z-20 min-h-[100dvh] md:min-h-screen overflow-y-auto overflow-x-hidden pb-20 md:pb-12">
        
        {/* Mobile Top Visuals */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden w-full flex flex-col items-center justify-center mb-6 mt-2 relative z-10"
        >
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">হাজিরা খাতা</span>
          </div>

          {/* Mobile Illustration */}
          <div className="relative flex items-center justify-center scale-90 mb-4">
            <div className="absolute w-[180px] h-[180px] bg-gradient-to-tr from-teal-400/20 to-teal-200/10 rounded-full blur-xl" />
            <motion.div 
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 right-0 w-8 h-8 border-2 border-white/20 rounded-full"
            />
            <motion.div 
              animate={{ y: [5, -5, 5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-4 left-0 w-6 h-6 bg-white/20 rounded-full"
            />
            <div className="relative z-10 flex flex-col items-center">
              <GraduationCap className="w-24 h-24 text-white drop-shadow-xl absolute -top-8 z-20" strokeWidth={1.5} />
              <BookOpen className="w-28 h-28 text-teal-100/90 drop-shadow-xl mt-6" strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">স্বাগতম</h1>
          <p className="text-[13px] text-teal-100/80 font-medium mt-1">আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা সহজ করুন</p>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="w-full max-w-[480px] bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden relative my-auto flex flex-col z-20"
        >
          {/* Decorative Top Accent for Mobile */}
          <div className="h-2 w-full bg-gradient-to-r from-[#0F5C7A] to-[#14B8A6] md:hidden" />
          
          {/* Tab Navigation */}
          <div className="flex p-2 mx-6 sm:mx-8 mt-8 bg-slate-50 border border-slate-100 rounded-2xl relative">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 relative z-10 ${
                activeTab === 'login' ? 'text-[#0F5C7A] shadow-md bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <LogIn className="w-[18px] h-[18px]" />
              লগইন
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 py-3 text-[14px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 relative z-10 ${
                activeTab === 'public' ? 'text-[#0F5C7A] shadow-md bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Search className="w-[18px] h-[18px]" />
              ফলাফল অনুসন্ধান
            </button>
          </div>

          <div className="p-6 sm:p-10 flex-1 flex flex-col">
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
                  className="space-y-6 flex-1 flex flex-col justify-center"
                >
                  <div className="text-center mb-6">
                    {/* Circle Icon Badge */}
                    <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                      <div className="absolute inset-0 bg-[#0F5C7A] rounded-full scale-[0.8]" />
                      <BookOpen className="w-8 h-8 text-white relative z-10 top-2" strokeWidth={1.5} />
                      <GraduationCap className="w-10 h-10 text-white absolute top-4 z-20" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">অ্যাডমিন প্যানেল</h2>
                    <p className="text-slate-500 text-sm font-medium">আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা সহজতর করুন</p>
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
                      className="w-full group relative flex items-center justify-center gap-3 bg-gradient-to-r from-[#0F5C7A] to-[#138883] text-white px-4 py-3.5 rounded-xl font-bold text-[15px] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-6"
                    >
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                      
                      {loading ? (
                         <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                         <div className="bg-white p-1 rounded-full flex items-center justify-center shadow-sm">
                           <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                         </div>
                      )}
                      <span className="tracking-wide">
                        {loading ? 'অপেক্ষা করুন...' : isNewUser ? 'রেজিস্ট্রেশন সম্পন্ন করুন' : 'গুগল দিয়ে চালিয়ে যান'}
                      </span>
                    </button>
                    
                    {/* Secondary button just like in the mockup image for visual matching */}
                    {!isNewUser && (
                      <button
                        onClick={() => setActiveTab('public')}
                        className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-3.5 rounded-xl font-bold text-[15px] hover:bg-slate-50 transition-colors duration-300 mt-3"
                      >
                        ফলাফল অনুসন্ধান করুন
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <p className="text-[12px] text-slate-400 font-medium">
                Copyright &copy; Hajira Khata. All rights reserved.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Mobile footer is removed as it's inside the card now */}
        
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
