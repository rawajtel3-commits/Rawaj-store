import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  PackageCheck,
  Send,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import {
  MerchantRatingEntry,
  MerchantRatingSummary,
  PriceDropAlert,
  Product,
  StoreSettings,
} from '../../types';
import {
  BrandStorefrontSummary,
  buildBrandStorefronts,
  getDisplayBrandName,
} from '../../utils/brands';
import { formatPrice } from '../../utils/currency';
import { translateCategory } from '../../utils/i18n';
import { useLanguage } from '../../contexts/LanguageContext';
import { LazyImage } from '../LazyImage';
import { ProductCard } from '../ProductCard';

interface BrandsPageProps {
  products: Product[];
  selectedBrandSlug: string | null;
  onSelectBrandSlug: (slug: string | null) => void;
  onQuickView: (product: Product, initialMode?: 'images' | 'video') => void;
  onAddToCart: (product: Product) => void;
  onAskAI: (product: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
  onAddReview: (
    productId: string,
    review: { userName: string; rating: number; comment: string }
  ) => void;
  defaultReviewerName?: string;
  onTryAR?: (product: Product) => void;
  priceAlerts?: PriceDropAlert[];
  onConfigurePriceAlert?: (product: Product) => void;
  onBackToHome: () => void;
  settings: StoreSettings;
}

const EMPTY_MERCHANT_SUMMARY = (brandSlug: string): MerchantRatingSummary => ({
  brandSlug,
  ratingsCount: 0,
  avgPrepSpeed: 0,
  avgPackagingQuality: 0,
  avgOverall: 0,
  reviews: [],
});

function describeScore(score: number, isRtl: boolean): string {
  if (score >= 5) return isRtl ? 'ممتاز (5/5)' : 'Excellent (5/5)';
  if (score === 4) return isRtl ? 'جيد جداً (4/5)' : 'Very Good (4/5)';
  if (score === 3) return isRtl ? 'جيد (3/5)' : 'Good (3/5)';
  if (score === 2) return isRtl ? 'مقبول (2/5)' : 'Fair (2/5)';
  return isRtl ? 'يحتاج تحسين (1/5)' : 'Needs Improvement (1/5)';
}

export const BrandsPage: React.FC<BrandsPageProps> = ({
  products,
  selectedBrandSlug,
  onSelectBrandSlug,
  onQuickView,
  onAddToCart,
  onAskAI,
  wishlistIds,
  onToggleWishlist,
  compareIds,
  onToggleCompare,
  onAddReview,
  defaultReviewerName = '',
  onTryAR,
  priceAlerts = [],
  onConfigurePriceAlert,
  onBackToHome,
  settings,
}) => {
  const { lang, isRtl } = useLanguage();
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating-desc'>('default');

  // Merchant Ratings State (Order Preparation Speed & Packaging Quality)
  const [merchantSummaries, setMerchantSummaries] = useState<
    Record<string, MerchantRatingSummary>
  >({});
  const [ratingsLoading, setRatingsLoading] = useState(true);

  // Interactive Merchant Rating Form State
  const [reviewerName, setReviewerName] = useState(defaultReviewerName);
  const [orderNumber, setOrderNumber] = useState('');
  const [prepSpeedRating, setPrepSpeedRating] = useState<number>(5);
  const [packagingQualityRating, setPackagingQualityRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (defaultReviewerName && !reviewerName.trim()) {
      setReviewerName(defaultReviewerName);
    }
  }, [defaultReviewerName, reviewerName]);

