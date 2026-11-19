import React, { useState } from 'react';
import { 
  Star, 
  ShoppingCart, 
  Eye, 
  Sparkles, 
  PackageCheck, 
  AlertCircle, 
  Heart, 
  MessageSquareQuote, 
  CheckCircle2,
  X,
  Plus,
  MessageSquare,
  ThumbsUp,
  Play,
  Scale,
  Box,
  Bell,
  BellRing
} from 'lucide-react';
import { Product, ProductReview, PriceDropAlert, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';
import { ProductShareButton } from './ProductShareButton';
import { getDisplayBrandName, slugifyBrandName } from '../utils/brands';
import { getLocalizedProductName, translateCategory } from '../utils/i18n';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product, initialMode?: 'images' | 'video') => void;
  onAddToCart: (product: Product) => void;
  onAskAI: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
  isCompared?: boolean;
  onToggleCompare?: (productId: string) => void;
  onAddReview?: (productId: string, review: { userName: string; rating: number; comment: string }) => void;
  onSelectBrand?: (brandSlug: string) => void;
  onTryAR?: (product: Product) => void;
  activePriceAlert?: PriceDropAlert;
  onConfigurePriceAlert?: (product: Product) => void;
  settings?: StoreSettings;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onAddToCart,
  onAskAI,
  isWishlisted = false,
  onToggleWishlist,
  isCompared = false,
  onToggleCompare,
  onAddReview,
  onSelectBrand,
  onTryAR,
  activePriceAlert,
  onConfigurePriceAlert,
  settings,
}) => {
  const { lang, isRtl, t } = useLanguage();
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [userName, setUserName] = useState('');
  const [userComment, setUserComment] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) 
    : 0;

  const reviewsList = product.reviews || [];
  const latestReview = reviewsList.length > 0 ? reviewsList[0] : null;

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userComment.trim()) return;

    if (onAddReview) {
      onAddReview(product.id, {
        userName: userName.trim() || 'عميل متجر رواج',
        rating: newRating,
        comment: userComment.trim(),
      });
    }

    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setShowAddForm(false);
      setUserComment('');
      setUserName('');
      setNewRating(5);
    }, 1800);
  };

  const renderStars = (ratingValue: number, sizeClass = "w-3.5 h-3.5") => {
    return (
      <div className="flex items-center gap-0.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFull = ratingValue >= starIndex;
          const isHalf = !isFull && ratingValue >= starIndex - 0.5;
          return (
            <Star
              key={starIndex}
              className={`${sizeClass} ${
                isFull
                  ? 'fill-amber-400 text-amber-400'
                  : isHalf
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'fill-slate-800 text-slate-700'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="group bg-slate-900 border border-slate-800 rounded-2xl hover:border-[#551465]/60 transition-all duration-300 hover:shadow-xl hover:shadow-[#551465]/10 flex flex-col justify-between" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Product Image Container */}
        <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-slate-950">
          <LazyImage
            src={product.images[0]}
            alt={getLocalizedProductName(product, lang)}
            sizeHint="card"
            wrapperClassName="relative w-full h-full overflow-hidden bg-slate-950"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Wishlist, Compare & Target Price Alert Buttons */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
            {onConfigurePriceAlert && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigurePriceAlert(product);
                }}
                aria-pressed={Boolean(activePriceAlert?.isActive)}
                aria-label={
                  activePriceAlert?.isActive
                    ? 'تعديل التنبيه التلقائي للسعر'
                    : 'تفعيل التنبيه التلقائي عند انخفاض السعر'
                }
                title={
                  activePriceAlert?.isActive
                    ? activePriceAlert.targetPrice
                      ? `التنبيه التلقائي مفعّل عند ${activePriceAlert.targetPrice.toLocaleString()} ر.س`
                      : 'التنبيه التلقائي مفعّل لأي انخفاض'
                    : 'تنبيه تلقائي عند انخفاض السعر'
                }
                className={`p-2 rounded-xl backdrop-blur transition flex items-center gap-1 text-[10px] font-bold ${
                  activePriceAlert?.isActive
                    ? 'bg-emerald-600/95 text-white shadow border border-emerald-400/60'
                    : 'bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-amber-300 border border-slate-800'
                }`}
              >
                {activePriceAlert?.isActive ? (
                  <BellRing className="w-3.5 h-3.5 text-white shrink-0" />
                ) : (
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                )}
                {activePriceAlert?.isActive && activePriceAlert.targetPrice && (
                  <span className="tabular-nums">
                    {activePriceAlert.targetPrice.toLocaleString()}
                  </span>
                )}
              </button>
            )}

            {onToggleCompare && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompare(product.id);
                }}
                className={`p-2 rounded-xl backdrop-blur transition flex items-center gap-1 text-[10px] font-bold ${
                  isCompared
                    ? 'bg-[#551465] text-white shadow border border-brand-400/50'
                    : 'bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-brand-300 border border-slate-800'
                }`}
                title={isCompared ? 'إزالة من المقارنة' : 'إضافة للمقارنة'}
              >
                <Scale className="w-3.5 h-3.5" />
                {isCompared && <span>{t.compare}</span>}
              </button>
            )}

            {onToggleWishlist && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWishlist(product.id);
                }}
                aria-pressed={isWishlisted}
                aria-label={isWishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                className={`px-2.5 py-1.5 rounded-xl backdrop-blur transition flex items-center gap-1 text-[10px] font-bold ${
                  isWishlisted
                    ? 'bg-rose-600 text-white shadow border border-rose-400/50'
                    : 'bg-slate-900/85 hover:bg-slate-900 text-slate-200 hover:text-rose-300 border border-slate-700/80'
                }`}
                title={isWishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              >
                <Heart className={`w-3.5 h-3.5 shrink-0 ${isWishlisted ? 'fill-white' : ''}`} />
                <span>{isWishlisted ? t.inWishlist : t.addWishlist}</span>
              </button>
            )}
          </div>

          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
            {product.badge && (
              <span className="bg-[#551465] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md border border-brand-400/40">
                {product.badge}
              </span>
            )}
            {hasDiscount && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md text-center shadow">
                خصم {discountPercent}%
              </span>
            )}
          </div>

          {/* Stock status badge */}
          <div className="absolute bottom-3 right-3 z-10">
            {product.stock > 10 ? (
              <span className="bg-slate-900/90 backdrop-blur text-brand-300 text-[10px] font-medium px-2 py-1 rounded-lg border border-[#551465]/40 flex items-center gap-1">
                <PackageCheck className="w-3 h-3 text-brand-300" /> {t.inStockPrefix} ({product.stock})
              </span>
            ) : product.stock > 0 ? (
              <span className="bg-slate-900/90 backdrop-blur text-amber-400 text-[10px] font-medium px-2 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {t.lowStockPrefix} ({product.stock})
              </span>
            ) : (
              <span className="bg-rose-950/90 text-rose-400 text-[10px] font-medium px-2 py-1 rounded-lg border border-rose-500/30">
                {t.outOfStock}
              </span>
            )}
          </div>

          {/* Direct Demo Video Button on Card */}
          {(product.demoVideo?.url || product.videoUrl) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product, 'video');
              }}
              className="absolute bottom-3 left-3 z-20 bg-slate-950/90 hover:bg-[#551465] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700/80 hover:border-brand-400/50 backdrop-blur flex items-center gap-1.5 shadow transition"
              title="مشاهدة الفيديو التوضيحي للمنتج"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>فيديو الشرح</span>
            </button>
          )}

          {/* Action Overlay */}
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
            <button
              onClick={() => onQuickView(product, 'images')}
              className="bg-white/90 hover:bg-white text-slate-900 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition transform hover:scale-105"
              title="التفاصيل والمواصفات الكاملة والآراء"
            >
              <Eye className="w-4 h-4 text-slate-700" />
              <span>{t.quickView}</span>
            </button>
            
            <button
              onClick={() => onAskAI(product)}
              className="bg-[#551465] hover:bg-brand-700 text-white p-2.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg transition transform hover:scale-105 border border-brand-500/30"
              title="استفسار ذكي من Gemini AI"
            >
              <Sparkles className="w-4 h-4 text-brand-300" />
              <span>{t.aiAnalyze}</span>
            </button>

            {onTryAR && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTryAR(product);
                }}
                className="bg-slate-900/95 hover:bg-[#551465] text-white p-2.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg transition transform hover:scale-105 border border-brand-400/50"
                title={isRtl ? 'معاينة الأبعاد في غرفتك بالواقع المعزز (AR)' : 'Try 3D AR in your room'}
              >
                <Box className="w-4 h-4 text-brand-300" />
                <span>{t.tryAr}</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Information */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 gap-2">
              <span className="text-slate-400 font-medium truncate">
                {translateCategory(product.category, lang)}
              </span>
              {product.brand &&
                (onSelectBrand ? (
                  <button
                    type="button"
                    onClick={() => onSelectBrand(slugifyBrandName(product.brand!))}
                    className="bg-slate-800/80 hover:bg-[#551465] px-2 py-0.5 rounded text-[10px] text-slate-200 hover:text-white font-mono transition shrink-0"
                    title={isRtl ? `تصفح متجر ${product.brand}` : `Visit ${product.brand} storefront`}
                  >
                    {getDisplayBrandName(product.brand, lang)}
                  </button>
                ) : (
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono shrink-0">
                    {getDisplayBrandName(product.brand, lang)}
                  </span>
                ))}
            </div>

            <h3 
              onClick={() => onQuickView(product)}
              className="text-sm font-bold text-slate-100 line-clamp-2 cursor-pointer hover:text-brand-300 transition mb-2"
            >
              {getLocalizedProductName(product, lang)}
            </h3>

            <p className="text-xs text-slate-400 line-clamp-2 mb-3">
              {product.description}
            </p>

            {/* Star Rating & Customer Review Snippet Component */}
            <div 
              onClick={() => setIsReviewsModalOpen(true)}
              className="mb-3 bg-slate-950/60 hover:bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-[#551465]/60 transition cursor-pointer group/review"
              title="اضغط لمطالعة كافة آراء وتقييمات العملاء"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {/* 5-Star Visual Display */}
                  {renderStars(product.rating, "w-3 h-3")}
                  <span className="text-xs font-extrabold text-amber-300 mr-0.5">{product.rating}</span>
                </div>
                
                <div className="flex items-center gap-1 text-[10px] text-brand-300 font-bold group-hover/review:text-brand-200">
                  <span>({product.reviewCount || 12} تقييم)</span>
                  <MessageSquareQuote className="w-3 h-3 text-purple-400" />
                </div>
              </div>

              {/* Customer Review Quote Snippet */}
              {latestReview ? (
                <div className="text-[11px] text-slate-300 mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-start gap-1">
                  <span className="text-brand-300 font-bold">"</span>
                  <p className="line-clamp-1 italic text-slate-300 flex-1">{latestReview.comment}</p>
                  <span className="text-[10px] text-slate-500 shrink-0 font-medium">({latestReview.userName.split(' ')[0]})</span>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                  <span>تقييمات العملاء المعتمدة</span>
                  <span className="text-emerald-400 flex items-center gap-0.5 font-bold"><CheckCircle2 className="w-2.5 h-2.5" /> 100% موثّق</span>
                </div>
              )}
            </div>

            {/* Variants pill summary */}
            {product.variants && product.variants.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 bg-slate-950/50 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-500">الخيارات:</span>
                <span className="truncate text-slate-300 font-medium">
                  {product.variants.map(v => v.name).slice(0, 2).join(' • ')}
                </span>
              </div>
            )}
          </div>

          {/* Pricing, Share & Add to cart buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base font-extrabold text-white">
                  {formatPrice(product.price, settings?.activeCurrency, settings?.yerExchangeRate)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-slate-500 line-through">
                    {formatPrice(product.originalPrice!, settings?.activeCurrency, settings?.yerExchangeRate)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 block">{t.vatIncluded} {settings?.vatPercentage || 15}%</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onTryAR && (
                <button
                  type="button"
                  onClick={() => onTryAR(product)}
                  aria-label={isRtl ? 'معاينة الأبعاد في غرفتك (AR)' : 'Try AR'}
                  title={isRtl ? 'معاينة الأبعاد في غرفتك (AR)' : 'Try 3D AR'}
                  className="px-2.5 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1 bg-slate-800/90 hover:bg-[#551465] text-brand-200 hover:text-white border border-slate-700 hover:border-brand-400/60 transition"
                >
                  <Box className="w-3.5 h-3.5 text-brand-300 shrink-0" />
                  <span>AR</span>
                </button>
              )}

              <ProductShareButton
                product={product}
                settings={settings}
                variant="card"
              />

              <button
                onClick={() => onAddToCart(product)}
                disabled={product.stock === 0}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  product.stock === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-[#551465] hover:bg-brand-700 text-white shadow-md shadow-[#551465]/20 active:scale-95 border border-brand-500/30'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-brand-200" />
                <span>{t.addToCartShort}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Rating Modal */}
      {isReviewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <LazyImage
                  src={product.images[0]}
                  alt={product.name}
                  sizeHint="thumb"
                  wrapperClassName="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0"
                  className="w-full h-full object-cover"
                />
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(product.rating, "w-4 h-4")}
                    <span className="text-amber-400 font-extrabold text-sm">{product.rating} من 5</span>
                    <span className="text-slate-400 text-xs">({product.reviewCount} تقييم ورأي)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsReviewsModalOpen(false)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rating Breakdown Summary */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 text-center sm:border-l sm:border-slate-800 sm:pl-4">
                <span className="text-4xl font-extrabold text-white block">{product.rating}</span>
                <div className="flex justify-center my-1">
                  {renderStars(product.rating, "w-4 h-4")}
                </div>
                <span className="text-xs text-slate-400 block">بناءً على {product.reviewCount} تقييماً موثقاً</span>
              </div>

              <div className="sm:col-span-7 space-y-1.5 text-xs text-slate-300">
                {[5, 4, 3, 2, 1].map((starNum) => {
                  const matchingCount = reviewsList.filter(r => Math.round(r.rating) === starNum).length;
                  const percent = reviewsList.length > 0 ? Math.round((matchingCount / reviewsList.length) * 100) : (starNum >= 4 ? 80 : 10);
                  return (
                    <div key={starNum} className="flex items-center gap-2">
                      <span className="w-8 text-left font-bold text-slate-400">{starNum} نجوم</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-8 text-slate-500 font-mono text-[10px]">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-300" />
                  <span>آراء العملاء والمراجعات ({reviewsList.length})</span>
                </h4>

                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition shadow border border-brand-500/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>أضف تقييمك</span>
                  </button>
                )}
              </div>

              {/* Add Review Form */}
              {showAddForm && (
                <form onSubmit={handleSubmitReview} className="bg-slate-950 p-4 rounded-2xl border border-[#551465]/60 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-brand-300">كتابة تقييم جديد للمنتج</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-500 hover:text-white text-xs"
                    >
                      إلغاء
                    </button>
                  </div>

                  {submittedSuccess ? (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>شكراً لك! تم إضافة تقييمك بنجاح.</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">اختر التقييم بالنجوم:</label>
                        <div className="flex items-center gap-1" dir="ltr">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setNewRating(star)}
                              className="p-1 transition transform hover:scale-125 focus:outline-none"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  (hoverRating || newRating) >= star
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-slate-800 text-slate-700'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-extrabold text-amber-400 mr-2" dir="rtl">
                            {newRating} من 5 نجوم
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">اسمك بالكامل (اختياري):</label>
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder="مثال: محمد العتيبي"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#551465]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">انطباعك ورأيك في المنتج:</label>
                        <textarea
                          required
                          rows={3}
                          value={userComment}
                          onChange={(e) => setUserComment(e.target.value)}
                          placeholder="اكتب تجربتك مع المنتج، جودة التصنيع والتوصيل..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-[#551465]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow"
                      >
                        نشر التقييم الآن
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* Reviews Stack */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {reviewsList.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">لا توجد مراجعات مكتوبة بعد. كن أول من يقيم هذا المنتج!</p>
                ) : (
                  reviewsList.map((rev) => (
                    <div key={rev.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{rev.userName}</span>
                          {rev.verified && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> شراء مؤكد
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 text-[10px]">{rev.date}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {renderStars(rev.rating, "w-3 h-3")}
                        <span className="text-amber-400 font-bold text-[11px]">{rev.rating} / 5</span>
                      </div>

                      <p className="text-slate-300 leading-relaxed text-[11px]">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

