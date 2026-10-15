import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithCredential, 
  GoogleAuthProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { 
  AlertCircle, Loader2, Copy, Check, Phone, Search, LogIn, Users, 
  GraduationCap, BookOpen, PieChart, CheckCircle2, Mail, Lock, Eye, 
  EyeOff, User, KeyRound, UserPlus, X 
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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

  // Phone state for new users
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'login'>('login');

  // Email/Password state
  const [emailAuthMode, setEmailAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const isEmbeddedBrowser = () => {
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
            if (isMounted) setIsNewUser(false);
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
          // User already has phone or is super admin — reset isNewUser
          if (isMounted) {
            setIsNewUser(false);
            setLoading(false);
          }
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

  if (user && !loading && needsPhone && !isNewUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-[#0F766E] animate-spin mb-4" />
        <p className="text-slate-600 font-medium animate-pulse">ডাটাবেস সিঙ্ক হচ্ছে...</p>
      </div>
    );
  }

  const handleFinalizeSignup = async () => {
    if (!auth?.currentUser || !db || !phoneNumber.trim()) {
      setError("অনুগ্রহ করে আপনার ফোন নম্বরটি প্রদান করুন।");
      return;
    }
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const isNew = !userDoc.exists();
      
      const userData: any = {
        displayName: currentUser.displayName || "ব্যবহারকারী",
        email: currentUser.email || "ইমেইল নেই",
        photoURL: currentUser.photoURL || "",
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
    } catch (err: any) {
      console.error("Signup failed", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
      setError("ফায়ারবেস কনফিগারেশন পাওয়া যায়নি।");
      return;
    }
    setError(null);
    setLoading(true);
    
    if (phoneNumber.trim()) {
      localStorage.setItem('tempPhone', phoneNumber.trim());
    }

    // Safety timeout: 20 seconds so the spinner NEVER spins indefinitely
    let isTimedOut = false;
    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      setLoading(false);
      setError("গুগল সাইন-ইন সাড়া দেয়নি। আপনি নিচের ইমেইল ও পাসওয়ার্ড দিয়ে সহজে লগইন করতে পারেন।");
    }, 20000);
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Native Android Google Sign-In using @capacitor-firebase/authentication
        const result = await FirebaseAuthentication.signInWithGoogle();
        clearTimeout(timeoutTimer);
        if (isTimedOut) return;

        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          await signInWithCredential(auth, credential);
        }
      } else {
        // Web Browser Sign-In
        if (!googleProvider) throw new Error("Google Provider পাওয়া যায়নি।");
        await signInWithPopup(auth, googleProvider);
        clearTimeout(timeoutTimer);
      }
      setLoading(false);
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      if (isTimedOut) return;
      console.error("Login failed", err);
      setLoading(false);

      const msg = err.message || '';
      const code = err.code || '';

      if (code === 'auth/popup-blocked') {
        setError("পপ-আপ ব্লক করা হয়েছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপ-আপ এলাউ করুন।");
      } else if (code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user' || msg.includes('cancel') || msg.includes('12501')) {
        setError("গুগল সাইন-ইন বাতিল করা হয়েছে। আবার চেষ্টা করুন।");
      } else if (code === 'auth/unauthorized-domain') {
        setError('unauthorized-domain');
      } else if (msg.includes('10') || msg.includes('12500') || msg.includes('developer_error')) {
        setError("অ্যান্ড্রয়েড গুগল সার্ভিস কনফিগারেশন পেন্ডিং। অনুগ্রহ করে নিচে ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।");
      } else if (msg && (msg.includes('Cross-Origin-Opener-Policy') || msg.includes('COOP'))) {
        setError('coop-error');
      } else if (code === 'auth/network-request-failed') {
        setError('network-error');
      } else {
        setError(msg || "লগইন শুরু করতে সমস্যা হয়েছে। নিচে ইমেইল ও পাসওয়ার্ড দিয়ে চেষ্টা করুন।");
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (!email.trim() || !password) {
      setError("ইমেইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("সফলভাবে লগইন হয়েছে!");
    } catch (err: any) {
      console.error("Email login failed", err);
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError("ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে পুনরায় চেক করুন।");
      } else if (code === 'auth/invalid-email') {
        setError("সঠিক ইমেইল এড্রেস প্রদান করুন।");
      } else if (code === 'auth/too-many-requests') {
        setError("অতিরিক্ত ভুল চেষ্টার কারণে অ্যাকাউন্ট সাময়িকভাবে লক হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।");
      } else {
        setError(err.message || "লগইন করতে ব্যর্থ হয়েছে।");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    if (!fullName.trim()) {
      setError("অনুগ্রহ করে আপনার নাম প্রদান করুন।");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("মোবাইল নম্বর প্রদান করুন।");
      return;
    }
    if (!email.trim() || !password) {
      setError("ইমেইল এবং পাসওয়ার্ড প্রদান করুন।");
      return;
    }
    if (password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }
    if (password !== confirmPassword) {
      setError("পাসওয়ার্ড দুটি মিলছে না। পুনরায় চেক করুন।");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(res.user, { displayName: fullName.trim() });

      const configSnap = await getDoc(doc(db, "globalSettings", "config"));
      const approvalEnabled = configSnap.exists() ? (configSnap.data().isApprovalEnabled ?? true) : true;

      const userRef = doc(db, "users", res.user.uid);
      await setDoc(userRef, {
        displayName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneNumber.trim(),
        photoURL: "",
        status: approvalEnabled ? "pending" : "active",
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });

      toast.success("অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!");
    } catch (err: any) {
      console.error("Email signup failed", err);
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setError("এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে। লগইন করুন।");
      } else if (code === 'auth/invalid-email') {
        setError("সঠিক ইমেইল এড্রেস প্রদান করুন।");
      } else if (code === 'auth/weak-password') {
        setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      } else {
        setError(err.message || "অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে।");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    if (!resetEmail.trim()) {
      toast.error("অনুগ্রহ করে আপনার ইমেইল প্রদান করুন।");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      toast.success("পাসওয়ার্ড রিসেটের লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে! ইনবক্স চেক করুন।");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err: any) {
      console.error("Reset password failed", err);
      if (err.code === 'auth/user-not-found') {
        toast.error("এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।");
      } else if (err.code === 'auth/invalid-email') {
        toast.error("সঠিক ইমেইল ঠিকানা প্রদান করুন।");
      } else {
        toast.error(err.message || "রিসেট লিঙ্ক পাঠাতে ব্যর্থ হয়েছে।");
      }
    } finally {
      setResetLoading(false);
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

      {/* LEFT PANEL - VISUAL (Desktop) */}
      <div className="hidden md:flex flex-col w-[50%] lg:w-[52%] relative z-10 p-12 lg:p-16 justify-between">
        
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3"
        >
          <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20">
            <img src="/icon.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-extrabold text-2xl text-white tracking-tight">হাজিরা খাতা</span>
        </motion.div>

        {/* Central Graphic */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative w-full max-w-[380px] mx-auto flex items-center justify-center my-8"
        >
          <div className="absolute w-[260px] h-[260px] bg-gradient-to-tr from-teal-400/20 to-teal-200/10 rounded-full blur-2xl" />
          <div className="absolute w-[220px] h-[220px] border border-white/20 rounded-full" />
          <div className="absolute w-[260px] h-[260px] border border-white/10 rounded-full border-dashed" />
          
          <motion.div 
            animate={{ y: [-15, 15, -15], rotate: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] right-[15%] w-12 h-12 border-2 border-white/30 rounded-full backdrop-blur-sm"
          />
          <motion.div 
            animate={{ y: [15, -15, 15], rotate: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[20%] left-[10%] w-14 h-14 border-2 border-white/20 rounded-full backdrop-blur-sm"
          />

          <div className="relative z-10 flex flex-col items-center">
            <GraduationCap className="w-36 h-36 text-white drop-shadow-2xl absolute -top-14 z-20" strokeWidth={1.5} />
            <BookOpen className="w-48 h-48 text-teal-100/90 drop-shadow-2xl mt-6" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Bottom Text & Badges */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full"
        >
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-2 drop-shadow-lg tracking-tight">স্বাগতম</h1>
          <p className="text-base text-teal-100/80 font-medium mb-6">আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা সহজ ও ডিজিটাল করুন</p>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg">
              <div className="bg-teal-400/20 p-1.5 rounded-full"><Users className="w-4 h-4 text-teal-200" /></div>
              <span className="text-white text-xs font-semibold">ছাত্র-ছাত্রী ব্যবস্থাপনা</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg">
              <div className="bg-teal-400/20 p-1.5 rounded-full"><CheckCircle2 className="w-4 h-4 text-teal-200" /></div>
              <span className="text-white text-xs font-semibold">উপস্থিতি ট্র্যাকিং</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg">
              <div className="bg-teal-400/20 p-1.5 rounded-full"><PieChart className="w-4 h-4 text-teal-200" /></div>
              <span className="text-white text-xs font-semibold">ফলাফল প্রকাশ</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL - AUTH AREA */}
      <div className="w-full md:w-[50%] lg:w-[48%] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative z-20 min-h-[100dvh] overflow-y-auto pb-16 md:pb-8">
        
        {/* Mobile Top Visuals */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden w-full flex flex-col items-center justify-center mb-4 mt-2 relative z-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
              <img src="/icon.png" alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">হাজিরা খাতা</span>
          </div>
          <p className="text-xs text-teal-100/80 font-medium">শিক্ষা প্রতিষ্ঠান পরিচালনা সহজ করুন</p>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[460px] bg-white rounded-[28px] shadow-2xl border border-white/20 overflow-hidden relative my-auto flex flex-col z-20"
        >
          {/* Top Decorative Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#0F5C7A] via-[#14B8A6] to-[#0F766E]" />
          
          {/* Tab Navigation (Main: Login vs Result Search) */}
          <div className="flex p-1.5 mx-5 sm:mx-7 mt-6 bg-slate-100/80 border border-slate-200/60 rounded-2xl">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'login' ? 'text-[#0F5C7A] shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              লগইন / সাইন-আপ
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'public' ? 'text-[#0F5C7A] shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Search className="w-4 h-4" />
              ফলাফল অনুসন্ধান
            </button>
          </div>

          <div className="p-5 sm:p-7 flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'public' ? (
                <motion.div 
                  key="public"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <PublicResultSearch />
                </motion.div>
              ) : (
                <motion.div 
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 flex-1 flex flex-col justify-center"
                >
                  {/* Header Title */}
                  <div className="text-center mb-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800">অ্যাকাউন্টে প্রবেশ করুন</h2>
                    <p className="text-slate-500 text-xs mt-1">গুগল অথবা ইমেইল/পাসওয়ার্ড ব্যবহার করুন</p>
                  </div>

                  {/* Browser Issues / Error Alerts */}
                  {embeddedBrowser && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left shadow-sm">
                      <div className="flex gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-amber-800 text-xs">ইন-অ্যাপ ব্রাউজার সতর্কতা</h3>
                          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                            মেসেঞ্জার ব্রাউজারে গুগল লগইন বাধাগ্রস্ত হতে পারে। ব্রাউজারে ওপেন করুন।
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button onClick={openInNewTab} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-semibold text-[11px]">ব্রাউজারে খুলুন</button>
                            <button onClick={copyLink} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-semibold text-[11px]">{copied ? 'কপি হয়েছে' : 'লিঙ্ক কপি'}</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error === 'unauthorized-domain' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left shadow-sm">
                      <div className="flex gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-rose-800 text-xs">ডোমেইন অনুমোদিত নয়</h3>
                          <p className="text-[11px] text-rose-700 mt-0.5">ফায়ারবেস কনসোলে এই ডোমেইনটি অথোরাইজ করুন:</p>
                          <div className="flex items-center gap-2 mt-2 bg-white border border-rose-100 rounded-lg px-2.5 py-1.5">
                            <code className="text-[10px] font-mono text-slate-600 flex-1 truncate">{window.location.hostname}</code>
                            <button onClick={copyDomain} className="text-slate-400 hover:text-slate-700">
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && error !== 'unauthorized-domain' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left shadow-sm flex gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-rose-800 font-medium">
                          {error === 'network-error' ? 'নেটওয়ার্ক ত্রুটি। ইন্টারনেট সংযোগ চেক করুন।' :
                           error === 'coop-error' ? 'ব্রাউজার সিকিউরিটি ইস্যু। নতুন ট্যাবে চেষ্টা করুন।' : 
                           error}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Flow for newly authenticated users needing phone number */}
                  {isNewUser ? (
                    <div className="space-y-3 pt-2">
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                          রেজিস্ট্রেশন সম্পন্ন করতে অনুগ্রহ করে আপনার সক্রিয় ফোন নম্বরটি প্রদান করুন।
                        </p>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
                          placeholder="১১ ডিজিটের মোবাইল নম্বর"
                          className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 text-slate-900 rounded-xl focus:border-[#14B8A6] outline-none text-sm font-semibold shadow-sm transition-all"
                          autoFocus
                        />
                      </div>

                      <button
                        onClick={handleFinalizeSignup}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0F5C7A] to-[#138883] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>{loading ? 'প্রসেসিং হচ্ছে...' : 'রেজিস্ট্রেশন সম্পন্ন করুন'}</span>
                      </button>

                      <button
                        onClick={() => { auth?.signOut(); setIsNewUser(false); }}
                        className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600"
                      >
                        বাতিল করুন
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* 1. Google Sign-In Button */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={loading || !auth}
                          className="w-full group relative flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/80 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#0F5C7A]" />
                          ) : (
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 object-contain" />
                          )}
                          <span className="tracking-wide">
                            {loading ? 'অপেক্ষা করুন...' : 'গুগল দিয়ে চালিয়ে যান'}
                          </span>
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[11px] uppercase">
                          <span className="bg-white px-3 text-slate-400 font-bold">অথবা ইমেইল দিয়ে</span>
                        </div>
                      </div>

                      {/* 2. Sub Mode Switch: Email Login vs Register */}
                      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => { setEmailAuthMode('login'); setError(null); }}
                          className={`flex-1 py-1.5 rounded-lg transition-all ${
                            emailAuthMode === 'login' ? 'bg-white text-[#0F5C7A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          ইমেইল লগইন
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEmailAuthMode('signup'); setError(null); }}
                          className={`flex-1 py-1.5 rounded-lg transition-all ${
                            emailAuthMode === 'signup' ? 'bg-white text-[#0F5C7A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          নতুন অ্যাকাউন্ট
                        </button>
                      </div>

                      {/* 3. Email Login Form */}
                      {emailAuthMode === 'login' ? (
                        <form onSubmit={handleEmailLogin} className="space-y-3 pt-1">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Mail className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="আপনার ইমেইল ঠিকানা"
                              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:border-[#14B8A6] outline-none text-xs sm:text-sm font-medium transition-all"
                              required
                            />
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Lock className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="পাসওয়ার্ড"
                              className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:border-[#14B8A6] outline-none text-xs sm:text-sm font-medium transition-all"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => { setShowForgotPassword(true); setResetEmail(email); }}
                              className="text-[11px] font-semibold text-[#0F5C7A] hover:underline"
                            >
                              পাসওয়ার্ড ভুলে গেছেন?
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0F5C7A] to-[#138883] text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all hover:opacity-95 disabled:opacity-60"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <LogIn className="w-4 h-4" />}
                            <span>{loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}</span>
                          </button>
                        </form>
                      ) : (
                        /* 4. Email Sign Up Form */
                        <form onSubmit={handleEmailSignUp} className="space-y-2.5 pt-1">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <User className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="আপনার পূর্ণ নাম"
                              className="w-full pl-10 pr-3.5 py-2 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:border-[#14B8A6] outline-none text-xs sm:text-sm font-medium transition-all"
                              required
                            />
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Phone className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
                              placeholder="১১ ডিজিটের মোবাইল নম্বর"
                              className="w-full pl-10 pr-3.5 py-2 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:border-[#14B8A6] outline-none text-xs sm:text-sm font-medium transition-all"
                              required
                            />
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Mail className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="ইমেইল এড্রেস"
                              className="w-full pl-10 pr-3.5 py-2 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:border-[#14B8A6] outline-none text-xs sm:text-sm font-medium transition-all"
                              required
                            />
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Lock className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                              className="w-full pl-10 pr-10 py-2 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:border-[#14B8A6] outline-none text-xs sm:text-sm font-medium transition-all"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Lock className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                              className="w-full pl-10 pr-10 py-2 bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:border-[#14B8A6] outline-none text-xs sm:text-sm font-medium transition-all"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0F5C7A] to-[#138883] text-white py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all hover:opacity-95 disabled:opacity-60 mt-1"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <UserPlus className="w-4 h-4" />}
                            <span>{loading ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}</span>
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 text-center border-t border-slate-100 pt-4">
              <p className="text-[11px] text-slate-400 font-medium">
                Copyright &copy; হাজিরা খাতা | All rights reserved.
              </p>
            </div>
          </div>
        </motion.div>

        {/* WhatsApp Support Button */}
        <div className="absolute bottom-4 right-4 hidden lg:block z-20">
          <WhatsAppSupportButton variant="floating" />
        </div>
      </div>
      
      {/* Mobile Floating WhatsApp Button */}
      <div className="lg:hidden">
        <WhatsAppSupportButton variant="floating" />
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <KeyRound className="w-5 h-5 text-[#0F5C7A]" />
                  <span>পাসওয়ার্ড রিসেট</span>
                </div>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                আপনার অ্যাকাউন্টের ইমেইল ঠিকানাটি লিখুন। আমরা পাসওয়ার্ড রিসেট করার একটি লিঙ্ক পাঠিয়ে দেব।
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="ইমেইল এড্রেস"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:bg-white focus:border-[#14B8A6] outline-none text-xs sm:text-sm font-medium"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#0F5C7A] text-white font-bold text-xs shadow-md hover:bg-[#0c4b64] disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>{resetLoading ? 'পাঠানো হচ্ছে...' : 'লিঙ্ক পাঠান'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
