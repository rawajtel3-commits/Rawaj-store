import React, { useEffect, useMemo, useState } from 'react';
import {
  Gift,
  Mail,
  KeyRound,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  CreditCard,
  Wallet,
  Send,
  Search,
  ShoppingBag,
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import {
  GiftVoucher,
  GiftVoucherDeliveryMethod,
  GiftVoucherTheme,
  StoreSettings,
  UserProfile,
} from '../../types';
import { formatPrice } from '../../utils/currency';
import {
  buildGiftEmailHref,
  buildGiftShareUrl,
  findRedeemableGiftVoucher,
  generateGiftVoucherCode,
  normalizeGiftVoucherCode,
  validateGiftVoucherCodeFormat,
} from '../../utils/giftVouchers';

interface GiftVouchersPageProps {
  vouchers: GiftVoucher[];
  settings: StoreSettings;
  userProfile?: UserProfile;
  initialLookupCode?: string;
  onPurchaseVoucher: (voucher: GiftVoucher) => void;
  onApplyVoucherToCart: (code: string) => void;
  onBackToHome: () => void;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000];

const CARD_THEMES: {
  id: GiftVoucherTheme;
  label: string;
  surfaceClass: string;
  accentClass: string;
}[] = [
  {
    id: 'royal',
    label: 'بنفسجي رواج',
    surfaceClass: 'bg-gradient-to-br from-[#551465] via-[#461253] to-[#2a0733]',
    accentClass: 'text-amber-300',
  },
  {
    id: 'gold',
    label: 'ذهبي فاخر',
    surfaceClass: 'bg-gradient-to-br from-amber-600 via-amber-700 to-slate-900',
    accentClass: 'text-amber-100',
  },
  {
    id: 'emerald',
    label: 'زمردي أنيق',
    surfaceClass: 'bg-gradient-to-br from-emerald-600 via-emerald-800 to-slate-950',
    accentClass: 'text-emerald-200',
  },
  {
    id: 'midnight',
    label: 'ليلي كلاسيكي',
    surfaceClass: 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950',
    accentClass: 'text-brand-300',
  },
];

export const GiftVouchersPage: React.FC<GiftVouchersPageProps> = ({
  vouchers,
  settings,
  userProfile,
  initialLookupCode = '',
  onPurchaseVoucher,
  onApplyVoucherToCart,
  onBackToHome,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(250);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<GiftVoucherTheme>('royal');
  const [deliveryMethod, setDeliveryMethod] = useState<GiftVoucherDeliveryMethod>('email');

  const [senderName, setSenderName] = useState<string>(userProfile?.fullName || '');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [customCode, setCustomCode] = useState<string>(() => generateGiftVoucherCode());
  const [giftMessage, setGiftMessage] = useState<string>('كل عام وأنت بخير، هديتك جاهزة من متجر رواج!');

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'stc_pay' | 'apple_pay'>('card');
  const [cardLastFour, setCardLastFour] = useState<string>('');
  const [walletPhone, setWalletPhone] = useState<string>('');

  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [issuedVoucher, setIssuedVoucher] = useState<GiftVoucher | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sharedCode, setSharedCode] = useState<string | null>(null);

  // Balance & Code Checker
  const [lookupCode, setLookupCode] = useState<string>(initialLookupCode);
  const [lookupResult, setLookupResult] = useState<{
    voucher?: GiftVoucher;
    error?: string;
  } | null>(() => {
    if (!initialLookupCode.trim()) return null;
    return findRedeemableGiftVoucher(vouchers, initialLookupCode);
  });

  useEffect(() => {
    if (initialLookupCode.trim()) {
      setLookupCode(initialLookupCode);
      setLookupResult(findRedeemableGiftVoucher(vouchers, initialLookupCode));
    }
  }, [initialLookupCode, vouchers]);

  const effectiveAmount = useMemo(() => {
    if (customAmountInput.trim()) {
      const parsed = Number(customAmountInput);
      return Number.isFinite(parsed) ? Math.round(parsed) : 0;
    }
    return selectedAmount;
  }, [customAmountInput, selectedAmount]);

  const activeThemeMeta =
    CARD_THEMES.find((t) => t.id === selectedTheme) || CARD_THEMES[0];

  const previewCode =
    deliveryMethod === 'custom_code'
      ? normalizeGiftVoucherCode(customCode) || 'GIFT-CUSTOM'
      : issuedVoucher?.code || 'GIFT-XXXX-XXXX';

  const handleRegenerateCode = () => {
    setCustomCode(generateGiftVoucherCode());
    setFormError('');
  };

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode((curr) => (curr === id ? null : curr)), 2500);
    } catch {
      // Clipboard fallback not required
    }
  };

  const handleShareVoucher = async (voucher: GiftVoucher) => {
    const shareUrl = buildGiftShareUrl(voucher.code);
    const shareText = `🎁 أهديتك قسيمة هدية رقمية بقيمة ${formatPrice(
      voucher.initialAmountSar,
      settings.activeCurrency,
      settings.yerExchangeRate
    )} في ${settings.storeName}!\nكود القسيمة: ${voucher.code}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `قسيمة هدية من ${settings.storeName}`,
          text: shareText,
          url: shareUrl,
        });
        setSharedCode(voucher.id);
        setTimeout(() => setSharedCode((curr) => (curr === voucher.id ? null : curr)), 2500);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    await handleCopyText(`${shareText}\n${shareUrl}`, `share-${voucher.id}`);
    setSharedCode(voucher.id);
    setTimeout(() => setSharedCode((curr) => (curr === voucher.id ? null : curr)), 2500);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setDispatchNotice('');

    if (effectiveAmount < 50 || effectiveAmount > 5000) {
      setFormError('يجب أن تتراوح قيمة قسيمة الهدية بين 50 و 5,000 ر.س.');
      return;
    }
    if (!senderName.trim()) {
      setFormError('يرجى إدخال اسم المرسل.');
      return;
    }
    if (!recipientName.trim()) {
      setFormError('يرجى إدخال اسم الصديق المستلم.');
      return;
    }

    let finalCode = '';
    if (deliveryMethod === 'email') {
      if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
        setFormError('يرجى إدخال بريد إلكتروني صحيح لإرسال القسيمة.');
        return;
      }
      finalCode = generateGiftVoucherCode();
      while (vouchers.some((v) => normalizeGiftVoucherCode(v.code) === finalCode)) {
        finalCode = generateGiftVoucherCode();
      }
    } else {
      const normalized = normalizeGiftVoucherCode(customCode);
      if (!validateGiftVoucherCodeFormat(normalized)) {
        setFormError(
          'الكود المخصص يجب أن يتكون من 4 إلى 24 حرفاً/رقماً بالإنجليزية (مثل: GIFT-ALI-2026).'
        );
        return;
      }
      if (vouchers.some((v) => normalizeGiftVoucherCode(v.code) === normalized)) {
        setFormError('هذا الكود مستخدم بالفعل، يرجى اختيار كود آخر أو توليد كود جديد.');
        return;
      }
      finalCode = normalized;
    }

    if (paymentMethod === 'card' && cardLastFour.trim().length < 4) {
      setFormError('يرجى إدخال آخر 4 أرقام من البطاقة لتأكيد عملية الشراء.');
      return;
    }
    if (paymentMethod === 'stc_pay' && walletPhone.trim().length < 9) {
      setFormError('يرجى إدخال رقم الجوال المسجل في المحفظة الإلكترونية (9 أرقام على الأقل).');
      return;
    }

    setIsSubmitting(true);
    try {
      const newVoucher: GiftVoucher = {
        id: `gv-${Date.now()}`,
        code: finalCode,
        initialAmountSar: effectiveAmount,
        remainingBalanceSar: effectiveAmount,
        senderName: senderName.trim(),
        recipientName: recipientName.trim(),
        recipientEmail: deliveryMethod === 'email' ? recipientEmail.trim() : undefined,
        message: giftMessage.trim() || undefined,
        deliveryMethod,
        theme: selectedTheme,
        paymentMethod,
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      try {
        const resp = await fetch('/api/gift-vouchers/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: newVoucher.code,
            recipientEmail: newVoucher.recipientEmail,
            recipientName: newVoucher.recipientName,
            senderName: newVoucher.senderName,
            amountSar: newVoucher.initialAmountSar,
            deliveryMethod: newVoucher.deliveryMethod,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setDispatchNotice(
            deliveryMethod === 'email'
              ? `تم إصدار القسيمة وتجهيز الإرسال إلى ${newVoucher.recipientEmail} (مرجع: ${data.dispatchId})`
              : `تم تفعيل الكود المخصص ${newVoucher.code} بنجاح (مرجع: ${data.dispatchId})`
          );
        }
      } catch {
        setDispatchNotice(
          deliveryMethod === 'email'
            ? `تم إصدار القسيمة بنجاح وتجهيزها للإرسال إلى ${newVoucher.recipientEmail}.`
            : `تم تفعيل الكود المخصص ${newVoucher.code} بنجاح.`
        );
      }

      onPurchaseVoucher(newVoucher);
      setIssuedVoucher(newVoucher);
      if (deliveryMethod === 'custom_code') {
        setCustomCode(generateGiftVoucherCode());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const result = findRedeemableGiftVoucher(vouchers, lookupCode);
    if (result.voucher) {
      setLookupResult({ voucher: result.voucher });
      return;
    }
    const normalized = normalizeGiftVoucherCode(lookupCode);
    const redeemedMatch = vouchers.find(
      (v) => normalizeGiftVoucherCode(v.code) === normalized
    );
    if (redeemedMatch) {
      setLookupResult({ voucher: redeemedMatch });
    } else {
      setLookupResult({ error: result.error || 'لم يتم العثور على قسيمة بهذا الكود.' });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-brand-300 hover:text-white inline-flex items-center gap-2 font-bold transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Gift className="w-7 h-7 text-brand-300 shrink-0" />
            <span>قسائم الهدايا الرقمية</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            اشترِ قسيمة هدية رقمية وأرسلها مباشرة لصديقك عبر البريد الإلكتروني أو كود مخصص، ويمكن استخدامها فوراً كخصم في سلة المشتريات وعند الدفع.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs shrink-0">
          <span className="text-slate-400 block">القسائم النشطة لديك</span>
          <strong className="text-lg font-extrabold text-brand-300 tabular-nums">
            {vouchers.filter((v) => v.status !== 'redeemed').length} قسيمة متاحة
          </strong>
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Form */}
        <form
          onSubmit={handlePurchaseSubmit}
          className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6"
        >
          {/* 1. Voucher Value */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-white">
                1. اختر قيمة قسيمة الهدية
              </label>
              <span className="text-xs text-brand-300 font-bold tabular-nums">
                {formatPrice(
                  Math.max(0, effectiveAmount),
                  settings.activeCurrency,
                  settings.yerExchangeRate
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESET_AMOUNTS.map((amt) => {
                const isActive = !customAmountInput.trim() && selectedAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmountInput('');
                    }}
                    className={`py-3 px-3 rounded-xl border text-center transition font-extrabold text-sm tabular-nums ${
                      isActive
                        ? 'bg-[#551465] text-white border-brand-400 shadow-lg shadow-[#551465]/30'
                        : 'bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {formatPrice(amt, settings.activeCurrency, settings.yerExchangeRate)}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                أو أدخل مبلغاً مخصصاً بالريال السعودي (50 - 5,000 ر.س)
              </label>
              <input
                type="number"
                min={50}
                max={5000}
                value={customAmountInput}
                onChange={(e) => setCustomAmountInput(e.target.value)}
                placeholder="مثال: 350"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465] tabular-nums"
              />
            </div>
          </div>

          {/* 2. Card Design Theme */}
          <div className="space-y-2.5">
            <label className="text-sm font-extrabold text-white block">
              2. اختر تصميم البطاقة الرقمية
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CARD_THEMES.map((themeItem) => {
                const active = selectedTheme === themeItem.id;
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() => setSelectedTheme(themeItem.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                      active
                        ? 'bg-slate-800 border-brand-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-md shrink-0 ${themeItem.surfaceClass} border border-white/20`}
                    />
                    <span className="truncate">{themeItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Delivery Method */}
          <div className="space-y-3">
            <label className="text-sm font-extrabold text-white block">
              3. طريقة الإرسال للصديق
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('email');
                  setFormError('');
                }}
                className={`p-3 rounded-xl border text-right flex items-center gap-3 transition ${
                  deliveryMethod === 'email'
                    ? 'bg-[#551465]/25 border-brand-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Mail className="w-5 h-5 text-brand-300 shrink-0" />
                <div>
                  <span className="text-xs font-extrabold block">عبر البريد الإلكتروني</span>
                  <span className="text-[11px] text-slate-400">
                    تصل القسيمة مباشرة لبريد صديقك
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('custom_code');
                  setFormError('');
                }}
                className={`p-3 rounded-xl border text-right flex items-center gap-3 transition ${
                  deliveryMethod === 'custom_code'
                    ? 'bg-[#551465]/25 border-brand-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-extrabold block">كود مخصص للمشاركة</span>
                  <span className="text-[11px] text-slate-400">
                    اختر كوداً باسم صديقك أو مناسبته
                  </span>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">اسم المرسل *</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="اسمك الكريم"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">اسم الصديق المستلم *</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="مثال: خالد باوزير"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                />
              </div>
            </div>

            {deliveryMethod === 'email' ? (
              <div className="text-xs">
                <label className="text-slate-300 font-semibold block mb-1">
                  البريد الإلكتروني للمستلم *
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="friend@example.com"
                  dir="ltr"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465] text-right"
                />
              </div>
            ) : (
              <div className="text-xs">
                <label className="text-slate-300 font-semibold block mb-1">
                  الكود المخصص للهدية *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="مثال: GIFT-KHALID-2026"
                    dir="ltr"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 shrink-0 transition"
                    title="توليد كود تلقائي"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-brand-300" />
                    <span>توليد كود</span>
                  </button>
                </div>
              </div>
            )}

            <div className="text-xs">
              <label className="text-slate-300 font-semibold block mb-1">
                رسالة الإهداء الشخصية (اختياري)
              </label>
              <textarea
                rows={2}
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="اكتب تهنئة أو رسالة خاصة تظهر على البطاقة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
              />
            </div>
          </div>

          {/* 4. Quick Payment for Digital Voucher */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <label className="text-sm font-extrabold text-white block">
              4. وسيلة الدفع لإصدار القسيمة
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'card'
                    ? 'bg-[#551465] text-white border-brand-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>بطاقة بنكية</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('stc_pay')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'stc_pay'
                    ? 'bg-[#551465] text-white border-brand-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>محفظة إلكترونية</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('apple_pay')}
                className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'apple_pay'
                    ? 'bg-[#551465] text-white border-brand-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Apple Pay</span>
              </button>
            </div>

            {paymentMethod === 'card' && (
              <div className="text-xs">
                <label className="text-slate-400 block mb-1">آخر 4 أرقام من البطاقة للتأكيد</label>
                <input
                  type="text"
                  maxLength={4}
                  value={cardLastFour}
                  onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ''))}
                  placeholder="4242"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#551465]"
                />
              </div>
            )}

            {paymentMethod === 'stc_pay' && (
              <div className="text-xs">
                <label className="text-slate-400 block mb-1">رقم الجوال المسجل (كريمي / جيب / فلوسي / كاش ون)</label>
                <input
                  type="tel"
                  value={walletPhone}
                  onChange={(e) => setWalletPhone(e.target.value)}
                  placeholder="77XXXXXXX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#551465]"
                />
              </div>
            )}
          </div>

          {formError && (
            <div className="bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#551465] hover:bg-brand-700 disabled:opacity-60 text-white font-extrabold py-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#551465]/30 border border-brand-500/40 transition active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'جاري إصدار القسيمة...'
                : `شراء وإصدار القسيمة (${formatPrice(
                    Math.max(0, effectiveAmount),
                    settings.activeCurrency,
                    settings.yerExchangeRate
                  )})`}
            </span>
          </button>
        </form>

        {/* Left Column: Live Preview, Issued Voucher Confirmation & Balance Checker */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Card Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">معاينة بطاقة الهدية المباشرة</span>
              <span className="text-brand-300 font-semibold">بطاقة رقمية فورية</span>
            </div>

            <div
              className={`rawaj-dark-surface ${activeThemeMeta.surfaceClass} rounded-2xl p-5 text-white shadow-2xl border border-white/15 relative overflow-hidden space-y-5`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] opacity-80 block">
                    {settings.storeName.split('|')[0].trim()}
                  </span>
                  <strong className="text-sm font-extrabold">قسيمة هدية رقمية</strong>
                </div>
                <div className="text-left">
                  <span className={`text-xl font-black tabular-nums ${activeThemeMeta.accentClass}`}>
                    {formatPrice(
                      Math.max(0, effectiveAmount),
                      settings.activeCurrency,
                      settings.yerExchangeRate
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <p className="opacity-90">
                  إلى: <strong>{recipientName.trim() || 'صديقك العزيز'}</strong>
                  {' · '}
                  من: <strong>{senderName.trim() || 'المرسل'}</strong>
                </p>
                {giftMessage.trim() && (
                  <p className="text-[11px] opacity-85 italic leading-relaxed">
                    «{giftMessage.trim()}»
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] opacity-75 block">كود الاستخدام</span>
                  <span className="font-mono font-extrabold tracking-wider text-sm">
                    {previewCode}
                  </span>
                </div>
                <Gift className={`w-6 h-6 ${activeThemeMeta.accentClass}`} />
              </div>
            </div>

            {/* Newly Issued Voucher Confirmation */}
            {issuedVoucher && (
              <div className="bg-emerald-950/35 border border-emerald-500/40 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="text-white block">تم إصدار قسيمة الهدية بنجاح!</strong>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {dispatchNotice ||
                        `القسيمة ${issuedVoucher.code} جاهزة الآن للاستخدام والمشاركة.`}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <span className="font-mono font-extrabold text-brand-300 text-sm">
                    {issuedVoucher.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(issuedVoucher.code, `issued-${issuedVoucher.id}`)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1 transition"
                  >
                    {copiedCode === `issued-${issuedVoucher.id}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الكود</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {issuedVoucher.deliveryMethod === 'email' && issuedVoucher.recipientEmail && (
                    <a
                      href={buildGiftEmailHref(issuedVoucher, settings.storeName)}
                      className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Mail className="w-3.5 h-3.5 text-brand-300" />
                      <span>فتح في البريد الإلكتروني</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleShareVoucher(issuedVoucher)}
                    className="flex-1 min-w-[130px] py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {sharedCode === issuedVoucher.id ? 'تم نسخ رابط الهدية' : 'مشاركة مع صديق'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onApplyVoucherToCart(issuedVoucher.code)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-extrabold flex items-center justify-center gap-1.5 transition"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>تطبيق القسيمة في سلة المشتريات</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Voucher Balance Checker */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-300" />
              <span>التحقق من رصيد قسيمة هدية</span>
            </h2>

            <form onSubmit={handleCheckBalance} className="flex gap-2">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="أدخل كود القسيمة (مثل: GIFT-...)"
                dir="ltr"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:border-[#551465]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition shrink-0"
              >
                فحص
              </button>
            </form>

            {lookupResult?.error && (
              <p className="text-xs text-rose-400 font-medium">{lookupResult.error}</p>
            )}

            {lookupResult?.voucher && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-brand-300">
                    {lookupResult.voucher.code}
                  </span>
                  <span
                    className={`font-bold ${
                      lookupResult.voucher.status === 'redeemed'
                        ? 'text-slate-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {lookupResult.voucher.status === 'active'
                      ? 'نشطة'
                      : lookupResult.voucher.status === 'partially_used'
                      ? 'مستخدمة جزئياً'
                      : 'مستخدمة بالكامل'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>الرصيد المتاح حالياً:</span>
                  <strong className="text-white tabular-nums">
                    {formatPrice(
                      lookupResult.voucher.remainingBalanceSar,
                      settings.activeCurrency,
                      settings.yerExchangeRate
                    )}
                  </strong>
                </div>
                {lookupResult.voucher.remainingBalanceSar > 0 && (
                  <button
                    type="button"
                    onClick={() => onApplyVoucherToCart(lookupResult.voucher!.code)}
                    className="w-full py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs transition"
                  >
                    تطبيق الخصم في السلة الآن
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Issued / Purchased Gift Vouchers History */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-300" />
            <span>سجل قسائم الهدايا الصادرة</span>
          </h2>
          <span className="text-xs text-slate-400 tabular-nums">
            {vouchers.length} قسيمة
          </span>
        </div>

        {vouchers.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 space-y-1">
            <p className="font-bold text-slate-300">لم تقم بشراء أي قسيمة هدية رقمية بعد.</p>
            <p>أنشئ أول قسيمة هدية من النموذج أعلاه وأرسلها لصديقك عبر البريد أو الكود المخصص.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {vouchers.map((voucher) => {
              const isExhausted = voucher.status === 'redeemed' || voucher.remainingBalanceSar <= 0;
              return (
                <div
                  key={voucher.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-extrabold text-brand-300 text-sm truncate">
                        {voucher.code}
                      </span>
                      <span
                        className={`text-[11px] font-bold shrink-0 ${
                          isExhausted
                            ? 'text-slate-500'
                            : voucher.status === 'partially_used'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {isExhausted
                          ? 'مستخدمة بالكامل'
                          : voucher.status === 'partially_used'
                          ? 'مستخدمة جزئياً'
                          : 'نشطة'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-slate-400">الرصيد المتبقي:</span>
                      <span className="text-base font-extrabold text-white tabular-nums">
                        {formatPrice(
                          voucher.remainingBalanceSar,
                          settings.activeCurrency,
                          settings.yerExchangeRate
                        )}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <p>
                        المستلم: <strong className="text-slate-200">{voucher.recipientName}</strong>
                        {voucher.recipientEmail ? ` (${voucher.recipientEmail})` : ''}
                      </p>
                      <p>
                        القيمة الأصلية:{' '}
                        {formatPrice(
                          voucher.initialAmountSar,
                          settings.activeCurrency,
                          settings.yerExchangeRate
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleCopyText(voucher.code, `card-${voucher.id}`)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold flex items-center justify-center gap-1 transition"
                    >
                      {copiedCode === `card-${voucher.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الكود</span>
                        </>
                      )}
                    </button>

                    {!isExhausted && (
                      <button
                        type="button"
                        onClick={() => onApplyVoucherToCart(voucher.code)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold flex items-center justify-center gap-1 transition"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>تطبيق بالسلة</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
