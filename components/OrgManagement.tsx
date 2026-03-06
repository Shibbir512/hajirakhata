import React, { useState } from 'react';
import Button from './common/Button';
import { ClipboardIcon } from './common/Icons';

interface OrgManagementProps {
  onCreateOrg: (name: string) => Promise<void>;
  onJoinOrg: (id: string) => Promise<void>;
  onLogout: () => void;
  visitedOrgs?: {[key: string]: string};
}

const OrgManagement: React.FC<OrgManagementProps> = ({ onCreateOrg, onJoinOrg, onLogout, visitedOrgs = {} }) => {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      if (mode === 'create') {
        await onCreateOrg(input);
      } else {
        await onJoinOrg(input);
      }
    } catch (error: any) {
      alert(error.message || 'ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (id: string) => {
    setLoading(true);
    try {
      await onJoinOrg(id);
    } catch (error: any) {
      alert(error.message || 'ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-gray-800 text-center">স্কুল/প্রতিষ্ঠান সেটআপ</h1>
        <p className="text-gray-600 mb-6 text-center text-sm">
          ১০ জন শিক্ষক মিলে একই ডাটা ব্যবহার করতে চাইলে একটি স্কুল তৈরি করুন অথবা বিদ্যমান স্কুলে জয়েন করুন।
        </p>

        {mode === 'select' ? (
          <div className="space-y-4">
            {Object.keys(visitedOrgs).length > 0 ? (
              <div className="mb-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">স্বাগতম!</h3>
                  <p className="text-sm text-gray-500">আপনার স্কুল নির্বাচন করুন</p>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(visitedOrgs).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => handleQuickJoin(id)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-4 bg-white hover:bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-300 rounded-xl shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 group"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-indigo-700 text-lg">{name}</span>
                        <span className="text-[10px] text-gray-400 font-mono group-hover:text-indigo-400">{id}</span>
                      </div>
                      <div className="bg-indigo-100 text-indigo-600 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3">
                  <button 
                    onClick={() => setMode('join')} 
                    className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    অন্য কোনো স্কুলে জয়েন করুন
                  </button>
                  <button 
                    onClick={() => setMode('create')} 
                    className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    নতুন স্কুল তৈরি করুন
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button onClick={() => setMode('create')} className="w-full justify-center py-3">
                  নতুন স্কুল তৈরি করুন
                </Button>
                <Button onClick={() => setMode('join')} variant="secondary" className="w-full justify-center py-3">
                  বিদ্যমান স্কুলে জয়েন করুন
                </Button>
              </div>
            )}
            
            <div className="pt-4 border-t">
              <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-500 w-full text-center">
                লগ আউট করুন
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === 'create' ? 'স্কুলের নাম' : 'স্কুল আইডি (School ID)'}
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'create' ? 'যেমন: আদর্শ উচ্চ বিদ্যালয়' : 'যেমন: school-123...'}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-slate-500 outline-none"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setMode('select')} className="flex-1 justify-center">
                ফিরে যান
              </Button>
              <Button type="submit" className="flex-1 justify-center" disabled={loading}>
                {loading ? 'প্রসেসিং...' : (mode === 'create' ? 'তৈরি করুন' : 'জয়েন করুন')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrgManagement;
