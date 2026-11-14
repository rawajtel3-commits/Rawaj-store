import React, { useState } from 'react';
import { Smartphone, Download, X, Share, MoreVertical, CheckCircle2, ChevronLeft } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'sheet';
  onAfterAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  onAfterAction,
}) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Automatically suppress install UI when running in standalone Android/iOS app mode
  if (isInstalled) {
    return null;
  }

  const handleTriggerInstall = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onAfterAction) {
        onAfterAction();
      }
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'sheet' ? (
        <button
          type="button"
          onClick={handleTriggerInstall}
          className="col-span-2 w-full min-h-[46px] bg-[#551465] hover:bg-brand-700 text-white border border-brand-400/40 rounded-2xl px-3.5 py-2.5 flex items-center justify-between font-bold text-xs shadow-lg transition"
        >
          <span className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-amber-300" />
            </span>
            <span className="text-right">
              <span className="block font-extrabold text-white">
                {isInstallable ? 'تثبيت تطبيق أندرويد الآن' : 'تثبيت متجر رواج كتطبيق هاتف'}
              </span>
              <span className="block text-[10px] text-white/85 font-normal">
                تشغيل بملء الشاشة ودعم التصفح دون اتصال
              </span>
            </span>
          </span>
          <ChevronLeft className="w-4 h-4 text-amber-300 shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleTriggerInstall}
          className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 text-xs font-extrabold shadow-md shadow-emerald-950/30 transition shrink-0"
          title="تثبيت تطبيق أندرويد / الهاتف"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">
            {isAndroid || isInstallable ? 'تثبيت التطبيق' : 'نسخة التطبيق'}
          </span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="تثبيت تطبيق متجر رواج للأندرويد والهاتف"
        >
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-[#551465]/60 p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#551465] border border-brand-400/40 flex items-center justify-center text-white shrink-0 shadow-lg">
                  <Smartphone className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    تثبيت متجر رواج كتطبيق أندرويد
                  </h3>
                  <p className="text-xs text-slate-400">
                    أيقونة على الشاشة الرئيسية وواجهة تطبيق مستقلة بدون شريط المتصفح
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs text-slate-200 leading-relaxed">
                <p className="font-extrabold text-brand-300">خطوات التثبيت على iPhone / iPad (Safari):</p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#551465] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>اضغط على زر <strong className="text-white inline-flex items-center gap-1">المشاركة <Share className="w-3.5 h-3.5 inline text-brand-300" /></strong> في شريط Safari.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#551465] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                  <span>مرّر للأسفل واختر <strong className="text-white">إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>.</span>
                </p>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs text-slate-200 leading-relaxed">
                <p className="font-extrabold text-emerald-400">
                  خطوات التثبيت على هاتف أندرويد (Google Chrome):
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#551465] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>
                    افتح المتجر في متصفح <strong className="text-white">Chrome</strong> على جهاز الأندرويد، ثم اضغط على قائمة النقاط الثلاث <strong className="text-white inline-flex items-center gap-0.5"><MoreVertical className="w-3.5 h-3.5 inline text-amber-300" /></strong> أعلى الشاشة.
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#551465] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                  <span>
                    اختر <strong className="text-white">تثبيت التطبيق (Install app)</strong> أو <strong className="text-white">الإضافة إلى الشاشة الرئيسية</strong> ليتم تثبيته كتطبيق أندرويد مستقل.
                  </span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>يعمل بوضع ملء الشاشة (Standalone)</span>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>تخزين مؤقت للتصفح دون اتصال</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-extrabold transition"
            >
              فهمت، إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};
