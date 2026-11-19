import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Sparkles,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { PriceDropAlert, Product, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { computeSuggestedTargetPrices } from '../utils/priceAlerts';
import { LazyImage } from './LazyImage';

interface PriceAlertConfigModalProps {
  isOpen: boolean;
  product: Product | null;
  existingAlert?: PriceDropAlert;
  settings?: StoreSettings;
  onClose: () => void;
  onSaveAlert: (product: Product, targetPrice?: number) => void;
  onRemoveAlert?: (productId: string) => void;
}

export const PriceAlertConfigModal: React.FC<PriceAlertConfigModalProps> = ({
  isOpen,
  product,
  existingAlert,
  settings,
  onClose,
  onSaveAlert,
  onRemoveAlert,
}) => {
  const [targetInput, setTargetInput] = useState<string>('');
  const [mode, setMode] = useState<'target' | 'any'>('target');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product) return;
    setErrorMsg(null);
    if (existingAlert?.isActive) {
      if (existingAlert.targetPrice && existingAlert.targetPrice > 0) {
        setMode('target');
        setTargetInput(String(existingAlert.targetPrice));
      } else {
        setMode('any');
        setTargetInput(String(Math.max(1, Math.round(product.price * 0.9))));
      }
    } else {
      setMode('target');
      setTargetInput(String(Math.max(1, Math.round(product.price * 0.9))));
    }
  }, [isOpen, product, existingAlert]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const presets = useMemo(
    () => (product ? computeSuggestedTargetPrices(product.price) : []),
    [product]
  );

  if (!isOpen || !product) return null;

  const parsedTarget = Number(targetInput);
  const isTargetValid =
    mode === 'any' ||
    (Number.isFinite(parsedTarget) && parsedTarget >= 1 && parsedTarget < product.price);
  const expectedDiscountPercent =
    mode === 'target' && isTargetValid
      ? Math.max(1, Math.round(((product.price - parsedTarget) / product.price) * 100))
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'target') {
      if (!Number.isFinite(parsedTarget) || parsedTarget < 1 || parsedTarget >= product.price) {
        setErrorMsg(
          `يرجى إدخال سعر مستهدف أقل من السعر الحالي (${product.price.toLocaleString()} ر.س) وأكبر من صفر.`
        );
        return;
      }
      onSaveAlert(product, Math.round(parsedTarget * 100) / 100);
    } else {
      onSaveAlert(product, undefined);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="إعداد التنبيه التلقائي لانخفاض السعر"
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-right"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
              {existingAlert?.isActive ? (
                <BellRing className="w-4 h-4 text-emerald-400" />
              ) : (
                <Bell className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                التنبيه التلقائي للسعر المستهدف
              </h3>
              <p className="text-[11px] text-slate-400">
                إشعار فوري داخل المتجر فور وصول السعر للهدف المحدد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة التنبيه"
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Product Summary */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <LazyImage
              src={product.images[0]}
              alt={product.name}
              sizeHint="thumb"
              wrapperClassName="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0"
              className="w-full h-full object-cover"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-xs font-extrabold text-white line-clamp-2 block">
                {product.name}
              </span>
              <div className="flex items-center gap-2 text-xs tabular-nums">
                <span className="text-slate-400">السعر الحالي:</span>
                <span className="font-extrabold text-brand-300">
                  {formatPrice(product.price, settings?.activeCurrency, settings?.yerExchangeRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Alert Mode Switch */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('target');
                setErrorMsg(null);
              }}
              className={`p-2.5 rounded-xl border font-bold text-center transition ${
                mode === 'target'
                  ? 'bg-[#551465] border-brand-400 text-white shadow'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              تحديد سعر مستهدف
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('any');
                setErrorMsg(null);
              }}
              className={`p-2.5 rounded-xl border font-bold text-center transition ${
                mode === 'any'
                  ? 'bg-[#551465] border-brand-400 text-white shadow'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              عند أي انخفاض
            </button>
          </div>

          {mode === 'target' ? (
            <div className="space-y-3">
              {/* Quick Discount Presets */}
              {presets.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    اختيار سريع للسعر المستهدف:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {presets.map((preset) => {
                      const isSelected = Number(targetInput) === preset.targetPrice;
                      return (
                        <button
                          key={preset.discountPercent}
                          type="button"
                          onClick={() => {
                            setTargetInput(String(preset.targetPrice));
                            setErrorMsg(null);
                          }}
                          className={`py-2 px-1.5 rounded-xl border text-center transition tabular-nums ${
                            isSelected
                              ? 'bg-emerald-600/25 border-emerald-400 text-emerald-300'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-[11px] font-extrabold block">
                            -{preset.discountPercent}%
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {preset.targetPrice.toLocaleString()} ر.س
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Target Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-target-price-input"
                  className="text-xs font-bold text-slate-200 flex items-center gap-1.5"
                >
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <span>السعر المستهدف بالريال السعودي (ر.س):</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="modal-target-price-input"
                    type="number"
                    min={1}
                    max={Math.max(1, product.price - 1)}
                    step="any"
                    value={targetInput}
                    onChange={(e) => {
                      setTargetInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-extrabold text-sm tabular-nums focus:outline-none focus:border-emerald-500"
                    placeholder={`أقل من ${product.price}`}
                  />
                  {isTargetValid && expectedDiscountPercent > 0 && (
                    <span className="px-3 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold tabular-nums shrink-0">
                      توفير {expectedDiscountPercent}%
                    </span>
                  )}
                </div>
                {isTargetValid && settings?.activeCurrency && settings.activeCurrency !== 'SAR' && (
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    يعادل تقريباً:{' '}
                    <strong className="text-slate-200">
                      {formatPrice(
                        parsedTarget,
                        settings.activeCurrency,
                        settings.yerExchangeRate
                      )}
                    </strong>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                ستتلقى إشعاراً فورياً داخل التطبيق بمجرد تخفيض سعر هذا المنتج عن سعره الحالي (
                <strong className="text-white tabular-nums">
                  {formatPrice(product.price, settings?.activeCurrency, settings?.yerExchangeRate)}
                </strong>
                ).
              </span>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5">
              {errorMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!isTargetValid}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {existingAlert?.isActive ? 'تحديث التنبيه التلقائي' : 'تفعيل التنبيه التلقائي'}
              </span>
            </button>

            {existingAlert?.isActive && onRemoveAlert && (
              <button
                type="button"
                onClick={() => {
                  onRemoveAlert(product.id);
                  onClose();
                }}
                className="py-3 px-3.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                title="إلغاء التنبيه"
              >
                <Trash2 className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
