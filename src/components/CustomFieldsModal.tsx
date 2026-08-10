import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, List } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CustomFieldDef } from "../types";
import toast from "react-hot-toast";

interface CustomFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

const CustomFieldsModal: React.FC<CustomFieldsModalProps> = ({ isOpen, onClose, orgId }) => {
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
  const [isSavingFields, setIsSavingFields] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && orgId) {
      const fetchCustomFields = async () => {
        setIsLoading(true);
        try {
          const orgDoc = await getDoc(doc(db, "organizations", orgId));
          if (orgDoc.exists()) {
            setCustomFields(orgDoc.data().studentCustomFields || []);
          }
        } catch (e) {
          console.error("Failed to load custom fields", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCustomFields();
    }
  }, [isOpen, orgId]);

  if (!isOpen) return null;

  const handleAddCustomField = async () => {
    if (!orgId || !newFieldName.trim()) return;
    setIsSavingFields(true);
    try {
      const newField: CustomFieldDef = {
        id: `field_${Date.now()}`,
        name: newFieldName.trim(),
        type: 'text'
      };
      const updatedFields = [...customFields, newField];
      const orgRef = doc(db, "organizations", orgId);
      await updateDoc(orgRef, { studentCustomFields: updatedFields });
      setCustomFields(updatedFields);
      setNewFieldName("");
      toast.success("নতুন ফিল্ড সফলভাবে যুক্ত করা হয়েছে!");
    } catch (error) {
      console.error("Error adding custom field:", error);
      toast.error("ফিল্ড যুক্ত করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsSavingFields(false);
    }
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    if (!orgId) return;
    setIsSavingFields(true);
    try {
      const updatedFields = customFields.filter(f => f.id !== fieldId);
      const orgRef = doc(db, "organizations", orgId);
      await updateDoc(orgRef, { studentCustomFields: updatedFields });
      setCustomFields(updatedFields);
      toast.success("ফিল্ড সফলভাবে মুছে ফেলা হয়েছে!");
    } catch (error) {
      console.error("Error deleting custom field:", error);
      toast.error("ফিল্ড মুছতে ব্যর্থ হয়েছে।");
    } finally {
      setIsSavingFields(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-[#0F766E] rounded-xl flex items-center justify-center shadow-inner">
              <List className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1E293B]">শিক্ষার্থীর অতিরিক্ত ফিল্ড</h2>
              <p className="text-sm text-slate-500 font-medium">শিক্ষার্থীর প্রোফাইলে নতুন ফিল্ড যুক্ত করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-[#0F5C7A]/30 border-t-[#0F5C7A] rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="নতুন ফিল্ডের নাম (যেমন: মাতার নাম)"
                  className="w-full h-[52px] border border-[#D1D5DB] rounded-[16px] bg-[#F9FAFB] px-4 focus:border-[#14B8A6] outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFieldName.trim()) {
                      handleAddCustomField();
                    }
                  }}
                />
                <button
                  onClick={handleAddCustomField}
                  disabled={isSavingFields || !newFieldName.trim()}
                  className="w-full h-[52px] bg-[#0F5C7A] text-white rounded-[16px] font-bold hover:bg-[#0C4A63] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  {isSavingFields ? "যুক্ত হচ্ছে..." : "যুক্ত করুন"}
                </button>
              </div>

              {customFields.length > 0 ? (
                <div className="bg-slate-50 rounded-[16px] border border-slate-200 overflow-hidden">
                  <div className="grid grid-cols-1 divide-y divide-slate-200">
                    {customFields.map((field) => (
                      <div key={field.id} className="p-4 flex items-center justify-between hover:bg-slate-100 transition-colors">
                        <span className="font-medium text-slate-700">{field.name}</span>
                        <button
                          onClick={() => handleDeleteCustomField(field.id)}
                          disabled={isSavingFields}
                          className="w-8 h-8 text-rose-500 hover:bg-rose-100 rounded-lg flex items-center justify-center transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-[16px] border border-dashed border-slate-300">
                  কোনো অতিরিক্ত ফিল্ড যুক্ত করা হয়নি
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomFieldsModal;
