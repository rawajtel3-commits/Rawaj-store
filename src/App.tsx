import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Sparkles, 
  MessageSquareText, 
  ShoppingBag, 
  Search, 
  ShieldCheck, 
  Truck, 
  Award, 
  Filter, 
  Zap,
  ArrowRight,
  FileCode2,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { Product, CartItem, Order, Category, AdminStats, StoreSettings, SellerChatMessage, PageView, CurrencyCode, ThemeMode, ReturnRequest, ReturnRequestStatus, FlashOfferConfig, UserProfile, LoyaltyTransaction, WhiteLabelTenant, BrowsingHistoryEntry, PriceDropAlert, InAppNotification } from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_RETURN_REQUESTS,
  INITIAL_FLASH_OFFER,
  INITIAL_ADMIN_STATS, 
  INITIAL_STORE_SETTINGS,
  INITIAL_SELLER_CHAT,
  INITIAL_USER_PROFILE,
  INITIAL_LOYALTY_HISTORY
} from './data/initialData';

import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { SellerChatModal } from './components/SellerChatModal';
import { AdminDashboard } from './components/AdminDashboard';
import { MasterPromptModal } from './components/MasterPromptModal';
import { Footer } from './components/Footer';

// Sub-pages imports
import { OrderTrackingPage } from './components/pages/OrderTrackingPage';
import { OffersPage } from './components/pages/OffersPage';
import { FAQPage } from './components/pages/FAQPage';
import { PoliciesPage } from './components/pages/PoliciesPage';
import { AboutPage } from './components/pages/AboutPage';
import { WishlistPage } from './components/pages/WishlistPage';
import { AdsPage } from './components/pages/AdsPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { WhiteLabelStudioPage } from './components/pages/WhiteLabelStudioPage';
import { SitemapPage } from './components/pages/SitemapPage';
import { applyBrandPaletteToDocument } from './utils/whiteLabel';
import { loadBrowsingHistory, saveBrowsingHistory, recordBrowsingView } from './utils/recommendations';
import {
  loadPriceAlerts,
  savePriceAlerts,
  loadNotifications,
  saveNotifications,
  evaluatePriceDropNotification,
} from './utils/priceAlerts';
import { WishlistToast, WishlistToastState } from './components/WishlistToast';
import { PriceDropToast } from './components/PriceDropToast';
import { CompareBar } from './components/CompareBar';
import { ProductCompareModal } from './components/ProductCompareModal';
import { FlashOfferBanner } from './components/FlashOfferBanner';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ProductFilterSidebar, BrandFacet } from './components/ProductFilterSidebar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CheckoutReminderToast } from './components/CheckoutReminderToast';
import { sendCheckoutReminderPushNotification } from './utils/checkoutReminder';
import { formatPrice } from './utils/currency';

