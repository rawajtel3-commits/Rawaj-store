import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  Heart,
  Lock,
  PackageCheck,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Truck,
  Zap,
  X,
} from 'lucide-react';
import type {
  AmazonSaCatalogResponse,
  AmazonSaCategoryKey,
  AmazonSaProduct,
  Product,
  StoreSettings,
} from '../../types';
import { formatPrice } from '../../utils/currency';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  AMAZON_SA_HERO_IMAGE,
  resolveAmazonSaImage,
  toRawajProductFromAmazonSa,
} from '../../utils/amazonSaMedia';

interface AmazonSaPageProps {
  settings: StoreSettings;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onQuickView: (product: Product, initialMode?: 'images' | 'video') => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
  onCatalogItemsSynced?: (products: Product[]) => void;
  onBackToHome: () => void;
}

type AmazonSortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'rating-desc'
  | 'discount-desc';

const CATEGORY_TABS: {
  id: AmazonSaCategoryKey;
  labelAr: string;
  labelEn: string;
}[] = [
  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
  { id: 'electronics', labelAr: 'حواسيب وإلكترونيات', labelEn: 'Computing' },
  { id: 'mobiles', labelAr: 'جوالات وصوتيات', labelEn: 'Audio & Mobile' },
  { id: 'home_kitchen', labelAr: 'المنزل والقهوة الذكية', labelEn: 'Home & Coffee' },
  { id: 'gaming', labelAr: 'ألعاب الفيديو', labelEn: 'Gaming' },
  { id: 'watches_perfumes', labelAr: 'ساعات وإكسسوارات', labelEn: 'Watches' },
];

interface AmazonProductCardProps {
  item: AmazonSaProduct;
  settings: StoreSettings;
  isRtl: boolean;
  isWishlisted: boolean;
  isCompared: boolean;
  isRefreshing: boolean;
  justAdded: boolean;
  onRefreshItem: (asin: string) => void;
  onAddToCart: (item: AmazonSaProduct) => void;
  onBuyNow: (item: AmazonSaProduct) => void;
  onOpenDetails: (item: AmazonSaProduct) => void;
  onToggleWishlist: (item: AmazonSaProduct) => void;
  onToggleCompare: (item: AmazonSaProduct) => void;
}

