import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Sparkles, 
  Clock, 
  Copy, 
  Check, 
  Percent, 
  ArrowRight, 
  Zap,
  ShoppingBag,
  Flame,
  Scale
} from 'lucide-react';
import { Product, StoreSettings } from '../../types';
import { formatPrice } from '../../utils/currency';
import { LazyImage } from '../LazyImage';

interface OffersPageProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
  onQuickView: (p: Product) => void;
  onBackToHome?: () => void;
  compareIds?: string[];
  onToggleCompare?: (productId: string) => void;
  settings?: StoreSettings;
}

export const OffersPage: React.FC<OffersPageProps> = ({
  products,
  onAddToCart,
  onQuickView,
  onBackToHome,
  compareIds = [],
  onToggleCompare,
  settings,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Flash Deal Timer simulation
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const promoCodes = [
    {
      code: 'RAWAJ10',
      discount: '10%',
      title: 'خصم انطلاق متجر رواج',
      description: 'ينطبق على جميع المنتجات والإلكترونيات عند الطلب بـ 200 ر.س أو أكثر',
      badge: 'الأكثر استخداماً',
      color: 'from-[#551465] to-purple-800',
    },
    {
      code: 'VIP20',
      discount: '20%',
      title: 'خصم الألعاب والساعات الذكية',
      description: 'خصم خاص على إكسسوارات الجيمينج والساعات الأنيقة عند استخدام مدى',
      badge: 'خصم مميز',
      color: 'from-purple-900 to-indigo-950',
    },
    {
      code: 'FREEEXPRESS',
      discount: 'شحن مجاني',
      title: 'توصيل مجاني لكافة المناطق',
      description: 'احصل على توصيل سريع خلال 24 ساعة دون أي رسوم إضافية',
      badge: 'عروض الشحن',
      color: 'from-slate-900 to-slate-950',
    },
  ];

  const discountedProducts = products.filter((p) => p.originalPrice && p.originalPrice > p.price);

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-brand-300 hover:text-white inline-flex items-center gap-2 font-bold transition"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع</span>
            </button>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500 shrink-0" />
            <span>صفحة العروض الحصرية وكوبونات الخصم</span>
          </h1>
          <p className="text-xs text-slate-400">
            استفد من أقوى التخفيضات اليومية والأكواد الترويجية المعتمدة لمتجر رواج الذكي.
          </p>
        </div>

        {/* Countdown Timer Badge */}
        <div className="w-full lg:w-auto bg-slate-900 border border-slate-800 p-3 sm:px-5 rounded-2xl flex flex-wrap items-center justify-between sm:justify-start gap-3 text-xs font-bold shadow-lg">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-4 h-4" />
            <span>ينتهي العرض اليومي بعد:</span>
          </div>
          <div className="flex items-center gap-1 font-mono tabular-nums text-base text-white">
            <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span>:</span>
            <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span>:</span>
            <span className="bg-[#551465] text-brand-300 px-2 py-1 rounded border border-[#551465]/40">{String(timeLeft.seconds).padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {/* Coupons Section */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-brand-300" />
          <span>كوبونات الخصم المتاحة للاستخدام الآن:</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {promoCodes.map((promo, idx) => (
            <div
              key={idx}
              className={`bg-gradient-to-br ${promo.color} border border-slate-800 p-6 rounded-3xl relative overflow-hidden shadow-xl flex flex-col justify-between space-y-4`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="bg-white/10 text-brand-200 border border-white/20 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    {promo.badge}
                  </span>
                  <span className="text-2xl font-black text-amber-300 tracking-tight">{promo.discount}</span>
                </div>
                <h4 className="text-sm font-bold text-white">{promo.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{promo.description}</p>
              </div>

              {/* Coupon Code Action */}
              <div className="bg-slate-950/80 p-2.5 px-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
                <span className="font-mono font-extrabold text-sm text-brand-300 tracking-wider uppercase">
                  {promo.code}
                </span>
                <button
                  onClick={() => handleCopyCode(promo.code)}
                  className="bg-[#551465] hover:bg-brand-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition shadow border border-brand-500/30"
                >
                  {copiedCode === promo.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-brand-200" />
                      <span>نسخ الكود</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products On Sale Grid */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>منتجات مخفضة التكلفة (خصومات تصل إلى 30%)</span>
          </h3>
          <span className="text-xs text-slate-400">{discountedProducts.length} منتجات في التخفيض الحصري</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {discountedProducts.map((product) => {
            const savings = product.originalPrice ? product.originalPrice - product.price : 0;
            const savingsPercent = product.originalPrice
              ? Math.round((savings / product.originalPrice) * 100)
              : 0;

            return (
              <div
                key={product.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-[#551465]/60 transition-all shadow-lg"
              >
                {/* Discount Badge */}
                <div className="absolute top-6 right-6 bg-rose-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow z-10">
                  خصم {savingsPercent}%
                </div>

                <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-950">
                  <LazyImage
                    src={product.images[0]}
                    alt={product.name}
                    sizeHint="card"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-brand-300 font-bold block">{product.categoryNameAr}</span>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{product.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{product.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-extrabold text-brand-300 block">
                      {formatPrice(product.price, settings?.activeCurrency, settings?.yerExchangeRate)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-[10px] text-slate-500 line-through">
                        {formatPrice(product.originalPrice, settings?.activeCurrency, settings?.yerExchangeRate)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onToggleCompare && (
                      <button
                        type="button"
                        onClick={() => onToggleCompare(product.id)}
                        className={`p-2 rounded-xl border text-xs font-bold transition ${
                          compareIds.includes(product.id)
                            ? 'bg-[#551465] border-brand-400/50 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        }`}
                        title={compareIds.includes(product.id) ? 'إزالة من المقارنة' : 'إضافة للمقارنة'}
                      >
                        <Scale className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onQuickView(product)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                    >
                      التفاصيل
                    </button>
                    <button
                      onClick={() => onAddToCart(product)}
                      className="bg-[#551465] hover:bg-brand-700 text-white p-2 rounded-xl text-xs font-bold shadow flex items-center gap-1 border border-brand-500/30"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
