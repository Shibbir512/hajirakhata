import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-rose-600">
            <AlertTriangle className="w-8 h-8" />
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          </div>
          <p className="text-slate-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              বাতিল
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
            >
              নিশ্চিত করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
