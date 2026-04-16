import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFeeCategories } from '../../hooks/useFeeCategories';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationDialog from '../../components/ConfirmationDialog';

const FeeCategories: React.FC = () => {
  const { orgId, role } = useAuth();
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useFeeCategories(orgId);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  if (role !== 'admin' && role !== 'superadmin') {
    return <div className="p-6 text-center text-red-500">আপনার এই পেজটি দেখার অনুমতি নেই।</div>;
  }

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error('খাতের নাম দিন');
      return;
    }
    try {
      await addCategory(name, description);
      setIsAdding(false);
      setName('');
      setDescription('');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdate = async (id: string) => {
    if (!name.trim()) {
      toast.error('খাতের নাম দিন');
      return;
    }
    try {
      await updateCategory(id, name, description);
      setEditingId(null);
      setName('');
      setDescription('');
    } catch (error) {
      // Error handled in hook
    }
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsAdding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setName('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">ফি খাত (Categories)</h2>
          <p className="text-sm text-slate-500">বিভিন্ন ধরনের ফি এর নাম নির্ধারণ করুন (যেমন: টিউশন ফি, আবাসিক চার্জ)</p>
        </div>
        {!isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> নতুন খাত
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="card-premium p-6 bg-white rounded-[20px] border border-[#0F5C7A]/20">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'খাত সম্পাদনা' : 'নতুন খাত যোগ করুন'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">খাতের নাম *</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: মাসিক খোরাকী"
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">বিবরণ (ঐচ্ছিক)</label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="সংক্ষিপ্ত বিবরণ"
                className="input-premium"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={cancelEdit} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">
              বাতিল
            </button>
            <button 
              onClick={editingId ? () => handleUpdate(editingId) : handleAdd} 
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> সংরক্ষণ করুন
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F5C7A]"></div></div>
      ) : categories.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[20px] border border-slate-100">
          <p className="text-slate-500">কোনো ফি খাত পাওয়া যায়নি। নতুন খাত যোগ করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="card-premium p-5 bg-white rounded-[20px] flex flex-col justify-between group">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{cat.name}</h3>
                {cat.description && <p className="text-sm text-slate-500 mt-1">{cat.description}</p>}
              </div>
              <div className="flex justify-end gap-2 mt-4 transition-opacity">
                <button 
                  onClick={() => startEdit(cat)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCategoryToDelete(cat.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (categoryToDelete) {
            deleteCategory(categoryToDelete);
          }
        }}
        title="খাত মুছে ফেলুন"
        message="আপনি কি নিশ্চিত যে এই খাতটি মুছে ফেলতে চান? এই অ্যাকশনটি বাতিল করা যাবে না।"
      />
    </div>
  );
};

export default FeeCategories;
