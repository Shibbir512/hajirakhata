import React from "react";
import { createPortal } from "react-dom";
import { X, Database } from "lucide-react";
import { DataBackupCard } from "./DataBackupCard";

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[6px] p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111C2E] rounded-[24px] shadow-2xl flex flex-col overflow-hidden my-8 max-h-[90vh] border border-transparent dark:border-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F5C7A] to-emerald-700 h-[64px] flex items-center justify-between px-6 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold">ডাটাবেজ ব্যাকআপ ও এক্সপোর্ট</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          <DataBackupCard className="!p-4 sm:!p-6 !border-0 !shadow-none" />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DataBackupModal;
