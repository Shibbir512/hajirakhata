import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../src/firebase';
import Button from './common/Button';
import { ClipboardIcon } from './common/Icons';

const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      alert("Firebase কনফিগারেশন পাওয়া যায়নি। অনুগ্রহ করে ডেভেলপার কনসোলে API Key সেট করুন।");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        setError('unauthorized-domain');
      } else if (error.code === 'auth/network-request-failed') {
        setError('network-error');
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setError('লগইন পপআপ বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
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
    alert('ডোমেইন কপি করা হয়েছে: ' + domain);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">ছাত্র হাজিরা খাতা</h1>
        <p className="text-gray-600 mb-6">আপনার ডাটা সুরক্ষিত রাখতে এবং যেকোনো ডিভাইস থেকে অ্যাক্সেস করতে লগইন করুন।</p>
        
        {!auth && (
           <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 text-sm">
              সতর্কতা: Firebase কনফিগারেশন পাওয়া যায়নি। অ্যাপটি ডেমো মোডে চলতে পারে অথবা কাজ নাও করতে পারে।
           </div>
        )}

        {error === 'unauthorized-domain' && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-left shadow-md">
                <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="font-bold text-red-700 text-lg">লগইন ব্যর্থ হয়েছে</p>
                </div>
                <p className="text-red-600 mb-3">
                    Firebase নিরাপত্তা সেটিংসের কারণে লগইন ব্লক করা হয়েছে। এটি ঠিক করতে নিচের ডোমেইনটি আপনার Firebase কনসোলে যুক্ত করতে হবে।
                </p>
                
                <div className="bg-white p-3 border border-gray-300 rounded flex items-center justify-between mb-3">
                    <code className="text-sm font-mono text-gray-800 break-all">{window.location.hostname}</code>
                    <button 
                        onClick={copyDomain}
                        className="ml-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors flex items-center"
                    >
                        <ClipboardIcon className="w-4 h-4 mr-1" />
                        কপি
                    </button>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-semibold">কোথায় যুক্ত করবেন?</p>
                    <ol className="list-decimal list-inside pl-1">
                        <li>Firebase Console {'>'} Authentication {'>'} Settings</li>
                        <li>Authorized domains {'>'} Add domain</li>
                    </ol>
                </div>
            </div>
        )}
        
        {error === 'network-error' && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 text-left shadow-md">
                <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="font-bold text-red-700 text-lg">ইন্টারনেট সংযোগ সমস্যা</p>
                </div>
                <p className="text-red-600 mb-3">
                    Firebase সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।
                </p>
                <p className="text-sm text-gray-600">
                    সম্ভাব্য কারণ:
                </p>
                <ul className="list-disc list-inside pl-1 text-sm text-gray-600">
                    <li>ইন্টারনেট সংযোগ বিচ্ছিন্ন</li>
                    <li>ফায়ারওয়াল বা প্রক্সি ব্লক করছে</li>
                    <li>ব্রাউজার এক্সটেনশন (যেমন AdBlocker) সমস্যা করছে</li>
                </ul>
            </div>
        )}

        {error && error !== 'unauthorized-domain' && error !== 'network-error' && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                ত্রুটি: {error}
            </div>
        )}

        <Button onClick={handleLogin} className="w-full justify-center" disabled={!auth || loading}>
          {loading ? 'অপেক্ষা করুন...' : 'গুগল দিয়ে লগইন করুন'}
        </Button>
      </div>
    </div>
  );
};

export default Login;
