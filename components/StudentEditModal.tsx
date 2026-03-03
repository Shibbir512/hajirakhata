import React, { useState, useEffect, useRef } from 'react';
import type { Student } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface StudentEditModalProps {
  onClose: () => void;
  onSave: (name: string) => void;
  student: Student;
}

const StudentEditModal: React.FC<StudentEditModalProps> = ({ onClose, onSave, student }) => {
  const [name, setName] = useState(student.name);
  const title = 'ছাত্র/ছাত্রীর নাম পরিবর্তন করুন';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
        handleSave();
    }
  }

  return (
    <Modal onClose={onClose} title={title}>
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-2">রোল: {student.roll}</p>
        <label htmlFor="student-name" className="block text-sm font-medium text-gray-700">
          ছাত্র/ছাত্রীর নাম
        </label>
        <input
          ref={inputRef}
          type="text"
          id="student-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>বাতিল করুন</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>সংরক্ষণ করুন</Button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentEditModal;