import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Sparkles, 
  MessageSquareText, 
  LayoutDashboard, 
  FileCode2, 
  Search, 
  Heart, 
  ShieldCheck, 
  Truck,
  Flame,
  HelpCircle,
  FileText,
  Building2,
  Home,
  Megaphone,
  Scale,
  X,
  Sun,
  Moon,
  Coins,
  User,
  Palette,
  Map
} from 'lucide-react';
import { Category, StoreSettings, PageView, CurrencyCode, ThemeMode, InAppNotification, PriceDropAlert, Product } from '../types';
import { NotificationCenterPopover } from './NotificationCenterPopover';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  activeCategory: Category;
  onSelectCategory: (cat: Category) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAIAssistant: () => void;
  onOpenSellerChat: () => void;
  onOpenAdmin: () => void;
  onOpenMasterPrompt: () => void;
  wishlistCount: number;
  compareCount?: number;
  onOpenCompare?: () => void;
  settings: StoreSettings;
  onChangeCurrency?: (currency: CurrencyCode) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  loyaltyPoints?: number;
  notifications?: InAppNotification[];
  priceAlerts?: PriceDropAlert[];
  products?: Product[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onClearNotifications?: () => void;
  onRemovePriceAlert?: (productId: string) => void;
  onOpenProduct?: (product: Product) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  cartCount,
  onOpenCart,
  onOpenAIAssistant,
  onOpenSellerChat,
  onOpenAdmin,
  onOpenMasterPrompt,
  wishlistCount,
  compareCount = 0,
  onOpenCompare,
  settings,
  onChangeCurrency,
  theme = 'dark',
  onToggleTheme,
  loyaltyPoints = 0,
  notifications = [],
  priceAlerts = [],
  products = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
  onRemovePriceAlert,
  onOpenProduct,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const currentCurrency = settings.activeCurrency || 'SAR';

  const categories: { id: Category; nameAr: string }[] = [
    { id: 'all', nameAr: 'جميع المنتجات' },
    { id: 'electronics', nameAr: 'حواسيب وإلكترونيات' },
    { id: 'accessories', nameAr: 'ساعات وإكسسوارات' },
    { id: 'gaming', nameAr: 'عالم الألعاب' },
    { id: 'home', nameAr: 'المنزل الذكي' },
    { id: 'fashion', nameAr: 'أزياء ومستلزمات' },
  ];

  const pageTabs: { id: PageView; nameAr: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', nameAr: 'الرئيسية', icon: <Home className="w-3.5 h-3.5" /> },
    { id: 'offers', nameAr: 'العروض والخصومات', icon: <Flame className="w-3.5 h-3.5 text-amber-400" />, badge: 'تخفيضات' },
    { id: 'track-order', nameAr: 'تتبع الطلبات', icon: <Truck className="w-3.5 h-3.5 text-brand-300" /> },
    { id: 'profile', nameAr: 'حسابي ونقاطي', icon: <Coins className="w-3.5 h-3.5 text-amber-400" />, badge: `${loyaltyPoints.toLocaleString()} نقطة` },
    { id: 'faq', nameAr: 'الأسئلة الشائعة', icon: <HelpCircle className="w-3.5 h-3.5 text-purple-300" /> },
    { id: 'policies', nameAr: 'السياسات والضمان', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'about', nameAr: 'عن المتجر والتوثيق', icon: <Building2 className="w-3.5 h-3.5 text-indigo-300" /> },
    { id: 'white-label', nameAr: 'تطبيق باسمك وشعارك', icon: <Palette className="w-3.5 h-3.5 text-brand-300" />, badge: 'مخصص' },
    { id: 'ads', nameAr: 'الإعلانات المدفوعة', icon: <Megaphone className="w-3.5 h-3.5 text-amber-400" />, badge: 'إعلن معنا' },
    { id: 'sitemap', nameAr: 'خريطة الموقع', icon: <Map className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-xl" dir="rtl">
      {/* Top Banner */}
      <div className="rawaj-promo-bar bg-gradient-to-r from-[#551465] via-purple-900 to-slate-900 text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 text-center font-medium flex flex-wrap items-center justify-between gap-2 border-b border-[#551465]/30">
        <div className="hidden md:flex items-center gap-4 text-brand-100">
          <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-brand-300" /> توصيل مجاني للطلبات فوق {settings.freeShippingThreshold} {settings.storeCurrency}</span>
          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-brand-300" /> ضمان وكيل محلي لمدة سنتين</span>
        </div>
        <div className="mx-auto md:mx-0 text-white font-bold flex items-center gap-1.5 truncate">
          <span className="truncate">✨ خصم 10% مع الكود: <button onClick={() => onNavigate('offers')} className="bg-white/20 hover:bg-white/30 px-1.5 sm:px-2 py-0.5 rounded tracking-widest uppercase transition">RAWAJ10</button></span>
        </div>
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 hidden lg:inline">العملة:</span>
            <select 
              value={currentCurrency} 
              onChange={(e) => onChangeCurrency && onChangeCurrency(e.target.value as CurrencyCode)}
              aria-label="اختر العملة"
              className="bg-slate-800/90 text-amber-300 font-bold border border-slate-700 rounded-lg px-2 py-1 text-[11px] sm:text-xs focus:outline-none focus:border-[#551465]"
            >
              <option value="SAR">🇸🇦 ريال سعودي (ر.س)</option>
              <option value="YER">🇾🇪 ريال يمني (ر.ي)</option>
              <option value="USD">🇺🇸 دولار أمريكي ($)</option>
            </select>
          </div>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-pressed={theme === 'light'}
              aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح عالي التباين' : 'التبديل إلى الوضع الداكن'}
              title={theme === 'dark' ? 'تفعيل الوضع الفاتح عالي التباين' : 'تفعيل الوضع الداكن'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] sm:text-xs font-bold transition min-h-[28px] shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  <span>فاتح</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-200" />
                  <span>داكن</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo - Navigates to Home */}
        <button 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-2 sm:gap-3 text-right focus:outline-none group shrink-0"
        >
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#551465] to-purple-500 p-0.5 shadow-lg shadow-[#551465]/40 group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[10px] overflow-hidden flex items-center justify-center">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt="شعار متجر رواج" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-brand-300 animate-pulse" />
              )}
            </div>
          </div>
          <div>
            <h1 className="rawaj-brand-title text-sm sm:text-xl font-extrabold bg-gradient-to-r from-white via-purple-100 to-brand-200 bg-clip-text text-transparent leading-tight flex items-center gap-1">
              <span>{settings.storeName.split('|')[0].trim() || 'متجر رواج'}</span>
            </h1>
            <span className="text-[9px] sm:text-[10px] text-brand-300 font-semibold tracking-wider uppercase block">
              {settings.storeName.includes('|') ? settings.storeName.split('|')[1].trim() : 'Rawaj Store'}
            </span>
          </div>
        </button>

        {/* Search Bar (Desktop & Tablet) */}
        <div className="flex-1 max-w-xl mx-2 hidden sm:block relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentView !== 'home') onNavigate('home');
              }}
              placeholder="ابحث عن منتج، مواصفات، أو اسأل المساعد الذكي..."
              className="w-full bg-slate-800/90 text-white placeholder-slate-400 rounded-xl pr-10 pl-24 py-2.5 text-sm border border-slate-700 focus:outline-none focus:border-[#551465] focus:ring-2 focus:ring-[#551465]/30 transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <button
              onClick={onOpenAIAssistant}
              className="absolute left-1.5 top-1.5 bottom-1.5 bg-[#551465] hover:bg-brand-700 text-white font-bold px-3 text-xs rounded-lg flex items-center gap-1 shadow transition"
              title="البحث والتحليل بالذكاء الاصطناعي"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-300" />
              <span>بحث ذكي</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen((prev) => !prev)}
            className={`sm:hidden p-1.5 rounded-xl border transition ${
              isMobileSearchOpen
                ? 'bg-[#551465]/30 border-[#551465] text-brand-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            aria-label="بحث في المتجر"
            title="بحث في المتجر"
          >
            {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          {/* Master Prompt Modal Trigger */}
          <button
            onClick={onOpenMasterPrompt}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            title="عرض البرومبت الهندسي المعتمد"
          >
            <FileCode2 className="w-4 h-4 text-indigo-400" />
            <span>عرض البرومبت</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAIAssistant}
            className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#551465]/20 hover:bg-[#551465]/35 text-brand-200 border border-[#551465]/40 text-xs font-semibold transition"
            title="المساعد الذكي"
          >
            <Sparkles className="w-4 h-4 text-brand-300 animate-spin-slow" />
            <span className="hidden md:inline">المساعد الذكي</span>
          </button>

          {/* Seller Live Chat */}
          <button
            onClick={onOpenSellerChat}
            className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition relative"
            title="محادثة البائع"
          >
            <MessageSquareText className="w-4 h-4 text-purple-400" />
            <span className="hidden md:inline">محادثة البائع</span>
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping absolute top-1 right-1" />
            <span className="w-2 h-2 rounded-full bg-brand-400 absolute top-1 right-1" />
          </button>

          {/* User Profile & Loyalty Points Quick Button */}
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
              currentView === 'profile'
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="الملف الشخصي ونقاط الولاء"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono tabular-nums text-amber-300">{loyaltyPoints.toLocaleString()}</span>
            <span className="hidden lg:inline text-[11px]">نقطة</span>
          </button>

          {/* Admin Dashboard */}
          <button
            onClick={onOpenAdmin}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="لوحة تحكم الأدمن"
          >
            <LayoutDashboard className="w-4 h-4 text-amber-400" />
          </button>

          {/* Compare Button */}
          {onOpenCompare && (
            <button
              type="button"
              onClick={onOpenCompare}
              className={`p-1.5 sm:p-2 rounded-xl border transition relative ${
                compareCount > 0
                  ? 'bg-[#551465]/30 border-[#551465] text-brand-200'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="مقارنة المنتجات"
            >
              <Scale className="w-4 h-4 text-brand-300" />
              {compareCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#551465] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-brand-400/50 tabular-nums">
                  {compareCount}
                </span>
              )}
            </button>
          )}

          {/* In-App Price Drop Notifications & Alerts */}
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
              onOpenProduct={onOpenProduct}
            />
          )}

          {/* Wishlist Button */}
          <button 
            onClick={() => onNavigate('wishlist')}
            className={`p-1.5 sm:p-2 rounded-xl border transition relative ${
              currentView === 'wishlist'
                ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="قائمة المفضلة"
          >
            <Heart className="w-4 h-4 text-rose-400" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold tabular-nums">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Shopping Cart Button */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs shadow-lg shadow-[#551465]/30 transition transform active:scale-95 border border-brand-500/30"
          >
            <ShoppingBag className="w-4 h-4 text-brand-200" />
            <span className="hidden sm:inline">السلة</span>
            <span className="bg-slate-950 text-brand-300 px-1.5 py-0.5 rounded-md text-[11px] font-extrabold border border-brand-500/20 tabular-nums">
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {/* Collapsible Mobile Search Bar */}
      {isMobileSearchOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-900/95 px-3 py-2.5">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentView !== 'home') onNavigate('home');
              }}
              placeholder="ابحث عن منتج أو مواصفات..."
              className="w-full bg-slate-800/90 text-white placeholder-slate-400 rounded-xl pr-9 pl-24 py-2 text-xs border border-slate-700 focus:outline-none focus:border-[#551465] focus:ring-2 focus:ring-[#551465]/30"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                onOpenAIAssistant();
              }}
              className="absolute left-1.5 top-1 bottom-1 bg-[#551465] hover:bg-brand-700 text-white font-bold px-2.5 text-[11px] rounded-lg flex items-center gap-1 transition"
            >
              <Sparkles className="w-3 h-3 text-brand-300" />
              <span>بحث ذكي</span>
            </button>
          </div>
        </div>
      )}

      {/* Pages & Sub-pages Navigation Bar */}
      <nav className="border-t border-slate-800 bg-slate-950/90 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-start sm:justify-center space-x-reverse space-x-1 py-2 text-xs font-bold">
          {pageTabs.map((tab) => {
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
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
                  <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded border border-amber-500/30 font-bold">
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
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-start sm:justify-center space-x-reverse space-x-1 py-1.5 text-xs font-medium">
            <span className="text-[11px] text-slate-500 ml-2 font-bold">التصنيفات:</span>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all text-[11px] ${
                    isActive
                      ? 'bg-slate-800 text-brand-300 font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {cat.nameAr}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};