export default function App() {
  // Navigation & Page State (with SEO deep-link support)
  const [currentView, setCurrentView] = useState<PageView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') as PageView | null;
      const allowed: PageView[] = ['home', 'offers', 'track-order', 'faq', 'policies', 'about', 'wishlist', 'ads', 'profile', 'white-label', 'sitemap'];
      return v && allowed.includes(v) ? v : 'home';
    } catch {
      return 'home';
    }
  });
  const [viewHistory, setViewHistory] = useState<PageView[]>([]);

  // Theme State (Dark vs High-Contrast Light)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('rawaj-theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem('rawaj-theme', theme);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Application Data States
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>(INITIAL_RETURN_REQUESTS);
  const [flashOffer, setFlashOffer] = useState<FlashOfferConfig>(INITIAL_FLASH_OFFER);
  const [stats, setStats] = useState<AdminStats>(INITIAL_ADMIN_STATS);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_STORE_SETTINGS);
  const [activeWhiteLabelId, setActiveWhiteLabelId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rawaj-whitelabel-active-id');
    } catch {
      return null;
    }
  });

  const handleApplyWhiteLabelToStore = (tenant: WhiteLabelTenant) => {
    setActiveWhiteLabelId(tenant.id);
    applyBrandPaletteToDocument(tenant.theme.primary);
    setSettings((prev) => ({
      ...prev,
      storeName: `${tenant.appName} | ${tenant.appNameEn}`,
      logoUrl: tenant.iconAsset?.cdnUrl || prev.logoUrl,
    }));
    try {
      localStorage.setItem('rawaj-whitelabel-active-id', tenant.id);
      localStorage.setItem('rawaj-whitelabel-primary', tenant.theme.primary);
    } catch {
      // Ignore storage failures
    }
  };

  const handleResetWhiteLabelStore = () => {
    setActiveWhiteLabelId(null);
    applyBrandPaletteToDocument(null);
    setSettings((prev) => ({
      ...prev,
      storeName: INITIAL_STORE_SETTINGS.storeName,
      logoUrl: INITIAL_STORE_SETTINGS.logoUrl,
    }));
    try {
      localStorage.removeItem('rawaj-whitelabel-active-id');
      localStorage.removeItem('rawaj-whitelabel-primary');
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    try {
      const savedPrimary = localStorage.getItem('rawaj-whitelabel-primary');
      if (savedPrimary) {
        applyBrandPaletteToDocument(savedPrimary);
      }
    } catch {
      // Ignore
    }
  }, []);

  // User Profile & Loyalty Points State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('rawaj-user-profile');
      return saved ? (JSON.parse(saved) as UserProfile) : INITIAL_USER_PROFILE;
    } catch {
      return INITIAL_USER_PROFILE;
    }
  });

  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('rawaj-loyalty-history');
      return saved ? (JSON.parse(saved) as LoyaltyTransaction[]) : INITIAL_LOYALTY_HISTORY;
    } catch {
      return INITIAL_LOYALTY_HISTORY;
    }
  });

  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rawaj-loyalty-points');
      if (saved !== null) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return INITIAL_LOYALTY_HISTORY.reduce(
      (sum, tx) => (tx.type === 'earned' ? sum + tx.points : sum - tx.points),
      0
    );
  });

  const [pendingRedeemPoints, setPendingRedeemPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rawaj-pending-redeem');
      const parsed = saved ? Number(saved) : 0;
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('rawaj-user-profile', JSON.stringify(userProfile));
      localStorage.setItem('rawaj-loyalty-history', JSON.stringify(loyaltyHistory));
      localStorage.setItem('rawaj-loyalty-points', String(loyaltyPoints));
      localStorage.setItem('rawaj-pending-redeem', String(pendingRedeemPoints));
    } catch {
      // Ignore storage errors
    }
  }, [userProfile, loyaltyHistory, loyaltyPoints, pendingRedeemPoints]);

  // Filters & Search
  const [activeCategory, setActiveCategory] = useState<Category>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category') as Category | null;
      const allowed: Category[] = ['all', 'electronics', 'gaming', 'fashion', 'home', 'accessories'];
      return cat && allowed.includes(cat) ? cat : 'all';
    } catch {
      return 'all';
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [onSaleOnly, setOnSaleOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'rating-desc'>('default');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  const catalogBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 10000 };
    const prices = products.map((p) => p.price);
    return {
      min: Math.floor(Math.min(...prices) / 100) * 100,
      max: Math.ceil(Math.max(...prices) / 100) * 100,
    };
  }, [products]);

  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(10000);

  useEffect(() => {
    setPriceMin((prev) => Math.max(catalogBounds.min, prev));
    setPriceMax((prev) => (prev === 10000 && catalogBounds.max !== 10000 ? catalogBounds.max : Math.min(Math.max(prev, catalogBounds.min), catalogBounds.max)));
  }, [catalogBounds.min, catalogBounds.max]);

  const getProductBrand = (product: Product): string => {
    if (product.brand && product.brand.trim()) return product.brand.trim();
    return 'رواج (Rawaj)';
  };

  const brandFacets: BrandFacet[] = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const b = getProductBrand(p);
      counts.set(b, (counts.get(b) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const handleToggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setSelectedBrands([]);
    setMinRating(0);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setSortBy('default');
    setPriceMin(catalogBounds.min);
    setPriceMax(catalogBounds.max);
  };

  const activeFilterCount =
    selectedBrands.length +
    (minRating > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (priceMin > catalogBounds.min || priceMax < catalogBounds.max ? 1 : 0);

  // Cart, Wishlist & Compare
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [checkoutLoyaltyPointsToRedeem, setCheckoutLoyaltyPointsToRedeem] = useState<number>(0);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistToast, setWishlistToast] = useState<WishlistToastState | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareLimitWarning, setCompareLimitWarning] = useState(false);

  // Modals & Drawers Visibility
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductMediaMode, setSelectedProductMediaMode] = useState<'images' | 'video'>('images');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isSellerChatOpen, setIsSellerChatOpen] = useState(false);
  const [chatAttachedProduct, setChatAttachedProduct] = useState<Product | null>(null);
  const [sellerChatMessages, setSellerChatMessages] = useState<SellerChatMessage[]>(INITIAL_SELLER_CHAT);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMasterPromptOpen, setIsMasterPromptOpen] = useState(false);

  const [browsingHistory, setBrowsingHistory] = useState<BrowsingHistoryEntry[]>(() =>
    loadBrowsingHistory()
  );
  const [priceAlerts, setPriceAlerts] = useState<PriceDropAlert[]>(() => loadPriceAlerts());
  const [notifications, setNotifications] = useState<InAppNotification[]>(() =>
    loadNotifications()
  );
  const [activePriceDropToast, setActivePriceDropToast] = useState<InAppNotification | null>(null);
  const [activeCheckoutReminderToast, setActiveCheckoutReminderToast] =
    useState<InAppNotification | null>(null);
  const checkoutReminderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    saveBrowsingHistory(browsingHistory);
  }, [browsingHistory]);

  useEffect(() => {
    savePriceAlerts(priceAlerts);
  }, [priceAlerts]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  const handleTogglePriceAlert = (product: Product, targetPrice?: number) => {
    setPriceAlerts((prev) => {
      const existing = prev.find((a) => a.productId === product.id);
      if (existing && targetPrice === undefined) {
        return prev.filter((a) => a.productId !== product.id);
      }
      if (existing && targetPrice !== undefined) {
        return prev.map((a) =>
          a.productId === product.id
            ? {
                ...a,
                subscribedPrice: product.price,
                targetPrice,
                isActive: true,
              }
            : a
        );
      }
      const newAlert: PriceDropAlert = {
        id: `pa-${Date.now()}-${product.id}`,
        productId: product.id,
        productName: product.name,
        productImage: product.images[0],
        subscribedPrice: product.price,
        targetPrice,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      return [newAlert, ...prev];
    });
  };

  const handleRemovePriceAlert = (productId: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.productId !== productId));
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleCancelCheckoutReminder = () => {
    if (checkoutReminderTimerRef.current !== null) {
      window.clearTimeout(checkoutReminderTimerRef.current);
      checkoutReminderTimerRef.current = null;
    }
  };

  const handleCompleteOrderFromReminder = (notificationId?: string) => {
    if (notificationId) {
      handleMarkNotificationRead(notificationId);
    }
    setActiveCheckoutReminderToast(null);
    setSelectedProduct(null);
    setIsAIAssistantOpen(false);
    setIsSellerChatOpen(false);
    setIsAdminOpen(false);
    setIsCheckoutOpen(false);
    setIsCartOpen(true);
  };

  const handleScheduleCheckoutReminder = (
    delayMs: number,
    snapshot: {
      itemsCount: number;
      total: number;
      firstItemName: string;
      firstItemImage?: string;
    }
  ) => {
    handleCancelCheckoutReminder();
    if (snapshot.itemsCount <= 0) return;

    checkoutReminderTimerRef.current = window.setTimeout(() => {
      checkoutReminderTimerRef.current = null;
      const formattedTotal = formatPrice(
        snapshot.total,
        settings.activeCurrency,
        settings.yerExchangeRate
      );
      const reminderNotif: InAppNotification = {
        id: `chk-rem-${Date.now()}`,
        type: 'checkout_reminder',
        actionType: 'open_cart',
        productName: snapshot.firstItemName,
        productImage: snapshot.firstItemImage,
        itemsCount: snapshot.itemsCount,
        totalAmount: snapshot.total,
        title: 'تذكير: لم تكمل عملية الدفع',
        message: `لديك ${snapshot.itemsCount} منتج في سلة المشتريات بقيمة ${formattedTotal} (${snapshot.firstItemName}${snapshot.itemsCount > 1 ? ' وغيرها' : ''}). اضغط «إكمال الطلب» للعودة للسلة.`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      setNotifications((prev) => [
        reminderNotif,
        ...prev.filter((n) => n.type !== 'checkout_reminder').slice(0, 29),
      ]);
      setActiveCheckoutReminderToast(reminderNotif);

      void sendCheckoutReminderPushNotification(
        {
          title: reminderNotif.title,
          message: reminderNotif.message,
          itemsCount: snapshot.itemsCount,
          totalAmountFormatted: formattedTotal,
          iconUrl: settings.logoUrl || '/pwa-192x192.png',
        },
        () => handleCompleteOrderFromReminder(reminderNotif.id)
      );
    }, Math.max(1000, delayMs));
  };

  useEffect(() => {
    if (cartItems.length === 0) {
      handleCancelCheckoutReminder();
      setActiveCheckoutReminderToast(null);
    }
  }, [cartItems.length]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openCart') === '1') {
        setIsCartOpen(true);
        params.delete('openCart');
        const nextSearch = params.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      }
    } catch {
      // Ignore
    }

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OPEN_CART_FROM_PUSH') {
        handleCompleteOrderFromReminder();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      handleCancelCheckoutReminder();
    };
  }, []);

  const handleOpenProductDetail = (product: Product, mode: 'images' | 'video' = 'images') => {
    setBrowsingHistory((prev) => recordBrowsingView(prev, product));
    setSelectedProductMediaMode(mode);
    setSelectedProduct(product);
  };

  // Support ?product=... deep-links from Sitemap / SEO URLs
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('product');
      if (productId) {
        const match = products.find((p) => p.id === productId);
        if (match) {
          setBrowsingHistory((prev) => recordBrowsingView(prev, match));
          setSelectedProduct(match);
        }
      }
    } catch {
      // Ignore
    }
  }, [products]);

  // Dynamic SEO Title & Meta Description per route
  useEffect(() => {
    const seoMap: Record<PageView, { title: string; description: string }> = {
      home: {
        title: `${settings.storeName} – التسوق الإلكتروني الذكي`,
        description: 'تسوق أحدث الحواسيب، الساعات الذكية، الإلكترونيات، وأجهزة المنزل الذكي مع ضمان محلي سنتين وشحن سريع.',
      },
      offers: {
        title: `العروض والخصومات | ${settings.storeName}`,
        description: 'اكتشف أقوى عروض اليوم، التخفيضات الحصرية، وأكواد الخصم في متجر رواج.',
      },
      'track-order': {
        title: `تتبع الطلبات والاسترجاع | ${settings.storeName}`,
        description: 'تابع حالة شحنتك ومراحل التجهيز والتوصيل خطوة بخطوة مع إمكانية تقديم طلب استرجاع بسهولة.',
      },
      profile: {
        title: `الملف الشخصي ونقاط الولاء | ${settings.storeName}`,
        description: 'إدارة حسابك الشخصي، متابعة رصيد نقاط الولاء، واستبدال النقاط بخصومات فورية.',
      },
      wishlist: {
        title: `قائمة المفضلة | ${settings.storeName}`,
        description: 'استعرض المنتجات المحفوظة في قائمة المفضلة وأضفها إلى السلة بسرعة.',
      },
      'white-label': {
        title: `منصة تطبيق باسمك وشعارك | ${settings.storeName}`,
        description: 'خصّص اسم التطبيق، الشعار، شاشة البدء، وألوان العلامة مع بناء حزم التطبيقات الموقعة.',
      },
      ads: {
        title: `الإعلانات المدفوعة | ${settings.storeName}`,
        description: 'روّج لمنتجاتك وعلامتك التجارية عبر باقات الإعلانات المدفوعة في متجر رواج.',
      },
      faq: {
        title: `الأسئلة الشائعة | ${settings.storeName}`,
        description: 'إجابات وافية حول الشحن، الضمان، طرق الدفع الإلكتروني، والتقسيط.',
      },
      policies: {
        title: `السياسات والضمان والخصوصية | ${settings.storeName}`,
        description: 'اطلع على سياسة الاستبدال والاسترجاع، حماية البيانات، وشروط الاستخدام.',
      },
      about: {
        title: `عن المتجر والتوثيق الرسمي | ${settings.storeName}`,
        description: 'تعرف على متجر رواج وبيانات التوثيق التجاري والضريبي.',
      },
      sitemap: {
        title: `خريطة الموقع (Sitemap) | ${settings.storeName}`,
        description: 'فهرس شامل لجميع أقسام المتجر، التصنيفات الرئيسية، الصفحات الفرعية، وكتالوج المنتجات.',
      },
    };

    const meta = seoMap[currentView];
    document.title = meta.title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', meta.description);
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.setAttribute('content', meta.title);
    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.setAttribute('content', meta.description);
  }, [currentView, settings.storeName]);

  // Filtered & Sorted Products Calculation (Instant Client-Side)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      const brandName = getProductBrand(p);
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryNameAr.toLowerCase().includes(q) ||
        brandName.toLowerCase().includes(q);
      const matchesPrice = p.price >= priceMin && p.price <= priceMax;
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(brandName);
      const matchesRating = p.rating >= minRating;
      const matchesStock = !inStockOnly || p.stock > 0;
      const matchesSale = !onSaleOnly || Boolean(p.originalPrice && p.originalPrice > p.price);

      return (
        matchesCategory &&
        matchesSearch &&
        matchesPrice &&
        matchesBrand &&
        matchesRating &&
        matchesStock &&
        matchesSale
      );
    });

    if (sortBy === 'price-asc') return [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'rating-desc') return [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [
    products,
    activeCategory,
    searchQuery,
    priceMin,
    priceMax,
    selectedBrands,
    minRating,
    inStockOnly,
    onSaleOnly,
    sortBy,
  ]);

  // Cart Operations
  const handleAddToCart = (product: Product) => {
    const newItem: CartItem = {
      product,
      quantity: 1,
    };

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && !item.selectedVariant && !item.selectedWarranty
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, newItem];
    });

    setIsCartOpen(true);
  };

  const handleAddCustomCartItem = (cartItem: CartItem) => {
    setCartItems((prev) => [...prev, cartItem]);
    setIsCartOpen(true);
  };

  const handleQuickAddRecommendedToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && !item.selectedVariant && !item.selectedWarranty
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Seller Chat Handler
  const handleSendSellerMessage = async (text: string, productId?: string) => {
    const userMsg: SellerChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      senderName: 'العميل',
      text,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      productId,
    };

    setSellerChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/seller-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, productId }),
      });
      const data = await res.json();

      const sellerReply: SellerChatMessage = {
        id: `msg-seller-${Date.now()}`,
        sender: 'seller',
        senderName: 'فريق خدمة عملاء متجر رواج',
        text: data.reply || 'تم استلام رسالتك وسوف يتواصل معك مسؤول المبيعات فوراً.',
        timestamp: data.timestamp || new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setSellerChatMessages((prev) => [...prev, sellerReply]);
    } catch (e) {
      // Fallback seller message
      setSellerChatMessages((prev) => [
        ...prev,
        {
          id: `msg-seller-err-${Date.now()}`,
          sender: 'seller',
          senderName: 'فريق خدمة العملاء',
          text: 'شكراً لتواصلك معنا! يسعدنا توفير طلبك والتواصل معك.',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const openSellerChatWithProduct = (product: Product) => {
    setChatAttachedProduct(product);
    setIsSellerChatOpen(true);
  };

  const openAIWithProduct = (product: Product) => {
    setSelectedProduct(null);
    setIsAIAssistantOpen(true);
  };

  // Order Completed Event (Updates orders, clears cart, awards & deducts loyalty points)
  const handleOrderCompleted = (newOrder: Order) => {
    handleCancelCheckoutReminder();
    setActiveCheckoutReminderToast(null);
    setNotifications((prev) => prev.filter((n) => n.type !== 'checkout_reminder'));
    setOrders((prev) => [newOrder, ...prev]);
    setCartItems([]);
    setAppliedDiscount(0);

    const redeemedPts = newOrder.loyaltyPointsRedeemed || 0;
    const earnedPts = newOrder.loyaltyPointsEarned || 0;
    const todayIso = new Date().toISOString().split('T')[0];

    setLoyaltyPoints((prev) => Math.max(0, prev - redeemedPts) + earnedPts);
    setPendingRedeemPoints(0);
    setCheckoutLoyaltyPointsToRedeem(0);

    const newEntries: LoyaltyTransaction[] = [];
    if (earnedPts > 0) {
      newEntries.push({
        id: `loy-earn-${Date.now()}`,
        type: 'earned',
        points: earnedPts,
        orderNumber: newOrder.orderNumber,
        description: `نقاط مكتسبة عن الطلب ${newOrder.orderNumber}`,
        date: todayIso,
      });
    }
    if (redeemedPts > 0) {
      newEntries.push({
        id: `loy-red-${Date.now() + 1}`,
        type: 'redeemed',
        points: redeemedPts,
        discountValueSar: newOrder.loyaltyDiscount || 0,
        orderNumber: newOrder.orderNumber,
        description: `استبدال نقاط بخصم فوري على الطلب ${newOrder.orderNumber}`,
        date: todayIso,
      });
    }
    if (newEntries.length > 0) {
      setLoyaltyHistory((prev) => [...newEntries, ...prev]);
    }
  };

  // Admin Actions
  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProductStock = (id: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
    );
  };

  const handleUpdateProductPrice = (id: string, newPrice: number) => {
    const cleanPrice = Math.max(1, Math.round(newPrice));
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const oldPrice = targetProduct.price;
    const isDrop = cleanPrice < oldPrice;

    const updatedProduct: Product = {
      ...targetProduct,
      price: cleanPrice,
      originalPrice: isDrop
        ? targetProduct.originalPrice && targetProduct.originalPrice > oldPrice
          ? targetProduct.originalPrice
          : oldPrice
        : targetProduct.originalPrice,
      badge: isDrop ? 'انخفض السعر' : targetProduct.badge,
    };

    setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)));
    setSelectedProduct((prev) => (prev && prev.id === id ? updatedProduct : prev));

    if (isDrop) {
      const { triggeredNotification, updatedAlerts } = evaluatePriceDropNotification(
        updatedProduct,
        oldPrice,
        cleanPrice,
        priceAlerts
      );
      if (triggeredNotification) {
        setPriceAlerts(updatedAlerts);
        setNotifications((prev) => [triggeredNotification, ...prev]);
        setActivePriceDropToast(triggeredNotification);
        window.setTimeout(() => {
          setActivePriceDropToast((curr) =>
            curr?.id === triggeredNotification.id ? null : curr
          );
        }, 9000);
      }
    }
  };

  const handleUpdateProductVideo = (id: string, videoUrl: string, videoTitle?: string) => {
    const trimmedUrl = videoUrl.trim();
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (!trimmedUrl) {
          return { ...p, videoUrl: undefined, demoVideo: undefined };
        }
        return {
          ...p,
          videoUrl: trimmedUrl,
          demoVideo: {
            ...(p.demoVideo || {}),
            url: trimmedUrl,
            title: videoTitle?.trim() || p.demoVideo?.title || `فيديو توضيحي: ${p.name}`,
            thumbnail: p.demoVideo?.thumbnail || p.images[0],
          },
        };
      })
    );
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const handleSubmitReturnRequest = (newReturn: ReturnRequest) => {
    setReturnRequests((prev) => [newReturn, ...prev]);
  };

  const handleUpdateReturnStatus = (
    returnId: string,
    status: ReturnRequestStatus,
    adminNote?: string
  ) => {
    setReturnRequests((prev) =>
      prev.map((ret) =>
        ret.id === returnId
          ? {
              ...ret,
              status,
              ...(adminNote !== undefined ? { adminNote: adminNote.trim() || undefined } : {}),
            }
          : ret
      )
    );
  };

  const handleToggleWishlist = (productId: string) => {
    const targetProduct = products.find((p) => p.id === productId);
    const isAlreadyWishlisted = wishlistIds.includes(productId);
    setWishlistIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
    if (targetProduct) {
      setWishlistToast({
        product: targetProduct,
        action: isAlreadyWishlisted ? 'removed' : 'added',
      });
    }
  };

  const handleToggleCompare = (productId: string) => {
    if (compareIds.includes(productId)) {
      setCompareLimitWarning(false);
      setCompareIds((prev) => prev.filter((id) => id !== productId));
      return;
    }
    if (compareIds.length >= 4) {
      setCompareLimitWarning(true);
      setTimeout(() => setCompareLimitWarning(false), 4000);
      return;
    }
    setCompareLimitWarning(false);
    setCompareIds((prev) => (prev.includes(productId) || prev.length >= 4 ? prev : [...prev, productId]));
  };

  const handleAddToCompare = (productId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(productId) || prev.length >= 4) return prev;
      return [...prev, productId];
    });
  };

  const handleRemoveFromCompare = (productId: string) => {
    setCompareLimitWarning(false);
    setCompareIds((prev) => prev.filter((id) => id !== productId));
  };

  const handleClearCompare = () => {
    setCompareLimitWarning(false);
    setCompareIds([]);
  };

  const compareProducts = compareIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const handleAddProductReview = (
    productId: string,
    newReview: { userName: string; rating: number; comment: string; images?: string[] }
  ) => {
    const reviewItem = {
      id: `rev-${Date.now()}`,
      userName: newReview.userName.trim() || 'عميل متجر رواج',
      rating: newReview.rating,
      comment: newReview.comment.trim(),
      date: new Date().toISOString().split('T')[0],
      verified: true,
      ...(newReview.images && newReview.images.length > 0 ? { images: newReview.images } : {}),
    };

    const applyReviewUpdate = (p: Product): Product => {
      const updatedReviews = [reviewItem, ...(p.reviews || [])];
      const totalRating = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
      const newAvg = Number((totalRating / updatedReviews.length).toFixed(1));
      return {
        ...p,
        reviews: updatedReviews,
        rating: newAvg,
        reviewCount: updatedReviews.length,
      };
    };

    setProducts((prev) => prev.map((p) => (p.id === productId ? applyReviewUpdate(p) : p)));
    setSelectedProduct((prev) =>
      prev && prev.id === productId ? applyReviewUpdate(prev) : prev
    );
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleChangeCurrency = (newCurrency: CurrencyCode) => {
    const symbolMap: Record<CurrencyCode, string> = { SAR: 'ر.س', YER: 'ر.ي', USD: '$' };
    setSettings((prev) => ({
      ...prev,
      activeCurrency: newCurrency,
      storeCurrency: symbolMap[newCurrency] || 'ر.س',
    }));
  };

  const navigateTo = (view: PageView) => {
    if (view !== currentView) {
      setViewHistory((prev) => [...prev, currentView]);
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBack = () => {
    if (viewHistory.length === 0) {
      setCurrentView('home');
    } else {
      const previousView = viewHistory[viewHistory.length - 1] || 'home';
      setViewHistory((prev) => prev.slice(0, -1));
      setCurrentView(previousView);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[#551465] selection:text-white overflow-x-hidden">
      {/* Top Main Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenSellerChat={() => {
          setChatAttachedProduct(null);
          setIsSellerChatOpen(true);
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenMasterPrompt={() => setIsMasterPromptOpen(true)}
        wishlistCount={wishlistIds.length}
        compareCount={compareProducts.length}
        onOpenCompare={() => setIsCompareOpen(true)}
        settings={settings}
        onChangeCurrency={handleChangeCurrency}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        loyaltyPoints={loyaltyPoints}
        notifications={notifications}
        priceAlerts={priceAlerts}
        products={products}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onClearNotifications={handleClearNotifications}
        onRemovePriceAlert={handleRemovePriceAlert}
        onOpenProduct={(p) => handleOpenProductDetail(p, 'images')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8" dir="rtl">
        {currentView === 'home' && (
          <>
            {/* Top Limited-Time Flash Offer Countdown Banner */}
            <FlashOfferBanner
              offer={flashOffer}
              products={products}
              settings={settings}
              onOpenProduct={(product) => handleOpenProductDetail(product, 'images')}
              onNavigateToOffers={() => navigateTo('offers')}
            />

            {/* Hero Banner Showcase */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#551465]/40 border border-slate-800 p-5 sm:p-8 lg:p-10 shadow-2xl">
              <div className="absolute top-0 left-0 w-96 h-96 bg-[#551465]/25 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#551465]/30 border border-[#551465]/60 text-brand-200 text-xs font-bold shadow-sm">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="شعار متجر رواج" className="w-4 h-4 rounded object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-brand-300" />
                    )}
                    <span>أهلاً بكم في متجر رواج الإلكتروني الذكي المدعوم بـ Gemini AI</span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                    تسوق أحدث المنتجات الذكية مع <br />
                    <span className="bg-gradient-to-r from-brand-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                      مساعد الشراء الذكي والدردشة المباشرة
                    </span>
                  </h2>

                  <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                    اكتشف تجربة تسوق متطورة باللغة العربية: مواصفات تفصيلية، خيارات تخصيص ونقش مجاني، أنظمة دفع آمنة (بطاقات ائتمان، محافظ إلكترونية محلية، الدفع عند الاستلام)، ومساعد ذكي يختار الأنسب لميزانيتك.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => setIsAIAssistantOpen(true)}
                      className="bg-[#551465] hover:bg-brand-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#551465]/30 transition transform active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-brand-200" />
                      <span>تحدث مع المساعد الذكي الآن</span>
                    </button>

                    <button
                      onClick={() => setIsMasterPromptOpen(true)}
                      className="bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition"
                    >
                      <FileCode2 className="w-4 h-4 text-indigo-400" />
                      <span>عرض البرومبت الهندسي المعتمد</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-4 hidden lg:block">
                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs shadow-xl backdrop-blur">
                    <div className="flex items-center justify-between text-slate-400 font-bold">
                      <span>✨ المزايا السريعة في المتجر:</span>
                      <span className="text-brand-300">100% أصلي</span>
                    </div>
                    <div className="space-y-2 text-slate-300">
                      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl">
                        <ShieldCheck className="w-4 h-4 text-brand-300 shrink-0" />
                        <span>ضمان وكيل محلي سنتين مع صيانة شاملة</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl">
                        <Truck className="w-4 h-4 text-purple-300 shrink-0" />
                        <span>توصيل خلال 24-48 ساعة داخل الجمهورية اليمنية</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>فاتورة ضريبية مبسطة قابلة للطباعة</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section Title & Filter Summary */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>معرض المنتجات المتاحة</span>
                    <span className="text-xs bg-slate-800 text-brand-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-bold tabular-nums">
                      {filteredProducts.length} منتج
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">تصفح المواصفات، فلتر حسب السعر والماركة والتقييم، واطلب التخصيص الفوري</p>
                </div>

                <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                  {/* Mobile & Tablet Filter Drawer Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="lg:hidden flex-1 sm:flex-initial min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-brand-300" />
                    <span>تصفية متقدمة</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-[#551465] text-white text-[10px] px-1.5 py-0.2 rounded-full font-black tabular-nums">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Sort Order */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    aria-label="ترتيب المنتجات"
                    className="flex-1 sm:flex-initial min-h-[38px] bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#551465]"
                  >
                    <option value="default">الترتيب: الافتراضي</option>
                    <option value="price-asc">السعر: من الأقل للأعلى</option>
                    <option value="price-desc">السعر: من الأعلى للأقل</option>
                    <option value="rating-desc">التقييم: الأعلى تقييماً</option>
                  </select>

                  {searchQuery && (
                    <div className="flex items-center gap-2 text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">بحث:</span>
                      <strong className="text-brand-300">"{searchQuery}"</strong>
                      <button 
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-slate-500 hover:text-white mr-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Filters Summary Chips */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-400 font-bold">الفلاتر النشطة:</span>
                  {selectedBrands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => handleToggleBrand(brand)}
                      className="bg-[#551465]/20 text-brand-200 border border-[#551465]/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 hover:bg-[#551465]/35 transition"
                    >
                      <span>{brand}</span>
                      <span>✕</span>
                    </button>
                  ))}
                  {minRating > 0 && (
                    <button
                      type="button"
                      onClick={() => setMinRating(0)}
                      className="bg-amber-950/50 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5"
                    >
                      <span>تقييم {minRating}+ ★</span>
                      <span>✕</span>
                    </button>
                  )}
                  {(priceMin > catalogBounds.min || priceMax < catalogBounds.max) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPriceMin(catalogBounds.min);
                        setPriceMax(catalogBounds.max);
                      }}
                      className="bg-slate-900 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 tabular-nums"
                    >
                      <span>السعر: {priceMin.toLocaleString()} - {priceMax.toLocaleString()} ر.س</span>
                      <span>✕</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-rose-400 hover:text-rose-300 font-bold underline px-1.5"
                  >
                    إعادة ضبط الكل
                  </button>
                </div>
              )}

              {/* Advanced Filter Sidebar + Product Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <ProductFilterSidebar
                  minCatalogPrice={catalogBounds.min}
                  maxCatalogPrice={catalogBounds.max}
                  priceMin={priceMin}
                  priceMax={priceMax}
                  onPriceRangeChange={(min, max) => {
                    setPriceMin(min);
                    setPriceMax(max);
                  }}
                  brands={brandFacets}
                  selectedBrands={selectedBrands}
                  onToggleBrand={handleToggleBrand}
                  minRating={minRating}
                  onMinRatingChange={setMinRating}
                  inStockOnly={inStockOnly}
                  onToggleInStockOnly={() => setInStockOnly((v) => !v)}
                  onSaleOnly={onSaleOnly}
                  onToggleOnSaleOnly={() => setOnSaleOnly((v) => !v)}
                  activeFilterCount={activeFilterCount}
                  onResetFilters={handleResetFilters}
                  totalMatching={filteredProducts.length}
                  settings={settings}
                  isMobileOpen={isMobileFilterOpen}
                  onCloseMobile={() => setIsMobileFilterOpen(false)}
                />

                <div className="lg:col-span-9">
                  {/* Product Cards Grid */}
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3 px-4">
                      <Search className="w-10 h-10 text-slate-600 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-300">لم نجد منتجات تطابق الفلاتر المختارة حالياً</h4>
                      <p className="text-xs text-slate-500">جرّب توسيع النطاق السعري أو إزالة بعض الفلاتر لعرض المزيد من المنتجات.</p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow transition"
                      >
                        إعادة ضبط جميع الفلاتر
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onQuickView={handleOpenProductDetail}
                          onAddToCart={handleAddToCart}
                          onAskAI={(p) => openAIWithProduct(p)}
                          isWishlisted={wishlistIds.includes(product.id)}
                          onToggleWishlist={handleToggleWishlist}
                          isCompared={compareIds.includes(product.id)}
                          onToggleCompare={handleToggleCompare}
                          onAddReview={handleAddProductReview}
                          settings={settings}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Sub-pages Rendering */}
        {currentView === 'offers' && (
          <OffersPage
            products={products}
            onQuickView={handleOpenProductDetail}
            onAddToCart={handleAddToCart}
            onBackToHome={handleGoBack}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            settings={settings}
          />
        )}

        {currentView === 'track-order' && (
          <OrderTrackingPage
            orders={orders}
            returnRequests={returnRequests}
            onSubmitReturnRequest={handleSubmitReturnRequest}
            onBackToHome={handleGoBack}
            onOpenSellerChat={() => setIsSellerChatOpen(true)}
            settings={settings}
          />
        )}

        {currentView === 'faq' && (
          <FAQPage
            onBackToHome={handleGoBack}
            onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
            onOpenSellerChat={() => setIsSellerChatOpen(true)}
            settings={settings}
          />
        )}

        {currentView === 'policies' && (
          <PoliciesPage onBackToHome={handleGoBack} />
        )}

        {currentView === 'about' && (
          <AboutPage
            onBackToHome={handleGoBack}
            onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
            onOpenSellerChat={() => setIsSellerChatOpen(true)}
            settings={settings}
          />
        )}

        {currentView === 'wishlist' && (
          <WishlistPage
            wishlistIds={wishlistIds}
            products={products}
            onQuickView={handleOpenProductDetail}
            onAddToCart={handleAddToCart}
            onRemoveFromWishlist={handleToggleWishlist}
            onBackToHome={handleGoBack}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            settings={settings}
          />
        )}

        {currentView === 'ads' && (
          <AdsPage
            settings={settings}
            products={products}
            onNavigate={navigateTo}
            onBackToHome={handleGoBack}
            onQuickView={handleOpenProductDetail}
          />
        )}

        {currentView === 'profile' && (
          <ProfilePage
            profile={userProfile}
            onUpdateProfile={setUserProfile}
            loyaltyPoints={loyaltyPoints}
            pendingRedeemPoints={pendingRedeemPoints}
            onSetPendingRedeemPoints={setPendingRedeemPoints}
            loyaltyHistory={loyaltyHistory}
            orders={orders}
            wishlistCount={wishlistIds.length}
            cartCount={totalCartCount}
            onBackToHome={handleGoBack}
            onNavigateToOrders={() => navigateTo('track-order')}
            onNavigateToHome={() => navigateTo('home')}
            onOpenCart={() => setIsCartOpen(true)}
            settings={settings}
          />
        )}

        {currentView === 'white-label' && (
          <WhiteLabelStudioPage
            onBackToHome={handleGoBack}
            activeAppliedTenantId={activeWhiteLabelId}
            onApplyBrandingToStore={handleApplyWhiteLabelToStore}
            onResetStoreBranding={handleResetWhiteLabelStore}
          />
        )}

        {currentView === 'sitemap' && (
          <SitemapPage
            products={products}
            settings={settings}
            onNavigate={navigateTo}
            onSelectCategory={setActiveCategory}
            onQuickViewProduct={(product) => handleOpenProductDetail(product, 'images')}
            onBackToHome={handleGoBack}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
            onOpenSellerChat={() => {
              setChatAttachedProduct(null);
              setIsSellerChatOpen(true);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        onNavigate={navigateTo}
        onOpenMasterPrompt={() => setIsMasterPromptOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenSellerChat={() => {
          setChatAttachedProduct(null);
          setIsSellerChatOpen(true);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        initialMediaMode={selectedProductMediaMode}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddCustomCartItem}
        onOpenSellerChatWithProduct={(p) => openSellerChatWithProduct(p)}
        onAskAIAboutProduct={(p) => openAIWithProduct(p)}
        isCompared={selectedProduct ? compareIds.includes(selectedProduct.id) : false}
        onToggleCompare={handleToggleCompare}
        settings={settings}
        allProducts={products}
        browsingHistory={browsingHistory}
        orders={orders}
        cartItems={cartItems}
        onSelectRecommendedProduct={(recProd) => handleOpenProductDetail(recProd, 'images')}
        onQuickAddRecommendedToCart={handleQuickAddRecommendedToCart}
        priceAlert={
          selectedProduct
            ? priceAlerts.find((a) => a.productId === selectedProduct.id && a.isActive)
            : undefined
        }
        onTogglePriceAlert={handleTogglePriceAlert}
        onAddReview={handleAddProductReview}
      />

      {/* Product Comparison Modal */}
      <ProductCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        compareProducts={compareProducts}
        allProducts={products}
        onAddProductToCompare={handleAddToCompare}
        onRemoveFromCompare={handleRemoveFromCompare}
        onClearCompare={handleClearCompare}
        onAddToCart={handleAddToCart}
        onQuickView={handleOpenProductDetail}
        settings={settings}
      />

      {/* Cart Slide-Over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={(promoDiscount, loyaltyPointsUsed) => {
          setAppliedDiscount(promoDiscount);
          setCheckoutLoyaltyPointsToRedeem(loyaltyPointsUsed);
          setIsCheckoutOpen(true);
        }}
        loyaltyPoints={loyaltyPoints}
        pendingRedeemPoints={pendingRedeemPoints}
        onSetPendingRedeemPoints={setPendingRedeemPoints}
        settings={settings}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        discountAmount={appliedDiscount}
        loyaltyPoints={loyaltyPoints}
        initialLoyaltyPointsToRedeem={checkoutLoyaltyPointsToRedeem || pendingRedeemPoints}
        userProfile={userProfile}
        onOrderCompleted={handleOrderCompleted}
        onScheduleCheckoutReminder={handleScheduleCheckoutReminder}
        onCancelCheckoutReminder={handleCancelCheckoutReminder}
        settings={settings}
      />

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        products={products}
        onSelectProduct={(p) => handleOpenProductDetail(p, 'images')}
        onAddToCart={handleAddToCart}
      />

      {/* Live Seller Chat Modal */}
      <SellerChatModal
        isOpen={isSellerChatOpen}
        onClose={() => setIsSellerChatOpen(false)}
        attachedProduct={chatAttachedProduct}
        messages={sellerChatMessages}
        onSendMessage={handleSendSellerMessage}
      />

      {/* Admin Control Panel */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        onAddProduct={handleAddProduct}
        onUpdateProductStock={handleUpdateProductStock}
        onUpdateProductPrice={handleUpdateProductPrice}
        onUpdateProductVideo={handleUpdateProductVideo}
        onDeleteProduct={handleDeleteProduct}
        priceAlerts={priceAlerts}
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        returnRequests={returnRequests}
        onUpdateReturnStatus={handleUpdateReturnStatus}
        flashOffer={flashOffer}
        onSaveFlashOffer={setFlashOffer}
        stats={stats}
        settings={settings}
        onSaveSettings={(s) => setSettings(s)}
        onOpenWhiteLabelStudio={() => {
          setIsAdminOpen(false);
          navigateTo('white-label');
        }}
      />

      {/* Master Prompt Modal */}
      <MasterPromptModal
        isOpen={isMasterPromptOpen}
        onClose={() => setIsMasterPromptOpen(false)}
      />

      {/* Floating Compare Dock */}
      {!isCompareOpen && (
        <CompareBar
          products={compareProducts}
          onRemove={handleRemoveFromCompare}
          onClear={handleClearCompare}
          onOpenCompare={() => setIsCompareOpen(true)}
          limitWarning={compareLimitWarning}
          settings={settings}
        />
      )}

      {/* Wishlist Toast & Floating Button Widget */}
      <WishlistToast
        toast={wishlistToast}
        onCloseToast={() => setWishlistToast(null)}
        wishlistCount={wishlistIds.length}
        onNavigateToWishlist={() => navigateTo('wishlist')}
        currentView={currentView}
      />

      {/* Floating In-App Price Drop Notification Toast */}
      <PriceDropToast
        notification={activePriceDropToast}
        products={products}
        settings={settings}
        onDismiss={() => setActivePriceDropToast(null)}
        onOpenProduct={(p) => {
          if (activePriceDropToast) {
            handleMarkNotificationRead(activePriceDropToast.id);
          }
          handleOpenProductDetail(p, 'images');
        }}
      />

      {/* Floating Abandoned Checkout Push Notification Toast */}
      <CheckoutReminderToast
        notification={activeCheckoutReminderToast}
        settings={settings}
        onDismiss={() => setActiveCheckoutReminderToast(null)}
        onCompleteOrder={() =>
          handleCompleteOrderFromReminder(activeCheckoutReminderToast?.id)
        }
      />

      {/* Persistent Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={navigateTo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={totalCartCount}
        isCartOpen={isCartOpen}
        onOpenCart={() => setIsCartOpen(true)}
        wishlistCount={wishlistIds.length}
        compareCount={compareProducts.length}
        onOpenCompare={() => setIsCompareOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenSellerChat={() => {
          setChatAttachedProduct(null);
          setIsSellerChatOpen(true);
        }}
        orders={orders}
        returnRequestsCount={returnRequests.length}
        loyaltyPoints={loyaltyPoints}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        notifications={notifications}
        priceAlertsCount={priceAlerts.filter((a) => a.isActive).length}
        products={products}
        onOpenProduct={(p) => handleOpenProductDetail(p, 'images')}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Offline Mode Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
