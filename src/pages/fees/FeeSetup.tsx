import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasses } from '../../hooks/useClasses';
import { useFeeCategories } from '../../hooks/useFeeCategories';
import { useFeeSetup } from '../../hooks/useFeeSetup';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

const FeeSetup: React.FC = () => {
  const { orgId, role, user } = useAuth();
  const { classes } = useClasses(orgId, user, role);
  const { categories } = useFeeCategories(orgId);
  
  const [selectedClass, setSelectedClass] = useState<string>('');
  const { feeSetups, loading, saveClassFeeSetup } = useFeeSetup(orgId, selectedClass);
  
  // Local state for editing amounts
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedClass && feeSetups.length > 0) {
      const currentAmounts: Record<string, number> = {};
      feeSetups.forEach(setup => {
        currentAmounts[setup.categoryId] = setup.amount;
      });
      setAmounts(currentAmounts);
    } else {
      setAmounts({});
    }
  }, [selectedClass, feeSetups]);

  if (role !== 'admin' && role !== 'superadmin') {
    return <div className="p-6 text-center text-red-500">আপনার এই পেজটি দেখার অনুমতি নেই।</div>;
  }

  const handleAmountChange = (categoryId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setAmounts(prev => ({ ...prev, [categoryId]: numValue }));
  };

  const handleSave = async () => {
    if (!selectedClass) {
      toast.error('শ্রেণি নির্বাচন করুন');
      return;
    }

    const setupsToSave = categories.map(cat => ({
      categoryId: cat.id,
      amount: amounts[cat.id] || 0
    }));

    setIsSaving(true);
    try {
      await saveClassFeeSetup(selectedClass, setupsToSave);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        
        <p className="text-sm text-slate-500">প্রতিটি শ্রেণির জন্য কোন খাতে কত টাকা ফি তা নির্ধারণ করুন</p>
      </div>

      <div className="card-premium p-6 bg-white rounded-[20px]">
        <div className="max-w-md mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">শ্রেণি নির্বাচন করুন</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input-premium"
          >
            <option value="">-- শ্রেণি নির্বাচন করুন --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <div>
            {categories.length === 0 ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">
                প্রথমে "ফি খাত" পেজ থেকে ফি এর ক্যাটাগরি তৈরি করুন।
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2">ফি এর পরিমাণ (টাকায়)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map(cat => (
                    <div key={cat.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <label className="block text-sm font-medium text-slate-700 mb-2">{cat.name}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-medium">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={amounts[cat.id] !== undefined ? amounts[cat.id] : ''}
                          onChange={(e) => handleAmountChange(cat.id, e.target.value)}
                          className="input-premium pl-8"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" /> {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeSetup;
