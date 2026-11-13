import React, { useMemo, useState } from 'react';
import {
  X,
  Scale,
  Star,
  ShoppingCart,
  Play,
  Check,
  Minus,
  Plus,
  Trash2,
  Eye,
  PackageCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';

interface ProductCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  compareProducts: Product[];
  allProducts: Product[];
  onAddProductToCompare: (productId: string) => void;
  onRemoveFromCompare: (productId: string) => void;
  onClearCompare: () => void;
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product, initialMode?: 'images' | 'video') => void;
  settings?: StoreSettings;
}

export const ProductCompareModal: React.FC<ProductCompareModalProps> = ({
  isOpen,
  onClose,
  compareProducts,
  allProducts,
  onAddProductToCompare,
  onRemoveFromCompare,
  onClearCompare,
  onAddToCart,
  onQuickView,
  settings,
}) => {
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [selectedAddId, setSelectedAddId] = useState('');

  // Collect all unique specification keys across selected products
  const allSpecKeys = useMemo(() => {
    const keys: string[] = [];
    const seen = new Set<string>();
    compareProducts.forEach((prod) => {
      prod.specifications.forEach((spec) => {
        if (!seen.has(spec.key)) {
          seen.add(spec.key);
          keys.push(spec.key);
        }
      });
    });
    return keys;
  }, [compareProducts]);

  // Compute lowest price & highest rating highlights when >= 2 products
  const lowestPrice = useMemo(() => {
    if (compareProducts.length < 2) return null;
    return Math.min(...compareProducts.map((p) => p.price));
  }, [compareProducts]);

  const highestRating = useMemo(() => {
    if (compareProducts.length < 2) return null;
    return Math.max(...compareProducts.map((p) => p.rating));
  }, [compareProducts]);

  const availableToAdd = useMemo(() => {
    const selectedIds = new Set(compareProducts.map((p) => p.id));
    return allProducts.filter((p) => !selectedIds.has(p.id));
  }, [allProducts, compareProducts]);

  if (!isOpen) return null;

  const getSpecValue = (product: Product, key: string): string | null => {
    const found = product.specifications.find((s) => s.key === key);
    return found ? found.value : null;
  };

  const valuesDiffer = (vals: (string | number | boolean | null | undefined)[]): boolean => {
    if (vals.length < 2) return true;
    const normalized = vals.map((v) => String(v ?? '—').trim());
    return new Set(normalized).size > 1;
  };

  const priceDiffers = valuesDiffer(compareProducts.map((p) => p.price));
  const ratingDiffers = valuesDiffer(compareProducts.map((p) => p.rating));
  const stockDiffers = valuesDiffer(compareProducts.map((p) => (p.stock > 10 ? 'available' : p.stock > 0 ? 'low' : 'out')));
  const videoDiffers = valuesDiffer(compareProducts.map((p) => Boolean(p.demoVideo?.url || p.videoUrl)));
  const variantsDiffers = valuesDiffer(compareProducts.map((p) => (p.variants || []).map((v) => v.name).join('، ')));
  const customDiffers = valuesDiffer(
    compareProducts.map((p) =>
      [
        p.customizationOptions?.engravingAvailable ? 'engraving' : '',
        p.customizationOptions?.giftWrapAvailable ? 'gift' : '',
        p.customizationOptions?.warrantyOptions?.length ? 'warranty' : '',
      ].join('|')
    )
  );

  const visibleSpecKeys = showDifferencesOnly
    ? allSpecKeys.filter((key) => valuesDiffer(compareProducts.map((p) => getSpecValue(p, key))))
    : allSpecKeys;

  const handleAddSelected = () => {
    if (!selectedAddId) return;
    onAddProductToCompare(selectedAddId);
    setSelectedAddId('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#551465]/30 border border-[#551465]/50 flex items-center justify-center text-brand-300 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>مقارنة المنتجات والمواصفات التقنية</span>
                <span className="text-xs font-mono tabular-nums text-brand-300">
                  ({compareProducts.length} / 4)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                قارن الأسعار، التقييمات، والمواصفات الفنية جنباً إلى جنب لاختيار الأنسب لاحتياجك.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Differences Only Toggle */}
            {compareProducts.length >= 2 && (
              <button
                type="button"
                onClick={() => setShowDifferencesOnly((prev) => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                  showDifferencesOnly
                    ? 'bg-[#551465] border-brand-400/50 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                <span>إظهار الاختلافات فقط</span>
              </button>
            )}

            {/* Quick Add Product to Compare */}
            {compareProducts.length < 4 && availableToAdd.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl p-1">
                <select
                  value={selectedAddId}
                  onChange={(e) => setSelectedAddId(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 px-2 py-1 focus:outline-none max-w-[180px]"
                >
                  <option value="" className="bg-slate-900">
                    + أضف منتجاً للمقارنة...
                  </option>
                  {availableToAdd.map((prod) => (
                    <option key={prod.id} value={prod.id} className="bg-slate-900">
                      {prod.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={!selectedAddId}
                  className="bg-[#551465] hover:bg-brand-700 disabled:bg-slate-800 disabled:text-slate-500 text-white p-1.5 rounded-lg text-xs transition"
                  title="إضافة للمقارنة"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {compareProducts.length > 0 && (
              <button
                type="button"
                onClick={onClearCompare}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح الكل</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق نافذة المقارنة"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {compareProducts.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Scale className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">لم تقم باختيار منتجات للمقارنة بعد</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                اضغط على زر المقارنة في بطاقات المنتجات أو اختر منتجين من القائمة أعلاه لعرض جدول مقارنة شامل للمواصفات والأسعار.
              </p>
            </div>
          ) : (
            <>
              {compareProducts.length === 1 && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      تم تحديد منتج واحد فقط. أضف منتجاً ثانياً من القائمة أعلاه أو من المتجر لتفعيل المقارنة جنباً إلى جنب.
                    </span>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
                <table className="w-full text-right border-collapse min-w-[680px]">
                  {/* Product Header Cards Row */}
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950">
                      <th className="w-48 p-4 text-xs font-bold text-slate-400 align-bottom border-l border-slate-800/80">
                        المنتج والمعاينة
                      </th>
                      {compareProducts.map((product) => (
                        <th
                          key={product.id}
                          className="p-4 align-top border-l border-slate-800/80 last:border-l-0 min-w-[210px]"
                        >
                          <div className="space-y-3 relative">
                            <button
                              type="button"
                              onClick={() => onRemoveFromCompare(product.id)}
                              aria-label={`إزالة ${product.name}`}
                              className="absolute top-0 left-0 p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
                              title="إزالة من المقارنة"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            <div
                              onClick={() => {
                                onClose();
                                onQuickView(product, 'images');
                              }}
                              className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer group"
                            >
                              <LazyImage
                                src={product.images[0]}
                                alt={product.name}
                                sizeHint="card"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            <div className="space-y-1 text-right">
                              <span className="text-[11px] text-brand-300 font-medium block">
                                {product.categoryNameAr}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onQuickView(product, 'images');
                                }}
                                className="text-sm font-bold text-white hover:text-brand-300 transition text-right line-clamp-2"
                              >
                                {product.name}
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {/* Price Row */}
                    {(!showDifferencesOnly || priceDiffers) && (
                      <tr className={priceDiffers && compareProducts.length >= 2 ? 'bg-[#551465]/5' : ''}>
                        <td className="p-4 font-bold text-slate-300 bg-slate-950/60 border-l border-slate-800/80">
                          السعر النهائي
                        </td>
                        {compareProducts.map((product) => {
                          const isBestPrice = lowestPrice !== null && product.price === lowestPrice;
                          return (
                            <td
                              key={product.id}
                              className="p-4 border-l border-slate-800/80 last:border-l-0"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-base font-extrabold text-white tabular-nums">
                                    {formatPrice(
                                      product.price,
                                      settings?.activeCurrency,
                                      settings?.yerExchangeRate
                                    )}
                                  </span>
                                  {product.originalPrice && product.originalPrice > product.price && (
                                    <span className="text-[11px] text-slate-500 line-through tabular-nums">
                                      {formatPrice(
                                        product.originalPrice,
                                        settings?.activeCurrency,
                                        settings?.yerExchangeRate
                                      )}
                                    </span>
                                  )}
                                </div>
                                {isBestPrice && (
                                  <span className="text-[11px] font-bold text-emerald-400">
                                    أفضل سعر في المقارنة
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* Rating Row */}
                    {(!showDifferencesOnly || ratingDiffers) && (
                      <tr className={ratingDiffers && compareProducts.length >= 2 ? 'bg-[#551465]/5' : ''}>
                        <td className="p-4 font-bold text-slate-300 bg-slate-950/60 border-l border-slate-800/80">
                          تقييم العملاء
                        </td>
                        {compareProducts.map((product) => {
                          const isTopRated = highestRating !== null && product.rating === highestRating;
                          return (
                            <td
                              key={product.id}
                              className="p-4 border-l border-slate-800/80 last:border-l-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-amber-400 font-bold tabular-nums">
                                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                                  {product.rating}
                                </span>
                                <span className="text-slate-400 tabular-nums">
                                  ({product.reviewCount} تقييم)
                                </span>
                              </div>
                              {isTopRated && (
                                <span className="text-[11px] font-bold text-amber-300 block mt-1">
                                  الأعلى تقييماً
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* Stock Status Row */}
                    {(!showDifferencesOnly || stockDiffers) && (
                      <tr className={stockDiffers && compareProducts.length >= 2 ? 'bg-[#551465]/5' : ''}>
                        <td className="p-4 font-bold text-slate-300 bg-slate-950/60 border-l border-slate-800/80">
                          حالة التوفر بالمخزون
                        </td>
                        {compareProducts.map((product) => (
                          <td
                            key={product.id}
                            className="p-4 border-l border-slate-800/80 last:border-l-0"
                          >
                            {product.stock > 10 ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1.5 tabular-nums">
                                <PackageCheck className="w-4 h-4" />
                                متوفر ({product.stock} قطعة)
                              </span>
                            ) : product.stock > 0 ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1.5 tabular-nums">
                                <AlertCircle className="w-4 h-4" />
                                كمية محدودة ({product.stock} قطعة)
                              </span>
                            ) : (
                              <span className="text-rose-400 font-bold">نفذت الكمية</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* Demo Video Row */}
                    {(!showDifferencesOnly || videoDiffers) && (
                      <tr className={videoDiffers && compareProducts.length >= 2 ? 'bg-[#551465]/5' : ''}>
                        <td className="p-4 font-bold text-slate-300 bg-slate-950/60 border-l border-slate-800/80">
                          فيديو الشرح التقني
                        </td>
                        {compareProducts.map((product) => {
                          const hasVid = Boolean(product.demoVideo?.url || product.videoUrl);
                          return (
                            <td
                              key={product.id}
                              className="p-4 border-l border-slate-800/80 last:border-l-0"
                            >
                              {hasVid ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onQuickView(product, 'video');
                                  }}
                                  className="text-brand-300 hover:text-white font-bold flex items-center gap-1.5 transition"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>مشاهدة الفيديو التوضيحي</span>
                                </button>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Minus className="w-3.5 h-3.5" /> غير متوفر
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* Variants Row */}
                    {(!showDifferencesOnly || variantsDiffers) && (
                      <tr className={variantsDiffers && compareProducts.length >= 2 ? 'bg-[#551465]/5' : ''}>
                        <td className="p-4 font-bold text-slate-300 bg-slate-950/60 border-l border-slate-800/80">
                          الألوان والسعات المتاحة
                        </td>
                        {compareProducts.map((product) => (
                          <td
                            key={product.id}
                            className="p-4 text-slate-300 border-l border-slate-800/80 last:border-l-0 leading-relaxed"
                          >
                            {product.variants && product.variants.length > 0
                              ? product.variants.map((v) => v.name).join(' · ')
                              : 'إصدار قياسي موحد'}
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* Customization & Warranty Row */}
                    {(!showDifferencesOnly || customDiffers) && (
                      <tr className={customDiffers && compareProducts.length >= 2 ? 'bg-[#551465]/5' : ''}>
                        <td className="p-4 font-bold text-slate-300 bg-slate-950/60 border-l border-slate-800/80">
                          التخصيص والضمان
                        </td>
                        {compareProducts.map((product) => {
                          const features: string[] = [];
                          if (product.customizationOptions?.engravingAvailable) features.push('نقش ليزري مجاني');
                          if (product.customizationOptions?.giftWrapAvailable) features.push('تغليف هدايا');
                          if (product.customizationOptions?.warrantyOptions?.length) features.push('ضمان ممتد إضافي');
                          return (
                            <td
                              key={product.id}
                              className="p-4 text-slate-300 border-l border-slate-800/80 last:border-l-0"
                            >
                              {features.length > 0 ? (
                                <div className="space-y-1">
                                  {features.map((f, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-emerald-300">
                                      <Check className="w-3.5 h-3.5 shrink-0" />
                                      <span>{f}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">ضمان الوكيل الأساسي (سنتان)</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* Technical Specifications Section Divider */}
                    <tr className="bg-slate-900/90">
                      <td
                        colSpan={compareProducts.length + 1}
                        className="px-4 py-2.5 text-xs font-extrabold text-brand-200 border-y border-slate-800"
                      >
                        المواصفات التقنية التفصيلية
                        {showDifferencesOnly && ` (${visibleSpecKeys.length} اختلافات)`}
                      </td>
                    </tr>

                    {visibleSpecKeys.length === 0 ? (
                      <tr>
                        <td
                          colSpan={compareProducts.length + 1}
                          className="p-6 text-center text-slate-400 text-xs"
                        >
                          لا توجد اختلافات في المواصفات التقنية المسجلة بين المنتجات المختارة.
                        </td>
                      </tr>
                    ) : (
                      visibleSpecKeys.map((specKey) => {
                        const rowValues = compareProducts.map((p) => getSpecValue(p, specKey));
                        const isDiff = valuesDiffer(rowValues);
                        return (
                          <tr
                            key={specKey}
                            className={isDiff && compareProducts.length >= 2 ? 'bg-[#551465]/5' : ''}
                          >
                            <td className="p-4 font-bold text-slate-300 bg-slate-950/60 border-l border-slate-800/80">
                              <div className="flex items-center justify-between gap-2">
                                <span>{specKey}</span>
                              </div>
                            </td>
                            {compareProducts.map((product) => {
                              const val = getSpecValue(product, specKey);
                              return (
                                <td
                                  key={product.id}
                                  className="p-4 text-slate-200 font-medium border-l border-slate-800/80 last:border-l-0 leading-relaxed"
                                >
                                  {val ? (
                                    <span>{val}</span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}

                    {/* Action Buttons Row */}
                    <tr className="bg-slate-950">
                      <td className="p-4 font-bold text-slate-400 border-l border-slate-800/80">
                        قرار الشراء
                      </td>
                      {compareProducts.map((product) => (
                        <td
                          key={product.id}
                          className="p-4 border-l border-slate-800/80 last:border-l-0"
                        >
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => onAddToCart(product)}
                              disabled={product.stock === 0}
                              className="w-full bg-[#551465] hover:bg-brand-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-brand-500/30"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{product.stock === 0 ? 'نفذت الكمية' : 'إضافة إلى السلة'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onQuickView(product, 'images');
                              }}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-800 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>عرض التفاصيل الكاملة</span>
                            </button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
