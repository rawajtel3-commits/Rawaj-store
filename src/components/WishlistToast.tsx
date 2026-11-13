import React, { useEffect } from 'react';
import { Heart, X, ArrowLeft, BookmarkCheck, Sparkles, ShoppingBag } from 'lucide-react';
import { Product, PageView } from '../types';
import { LazyImage } from './LazyImage';

export interface WishlistToastState {
  product: Product;
  action: 'added' | 'removed';
}

interface WishlistToastProps {
  toast: WishlistToastState | null;
  onCloseToast: () => void;
  wishlistCount: number;
  onNavigateToWishlist: () => void;
  currentView: PageView;
}

export const WishlistToast: React.FC<WishlistToastProps> = ({
  toast,
  onCloseToast,
  wishlistCount,
  onNavigateToWishlist,
  currentView,
}) => {
  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onCloseToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, onCloseToast]);

  return (
    <>
      {/* 1. Toast Notification Banner */}
      {toast && (
        <div 
          className="fixed bottom-36 md:bottom-24 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md border border-[#551465] rounded-2xl shadow-2xl p-4 text-slate-100 transition-all duration-300 transform translate-y-0 animate-bounce-short"
          dir="rtl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <LazyImage
                  src={toast.product.images[0]}
                  alt={toast.product.name}
                  sizeHint="thumb"
                  wrapperClassName="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0"
                  className="w-full h-full object-cover"
                />
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full shadow ${
                  toast.action === 'added' ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  <Heart className={`w-3 h-3 ${toast.action === 'added' ? 'fill-white' : ''}`} />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    toast.action === 'added' 
                      ? 'bg-rose-950/90 text-rose-400 border border-rose-500/30' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {toast.action === 'added' ? 'تم الحفظ في المفضلة' : 'تمت الإزالة'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({wishlistCount} عنصر بالقائمة)
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white truncate">
                  {toast.product.name}
                </h4>

                <p className="text-[11px] text-slate-300 leading-tight">
                  {toast.action === 'added'
                    ? 'تم حفظ المنتج بنجاح. يمكنك العثور عليه دائماً في قائمة أمنياتك.'
                    : 'تمت إزالة المنتج من قائمة أمنياتك.'}
                </p>
              </div>
            </div>

            <button
              onClick={onCloseToast}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Footer Button inside Toast */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              الوصول السريع: الهيدر العلوي أو الزر العائم
            </span>

            <button
              onClick={() => {
                onCloseToast();
                onNavigateToWishlist();
              }}
              className="bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow border border-brand-500/30 shrink-0"
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-brand-300" />
              <span>استعراض المفضلة ({wishlistCount})</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Persistent Floating Wishlist Button */}
      {wishlistCount > 0 && currentView !== 'wishlist' && (
        <button
          onClick={onNavigateToWishlist}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-30 bg-gradient-to-r from-rose-600 to-[#551465] hover:from-rose-500 hover:to-brand-700 text-white p-3 sm:px-4 sm:py-3 rounded-2xl shadow-xl shadow-rose-900/30 border border-rose-400/40 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center gap-2 group"
          dir="rtl"
          title="عرض قائمة المفضلة والأمنيات"
        >
          <div className="relative">
            <Heart className="w-5 h-5 fill-white group-hover:animate-pulse" />
            <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-950 shadow">
              {wishlistCount}
            </span>
          </div>

          <span className="text-xs font-extrabold hidden sm:inline">
            المفضلة ({wishlistCount})
          </span>
        </button>
      )}
    </>
  );
};
