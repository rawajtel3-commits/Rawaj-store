import React, { useEffect, useState } from 'react';
import { Flame, Timer, Copy, Check, ArrowLeft, Sparkles } from 'lucide-react';
import { FlashOfferConfig, Product, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';

interface FlashOfferBannerProps {
  offer: FlashOfferConfig;
  products: Product[];
  settings: StoreSettings;
  onOpenProduct: (product: Product) => void;
  onNavigateToOffers: () => void;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeRemaining = (endsAt: string): TimeRemaining => {
  const target = new Date(endsAt).getTime();
  if (Number.isNaN(target)) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { totalMs: diff, days, hours, minutes, seconds };
};

export const FlashOfferBanner: React.FC<FlashOfferBannerProps> = ({
  offer,
  products,
  settings,
  onOpenProduct,
  onNavigateToOffers,
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(offer.endsAt)
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTimeLeft(calculateTimeRemaining(offer.endsAt));
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(offer.endsAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [offer.endsAt]);

  if (!offer.enabled || timeLeft.totalMs <= 0) {
    return null;
  }

  const linkedProduct = offer.productId
    ? products.find((p) => p.id === offer.productId)
    : undefined;

  const handleCopyCode = () => {
    if (!offer.promoCode) return;
    navigator.clipboard?.writeText(offer.promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCtaClick = () => {
    if (linkedProduct) {
      onOpenProduct(linkedProduct);
    } else {
      onNavigateToOffers();
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section
      aria-label="شريط العرض الخاص لفترة محدودة"
      className="rawaj-promo-bar relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-l from-[#551465] via-[#3c0f4d] to-slate-900 border border-brand-400/40 shadow-2xl p-4 sm:p-5 text-white"
      dir="rtl"
    >
      <div className="absolute -left-12 -top-12 w-44 h-44 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-brand-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left/Right Copy & Optional Linked Product */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 min-w-0 flex-1">
          {linkedProduct && (
            <button
              type="button"
              onClick={handleCtaClick}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-amber-300/60 bg-slate-950 shrink-0 shadow-lg hover:scale-105 transition-transform self-start sm:self-center"
              title={linkedProduct.name}
            >
              <LazyImage
                src={linkedProduct.images[0]}
                alt={linkedProduct.name}
                sizeHint="thumb"
                className="w-full h-full object-cover"
              />
            </button>
          )}

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow">
                <Flame className="w-3.5 h-3.5" />
                <span>{offer.discountLabel || 'عرض خاص'}</span>
              </span>

              {offer.promoCode && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold px-2.5 py-0.5 rounded-lg transition"
                  title="اضغط لنسخ كود الخصم"
                >
                  <span>كود:</span>
                  <span className="font-mono tracking-wider uppercase text-amber-300 font-black">
                    {offer.promoCode}
                  </span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-300" />
                  ) : (
                    <Copy className="w-3 h-3 text-white/80" />
                  )}
                </button>
              )}

              {linkedProduct && (
                <span className="text-[11px] text-amber-200 font-bold truncate max-w-full">
                  • {linkedProduct.name} ({formatPrice(linkedProduct.price, settings.activeCurrency, settings.yerExchangeRate)})
                </span>
              )}
            </div>

            <h2 className="text-sm sm:text-base lg:text-lg font-extrabold text-white leading-snug">
              {offer.title}
            </h2>
            {offer.subtitle && (
              <p className="text-[11px] sm:text-xs text-purple-100/90 leading-relaxed line-clamp-2">
                {offer.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Countdown Timer + CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Timer Boxes */}
          <div className="bg-slate-950/60 border border-white/15 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 backdrop-blur-sm">
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 ml-1 shrink-0">
              <Timer className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">ينتهي خلال:</span>
            </div>

            <div className="flex items-center gap-1.5 text-center" dir="ltr">
              {timeLeft.days > 0 && (
                <>
                  <div className="min-w-[38px] bg-white/10 border border-white/15 rounded-xl px-1.5 py-1">
                    <span className="text-sm sm:text-base font-black font-mono tabular-nums text-white block leading-none">
                      {pad(timeLeft.days)}
                    </span>
                    <span className="text-[9px] text-purple-200 block mt-0.5">يوم</span>
                  </div>
                  <span className="text-amber-300 font-black text-sm">:</span>
                </>
              )}

              <div className="min-w-[38px] bg-white/10 border border-white/15 rounded-xl px-1.5 py-1">
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-white block leading-none">
                  {pad(timeLeft.hours)}
                </span>
                <span className="text-[9px] text-purple-200 block mt-0.5">ساعة</span>
              </div>
              <span className="text-amber-300 font-black text-sm">:</span>

              <div className="min-w-[38px] bg-white/10 border border-white/15 rounded-xl px-1.5 py-1">
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-white block leading-none">
                  {pad(timeLeft.minutes)}
                </span>
                <span className="text-[9px] text-purple-200 block mt-0.5">دقيقة</span>
              </div>
              <span className="text-amber-300 font-black text-sm">:</span>

              <div className="min-w-[38px] bg-amber-400/20 border border-amber-300/40 rounded-xl px-1.5 py-1">
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-amber-300 block leading-none">
                  {pad(timeLeft.seconds)}
                </span>
                <span className="text-[9px] text-amber-200 block mt-0.5">ثانية</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCtaClick}
            className="min-h-[44px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{offer.ctaLabel || 'تصفح العرض الآن'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
