import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { AlertCircle, Loader2, Copy, Check, Phone, Search, LogIn, GraduationCap, BookOpen, Users, ClipboardCheck, PieChart, ArrowLeft } from 'lucide-react';
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
    // Try to open in new tab
    window.open(window.location.href, '_system');
    // Fallback: try to navigate current window
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
    <div className="min-h-screen bg-gradient-to-br from-[#0B2C2D] to-[#061819] flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Container Card */}
      <div className={`w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 ${activeTab === 'public' ? 'max-w-5xl' : 'max-w-4xl'}`}>
        
        {/* Left Panel (Illustration) - Hidden on mobile, visible on md+ for login */}
        {activeTab === 'login' && (
          <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#0F766E] to-[#08423E] p-10 flex-col justify-between relative overflow-hidden text-white min-h-[600px]">
            {/* Background Decorations */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#14B8A6]/10 rounded-full blur-3xl"></div>
            
            {/* Dots Pattern Overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

            {/* Top Left: Logo */}
            <div className="flex items-center gap-3 z-10">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <img src={logo} alt="হাজিরা খাতা" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-bold text-xl tracking-tight">হাজিরা খাতা</span>
            </div>

            {/* Center: Illustration */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 relative my-10">
               <div className="relative w-56 h-56 flex items-center justify-center">
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute inset-4 border border-white/20 rounded-full"></div>
                  <div className="absolute inset-8 border border-white/10 rounded-full animate-pulse"></div>
                  
                  <div className="relative z-10 flex flex-col items-center mt-4">
                    <GraduationCap className="w-24 h-24 text-white drop-shadow-2xl -mb-6 z-20" />
                    <BookOpen className="w-32 h-32 text-white/90 drop-shadow-xl z-10" />
                  </div>
               </div>
            </div>

            {/* Bottom Content */}
            <div className="z-10 mt-auto text-center md:text-left">
              <h1 className="text-4xl font-extrabold mb-3">স্বাগতম</h1>
              <p className="text-teal-50/90 text-[15px] mb-8 font-medium">আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা সহজ করুন</p>
              
              {/* Features Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/5">
                    <Users className="w-5 h-5 text-teal-100" />
                  </div>
                  <span className="text-xs font-medium text-teal-50/80">ছাত্র-ছাত্রী<br/>ব্যবস্থাপনা</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/5">
                    <ClipboardCheck className="w-5 h-5 text-teal-100" />
                  </div>
                  <span className="text-xs font-medium text-teal-50/80">উপস্থিতি<br/>ট্র্যাকিং</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/5">
                    <PieChart className="w-5 h-5 text-teal-100" />
                  </div>
                  <span className="text-xs font-medium text-teal-50/80">ফলাফল<br/>প্রকাশ</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Panel (Login Form or Public Search) */}
        <div className={`w-full ${activeTab === 'login' ? 'md:w-7/12 p-8 sm:p-12 lg:p-16' : 'p-4 sm:p-6'} flex flex-col justify-center bg-white relative min-h-[600px]`}>
            
            {activeTab === 'public' ? (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                  <button 
                    onClick={() => setActiveTab('login')}
                    className="flex items-center gap-2 text-slate-500 hover:text-[#0F766E] font-medium transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    লগইন পেজে ফিরে যান
                  </button>
                  <div className="flex items-center gap-2">
                    <img src={logo} alt="হাজিরা খাতা" className="w-6 h-6 object-contain" />
                    <span className="font-bold text-lg text-[#0F766E]">হাজিরা খাতা</span>
                  </div>
                </div>
                <PublicResultSearch />
              </div>
            ) : (
              <div className="max-w-sm w-full mx-auto animate-in fade-in zoom-in-95 duration-500">
                {/* Mobile Header (Only visible on small screens) */}
                <div className="md:hidden flex flex-col items-center justify-center gap-2 mb-8">
                  <div className="bg-[#0F766E] p-2 rounded-xl shadow-md">
                    <img src={logo} alt="হাজিরা খাতা" className="w-8 h-8 object-contain brightness-0 invert" />
                  </div>
                  <span className="font-bold text-2xl text-[#0F766E] tracking-tight">হাজিরা খাতা</span>
                </div>

                <div className="text-center mb-8 hidden md:block">
                  <div className="w-20 h-20 bg-[#0F766E]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#0F766E]/20 overflow-hidden">
                    <BookOpen className="w-10 h-10 text-[#0F766E]" />
                  </div>
                  
                  <h2 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">অ্যাডমিন প্যানেল</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা সহজকরন হাজিরা খাতা।
                  </p>
                </div>

                {embeddedBrowser && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-800">ব্রাউজার সিকিউরিটি ইস্যু</h3>
                        <p className="text-sm text-amber-600 mt-1">
                          আপনি সম্ভবত মেসেঞ্জার বা অন্য কোনো অ্যাপের ভেতর থেকে এটি ওপেন করেছেন। এতে গুগল লগইন কাজ নাও করতে পারে।
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button 
                            onClick={openInNewTab}
                            className="flex-1 py-2 bg-amber-600 text-white rounded-lg font-medium text-sm"
                          >
                            ব্রাউজারে ওপেন করুন
                          </button>
                          <button 
                            onClick={copyLink}
                            className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-medium text-sm"
                          >
                            {copied ? 'কপি হয়েছে!' : 'লিঙ্ক কপি করুন'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error === 'unauthorized-domain' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-800">ডোমেইন অনুমোদিত নয়</h3>
                        <p className="text-sm text-red-600 mt-1">
                          এই ডোমেইনটি ফায়ারবেস অথেনটিকেশন সেটিংসে যোগ করতে হবে।
                        </p>
                        <div className="flex items-center gap-2 mt-3 bg-white border border-red-100 rounded px-3 py-2">
                          <code className="text-xs font-mono text-slate-600 flex-1">{window.location.hostname}</code>
                          <button onClick={copyDomain} className="text-slate-400 hover:text-slate-600">
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error === 'network-error' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-800">নেটওয়ার্ক ত্রুটি</h3>
                      <p className="text-sm text-red-600 mt-1">
                        ফায়ারবেসের সাথে সংযোগ করতে অক্ষম। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।
                      </p>
                    </div>
                  </div>
                )}

                {error === 'coop-error' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-800">ব্রাউজার সিকিউরিটি ইস্যু</h3>
                        <p className="text-sm text-amber-600 mt-1">
                          আইফ্রেমের ভেতর গুগল লগইন কাজ করছে না। অনুগ্রহ করে নিচের বাটনে ক্লিক করে নতুন ট্যাবে অ্যাপটি ওপেন করুন।
                        </p>
                        <button 
                          onClick={openInNewTab}
                          className="mt-3 w-full py-2 bg-amber-600 text-white rounded-lg font-medium text-sm"
                        >
                          নতুন ট্যাবে ওপেন করুন
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {error && error !== 'unauthorized-domain' && error !== 'network-error' && error !== 'coop-error' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-600">{error}</p>
                      <button 
                        onClick={openInNewTab}
                        className="mt-2 text-xs text-red-800 underline font-medium"
                      >
                        লগইন কাজ না করলে নতুন ট্যাবে চেষ্টা করুন
                      </button>
                    </div>
                  </div>
                )}

                {!isNewUser && (
                  <div className="mb-6 relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0F766E]/40 w-5 h-5" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
                      placeholder="ফোন নম্বর (নতুন রেজিস্ট্রেশনের জন্য)"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 rounded-xl pl-12 pr-4 py-3.5 text-[15px] outline-none transition-all"
                    />
                  </div>
                )}

                {isNewUser ? (
                  <>
                    <div className="mb-6 relative">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0F766E]/40 w-5 h-5" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
                        placeholder="ফোন নম্বর (বাধ্যতামূলক)"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 rounded-xl pl-12 pr-4 py-3.5 text-[15px] outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={() => {
                        auth?.signOut();
                        setIsNewUser(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-sm mb-4 block mx-auto transition-colors"
                    >
                      বাতিল করুন এবং অন্য অ্যাকাউন্ট দিয়ে চেষ্টা করুন
                    </button>
                  </>
                ) : null}

                {isNewUser && (
                  <div className="flex items-center justify-center gap-2 text-[#0F766E] font-bold mb-4">
                    <LogIn className="w-5 h-5" />
                    <span>রেজিস্ট্রেশন সম্পন্ন করুন</span>
                  </div>
                )}

                <button
                  onClick={() => isNewUser ? handleFinalizeSignup() : handleGoogleLogin()}
                  disabled={loading || !auth}
                  className="w-full bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-[#0B544E] hover:to-[#0F766E] text-white py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-bold flex items-center justify-center gap-3 mb-4 shadow-lg shadow-teal-900/20 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white/80" />
                  ) : (
                    <div className="bg-white p-1 rounded-full flex items-center justify-center">
                       <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                    </div>
                  )}
                  <span>{loading ? 'সাইন ইন করা হচ্ছে...' : isNewUser ? 'সাইন আপ সম্পন্ন করুন' : 'গুগল দিয়ে চালিয়ে যান'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('public')}
                  className="w-full py-3.5 sm:py-4 text-base sm:text-lg flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-[#0F766E] hover:bg-teal-50 text-slate-700 rounded-xl font-bold transition-all duration-300"
                >
                  <Search className="w-5 h-5" />
                  <span>ফলাফল অনুসন্ধান করুন</span>
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-teal-100/60 text-sm w-full max-w-4xl flex justify-center">
        <p>Copyright &copy; {new Date().getFullYear()} Hajira Khata. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;
