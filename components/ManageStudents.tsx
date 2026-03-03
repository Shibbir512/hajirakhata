import React, { useState } from 'react';
import type { ClassData, Student } from '../types';
import Button from './common/Button';
import { ArrowLeftIcon, EditIcon, TrashIcon, PlusIcon, UserIcon } from './common/Icons';
import StudentEditModal from './StudentEditModal';
import StudentAddModal from './StudentAddModal';

interface ManageStudentsProps {
  classData: ClassData;
  students: Student[];
  onAddStudent: (classId: string, name: string, roll: number) => void;
  onUpdateStudentName: (studentId: string, newName: string) => void;
  onDeleteStudent: (studentId: string) => void;
  onBack: () => void;
}

const ManageStudents: React.FC<ManageStudentsProps> = ({ classData, students, onAddStudent, onUpdateStudentName, onDeleteStudent, onBack }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const handleSaveStudentName = (newName: string) => {
    if (editingStudent) {
        onUpdateStudentName(editingStudent.id, newName);
    }
  };

  const handleSaveNewStudent = (name: string, roll: number) => {
      onAddStudent(classData.id, name, roll);
  };

  const handleDelete = (student: Student) => {
    if (window.confirm(`আপনি কি '${student.name}' (রোল: ${student.roll}) কে মুছে ফেলতে চান? এর সাথে সম্পর্কিত সকল হাজিরাও মুছে যাবে। এটি ফেরানো যাবে না।`)) {
        onDeleteStudent(student.id);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-700">ছাত্র/ছাত্রী পরিচালনা</h2>
            <p className="text-gray-500">{classData.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0">
            <Button onClick={() => setIsAddModalOpen(true)} size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                নতুন ছাত্র/ছাত্রী
            </Button>
            <Button onClick={onBack} variant="secondary" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              ফিরে যান
            </Button>
          </div>
        </div>
        
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {students.length > 0 ? (
                students.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 rounded-md border bg-gray-50">
                        <div className="flex items-center gap-3">
                           <p className="font-medium text-gray-600 w-8 text-center">{student.roll}.</p>
                           <p className="font-medium text-gray-800">{student.name}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingStudent(student)} title="নাম পরিবর্তন করুন">
                                <EditIcon className="w-5 h-5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(student)} title="মুছে ফেলুন">
                                <TrashIcon className="w-5 h-5 text-red-500 hover:text-red-700" />
                            </Button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center p-10">
                    <p className="text-gray-500">এই শ্রেণিতে কোনো ছাত্র/ছাত্রী যোগ করা হয়নি।</p>
                </div>
            )}
        </div>
      </div>

      {isAddModalOpen && (
        <StudentAddModal
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleSaveNewStudent}
            existingRolls={students.map(s => s.roll)}
        />
      )}

      {editingStudent && (
        <StudentEditModal
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onSave={handleSaveStudentName}
        />
      )}
    </>
  );
};

export default ManageStudents;
