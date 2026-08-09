import React from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface WhatsAppSupportButtonProps {
  message?: string;
  variant?: "floating" | "card" | "button" | "badge" | "inline";
  label?: string;
  className?: string;
}

export const WhatsAppSupportButton: React.FC<WhatsAppSupportButtonProps> = ({
  message = "আসসালামু আলাইকুম, হাজিরা খাতা অ্যাপ সম্পর্কে সহায়তা প্রয়োজন।",
  variant = "button",
  label = "হোয়াটসঅ্যাপে যোগাযোগ করুন",
  className = "",
}) => {
  const { supportWhatsApp } = useAuth();

  // Format phone number cleanly (remove + or spaces)
  const formattedNumber = (supportWhatsApp || "8801700000000").replace(/[^\d]/g, "");
  const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

  if (variant === "floating") {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-lg hover:shadow-xl font-bold transition-all transform hover:-translate-y-1 active:scale-95 group ${className}`}
        title="হোয়াটসঅ্যাপে যোগাযোগ করুন"
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 fill-white text-[#25D366]" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </div>
        <span className="text-sm font-extrabold pr-1 hidden sm:inline">{label}</span>
      </a>
    );
  }

  if (variant === "card") {
    return (
      <div className={`bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3 text-emerald-900">
          <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            <MessageCircle className="w-6 h-6 fill-white text-[#25D366]" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-950 text-sm sm:text-base">সহায়তা বা যেকোনো তথ্যের জন্য</h4>
            <p className="text-xs text-emerald-700">হোয়াটসঅ্যাপে আমাদের সাথে সরাসরি কথা বলুন</p>
          </div>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow duration-200"
        >
          <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
          <span>{label}</span>
        </a>
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-all ${className}`}
      >
        <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
        <span>{label}</span>
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-[#25D366] hover:text-[#1da851] font-bold transition-colors ${className}`}
      >
        <MessageCircle className="w-4 h-4 fill-[#25D366] text-white" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${className}`}
    >
      <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
      <span>{label}</span>
    </a>
  );
};

export default WhatsAppSupportButton;
