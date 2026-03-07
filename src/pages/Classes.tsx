import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useClasses } from "../hooks/useClasses";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { ClassData } from "../types";

const Classes: React.FC = () => {
  const { user, orgId } = useAuth();
  const { classes, addClass, updateClassName, deleteClass } = useClasses(
    orgId,
    user,
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
        <h2 className="text-2xl font-bold text-slate-800">শ্রেণি</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          শ্রেণি যোগ করুন
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {cls.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">আইডি: {cls.id}</p>
              </div>
              <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingClass(cls)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClass(cls.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
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
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="শ্রেণির নাম লিখুন"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
