import React, { useEffect, useState } from 'react';
import { 
  X, 
  CreditCard, 
  Truck, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  QrCode, 
  Building2, 
  Phone, 
  Mail, 
  User, 
  MapPin,
  Lock,
  ArrowRight,
  Coins,
  AlertCircle,
  BellRing
} from 'lucide-react';
import { CartItem, CustomerInfo, PaymentMethodId, Order, StoreSettings, UserProfile } from '../types';
import {
  MIN_REDEEM_POINTS,
  calculateEarnedPoints,
  discountSarToPoints,
  pointsToDiscountSar,
} from '../utils/loyalty';
import { formatPrice } from '../utils/currency';
import {
  getPushPermissionStatus,
  PushPermissionStatus,
  requestPushPermissionSafely,
} from '../utils/checkoutReminder';

interface CheckoutReminderSnapshot {
  itemsCount: number;
  total: number;
  firstItemName: string;
  firstItemImage?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  discountAmount: number;
  loyaltyPoints?: number;
  initialLoyaltyPointsToRedeem?: number;
  userProfile?: UserProfile;
  onOrderCompleted: (newOrder: Order) => void;
  onScheduleCheckoutReminder?: (delayMs: number, snapshot: CheckoutReminderSnapshot) => void;
  onCancelCheckoutReminder?: () => void;
  settings: StoreSettings;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  discountAmount,
  loyaltyPoints = 0,
  initialLoyaltyPointsToRedeem = 0,
  userProfile,
  onOrderCompleted,
  onScheduleCheckoutReminder,
  onCancelCheckoutReminder,
  settings,
}) => {
  const [step, setStep] = useState<'info' | 'payment' | 'confirmation'>('info');

  // Customer Form State
  const [customer, setCustomer] = useState<CustomerInfo>({
    fullName: userProfile?.fullName || '',
    email: userProfile?.email || '',
    phone: userProfile?.phone || '',
    city: userProfile?.city || 'المكلا (حضرموت)',
    district: '',
    street: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [paymentError, setPaymentError] = useState<string>('');
  const [redeemPoints, setRedeemPoints] = useState<number>(initialLoyaltyPointsToRedeem);

  // Payment Selection State
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodId>('card');

  // Credit Card Form State
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Mobile Wallet State
  const [selectedWallet, setSelectedWallet] = useState<'كريمي' | 'جيب' | 'فلوسي' | 'قروش' | 'كاش ون'>('كريمي');
  const [stcPhone, setStcPhone] = useState('');

  // Completed Order State for Confirmation Invoice
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Abandoned Checkout Push Reminder State
  const [enablePushReminder, setEnablePushReminder] = useState<boolean>(true);
  const [reminderDelaySec, setReminderDelaySec] = useState<5 | 15 | 60>(5);
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(() =>
    getPushPermissionStatus()
  );

  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setPaymentError('');
      setRedeemPoints(initialLoyaltyPointsToRedeem);
      setPushPermission(getPushPermissionStatus());
      onCancelCheckoutReminder?.();
      if (userProfile) {
        setCustomer((prev) => ({
          ...prev,
          fullName: prev.fullName || userProfile.fullName,
          email: prev.email || userProfile.email,
          phone: prev.phone || userProfile.phone,
          city: prev.city || userProfile.city,
        }));
      }
    }
  }, [isOpen, initialLoyaltyPointsToRedeem, userProfile]);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Schedule reminder if user switches away from app/tab while in checkout
  useEffect(() => {
    if (!isOpen || step === 'confirmation' || !enablePushReminder || items.length === 0) {
      return;
    }

    const subtotalEstimate = items.reduce((sum, item) => {
      const variantOffset = item.selectedVariant?.priceOffset || 0;
      const warrantyPrice = item.selectedWarranty?.price || 0;
      const giftWrapPrice = item.isGiftWrapped ? 25 : 0;
      return sum + (item.product.price + variantOffset + warrantyPrice + giftWrapPrice) * item.quantity;
    }, 0);
    const afterCoupon = Math.max(0, subtotalEstimate - discountAmount);
    const maxPts = Math.min(Math.floor(loyaltyPoints / 10) * 10, discountSarToPoints(afterCoupon));
    const usedPts = redeemPoints >= MIN_REDEEM_POINTS ? Math.min(redeemPoints, maxPts) : 0;
    const loyaltyDisc = Math.min(afterCoupon, pointsToDiscountSar(usedPts));
    const netEst = Math.max(0, afterCoupon - loyaltyDisc);
    const vatEst = Math.round(netEst * (settings.vatPercentage / 100) * 100) / 100;
    const shipEst = netEst >= settings.freeShippingThreshold ? 0 : 25;
    const fullEstimatedTotal = netEst + vatEst + shipEst;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        onScheduleCheckoutReminder?.(reminderDelaySec * 1000, {
          itemsCount: totalItemsCount,
          total: fullEstimatedTotal,
          firstItemName: items[0].product.name,
          firstItemImage: items[0].product.images[0],
        });
      } else if (document.visibilityState === 'visible') {
        onCancelCheckoutReminder?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    isOpen,
    step,
    enablePushReminder,
    reminderDelaySec,
    items,
    totalItemsCount,
    discountAmount,
    loyaltyPoints,
    redeemPoints,
    settings.vatPercentage,
    settings.freeShippingThreshold,
  ]);

  if (!isOpen) return null;

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const variantOffset = item.selectedVariant?.priceOffset || 0;
    const warrantyPrice = item.selectedWarranty?.price || 0;
    const giftWrapPrice = item.isGiftWrapped ? 25 : 0;
    const unitPrice = item.product.price + variantOffset + warrantyPrice + giftWrapPrice;
    return sum + unitPrice * item.quantity;
  }, 0);

  const remainingAfterCoupon = Math.max(0, subtotal - discountAmount);
  const maxPointsUsable = Math.min(
    Math.floor(loyaltyPoints / 10) * 10,
    discountSarToPoints(remainingAfterCoupon)
  );
  const effectiveRedeemPoints =
    redeemPoints >= MIN_REDEEM_POINTS ? Math.min(redeemPoints, maxPointsUsable) : 0;
  const loyaltyDiscountSar = Math.min(
    remainingAfterCoupon,
    pointsToDiscountSar(effectiveRedeemPoints)
  );

  const netSubtotal = Math.max(0, remainingAfterCoupon - loyaltyDiscountSar);
  const vatAmount = Math.round(netSubtotal * (settings.vatPercentage / 100) * 100) / 100;
  const shippingFee = netSubtotal >= settings.freeShippingThreshold ? 0 : 25;
  const total = netSubtotal + vatAmount + shippingFee;
  const earnedPoints = calculateEarnedPoints(netSubtotal);

  const yemenCities = [
    'المكلا (حضرموت)', 'صنعاء', 'عدن', 'تعز', 'سيئون (حضرموت)',
    'إب', 'الحديدة', 'مأرب', 'ذمار', 'المهرة', 'شبوة', 'لحج'
  ];

  const validateInfoStep = () => {
    const errors: { [key: string]: string } = {};
    if (!customer.fullName.trim()) errors.fullName = 'الاسم الكامل مطلوب';
    if (!customer.email.trim() || !customer.email.includes('@')) errors.email = 'البريد الإلكتروني غير صحيح';
    if (!customer.phone.trim() || customer.phone.length < 9) errors.phone = 'رقم الجوال مطلوب (9 أرقام على الأقل)';
    if (!customer.district.trim()) errors.district = 'اسم الحي مطلوب';
    if (!customer.street.trim()) errors.street = 'اسم الشارع مطلوب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (validateInfoStep()) {
      setPaymentError('');
      setStep('payment');
    }
  };

  const handleTogglePushReminder = async () => {
    const next = !enablePushReminder;
    setEnablePushReminder(next);
    if (next) {
      const status = await requestPushPermissionSafely();
      setPushPermission(status);
    }
  };

  const handleRequestPushPermission = async () => {
    const status = await requestPushPermissionSafely();
    setPushPermission(status);
  };

  const handleCloseWithReminder = () => {
    if (step !== 'confirmation' && enablePushReminder && items.length > 0) {
      onScheduleCheckoutReminder?.(reminderDelaySec * 1000, {
        itemsCount: totalItemsCount,
        total,
        firstItemName: items[0].product.name,
        firstItemImage: items[0].product.images[0],
      });
    }
    onClose();
  };

  const renderPushReminderPanel = () => (
    <div className="bg-slate-950 border border-[#551465]/40 rounded-2xl p-3.5 sm:p-4 space-y-2.5 text-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#551465]/25 border border-brand-400/30 flex items-center justify-center shrink-0 mt-0.5">
            <BellRing className={`w-4 h-4 ${enablePushReminder ? 'text-amber-300' : 'text-slate-500'}`} />
          </div>
          <div className="space-y-0.5">
            <span className="font-extrabold text-white block">
              تذكير إتمام الدفع عبر إشعار دفع
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              في حال لم تكمل الدفع الآن، سنرسل لك إشعار تذكير يحتوي على زر <strong className="text-brand-300">«إكمال الطلب»</strong> للعودة مباشرة إلى سلة المشتريات.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enablePushReminder}
          onClick={handleTogglePushReminder}
          className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] border transition shrink-0 ${
            enablePushReminder
              ? 'bg-[#551465] text-white border-brand-400/50 shadow'
              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          {enablePushReminder ? 'مفعّل' : 'معطّل'}
        </button>
      </div>

      {enablePushReminder && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400">إرسال التذكير بعد:</span>
            {([
              { sec: 5, label: '5 ثوانٍ' },
              { sec: 15, label: '15 ثانية' },
              { sec: 60, label: 'دقيقة واحدة' },
            ] as const).map((opt) => (
              <button
                key={opt.sec}
                type="button"
                onClick={() => setReminderDelaySec(opt.sec)}
                className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                  reminderDelaySec === opt.sec
                    ? 'bg-[#551465] text-white border-brand-400/50'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {pushPermission === 'default' ? (
            <button
              type="button"
              onClick={handleRequestPushPermission}
              className="text-amber-300 hover:text-amber-200 font-bold underline underline-offset-4"
            >
              السماح بإشعارات الدفع للنظام
            </button>
          ) : pushPermission === 'granted' ? (
            <span className="text-emerald-400 font-bold">✓ إشعار دفع المتصفح + داخل التطبيق</span>
          ) : (
            <span className="text-slate-400">✓ تنبيه فوري داخل التطبيق</span>
          )}
        </div>
      )}
    </div>
  );

  const handleFinalizePayment = () => {
    setPaymentError('');
    // Validate card if card payment selected
    if (selectedPayment === 'card') {
      if (!cardNumber || cardNumber.length < 16) {
        setPaymentError('الرجاء إدخال رقم بطاقة صالحة مكون من 16 رقم.');
        return;
      }
    } else if (selectedPayment === 'stc_pay') {
      if (!stcPhone || stcPhone.length < 9) {
        setPaymentError('الرجاء إدخال رقم جوال مسجل في المحفظة الإلكترونية.');
        return;
      }
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleString('ar-SA'),
      items,
      customer,
      paymentMethod: selectedPayment,
      paymentStatus: selectedPayment === 'cod' ? 'pending' : 'paid',
      subtotal,
      discount: discountAmount,
      loyaltyDiscount: loyaltyDiscountSar,
      loyaltyPointsRedeemed: effectiveRedeemPoints,
      loyaltyPointsEarned: earnedPoints,
      vat: vatAmount,
      shippingFee,
      total,
      status: 'processing',
    };

    onCancelCheckoutReminder?.();
    setCreatedOrder(newOrder);
    onOrderCompleted(newOrder);
    setStep('confirmation');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-20">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-300" />
              <span>إتمام طلب الدفع الآمن</span>
            </h2>
            <span className="text-xs text-slate-400">معاملة مشفرة بتقنية SSL 256-bit</span>
          </div>

          <button
            onClick={handleCloseWithReminder}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            aria-label="إغلاق نافذة الدفع"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Bar */}
        <div className="bg-slate-950 p-3 px-6 border-b border-slate-800 flex items-center justify-around text-xs font-bold">
          <div className={`flex items-center gap-2 ${step === 'info' ? 'text-brand-300' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'info' ? 'bg-[#551465] text-white' : 'bg-slate-800'}`}>1</span>
            <span>معلومات التوصيل</span>
          </div>

          <span className="text-slate-700">←</span>

          <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-brand-300' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'payment' ? 'bg-[#551465] text-white' : 'bg-slate-800'}`}>2</span>
            <span>طريقة الدفع</span>
          </div>

          <span className="text-slate-700">←</span>

          <div className={`flex items-center gap-2 ${step === 'confirmation' ? 'text-brand-300' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'confirmation' ? 'bg-[#551465] text-white' : 'bg-slate-800'}`}>3</span>
            <span>الفاتورة الضريبية</span>
          </div>
        </div>

        {/* STEP 1: Shipping Information */}
        {step === 'info' && (
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 mb-2">بيانات مستلم الشحنة والعنوان:</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">الاسم الكامل *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customer.fullName}
                    onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                    placeholder="مثال: عبدالمجيد السالم"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
                {formErrors.fullName && <span className="text-rose-400 text-[10px] mt-1 block">{formErrors.fullName}</span>}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">البريد الإلكتروني *</label>
                <div className="relative">
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="name@domain.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
                {formErrors.email && <span className="text-rose-400 text-[10px] mt-1 block">{formErrors.email}</span>}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">رقم الجوال والتواصل *</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="+967 7X XXX XXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                  />
                  <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
                {formErrors.phone && <span className="text-rose-400 text-[10px] mt-1 block">{formErrors.phone}</span>}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">المدينة / المحافظة *</label>
                <select
                  value={customer.city}
                  onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#551465]"
                >
                  {yemenCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">الحي السكني *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customer.district}
                    onChange={(e) => setCustomer({ ...customer, district: e.target.value })}
                    placeholder="مثال: حي فوه / حي حدة"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                  />
                  <MapPin className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
                {formErrors.district && <span className="text-rose-400 text-[10px] mt-1 block">{formErrors.district}</span>}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">اسم الشارع ورقم المبنى *</label>
                <input
                  type="text"
                  value={customer.street}
                  onChange={(e) => setCustomer({ ...customer, street: e.target.value })}
                  placeholder="مثال: شارع الستين، عمارة 40"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                />
                {formErrors.street && <span className="text-rose-400 text-[10px] mt-1 block">{formErrors.street}</span>}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-slate-300 text-xs font-medium mb-1">ملاحظات التوصيل (اختياري)</label>
              <textarea
                value={customer.notes}
                onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                placeholder="أية تعليمات خاصة لمندوب الشحن والتوصيل..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
              />
            </div>

            {renderPushReminderPanel()}

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-400 block">الإجمالي الكلي:</span>
                <span className="text-lg font-bold text-brand-300">{total.toLocaleString()} ر.س</span>
              </div>

              <button
                onClick={handleProceedToPayment}
                className="bg-[#551465] hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center gap-2 shadow transition border border-brand-500/30"
              >
                <span>الانتقال لتحديد طريقة الدفع</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Payment Gateway Options */}
        {step === 'payment' && (
          <div className="p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-200">اختر طريقة الدفع المناسبة لك:</h3>

            {/* Payment Method Selector Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Option 1: Credit / Mada Card */}
              <button
                onClick={() => setSelectedPayment('card')}
                className={`p-3 rounded-2xl border text-right flex flex-col justify-between transition ${
                  selectedPayment === 'card'
                    ? 'bg-[#551465]/20 border-[#551465] text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-6 h-6 text-brand-300 mb-2" />
                <div>
                  <span className="font-bold text-xs text-white block">فيزا / ماستركارد</span>
                  <span className="text-[10px] text-slate-400">بطاقة ائتمان مباشرة</span>
                </div>
              </button>

              {/* Option 2: Local & Digital Wallets */}
              <button
                onClick={() => setSelectedPayment('stc_pay')}
                className={`p-3 rounded-2xl border text-right flex flex-col justify-between transition ${
                  selectedPayment === 'stc_pay'
                    ? 'bg-[#551465]/20 border-[#551465] text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Wallet className="w-6 h-6 text-purple-400 mb-2" />
                <div>
                  <span className="font-bold text-xs text-white block">المحافظ الإلكترونية</span>
                  <span className="text-[10px] text-slate-400">كريمي / جيب / فلوسي / قروش / كاش ون</span>
                </div>
              </button>

              {/* Option 3: Installments */}
              <button
                onClick={() => setSelectedPayment('tamara')}
                className={`p-3 rounded-2xl border text-right flex flex-col justify-between transition ${
                  selectedPayment === 'tamara'
                    ? 'bg-[#551465]/20 border-[#551465] text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-6 h-6 text-amber-400 mb-2" />
                <div>
                  <span className="font-bold text-xs text-white block">الدفع المرن (تقسيط)</span>
                  <span className="text-[10px] text-slate-400">قسمها على 4 دفعات</span>
                </div>
              </button>

              {/* Option 4: Cash on Delivery (COD) */}
              <button
                onClick={() => setSelectedPayment('cod')}
                className={`p-3 rounded-2xl border text-right flex flex-col justify-between transition ${
                  selectedPayment === 'cod'
                    ? 'bg-[#551465]/20 border-[#551465] text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Truck className="w-6 h-6 text-indigo-400 mb-2" />
                <div>
                  <span className="font-bold text-xs text-white block">الدفع عند الاستلام</span>
                  <span className="text-[10px] text-slate-400">ادفع للمندوب عند التسليم</span>
                </div>
              </button>
            </div>

            {/* Dynamic Form for Selected Payment */}
            {selectedPayment === 'card' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-200">بيانات بطاقة الدفع (فيزا / ماستر كارد / Apple Pay):</span>
                  <div className="flex gap-2 text-[10px] font-bold text-slate-400">
                    <span className="bg-[#551465] text-white px-2 py-0.5 rounded">APPLE PAY</span>
                    <span className="bg-blue-950 text-blue-400 px-2 py-0.5 rounded">VISA</span>
                    <span className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded">MASTERCARD</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">اسم صاحب البطاقة المطبوع</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="SAEED BAWAZIR"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#551465] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رقم البطاقة (16 رقم)</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="4000 1234 5678 9010"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#551465] tracking-widest font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">تاريخ الانتهاء (MM/YY)</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="08/28"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#551465] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">رمز الأمان (CVC)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                      placeholder="•••"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#551465] font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedPayment === 'stc_pay' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <span className="font-bold text-slate-200 block">الدفع السريع عبر المحافظ الإلكترونية (كريمي / جيب / فلوسي / قروش / كاش ون):</span>
                <div className="flex flex-wrap gap-2">
                  {(['كريمي', 'جيب', 'فلوسي', 'قروش', 'كاش ون'] as const).map((wallet) => (
                    <button
                      key={wallet}
                      type="button"
                      onClick={() => setSelectedWallet(wallet)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
                        selectedWallet === wallet
                          ? 'bg-[#551465] text-white border-brand-400/60 shadow'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {wallet}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">رقم الجوال أو الحساب المسجل في محفظة ({selectedWallet})</label>
                  <input
                    type="tel"
                    value={stcPhone}
                    onChange={(e) => setStcPhone(e.target.value)}
                    placeholder="+967 7X XXX XXXX"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#551465]"
                  />
                </div>
                <p className="text-[11px] text-slate-400">سوف يصلك إشعار فوري على تطبيق محفظة {selectedWallet} للموافقة على تأكيد مبلغ الخصم ({total.toLocaleString()} ر.س).</p>
              </div>
            )}

            {selectedPayment === 'tamara' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-amber-400 block">قسم فاتورتك على 4 دفعات شهرية بدون أية فوائد أو رسوم خفية:</span>
                <div className="grid grid-cols-4 gap-2 text-center pt-2">
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الدفعة 1 (الآن)</span>
                    <span className="font-bold text-brand-300">{(total / 4).toFixed(2)} ر.س</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الدفعة 2 (بعد شهر)</span>
                    <span className="font-bold text-slate-200">{(total / 4).toFixed(2)} ر.س</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الدفعة 3 (بعد شهرين)</span>
                    <span className="font-bold text-slate-200">{(total / 4).toFixed(2)} ر.س</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الدفعة 4 (بعد 3 أشهر)</span>
                    <span className="font-bold text-slate-200">{(total / 4).toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>
            )}

            {selectedPayment === 'cod' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-white block">الدفع عند استلام الشحنة:</span>
                <p>سوف تقوم بدفع المبلغ نقداً أو عبر المحفظة الإلكترونية لمندوب التوصيل فور وصول شحنتك إلى عنوانك في {customer.city}.</p>
              </div>
            )}

            {/* Loyalty Points Redemption Panel inside Checkout */}
            {loyaltyPoints >= MIN_REDEEM_POINTS && (
              <div className="bg-slate-950 border border-amber-500/35 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-extrabold text-white block">
                        استبدال نقاط الولاء ({loyaltyPoints.toLocaleString()} نقطة متاحة)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {effectiveRedeemPoints > 0
                          ? `سيتم خصم ${formatPrice(loyaltyDiscountSar, settings.activeCurrency, settings.yerExchangeRate)} باستخدام ${effectiveRedeemPoints.toLocaleString()} نقطة`
                          : `يمكنك خصم حتى ${formatPrice(pointsToDiscountSar(maxPointsUsable), settings.activeCurrency, settings.yerExchangeRate)} من هذا الطلب`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setRedeemPoints(effectiveRedeemPoints > 0 ? 0 : maxPointsUsable)
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition ${
                      effectiveRedeemPoints > 0
                        ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                        : 'bg-[#551465] border-brand-400/50 text-white'
                    }`}
                  >
                    {effectiveRedeemPoints > 0 ? 'إلغاء استخدام النقاط' : 'تطبيق خصم النقاط'}
                  </button>
                </div>
              </div>
            )}

            {renderPushReminderPanel()}

            {paymentError && (
              <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Back & Submit Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setStep('info')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs"
              >
                العودة للعنوان
              </button>

              <button
                onClick={handleFinalizePayment}
                className="bg-[#551465] hover:bg-brand-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-[#551465]/30 border border-brand-500/30 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-brand-200" />
                <span>تأكيد وتسديد الطلب النهائي ({total.toLocaleString()} ر.س)</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Instant Tax Invoice & Confirmation */}
        {step === 'confirmation' && createdOrder && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-[#551465]/20 text-brand-300 rounded-2xl flex items-center justify-center mx-auto border border-[#551465]/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">تم استلام طلبك بنجاح!</h3>
              <p className="text-xs text-slate-300">
                رقم الطلب المعتمد: <span className="font-mono text-brand-300 font-bold">{createdOrder.orderNumber}</span>
              </p>
            </div>

            {/* Printable Tax Invoice Container */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-xs space-y-4 print:bg-white print:text-slate-900">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="شعار متجر رواج" className="w-12 h-12 rounded-xl object-cover border border-slate-700" referrerPolicy="no-referrer" />
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{settings.storeName}</h4>
                    <span className="text-brand-300 font-bold text-[11px] block">فاتورة ضريبية مبسطة</span>
                    <span className="text-slate-400 block text-[10px]">
                      السجل التجاري: {settings.commercialRegistration?.trim() || ''} | VAT: {settings.vatNumber?.trim() || ''}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="font-mono font-bold text-brand-300 block">{createdOrder.orderNumber}</span>
                  <span className="text-slate-400 block">{createdOrder.date}</span>
                </div>
              </div>

              {/* Customer Info Summary */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[10px]">العميل:</span>
                  <span className="font-bold text-white">{createdOrder.customer.fullName}</span>
                  <span className="text-slate-400 block text-[11px]">{createdOrder.customer.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">عنوان التسليم:</span>
                  <span className="text-white font-medium">{createdOrder.customer.city}، {createdOrder.customer.district}</span>
                  <span className="text-slate-400 block text-[11px]">{createdOrder.customer.street}</span>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2">المنتج والخيارات</th>
                    <th className="py-2 text-center">الكمية</th>
                    <th className="py-2 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {createdOrder.items.map((item, idx) => (
                    <tr key={idx} className="text-slate-200">
                      <td className="py-2.5">
                        <span className="font-bold block text-white">{item.product.name}</span>
                        {item.selectedVariant && (
                          <span className="text-[10px] text-brand-300 block">• {item.selectedVariant.name}</span>
                        )}
                        {item.customEngraving && (
                          <span className="text-[10px] text-purple-300 block">• نقش: "{item.customEngraving}"</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                      <td className="py-2.5 text-left font-bold">{((item.product.price + (item.selectedVariant?.priceOffset || 0)) * item.quantity).toLocaleString()} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="border-t border-slate-800 pt-3 space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span>{createdOrder.subtotal.toLocaleString()} ر.س</span>
                </div>
                {createdOrder.discount > 0 && (
                  <div className="flex justify-between text-brand-300">
                    <span>خصم الكوبون:</span>
                    <span>-{createdOrder.discount.toLocaleString()} ر.س</span>
                  </div>
                )}
                {createdOrder.loyaltyDiscount && createdOrder.loyaltyDiscount > 0 ? (
                  <div className="flex justify-between text-amber-300">
                    <span>خصم نقاط الولاء ({createdOrder.loyaltyPointsRedeemed?.toLocaleString()} نقطة):</span>
                    <span>-{createdOrder.loyaltyDiscount.toLocaleString()} ر.س</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>ضريبة القيمة المضافة ({settings.vatPercentage}%):</span>
                  <span>{createdOrder.vat.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span>رسوم التوصيل الشاحنة:</span>
                  <span>{createdOrder.shippingFee === 0 ? 'مجاني' : `${createdOrder.shippingFee} ر.س`}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-white border-t border-slate-800 pt-2">
                  <span>المبلغ المدفوع النهائي:</span>
                  <span className="text-brand-300">{createdOrder.total.toLocaleString()} ر.س</span>
                </div>
                {createdOrder.loyaltyPointsEarned && createdOrder.loyaltyPointsEarned > 0 ? (
                  <div className="flex justify-between text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3 py-2 font-bold mt-2">
                    <span>نقاط الولاء المكتسبة من هذا الطلب:</span>
                    <span className="font-mono tabular-nums">+{createdOrder.loyaltyPointsEarned.toLocaleString()} نقطة</span>
                  </div>
                ) : null}
              </div>

              {/* QR Verification seal */}
              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 pt-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-10 h-10 text-brand-300" />
                  <div>
                    <span className="font-bold text-white text-[11px] block">رمز التحقق الضريبي الإلكتروني QR</span>
                    <span className="text-[9px] text-slate-400">فاتورة إلكترونية موثقة وصادرة رسمياً من نظام متجر رواج في الجمهورية اليمنية</span>
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الفاتورة</span>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-[#551465] hover:bg-brand-700 text-white font-extrabold py-3 rounded-xl text-xs transition border border-brand-500/30"
            >
              متابعة التسوق في المتجر
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