  useEffect(() => {
    let cancelled = false;
    setRatingsLoading(true);
    fetch('/api/brands/ratings', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { summaries?: Record<string, MerchantRatingSummary> } | null) => {
        if (!cancelled && data?.summaries) {
          setMerchantSummaries(data.summaries);
        }
      })
      .catch(() => {
        // Non-blocking fallback to empty summary if offline
      })
      .finally(() => {
        if (!cancelled) setRatingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Reset form notices when switching brands
  useEffect(() => {
    setRatingError(null);
    setRatingSuccess(null);
  }, [selectedBrandSlug]);

  const brands = useMemo(() => buildBrandStorefronts(products), [products]);

  const activeBrand: BrandStorefrontSummary | null = useMemo(() => {
    if (!selectedBrandSlug) return null;
    return brands.find((b) => b.slug === selectedBrandSlug) || null;
  }, [brands, selectedBrandSlug]);

  const activeMerchantSummary: MerchantRatingSummary | null = useMemo(() => {
    if (!activeBrand) return null;
    return merchantSummaries[activeBrand.slug] || EMPTY_MERCHANT_SUMMARY(activeBrand.slug);
  }, [activeBrand, merchantSummaries]);

  const sortedBrandProducts = useMemo(() => {
    if (!activeBrand) return [];
    const list = [...activeBrand.products];
    if (sortBy === 'price-asc') return list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return list.sort((a, b) => b.price - a.price);
    if (sortBy === 'rating-desc') return list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [activeBrand, sortBy]);

  const handleSubmitMerchantRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand) return;

    const cleanName = reviewerName.trim();
    if (cleanName.length < 2) {
      setRatingError(
        isRtl
          ? 'يرجى إدخال اسمك قبل إرسال تقييم التاجر.'
          : 'Please enter your name before submitting.'
      );
      return;
    }

    setSubmittingRating(true);
    setRatingError(null);
    setRatingSuccess(null);

    try {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(activeBrand.slug)}/ratings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            brandName: activeBrand.name,
            reviewerName: cleanName,
            prepSpeedRating,
            packagingQualityRating,
            comment: ratingComment.trim(),
            orderNumber: orderNumber.trim(),
          }),
        }
      );

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        entry?: MerchantRatingEntry;
        summary?: MerchantRatingSummary;
      };

      if (!res.ok || !data.summary) {
        setRatingError(
          data.error ||
            (isRtl
              ? 'تعذر حفظ تقييم التاجر، يرجى المحاولة مرة أخرى.'
              : 'Could not save merchant rating.')
        );
        return;
      }

      setMerchantSummaries((prev) => ({
        ...prev,
        [activeBrand.slug]: data.summary!,
      }));

      setRatingComment('');
      setOrderNumber('');
      setPrepSpeedRating(5);
      setPackagingQualityRating(5);
      setRatingSuccess(
        isRtl
          ? 'شكراً لك! تم احتساب تقييمك لسرعة التجهيز وجودة التغليف وتحديث متوسط التاجر.'
          : 'Thank you! Your merchant rating has been recorded and averaged.'
      );
    } catch {
      setRatingError(
        isRtl
          ? 'حدث خطأ في الاتصال أثناء إرسال التقييم.'
          : 'Connection error while submitting rating.'
      );
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={activeBrand ? () => onSelectBrandSlug(null) : onBackToHome}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-brand-300 hover:text-white inline-flex items-center gap-2 font-bold transition"
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>
                {activeBrand
                  ? isRtl
                    ? 'جميع العلامات التجارية'
                    : 'All Brands'
                  : isRtl
                  ? 'رجوع للمتجر'
                  : 'Back to Store'}
              </span>
            </button>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Store className="w-6 h-6 sm:w-7 sm:h-7 text-brand-300 shrink-0" />
            <span>
              {activeBrand
                ? getDisplayBrandName(activeBrand.name, lang)
                : isRtl
                ? 'متاجر العلامات التجارية الرسمية'
                : 'Official Brand Storefronts'}
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            {activeBrand
              ? isRtl
                ? 'منتجات أصلية 100% من الوكيل المعتمد مع ضمان سنتين وتوصيل سريع وتقييم شفاف لأداء التاجر.'
                : '100% authentic products from the authorized partner with 2-year warranty and verified merchant ratings.'
              : isRtl
              ? 'استعرض واجهة كل علامة تجارية مع تقييم المنتجات وتقييم التاجر لسرعة التجهيز وجودة التغليف.'
              : 'Browse each official brand storefront with verified product & merchant fulfillment ratings.'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs flex items-center gap-3 shrink-0">
          <Award className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="text-slate-400 block text-[10px]">
              {isRtl ? 'الماركات المعتمدة' : 'Verified Brands'}
            </span>
            <strong className="text-white font-extrabold tabular-nums">
              {brands.length} {isRtl ? 'علامة تجارية' : 'Brands'}
            </strong>
          </div>
        </div>
      </div>

      {/* View 1: All Brand Storefronts Directory */}
      {!activeBrand ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {brands.map((brand) => {
            const displayName = getDisplayBrandName(brand.name, lang);
            const mSummary =
              merchantSummaries[brand.slug] || EMPTY_MERCHANT_SUMMARY(brand.slug);
            return (
              <div
                key={brand.slug}
                className="bg-slate-900 border border-slate-800 hover:border-[#551465]/70 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xl transition"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <LazyImage
                        src={brand.featuredImage}
                        alt={displayName}
                        sizeHint="thumb"
                        wrapperClassName="w-14 h-14 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0"
                        className="w-full h-full object-cover"
                      />
                      <div className="min-w-0">
                        <h2 className="text-base font-extrabold text-white truncate">
                          {displayName}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isRtl ? 'متجر رسمي موثّق' : 'Verified Official Store'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 flex items-center gap-1 text-xs font-extrabold text-amber-300 shrink-0 tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>
                        {mSummary.ratingsCount > 0
                          ? mSummary.avgOverall.toFixed(1)
                          : brand.averageRating}
                      </span>
                    </div>
                  </div>

                  {/* Categories Covered (Clean unboxed metadata separated by ·) */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                    {brand.categories.map((cat, idx) => (
                      <React.Fragment key={cat}>
                        {idx > 0 && <span aria-hidden="true">·</span>}
                        <span>{translateCategory(cat, lang)}</span>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Merchant Fulfillment Performance Summary */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">
                        {isRtl ? 'متوسط تقييم التاجر' : 'Merchant Avg Rating'}
                      </span>
                      <span className="font-extrabold text-amber-300 tabular-nums">
                        {mSummary.ratingsCount > 0
                          ? `${mSummary.avgOverall.toFixed(1)} / 5 (${mSummary.ratingsCount})`
                          : ratingsLoading
                          ? '...'
                          : isRtl
                          ? 'لا توجد تقييمات بعد'
                          : 'No ratings yet'}
                      </span>
                    </div>
                    {mSummary.ratingsCount > 0 && (
                      <div className="flex items-center justify-between gap-2 text-slate-400 tabular-nums">
                        <span>
                          {isRtl ? 'سرعة التجهيز:' : 'Prep Speed:'}{' '}
                          <strong className="text-slate-200">{mSummary.avgPrepSpeed}/5</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {isRtl ? 'جودة التغليف:' : 'Packaging:'}{' '}
                          <strong className="text-slate-200">
                            {mSummary.avgPackagingQuality}/5
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* KPI Row */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/75 border border-slate-800 rounded-2xl p-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {isRtl ? 'المنتجات' : 'Products'}
                      </span>
                      <strong className="text-white font-extrabold tabular-nums">
                        {brand.productsCount}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {isRtl ? 'تقييم المنتجات' : 'Product Reviews'}
                      </span>
                      <strong className="text-brand-300 font-extrabold tabular-nums">
                        {brand.totalReviews}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {isRtl ? 'يبدأ من' : 'From'}
                      </span>
                      <strong className="text-emerald-400 font-extrabold text-[11px] tabular-nums">
                        {formatPrice(brand.minPrice, settings.activeCurrency, settings.yerExchangeRate)}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectBrandSlug(brand.slug)}
                  className="w-full min-h-[44px] bg-[#551465] hover:bg-brand-700 text-white text-xs font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Store className="w-4 h-4 text-brand-200" />
                  <span>{isRtl ? 'دخول متجر العلامة التجارية' : 'Visit Brand Storefront'}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        /* View 2: Selected Brand Dedicated Storefront */
        <div className="space-y-8">
          {/* Brand Header Banner with Merchant Average Rating */}
          <div className="bg-gradient-to-l from-[#551465]/35 via-slate-900 to-slate-900 border border-[#551465]/60 rounded-3xl p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <LazyImage
                src={activeBrand.featuredImage}
                alt={getDisplayBrandName(activeBrand.name, lang)}
                sizeHint="thumb"
                wrapperClassName="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-950 border-2 border-brand-400/50 shrink-0 shadow-lg"
                className="w-full h-full object-cover"
              />
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isRtl ? 'وكيل رسمي معتمد' : 'Authorized Partner'}</span>
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-300 font-bold tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>
                      {isRtl ? 'تقييم التاجر:' : 'Merchant Score:'}{' '}
                      {activeMerchantSummary && activeMerchantSummary.ratingsCount > 0
                        ? `${activeMerchantSummary.avgOverall.toFixed(1)} / 5 (${activeMerchantSummary.ratingsCount} ${isRtl ? 'تقييم' : 'ratings'})`
                        : isRtl
                        ? 'جديد'
                        : 'New'}
                    </span>
                  </span>
                </div>

                <h2 className="text-lg sm:text-2xl font-black text-white">
                  {getDisplayBrandName(activeBrand.name, lang)}
                </h2>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300 tabular-nums">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isRtl ? 'سرعة تجهيز الطلبات:' : 'Order Prep Speed:'}{' '}
                      <strong className="text-white">
                        {activeMerchantSummary && activeMerchantSummary.ratingsCount > 0
                          ? `${activeMerchantSummary.avgPrepSpeed} / 5`
                          : '—'}
                      </strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isRtl ? 'جودة التغليف:' : 'Packaging Quality:'}{' '}
                      <strong className="text-white">
                        {activeMerchantSummary && activeMerchantSummary.ratingsCount > 0
                          ? `${activeMerchantSummary.avgPackagingQuality} / 5`
                          : '—'}
                      </strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-brand-300 shrink-0" />
                    <span>
                      {activeBrand.inStockCount} / {activeBrand.productsCount}{' '}
                      {isRtl ? 'منتج متوفر' : 'in stock'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="#merchant-rating-section"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <Star className="w-4 h-4 fill-current" />
                <span>{isRtl ? 'قيّم التاجر الآن' : 'Rate This Merchant'}</span>
              </a>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                aria-label={isRtl ? 'ترتيب منتجات الماركة' : 'Sort brand products'}
                className="min-h-[42px] bg-slate-950 text-slate-200 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-[#551465]"
              >
                <option value="default">{isRtl ? 'الترتيب: الافتراضي' : 'Sort: Featured'}</option>
                <option value="price-asc">{isRtl ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
                <option value="price-desc">{isRtl ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
                <option value="rating-desc">{isRtl ? 'التقييم: الأعلى تقييماً' : 'Rating: Top Rated'}</option>
              </select>
            </div>
          </div>

          {/* Brand Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedBrandProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={onQuickView}
                onAddToCart={onAddToCart}
                onAskAI={onAskAI}
                isWishlisted={wishlistIds.includes(product.id)}
                onToggleWishlist={onToggleWishlist}
                isCompared={compareIds.includes(product.id)}
                onToggleCompare={onToggleCompare}
                onAddReview={onAddReview}
                onSelectBrand={(brandSlug) => onSelectBrandSlug(brandSlug)}
                onTryAR={onTryAR}
                activePriceAlert={priceAlerts.find((a) => a.isActive && a.productId === product.id)}
                onConfigurePriceAlert={onConfigurePriceAlert}
                settings={settings}
              />
            ))}
          </div>

          {/* Merchant Rating System Section */}
          <section
            id="merchant-rating-section"
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    {isRtl
                      ? 'نظام تقييم التاجر — سرعة التجهيز وجودة التغليف'
                      : 'Merchant Performance & Fulfillment Rating'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isRtl
                    ? 'شارك تجربتك مع متجر العلامة التجارية في تجهيز الطلبات وتغليف الشحنات لمساعدة المتسوقين.'
                    : 'Rate how fast the brand prepares orders and how securely packages arrive.'}
                </p>
              </div>
              {activeMerchantSummary && (
                <div className="text-xs text-slate-300 tabular-nums shrink-0">
                  {isRtl
                    ? `إجمالي التقييمات المسجلة: ${activeMerchantSummary.ratingsCount}`
                    : `Total ratings: ${activeMerchantSummary.ratingsCount}`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Column 1: Merchant Average & Criteria Breakdown */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      {isRtl ? 'متوسط تقييم التاجر' : 'Merchant Average'}
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {activeMerchantSummary?.ratingsCount || 0}{' '}
                      {isRtl ? 'تقييم' : 'reviews'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-black text-white tabular-nums">
                      {activeMerchantSummary && activeMerchantSummary.ratingsCount > 0
                        ? activeMerchantSummary.avgOverall.toFixed(1)
                        : '0.0'}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const score = activeMerchantSummary?.avgOverall || 0;
                          return (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(score)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {isRtl ? 'من أصل 5.0 درجات' : 'out of 5.0'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5 pt-3 border-t border-slate-800/80 text-xs">
                    {/* Order Prep Speed Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{isRtl ? 'سرعة تجهيز الطلبات' : 'Order Preparation Speed'}</span>
                        </span>
                        <span className="font-extrabold text-amber-300 tabular-nums">
                          {(activeMerchantSummary?.avgPrepSpeed || 0).toFixed(1)} / 5
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-300"
                          style={{
                            width: `${((activeMerchantSummary?.avgPrepSpeed || 0) / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Packaging Quality Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <PackageCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{isRtl ? 'جودة التغليف' : 'Packaging Quality'}</span>
                        </span>
                        <span className="font-extrabold text-emerald-400 tabular-nums">
                          {(activeMerchantSummary?.avgPackagingQuality || 0).toFixed(1)} / 5
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                          style={{
                            width: `${((activeMerchantSummary?.avgPackagingQuality || 0) / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Interactive Merchant Rating Submission Form */}
              <form
                onSubmit={handleSubmitMerchantRating}
                className="lg:col-span-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs"
              >
                <h4 className="font-extrabold text-white text-sm">
                  {isRtl ? 'أضف تقييمك للتاجر' : 'Rate Merchant Fulfillment'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <label className="block space-y-1">
                    <span className="text-slate-300 font-semibold block">
                      {isRtl ? 'الاسم' : 'Your Name'}
                    </span>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={60}
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder={isRtl ? 'مثال: عبدالله السعيد' : 'Your name'}
                      className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-slate-300 font-semibold block">
                      {isRtl ? 'رقم الطلب (اختياري للتحقق)' : 'Order # (optional)'}
                    </span>
                    <input
                      type="text"
                      maxLength={32}
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="ORD-2026-8891"
                      dir="ltr"
                      className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </label>
                </div>

                {/* Prep Speed Stars */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-bold">
                      {isRtl ? 'سرعة تجهيز الطلبات' : 'Order Prep Speed'}
                    </span>
                    <span className="text-amber-300 font-semibold tabular-nums">
                      {describeScore(prepSpeedRating, isRtl)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPrepSpeedRating(star)}
                        aria-label={
                          isRtl
                            ? `تقييم سرعة التجهيز ${star} من 5`
                            : `Rate prep speed ${star} of 5`
                        }
                        className={`min-w-[40px] min-h-[40px] rounded-xl border flex items-center justify-center transition ${
                          star <= prepSpeedRating
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Star
                          className={`w-4 h-4 ${star <= prepSpeedRating ? 'fill-amber-400' : ''}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Packaging Quality Stars */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 font-bold">
                      {isRtl ? 'جودة التغليف' : 'Packaging Quality'}
                    </span>
                    <span className="text-emerald-300 font-semibold tabular-nums">
                      {describeScore(packagingQualityRating, isRtl)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPackagingQualityRating(star)}
                        aria-label={
                          isRtl
                            ? `تقييم جودة التغليف ${star} من 5`
                            : `Rate packaging quality ${star} of 5`
                        }
                        className={`min-w-[40px] min-h-[40px] rounded-xl border flex items-center justify-center transition ${
                          star <= packagingQualityRating
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= packagingQualityRating ? 'fill-emerald-400' : ''
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="text-slate-300 font-semibold block">
                    {isRtl ? 'ملاحظاتك عن التجهيز والتغليف (اختياري)' : 'Comment (optional)'}
                  </span>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder={
                      isRtl
                        ? 'اكتب رأيك حول سرعة تجهيز التاجر وسلامة تغليف الطلب...'
                        : 'Share your thoughts on preparation speed and packaging safety...'
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </label>

                {ratingError && (
                  <p className="text-rose-300 font-semibold text-xs">{ratingError}</p>
                )}
                {ratingSuccess && (
                  <p className="text-emerald-300 font-semibold text-xs">{ratingSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={submittingRating}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submittingRating
                      ? isRtl
                        ? 'جاري الحفظ...'
                        : 'Saving...'
                      : isRtl
                      ? 'إرسال تقييم التاجر'
                      : 'Submit Merchant Rating'}
                  </span>
                </button>
              </form>

              {/* Column 3: Recent Merchant Evaluations Feed */}
              <div className="lg:col-span-4 space-y-3">
                <h4 className="font-extrabold text-white text-sm">
                  {isRtl ? 'آراء العملاء حول أداء التاجر' : 'Recent Merchant Reviews'}
                </h4>

                {!activeMerchantSummary || activeMerchantSummary.reviews.length === 0 ? (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                    {isRtl
                      ? 'كن أول من يقيّم سرعة تجهيز الطلبات وجودة التغليف لهذا التاجر.'
                      : 'Be the first to rate this merchant’s preparation speed and packaging quality.'}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {activeMerchantSummary.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-white block">{rev.reviewerName}</span>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span>
                                {new Date(rev.createdAt).toLocaleDateString(
                                  isRtl ? 'ar-SA' : 'en-US'
                                )}
                              </span>
                              {rev.verifiedOrder && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{isRtl ? 'طلب موثّق' : 'Verified Order'}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="inline-flex items-center gap-1 text-amber-300 font-extrabold tabular-nums shrink-0">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{rev.overallRating.toFixed(1)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 tabular-nums">
                          <span>
                            {isRtl ? 'سرعة التجهيز:' : 'Prep:'}{' '}
                            <strong className="text-amber-300">{rev.prepSpeedRating}/5</strong>
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span>
                            {isRtl ? 'جودة التغليف:' : 'Packaging:'}{' '}
                            <strong className="text-emerald-300">
                              {rev.packagingQualityRating}/5
                            </strong>
                          </span>
                        </div>

                        {rev.comment && (
                          <p className="text-slate-300 leading-relaxed">{rev.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
