import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    if (!auth || !googleProvider || !db) {
      setError("ফায়ারবেস কনফিগারেশন পাওয়া যায়নি।");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Save user data to Firestore (without awaiting to speed up login)
      const userRef = doc(db, "users", user.uid);
      const fallbackName = user.email ? user.email.split('@')[0] : "ব্যবহারকারী";
      setDoc(userRef, {
        displayName: user.displayName || fallbackName,
        email: user.email || "ইমেইল নেই",
        photoURL: user.photoURL || "",
        lastLogin: serverTimestamp()
      }, { merge: true }).catch(error => console.error("Error saving user data:", error));
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        setError('unauthorized-domain');
      } else if (error.code === 'auth/network-request-failed') {
        setError('network-error');
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setError('লগিন পপআপ বন্ধ হয়ে গেছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyDomain = () => {
    const domain = window.location.hostname;
    navigator.clipboard.writeText(domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full card-premium p-10 text-center border-2 border-teal-100 shadow-teal-900/5">
        <div className="w-20 h-20 bg-gradient-to-tr from-indigo-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-white">
          <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold gradient-text mb-3 tracking-tight">হাজিরা খাতা</h1>
        <p className="text-slate-500 mb-8">উপস্থিতি, শিক্ষার্থী এবং রিপোর্ট নিরাপদে পরিচালনা করতে সাইন ইন করুন।</p>

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

        {error && error !== 'unauthorized-domain' && error !== 'network-error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !auth}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#008080] hover:bg-[#006666] text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all duration-300"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/80" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 brightness-0 invert" />
          )}
          <span>{loading ? 'সাইন ইন করা হচ্ছে...' : 'গুগল দিয়ে চালিয়ে যান'}</span>
        </button>
      </div>
      
      <p className="mt-8 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} হাজিরা খাতা অ্যাপ। সর্বস্বত্ব সংরক্ষিত।
      </p>
    </div>
  );
};

export default Login;
