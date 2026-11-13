import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Lock,
  RotateCcw,
  ShoppingBag,
  Search,
  Star,
  Download,
  Layers,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { WhiteLabelTenant } from '../../types';
import { MULTI_DPI_SPECS } from '../../utils/whiteLabel';

export type PreviewScreenMode = 'splash' | 'storefront' | 'multi-dpi' | 'app-stores';

interface DevicePreviewSimulatorProps {
  tenant: WhiteLabelTenant;
  iconPreviewUrl?: string;
  splashPreviewUrl?: string;
  previewMode: PreviewScreenMode;
  onChangePreviewMode: (mode: PreviewScreenMode) => void;
}

export const DevicePreviewSimulator: React.FC<DevicePreviewSimulatorProps> = ({
  tenant,
  iconPreviewUrl,
  splashPreviewUrl,
  previewMode,
  onChangePreviewMode,
}) => {
  const [splashKey, setSplashKey] = useState(0);
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [storePlatform, setStorePlatform] = useState<'google_play' | 'app_store'>('google_play');
  const [iconMask, setIconMask] = useState<'squircle' | 'circle' | 'square'>('squircle');

  const resolvedIcon = iconPreviewUrl || tenant.iconAsset?.cdnUrl;
  const resolvedSplash = splashPreviewUrl || tenant.splashAsset?.cdnUrl || resolvedIcon;

  const maskClass =
    iconMask === 'circle'
      ? 'rounded-full'
      : iconMask === 'square'
      ? 'rounded-lg'
      : 'rounded-[22%]';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-300" />
            <span>المعاينة الفورية متعددة الشاشات</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            تحديث لحظي للواجهة، شاشة البدء، كثافات الأيقونات، ومحاكاة متاجر التطبيقات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
          {[
            { id: 'storefront', label: 'واجهة التطبيق' },
            { id: 'splash', label: 'شاشة البدء' },
            { id: 'multi-dpi', label: 'الأيقونات Multi-DPI' },
            { id: 'app-stores', label: 'متاجر التطبيقات' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangePreviewMode(tab.id as PreviewScreenMode)}
              className={`px-2.5 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                previewMode === tab.id
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode 1: In-App Storefront Preview */}
      {previewMode === 'storefront' && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="rawaj-dark-surface w-full max-w-[320px] rounded-[2.2rem] border-[6px] border-slate-800 shadow-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: tenant.theme.surface, color: tenant.theme.textOnSurface }}
          >
            {/* Status Bar */}
            <div className="px-5 pt-2.5 pb-1.5 flex items-center justify-between text-[10px] opacity-80 font-mono tabular-nums">
              <span>9:41</span>
              <div className="w-16 h-3.5 rounded-full bg-black/50" />
              <span>5G · 100%</span>
            </div>

            {/* App Header */}
            <div
              className="px-4 py-3 flex items-center justify-between gap-2"
              style={{ backgroundColor: tenant.theme.primary, color: tenant.theme.textOnPrimary }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 ${maskClass} overflow-hidden bg-white/15 shrink-0 flex items-center justify-center`}>
                  {resolvedIcon ? (
                    <img src={resolvedIcon} alt={tenant.appName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="font-extrabold text-xs">{tenant.appName.slice(0, 1)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <strong className="text-xs font-extrabold block truncate">{tenant.appName}</strong>
                  <span className="text-[9px] opacity-85 block truncate">{tenant.tagline}</span>
                </div>
              </div>
              <ShoppingBag className="w-4 h-4 shrink-0" />
            </div>

            {/* Search & Hero */}
            <div className="p-3.5 space-y-3 text-right">
              <div
                className="rounded-xl px-3 py-2 flex items-center gap-2 text-[11px] border border-white/10"
                style={{ backgroundColor: tenant.theme.secondary }}
              >
                <Search className="w-3.5 h-3.5 opacity-60" />
                <span className="opacity-70">ابحث داخل {tenant.appName}...</span>
              </div>

              <div
                className="rounded-2xl p-3.5 space-y-2 border border-white/10"
                style={{ backgroundColor: tenant.theme.secondary }}
              >
                <span
                  className="text-[10px] font-bold"
                  style={{ color: tenant.theme.accent }}
                >
                  تشكيلة مختارة · {tenant.appNameEn}
                </span>
                <p className="text-xs font-extrabold leading-snug">
                  أحدث الأجهزة الذكية بضمان الوكيل المعتمد
                </p>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{
                    backgroundColor: tenant.theme.primary,
                    color: tenant.theme.textOnPrimary,
                  }}
                >
                  تصفح المنتجات
                </button>
              </div>

              {/* Sample Product Card */}
              <div
                className="rounded-2xl p-3 border border-white/10 flex items-center justify-between gap-2.5"
                style={{ backgroundColor: tenant.theme.secondary }}
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] opacity-70 block">إلكترونيات · متوفر</span>
                  <strong className="text-xs font-bold block truncate">ساعة ذكية Ultra Fit 3</strong>
                  <div className="flex items-center gap-2 text-[11px] font-bold tabular-nums">
                    <span style={{ color: tenant.theme.accent }}>1,899 ر.س</span>
                    <span className="opacity-60">· 4.9 ★</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl text-[11px] font-bold shrink-0"
                  style={{
                    backgroundColor: tenant.theme.primary,
                    color: tenant.theme.textOnPrimary,
                  }}
                >
                  أضف للسلة
                </button>
              </div>

              {/* Locked Payment & Legal Boundary Notice inside Phone */}
              <div className="rounded-xl p-2.5 bg-black/30 border border-white/10 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between text-emerald-300 font-bold">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>نطاق محمي غير قابل للتعديل</span>
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <p className="opacity-80 leading-relaxed">
                  الدفع الآمن: {tenant.lockedBoundaries.allowedPaymentGateways.slice(0, 4).join(' · ')}
                </p>
                <p className="opacity-70 font-mono tabular-nums">
                  VAT {tenant.lockedBoundaries.vatNumber} · CR {tenant.lockedBoundaries.crNumber}
                </p>
              </div>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Bundle ID: {tenant.bundleId} · الإصدار v{tenant.version}
          </span>
        </div>
      )}

      {/* Mode 2: Splash Screen Preview */}
      {previewMode === 'splash' && (
        <div className="flex flex-col items-center gap-3">
          <div
            key={splashKey}
            className="rawaj-dark-surface w-full max-w-[300px] h-[480px] rounded-[2.2rem] border-[6px] border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between p-6 text-center relative"
            style={{
              backgroundColor: tenant.splash.backgroundColor,
              color: tenant.splash.textColor,
            }}
          >
            <div className="text-[10px] opacity-60 font-mono tabular-nums flex justify-between">
              <span>Splash Preview</span>
              <span>{tenant.splash.durationMs}ms</span>
            </div>

            <div className="flex flex-col items-center gap-4 my-auto">
              <div className={`w-24 h-24 ${maskClass} overflow-hidden shadow-2xl border border-white/15 flex items-center justify-center bg-white/10`}>
                {resolvedSplash ? (
                  <img src={resolvedSplash} alt="شعار شاشة البدء" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3xl font-black">{tenant.appName.slice(0, 1)}</span>
                )}
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-extrabold leading-tight">{tenant.splash.headline || tenant.appName}</h4>
                <p className="text-xs opacity-80">{tenant.splash.subheadline}</p>
              </div>
              <div className="w-32 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 w-3/4"
                  style={{ backgroundColor: tenant.splash.spinnerColor }}
                />
              </div>
            </div>

            <div className="space-y-1 text-[10px] opacity-75 border-t border-white/10 pt-3">
              <div className="flex items-center justify-center gap-1 font-bold">
                <Lock className="w-3 h-3" />
                <span>{tenant.lockedBoundaries.legalEntityName}</span>
              </div>
              <span className="font-mono block tabular-nums">
                CR: {tenant.lockedBoundaries.crNumber} · VAT: {tenant.lockedBoundaries.vatNumber}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSplashKey((k) => k + 1)}
            className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-brand-300" />
            <span>إعادة محاكاة إقلاع الشاشة</span>
          </button>
        </div>
      )}

      {/* Mode 3: Multi-DPI Icon Matrix & Safe-Zone Inspector */}
      {previewMode === 'multi-dpi' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">شكل القناع:</span>
              {[
                { id: 'squircle', label: 'iOS Squircle' },
                { id: 'circle', label: 'Android دائري' },
                { id: 'square', label: 'مربع قياسي' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setIconMask(m.id as 'squircle' | 'circle' | 'square')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    iconMask === m.id
                      ? 'bg-[#551465] text-white'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowSafeZone((v) => !v)}
              className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 transition ${
                showSafeZone
                  ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>إظهار المنطقة الآمنة (66%)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MULTI_DPI_SPECS.map((spec) => {
              const displayPx = Math.min(72, Math.max(28, Math.round(spec.px * 0.48)));
              return (
                <div
                  key={spec.density}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center text-center gap-2"
                >
                  <div className="h-20 flex items-center justify-center">
                    <div
                      className={`relative ${maskClass} overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0`}
                      style={{ width: `${displayPx}px`, height: `${displayPx}px` }}
                    >
                      {resolvedIcon ? (
                        <img src={resolvedIcon} alt={spec.density} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="font-bold text-white">{tenant.appName.slice(0, 1)}</span>
                      )}
                      {showSafeZone && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-[17%] rounded-full border border-dashed border-amber-400/80 pointer-events-none"
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    <strong className="text-white block font-mono">{spec.density}</strong>
                    <span className="text-brand-300 font-mono tabular-nums block">
                      {spec.px}×{spec.px} px
                    </span>
                    <span className="text-slate-400 text-[10px] block">{spec.platform}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-[11px] text-slate-300 space-y-1.5">
            <strong className="text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-300" />
              <span>إرشادات اختبار الأيقونات عبر الشاشات متعددة الكثافة:</span>
            </strong>
            <ul className="space-y-1 text-slate-400 pr-4 list-disc">
              <li>أبقِ الشعار الأساسي داخل الدائرة المتقطعة (66% Safe Zone) لتفادي القص في أجهزة Android Adaptive Launcher.</li>
              <li>لـ App Store (1024×1024px) يجب أن تكون الخلفية مصمتة بدون شفافية (No Alpha Channel).</li>
              <li>تحقق من وضوح الحواف عند مقاس mdpi (48px) على الخلفيات الفاتحة والداكنة.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Mode 4: App Store & Google Play Listing Simulator */}
      {previewMode === 'app-stores' && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setStorePlatform('google_play')}
              className={`flex-1 py-2 rounded-lg font-bold transition ${
                storePlatform === 'google_play'
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              محاكاة Google Play
            </button>
            <button
              type="button"
              onClick={() => setStorePlatform('app_store')}
              className={`flex-1 py-2 rounded-lg font-bold transition ${
                storePlatform === 'app_store'
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              محاكاة Apple App Store
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-16 h-16 ${
                  storePlatform === 'app_store' ? 'rounded-[22%]' : 'rounded-2xl'
                } overflow-hidden border border-slate-700 bg-slate-900 shrink-0 flex items-center justify-center`}
              >
                {resolvedIcon ? (
                  <img src={resolvedIcon} alt={tenant.appName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xl font-black text-white">{tenant.appName.slice(0, 1)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-base font-extrabold text-white truncate">{tenant.appName}</h4>
                <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tenant.lockedBoundaries.legalEntityName} (مطور موثق)</span>
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{tenant.bundleId}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-800 text-center text-xs tabular-nums">
              <div>
                <span className="font-extrabold text-white flex items-center justify-center gap-1">
                  4.9 <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>
                <span className="text-[10px] text-slate-400">1.2K تقييم</span>
              </div>
              <div className="border-x border-slate-800">
                <span className="font-extrabold text-white block">
                  {tenant.builds[0]?.bundleSizeMb || 18.4} MB
                </span>
                <span className="text-[10px] text-slate-400">حجم الحزمة</span>
              </div>
              <div>
                <span className="font-extrabold text-white block">4+</span>
                <span className="text-[10px] text-slate-400">التصنيف العمري</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow"
              style={{
                backgroundColor: tenant.theme.primary,
                color: tenant.theme.textOnPrimary,
              }}
            >
              <Download className="w-4 h-4" />
              <span>{storePlatform === 'app_store' ? 'تنزيل من App Store' : 'تثبيت من Google Play'}</span>
            </button>

            {/* Branded Store Screenshots Strip */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['الواجهة الرئيسية', 'تفاصيل المنتج', 'الدفع الآمن المعتمد'].map((caption, idx) => (
                <div
                  key={caption}
                  className="rounded-xl p-2.5 h-28 flex flex-col justify-between border border-white/10 text-right"
                  style={{
                    backgroundColor: idx === 0 ? tenant.theme.primary : tenant.theme.surface,
                    color: idx === 0 ? tenant.theme.textOnPrimary : tenant.theme.textOnSurface,
                  }}
                >
                  <span className="text-[9px] font-bold opacity-80">{tenant.appName}</span>
                  <div className="space-y-1">
                    <div
                      className="h-2 w-10 rounded"
                      style={{ backgroundColor: tenant.theme.accent }}
                    />
                    <span className="text-[10px] font-bold block leading-tight">{caption}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
