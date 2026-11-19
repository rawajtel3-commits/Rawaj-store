import React from 'react';
import { TrendingDown, X, ArrowUpLeft } from 'lucide-react';
import { InAppNotification, Product, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';

interface PriceDropToastProps {
  notification: InAppNotification | null;
  products: Product[];
  settings: StoreSettings;
  onDismiss: () => void;
  onOpenProduct: (product: Product) => void;
}

export const PriceDropToast: React.FC<PriceDropToastProps> = ({
  notification,
  products,
  settings,
  onDismiss,
  onOpenProduct,
}) => {
  if (!notification) return null;

  const targetProduct = notification.productId
    ? products.find((p) => p.id === notification.productId)
    : undefined;

  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:right-auto sm:w-96 z-50 bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl p-4 space-y-3"
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
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 shrink-0" />
              <span>{notification.title}</span>
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="إغلاق الإشعار"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-200 leading-relaxed">
            {notification.message}
          </p>

          {notification.oldPrice !== undefined && notification.newPrice !== undefined && (
            <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums pt-0.5">
              <span className="font-extrabold text-white">
                {formatPrice(notification.newPrice, settings.activeCurrency, settings.yerExchangeRate)}
              </span>
              <span className="text-[11px] text-slate-500 line-through">
                {formatPrice(notification.oldPrice, settings.activeCurrency, settings.yerExchangeRate)}
              </span>
              {notification.targetPrice !== undefined && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                  الهدف:{' '}
                  {formatPrice(
                    notification.targetPrice,
                    settings.activeCurrency,
                    settings.yerExchangeRate
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {targetProduct && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onOpenProduct(targetProduct);
              onDismiss();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
          >
            <span>عرض المنتج بالسعر الجديد</span>
            <ArrowUpLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
