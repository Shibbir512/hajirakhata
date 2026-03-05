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
            {Object.keys(visitedOrgs).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">আপনার স্কুলসমূহ</h3>
                <div className="space-y-2">
                  {Object.entries(visitedOrgs).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => handleQuickJoin(id)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors text-left group"
                    >
                      <span className="font-medium text-indigo-700">{name}</span>
                      <span className="text-xs text-indigo-400 group-hover:text-indigo-600">জয়েন করুন &rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => setMode('create')} className="w-full justify-center py-3">
              নতুন স্কুল তৈরি করুন
            </Button>
            <Button onClick={() => setMode('join')} variant="secondary" className="w-full justify-center py-3">
              অন্য স্কুলে জয়েন করুন
            </Button>
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
