import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
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
    if (!auth || !googleProvider) {
      setError("Firebase configuration not found.");
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
        setError('Login popup closed. Please try again.');
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Student Attendance</h1>
        <p className="text-slate-500 mb-8">Sign in to manage attendance, students, and reports securely.</p>

        {error === 'unauthorized-domain' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Domain Not Authorized</h3>
                <p className="text-sm text-red-600 mt-1">
                  This domain needs to be added to Firebase Authentication settings.
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
              <h3 className="font-semibold text-red-800">Network Error</h3>
              <p className="text-sm text-red-600 mt-1">
                Unable to connect to Firebase. Please check your internet connection.
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
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          )}
          <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
        </button>
      </div>
      
      <p className="mt-8 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Student Attendance App. All rights reserved.
      </p>
    </div>
  );
};

export default Login;
