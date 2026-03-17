import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { Plus, Edit, Trash2, X, Loader2, Users } from "lucide-react";
import { ClassData } from "../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const Classes: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes, addClass, updateClassName, deleteClass, isAdding, isUpdating, isDeleting } = useClasses(
    orgId,
    user,
    role,
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    if (!orgId || (role !== "admin" && role !== "moderator") || !db) return;
    
    const fetchStaff = async () => {
      try {
        const q = query(collection(db, "users"), where("organizationId", "==", orgId));
        const snapshot = await getDocs(q);
        const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStaffList(staff);
      } catch (error) {
        console.error("Error fetching staff:", error);
      }
    };
    fetchStaff();
  }, [orgId, role]);

  const handleAddClass = (name: string, teacherIds: string[]) => {
    addClass(name, teacherIds);
    setIsAddModalOpen(false);
  };

  const handleUpdateClass = (name: string, teacherIds: string[]) => {
    if (editingClass) {
      updateClassName(editingClass.id, name, teacherIds);
      setEditingClass(null);
    }
  };

  const handleDeleteClass = (id: string) => {
    deleteClass(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold gradient-text tracking-tight">শ্রেণি</h2>
        {(role === "admin" || role === "moderator") && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isAdding}
            className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {isAdding ? 'যোগ করা হচ্ছে...' : 'শ্রেণি যোগ করুন'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls, index) => {
          const colors = [
            { bg: "bg-orange-50/80", border: "border-orange-100", text: "text-orange-700", sub: "text-orange-500" },
            { bg: "bg-indigo-50/80", border: "border-indigo-100", text: "text-indigo-700", sub: "text-indigo-500" },
            { bg: "bg-blue-50/80", border: "border-blue-100", text: "text-blue-700", sub: "text-blue-500" },
            { bg: "bg-amber-50/80", border: "border-amber-100", text: "text-amber-700", sub: "text-amber-500" },
            { bg: "bg-rose-50/80", border: "border-rose-100", text: "text-rose-700", sub: "text-rose-500" },
            { bg: "bg-indigo-50/80", border: "border-indigo-100", text: "text-indigo-700", sub: "text-indigo-500" },
          ];
          const color = colors[index % colors.length];

          return (
            <div
              key={cls.id}
              className="bg-white border border-[#E5E7EB] hover:-translate-y-1 transition-all duration-300 group"
              style={{ borderRadius: '18px', padding: '20px', boxShadow: '0px 10px 25px rgba(0,0,0,0.08)' }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-[20px] font-bold text-slate-800 tracking-tight">
                    {cls.name}
                  </h3>
                  <p className="text-[14px] text-slate-500 mt-1 font-mono opacity-80">আইডি: {cls.id}</p>
                  
                  {cls.teacherIds && cls.teacherIds.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {cls.teacherIds.map(tId => {
                        const teacher = staffList.find(s => s.id === tId);
                        if (!teacher) return null;
                        return (
                          <span key={tId} className="text-[12px] px-3 py-1 rounded-full bg-[#0F5C7A]/10 text-[#0F5C7A] font-medium">
                            {teacher.displayName || teacher.email?.split('@')[0]}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                {(role === "admin" || role === "moderator") && (
                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingClass(cls)}
                      className="p-2 text-[#0F5C7A] bg-[#0F5C7A]/10 hover:bg-[#0F5C7A]/20 rounded-xl transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-2 text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {classes.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-500 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            কোন শ্রেণি পাওয়া যায়নি। শুরু করতে একটি শ্রেণি যোগ করুন।
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      {isAddModalOpen && (
        <ClassModal
          title="নতুন শ্রেণি যোগ করুন"
          staffList={staffList}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddClass}
        />
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <ClassModal
          title="শ্রেণি সম্পাদনা করুন"
          initialValue={editingClass.name}
          initialTeacherIds={editingClass.teacherIds || []}
          staffList={staffList}
          onClose={() => setEditingClass(null)}
          onSave={handleUpdateClass}
        />
      )}
    </div>
  );
};

interface ClassModalProps {
  title: string;
  initialValue?: string;
  initialTeacherIds?: string[];
  staffList: any[];
  onClose: () => void;
  onSave: (name: string, teacherIds: string[]) => void;
}

const ClassModal = React.memo<ClassModalProps>(({
  title,
  initialValue = "",
  initialTeacherIds = [],
  staffList,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialValue);
  const [teacherIds, setTeacherIds] = useState<string[]>(initialTeacherIds);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("শ্রেণির নাম প্রয়োজন");
      return;
    }
    onSave(name.trim(), teacherIds);
  };

  const toggleTeacher = (id: string) => {
    setTeacherIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-white/20">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              শ্রেণির নাম
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-premium"
              placeholder="শ্রেণির নাম লিখুন"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              শিক্ষক নির্ধারণ করুন
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
              {staffList.filter(s => {
                const r = s.roles?.[s.organizationId] || s.role;
                return r !== "banned" && r !== "pending";
              }).map(staff => (
                <label key={staff.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teacherIds.includes(staff.id)}
                    onChange={() => toggleTeacher(staff.id)}
                    className="w-4 h-4 text-[#0F5C7A] rounded border-slate-300 focus:ring-[#0F5C7A]"
                  />
                  <span className="text-sm text-slate-700">
                    {staff.displayName || staff.email?.split('@')[0]}
                  </span>
                </label>
              ))}
              {staffList.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">কোনো শিক্ষক পাওয়া যায়নি</p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-[#EF4444]">{error}</p>}

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center px-6 py-2 rounded-xl font-bold"
            >
              <X className="w-5 h-5 mr-2" />
              বাতিল
            </button>
            <button
              type="submit"
              className="btn-primary px-6 py-2"
            >
              সংরক্ষণ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default Classes;
