import React, { useState } from 'react';
import {
  Home,
  Search,
  ShoppingBag,
  User,
  X,
  Sparkles,
  Package,
  Heart,
  Scale,
  MessageSquareText,
  Flame,
  Sun,
  Moon,
  ChevronLeft,
  RotateCcw,
  Coins,
  Palette,
  Map,
  BellRing,
  TrendingDown,
  Fingerprint,
  ShieldCheck,
  Mic,
  MicOff,
  Gift,
  Lock,
  UserCheck,
  Coins as CoinsIcon,
  LayoutDashboard,
  Languages,
  Store
} from 'lucide-react';
import { AuthUserSummary, CurrencyCode, InAppNotification, Order, PageView, Product, ThemeMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { ArabicSpeechLocale, useVoiceSearch } from '../hooks/useVoiceSearch';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileBottomNavProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  isCartOpen: boolean;
  onOpenCart: () => void;
  wishlistCount: number;
  compareCount: number;
  onOpenCompare: () => void;
  onOpenAIAssistant: () => void;
  onOpenSellerChat: () => void;
  orders: Order[];
  returnRequestsCount: number;
  loyaltyPoints?: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  notifications?: InAppNotification[];
  priceAlertsCount?: number;
  products?: Product[];
  onOpenProduct?: (product: Product) => void;
  onMarkNotificationRead?: (id: string) => void;
  isBiometricAuthenticated?: boolean;
  hasWebAuthnPasskey?: boolean;
  onQuickBiometricSignIn?: () => Promise<{ ok: boolean; message: string }>;
  authUser?: AuthUserSummary | null;
  isPinLocked?: boolean;
  isAdminUnlocked?: boolean;
  onOpenAuth?: () => void;
  activeCurrency?: CurrencyCode;
  onChangeCurrency?: (currency: CurrencyCode) => void;
  onOpenAdmin?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  searchQuery,
  onSearchChange,
  cartCount,
  isCartOpen,
  onOpenCart,
  wishlistCount,
  compareCount,
  onOpenCompare,
  onOpenAIAssistant,
  onOpenSellerChat,
  orders,
  returnRequestsCount,
  loyaltyPoints = 0,
  theme,
  onToggleTheme,
  notifications = [],
  priceAlertsCount = 0,
  products = [],
  onOpenProduct,
  onMarkNotificationRead,
  isBiometricAuthenticated = false,
  hasWebAuthnPasskey = false,
  onQuickBiometricSignIn,
  authUser = null,
  isPinLocked = false,
  isAdminUnlocked = false,
  onOpenAuth,
  activeCurrency = 'SAR',
  onChangeCurrency,
  onOpenAdmin,
}) => {
  const { lang, setLang, isRtl, t } = useLanguage();
  const [activeSheet, setActiveSheet] = useState<'none' | 'search' | 'account'>('none');
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricNotice, setBiometricNotice] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const unreadNotifications = notifications.filter((n) => !n.read);
  const latestNotification = notifications[0];

  const voiceSearch = useVoiceSearch({
    onResult: (spokenQuery) => {
      onSearchChange(spokenQuery);
      if (currentView !== 'home') onNavigate('home');
    },
  });

  const latestCustomer = orders[0]?.customer;

  const handleBiometricAction = async () => {
    if (!hasWebAuthnPasskey || !onQuickBiometricSignIn) {
      navigateAndClose('profile');
      return;
    }
    setBiometricBusy(true);
    setBiometricNotice(null);
    const res = await onQuickBiometricSignIn();
    setBiometricNotice(res);
    setBiometricBusy(false);
  };

  const handleGoHome = () => {
    setActiveSheet('none');
    onNavigate('home');
  };

  const handleToggleSearch = () => {
    setActiveSheet((prev) => (prev === 'search' ? 'none' : 'search'));
  };

  const handleOpenCart = () => {
    setActiveSheet('none');
    onOpenCart();
  };

  const handleToggleAccount = () => {
    setActiveSheet((prev) => (prev === 'account' ? 'none' : 'account'));
  };

  const navigateAndClose = (view: PageView) => {
    setActiveSheet('none');
    onNavigate(view);
  };

  const quickSearchTerms = ['لابتوب', 'ساعة ذكية', 'سماعات', 'بلايستيشن', 'منزل ذكي'];

  return (
    <div className="md:hidden no-print" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Backdrop when sheet is open */}
      {activeSheet !== 'none' && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setActiveSheet('none')}
          aria-hidden="true"
        />
      )}

      {/* Quick Search Sheet above Bottom Nav */}
      {activeSheet === 'search' && (
        <div
          role="dialog"
          aria-label="البحث السريع في المتجر"
          className="fixed bottom-[72px] inset-x-3 z-50 bg-slate-900 border border-[#551465]/60 rounded-3xl shadow-2xl p-4 pt-2.5 space-y-3 animate-fade-in"
        >
          <div className="w-10 h-1 rounded-full bg-brand-400/60 mx-auto" />
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-[#551465]/30 border border-brand-400/40 flex items-center justify-center text-brand-300">
                <Search className="w-3.5 h-3.5" />
              </span>
              <span>البحث السريع في متجر رواج</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveSheet('none')}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
              aria-label="إغلاق البحث"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigateAndClose('home');
            }}
            className="relative"
          >
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentView !== 'home') onNavigate('home');
              }}
              placeholder="ابحث عن منتج، أو تكلّم عبر الميكروفون..."
              className="w-full bg-slate-950 text-white placeholder-slate-400 rounded-2xl pr-10 pl-28 py-3 text-xs border border-slate-700 focus:outline-none focus:border-[#551465]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            <div className="absolute left-1.5 top-1.5 bottom-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={voiceSearch.toggleListening}
                aria-pressed={voiceSearch.isListening}
                aria-label="البحث الصوتي باللغة العربية"
                title={
                  voiceSearch.isListening
                    ? 'إيقاف الاستماع الصوتي'
                    : 'البحث بالأوامر الصوتية (العربية)'
                }
                className={`px-2.5 h-full rounded-xl flex items-center justify-center border transition ${
                  voiceSearch.isListening
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-brand-300 border-slate-700'
                }`}
              >
                {voiceSearch.isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="px-2.5 h-full rounded-xl bg-slate-800 text-slate-300 text-[11px] font-bold"
                >
                  مسح
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-3 h-full rounded-xl bg-[#551465] text-white text-[11px] font-bold"
                >
                  عرض
                </button>
              )}
            </div>
          </form>

          {(voiceSearch.isListening || voiceSearch.error) && (
            <div className="bg-slate-950 border border-[#551465]/50 rounded-2xl p-2.5 text-[11px] space-y-2">
              {voiceSearch.isListening ? (
                <>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span>
                      {voiceSearch.interimTranscript
                        ? `«${voiceSearch.interimTranscript}»`
                        : 'جاري الاستماع باللغة العربية... قل مثلاً: ابحث عن ساعة ذكية'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-400">اللهجة:</span>
                    {([
                      { id: 'ar-SA', label: 'العربية' },
                      { id: 'ar-YE', label: 'اليمن' },
                      { id: 'ar-EG', label: 'مصر' },
                    ] as { id: ArabicSpeechLocale; label: string }[]).map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => voiceSearch.setLang(loc.id)}
                        className={`px-2 py-0.5 rounded-lg font-bold border transition ${
                          voiceSearch.lang === loc.id
                            ? 'bg-[#551465] text-white border-brand-400/50'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2 text-rose-300 font-bold">
                  <span>{voiceSearch.error}</span>
                  <button
                    type="button"
                    onClick={voiceSearch.clearError}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white shrink-0"
                    aria-label="إغلاق"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Search Chips & AI Assistant */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {quickSearchTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    onSearchChange(term);
                    navigateAndClose('home');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-bold transition"
                >
                  {term}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onOpenAIAssistant();
              }}
              className="w-full min-h-[42px] bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow transition"
            >
              <Sparkles className="w-4 h-4 text-brand-200" />
              <span>اسأل المساعد الذكي لاختيار الأنسب</span>
            </button>
          </div>
        </div>
      )}

      {/* User Profile & Orders Sheet above Bottom Nav */}
      {activeSheet === 'account' && (
        <div
          role="dialog"
          aria-label="حسابي والطلبات"
          className="fixed bottom-[72px] inset-x-3 z-50 bg-slate-900 border border-[#551465]/60 rounded-3xl shadow-2xl p-4 pt-2.5 space-y-3 animate-fade-in max-h-[75vh] overflow-y-auto"
        >
          <div className="w-10 h-1 rounded-full bg-brand-400/60 mx-auto" />
          {/* Customer Profile Header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#551465]/25 border border-[#551465]/50 flex items-center justify-center text-brand-300 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white truncate">
                  {latestCustomer ? latestCustomer.fullName : 'زائر متجر رواج'}
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  {latestCustomer
                    ? `${latestCustomer.city} • ${latestCustomer.phone}`
                    : 'تصفح طلباتك والمفضلة بسهولة'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSheet('none')}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white shrink-0"
              aria-label="إغلاق القائمة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loyalty Points & Profile Quick Card */}
          <button
            type="button"
            onClick={() => navigateAndClose('profile')}
            className="w-full min-h-[48px] bg-slate-950 hover:bg-slate-800 border border-amber-500/40 rounded-2xl px-4 py-3 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-amber-400" />
              <div className="text-right">
                <span className="text-xs font-extrabold text-white block">الملف الشخصي ونقاط الولاء</span>
                <span className="text-[11px] text-amber-300 font-bold tabular-nums block">
                  رصيدك: {loyaltyPoints.toLocaleString()} نقطة — استبدل بخصم فوري
                </span>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-amber-400" />
          </button>

          {/* Quick Biometric Sign-In Card */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={biometricBusy}
              onClick={handleBiometricAction}
              className={`w-full min-h-[46px] rounded-2xl px-4 py-2.5 flex items-center justify-between border transition ${
                isBiometricAuthenticated
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950 hover:bg-slate-800 border-[#551465]/50 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isBiometricAuthenticated ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Fingerprint className="w-5 h-5 text-brand-300 shrink-0" />
                )}
                <div className="text-right">
                  <span className="text-xs font-extrabold block">
                    {isBiometricAuthenticated
                      ? 'تم تسجيل الدخول بالبصمة ✓'
                      : hasWebAuthnPasskey
                      ? 'الدخول السريع بالبصمة / الوجه'
                      : 'تفعيل الدخول بالبصمة أو الوجه'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {isBiometricAuthenticated
                      ? 'حسابك ومشترياتك محمية عبر WebAuthn'
                      : hasWebAuthnPasskey
                      ? 'اضغط للتحقق البيومتري الفوري'
                      : 'سجّل بصمتك من إعدادات الأمان في حسابك'}
                  </span>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-brand-300 shrink-0" />
            </button>

            {biometricNotice && (
              <p
                className={`text-[11px] font-bold px-2 ${
                  biometricNotice.ok ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {biometricNotice.message}
              </p>
            )}
          </div>

          {/* Latest Price Drop Notification Card */}
          {(latestNotification || priceAlertsCount > 0) && (
            <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-3 space-y-2 text-right">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <BellRing className="w-4 h-4" />
                  <span>تنبيهات انخفاض الأسعار</span>
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {unreadNotifications.length > 0
                    ? `${unreadNotifications.length} إشعار جديد`
                    : `${priceAlertsCount} منتج مراقب`}
                </span>
              </div>
              {latestNotification ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onMarkNotificationRead) onMarkNotificationRead(latestNotification.id);
                    if (
                      latestNotification.type === 'checkout_reminder' ||
                      latestNotification.actionType === 'open_cart'
                    ) {
                      setActiveSheet('none');
                      onOpenCart();
                      return;
                    }
                    const matched = products.find((p) => p.id === latestNotification.productId);
                    if (matched && onOpenProduct) {
                      setActiveSheet('none');
                      onOpenProduct(matched);
                    }
                  }}
                  className="w-full text-right bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl p-2.5 flex items-start justify-between gap-2 transition"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {latestNotification.type === 'checkout_reminder' ? (
                      <ShoppingBag className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-white block">
                        {latestNotification.title}
                      </span>
                      <span className="text-[10px] text-slate-300 block leading-snug">
                        {latestNotification.message}
                      </span>
                    </div>
                  </div>
                  {(latestNotification.type === 'checkout_reminder' ||
                    latestNotification.actionType === 'open_cart') && (
                    <span className="shrink-0 bg-[#551465] text-white text-[10px] font-extrabold px-2 py-1 rounded-lg">
                      إكمال الطلب
                    </span>
                  )}
                </button>
              ) : (
                <p className="text-[11px] text-slate-400">
                  تتابع حالياً {priceAlertsCount} منتجاً؛ سيظهر أي تخفيض سعر هنا فوراً.
                </p>
              )}
            </div>
          )}

          {/* Secure Account Login / Session Security Gate */}
          {onOpenAuth && (
            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onOpenAuth();
              }}
              className={`w-full min-h-[46px] rounded-2xl px-4 py-2.5 flex items-center justify-between border transition ${
                authUser
                  ? isPinLocked
                    ? 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/45 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-950 hover:bg-slate-800 border-brand-500/40 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-right min-w-0">
                {authUser && !isPinLocked ? (
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-brand-300 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-xs font-extrabold block truncate">
                    {authUser
                      ? isPinLocked
                        ? `فتح قفل الجلسة (${authUser.displayName})`
                        : `حساب موثّق: ${authUser.displayName}`
                      : 'تسجيل الدخول الآمن وإدارة 2FA'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {authUser ? authUser.email : 'دخول محمي بـ Google Auth و 2FA والبصمة'}
                  </span>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 shrink-0" />
            </button>
          )}

          {/* Primary Orders & Returns Action */}
          <button
            type="button"
            onClick={() => navigateAndClose('track-order')}
            className="w-full min-h-[48px] bg-[#551465] hover:bg-brand-700 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg transition"
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-5 h-5 text-brand-200" />
              <div className="text-right">
                <span className="text-xs font-extrabold block">طلباتي وتتبع الشحنات</span>
                <span className="text-[10px] text-purple-100 block">
                  {orders.length} طلبات مسجلة • {returnRequestsCount} طلبات استرجاع
                </span>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-brand-200" />
          </button>

          {/* Secondary Quick Account Links */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigateAndClose('wishlist')}
              className="min-h-[46px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between font-bold text-slate-200 transition"
            >
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                </span>
                <span>المفضلة</span>
              </span>
              <span className="bg-slate-800 text-brand-300 px-2 py-0.5 rounded-lg text-[10px] tabular-nums">
                {wishlistCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onOpenCompare();
              }}
              className="min-h-[46px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between font-bold text-slate-200 transition"
            >
              <span className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#551465]/25 border border-brand-400/30 flex items-center justify-center shrink-0">
                  <Scale className="w-3.5 h-3.5 text-brand-300" />
                </span>
                <span>المقارنة</span>
              </span>
              <span className="bg-slate-800 text-brand-300 px-2 py-0.5 rounded-lg text-[10px] tabular-nums">
                {compareCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigateAndClose('offers')}
              className="min-h-[46px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2 font-bold text-slate-200 transition"
            >
              <span className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <span>العروض والخصومات</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onOpenSellerChat();
              }}
              className="min-h-[46px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2 font-bold text-slate-200 transition"
            >
              <span className="w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                <MessageSquareText className="w-3.5 h-3.5 text-purple-400" />
              </span>
              <span>دعم العملاء</span>
            </button>

            <PWAInstallButton variant="sheet" onAfterAction={() => setActiveSheet('none')} />

            <button
              type="button"
              onClick={() => navigateAndClose('gift-vouchers')}
              className="col-span-2 min-h-[44px] bg-slate-950 hover:bg-slate-800 border border-[#551465]/40 rounded-2xl p-2.5 flex items-center justify-between font-bold text-slate-100 transition"
            >
              <span className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-brand-300" />
                <span>قسائم الهدايا الرقمية لصديق</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-brand-300" />
            </button>

            {isAdminUnlocked && (
              <button
                type="button"
                onClick={() => navigateAndClose('white-label')}
                className="col-span-2 min-h-[44px] bg-slate-950 hover:bg-slate-800 border border-[#551465]/40 rounded-2xl p-2.5 flex items-center justify-between font-bold text-brand-200 transition"
              >
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-brand-300" />
                  <span>تطبيق باسمك وشعارك (White-Label)</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-brand-300" />
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateAndClose('sitemap')}
              className="col-span-2 min-h-[40px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between font-bold text-slate-200 transition"
            >
              <span className="flex items-center gap-2">
                <Map className="w-4 h-4 text-emerald-400" />
                <span>خريطة الموقع الشاملة (Sitemap)</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Store Currency & Language Tools inside Account Sheet */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-white flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-brand-300" />
                  <span>{t.languageLabel}</span>
                </span>
                <span className="text-[11px] font-bold text-brand-300 uppercase">{lang}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  aria-pressed={lang === 'ar'}
                  onClick={() => setLang('ar')}
                  className={`min-h-[38px] rounded-xl font-bold border transition ${
                    lang === 'ar'
                      ? 'bg-[#551465] text-white border-brand-400/60 shadow'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  🇸🇦 العربية (RTL)
                </button>
                <button
                  type="button"
                  aria-pressed={lang === 'en'}
                  onClick={() => setLang('en')}
                  className={`min-h-[38px] rounded-xl font-bold border transition ${
                    lang === 'en'
                      ? 'bg-[#551465] text-white border-brand-400/60 shadow'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  🇺🇸 English (LTR)
                </button>
              </div>
            </div>

            {onChangeCurrency && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <CoinsIcon className="w-4 h-4 text-amber-400" />
                    <span>{isRtl ? 'عملة عرض الأسعار' : 'Display Currency'}</span>
                  </span>
                  <span className="text-[11px] font-bold text-amber-300">{activeCurrency}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {(
                    [
                      { code: 'SAR', label: '🇸🇦 ر.س' },
                      { code: 'YER', label: '🇾🇪 ر.ي' },
                      { code: 'USD', label: '🇺🇸 $' },
                    ] as { code: CurrencyCode; label: string }[]
                  ).map((cur) => {
                    const selected = activeCurrency === cur.code;
                    return (
                      <button
                        key={cur.code}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChangeCurrency(cur.code)}
                        className={`min-h-[38px] rounded-xl font-bold border transition ${
                          selected
                            ? 'bg-[#551465] text-white border-brand-400/60 shadow'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        {cur.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigateAndClose('brands')}
            className="w-full min-h-[44px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between text-xs font-bold text-slate-200 transition"
          >
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4 text-brand-300" />
              <span>{t.navBrands}</span>
            </span>
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>

          {/* Return shortcut & Theme switch */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => navigateAndClose('track-order')}
              className="min-h-[44px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 text-amber-300 font-bold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRtl ? 'استرجاع منتج' : 'Returns'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="min-h-[44px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 text-slate-200 font-bold transition"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isRtl ? 'الوضع الفاتح' : 'Light Mode'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-brand-300" />
                  <span>{isRtl ? 'الوضع الداكن' : 'Dark Mode'}</span>
                </>
              )}
            </button>
          </div>

          {onOpenAdmin && (
            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onOpenAdmin();
              }}
              className="w-full min-h-[44px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between text-xs font-bold text-slate-200 transition"
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>{isRtl ? 'لوحة تحكم الإدارة (Admin)' : 'Admin Control Panel'}</span>
              </span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      )}

      {/* Persistent Mobile Bottom Navigation Bar (Brand Colored with Enhanced Icons) */}
      <nav
        aria-label="التنقل السريع للجوال"
        className="rawaj-bottom-nav fixed bottom-0 inset-x-0 z-40 border-t border-white/20 shadow-[0_-10px_32px_rgba(85,20,101,0.45)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4 h-[68px] max-w-md mx-auto px-2">
          {/* 1. Home */}
          {(() => {
            const isActive = currentView === 'home' && activeSheet === 'none' && !isCartOpen;
            return (
              <button
                type="button"
                onClick={handleGoHome}
                className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-all duration-200 relative group"
              >
                {isActive && (
                  <span className="absolute top-0 w-9 h-1 rounded-b-full bg-gradient-to-r from-amber-300 via-white to-amber-300 shadow-[0_2px_10px_rgba(255,255,255,0.65)]" />
                )}
                <span
                  className={`w-10 h-8 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'rawaj-nav-icon-active scale-105'
                      : 'rawaj-nav-icon-idle'
                  }`}
                >
                  <Home className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className={isActive ? 'rawaj-nav-label-active font-extrabold' : 'rawaj-nav-label-idle'}>
                  {t.bottomHome}
                </span>
              </button>
            );
          })()}

          {/* 2. Search */}
          {(() => {
            const isActive = activeSheet === 'search' || Boolean(searchQuery);
            return (
              <button
                type="button"
                onClick={handleToggleSearch}
                aria-expanded={activeSheet === 'search'}
                className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-all duration-200 relative group"
              >
                {activeSheet === 'search' && (
                  <span className="absolute top-0 w-9 h-1 rounded-b-full bg-gradient-to-r from-amber-300 via-white to-amber-300 shadow-[0_2px_10px_rgba(255,255,255,0.65)]" />
                )}
                <span
                  className={`w-10 h-8 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'rawaj-nav-icon-active scale-105'
                      : 'rawaj-nav-icon-idle'
                  }`}
                >
                  <Search className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className={isActive ? 'rawaj-nav-label-active font-extrabold' : 'rawaj-nav-label-idle'}>
                  {t.bottomSearch}
                </span>
              </button>
            );
          })()}

          {/* 3. Cart */}
          <button
            type="button"
            onClick={handleOpenCart}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-all duration-200 relative group"
          >
            {isCartOpen && (
              <span className="absolute top-0 w-9 h-1 rounded-b-full bg-gradient-to-r from-amber-300 via-white to-amber-300 shadow-[0_2px_10px_rgba(255,255,255,0.65)]" />
            )}
            <span
              className={`relative w-10 h-8 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                isCartOpen
                  ? 'rawaj-nav-icon-active scale-105'
                  : 'rawaj-nav-icon-idle'
              }`}
            >
              <ShoppingBag className="w-[19px] h-[19px]" strokeWidth={isCartOpen ? 2.4 : 2} />
              {cartCount > 0 && (
                <span className="rawaj-nav-badge absolute -top-1 -right-1.5 text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center tabular-nums shadow">
                  {cartCount}
                </span>
              )}
            </span>
            <span className={isCartOpen ? 'rawaj-nav-label-active font-extrabold' : 'rawaj-nav-label-idle'}>
              {t.bottomCart}
            </span>
          </button>

          {/* 4. User Profile / Orders */}
          {(() => {
            const isActive =
              activeSheet === 'account' ||
              currentView === 'profile' ||
              currentView === 'track-order' ||
              currentView === 'wishlist';
            return (
              <button
                type="button"
                onClick={handleToggleAccount}
                aria-expanded={activeSheet === 'account'}
                className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-all duration-200 relative group"
              >
                {isActive && (
                  <span className="absolute top-0 w-9 h-1 rounded-b-full bg-gradient-to-r from-amber-300 via-white to-amber-300 shadow-[0_2px_10px_rgba(255,255,255,0.65)]" />
                )}
                <span
                  className={`relative w-10 h-8 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'rawaj-nav-icon-active scale-105'
                      : 'rawaj-nav-icon-idle'
                  }`}
                >
                  <User className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.4 : 2} />
                  {(unreadNotifications.length > 0 || orders.length > 0 || wishlistCount > 0) && (
                    <span
                      className={`absolute top-0.5 right-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#461253] ${
                        unreadNotifications.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  )}
                </span>
                <span className={isActive ? 'rawaj-nav-label-active font-extrabold' : 'rawaj-nav-label-idle'}>
                  {t.bottomAccount}
                </span>
              </button>
            );
          })()}
        </div>
      </nav>
    </div>
  );
};
