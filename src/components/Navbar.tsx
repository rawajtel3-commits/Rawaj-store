import React from 'react';
import {
  ShoppingBag,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Truck,
  Flame,
  HelpCircle,
  Building2,
  Home,
  Megaphone,
  Coins,
  Palette,
  Map,
  Gift,
  Lock,
  UserCheck,
  Store,
} from 'lucide-react';
import {
  AuthUserSummary,
  Category,
  StoreSettings,
  PageView,
  InAppNotification,
  isAdminRole,
  PriceDropAlert,
  Product,
} from '../types';
import { NotificationCenterPopover } from './NotificationCenterPopover';
import { PWAInstallButton } from './PWAInstallButton';
import { useLanguage } from '../contexts/LanguageContext';
import { translateCategory } from '../utils/i18n';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  activeCategory: Category;
  onSelectCategory: (cat: Category) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  settings: StoreSettings;
  loyaltyPoints?: number;
  notifications?: InAppNotification[];
  priceAlerts?: PriceDropAlert[];
  products?: Product[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onClearNotifications?: () => void;
  onRemovePriceAlert?: (productId: string) => void;
  onEditPriceAlert?: (product: Product) => void;
  onOpenProduct?: (product: Product) => void;
  authUser?: AuthUserSummary | null;
  isPinLocked?: boolean;
  isAdminUnlocked?: boolean;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeCategory,
  onSelectCategory,
  cartCount,
  onOpenCart,
  onOpenAdmin,
  settings,
  loyaltyPoints = 0,
  notifications = [],
  priceAlerts = [],
  products = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
  onRemovePriceAlert,
  onEditPriceAlert,
  onOpenProduct,
  authUser = null,
  isPinLocked = false,
  isAdminUnlocked = false,
  onOpenAuth,
}) => {
  const { lang, isRtl, t } = useLanguage();

  const categoryIds: Category[] = [
    'all',
    'electronics',
    'accessories',
    'gaming',
    'home',
    'fashion',
  ];

  const pageTabs: { id: PageView; nameAr: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', nameAr: t.navHome, icon: <Home className="w-3.5 h-3.5" /> },
    {
      id: 'offers',
      nameAr: t.navOffers,
      icon: <Flame className="w-3.5 h-3.5 text-amber-400" />,
      badge: t.badgeOffers,
    },
    {
      id: 'brands',
      nameAr: t.navBrands,
      icon: <Store className="w-3.5 h-3.5 text-brand-300" />,
      badge: t.badgeBrands,
    },
    {
      id: 'amazon-sa',
      nameAr: t.navAmazonSa,
      icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />,
      badge: t.badgeAmazonSa,
    },
    {
      id: 'gift-vouchers',
      nameAr: t.navGiftVouchers,
      icon: <Gift className="w-3.5 h-3.5 text-brand-300" />,
      badge: t.badgeGift,
    },
    { id: 'track-order', nameAr: t.navTrackOrder, icon: <Truck className="w-3.5 h-3.5 text-brand-300" /> },
    {
      id: 'profile',
      nameAr: t.navProfile,
      icon: <Coins className="w-3.5 h-3.5 text-amber-400" />,
      badge: `${loyaltyPoints.toLocaleString()} ${t.badgePoints}`,
    },
    { id: 'faq', nameAr: t.navFaq, icon: <HelpCircle className="w-3.5 h-3.5 text-purple-300" /> },
    { id: 'policies', nameAr: t.navPolicies, icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'about', nameAr: t.navAbout, icon: <Building2 className="w-3.5 h-3.5 text-indigo-300" /> },
    ...(isAdminUnlocked
      ? [
          {
            id: 'white-label' as PageView,
            nameAr: t.navWhiteLabel,
            icon: <Palette className="w-3.5 h-3.5 text-brand-300" />,
            badge: t.badgeAdmin,
          },
        ]
      : []),
    {
      id: 'ads',
      nameAr: t.navAds,
      icon: <Megaphone className="w-3.5 h-3.5 text-amber-400" />,
      badge: t.badgeAds,
    },
    { id: 'sitemap', nameAr: t.navSitemap, icon: <Map className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  const storeTitle = isRtl
    ? settings.storeName.split('|')[0].trim() || t.storeBrandFallback
    : settings.storeName.includes('|')
    ? settings.storeName.split('|')[1].trim()
    : t.storeBrandFallback;

  const storeSubtitle = isRtl
    ? settings.storeName.includes('|')
      ? settings.storeName.split('|')[1].trim()
      : t.storeTaglineFallback
    : t.storeTaglineFallback;

  return (
    <header
      className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-xl"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Banner */}
      <div className="rawaj-promo-bar bg-gradient-to-r from-[#551465] via-purple-900 to-slate-900 text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 text-center font-medium flex flex-wrap items-center justify-between gap-2 border-b border-[#551465]/30">
        <div className="hidden md:flex items-center gap-4 text-brand-100">
          <span className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-brand-300" /> {t.freeShippingBanner}{' '}
            {settings.freeShippingThreshold} {settings.storeCurrency}
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-300" /> {t.warrantyBanner}
          </span>
        </div>
        <div className="mx-auto md:mx-0 text-white font-bold flex items-center gap-1.5 truncate">
          <span className="truncate">
            {t.promoDiscountPrefix}{' '}
            <button
              type="button"
              onClick={() => onNavigate('offers')}
              className="bg-white/20 hover:bg-white/30 px-1.5 sm:px-2 py-0.5 rounded tracking-widest uppercase transition"
            >
              RAWAJ10
            </button>
          </span>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Brand Logo - Navigates to Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex items-center gap-2.5 sm:gap-3 ${isRtl ? 'text-right' : 'text-left'} focus:outline-none group shrink-0`}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#551465] to-purple-500 p-0.5 shadow-lg shadow-[#551465]/40 group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[10px] overflow-hidden flex items-center justify-center">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={storeTitle}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand-300" />
              )}
            </div>
          </div>
          <div>
            <h1 className="rawaj-brand-title text-base sm:text-xl font-extrabold bg-gradient-to-r from-white via-purple-100 to-brand-200 bg-clip-text text-transparent leading-tight flex items-center gap-1">
              <span>{storeTitle}</span>
            </h1>
            <span className="text-[10px] text-brand-300 font-semibold tracking-wider uppercase block">
              {storeSubtitle}
            </span>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Amazon Saudi Arabia Dedicated Storefront Icon beside Notifications */}
          <button
            type="button"
            onClick={() => onNavigate('amazon-sa')}
            aria-current={currentView === 'amazon-sa' ? 'page' : undefined}
            aria-label={isRtl ? 'تسوق من أمازون السعودية' : 'Shop Amazon Saudi Arabia'}
            title={isRtl ? 'صفحة أمازون السعودية المباشرة' : 'Amazon Saudi Arabia Storefront'}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border transition inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              currentView === 'amazon-sa'
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold shadow-lg shadow-amber-500/20'
                : 'bg-amber-500/15 hover:bg-amber-400/25 text-amber-300 border-amber-400/40 font-bold'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 10h14l-1.2 8.5a2 2 0 0 1-2 1.5H8.2a2 2 0 0 1-2-1.5L5 10Z" />
              <path d="M9 10V7a3 3 0 0 1 6 0v3" />
              <path d="M8.5 14.5c2 1.6 5 1.6 7 0" />
            </svg>
            <span className="hidden sm:inline text-xs">{t.navAmazonSa}</span>
            <span
              className={`sm:hidden text-[10px] font-extrabold tracking-tight ${
                currentView === 'amazon-sa' ? 'text-slate-950' : 'text-amber-200'
              }`}
            >
              AMZ
            </span>
          </button>

          {/* In-App Notifications & Price Drop Alerts */}
          {onOpenProduct && (
            <NotificationCenterPopover
              notifications={notifications}
              priceAlerts={priceAlerts}
              products={products}
              settings={settings}
              onMarkAsRead={(id) => onMarkNotificationRead && onMarkNotificationRead(id)}
              onMarkAllAsRead={() => onMarkAllNotificationsRead && onMarkAllNotificationsRead()}
              onClearNotifications={() => onClearNotifications && onClearNotifications()}
              onRemovePriceAlert={(pid) => onRemovePriceAlert && onRemovePriceAlert(pid)}
              onEditPriceAlert={onEditPriceAlert}
              onOpenProduct={onOpenProduct}
              onOpenCart={onOpenCart}
            />
          )}

          {/* Desktop-only Essential Controls */}
          <div className="hidden md:flex items-center gap-2">
            <PWAInstallButton variant="navbar" />

            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition shrink-0 whitespace-nowrap ${
                  authUser
                    ? isPinLocked
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                      : 'bg-emerald-950/50 hover:bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 hover:bg-[#551465] text-white border-slate-700 hover:border-brand-400/50'
                }`}
                title={
                  authUser
                    ? isPinLocked
                      ? 'الجلسة مقفلة برمز 2FA — اضغط للفتح'
                      : authUser.email
                    : t.secureLogin
                }
              >
                {authUser ? (
                  isPinLocked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )
                ) : (
                  <Lock className="w-3.5 h-3.5 text-brand-300 shrink-0" />
                )}
                <span className="max-w-[110px] truncate">
                  {authUser ? authUser.displayName.split(' ')[0] : t.secureLogin}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAdmin}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition relative"
              aria-label="لوحة تحكم الأدمن"
              title="Admin Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" />
              {!isAdminRole(authUser?.role) && (
                <Lock className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -left-1 bg-slate-900 rounded-full p-0.5 border border-slate-700" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs shadow-lg shadow-[#551465]/30 transition transform active:scale-95 border border-brand-500/30 whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4 text-brand-200" />
              <span>{t.cart}</span>
              <span className="bg-slate-950 text-brand-300 px-1.5 py-0.5 rounded-md text-[11px] font-extrabold border border-brand-500/20 tabular-nums">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pages & Sub-pages Navigation Bar */}
      <nav className="border-t border-slate-800 bg-slate-950/90 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-start sm:justify-center gap-1 py-2 text-xs font-bold">
          {pageTabs.map((tab) => {
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 relative ${
                  isActive
                    ? 'bg-[#551465] text-white shadow-md shadow-[#551465]/30 border border-brand-500/40 font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {tab.icon}
                <span>{tab.nameAr}</span>
                {tab.badge && (
                  <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded border border-amber-500/30 font-bold tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Category Navigation Bar (Visible in Home View) */}
      {currentView === 'home' && (
        <nav className="border-t border-slate-800/60 bg-slate-950/40 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-start sm:justify-center gap-1 py-1.5 text-xs font-medium">
            <span className="text-[11px] text-slate-500 mx-1 font-bold">{t.categoriesLabel}</span>
            {categoryIds.map((catId) => {
              const isActive = activeCategory === catId;
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => onSelectCategory(catId)}
                  className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all text-[11px] ${
                    isActive
                      ? 'bg-slate-800 text-brand-300 font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {translateCategory(catId, lang)}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};

