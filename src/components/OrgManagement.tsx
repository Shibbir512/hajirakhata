import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  LogIn,
  LogOut,
  Plus,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Building,
  Users,
  CheckCircle2,
  BookOpen,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import WhatsAppSupportButton from "./WhatsAppSupportButton";

interface OrgManagementProps {
  onCreateOrg: (name: string) => Promise<string | null>;
  onJoinOrg: (id: string) => Promise<string | null>;
  onRemoveVisitedOrg?: (id: string) => Promise<void>;
  onLogout: () => void;
  visitedOrgs?: { [key: string]: string };
  onSuccess?: () => void;
}

const OrgManagement: React.FC<OrgManagementProps> = ({
  onCreateOrg,
  onJoinOrg,
  onRemoveVisitedOrg,
  onLogout,
  visitedOrgs = {},
  onSuccess,
}) => {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      let result;
      if (mode === "create") {
        result = await onCreateOrg(input);
      } else {
        result = await onJoinOrg(input);
      }
      if (result && onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async (id: string) => {
    setLoading(true);
    try {
      const result = await onJoinOrg(id);
      if (result && onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOrg = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      if (onRemoveVisitedOrg) {
        await onRemoveVisitedOrg(id);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasVisitedOrgs = Object.keys(visitedOrgs).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3A4C] via-[#0F5C7A] to-[#062430] flex flex-col md:flex-row overflow-hidden relative selection:bg-white/20">

      {/* Background decorative elements */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
      />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#14B8A6]/20 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#14B8A6]/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* LEFT PANEL — Branding (desktop only) */}
      <div className="hidden md:flex flex-col w-[45%] lg:w-[50%] relative z-10 p-12 lg:p-16 xl:p-20 justify-between">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3"
        >
          <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20">
            <img src="/icon.png" alt="হাজিরা খাতা লোগো" className="w-8 h-8 object-contain" />
          </div>
          <span className="font-extrabold text-2xl text-white tracking-tight">হাজিরা খাতা</span>
        </motion.div>

        {/* Central Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative w-full max-w-[380px] mx-auto flex items-center justify-center my-12"
        >
          <div className="absolute w-[260px] h-[260px] bg-gradient-to-tr from-teal-400/20 to-teal-200/10 rounded-full blur-2xl" />
          <div className="absolute w-[230px] h-[230px] border border-white/20 rounded-full" />
          <div className="absolute w-[270px] h-[270px] border border-white/10 rounded-full border-dashed" />

          <motion.div animate={{ y: [-15, 15, -15], x: [-5, 5, -5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] right-[15%] w-12 h-12 border-2 border-white/30 rounded-full backdrop-blur-sm" />
          <motion.div animate={{ y: [15, -15, 15], x: [5, -5, 5] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[20%] left-[10%] w-16 h-16 border-2 border-white/20 rounded-full backdrop-blur-sm" />
          <motion.div animate={{ y: [-10, 10, -10], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-[40%] left-[5%] w-6 h-6 bg-white/20 rounded-full" />
          <motion.div animate={{ y: [10, -10, 10], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute bottom-[10%] right-[20%] w-8 h-8 bg-teal-400/30 rounded-full" />

          <div className="relative z-10 flex flex-col items-center">
            <Building2 className="w-36 h-36 text-white drop-shadow-2xl" strokeWidth={1.5} />
            <BookOpen className="w-20 h-20 text-teal-100/80 drop-shadow-2xl -mt-4" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-2 tracking-tight drop-shadow-lg">
            প্রতিষ্ঠান সেটআপ
          </h2>
          <p className="text-base text-teal-100/75 font-medium mb-8">
            আপনার প্রতিষ্ঠান নির্বাচন করুন বা নতুন তৈরি করুন
          </p>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: Users, label: "ছাত্র-ছাত্রী ব্যবস্থাপনা" },
              { icon: CheckCircle2, label: "উপস্থিতি ট্র্যাকিং" },
              { icon: BookOpen, label: "ফলাফল প্রকাশ" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg">
                <div className="bg-teal-400/20 p-1.5 rounded-full">
                  <Icon className="w-4 h-4 text-teal-200" />
                </div>
                <span className="text-white text-sm font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative z-20 min-h-[100dvh] md:min-h-screen overflow-y-auto pb-20 md:pb-12">

        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden w-full flex flex-col items-center mb-8 mt-4"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
              <img src="/icon.png" alt="হাজিরা খাতা" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">হাজিরা খাতা</span>
          </div>
          <div className="relative flex items-center justify-center mb-2">
            <div className="absolute w-[140px] h-[140px] bg-gradient-to-tr from-teal-400/20 to-teal-200/10 rounded-full blur-xl" />
            <Building2 className="relative w-20 h-20 text-white/80 drop-shadow-xl" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-8"
        >
          {/* Card Header */}
          <div className="text-center mb-7">
            <div className="w-16 h-16 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">প্রতিষ্ঠান সেটআপ</h1>
            <p className="text-white/60 mt-1.5 text-sm leading-relaxed">
              নতুন প্রতিষ্ঠান যুক্ত করুন অথবা বিদ্যমান প্রতিষ্ঠানে যোগ দিন।
            </p>
          </div>

          <AnimatePresence mode="wait">
            {mode === "select" ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Recent Orgs */}
                {hasVisitedOrgs && (
                  <div>
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                      সাম্প্রতিক প্রতিষ্ঠানসমূহ
                    </h3>
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                      {Object.entries(visitedOrgs).map(([id, name]) => (
                        <div
                          key={id}
                          className="group relative flex items-center bg-white/8 hover:bg-white/15 border border-white/15 hover:border-[#14B8A6]/50 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                          <button
                            onClick={() => handleQuickJoin(id)}
                            disabled={loading}
                            className="flex-1 flex items-center justify-between p-4 text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-[#14B8A6]/15 border border-[#14B8A6]/25 flex items-center justify-center shrink-0">
                                <Building className="w-4 h-4 text-[#14B8A6]" />
                              </div>
                              <div className="min-w-0">
                                <span className="block font-bold text-white text-sm truncate group-hover:text-[#14B8A6] transition-colors">
                                  {name}
                                </span>
                                <span className="block text-xs text-white/40 font-mono mt-0.5 truncate">
                                  {id}
                                </span>
                              </div>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-[#14B8A6] flex items-center justify-center transition-all duration-300 ml-2 shrink-0 border border-white/10 group-hover:border-transparent">
                              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white" />
                            </div>
                          </button>
                          <div className="pr-3 pl-1 flex items-center">
                            <button
                              onClick={(e) => handleRemoveOrg(e, id)}
                              disabled={loading}
                              className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                              title="তালিকা থেকে মুছুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-xs text-white/30 font-medium">অথবা</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("create")}
                    className="group flex flex-col items-center justify-center p-5 bg-[#14B8A6]/15 hover:bg-[#14B8A6]/25 border border-[#14B8A6]/30 hover:border-[#14B8A6]/60 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/20 group-hover:bg-[#14B8A6]/30 flex items-center justify-center mb-3 transition-colors">
                      <Plus className="w-5 h-5 text-[#14B8A6]" />
                    </div>
                    <span className="text-sm font-bold text-white">নতুন তৈরি করুন</span>
                    <span className="text-xs text-white/40 mt-0.5">নতুন প্রতিষ্ঠান</span>
                  </button>

                  <button
                    onClick={() => setMode("join")}
                    className="group flex flex-col items-center justify-center p-5 bg-white/8 hover:bg-white/15 border border-white/15 hover:border-white/30 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/15 flex items-center justify-center mb-3 transition-colors">
                      <LogIn className="w-5 h-5 text-white/70 group-hover:text-white" />
                    </div>
                    <span className="text-sm font-bold text-white">যোগ দিন</span>
                    <span className="text-xs text-white/40 mt-0.5">বিদ্যমান প্রতিষ্ঠান</span>
                  </button>
                </div>

                {/* Sign out */}
                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-white/40 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/5"
                  >
                    <LogOut className="w-4 h-4" />
                    সাইন আউট
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Create / Join Form */
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Mode indicator */}
                <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
                  <div className={`w-2 h-2 rounded-full ${mode === "create" ? "bg-[#14B8A6]" : "bg-white/50"}`} />
                  {mode === "create" ? "নতুন প্রতিষ্ঠান তৈরি" : "বিদ্যমান প্রতিষ্ঠানে যোগ"}
                </div>

                {/* Input */}
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2">
                    {mode === "create" ? "প্রতিষ্ঠানের নাম" : "প্রতিষ্ঠানের নাম বা আইডি"}
                  </label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={mode === "create" ? "যেমন: আমার প্রতিষ্ঠান" : "যেমন: আমার প্রতিষ্ঠান বা আইডি"}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 focus:border-[#14B8A6]/60 focus:bg-white/15 rounded-2xl text-white placeholder-white/30 outline-none transition-all duration-300 text-sm font-medium"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setMode("select"); setInput(""); }}
                    className="flex-1 h-12 flex items-center justify-center gap-2 px-4 bg-white/8 hover:bg-white/15 border border-white/15 hover:border-white/30 text-white/70 hover:text-white rounded-2xl font-bold transition-all duration-300 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    ফিরে যান
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="flex-1 h-12 flex items-center justify-center gap-2 px-4 bg-gradient-to-r from-[#14B8A6] to-[#0F5C7A] hover:from-[#14B8A6]/90 hover:to-[#0F5C7A]/90 text-white rounded-2xl font-bold shadow-lg shadow-[#14B8A6]/20 hover:shadow-[#14B8A6]/30 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> প্রক্রিয়াধীন...</>
                    ) : mode === "create" ? "তৈরি করুন" : "যোগ দিন"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* WhatsApp Support */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-md mt-4"
        >
          <WhatsAppSupportButton
            variant="button"
            label="সহায়তার জন্য হোয়াটসঅ্যাপে যোগাযোগ করুন"
            className="w-full !rounded-2xl !py-3.5 !text-sm"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default OrgManagement;
