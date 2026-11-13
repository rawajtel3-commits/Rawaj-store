import React from 'react';
import { Scale, X, ArrowLeft, Trash2, AlertCircle } from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';

interface CompareBarProps {
  products: Product[];
  onRemove: (productId: string) => void;
  onClear: () => void;
  onOpenCompare: () => void;
  limitWarning?: boolean;
  settings?: StoreSettings;
}

export const CompareBar: React.FC<CompareBarProps> = ({
  products,
  onRemove,
  onClear,
  onOpenCompare,
  limitWarning = false,
  settings,
}) => {
  if (products.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:right-auto md:left-6 z-30 md:max-w-xl bg-slate-900/95 backdrop-blur-md border border-[#551465]/70 rounded-2xl shadow-2xl p-3 text-slate-100"
      dir="rtl"
    >
      {limitWarning && (
        <div className="mb-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>الحد الأقصى للمقارنة هو 4 منتجات في وقت واحد. قم بإزالة منتج لإضافة آخر.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Selected Products Thumbnails */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1.5 text-brand-300 text-xs font-extrabold shrink-0 pl-1">
            <Scale className="w-4 h-4" />
            <span className="tabular-nums">مقارنة ({products.length}/4)</span>
          </div>

          {products.map((product) => (
            <div
              key={product.id}
              className="relative flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl pl-2 pr-1.5 py-1 shrink-0 max-w-[155px]"
            >
              <LazyImage
                src={product.images[0]}
                alt={product.name}
                sizeHint="thumb"
                wrapperClassName="relative w-8 h-8 rounded-lg overflow-hidden bg-slate-900 shrink-0"
                className="w-full h-full object-cover"
              />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{product.name}</p>
                <p className="text-[10px] text-brand-300 font-bold tabular-nums">
                  {formatPrice(product.price, settings?.activeCurrency, settings?.yerExchangeRate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(product.id)}
                aria-label={`إزالة ${product.name} من المقارنة`}
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClear}
            className="text-slate-400 hover:text-rose-400 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center gap-1 transition"
            title="مسح قائمة المقارنة"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="sm:hidden">مسح</span>
          </button>

          <button
            type="button"
            onClick={onOpenCompare}
            className="bg-[#551465] hover:bg-brand-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-[#551465]/30 border border-brand-500/30 transition whitespace-nowrap"
          >
            <span>
              {products.length < 2
                ? 'اختر منتجاً آخر أو افتح المقارنة'
                : `مقارنة المنتجات (${products.length})`}
            </span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
