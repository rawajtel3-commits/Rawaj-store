import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  ArrowLeft, 
  Tag, 
  ShieldCheck, 
  Truck, 
  Gift, 
  Sparkles,
  Coins
} from 'lucide-react';
import { CartItem, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';
import {
  MIN_REDEEM_POINTS,
  calculateEarnedPoints,
  discountSarToPoints,
  pointsToDiscountSar,
} from '../utils/loyalty';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onProceedToCheckout: (
    promoDiscount: number,
    loyaltyPointsUsed: number,
    loyaltyDiscountSar: number
  ) => void;
  loyaltyPoints?: number;
  pendingRedeemPoints?: number;
  onSetPendingRedeemPoints?: (points: number) => void;
  settings: StoreSettings;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  loyaltyPoints = 0,
  pendingRedeemPoints = 0,
  onSetPendingRedeemPoints,
  settings,
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  if (!isOpen) return null;

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const variantOffset = item.selectedVariant?.priceOffset || 0;
    const warrantyPrice = item.selectedWarranty?.price || 0;
    const giftWrapPrice = item.isGiftWrapped ? 25 : 0;
    const unitPrice = item.product.price + variantOffset + warrantyPrice + giftWrapPrice;
    return sum + unitPrice * item.quantity;
  }, 0);

  const promoDiscountAmount = appliedPromo ? Math.round((subtotal * appliedPromo.percent) / 100) : 0;
  const remainingAfterPromo = Math.max(0, subtotal - promoDiscountAmount);
  const maxPointsForOrder = Math.min(
    Math.floor(loyaltyPoints / 10) * 10,
    discountSarToPoints(remainingAfterPromo)
  );
  const activeLoyaltyPoints =
    pendingRedeemPoints >= MIN_REDEEM_POINTS
      ? Math.min(pendingRedeemPoints, maxPointsForOrder)
      : 0;
  const loyaltyDiscountAmount = Math.min(
    remainingAfterPromo,
    pointsToDiscountSar(activeLoyaltyPoints)
  );

  const totalDiscountAmount = promoDiscountAmount + loyaltyDiscountAmount;
  const netSubtotal = Math.max(0, subtotal - totalDiscountAmount);
  const vatAmount = Math.round(netSubtotal * (settings.vatPercentage / 100) * 100) / 100;
  const isFreeShipping = netSubtotal >= settings.freeShippingThreshold || items.length === 0;
  const shippingFee = isFreeShipping ? 0 : 25;
  const total = netSubtotal + vatAmount + shippingFee;
  const estimatedEarnedPoints = calculateEarnedPoints(netSubtotal);

  const freeShippingNeeded = Math.max(0, settings.freeShippingThreshold - netSubtotal);
  const freeShippingProgress = Math.min(100, (netSubtotal / settings.freeShippingThreshold) * 100);

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    if (code === 'RAWAJ10' || code === 'HORIZON10') {
      setAppliedPromo({ code, percent: 10 });
      setPromoCode('');
    } else if (code === 'WELCOME15') {
      setAppliedPromo({ code: 'WELCOME15', percent: 15 });
      setPromoCode('');
    } else {
      setPromoError('كود الخصم غير صالح أو منتهي الصلاحية.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-slate-900 text-white shadow-2xl flex flex-col border-r border-slate-800">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-brand-300" />
              <h2 className="text-lg font-bold text-white">سلة التسوق</h2>
              <span className="bg-[#551465]/20 text-brand-300 border border-[#551465]/40 text-xs px-2 py-0.5 rounded-full font-bold">
                {items.length} منتجات
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="bg-slate-950 p-3 px-4 border-b border-slate-800 text-xs">
            <div className="flex justify-between items-center mb-1 font-medium">
              {isFreeShipping ? (
                <span className="text-brand-300 font-bold flex items-center gap-1">
                  🎉 تهانينا! لقد حصلت على توصيل مجاني لموقعك.
                </span>
              ) : (
                <span className="text-slate-300">
                  متبقي <strong className="text-brand-300">{freeShippingNeeded.toLocaleString()} ر.س</strong> للحصول على الشحن المجاني!
                </span>
              )}
              <Truck className="w-4 h-4 text-brand-300" />
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#551465] to-purple-500 h-full transition-all duration-500"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
                  <ShoppingBag className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400 font-medium text-sm">سلة التسوق فارغة حالياً</p>
                <button
                  onClick={onClose}
                  className="bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow border border-brand-500/30"
                >
                  تصفح المنتجات الآن
                </button>
              </div>
            ) : (
              items.map((item, idx) => {
                const variantOffset = item.selectedVariant?.priceOffset || 0;
                const warrantyPrice = item.selectedWarranty?.price || 0;
                const giftWrapPrice = item.isGiftWrapped ? 25 : 0;
                const itemUnitPrice = item.product.price + variantOffset + warrantyPrice + giftWrapPrice;
                const itemTotalPrice = itemUnitPrice * item.quantity;

                return (
                  <div key={idx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex gap-3 relative group">
                    <LazyImage
                      src={item.product.images[0]}
                      alt={item.product.name}
                      sizeHint="thumb"
                      wrapperClassName="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0"
                      className="w-full h-full object-cover"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-bold text-slate-100 truncate pl-4">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition"
                            title="حذف المنتج"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Selected variant & customizations */}
                        {item.selectedVariant && (
                          <span className="text-[11px] text-brand-300 block truncate">
                            • {item.selectedVariant.name}
                          </span>
                        )}
                        {item.customEngraving && (
                          <span className="text-[10px] text-purple-300 block truncate">
                            • نقش: "{item.customEngraving}"
                          </span>
                        )}
                        {item.isGiftWrapped && (
                          <span className="text-[10px] text-amber-300 block truncate">
                            • تغليف هدايا (+25 ر.س)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
                          <button
                            onClick={() => onUpdateQuantity(idx, Math.max(1, item.quantity - 1))}
                            className="text-slate-400 hover:text-white font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-white px-1.5">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                            className="text-slate-400 hover:text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-xs font-bold text-white">
                          {formatPrice(itemTotalPrice, settings.activeCurrency, settings.yerExchangeRate)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Promo Code & Order Summary */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
              {/* Promo Code Input */}
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="أدخل كود الخصم (مثل: RAWAJ10)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-8 pl-3 py-2 text-xs text-white placeholder-slate-500 uppercase focus:outline-none focus:border-[#551465]"
                    />
                    <Tag className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                  </div>
                  <button
                    onClick={handleApplyPromo}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition"
                  >
                    تطبيق
                  </button>
                </div>

                {appliedPromo && (
                  <span className="text-[11px] text-brand-300 mt-1 block font-medium">
                    ✓ تم تطبيق كود الخصم {appliedPromo.code} (خصم {appliedPromo.percent}%)
                  </span>
                )}
                {promoError && (
                  <span className="text-[11px] text-rose-400 mt-1 block">
                    {promoError}
                  </span>
                )}
              </div>

              {/* Loyalty Points Redemption Toggle */}
              {onSetPendingRedeemPoints && loyaltyPoints >= MIN_REDEEM_POINTS && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-white block truncate">
                        نقاطك المتاحة: {loyaltyPoints.toLocaleString()} نقطة
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {activeLoyaltyPoints > 0
                          ? `سيتم خصم ${formatPrice(loyaltyDiscountAmount, settings.activeCurrency, settings.yerExchangeRate)} (${activeLoyaltyPoints} نقطة)`
                          : `استبدل حتى ${formatPrice(pointsToDiscountSar(maxPointsForOrder), settings.activeCurrency, settings.yerExchangeRate)} خصم فوري`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onSetPendingRedeemPoints(
                        activeLoyaltyPoints > 0 ? 0 : maxPointsForOrder
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold shrink-0 transition ${
                      activeLoyaltyPoints > 0
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:bg-rose-950'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                  >
                    {activeLoyaltyPoints > 0 ? 'إلغاء' : 'استخدام النقاط'}
                  </button>
                </div>
              )}

              {/* Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">المجموع الفرعي:</span>
                  <span>{formatPrice(subtotal, settings.activeCurrency, settings.yerExchangeRate)}</span>
                </div>

                {promoDiscountAmount > 0 && (
                  <div className="flex justify-between text-brand-300 font-semibold">
                    <span>خصم الكوبون:</span>
                    <span>-{formatPrice(promoDiscountAmount, settings.activeCurrency, settings.yerExchangeRate)}</span>
                  </div>
                )}

                {loyaltyDiscountAmount > 0 && (
                  <div className="flex justify-between text-amber-300 font-semibold">
                    <span>خصم نقاط الولاء ({activeLoyaltyPoints} نقطة):</span>
                    <span>-{formatPrice(loyaltyDiscountAmount, settings.activeCurrency, settings.yerExchangeRate)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-400">ضريبة القيمة المضافة ({settings.vatPercentage}%):</span>
                  <span>{formatPrice(vatAmount, settings.activeCurrency, settings.yerExchangeRate)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">تكلفة الشحن والتوصيل:</span>
                  {shippingFee === 0 ? (
                    <span className="text-brand-300 font-bold">مجاني</span>
                  ) : (
                    <span>{formatPrice(shippingFee, settings.activeCurrency, settings.yerExchangeRate)}</span>
                  )}
                </div>

                <div className="flex justify-between text-sm font-extrabold text-white border-t border-slate-800 pt-2">
                  <span>الإجمالي الكلي:</span>
                  <span className="text-brand-300">{formatPrice(total, settings.activeCurrency, settings.yerExchangeRate)}</span>
                </div>

                {estimatedEarnedPoints > 0 && (
                  <div className="flex items-center justify-between text-[11px] bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-emerald-300 font-bold">
                    <span>ستكسب مع هذا الطلب:</span>
                    <span className="font-mono tabular-nums">+{estimatedEarnedPoints} نقطة ولاء</span>
                  </div>
                )}
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => {
                  onProceedToCheckout(
                    promoDiscountAmount,
                    activeLoyaltyPoints,
                    loyaltyDiscountAmount
                  );
                  onClose();
                }}
                className="w-full bg-[#551465] hover:bg-brand-700 text-white font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#551465]/30 text-xs transition active:scale-95 border border-brand-500/30"
              >
                <span>متابعة إتمام الدفع الشامل</span>
                <ArrowLeft className="w-4 h-4 text-brand-200" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
