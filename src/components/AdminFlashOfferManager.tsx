import React, { useState } from 'react';
import {
  Flame,
  Timer,
  Save,
  Power,
  Tag,
  Sparkles,
  CalendarClock,
  Package,
  Eye
} from 'lucide-react';
import { FlashOfferConfig, Product, StoreSettings } from '../types';
import { FlashOfferBanner } from './FlashOfferBanner';

interface AdminFlashOfferManagerProps {
  flashOffer: FlashOfferConfig;
  products: Product[];
  settings: StoreSettings;
  onSaveFlashOffer: (updated: FlashOfferConfig) => void;
  onSavedToast: (msg: string) => void;
}

const toLocalDatetimeInput = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date(Date.now() + 12 * 60 * 60 * 1000);
    return toLocalDatetimeInput(fallback.toISOString());
  }
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const AdminFlashOfferManager: React.FC<AdminFlashOfferManagerProps> = ({
  flashOffer,
  products,
  settings,
  onSaveFlashOffer,
  onSavedToast,
}) => {
  const [draft, setDraft] = useState<FlashOfferConfig>(flashOffer);
  const [localDateTime, setLocalDateTime] = useState<string>(() =>
    toLocalDatetimeInput(flashOffer.endsAt)
  );

  const applyQuickDuration = (hours: number) => {
    const nextIso = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setDraft((prev) => ({ ...prev, enabled: true, endsAt: nextIso }));
    setLocalDateTime(toLocalDatetimeInput(nextIso));
  };

  const handleDateChange = (val: string) => {
    setLocalDateTime(val);
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) {
      setDraft((prev) => ({ ...prev, endsAt: parsed.toISOString() }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      onSavedToast('❌ يرجى كتابة عنوان العرض الخاص قبل الحفظ');
      return;
    }
    onSaveFlashOffer({
      ...draft,
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      discountLabel: draft.discountLabel.trim() || 'عرض خاص',
      promoCode: draft.promoCode?.trim().toUpperCase() || undefined,
      ctaLabel: draft.ctaLabel.trim() || 'تسوق العرض الآن',
    });
    onSavedToast(
      draft.enabled
        ? '✅ تم حفظ وتفعيل شريط العرض الخاص والعد التنازلي أعلى الرئيسية!'
        : 'ℹ️ تم حفظ إعدادات العرض الخاص (الشريط متوقف حالياً).'
    );
  };

  const isExpired = new Date(draft.endsAt).getTime() <= Date.now();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs" dir="rtl">
      {/* Header & Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">
              إعداد العرض الخاص والعد التنازلي (Flash Offer)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تحكم بالشريط التحفيزي والعداد التنازلي الذي يظهر أعلى الصفحة الرئيسية لزيادة سرعة الشراء.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`min-h-[40px] px-4 py-2 rounded-xl font-extrabold flex items-center justify-center gap-2 border transition shrink-0 ${
            draft.enabled
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-700'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{draft.enabled ? 'الشريط مفعّل في الرئيسية' : 'الشريط متوقف مؤقتاً'}</span>
        </button>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-200 font-bold mb-1.5">عنوان العرض الرئيسي *</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="مثال: عرض فلاش حصري لفترة محدودة!"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#551465]"
            />
          </div>

          <div>
            <label className="block text-slate-200 font-bold mb-1.5">شارة الخصم المميزة</label>
            <div className="relative">
              <input
                type="text"
                value={draft.discountLabel}
                onChange={(e) => setDraft((prev) => ({ ...prev, discountLabel: e.target.value }))}
                placeholder="مثال: خصم حتى 25%"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-3 text-amber-300 font-bold focus:outline-none focus:border-[#551465]"
              />
              <Tag className="w-4 h-4 text-amber-400 absolute right-3 top-3.5" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-slate-200 font-bold mb-1.5">النص التحفيزي للعملاء</label>
          <textarea
            rows={2}
            value={draft.subtitle}
            onChange={(e) => setDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
            placeholder="أضف وصفاً قصيراً يحفز العميل على الاستفادة من العرض قبل انتهاء الوقت..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#551465]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-200 font-bold mb-1.5">كود الخصم (اختياري)</label>
            <input
              type="text"
              value={draft.promoCode || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, promoCode: e.target.value.toUpperCase() }))}
              placeholder="مثال: RAWAJ10"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-brand-300 font-mono font-bold uppercase focus:outline-none focus:border-[#551465]"
            />
          </div>

          <div>
            <label className="block text-slate-200 font-bold mb-1.5">نص زر الإجراء (CTA)</label>
            <input
              type="text"
              value={draft.ctaLabel}
              onChange={(e) => setDraft((prev) => ({ ...prev, ctaLabel: e.target.value }))}
              placeholder="مثال: تسوق العرض الآن"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-[#551465]"
            />
          </div>

          <div>
            <label className="block text-slate-200 font-bold mb-1.5 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-brand-300" />
              <span>ربط بمنتج محدد (اختياري)</span>
            </label>
            <select
              value={draft.productId || ''}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, productId: e.target.value || undefined }))
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#551465]"
            >
              <option value="">الانتقال إلى صفحة العروض والخصومات</option>
              {products.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration & Expiration */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="font-bold text-white flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-amber-400" />
              <span>تحديد مدة العرض وتاريخ الانتهاء:</span>
            </label>
            {isExpired && (
              <span className="text-rose-400 font-bold text-[11px]">
                ⚠️ الوقت المحدد منتهٍ — اختر مدة جديدة لتشغيل العداد
              </span>
            )}
          </div>

          {/* Quick Duration Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400">تعيين سريع من الآن:</span>
            {[
              { label: 'ساعة واحدة', hours: 1 },
              { label: '6 ساعات', hours: 6 },
              { label: '12 ساعة', hours: 12 },
              { label: '24 ساعة', hours: 24 },
              { label: '48 ساعة', hours: 48 },
              { label: '3 أيام', hours: 72 },
            ].map((preset) => (
              <button
                key={preset.hours}
                type="button"
                onClick={() => applyQuickDuration(preset.hours)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-[#551465] text-slate-200 hover:text-white border border-slate-700 text-[11px] font-bold transition flex items-center gap-1"
              >
                <Timer className="w-3 h-3 text-amber-400" />
                <span>+{preset.label}</span>
              </button>
            ))}
          </div>

          <div className="max-w-xs">
            <label className="block text-[11px] text-slate-400 mb-1">أو حدد تاريخ ووقت الانتهاء يدوياً:</label>
            <input
              type="datetime-local"
              value={localDateTime}
              onChange={(e) => handleDateChange(e.target.value)}
              dir="ltr"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#551465]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-300" />
            <span>يتم تحديث العداد التنازلي فوراً أعلى الصفحة الرئيسية عند الحفظ.</span>
          </div>

          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition text-xs"
          >
            <Save className="w-4 h-4" />
            <span>حفظ وتطبيق العرض الخاص</span>
          </button>
        </div>
      </form>

      {/* Live Preview inside Admin Dashboard */}
      <div className="space-y-2.5">
        <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
          <Eye className="w-4 h-4 text-brand-300" />
          <span>معاينة حية للشريط كما سيظهر للعملاء أعلى الصفحة الرئيسية:</span>
        </h4>

        {draft.enabled && !isExpired ? (
          <FlashOfferBanner
            offer={draft}
            products={products}
            settings={settings}
            onOpenProduct={() => {}}
            onNavigateToOffers={() => {}}
          />
        ) : (
          <div className="bg-slate-950/70 border border-dashed border-slate-700 rounded-2xl p-6 text-center text-slate-400">
            {draft.enabled
              ? 'الوقت المحدد للعرض منتهٍ — اضغط على أحد أزرار المدة السريعة لتفعيل المعاينة.'
              : 'الشريط متوقف حالياً — فعّل مفتاح التشغيل أعلاه لعرضه للعملاء.'}
          </div>
        )}
      </div>
    </div>
  );
};
