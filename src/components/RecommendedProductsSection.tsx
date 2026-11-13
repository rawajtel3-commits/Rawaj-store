import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  ShoppingCart,
  Star,
  RefreshCw,
  Eye,
  Check,
  ArrowUpLeft,
  History,
  ShoppingBag,
} from 'lucide-react';
import {
  BrowsingHistoryEntry,
  CartItem,
  CrossSellRecommendationResult,
  Order,
  Product,
  StoreSettings,
} from '../types';
import {
  RecommendationFocusMode,
  computeDeterministicCrossSell,
  extractPurchaseSignals,
} from '../utils/recommendations';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';

interface RecommendedProductsSectionProps {
  currentProduct: Product;
  allProducts: Product[];
  browsingHistory: BrowsingHistoryEntry[];
  orders: Order[];
  cartItems: CartItem[];
  settings?: StoreSettings;
  onSelectProduct: (product: Product) => void;
  onQuickAddToCart: (product: Product) => void;
}

export const RecommendedProductsSection: React.FC<RecommendedProductsSectionProps> = ({
  currentProduct,
  allProducts,
  browsingHistory,
  orders,
  cartItems,
  settings,
  onSelectProduct,
  onQuickAddToCart,
}) => {
  const [focusMode, setFocusMode] = useState<RecommendationFocusMode>('all');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  const purchaseSignals = useMemo(() => extractPurchaseSignals(orders), [orders]);
  const cartProductIds = useMemo(
    () => Array.from(new Set(cartItems.map((item) => item.product.id))),
    [cartItems]
  );

  // Instant deterministic seed so UI has zero empty flash, then upgrades via server AI endpoint
  const [result, setResult] = useState<CrossSellRecommendationResult>(() =>
    computeDeterministicCrossSell({
      currentProduct,
      catalog: allProducts,
      browsingHistory,
      purchaseHistory: purchaseSignals,
      cartProductIds,
      focusMode: 'all',
      maxResults: 3,
    })
  );

  const fetchRecommendations = useCallback(
    async (signal: AbortSignal) => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/recommendations/cross-sell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            currentProductId: currentProduct.id,
            products: allProducts.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              category: p.category,
              categoryNameAr: p.categoryNameAr,
              price: p.price,
              originalPrice: p.originalPrice,
              rating: p.rating,
              stock: p.stock,
              description: p.description,
            })),
            browsingHistory,
            purchaseHistory: purchaseSignals,
            cartProductIds,
            focusMode,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as CrossSellRecommendationResult;
        if (data && Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          setResult(data);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        // Fallback to deterministic cross-sell computation seamlessly
        setResult(
          computeDeterministicCrossSell({
            currentProduct,
            catalog: allProducts,
            browsingHistory,
            purchaseHistory: purchaseSignals,
            cartProductIds,
            focusMode,
            maxResults: 3,
          })
        );
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [
      currentProduct,
      allProducts,
      browsingHistory,
      purchaseSignals,
      cartProductIds,
      focusMode,
      refreshNonce,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendations(controller.signal);
    return () => controller.abort();
  }, [fetchRecommendations]);

  const resolvedCards = useMemo(() => {
    const productMap = new Map<string, Product>(allProducts.map((p) => [p.id, p]));
    return result.recommendations
      .map((rec) => {
        const prod = productMap.get(rec.productId);
        if (!prod || prod.id === currentProduct.id) return null;
        return { rec, product: prod };
      })
      .filter((item): item is { rec: CrossSellRecommendationResult['recommendations'][number]; product: Product } =>
        Boolean(item)
      );
  }, [result.recommendations, allProducts, currentProduct.id]);

  if (resolvedCards.length === 0 && !isLoading) {
    return null;
  }

  const handleQuickAdd = (product: Product) => {
    onQuickAddToCart(product);
    setRecentlyAddedId(product.id);
    window.setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === product.id ? null : prev));
    }, 1800);
  };

  return (
    <section
      aria-label="المنتجات المقترحة لك"
      className="border-t border-slate-800 px-6 sm:px-8 py-6 bg-slate-950/50 space-y-5"
    >
      {/* Header & Personalization Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-300 shrink-0" />
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              المنتجات المقترحة لك
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            {result.headlineAr}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <History className="w-3.5 h-3.5 text-brand-300" />
              <span>سجل التصفح: {browsingHistory.length} منتج</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>المشتريات السابقة: {purchaseSignals.length} منتج</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {result.source === 'gemini-ai' ? 'تحليل المساعد الذكي' : 'محرك البيع المتقاطع الذكي'}
            </span>
          </div>
        </div>

        {/* Interactive Signal Focus Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="tablist"
            aria-label="مصدر التوصيات الذكية"
            className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={focusMode === 'all'}
              onClick={() => setFocusMode('all')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                focusMode === 'all'
                  ? 'bg-[#551465] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              توصيات شاملة
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={focusMode === 'purchases'}
              onClick={() => setFocusMode('purchases')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                focusMode === 'purchases'
                  ? 'bg-[#551465] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              تكمل مشترياتك
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={focusMode === 'browsing'}
              onClick={() => setFocusMode('browsing')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                focusMode === 'browsing'
                  ? 'bg-[#551465] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              حسب تصفحك
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRefreshNonce((n) => n + 1)}
            disabled={isLoading}
            aria-label="تحديث المنتجات المقترحة"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="تحديث الاقتراحات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Recommendations Grid */}
      {isLoading && resolvedCards.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 space-y-3 animate-pulse"
            >
              <div className="aspect-[4/3] rounded-xl bg-slate-800" />
              <div className="h-3 w-2/3 bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-800 rounded" />
              <div className="h-8 w-full bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {resolvedCards.map(({ rec, product: recProduct }) => {
            const isAdded = recentlyAddedId === recProduct.id;
            const inCartAlready = cartProductIds.includes(recProduct.id);

            return (
              <article
                key={recProduct.id}
                className={`group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#551465]/60 hover:shadow-lg ${
                  isLoading ? 'opacity-70' : 'opacity-100'
                }`}
              >
                <div>
                  {/* Uniform 4:3 Product Thumbnail */}
                  <button
                    type="button"
                    onClick={() => onSelectProduct(recProduct)}
                    className="relative w-full aspect-[4/3] bg-slate-950 overflow-hidden block text-right focus-visible:outline-2 focus-visible:outline-brand-400"
                  >
                    <LazyImage
                      src={recProduct.images[0]}
                      alt={recProduct.name}
                      sizeHint="card"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>استعراض التفاصيل</span>
                      </span>
                      <ArrowUpLeft className="w-4 h-4 text-white" />
                    </div>
                  </button>

                  {/* Unboxed Typographic Metadata & Title */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-brand-300 font-bold truncate">
                        <span className="tabular-nums">توافق {rec.matchScore}%</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="truncate">{rec.badgeAr}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 font-bold shrink-0 tabular-nums">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{recProduct.rating}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectProduct(recProduct)}
                      className="text-right block w-full group/title"
                    >
                      <h4 className="text-xs sm:text-sm font-extrabold text-white group-hover/title:text-brand-300 transition line-clamp-2 leading-snug">
                        {recProduct.name}
                      </h4>
                    </button>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {rec.reasonAr}
                    </p>
                  </div>
                </div>

                {/* Price & Cross-Sell Actions */}
                <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-800/80 space-y-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-white tabular-nums">
                        {formatPrice(
                          recProduct.price,
                          settings?.activeCurrency,
                          settings?.yerExchangeRate
                        )}
                      </span>
                      {recProduct.originalPrice && (
                        <span className="text-[11px] text-slate-500 line-through tabular-nums">
                          {formatPrice(
                            recProduct.originalPrice,
                            settings?.activeCurrency,
                            settings?.yerExchangeRate
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate">
                      {recProduct.categoryNameAr}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(recProduct)}
                      className="col-span-2 py-2 px-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-[11px] font-bold transition whitespace-nowrap"
                    >
                      معاينة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdd(recProduct)}
                      disabled={recProduct.stock === 0}
                      className={`col-span-3 py-2 px-3 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition whitespace-nowrap ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#551465] hover:bg-brand-700 text-white'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>تمت الإضافة</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{inCartAlready ? 'إضافة أخرى' : 'أضف للسلة'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
