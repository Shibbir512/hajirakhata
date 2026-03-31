import React from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 backdrop-blur-[6px] p-4">
      <div className="w-[92%] max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0F5C7A] to-[#14B8A6] h-[70px] flex items-center justify-between px-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-[56px] h-[56px] rounded-full bg-white/15 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-white" />
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

        {/* Body */}
        <div className="p-5">
          <p className="text-[14px] text-[#6B7280]">{message}</p>
        </div>
        
        {/* Footer */}
        <div className="p-5 border-t border-[#E5E7EB] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-[#F3F4F6] text-[#374151] h-[48px] rounded-[14px] font-bold hover:bg-[#E5E7EB] transition-colors"
          >
            বাতিল
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 bg-[#EF4444] text-white h-[48px] rounded-[14px] font-bold hover:bg-[#DC2626] transition-colors"
          >
            নিশ্চিত করুন
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationDialog;
