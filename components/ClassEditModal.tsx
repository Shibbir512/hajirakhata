import React, { useState, useEffect, useRef } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface ClassEditModalProps {
  onClose: () => void;
  onSave: (name: string) => void;
  initialName?: string;
}

const ClassEditModal: React.FC<ClassEditModalProps> = ({ onClose, onSave, initialName = '' }) => {
  const [name, setName] = useState(initialName);
  const title = initialName ? 'শ্রেণির নাম পরিবর্তন করুন' : 'নতুন শ্রেণি যোগ করুন';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input field when the modal opens
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
        <label htmlFor="class-name" className="block text-sm font-medium text-gray-700">
          শ্রেণির নাম
        </label>
        <input
          ref={inputRef}
          type="text"
          id="class-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="যেমন: ষষ্ঠ শ্রেণি"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>বাতিল করুন</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>সংরক্ষণ করুন</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ClassEditModal;
