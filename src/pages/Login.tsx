import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
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
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'login'>('login');

  const isEmbeddedBrowser = () => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Instagram") > -1) || (ua.indexOf("Messenger") > -1);
  };

  const [embeddedBrowser, setEmbeddedBrowser] = useState(isEmbeddedBrowser());

  if (user && !isNewUser) {
    return <Navigate to="/" replace />;
  }

  // Check if user exists in database when they sign in with Google
  const checkUserExists = async (email: string) => {
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  // Update isNewUser based on email input or just handle it inside handleLogin
  // Actually, let's just make the phone input optional, and only required if it's a new user.
  // Since we don't know if it's a new user until they click Google login,
  // we can't easily disable the button based on phone number for existing users.

  // Let's change the logic:
  // 1. User clicks Google login.
  // 2. If user exists, proceed.
  // 3. If user doesn't exist, check if phone number is provided.
  // 4. If not provided, ask for it.

  // To support the user's request "once phone number is given, no need again",
  // we can just make the phone input optional in the UI, and only validate it in handleLogin if the user is new.

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

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider || !db) {
      setError("ফায়ারবেস কনফিগারেশন পাওয়া যায়নি।");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Try popup first
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
        // If user doesn't exist or phone is missing, prompt for phone number
        // Skip phone requirement for super admins
        const isSuperAdmin = user.email && SUPER_ADMIN_EMAILS.includes(user.email);
        if (!isSuperAdmin && (!userDoc.exists() || !userDoc.data()?.phone)) {
        if (!phoneNumber.trim()) {
          setIsNewUser(true);
          setLoading(false);
          return;
        }
      }

      const fallbackName = user.email ? user.email.split('@')[0] : "ব্যবহারকারী";
      const existingData = userDoc.data();
      
      const isNew = !userDoc.exists();
      
      const userData: any = {
        displayName: user.displayName || fallbackName,
        email: user.email || "ইমেইল নেই",
        lastLogin: serverTimestamp()
      };
      
      // Only sync photoURL from Google if Firestore doesn't have one yet
      if (!existingData?.photoURL && user.photoURL) {
        userData.photoURL = user.photoURL;
      }
      
      // Only update phone if provided
      if (phoneNumber.trim()) {
        userData.phone = phoneNumber.trim();
      }
      
      if (isNew) {
        const configSnap = await getDoc(doc(db, "globalSettings", "config"));
        const approvalEnabled = configSnap.exists() ? (configSnap.data().isApprovalEnabled ?? true) : true;
        userData.status = approvalEnabled ? "pending" : "active";
        await setDoc(userRef, userData);
      } else {
        await updateDoc(userRef, userData);
      }
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code?.includes('unauthorized-domain') || error.message?.toLowerCase().includes('unauthorized domain')) {
        setError('unauthorized-domain');
      } else if (error.code === 'auth/network-request-failed') {
        setError('network-error');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError("লগইন উইন্ডোটি বন্ধ করে দেওয়া হয়েছে। আবার চেষ্টা করুন।");
      } else if (error.code === 'auth/internal-error' && error.message?.includes('Cross-Origin-Opener-Policy')) {
        setError('coop-error');
      } else {
        setError(error.message || "লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    } finally {
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
          onClick={isNewUser ? handleFinalizeSignup : handleGoogleLogin}
          disabled={loading || !auth}
          className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/80" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 brightness-0 invert" />
          )}
          <span>{loading ? 'সাইন ইন করা হচ্ছে...' : isNewUser ? 'সাইন আপ সম্পন্ন করুন' : 'গুগল দিয়ে চালিয়ে যান'}</span>
        </button>

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
