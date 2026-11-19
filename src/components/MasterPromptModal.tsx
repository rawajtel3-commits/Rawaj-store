import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileCode2,
  Terminal,
  ShieldAlert,
  Lock,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import type { MasterPromptMetadata } from '../types';

interface MasterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterPromptModal: React.FC<MasterPromptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MasterPromptMetadata | null>(null);
  const [errorState, setErrorState] = useState<{
    status: number;
    code: string;
    message: string;
    accessRefId?: string;
  } | null>(null);

  const loadPromptFromServer = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await fetch('/api/admin/master-prompt', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'X-Requested-With': 'RawajApp' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPromptText(null);
        setMetadata(null);
        setErrorState({
          status: res.status,
          code: data.code || (res.status === 403 ? 'PROMOTER_ADMIN_REQUIRED' : 'AUTH_REQUIRED'),
          message:
            data.error ||
            'الوصول مرفوض: عرض البرومبت الهندسي مقتصر على أدمن المروّج (promoter_admin) فقط.',
          accessRefId: data.accessRefId,
        });
        return;
      }
      setPromptText(typeof data.prompt === 'string' ? data.prompt : null);
      setMetadata(data.metadata || null);
    } catch {
      setPromptText(null);
      setMetadata(null);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: 'تعذر التحقق من صلاحية الوصول للخادم حالياً.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      // Wipe decrypted secret from memory immediately when closed
      setPromptText(null);
      setMetadata(null);
      setErrorState(null);
      setCopied(false);
      return;
    }
    void loadPromptFromServer();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden my-auto relative">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>البرومبت الهندسي المعتمد (Master System Prompt)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold">
                  promoter_admin فقط
                </span>
              </h3>
              <span className="text-[10px] text-slate-400">
                مشفّر على الخادم (AES-256-GCM) ويتم التحقق من الجلسة والصلاحية قبل كل عملية عرض
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/90 text-xs sm:text-sm text-slate-200 leading-relaxed">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-300">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
              <p className="text-xs font-bold">جاري التحقق من تفويض الخادم وفك التشفير الآمن...</p>
            </div>
          ) : errorState || !promptText ? (
            <div className="py-10 px-6 bg-rose-950/30 border border-rose-500/40 rounded-2xl text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-extrabold text-rose-200 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>غير مصرّح بالوصول ({errorState?.status || 403})</span>
                </h4>
                <p className="text-xs text-rose-100/90 max-w-md mx-auto leading-relaxed">
                  {errorState?.message ||
                    'هذا المورد مخفي ومحجوب عن صلاحيات أدمن مستخدم التطبيق ومحصور على أدمن المروّج.'}
                </p>
                {errorState?.accessRefId && (
                  <p className="text-[11px] font-mono text-rose-300/80 pt-1" dir="ltr">
                    Audit Ref: {errorState.accessRefId}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 transition"
              >
                إغلاق النافذة
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {metadata && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5 font-mono" dir="ltr">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    Key v{metadata.keyVersion} ({metadata.keyId})
                  </span>
                  <span className="font-mono text-indigo-300" dir="ltr">
                    Ref: {metadata.accessRefId}
                  </span>
                </div>
              )}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-inner font-mono whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
                {promptText}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Terminal className="w-4 h-4 text-emerald-400" />
            {promptText
              ? 'محتوى مُسترجع عبر الخادم ومسجّل في سجل التدقيق'
              : 'محمي بسياسة الأقل صلاحية (RBAC)'}
          </span>

          {promptText && (
            <button
              type="button"
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
          )}
        </div>
      </div>
    </div>
  );
};
