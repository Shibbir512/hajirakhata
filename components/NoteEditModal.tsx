import React, { useState, useEffect, useRef } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface NoteEditModalProps {
  onClose: () => void;
  onSave: (note: string) => void;
  initialNote?: string;
}

const NoteEditModal: React.FC<NoteEditModalProps> = ({ onClose, onSave, initialNote = '' }) => {
  const [note, setNote] = useState(initialNote);
  const title = 'নোট যোগ/এডিট করুন';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSave = () => {
    onSave(note.trim());
    onClose();
  };

  return (
    <Modal onClose={onClose} title={title}>
      <div className="p-6">
        <label htmlFor="attendance-note" className="block text-sm font-medium text-gray-700">
          নোট
        </label>
        <textarea
          ref={textareaRef}
          id="attendance-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="যেমন: অভিভাবকের চিঠি, দেরিতে উপস্থিতি ইত্যাদি।"
          rows={4}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>বাতিল করুন</Button>
          <Button onClick={handleSave}>সংরক্ষণ করুন</Button>
        </div>
      </div>
    </Modal>
  );
};

export default NoteEditModal;
