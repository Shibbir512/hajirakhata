import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { ClassData } from "../types";

const Classes: React.FC = () => {
  const { user, orgId, role } = useAuth();
  const { classes, addClass, updateClassName, deleteClass } = useClasses(
    orgId,
    user,
    role,
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);

  const handleAddClass = (name: string) => {
    addClass(name);
    setIsAddModalOpen(false);
  };

  const handleUpdateClass = (name: string) => {
    if (editingClass) {
      updateClassName(editingClass.id, name);
      setEditingClass(null);
    }
  };

  const handleDeleteClass = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this class? All students and attendance records associated with this class might be affected.",
      )
    ) {
      deleteClass(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold gradient-text tracking-tight">শ্রেণি</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center px-4 py-2 rounded-xl font-bold"
        >
          <Plus className="w-4 h-4 mr-2" />
          শ্রেণি যোগ করুন
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls, index) => {
          const colors = [
            { bg: "bg-orange-50/80", border: "border-orange-100", text: "text-orange-700", sub: "text-orange-500" },
            { bg: "bg-emerald-50/80", border: "border-emerald-100", text: "text-emerald-700", sub: "text-emerald-500" },
            { bg: "bg-blue-50/80", border: "border-blue-100", text: "text-blue-700", sub: "text-blue-500" },
            { bg: "bg-amber-50/80", border: "border-amber-100", text: "text-amber-700", sub: "text-amber-500" },
            { bg: "bg-rose-50/80", border: "border-rose-100", text: "text-rose-700", sub: "text-rose-500" },
            { bg: "bg-indigo-50/80", border: "border-indigo-100", text: "text-indigo-700", sub: "text-indigo-500" },
          ];
          const color = colors[index % colors.length];

          return (
            <div
              key={cls.id}
              className={`p-6 rounded-3xl border ${color.bg} ${color.border} hover:-translate-y-1 transition-all duration-300 group shadow-sm hover:shadow-md`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`text-xl font-bold ${color.text} tracking-tight`}>
                    {cls.name}
                  </h3>
                  <p className={`text-sm ${color.sub} mt-1 font-mono opacity-80`}>আইডি: {cls.id}</p>
                </div>
                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingClass(cls)}
                    className={`p-2 ${color.text} hover:bg-white/50 rounded-xl transition-colors`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls.id)}
                    className={`p-2 ${color.text} hover:bg-white/50 rounded-xl transition-colors`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddClass}
        />
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <ClassModal
          title="শ্রেণি সম্পাদনা করুন"
          initialValue={editingClass.name}
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
  onClose: () => void;
  onSave: (name: string) => void;
}

const ClassModal = React.memo<ClassModalProps>(({
  title,
  initialValue = "",
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("শ্রেণির নাম প্রয়োজন");
      return;
    }
    onSave(name.trim());
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-6 py-2"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="bg-[#4CAF50] hover:bg-[#43a047] text-white shadow-md hover:shadow-lg transition-all duration-300 px-6 py-2 rounded-xl font-bold"
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
