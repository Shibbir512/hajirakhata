import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = title || "student-photo";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
          >
            {/* Header */}
            <div className="absolute top-[-50px] right-0 flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="Download"
              >
                <Download className="w-6 h-6" />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Image Container */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl bg-slate-900">
              <img
                src={imageUrl}
                alt={title || "Full size"}
                className="max-w-full max-h-[80vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {title && (
              <div className="mt-4 text-white text-center">
                <h3 className="text-lg font-bold">{title}</h3>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ImageModal;
