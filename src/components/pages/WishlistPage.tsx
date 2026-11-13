import React from 'react';
import { 
  Heart, 
  ShoppingBag, 
  Trash2, 
  ArrowRight, 
  Sparkles,
  Search,
  Scale
} from 'lucide-react';
import { Product, StoreSettings } from '../../types';
import { formatPrice } from '../../utils/currency';
import { LazyImage } from '../LazyImage';

interface WishlistPageProps {
  products: Product[];
  wishlistIds: string[];
  onRemoveFromWishlist: (id: string) => void;
  onAddToCart: (p: Product) => void;
  onQuickView: (p: Product) => void;
  onBackToHome?: () => void;
  compareIds?: string[];
  onToggleCompare?: (productId: string) => void;
  settings?: StoreSettings;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  products,
  wishlistIds,
  onRemoveFromWishlist,
  onAddToCart,
  onQuickView,
  onBackToHome,
  compareIds = [],
  onToggleCompare,
  settings,
}) => {
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
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
            <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500 fill-rose-500 shrink-0" />
            <span>قائمة المنتجات المفضلة والمحفوظة</span>
          </h1>
          <p className="text-xs text-slate-400">
            منتجاتك التي قمت بحفظها للرجوع إليها أو إضافتها لسلة المشتريات لاحقاً.
          </p>
        </div>

        {wishlistProducts.length > 0 && (
          <button
            type="button"
            onClick={() => wishlistProducts.forEach((p) => onAddToCart(p))}
            className="w-full sm:w-auto justify-center bg-[#551465] hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow border border-brand-500/30 shrink-0"
          >
            <ShoppingBag className="w-4 h-4 text-brand-200" />
            <span>إضافة كافة المفضلة لسلة التسوق</span>
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {wishlistProducts.length === 0 ? (
        <div className="text-center py-16 sm:py-20 px-4 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">قائمة المفضلة فارغة حالياً</h3>
          <p className="text-xs text-slate-400">
            تصفح معرض المنتجات واضغط على رمز القلب لحفظ الأجهزة التي تنوي اقتناءها.
          </p>
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="bg-[#551465] hover:bg-brand-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow border border-brand-500/30"
            >
              تصفح المعرض الآن
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {wishlistProducts.map((product) => (
            <div
              key={product.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-[#551465]/60 transition-all shadow-lg"
            >
              {/* Remove button */}
              <button
                onClick={() => onRemoveFromWishlist(product.id)}
                className="absolute top-6 left-6 p-1.5 rounded-full bg-slate-950/80 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition z-10"
                title="إزالة من المفضلة"
              >
                <Trash2 className="w-4 h-4" />
              </button>

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
                    className="bg-[#551465] hover:bg-brand-700 text-white p-2.5 rounded-xl text-xs font-bold shadow flex items-center gap-1 border border-brand-500/30"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>سلة</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
