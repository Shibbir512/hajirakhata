import React, { useState, useEffect, useRef } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface StudentAddModalProps {
  onClose: () => void;
  onSave: (name: string, roll: number) => void;
  existingRolls: number[];
}

const StudentAddModal: React.FC<StudentAddModalProps> = ({ onClose, onSave, existingRolls }) => {
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [error, setError] = useState('');
  const title = 'নতুন ছাত্র/ছাত্রী যোগ করুন';
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSave = () => {
    setError('');
    const rollNumber = parseInt(roll, 10);

    if (!name.trim()) {
      setError('অনুগ্রহ করে ছাত্র/ছাত্রীর নাম লিখুন।');
      return;
    }
    if (isNaN(rollNumber) || rollNumber <= 0) {
      setError('অনুগ্রহ করে একটি সঠিক রোল নম্বর লিখুন।');
      return;
    }
    if (existingRolls.includes(rollNumber)) {
      setError('এই রোল নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে।');
      return;
    }
    
    onSave(name.trim(), rollNumber);
    onClose();
  };
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
        handleSave();
    }
  }

  return (
    <Modal onClose={onClose} title={title}>
      <div className="p-6">
        <div className="space-y-4">
            <div>
                <label htmlFor="student-name" className="block text-sm font-medium text-gray-700">
                  ছাত্র/ছাত্রীর নাম
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="student-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="যেমন: আবির আহমেদ"
                />
            </div>
            <div>
                <label htmlFor="student-roll" className="block text-sm font-medium text-gray-700">
                  রোল নম্বর
                </label>
                <input
                  type="number"
                  id="student-roll"
                  value={roll}
                  onChange={(e) => setRoll(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="যেমন: 1"
                />
            </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>বাতিল করুন</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !roll}>সংরক্ষণ করুন</Button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentAddModal;
