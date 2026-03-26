import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { Plus, Edit, Trash2, X, Loader2, Users } from "lucide-react";
import { ClassData } from "../types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const Classes: React.FC = () => {
  const navigate = useNavigate();
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold gradient-text tracking-tight">শ্রেণি</h2>
        {(role === "admin" || role === "moderator") && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isAdding}
            className="btn-primary w-full sm:w-auto h-[42px] px-4 text-sm font-bold shadow-sm whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
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
              onClick={() => navigate(`/classes/${cls.id}`)}
              className="bg-white border border-[#E5E7EB] hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              style={{ borderRadius: '18px', padding: '20px', boxShadow: '0px 10px 25px rgba(0,0,0,0.08)' }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 
                    className="text-[20px] font-bold tracking-tight"
                    style={{ color: index % 2 === 0 ? '#0c8fad' : '#0f89be' }}
                  >
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[6px] p-4">
      <div className="w-[92%] max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          {/* Body */}
          <div className="p-5 space-y-5 overflow-y-auto max-h-[50vh]">
            <div>
              <label className="block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">
                শ্রেণির নাম
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[52px] px-4 bg-[#F4F7FB] border border-[#E5E7EB] rounded-[16px] text-[14px] text-[#1F2937] focus:border-[#0F5C7A] focus:ring-2 focus:ring-[#0F5C7A]/20 transition-all"
                placeholder="শ্রেণির নাম লিখুন"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wider">
                শিক্ষক নির্ধারণ করুন
              </label>
              <div className="max-h-40 overflow-y-auto border border-[#E5E7EB] rounded-[16px] p-2 space-y-1 bg-[#F4F7FB]">
                {staffList.filter(s => {
                  const r = s.roles?.[s.organizationId] || s.role;
                  return r !== "banned" && r !== "pending";
                }).map(staff => (
                  <label key={staff.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-[12px] cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={teacherIds.includes(staff.id)}
                      onChange={() => toggleTeacher(staff.id)}
                      className="w-5 h-5 text-[#0F5C7A] rounded border-[#E5E7EB] focus:ring-[#0F5C7A]"
                    />
                    <span className="text-[14px] text-[#1F2937]">
                      {staff.displayName || staff.email?.split('@')[0]}
                    </span>
                  </label>
                ))}
                {staffList.length === 0 && (
                  <p className="text-[13px] text-[#6B7280] text-center py-2">কোনো শিক্ষক পাওয়া যায়নি</p>
                )}
              </div>
            </div>

            {error && <p className="text-[13px] text-[#EF4444]">{error}</p>}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#E5E7EB] flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#F3F4F6] text-[#374151] h-[48px] rounded-[14px] font-bold hover:bg-[#E5E7EB] transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#0F5C7A] text-white h-[48px] rounded-[14px] font-bold hover:bg-[#0D4D66] transition-colors"
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
