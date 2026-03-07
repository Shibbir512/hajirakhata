import React, { useState, useRef } from 'react';
import type { ClassData } from '../types';
import Button from './common/Button';
import { ArrowLeftIcon, EditIcon, TrashIcon, PlusIcon, UsersIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from './common/Icons';
import ClassEditModal from './ClassEditModal';

interface ManageClassesProps {
  classes: ClassData[];
  onAddClass: (name: string) => void;
  onUpdateClass: (id: string, name: string) => void;
  onDeleteClass: (id: string) => void;
  onManageStudents: (classId: string) => void;
  onBack: () => void;
}

const ManageClasses: React.FC<ManageClassesProps> = ({ classes, onAddClass, onUpdateClass, onDeleteClass, onBack, onManageStudents }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAddModal = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cls: ClassData) => {
    setEditingClass(cls);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClass(null);
  };

  const handleSave = (name: string) => {
    if (editingClass) {
      onUpdateClass(editingClass.id, name);
    } else {
      onAddClass(name);
    }
  };
  
  const handleDelete = (id: string, name: string) => {
      if (window.confirm(`আপনি কি '${name}' শ্রেণিটি মুছে ফেলতে চান? এর সাথে সম্পর্কিত সকল ছাত্র/ছাত্রী এবং হাজিরা মুছে যাবে। এটি ফেরানো যাবে না।`)) {
          onDeleteClass(id);
      }
  };

  const handleBackup = () => {
    const data = {
      classes: localStorage.getItem('studentAttendance_classes'),
      students: localStorage.getItem('studentAttendance_students'),
      attendance: localStorage.getItem('studentAttendance_attendance'),
      reminders: localStorage.getItem('studentAttendance_reminders'),
    };
    
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.classes) localStorage.setItem('studentAttendance_classes', data.classes);
        if (data.students) localStorage.setItem('studentAttendance_students', data.students);
        if (data.attendance) localStorage.setItem('studentAttendance_attendance', data.attendance);
        if (data.reminders) localStorage.setItem('studentAttendance_reminders', data.reminders);
        
        alert('ডাটা সফলভাবে রিস্টোর করা হয়েছে! পেজটি রিফ্রেশ করা হচ্ছে...');
        window.location.reload();
      } catch (error) {
        console.error('Error restoring data:', error);
        alert('ডাটা রিস্টোর করতে সমস্যা হয়েছে। ফাইলটি সঠিক কিনা যাচাই করুন।');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-700">শ্রেণি পরিচালনা করুন</h2>
          <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0">
            <Button onClick={handleBackup} variant="secondary" size="sm" title="ব্যাকআপ ডাউনলোড করুন">
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                ব্যাকআপ
            </Button>
            <Button onClick={handleRestoreClick} variant="secondary" size="sm" title="ব্যাকআপ থেকে রিস্টোর করুন">
                <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                রিস্টোর
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleRestoreFile} 
                className="hidden" 
                accept=".json"
            />
            <Button onClick={handleOpenAddModal} size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                নতুন শ্রেণি
            </Button>
            <Button onClick={onBack} variant="secondary" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              ফিরে যান
            </Button>
          </div>
        </div>
        
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {classes.length > 0 ? (
                classes.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 rounded-md border bg-gray-50">
                        <p className="font-medium text-gray-800 truncate flex-1 min-w-0">{cls.name}</p>
                        <div className="flex gap-2 flex-shrink-0">
                             <Button size="sm" variant="ghost" onClick={() => onManageStudents(cls.id)} title="ছাত্র/ছাত্রী পরিচালনা">
                                <UsersIcon className="w-5 h-5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(cls)} title="নাম পরিবর্তন করুন">
                                <EditIcon className="w-5 h-5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(cls.id, cls.name)} title="মুছে ফেলুন">
                                <TrashIcon className="w-5 h-5 text-red-500 hover:text-red-700" />
                            </Button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center p-10">
                    <p className="text-gray-500">কোনো শ্রেণি যোগ করা হয়নি। শুরু করতে 'নতুন শ্রেণি' বাটনে ক্লিক করুন।</p>
                </div>
            )}
        </div>
      </div>

      {isModalOpen && (
        <ClassEditModal 
            onClose={handleCloseModal}
            onSave={handleSave}
            initialName={editingClass?.name}
        />
      )}
    </>
  );
};

export default ManageClasses;