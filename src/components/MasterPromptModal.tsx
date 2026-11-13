import React, { useState } from 'react';
import { X, Copy, Check, FileCode2, Sparkles, Terminal } from 'lucide-react';
import { MASTER_PROMPT_TEXT } from '../data/initialData';

interface MasterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterPromptModal: React.FC<MasterPromptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(MASTER_PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden my-auto relative">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <FileCode2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>البرومبت الهندسي المعتمد (Master System Prompt)</span>
              </h3>
              <span className="text-[10px] text-slate-400">التعليمات الهندسية الدقيقة التي تم بناء وتطوير المتجر استناداً عليها</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Prompt Box */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/90 text-xs sm:text-sm font-mono text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-inner">
            {MASTER_PROMPT_TEXT}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Terminal className="w-4 h-4 text-emerald-400" /> جاهز للاستخدام والنسخ الفوري
          </span>

          <button
            onClick={handleCopy}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>تم النسخ إلى الحافظة!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ البرومبت الكامل</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
