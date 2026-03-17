import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, serverTimestamp, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { AlertCircle, Loader2, Copy, Check, Phone, Search } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.svg';

const Login: React.FC = () => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

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
      
      const userData = {
        displayName: user.displayName || "ব্যবহারকারী",
        email: user.email || "ইমেইল নেই",
        photoURL: user.photoURL || "",
        phone: phoneNumber.trim(),
        lastLogin: serverTimestamp()
      };
      
      await setDoc(userRef, userData, { merge: true });
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
      if (!userDoc.exists() || !userDoc.data()?.phone) {
        setIsNewUser(true);
        setLoading(false);
        return;
      }

      const fallbackName = user.email ? user.email.split('@')[0] : "ব্যবহারকারী";
      const existingData = userDoc.data();
      
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
      
      await setDoc(userRef, userData, { merge: true });
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
    window.open(window.location.href, '_blank');
  };

  const copyDomain = () => {
    const domain = window.location.hostname;
    navigator.clipboard.writeText(domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full card-premium p-10 text-center border-2 border-[#0F5C7A]/10 shadow-[#0F5C7A]/5">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#0F5C7A]/5 overflow-hidden">
          <img 
            src={logo} 
            alt="হাজিরা খাতা" 
            className="w-full h-full object-contain p-2" 
          />
        </div>
        
        <h1 className="text-3xl font-bold text-[#0F5C7A] mb-3 tracking-tight">হাজিরা খাতা</h1>
        <p className="text-[#334155] mb-8">উপস্থিতি, শিক্ষার্থী এবং রিপোর্ট নিরাপদে পরিচালনা করতে সাইন ইন করুন।</p>

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

        {isNewUser ? (
          <>
            <div className="mb-6 relative">
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#0F5C7A]/40 w-5 h-5" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
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

        <button
          onClick={isNewUser ? handleFinalizeSignup : handleGoogleLogin}
          disabled={loading || !auth}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#0F5C7A] hover:bg-[#0F5C7A]/90 hover:-translate-y-0.5 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all duration-300 mb-4"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/80" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 brightness-0 invert" />
          )}
          <span>{loading ? 'সাইন ইন করা হচ্ছে...' : isNewUser ? 'সাইন আপ সম্পন্ন করুন' : 'গুগল দিয়ে চালিয়ে যান'}</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-400">অথবা</span>
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/result-search'}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-[#0F5C7A]/20 text-[#0F5C7A] hover:bg-[#0F5C7A]/5 rounded-2xl font-bold transition-all duration-300"
        >
          <Search className="w-5 h-5" />
          <span>ফলাফল দেখুন</span>
        </button>
      </div>
      
      <p className="mt-8 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} হাজিরা খাতা অ্যাপ। সর্বস্বত্ব সংরক্ষিত।
      </p>
    </div>
  );
};

export default Login;
