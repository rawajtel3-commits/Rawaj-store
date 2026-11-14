import React from 'react';
import { BellRing, ShoppingBag, X, ArrowLeft } from 'lucide-react';
import { InAppNotification, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';

interface CheckoutReminderToastProps {
  notification: InAppNotification | null;
  settings: StoreSettings;
  onDismiss: () => void;
  onCompleteOrder: () => void;
}

export const CheckoutReminderToast: React.FC<CheckoutReminderToastProps> = ({
  notification,
  settings,
  onDismiss,
  onCompleteOrder,
}) => {
  if (!notification) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      dir="rtl"
      className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:w-[400px] z-50 bg-slate-900 border border-[#551465] rounded-2xl shadow-2xl shadow-[#551465]/40 p-4 space-y-3 animate-fade-in"
    >
      <div className="flex items-start gap-3">
        {notification.productImage ? (
          <LazyImage
            src={notification.productImage}
            alt={notification.productName || notification.title}
            sizeHint="thumb"
            wrapperClassName="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[#551465]/25 border border-brand-400/40 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-amber-300" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
              <BellRing className="w-4 h-4 shrink-0" />
              <span>{notification.title}</span>
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="إغلاق التذكير"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-200 leading-relaxed">
            {notification.message}
          </p>

          {notification.totalAmount !== undefined && (
            <div className="flex items-center gap-2 text-[11px] tabular-nums pt-0.5 text-brand-300 font-bold">
              <span>إجمالي السلة:</span>
              <span className="text-white font-extrabold">
                {formatPrice(notification.totalAmount, settings.activeCurrency, settings.yerExchangeRate)}
              </span>
              {notification.itemsCount ? (
                <span className="text-slate-400">({notification.itemsCount} منتجات)</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCompleteOrder}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition border border-brand-400/40"
        >
          <ShoppingBag className="w-4 h-4 text-amber-300" />
          <span>إكمال الطلب</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
        >
          لاحقاً
        </button>
      </div>
    </div>
  );
};
