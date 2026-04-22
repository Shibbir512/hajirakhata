import React, { useState, useEffect } from 'react';
import { signInWithRedirect, getRedirectResult, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { AlertCircle, Loader2, Copy, Check, Phone, Search, LogIn, GraduationCap } from 'lucide-react';
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
  
  const [processingRedirect, setProcessingRedirect] = useState(false); // Default to false in testing
  const [redirectTimeout, setRedirectTimeout] = useState(false);

  const isEmbeddedBrowser = () => {
    // Basic UserAgent checks for Messenger, Facebook
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Instagram") > -1) || (ua.indexOf("Messenger") > -1);
  };

  const [embeddedBrowser, setEmbeddedBrowser] = useState(isEmbeddedBrowser());

  const isInIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  useEffect(() => {
    // If inside an iframe, never show "processing redirect" loader
    // to prevent stuck UI when cross-origin prevents getRedirectResult
    if (isInIframe()) {
      setProcessingRedirect(false);
      return;
    }

    setProcessingRedirect(true);
    const timer = setTimeout(() => {
      setRedirectTimeout(true);
      setProcessingRedirect(false); // Force unlock UI
    }, 5000); // Reduce timeout to 5 seconds

    const checkRedirect = async () => {
      if (!auth) return;
      try {
        await getRedirectResult(auth);
      } catch (error: any) {
        console.error("Redirect login error", error);
        if (error.code?.includes('unauthorized-domain') || error.message?.toLowerCase().includes('unauthorized domain')) {
          setError('unauthorized-domain');
        } else if (error.code === 'auth/network-request-failed') {
          setError('network-error');
        } else if (error.code === 'auth/internal-error' && error.message?.includes('Cross-Origin-Opener-Policy')) {
          setError('coop-error');
        } else {
          setError(error.message || "লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        }
      } finally {
        setProcessingRedirect(false);
        clearTimeout(timer);
      }
    };
    checkRedirect();

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const processUser = async () => {
      if (user && !authLoading) {
        const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
        const storedPhone = sessionStorage.getItem('tempPhone');
        
        if (storedPhone && !phone) {
          try {
            setLoading(true);
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { phone: storedPhone });
            sessionStorage.removeItem('tempPhone');
          } catch(e) {
            console.error("Error setting stored phone:", e);
          } finally {
            setLoading(false);
          }
        } else if (!isSuperAdmin && !phone && !storedPhone) {
          setIsNewUser(true);
        }
      }
    };
    processUser();
  }, [user, phone, authLoading]);

  if (authLoading || (processingRedirect && !redirectTimeout)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-[#0F766E] animate-spin mb-4" />
        <p className="text-slate-600 font-medium animate-pulse">লগইন চেক করা হচ্ছে...</p>
      </div>
    );
  }

  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
  const needsPhone = !isSuperAdmin && !phone;
  // Don't navigate away if we are still processing a phone update (loading)
  const hasTempPhone = sessionStorage.getItem('tempPhone') !== null;

  if (user && !loading && (!needsPhone || hasTempPhone)) {
    return <Navigate to="/" replace />;
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
        await setDoc(userRef, userData);
      } else {
        await updateDoc(userRef, userData);
      }
      setIsNewUser(false);
    } catch (error: any) {
      console.error("Signup failed", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (usePopup = false) => {
    if (!auth || !googleProvider) {
      setError("ফায়ারবেস কনফিগারেশন পাওয়া যায়নি।");
      return;
    }
    setError(null);
    setLoading(true);
    
    if (phoneNumber.trim()) {
      sessionStorage.setItem('tempPhone', phoneNumber.trim());
    }
    
    // If we are inside an embedded browser or iframe, signInWithRedirect is heavily restricted
    // and often fails due to Cross-Origin-Opener-Policy or similar. 
    // Popup might be blocked but is sometimes the only option, so we attempt it. 
    const forcePopup = usePopup || embeddedBrowser || isInIframe();
    
    try {
      if (forcePopup) {
        await signInWithPopup(auth, googleProvider);
      } else {
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        setError("পপ-আপ ব্লক করা হয়েছে। অনুগ্রহ করে ব্রাউজার সেটিংসে পপ-আপ এলাউ করুন অথবা রিডাইরেক্ট বাটনটি ব্যবহার করুন।");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/75 backdrop-blur-lg border-b border-[#E2E8F0] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="হাজিরা খাতা" className="w-8 h-8 object-contain" />
            <span className="font-bold text-xl text-[#0F766E] tracking-tight">হাজিরা খাতা</span>
          </div>
          <div className="flex items-center p-1 bg-slate-100 rounded-[20px]">
            <button
              onClick={() => setActiveTab('public')}
              className={`px-6 py-2 rounded-[16px] text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'public' 
                  ? 'bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">ফলাফল দেখুন</span>
            </button>
            <button
              onClick={() => setActiveTab('login')}
              className={`px-6 py-2 rounded-[16px] text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'login' 
                  ? 'bg-gradient-to-r from-[#0F766E] to-[#14B8A6] text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">লগইন করুন</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {activeTab === 'public' ? (
          <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PublicResultSearch />
          </div>
        ) : (
          <div className="max-w-md w-full card-premium p-8 sm:p-10 text-center border-[#E2E8F0] shadow-xl shadow-teal-900/5 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-teal-100 overflow-hidden">
              <img 
                src={logo} 
                alt="হাজিরা খাতা" 
                className="w-full h-full object-contain p-2" 
              />
            </div>
            
            <h2 className="text-2xl font-bold text-[#0F766E] mb-2 tracking-tight">অ্যাডমিন প্যানেল</h2>
            <p className="text-slate-500 mb-10 text-sm">উপস্থিতি, শিক্ষার্থী এবং রিপোর্ট নিরাপদে পরিচালনা করতে সাইন ইন করুন।</p>

            {embeddedBrowser && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">ব্রাউজার সিকিউরিটি ইস্যু</h3>
                <p className="text-sm text-amber-600 mt-1">
                  আপনি সম্ভবত মেসেঞ্জার বা অন্য কোনো অ্যাপের ভেতর থেকে এটি ওপেন করেছেন। এতে গুগল লগইন কাজ নাও করতে পারে। অনুগ্রহ করে নিচের বাটনে ক্লিক করে ব্রাউজারে অ্যাপটি ওপেন করুন অথবা লিঙ্কটি কপি করুন।
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left flex items-start gap-3">
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left flex items-start gap-3">
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
            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0F5C7A]/40 w-5 h-5" />
            <input
              type="text"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
              placeholder="ফোন নম্বর (নতুন রেজিস্ট্রেশনের জন্য)"
              className="input-premium w-full pl-12 pr-4 py-4 text-lg"
            />
          </div>
        )}

        {isNewUser ? (
          <>
            <div className="mb-6 relative">
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0F5C7A]/40 w-5 h-5" />
              <input
                type="text"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(toEnglishNumber(e.target.value))}
                placeholder="ফোন নম্বর (বাধ্যতামূলক)"
                className="input-premium w-full pl-12 pr-4 py-4 text-lg"
              />
            </div>
            <button
              onClick={() => {
                auth?.signOut();
                setIsNewUser(false);
              }}
              className="text-slate-400 hover:text-slate-600 text-sm mb-4 block mx-auto"
            >
              বাতিল করুন এবং অন্য অ্যাকাউন্ট দিয়ে চেষ্টা করুন
            </button>
          </>
        ) : null}

        <div className="flex items-center justify-center gap-2 text-[#0F766E] font-bold mb-4">
          <LogIn className="w-5 h-5" />
          <span>{isNewUser ? 'রেজিস্ট্রেশন সম্পন্ন করুন' : 'লগইন বা রেজিস্ট্রেশন করুন'}</span>
        </div>

        <button
          onClick={() => isNewUser ? handleFinalizeSignup() : handleGoogleLogin(false)}
          disabled={loading || !auth}
          className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 mb-3"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/80" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 brightness-0 invert" />
          )}
          <span>{loading ? 'সাইন ইন করা হচ্ছে...' : isNewUser ? 'সাইন আপ সম্পন্ন করুন' : 'গুগল দিয়ে চালিয়ে যান'}</span>
        </button>

        {!isNewUser && (
          <button
            onClick={() => handleGoogleLogin(true)}
            disabled={loading || !auth}
            className="w-full py-3 text-sm flex items-center justify-center gap-2 text-[#0F766E] border-2 border-teal-50 hover:bg-teal-50 rounded-2xl transition-all font-medium"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale" />
            <span>পপ-আপ ব্যবহার করে চেষ্টা করুন</span>
          </button>
        )}

        {redirectTimeout && processingRedirect && (
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left">
            <h3 className="font-bold text-amber-800 mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              লগইন চেক করতে দেরি হচ্ছে
            </h3>
            <p className="text-xs text-amber-600 mb-4 leading-relaxed">
              আপনার ব্রাউজার হয়তো লগইন রিডাইরেক্ট সম্পন্ন হতে দেরি করছে। নিচের বাটনটি ব্যবহার করে পুনরায় চেষ্টা করতে পারেন।
            </p>
            <button 
              onClick={() => setProcessingRedirect(false)}
              className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm"
            >
              লগইন স্ক্রিনে ফিরে যান
            </button>
          </div>
        )}

        <button
          onClick={() => setActiveTab('public')}
          className="w-full mt-4 py-4 text-lg flex items-center justify-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all duration-300"
        >
          <Search className="w-5 h-5" />
          <span>ফলাফল অনুসন্ধান করুন</span>
        </button>
          </div>
        )}
      </main>
      
      <footer className="py-6 text-center">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} হাজিরা খাতা অ্যাপ। সর্বস্বত্ব সংরক্ষিত।
        </p>
      </footer>
    </div>
  );
};

export default Login;