const AmazonProductCard = memo<AmazonProductCardProps>(
  ({
    item,
    settings,
    isRtl,
    isWishlisted,
    isCompared,
    isRefreshing,
    justAdded,
    onRefreshItem,
    onAddToCart,
    onBuyNow,
    onOpenDetails,
    onToggleWishlist,
    onToggleCompare,
  }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const imgSrc = resolveAmazonSaImage(item);
    const displayTitle = isRtl ? item.title : item.titleEn;
    const displayCategory = isRtl ? item.categoryLabelAr : item.categoryLabelEn;
    const displayAvailability = isRtl
      ? item.availabilityTextAr
      : item.availabilityTextEn;
    const displayDelivery = isRtl
      ? item.deliveryEstimateAr
      : item.deliveryEstimateEn;

    return (
      <article className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:border-amber-500/40">
        {/* Product Media Slot (4:3 consistent aspect ratio) */}
        <div
          onClick={() => onOpenDetails(item)}
          className="relative aspect-[4/3] bg-zinc-900 overflow-hidden cursor-pointer group"
        >
          {!imgFailed ? (
            <img
              src={imgSrc}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-center">
              <PackageCheck className="w-8 h-8 text-amber-400 mb-2" />
              <span className="text-xs font-semibold text-slate-300 line-clamp-2">
                {displayTitle}
              </span>
            </div>
          )}

          {/* Subtle gradient scrim at bottom for quick action contrast */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />

          {/* Secondary actions: Wishlist & Compare */}
          <div
            className={`absolute top-2.5 ${isRtl ? 'left-2.5' : 'right-2.5'} flex items-center gap-1.5`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(item);
              }}
              aria-label={isRtl ? 'حفظ في المفضلة' : 'Save to wishlist'}
              className={`min-w-[36px] min-h-[36px] rounded-xl border flex items-center justify-center transition ${
                isWishlisted
                  ? 'bg-rose-600/90 border-rose-400 text-white'
                  : 'bg-slate-950/80 border-slate-700/80 text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(item);
              }}
              aria-label={isRtl ? 'مقارنة المنتج' : 'Compare product'}
              className={`min-w-[36px] min-h-[36px] rounded-xl border flex items-center justify-center transition ${
                isCompared
                  ? 'bg-amber-500 border-amber-300 text-slate-950'
                  : 'bg-slate-950/80 border-slate-700/80 text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Scale className="w-4 h-4" />
            </button>
          </div>

          {/* Single subtle availability/Prime text tag */}
          {item.isPrime && (
            <div
              className={`absolute bottom-2.5 ${isRtl ? 'right-3' : 'left-3'} flex items-center gap-1.5 text-[11px] font-bold text-amber-300`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>{isRtl ? 'برايم السعودية' : 'Amazon Prime SA'}</span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            {/* Unboxed Metadata Line (Brand · Category · ASIN) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <span className="font-semibold text-amber-300/90 uppercase tracking-wide shrink-0">
                {item.brand}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{displayCategory}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px] text-slate-500 shrink-0" dir="ltr">
                {item.asin}
              </span>
            </div>

            {/* Product Title */}
            <button
              type="button"
              onClick={() => onOpenDetails(item)}
              className={`text-sm font-semibold text-white hover:text-amber-300 transition leading-snug line-clamp-2 ${
                isRtl ? 'text-right' : 'text-left'
              }`}
            >
              {displayTitle}
            </button>

            {/* Rating + Reviews */}
            <div className="flex items-center gap-2 text-xs text-slate-300 tabular-nums">
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{item.rating.toFixed(1)}</span>
              </span>
              <span className="text-slate-500">({item.reviewCount.toLocaleString()})</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span
                className={
                  item.availability === 'in_stock'
                    ? 'text-emerald-400'
                    : item.availability === 'low_stock'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {displayAvailability}
              </span>
            </div>

            {/* Delivery Window */}
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
              <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{displayDelivery}</span>
            </p>
          </div>

          {/* Pricing & Primary Controls */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-base font-extrabold text-white">
                  {formatPrice(item.priceSar, settings)}
                </span>
                {item.listPriceSar && item.listPriceSar > item.priceSar && (
                  <span className="text-xs text-slate-500 line-through">
                    {formatPrice(item.listPriceSar, settings)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onRefreshItem(item.asin)}
                disabled={isRefreshing}
                aria-label={isRtl ? 'تحديث السعر والتوفر' : 'Refresh price & stock'}
                title={isRtl ? 'تحديث السعر والتوفر الآن' : 'Refresh live price & stock'}
                className="min-h-[32px] px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 text-[11px] font-medium inline-flex items-center gap-1 transition whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`}
                />
                <span>{isRtl ? 'تحديث السعر' : 'Sync'}</span>
              </button>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                disabled={item.availability === 'out_of_stock'}
                className={`col-span-6 min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  justAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 disabled:opacity-50'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{isRtl ? 'أضيف للسلة' : 'Added'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>{isRtl ? 'أضف للسلة' : 'Add to Cart'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onBuyNow(item)}
                disabled={item.availability === 'out_of_stock'}
                className="col-span-4 min-h-[44px] px-2.5 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs inline-flex items-center justify-center transition whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <span>{isRtl ? 'شراء مباشر' : 'Buy Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDetails(item)}
                aria-label={isRtl ? 'عرض تفاصيل المنتج' : 'View product details'}
                className="col-span-2 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center justify-center transition"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }
);

AmazonProductCard.displayName = 'AmazonProductCard';

export const AmazonSaPage: React.FC<AmazonSaPageProps> = ({
  settings,
  onAddToCart,
  onBuyNow,
  onQuickView,
  wishlistIds,
  onToggleWishlist,
  compareIds,
  onToggleCompare,
  onCatalogItemsSynced,
  onBackToHome,
}) => {
  const { isRtl } = useLanguage();

  // Filter & query state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<AmazonSaCategoryKey>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [inStockOnly, setInStockOnly] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<AmazonSortOption>('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Catalog fetch & cache state
  const [catalogData, setCatalogData] = useState<AmazonSaCatalogResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingAsin, setRefreshingAsin] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const clientCacheRef = useRef<Map<string, AmazonSaCatalogResponse>>(new Map());
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce search query (160ms) to keep typing responsive & avoid noisy API calls
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 160);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (category !== 'all') params.set('category', category);
    if (selectedBrand) params.set('brand', selectedBrand);
    if (minPrice.trim()) params.set('minPrice', minPrice.trim());
    if (maxPrice.trim()) params.set('maxPrice', maxPrice.trim());
    if (minRating > 0) params.set('minRating', String(minRating));
    if (primeOnly) params.set('primeOnly', '1');
    if (inStockOnly) params.set('inStockOnly', '1');
    if (sortBy !== 'featured') params.set('sort', sortBy);
    return params.toString();
  }, [
    debouncedQuery,
    category,
    selectedBrand,
    minPrice,
    maxPrice,
    minRating,
    primeOnly,
    inStockOnly,
    sortBy,
  ]);

  const fetchCatalog = useCallback(
    async (bypassClientCache = false, signal?: AbortSignal) => {
      if (!bypassClientCache) {
        const cached = clientCacheRef.current.get(queryString);
        if (cached) {
          setCatalogData(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      setLoading((prev) => (catalogData === null ? true : prev));
      setError(null);

      try {
        const res = await fetch(
          `/api/amazon-sa/products${queryString ? `?${queryString}` : ''}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal,
          }
        );

        if (!res.ok) {
          throw new Error(
            isRtl
              ? 'تعذر تحميل منتجات أمازون السعودية حالياً.'
              : 'Failed to load Amazon Saudi Arabia catalog.'
          );
        }

        const data = (await res.json()) as AmazonSaCatalogResponse;
        clientCacheRef.current.set(queryString, data);
        setCatalogData(data);
        onCatalogItemsSynced?.(data.items.map(toRawajProductFromAmazonSa));
        setError(null);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : isRtl
            ? 'حدث خطأ أثناء الاتصال بالخادم.'
            : 'Network error while fetching catalog.'
        );
      } finally {
        setLoading(false);
      }
    },
    [queryString, isRtl, catalogData]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalog(false, controller.signal);
    return () => controller.abort();
  }, [queryString]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshSingleItem = useCallback(async (asin: string) => {
    setRefreshingAsin(asin);
    try {
      const res = await fetch(
        `/api/amazon-sa/products/${encodeURIComponent(asin)}/refresh?force=1`,
        { method: 'GET', headers: { Accept: 'application/json' } }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { item?: AmazonSaProduct };
      if (!data.item) return;

      setCatalogData((prev) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((entry) =>
          entry.asin === asin ? data.item! : entry
        );
        onCatalogItemsSynced?.(updatedItems.map(toRawajProductFromAmazonSa));
        return {
          ...prev,
          syncedAt: data.item!.lastSyncedAt,
          items: updatedItems,
        };
      });
    } finally {
      setRefreshingAsin(null);
    }
  }, []);

  const handleAddAmazonItemToCart = useCallback(
    (item: AmazonSaProduct) => {
      const mapped = toRawajProductFromAmazonSa(item);
      onAddToCart(mapped);
      setJustAddedId(item.id);
      window.setTimeout(() => {
        setJustAddedId((curr) => (curr === item.id ? null : curr));
      }, 1500);
    },
    [onAddToCart]
  );

  const handleBuyNowAmazonItem = useCallback(
    (item: AmazonSaProduct) => {
      const mapped = toRawajProductFromAmazonSa(item);
      onBuyNow(mapped);
    },
    [onBuyNow]
  );

  const handleOpenAmazonItemDetails = useCallback(
    (item: AmazonSaProduct) => {
      onQuickView(toRawajProductFromAmazonSa(item), 'images');
    },
    [onQuickView]
  );

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedQuery('');
    setCategory('all');
    setSelectedBrand('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setPrimeOnly(false);
    setInStockOnly(true);
    setSortBy('featured');
  };

  const activeFiltersCount =
    (category !== 'all' ? 1 : 0) +
    (selectedBrand ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (primeOnly ? 1 : 0);

  const items = catalogData?.items ?? [];
  const availableBrands = catalogData?.availableBrands ?? [];
  const categoryCounts = catalogData?.categoryCounts;

  const filterSidebarContent = (
    <div className="space-y-5 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <span className="font-bold text-white text-sm">
          {isRtl ? 'فلاتر البحث المتقدمة' : 'Advanced Filters'}
        </span>
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-amber-400 hover:text-amber-300 font-semibold transition"
          >
            {isRtl ? 'إعادة ضبط' : 'Reset'}
          </button>
        )}
      </div>

      {/* Prime & Warehouse Availability Toggles */}
      <div className="space-y-2.5">
        <label className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
          <span className="text-slate-200 font-medium flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isRtl ? 'شحن برايم السريع فقط' : 'Prime Delivery Only'}</span>
          </span>
          <input
            type="checkbox"
            checked={primeOnly}
            onChange={(e) => setPrimeOnly(e.target.checked)}
            className="accent-amber-400 w-4 h-4 rounded"
          />
        </label>

        <label className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
          <span className="text-slate-200 font-medium flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{isRtl ? 'المتوفر حالياً فقط' : 'In Stock Only'}</span>
          </span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="accent-amber-400 w-4 h-4 rounded"
          />
        </label>
      </div>

      {/* Brand Selector */}
      <div className="space-y-2">
        <span className="block font-bold text-slate-300">
          {isRtl ? 'العلامة التجارية' : 'Brand'}
        </span>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          aria-label={isRtl ? 'تصفية حسب العلامة التجارية' : 'Filter by brand'}
          className="w-full min-h-[40px] bg-slate-950 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-amber-400"
        >
          <option value="">
            {isRtl ? 'جميع الماركات المعتمدة' : 'All Authorized Brands'}
          </option>
          {availableBrands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range (SAR) */}
      <div className="space-y-2">
        <span className="block font-bold text-slate-300">
          {isRtl ? 'نطاق السعر (ر.س)' : 'Price Range (SAR)'}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={isRtl ? 'من' : 'Min'}
            aria-label={isRtl ? 'الحد الأدنى للسعر' : 'Minimum price'}
            className="w-full min-h-[38px] bg-slate-950 text-white border border-slate-700 rounded-xl px-3 py-1.5 text-xs tabular-nums focus:outline-none focus:border-amber-400"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={isRtl ? 'إلى' : 'Max'}
            aria-label={isRtl ? 'الحد الأقصى للسعر' : 'Maximum price'}
            className="w-full min-h-[38px] bg-slate-950 text-white border border-slate-700 rounded-xl px-3 py-1.5 text-xs tabular-nums focus:outline-none focus:border-amber-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { labelAr: 'أقل من 1,000', labelEn: 'Under 1,000', min: '', max: '1000' },
            { labelAr: '1,000 - 3,000', labelEn: '1,000 - 3,000', min: '1000', max: '3000' },
            { labelAr: 'فوق 3,000', labelEn: '3,000+', min: '3000', max: '' },
          ].map((preset) => (
            <button
              key={preset.labelEn}
              type="button"
              onClick={() => {
                setMinPrice(preset.min);
                setMaxPrice(preset.max);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 font-medium transition whitespace-nowrap"
            >
              {isRtl ? preset.labelAr : preset.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Minimum Customer Rating */}
      <div className="space-y-2">
        <span className="block font-bold text-slate-300">
          {isRtl ? 'الحد الأدنى للتقييم' : 'Customer Rating'}
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 4.5, 4.7, 4.9].map((ratingVal) => (
            <button
              key={ratingVal}
              type="button"
              onClick={() => setMinRating(ratingVal)}
              className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition whitespace-nowrap ${
                minRating === ratingVal
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {ratingVal === 0 ? (
                <span>{isRtl ? 'كل التقييمات' : 'All'}</span>
              ) : (
                <>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="tabular-nums">{ratingVal}+</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Section 1: Focused Amazon.sa Storefront Hero Showcase */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 inline-flex items-center gap-2 transition whitespace-nowrap shrink-0"
                >
                  {isRtl ? (
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ArrowLeft className="w-4 h-4 text-amber-400" />
                  )}
                  <span>{isRtl ? 'العودة للرئيسية' : 'Back to Store'}</span>
                </button>

                <span className="text-xs text-slate-400 font-medium">
                  {isRtl
                    ? 'أمازون السعودية · أسعار محدثة مباشرة بالريال'
                    : 'Amazon Saudi Arabia · Live SAR Pricing'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight max-w-2xl">
                {isRtl
                  ? 'تسوق منتجات أمازون السعودية مباشرة من داخل رواج ستور'
                  : 'Shop Amazon Saudi Arabia Directly Inside Rawaj Store'}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                {isRtl
                  ? 'استعرض الإلكترونيات، الجوالات، أجهزة المنزل والقهوة الذكية بأسعار أمازون السعودية المحدثة، وأتمم الشراء بسلة واحدة موحدة وحماية كاملة لبياناتك.'
                  : 'Browse verified Amazon.sa electronics, smart coffee gear, and wearables with real-time price and stock sync through a unified encrypted Rawaj checkout.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 transition whitespace-nowrap shrink-0"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>
                  {isRtl ? 'ابحث في كتالوج أمازون السعودية' : 'Search Amazon.sa Catalog'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => fetchCatalog(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs inline-flex items-center gap-2 transition whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
                <span>{isRtl ? 'تحديث الأسعار والتوفر' : 'Refresh Prices & Stock'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full bg-zinc-900">
            {!heroImgFailed ? (
              <img
                src={AMAZON_SA_HERO_IMAGE}
                alt={
                  isRtl
                    ? 'منتجات أمازون السعودية المختارة في متجر رواج'
                    : 'Featured Amazon Saudi Arabia showcase in Rawaj Store'
                }
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full object-cover lg:h-full"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-8 text-center">
                <ShoppingBag className="w-10 h-10 text-amber-400 mb-3" />
                <span className="text-sm font-bold text-white">Amazon.sa × Rawaj Store</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Section 2: Search, Category Bar & Product Grid */}
      <section className="space-y-5">
        {/* Top Search & Sort Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          {/* Category Segmented Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
            {CATEGORY_TABS.map((tab) => {
              const isActive = category === tab.id;
              const count = categoryCounts?.[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>{isRtl ? tab.labelAr : tab.labelEn}</span>
                  {typeof count === 'number' && (
                    <span
                      className={`text-[11px] tabular-nums ${
                        isActive ? 'text-slate-900/80' : 'text-slate-500'
                      }`}
                    >
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input + Mobile Filter Button + Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64 lg:w-72">
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  isRtl ? 'ابحث بالاسم، الماركة، أو ASIN...' : 'Search by name, brand, or ASIN...'
                }
                aria-label={isRtl ? 'بحث في منتجات أمازون السعودية' : 'Search Amazon.sa'}
                className={`w-full min-h-[40px] bg-slate-900 text-white placeholder-slate-400 rounded-xl py-2 text-xs border border-slate-700 focus:outline-none focus:border-amber-400 ${
                  isRtl ? 'pr-9 pl-9' : 'pl-9 pr-9'
                }`}
              />
              <Search
                className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label={isRtl ? 'مسح البحث' : 'Clear search'}
                  className={`p-1 rounded-lg text-slate-400 hover:text-white absolute top-1/2 -translate-y-1/2 ${
                    isRtl ? 'left-2' : 'right-2'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <span>{isRtl ? 'فلترة' : 'Filters'}</span>
              {activeFiltersCount > 0 && (
                <span className="text-amber-400 tabular-nums">({activeFiltersCount})</span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as AmazonSortOption)}
              aria-label={isRtl ? 'ترتيب المنتجات' : 'Sort products'}
              className="min-h-[40px] bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="featured">{isRtl ? 'الأبرز والأكثر طلباً' : 'Featured'}</option>
              <option value="price-asc">{isRtl ? 'السعر: الأقل أولاً' : 'Price: Low to High'}</option>
              <option value="price-desc">{isRtl ? 'السعر: الأعلى أولاً' : 'Price: High to Low'}</option>
              <option value="rating-desc">{isRtl ? 'الأعلى تقييماً' : 'Top Rated'}</option>
              <option value="discount-desc">{isRtl ? 'أعلى نسبة خصم' : 'Biggest Savings'}</option>
            </select>
          </div>
        </div>

        {/* Main 2-Column Layout: Sidebar Filters + 3-Column Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 sticky top-28">
            {filterSidebarContent}
          </aside>

          {/* Products Viewport */}
          <div className="lg:col-span-9 space-y-4">
            {/* Compact Result Summary Row (Clean unboxed typography) */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 tabular-nums">
                <span>
                  {isRtl
                    ? `عرض ${items.length} منتج من أمازون السعودية`
                    : `Showing ${items.length} Amazon.sa products`}
                </span>
                {catalogData?.syncedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {isRtl ? 'آخر مزامنة:' : 'Synced:'}{' '}
                      {new Date(catalogData.syncedAt).toLocaleTimeString(
                        isRtl ? 'ar-SA' : 'en-US',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  </>
                )}
              </div>
              {selectedBrand && (
                <button
                  type="button"
                  onClick={() => setSelectedBrand('')}
                  className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1"
                >
                  <span>{selectedBrand}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {error ? (
              <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center space-y-3">
                <p className="text-sm font-bold text-rose-300">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchCatalog(true)}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-2 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{isRtl ? 'إعادة المحاولة' : 'Retry'}</span>
                </button>
              </div>
            ) : loading && items.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/3] bg-slate-800" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 w-1/2 bg-slate-800 rounded" />
                      <div className="h-4 w-full bg-slate-800 rounded" />
                      <div className="h-4 w-2/3 bg-slate-800 rounded" />
                      <div className="h-10 w-full bg-slate-800 rounded-xl mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <Search className="w-9 h-9 text-slate-500 mx-auto" />
                <h3 className="text-base font-bold text-white">
                  {isRtl
                    ? 'لا توجد منتجات مطابقة لخيارات البحث'
                    : 'No Amazon.sa items match your filters'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isRtl
                    ? 'جرّب تعديل نطاق السعر أو إزالة فلتر الماركة لعرض باقي المنتجات المتوفرة.'
                    : 'Try adjusting the price range or clearing brand filters to see more results.'}
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
                >
                  {isRtl ? 'إعادة ضبط جميع الفلاتر' : 'Reset All Filters'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {items.map((item) => (
                  <AmazonProductCard
                    key={item.asin}
                    item={item}
                    settings={settings}
                    isRtl={isRtl}
                    isWishlisted={wishlistIds.includes(item.id)}
                    isCompared={compareIds.includes(item.id)}
                    isRefreshing={refreshingAsin === item.asin}
                    justAdded={justAddedId === item.id}
                    onRefreshItem={handleRefreshSingleItem}
                    onAddToCart={handleAddAmazonItemToCart}
                    onBuyNow={handleBuyNowAmazonItem}
                    onOpenDetails={handleOpenAmazonItemDetails}
                    onToggleWishlist={(it) => onToggleWishlist(it.id)}
                    onToggleCompare={(it) => onToggleCompare(it.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Security, Data Privacy & Purchase Assurance */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-6 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-white">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isRtl ? 'تكامل خادم مشفّر وحماية المفاتيح' : 'Encrypted Server Proxy'}
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {isRtl
              ? 'تتم جميع طلبات التوقيع والربط مع أمازون السعودية عبر خادم رواج المشفّر دون تمرير أي بيانات حساسة لمتصفح العميل.'
              : 'All Amazon.sa requests are signed server-side over HTTPS without exposing credentials to the browser.'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isRtl ? 'خصوصية كاملة وإتمام دفع محلي' : 'Private Unified Checkout'}
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {isRtl
              ? 'أضف منتجات أمازون السعودية مباشرة إلى سلة رواج وأكمل الدفع بطرقك المحلية الآمنة دون مغادرة المتجر.'
              : 'Add Amazon.sa items straight to your Rawaj bag and complete payment locally without leaving the store.'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-white">
            <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0" />
            <span>
              {isRtl ? 'فحص المطابقة وضمان الوكيل' : 'Verified Quality & Warranty'}
            </span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            {isRtl
              ? 'نراجع كل طلبية ونتأكد من مطابقة المواصفات والضمان المحلي وتوافق الجهد الكهربائي 220 فولت قبل الشحن.'
              : 'Every order is verified for authenticity, local warranty coverage, and 220V regional power compliance.'}
          </p>
        </div>
      </section>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-white text-sm">
                {isRtl ? 'خيارات الفلترة' : 'Filter Options'}
              </span>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                aria-label={isRtl ? 'إغلاق الفلترة' : 'Close filters'}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {filterSidebarContent}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full min-h-[44px] rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs"
            >
              {isRtl ? `عرض النتائج (${items.length})` : `Show Results (${items.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
