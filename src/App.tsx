import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  CheckCircle2,
  SlidersHorizontal,
  Lock,
  Mic,
  MicOff,
  X,
  Box
} from 'lucide-react';
import { AdminCapabilitiesResponse, AuthUserRole, AuthUserSummary, isAdminRole, Product, CartItem, Order, Category, AdminStats, StoreSettings, SellerChatMessage, PageView, CurrencyCode, ThemeMode, ReturnRequest, ReturnRequestStatus, FlashOfferConfig, UserProfile, LoyaltyTransaction, WhiteLabelTenant, BrowsingHistoryEntry, PriceDropAlert, InAppNotification, WebAuthnCredentialRecord, WebAuthnSecuritySettings, WebAuthnSession, GiftVoucher, ServerSessionState, SecurityAuditEntry } from './types';
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
import { ProductARModal } from './components/ProductARModal';
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
import { GiftVouchersPage } from './components/pages/GiftVouchersPage';
import { BrandsPage } from './components/pages/BrandsPage';
import { AmazonSaPage } from './components/pages/AmazonSaPage';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { slugifyBrandName } from './utils/brands';
import {
  loadGiftVouchers,
  saveGiftVouchers,
  normalizeGiftVoucherCode,
} from './utils/giftVouchers';
import { applyBrandPaletteToDocument } from './utils/whiteLabel';
import { loadBrowsingHistory, saveBrowsingHistory, recordBrowsingView } from './utils/recommendations';
import {
  loadPriceAlerts,
  savePriceAlerts,
  loadNotifications,
  saveNotifications,
  monitorAllProductsForPriceAlerts,
  getOrCreatePriceAlertClientKey,
} from './utils/priceAlerts';
import { WishlistToast, WishlistToastState } from './components/WishlistToast';
import { PriceDropToast } from './components/PriceDropToast';
import { PriceAlertConfigModal } from './components/PriceAlertConfigModal';
import { CompareBar } from './components/CompareBar';
import { ProductCompareModal } from './components/ProductCompareModal';
import { FlashOfferBanner } from './components/FlashOfferBanner';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ProductFilterSidebar, BrandFacet } from './components/ProductFilterSidebar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CheckoutReminderToast } from './components/CheckoutReminderToast';
import { FloatingConciergeButton } from './components/FloatingConciergeButton';
import { ArabicSpeechLocale, useVoiceSearch } from './hooks/useVoiceSearch';
import { sendCheckoutReminderPushNotification } from './utils/checkoutReminder';
import { formatPrice } from './utils/currency';
import {
  authenticateWithBiometrics,
  detectWebAuthnSupport,
  loadWebAuthnCredentials,
  loadWebAuthnSession,
  loadWebAuthnSettings,
  mapWebAuthnErrorToArabic,
  registerBiometricPasskey,
  saveWebAuthnCredentials,
  saveWebAuthnSession,
  saveWebAuthnSettings,
} from './utils/webauthn';
import type { User } from 'firebase/auth';
import {
  resolveFirebaseUserRole,
  loadSecurityLogsFromFirestore,
  loadUserPrivateFromFirestore,
  loadWishlistFromFirestore,
  mapFirebaseAuthErrorToArabic,
  recordSecurityLogToFirestore,
  signInWithGoogleSecure,
  signOutFirebaseSecure,
  subscribeToFirebaseAuthState,
  syncUserProfileToFirestore,
  syncWishlistItemToFirestore,
  testFirestoreConnection,
} from './firebase';
import { AuthModal, AuthModalMode } from './components/AuthModal';
import {
  initGoogleAnalytics,
  trackAddToCart,
  trackBeginCheckout,
  trackCategoryView,
  trackProductView,
  trackPurchase,
  trackStorePageView,
  trackStoreSearch,
} from './utils/googleAnalytics';

function AppContent() {
  const { lang, isRtl, t } = useLanguage();

  // Navigation & Page State (with SEO deep-link support)
  const [initialGiftLookupCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('gift') ? normalizeGiftVoucherCode(params.get('gift') || '') : '';
    } catch {
      return '';
    }
  });
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const b = params.get('brand');
      return b ? slugifyBrandName(b) : null;
    } catch {
      return null;
    }
  });
  const [currentView, setCurrentView] = useState<PageView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('gift')) return 'gift-vouchers';
      if (params.get('brand') && !params.get('view')) return 'brands';
      const v = params.get('view') as PageView | null;
      const allowed: PageView[] = ['home', 'offers', 'brands', 'amazon-sa', 'gift-vouchers', 'track-order', 'faq', 'policies', 'about', 'wishlist', 'ads', 'profile', 'white-label', 'sitemap'];
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
  const [amazonProductsRegistry, setAmazonProductsRegistry] = useState<Product[]>([]);
  const allResolvableProducts = useMemo(
    () => [...products, ...amazonProductsRegistry],
    [products, amazonProductsRegistry]
  );
  const handleSyncAmazonProducts = useCallback((synced: Product[]) => {
    setAmazonProductsRegistry((prev) => {
      const map = new Map<string, Product>();
      for (const item of prev) map.set(item.id, item);
      for (const item of synced) map.set(item.id, item);
      return Array.from(map.values());
    });
  }, []);
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

  // Web Authentication API (Biometric Passkeys & High-Value Security)
  const [webAuthnCredentials, setWebAuthnCredentials] = useState<WebAuthnCredentialRecord[]>(() =>
    loadWebAuthnCredentials()
  );
  const [webAuthnSession, setWebAuthnSession] = useState<WebAuthnSession>(() =>
    loadWebAuthnSession()
  );
  const [webAuthnSettings, setWebAuthnSettings] = useState<WebAuthnSecuritySettings>(() =>
    loadWebAuthnSettings()
  );

  useEffect(() => {
    saveWebAuthnCredentials(webAuthnCredentials);
  }, [webAuthnCredentials]);

  useEffect(() => {
    saveWebAuthnSession(webAuthnSession);
  }, [webAuthnSession]);

  useEffect(() => {
    saveWebAuthnSettings(webAuthnSettings);
  }, [webAuthnSettings]);

  const handleRegisterWebAuthnCredential = (cred: WebAuthnCredentialRecord) => {
    setWebAuthnCredentials((prev) => [cred, ...prev.filter((c) => c.id !== cred.id)]);
  };

  const handleBiometricVerified = (credentialId: string, verifiedAt: string) => {
    setWebAuthnCredentials((prev) =>
      prev.map((c) => (c.id === credentialId ? { ...c, lastVerifiedAt: verifiedAt } : c))
    );
    setWebAuthnSession({
      authenticated: true,
      credentialId,
      verifiedAt,
      userName: userProfile.fullName,
    });
  };

  const handleRegisterWebAuthn = async () => {
    const newCred = await registerBiometricPasskey({
      userName: userProfile.email || 'customer@rawaj.store',
      displayName: userProfile.fullName || 'عميل متجر رواج',
    });
    handleRegisterWebAuthnCredential(newCred);
    handleBiometricVerified(newCred.id, newCred.createdAt);
  };

  const handleAuthenticateWebAuthn = async () => {
    const res = await authenticateWithBiometrics(webAuthnCredentials.map((c) => c.id));
    handleBiometricVerified(res.credentialId, res.verifiedAt);
  };

  const handleLogoutWebAuthn = () => {
    setWebAuthnSession({ authenticated: false });
  };

  const handleRemoveWebAuthnCredential = (id: string) => {
    setWebAuthnCredentials((prev) => prev.filter((c) => c.id !== id));
    if (webAuthnSession.credentialId === id) {
      setWebAuthnSession({ authenticated: false });
    }
  };

  const handleQuickBiometricSignIn = async (): Promise<{ ok: boolean; message: string }> => {
    try {
      await handleAuthenticateWebAuthn();
      return {
        ok: true,
        message: 'تم التحقق بالبصمة / الوجه وتسجيل دخولك بنجاح ✓',
      };
    } catch (err) {
      return {
        ok: false,
        message: mapWebAuthnErrorToArabic(err),
      };
    }
  };

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
  const catalogVoiceSearch = useVoiceSearch({
    onResult: (spokenQuery) => {
      setSearchQuery(spokenQuery);
    },
  });
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
  const [giftVouchers, setGiftVouchers] = useState<GiftVoucher[]>(() => loadGiftVouchers());
  const [appliedGiftVoucherCode, setAppliedGiftVoucherCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const giftParam = params.get('gift');
      return giftParam ? normalizeGiftVoucherCode(giftParam) : '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    saveGiftVouchers(giftVouchers);
  }, [giftVouchers]);

  const handlePurchaseGiftVoucher = (newVoucher: GiftVoucher) => {
    setGiftVouchers((prev) => [newVoucher, ...prev]);
  };

  const handleApplyGiftVoucherFromPage = (code: string) => {
    setAppliedGiftVoucherCode(normalizeGiftVoucherCode(code));
    setIsCartOpen(true);
  };

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rawaj-wishlist-ids');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('rawaj-wishlist-ids', JSON.stringify(wishlistIds));
    } catch {
      // Ignore storage errors
    }
  }, [wishlistIds]);
  const [wishlistToast, setWishlistToast] = useState<WishlistToastState | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareLimitWarning, setCompareLimitWarning] = useState(false);

  // Modals & Drawers Visibility
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductMediaMode, setSelectedProductMediaMode] = useState<'images' | 'video'>('images');
  const [arModalProduct, setArModalProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isSellerChatOpen, setIsSellerChatOpen] = useState(false);
  const [chatAttachedProduct, setChatAttachedProduct] = useState<Product | null>(null);
  const [sellerChatMessages, setSellerChatMessages] = useState<SellerChatMessage[]>(INITIAL_SELLER_CHAT);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMasterPromptOpen, setIsMasterPromptOpen] = useState(false);

  // Hardened Authentication & Session Security State
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [serverSession, setServerSession] = useState<ServerSessionState>({
    authenticated: false,
    pinEnabled: false,
    pinVerified: false,
    webauthnVerified: false,
  });
  const [securityLogs, setSecurityLogs] = useState<SecurityAuditEntry[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('account');
  const [pendingAdminTarget, setPendingAdminTarget] = useState<'dashboard' | 'white-label'>('dashboard');
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);

  const [adminCapabilities, setAdminCapabilities] = useState<AdminCapabilitiesResponse>({
    authenticated: false,
    role: 'customer',
    originalRole: 'customer',
    isAdmin: false,
    isPromoterAdmin: false,
    pinLocked: false,
    canAccessMasterPrompt: false,
    featureEnabled: true,
    canManageRoles: false,
    canRotateKeys: false,
  });

  const refreshAdminCapabilities = async () => {
    try {
      const res = await fetch('/api/admin/capabilities', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'X-Requested-With': 'RawajApp' },
      });
      if (res.ok) {
        const data = (await res.json()) as AdminCapabilitiesResponse;
        setAdminCapabilities(data);
        return;
      }
    } catch {
      // Ignore transient network errors
    }
  };

  const isPinLocked = Boolean(serverSession.pinEnabled && !serverSession.pinVerified);
  const isAdminUnlocked = Boolean(
    authUser &&
      isAdminRole(authUser.role) &&
      authUser.emailVerified &&
      serverSession.authenticated &&
      isAdminRole(serverSession.role) &&
      !isPinLocked
  );
  const canAccessMasterPrompt = Boolean(
    isAdminUnlocked &&
      adminCapabilities.isPromoterAdmin &&
      adminCapabilities.canAccessMasterPrompt
  );

  useEffect(() => {
    if (!isAdminUnlocked) {
      setIsAdminOpen(false);
      setIsMasterPromptOpen(false);
    }
  }, [isAdminUnlocked]);

  useEffect(() => {
    if (!canAccessMasterPrompt) {
      setIsMasterPromptOpen(false);
    }
  }, [canAccessMasterPrompt]);

  useEffect(() => {
    void testFirestoreConnection();
    detectWebAuthnSupport().then((info) => {
      setIsWebAuthnSupported(info.supported);
    });
  }, []);

  const refreshAuditLogs = async (user: User | null) => {
    const merged: SecurityAuditEntry[] = [];
    try {
      const srvRes = await fetch('/api/auth/audit-log');
      if (srvRes.ok) {
        const srvJson = await srvRes.json();
        if (Array.isArray(srvJson.entries)) {
          merged.push(...srvJson.entries);
        }
      }
    } catch {
      // Ignore network errors on audit fetch
    }
    if (user && user.emailVerified) {
      try {
        const fsLogs = await loadSecurityLogsFromFirestore(user);
        merged.push(...fsLogs);
      } catch {
        // Firestore errors are logged by handleFirestoreError
      }
    }
    merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setSecurityLogs(merged.slice(0, 20));
  };

  useEffect(() => {
    const unsubscribe = subscribeToFirebaseAuthState(async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setAuthUser(null);
        setServerSession({
          authenticated: false,
          pinEnabled: false,
          pinVerified: false,
          webauthnVerified: false,
        });
        setSecurityLogs([]);
        setIsAdminOpen(false);
        setAuthReady(true);
        return;
      }

      const resolvedRole = await resolveFirebaseUserRole(user);
      const summary: AuthUserSummary = {
        uid: user.uid,
        email: user.email || '',
        emailVerified: user.emailVerified,
        displayName: user.displayName || user.email?.split('@')[0] || 'عميل متجر رواج',
        photoURL: user.photoURL || undefined,
        role: resolvedRole,
        providerId: user.providerData[0]?.providerId || 'google.com',
      };
      setAuthUser(summary);

      // Sync verified HttpOnly server session
      try {
        const idToken = await user.getIdToken();
        const sessRes = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: summary.displayName,
            idToken,
          }),
        });
        if (sessRes.ok) {
          const sessData = (await sessRes.json()) as ServerSessionState;
          setServerSession(sessData);
          if (sessData.role) {
            setAuthUser((prev) => (prev ? { ...prev, role: sessData.role as AuthUserRole } : prev));
          }
        }
      } catch {
        // Ignore transient session sync failure
      }
      await refreshAdminCapabilities();

      // Sync profile & wishlist with Firestore when email is verified
      if (user.emailVerified) {
        try {
          const remoteProfile = await loadUserPrivateFromFirestore(user);
          const mergedProfile: UserProfile = {
            ...userProfile,
            ...(remoteProfile || {}),
            fullName:
              remoteProfile?.fullName ||
              (userProfile.fullName !== INITIAL_USER_PROFILE.fullName
                ? userProfile.fullName
                : summary.displayName),
            email: user.email || remoteProfile?.email || userProfile.email,
          };
          setUserProfile(mergedProfile);
          await syncUserProfileToFirestore(user, mergedProfile, {
            twoFactorEnabled: serverSession.pinEnabled,
            biometricEnabled: webAuthnCredentials.length > 0,
          });
        } catch {
          // Non-blocking profile sync
        }

        try {
          const remoteWishlist = await loadWishlistFromFirestore(user);
          if (remoteWishlist.length > 0) {
            setWishlistIds((prev) => Array.from(new Set([...prev, ...remoteWishlist])));
          }
        } catch {
          // Non-blocking wishlist sync
        }

        await refreshAuditLogs(user);
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignInFlow = async () => {
    try {
      const user = await signInWithGoogleSecure();
      if (user.emailVerified) {
        try {
          await recordSecurityLogToFirestore(user, 'google_signin', 'success');
        } catch {
          // Handled cleanly
        }
        await refreshAuditLogs(user);
      }
    } catch (err) {
      throw new Error(mapFirebaseAuthErrorToArabic(err));
    }
  };

  const handleSecureSignOut = async () => {
    const activeUser = firebaseUser;
    if (activeUser && activeUser.emailVerified) {
      try {
        await recordSecurityLogToFirestore(activeUser, 'signout', 'success');
      } catch {
        // Ignore audit failure during signout
      }
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    await signOutFirebaseSecure();
    setWebAuthnSession({ authenticated: false });
    setIsAdminOpen(false);
  };

  const handleSetupSecurityPin = async (
    pin: string
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch('/api/auth/pin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, message: data.error || 'تعذر حفظ رمز الأمان.' };
      }
      setServerSession((prev) => ({
        ...prev,
        pinEnabled: true,
        pinVerified: true,
      }));
      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          await syncUserProfileToFirestore(firebaseUser, userProfile, {
            twoFactorEnabled: true,
            biometricEnabled: webAuthnCredentials.length > 0,
          });
        } catch {
          // Ignore
        }
      }
      await refreshAuditLogs(firebaseUser);
      return { ok: true, message: data.message || 'تم تفعيل رمز الأمان بنجاح.' };
    } catch {
      return { ok: false, message: 'تعذر الاتصال بخادم الأمان.' };
    }
  };

  const handleVerifySecurityPin = async (
    pin: string
  ): Promise<{ ok: boolean; message: string; lockedUntil?: number }> => {
    try {
      const res = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (firebaseUser && firebaseUser.emailVerified) {
          try {
            await recordSecurityLogToFirestore(firebaseUser, 'pin_failed', 'blocked');
          } catch {
            // Ignore
          }
        }
        await refreshAuditLogs(firebaseUser);
        return {
          ok: false,
          message: data.error || 'رمز الأمان غير صحيح.',
          lockedUntil: data.lockedUntil,
        };
      }
      setServerSession((prev) => ({
        ...prev,
        pinEnabled: true,
        pinVerified: true,
        lockedUntil: undefined,
      }));
      await refreshAdminCapabilities();
      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          await recordSecurityLogToFirestore(firebaseUser, 'pin_verified', 'success');
        } catch {
          // Ignore
        }
      }
      await refreshAuditLogs(firebaseUser);
      return { ok: true, message: data.message || 'تم التحقق من رمز الأمان بنجاح.' };
    } catch {
      return { ok: false, message: 'تعذر الاتصال بخادم التحقق.' };
    }
  };

  const handleDisableSecurityPin = async (
    pin: string
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch('/api/auth/pin/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, message: data.error || 'تعذر تعطيل رمز الأمان.' };
      }
      setServerSession((prev) => ({
        ...prev,
        pinEnabled: false,
        pinVerified: true,
      }));
      await refreshAuditLogs(firebaseUser);
      return { ok: true, message: data.message || 'تم تعطيل رمز الأمان.' };
    } catch {
      return { ok: false, message: 'تعذر الاتصال بخادم الأمان.' };
    }
  };

  const handleRequestAdminAccess = (target: 'dashboard' | 'white-label' = 'dashboard') => {
    if (isAdminUnlocked) {
      if (firebaseUser && firebaseUser.emailVerified) {
        void recordSecurityLogToFirestore(firebaseUser, 'admin_access', 'success').catch(() => {});
      }
      if (target === 'white-label') {
        navigateTo('white-label');
      } else {
        setIsAdminOpen(true);
      }
      return;
    }
    setPendingAdminTarget(target);
    setAuthModalMode('admin-gate');
    setIsAuthModalOpen(true);
  };

  const [browsingHistory, setBrowsingHistory] = useState<BrowsingHistoryEntry[]>(() =>
    loadBrowsingHistory()
  );
  const [priceAlerts, setPriceAlerts] = useState<PriceDropAlert[]>(() => loadPriceAlerts());
  const [notifications, setNotifications] = useState<InAppNotification[]>(() =>
    loadNotifications()
  );
  const [activePriceDropToast, setActivePriceDropToast] = useState<InAppNotification | null>(null);
  const [priceAlertConfigProduct, setPriceAlertConfigProduct] = useState<Product | null>(null);
  const [activeCheckoutReminderToast, setActiveCheckoutReminderToast] =
    useState<InAppNotification | null>(null);
  const checkoutReminderTimerRef = useRef<number | null>(null);
  const priceAlertClientKeyRef = useRef<string>(getOrCreatePriceAlertClientKey());
  const priceAlertsRef = useRef<PriceDropAlert[]>(priceAlerts);
  const previousProductPricesRef = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    priceAlertsRef.current = priceAlerts;
    savePriceAlerts(priceAlerts);
  }, [priceAlerts]);

  useEffect(() => {
    saveBrowsingHistory(browsingHistory);
  }, [browsingHistory]);

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Hydrate any server-persisted price alerts cleanly on first mount
  useEffect(() => {
    let cancelled = false;
    const clientKey = priceAlertClientKeyRef.current;
    fetch(`/api/price-alerts?clientKey=${encodeURIComponent(clientKey)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { alerts?: PriceDropAlert[] } | null) => {
        if (cancelled || !data?.alerts || data.alerts.length === 0) return;
        setPriceAlerts((prev) => {
          const byProduct = new Map<string, PriceDropAlert>();
          for (const a of prev) byProduct.set(a.productId, a);
          for (const srv of data.alerts!) {
            if (!byProduct.has(srv.productId)) {
              byProduct.set(srv.productId, srv);
            }
          }
          return Array.from(byProduct.values());
        });
      })
      .catch(() => {
        // Offline / localStorage fallback remains active
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistPriceAlertToServer = (product: Product, targetPrice?: number) => {
    fetch('/api/price-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientKey: priceAlertClientKeyRef.current,
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || '',
        currentPrice: product.price,
        targetPrice,
      }),
    }).catch(() => {
      // Offline non-blocking persistence
    });
  };

  const handleSavePriceAlert = (product: Product, targetPrice?: number) => {
    setPriceAlerts((prev) => {
      const existing = prev.find((a) => a.productId === product.id);
      if (existing) {
        return prev.map((a) =>
          a.productId === product.id
            ? {
                ...a,
                productName: product.name,
                productImage: product.images[0] || a.productImage,
                subscribedPrice: product.price,
                targetPrice,
                lastTriggeredPrice: undefined,
                triggeredAt: undefined,
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
    persistPriceAlertToServer(product, targetPrice);
  };

  const handleTogglePriceAlert = (product: Product, targetPrice?: number) => {
    const existing = priceAlertsRef.current.find((a) => a.productId === product.id);
    if (existing && targetPrice === undefined) {
      handleRemovePriceAlert(product.id);
      return;
    }
    handleSavePriceAlert(product, targetPrice);
  };

  const handleRemovePriceAlert = (productId: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.productId !== productId));
    fetch(
      `/api/price-alerts/${encodeURIComponent(productId)}?clientKey=${encodeURIComponent(
        priceAlertClientKeyRef.current
      )}`,
      { method: 'DELETE' }
    ).catch(() => {
      // Ignore offline error
    });
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
    trackProductView(product);
    setSelectedProductMediaMode(mode);
    setSelectedProduct(product);
  };

  // Initialize Google Analytics 4 and track storefront page views
  useEffect(() => {
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    trackStorePageView(currentView, document.title);
  }, [currentView]);

  useEffect(() => {
    if (activeCategory !== 'all') {
      trackCategoryView(activeCategory);
    }
  }, [activeCategory]);

  useEffect(() => {
    const clean = searchQuery.trim();
    if (clean.length < 2) return;
    const timer = window.setTimeout(() => {
      trackStoreSearch(clean);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Support ?product=... deep-links from Sitemap / SEO URLs
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('product');
      if (productId) {
        const match = products.find((p) => p.id === productId);
        if (match) {
          setBrowsingHistory((prev) => recordBrowsingView(prev, match));
          trackProductView(match);
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
      brands: {
        title: lang === 'en' ? `Official Brands | ${settings.storeName}` : `الماركات الرسمية | ${settings.storeName}`,
        description:
          lang === 'en'
            ? 'Explore authorized brand storefronts, verified products, and official local warranty.'
            : 'تصفح متاجر العلامات التجارية الرسمية والمنتجات المعتمدة بضمان الوكيل.',
      },
      'amazon-sa': {
        title: lang === 'en' ? `Amazon Saudi Arabia | ${settings.storeName}` : `تسوق من أمازون السعودية | ${settings.storeName}`,
        description:
          lang === 'en'
            ? 'Browse and buy Amazon Saudi Arabia products directly inside Rawaj Store with live SAR pricing and unified checkout.'
            : 'تصفح واشترِ منتجات أمازون السعودية مباشرة داخل متجر رواج بأسعار محدثة ودفع موحد وآمن.',
      },
      'gift-vouchers': {
        title: `قسائم الهدايا الرقمية | ${settings.storeName}`,
        description: 'اشترِ قسيمة هدية رقمية وأرسلها لصديق عبر البريد الإلكتروني أو كود مخصص للاستخدام في السلة وعند الدفع.',
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

    trackAddToCart(product, 1, product.price);
    setIsCartOpen(true);
  };

  const handleAddCustomCartItem = (cartItem: CartItem) => {
    setCartItems((prev) => [...prev, cartItem]);
    trackAddToCart(
      cartItem.product,
      cartItem.quantity,
      (cartItem.product.price + (cartItem.selectedVariant?.priceOffset || 0)) * cartItem.quantity
    );
    setIsCartOpen(true);
  };

  const handleQuickAddRecommendedToCart = (product: Product) => {
    trackAddToCart(product, 1, product.price);
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
    trackPurchase(newOrder);
    handleCancelCheckoutReminder();
    setActiveCheckoutReminderToast(null);
    setNotifications((prev) => prev.filter((n) => n.type !== 'checkout_reminder'));
    setOrders((prev) => [newOrder, ...prev]);
    setCartItems([]);
    setAppliedDiscount(0);
    setAppliedGiftVoucherCode('');

    if (newOrder.giftVoucherCode && newOrder.giftVoucherDiscount && newOrder.giftVoucherDiscount > 0) {
      const usedCode = normalizeGiftVoucherCode(newOrder.giftVoucherCode);
      const usedAmount = newOrder.giftVoucherDiscount;
      const usedAt = new Date().toISOString();
      setGiftVouchers((prev) =>
        prev.map((v) => {
          if (normalizeGiftVoucherCode(v.code) !== usedCode) return v;
          const nextBalance = Math.max(0, Math.round((v.remainingBalanceSar - usedAmount) * 100) / 100);
          return {
            ...v,
            remainingBalanceSar: nextBalance,
            lastUsedAt: usedAt,
            status: nextBalance <= 0 ? 'redeemed' : 'partially_used',
          };
        })
      );
    }

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

  const stockLogDebounceRef = useRef<
    Map<string, { initialStock: number; productName: string; timer: number }>
  >(new Map());

  const dispatchAdminModificationLog = (payload: {
    category: 'price_change' | 'stock_update' | 'product_catalog' | 'settings_update';
    actionLabelAr: string;
    targetType: 'product' | 'store_settings';
    targetId: string;
    targetName: string;
    fieldLabelAr: string;
    previousValue: string;
    newValue: string;
    summaryAr: string;
  }) => {
    try {
      void fetch('/api/admin/modification-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Never block admin UI on telemetry failure
    }
  };

  // Admin Actions (Strictly gated by verified Admin RBAC)
  const handleAddProduct = (newProd: Product) => {
    if (!isAdminUnlocked) return;
    setProducts((prev) => [newProd, ...prev]);
    dispatchAdminModificationLog({
      category: 'product_catalog',
      actionLabelAr: 'إضافة منتج جديد',
      targetType: 'product',
      targetId: newProd.id,
      targetName: newProd.name,
      fieldLabelAr: 'السعر والمخزون',
      previousValue: 'غير موجود',
      newValue: `${newProd.price.toLocaleString()} ر.س (${newProd.stock} قطعة)`,
      summaryAr: `إضافة منتج جديد إلى الكتالوج: ${newProd.name}`,
    });
  };

  const handleUpdateProductStock = (id: string, newStock: number) => {
    if (!isAdminUnlocked) return;
    const cleanStock = Math.max(0, Math.round(newStock));
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const existingPending = stockLogDebounceRef.current.get(id);
    const initialStock = existingPending ? existingPending.initialStock : targetProduct.stock;
    if (existingPending) {
      window.clearTimeout(existingPending.timer);
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: cleanStock } : p))
    );

    if (initialStock !== cleanStock) {
      const timer = window.setTimeout(() => {
        stockLogDebounceRef.current.delete(id);
        dispatchAdminModificationLog({
          category: 'stock_update',
          actionLabelAr: 'تحديث كمية المخزون',
          targetType: 'product',
          targetId: id,
          targetName: targetProduct.name,
          fieldLabelAr: 'الكمية المتوفرة',
          previousValue: `${initialStock} قطعة`,
          newValue: `${cleanStock} قطعة`,
          summaryAr: `تعديل مخزون "${targetProduct.name}" من ${initialStock} إلى ${cleanStock} قطعة`,
        });
      }, 650);
      stockLogDebounceRef.current.set(id, {
        initialStock,
        productName: targetProduct.name,
        timer,
      });
    }
  };

  const handleUpdateProductPrice = (id: string, newPrice: number) => {
    if (!isAdminUnlocked) return;
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

    if (oldPrice !== cleanPrice) {
      dispatchAdminModificationLog({
        category: 'price_change',
        actionLabelAr: isDrop ? 'تخفيض سعر منتج' : 'تعديل سعر منتج',
        targetType: 'product',
        targetId: id,
        targetName: targetProduct.name,
        fieldLabelAr: 'السعر',
        previousValue: `${oldPrice.toLocaleString()} ر.س`,
        newValue: `${cleanPrice.toLocaleString()} ر.س`,
        summaryAr: `${isDrop ? 'تخفيض' : 'تحديث'} سعر "${targetProduct.name}" من ${oldPrice.toLocaleString()} إلى ${cleanPrice.toLocaleString()} ر.س`,
      });
    }

    // Automatic price drop monitoring effect below handles alert notifications cleanly whenever catalog prices change.
  };

  // Automatic real-time catalog watcher: evaluates all active Target Price Alerts on any price drop
  useEffect(() => {
    const prevPrices = previousProductPricesRef.current;
    const nextPriceMap: Record<string, number> = {};
    for (const prod of products) {
      nextPriceMap[prod.id] = prod.price;
    }

    if (prevPrices === null) {
      previousProductPricesRef.current = nextPriceMap;
      return;
    }

    const activeAlerts = priceAlertsRef.current;
    if (activeAlerts.length > 0) {
      const { triggeredNotifications, updatedAlerts } = monitorAllProductsForPriceAlerts(
        products,
        prevPrices,
        activeAlerts
      );
      if (triggeredNotifications.length > 0) {
        setPriceAlerts(updatedAlerts);
        setNotifications((prev) => [...triggeredNotifications, ...prev]);
        const latest = triggeredNotifications[0];
        setActivePriceDropToast(latest);
        window.setTimeout(() => {
          setActivePriceDropToast((curr) => (curr?.id === latest.id ? null : curr));
        }, 9000);

        fetch('/api/price-alerts/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientKey: priceAlertClientKeyRef.current,
            products,
            previousPrices: prevPrices,
          }),
        }).catch(() => {
          // Non-blocking backend sync
        });
      }
    }

    previousProductPricesRef.current = nextPriceMap;
  }, [products]);

  const handleUpdateProductVideo = (id: string, videoUrl: string, videoTitle?: string) => {
    if (!isAdminUnlocked) return;
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
    if (!isAdminUnlocked) return;
    const targetProduct = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (targetProduct) {
      dispatchAdminModificationLog({
        category: 'product_catalog',
        actionLabelAr: 'حذف منتج من الكتالوج',
        targetType: 'product',
        targetId: id,
        targetName: targetProduct.name,
        fieldLabelAr: 'الحالة',
        previousValue: 'نشط في الكتالوج',
        newValue: 'محذوف',
        summaryAr: `حذف المنتج "${targetProduct.name}" من الكتالوج`,
      });
    }
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    if (!isAdminUnlocked) return;
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
    if (!isAdminUnlocked) return;
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
    const targetProduct = allResolvableProducts.find((p) => p.id === productId);
    const isAlreadyWishlisted = wishlistIds.includes(productId);
    setWishlistIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
    if (firebaseUser && firebaseUser.emailVerified) {
      void syncWishlistItemToFirestore(
        firebaseUser,
        productId,
        isAlreadyWishlisted ? 'remove' : 'add'
      ).catch(() => {
        // Error details captured via handleFirestoreError
      });
    }
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
    .map((id) => allResolvableProducts.find((p) => p.id === id))
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
    if (view === 'white-label' && !isAdminUnlocked) {
      setPendingAdminTarget('white-label');
      setAuthModalMode('admin-gate');
      setIsAuthModalOpen(true);
    }
    if (view !== currentView) {
      setViewHistory((prev) => [...prev, currentView]);
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenBrandStorefront = (brandSlug: string) => {
    setSelectedBrandSlug(brandSlug);
    navigateTo('brands');
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
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => handleRequestAdminAccess('dashboard')}
        settings={settings}
        loyaltyPoints={loyaltyPoints}
        notifications={notifications}
        priceAlerts={priceAlerts}
        products={products}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onClearNotifications={handleClearNotifications}
        onRemovePriceAlert={handleRemovePriceAlert}
        onEditPriceAlert={(p) => setPriceAlertConfigProduct(p)}
        onOpenProduct={(p) => handleOpenProductDetail(p, 'images')}
        authUser={authUser}
        isPinLocked={isPinLocked}
        isAdminUnlocked={isAdminUnlocked}
        onOpenAuth={() => {
          setAuthModalMode('account');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 sm:space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
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
                    <span>{t.heroBadge}</span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                    {t.heroTitleLine1} <br />
                    <span className="bg-gradient-to-r from-brand-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                      {t.heroTitleLine2}
                    </span>
                  </h2>

                  <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                    {t.heroSubtitle}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => setIsAIAssistantOpen(true)}
                      className="bg-[#551465] hover:bg-brand-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#551465]/30 transition transform active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-brand-200" />
                      <span>{t.heroCta}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrandSlug(null);
                        navigateTo('brands');
                      }}
                      className="bg-slate-900/90 hover:bg-slate-800 text-slate-100 border border-slate-700 font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition"
                    >
                      <Award className="w-4 h-4 text-amber-300" />
                      <span>{t.navBrands}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setArModalProduct(products.find((p) => p.id === 'prod-9') || products[0] || null)
                      }
                      className="bg-slate-900/90 hover:bg-[#551465]/40 text-brand-200 hover:text-white border border-brand-500/40 font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition shadow-md"
                    >
                      <Box className="w-4 h-4 text-brand-300" />
                      <span>{isRtl ? 'جرب الأثاث والإلكترونيات بـ AR' : 'Try AR Room Studio'}</span>
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
                    <span>{t.catalogTitle}</span>
                    <span className="text-xs bg-slate-800 text-brand-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-bold tabular-nums">
                      {filteredProducts.length} {t.catalogProductUnit}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">{t.catalogSubtitle}</p>
                </div>

                <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                  {/* Catalog Search Bar (Primary Desktop Search + Voice Search) */}
                  <div className="hidden md:block relative w-64 lg:w-72">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      aria-label={t.searchPlaceholder}
                      className={`w-full min-h-[38px] bg-slate-900 text-white placeholder-slate-400 rounded-xl py-1.5 text-xs border border-slate-700 focus:outline-none focus:border-[#551465] focus:ring-2 focus:ring-[#551465]/30 transition ${
                        isRtl ? 'pr-9 pl-16' : 'pl-9 pr-16'
                      }`}
                    />
                    <Search className={`w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none ${isRtl ? 'right-3' : 'left-3'}`} />
                    <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${isRtl ? 'left-1.5' : 'right-1.5'}`}>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="مسح البحث"
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={catalogVoiceSearch.toggleListening}
                        aria-pressed={catalogVoiceSearch.isListening}
                        aria-label="البحث الصوتي باللغة العربية"
                        title={
                          catalogVoiceSearch.isListening
                            ? 'إيقاف الاستماع الصوتي'
                            : 'البحث بالأوامر الصوتية (العربية)'
                        }
                        className={`p-1.5 rounded-lg border transition ${
                          catalogVoiceSearch.isListening
                            ? 'bg-rose-600 text-white border-rose-400'
                            : 'bg-slate-950 hover:bg-slate-800 text-brand-300 border-slate-700'
                        }`}
                      >
                        {catalogVoiceSearch.isListening ? (
                          <MicOff className="w-3.5 h-3.5" />
                        ) : (
                          <Mic className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {(catalogVoiceSearch.isListening || catalogVoiceSearch.error) && (
                      <div
                        role="status"
                        className="absolute top-full inset-x-0 mt-1.5 z-40 bg-slate-900 border border-[#551465]/60 rounded-xl p-2.5 shadow-2xl text-[11px] space-y-1.5"
                      >
                        {catalogVoiceSearch.isListening ? (
                          <>
                            <span className="font-bold text-white block truncate">
                              {catalogVoiceSearch.interimTranscript
                                ? `«${catalogVoiceSearch.interimTranscript}»`
                                : 'جاري الاستماع بالعربية...'}
                            </span>
                            <div className="flex items-center gap-1">
                              {([
                                { id: 'ar-SA', label: 'العربية' },
                                { id: 'ar-YE', label: 'اليمن' },
                                { id: 'ar-EG', label: 'مصر' },
                              ] as { id: ArabicSpeechLocale; label: string }[]).map((loc) => (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => catalogVoiceSearch.setLang(loc.id)}
                                  className={`px-2 py-0.5 rounded-md font-bold border transition ${
                                    catalogVoiceSearch.lang === loc.id
                                      ? 'bg-[#551465] text-white border-brand-400/50'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {loc.label}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-rose-300 font-bold">
                            <span>{catalogVoiceSearch.error}</span>
                            <button
                              type="button"
                              onClick={catalogVoiceSearch.clearError}
                              aria-label="إغلاق التنبيه"
                              className="p-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mobile & Tablet Filter Drawer Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="lg:hidden flex-1 sm:flex-initial min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-brand-300" />
                    <span>{t.advancedFilter}</span>
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
                    aria-label={t.sortDefault}
                    className="flex-1 sm:flex-initial min-h-[38px] bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#551465]"
                  >
                    <option value="default">{t.sortDefault}</option>
                    <option value="price-asc">{t.sortPriceAsc}</option>
                    <option value="price-desc">{t.sortPriceDesc}</option>
                    <option value="rating-desc">{t.sortRatingDesc}</option>
                  </select>

                  {searchQuery && (
                    <div className="md:hidden flex items-center gap-2 text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">بحث:</span>
                      <strong className="text-brand-300">"{searchQuery}"</strong>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-slate-500 hover:text-white mr-1"
                        aria-label="مسح البحث"
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
                          onSelectBrand={handleOpenBrandStorefront}
                          onTryAR={(p) => setArModalProduct(p)}
                          activePriceAlert={priceAlerts.find(
                            (a) => a.isActive && a.productId === product.id
                          )}
                          onConfigurePriceAlert={(p) => setPriceAlertConfigProduct(p)}
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
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            priceAlerts={priceAlerts}
            onConfigurePriceAlert={(p) => setPriceAlertConfigProduct(p)}
            settings={settings}
          />
        )}

        {currentView === 'brands' && (
          <BrandsPage
            products={products}
            selectedBrandSlug={selectedBrandSlug}
            onSelectBrandSlug={setSelectedBrandSlug}
            onQuickView={handleOpenProductDetail}
            onAddToCart={handleAddToCart}
            onAskAI={(p) => openAIWithProduct(p)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            onAddReview={handleAddProductReview}
            defaultReviewerName={authUser?.displayName || userProfile.fullName}
            onTryAR={(p) => setArModalProduct(p)}
            priceAlerts={priceAlerts}
            onConfigurePriceAlert={(p) => setPriceAlertConfigProduct(p)}
            onBackToHome={handleGoBack}
            settings={settings}
          />
        )}

        {currentView === 'amazon-sa' && (
          <AmazonSaPage
            settings={settings}
            onAddToCart={(product) => {
              handleSyncAmazonProducts([product]);
              handleAddToCart(product);
            }}
            onBuyNow={(product) => {
              handleSyncAmazonProducts([product]);
              handleAddToCart(product);
              setIsCartOpen(true);
            }}
            onQuickView={(product, mode) => {
              handleSyncAmazonProducts([product]);
              handleOpenProductDetail(product, mode);
            }}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            compareIds={compareIds}
            onToggleCompare={handleToggleCompare}
            onCatalogItemsSynced={handleSyncAmazonProducts}
            onBackToHome={handleGoBack}
          />
        )}

        {currentView === 'gift-vouchers' && (
          <GiftVouchersPage
            vouchers={giftVouchers}
            settings={settings}
            userProfile={userProfile}
            initialLookupCode={initialGiftLookupCode}
            onPurchaseVoucher={handlePurchaseGiftVoucher}
            onApplyVoucherToCart={handleApplyGiftVoucherFromPage}
            onBackToHome={handleGoBack}
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
            products={allResolvableProducts}
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
            webAuthnCredentials={webAuthnCredentials}
            webAuthnSession={webAuthnSession}
            webAuthnSettings={webAuthnSettings}
            onRegisterWebAuthn={handleRegisterWebAuthn}
            onAuthenticateWebAuthn={handleAuthenticateWebAuthn}
            onLogoutWebAuthn={handleLogoutWebAuthn}
            onRemoveWebAuthnCredential={handleRemoveWebAuthnCredential}
            onUpdateWebAuthnSettings={setWebAuthnSettings}
            authUser={authUser}
            serverSession={serverSession}
            onOpenAuth={() => {
              setAuthModalMode('account');
              setIsAuthModalOpen(true);
            }}
            onSignOut={handleSecureSignOut}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onChangeCurrency={handleChangeCurrency}
            compareCount={compareProducts.length}
            onOpenCompare={() => setIsCompareOpen(true)}
            onNavigateToWishlist={() => navigateTo('wishlist')}
            onOpenAdmin={() => handleRequestAdminAccess('dashboard')}
          />
        )}

        {currentView === 'white-label' &&
          (isAdminUnlocked ? (
            <WhiteLabelStudioPage
              onBackToHome={handleGoBack}
              activeAppliedTenantId={activeWhiteLabelId}
              onApplyBrandingToStore={handleApplyWhiteLabelToStore}
              onResetStoreBranding={handleResetWhiteLabelStore}
            />
          ) : (
            <section className="max-w-xl mx-auto my-8 bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-white">صفحة الإدارة مقفلة</h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {!authReady
                    ? 'جاري التحقق من جلسة المسؤول وصلاحيات الوصول...'
                    : !authUser
                    ? 'الوصول إلى استوديو الإدارة وتخصيص التطبيق يتطلب تسجيل الدخول بحساب المسؤول المعتمد.'
                    : !isAdminRole(authUser.role)
                    ? 'حسابك الحالي مسجل كعميل ولا يملك صلاحيات المسؤول للوصول إلى هذه الصفحة.'
                    : isPinLocked
                    ? 'الجلسة الإدارية مقفلة برمز التحقق الثنائي (2FA PIN). يرجى تأكيد الرمز لفتح الصفحة.'
                    : 'يجب إتمام التحقق الأمني للجلسة الإدارية قبل فتح هذه الصفحة.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                {authReady && (
                  <button
                    type="button"
                    onClick={() => handleRequestAdminAccess('white-label')}
                    className="px-5 py-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-[#551465]/30"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>{isPinLocked ? 'فتح القفل برمز 2FA' : 'تسجيل دخول المسؤول'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                >
                  العودة إلى المتجر
                </button>
              </div>
            </section>
          ))}

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
            isAdminUnlocked={isAdminUnlocked}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        onNavigate={navigateTo}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenSellerChat={() => {
          setChatAttachedProduct(null);
          setIsSellerChatOpen(true);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isAdminUnlocked={isAdminUnlocked}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        initialMediaMode={selectedProductMediaMode}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddCustomCartItem}
        onOpenSellerChatWithProduct={(p) => openSellerChatWithProduct(p)}
        onAskAIAboutProduct={(p) => openAIWithProduct(p)}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
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

      {/* Global Camera AR Product Try-On Studio Modal */}
      <ProductARModal
        isOpen={Boolean(arModalProduct)}
        product={arModalProduct}
        allProducts={products}
        onClose={() => setArModalProduct(null)}
        onAddToCart={(prod, variant) => {
          if (variant) {
            handleAddCustomCartItem({
              product: prod,
              selectedVariant: variant,
              quantity: 1,
            });
          } else {
            handleAddToCart(prod);
          }
          setArModalProduct(null);
        }}
        settings={settings}
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
        onProceedToCheckout={(promoDiscount, loyaltyPointsUsed, _loyaltyDisc, giftVoucherCode) => {
          setAppliedDiscount(promoDiscount);
          setCheckoutLoyaltyPointsToRedeem(loyaltyPointsUsed);
          if (giftVoucherCode !== undefined) {
            setAppliedGiftVoucherCode(giftVoucherCode);
          }
          const cartValueSar = cartItems.reduce(
            (sum, i) => sum + (i.product.price + (i.selectedVariant?.priceOffset || 0)) * i.quantity,
            0
          );
          trackBeginCheckout(totalCartCount, Math.max(0, cartValueSar - promoDiscount));
          setIsCheckoutOpen(true);
        }}
        loyaltyPoints={loyaltyPoints}
        pendingRedeemPoints={pendingRedeemPoints}
        onSetPendingRedeemPoints={setPendingRedeemPoints}
        giftVouchers={giftVouchers}
        appliedGiftVoucherCode={appliedGiftVoucherCode}
        onApplyGiftVoucherCode={setAppliedGiftVoucherCode}
        onNavigateToGiftVouchers={() => navigateTo('gift-vouchers')}
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
        webAuthnCredentials={webAuthnCredentials}
        webAuthnSettings={webAuthnSettings}
        onRegisterWebAuthnCredential={handleRegisterWebAuthnCredential}
        onBiometricVerified={handleBiometricVerified}
        giftVouchers={giftVouchers}
        initialGiftVoucherCode={appliedGiftVoucherCode}
        onGiftVoucherCodeChange={setAppliedGiftVoucherCode}
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

      {/* Admin Control Panel (Strict Dual-Verified RBAC Protected) */}
      <AdminDashboard
        isOpen={isAdminOpen && isAdminUnlocked}
        isAuthorized={isAdminUnlocked}
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
        onSaveFlashOffer={(updated) => {
          if (isAdminUnlocked) setFlashOffer(updated);
        }}
        stats={stats}
        settings={settings}
        onSaveSettings={(s) => {
          if (!isAdminUnlocked) return;
          const prevRate = settings.yerExchangeRate;
          const prevCurr = settings.activeCurrency;
          setSettings(s);
          dispatchAdminModificationLog({
            category: 'settings_update',
            actionLabelAr: 'تحديث إعدادات المتجر',
            targetType: 'store_settings',
            targetId: 'store-general-settings',
            targetName: s.storeName || 'إعدادات المتجر العامة',
            fieldLabelAr: 'العملة وسعر الصرف',
            previousValue: `${prevCurr} (${prevRate} ر.ي)`,
            newValue: `${s.activeCurrency} (${s.yerExchangeRate} ر.ي)`,
            summaryAr: `تحديث إعدادات المتجر (${s.storeName}) والعملة الافتراضية إلى ${s.activeCurrency}`,
          });
        }}
        onOpenWhiteLabelStudio={() => {
          if (!isAdminUnlocked) return;
          setIsAdminOpen(false);
          navigateTo('white-label');
        }}
        onOpenMasterPrompt={() => {
          if (isAdminUnlocked && canAccessMasterPrompt) setIsMasterPromptOpen(true);
        }}
        authUserEmail={authUser?.email}
        adminRole={adminCapabilities.role}
        originalAdminRole={adminCapabilities.originalRole}
        canAccessMasterPrompt={canAccessMasterPrompt}
        masterPromptFeatureEnabled={adminCapabilities.featureEnabled}
        onCapabilitiesChanged={refreshAdminCapabilities}
        onSwitchRolePreview={async (targetRole) => {
          try {
            const res = await fetch('/api/admin/roles/switch-preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetRole }),
            });
            if (res.ok) {
              const data = await res.json();
              setServerSession((prev) => ({
                ...prev,
                role: data.role,
                originalRole: data.originalRole,
                canAccessMasterPrompt: data.canAccessMasterPrompt,
                masterPromptFeatureEnabled: data.featureEnabled,
              }));
              setAuthUser((prev) => (prev ? { ...prev, role: data.role } : prev));
              await refreshAdminCapabilities();
            }
          } catch {
            // Ignore network error
          }
        }}
        onLockAdmin={() => {
          void handleSecureSignOut();
        }}
      />

      {/* Secure Login, 2FA PIN & Admin RBAC Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        authReady={authReady}
        authUser={authUser}
        serverSession={serverSession}
        securityLogs={securityLogs}
        hasWebAuthnPasskey={webAuthnCredentials.length > 0}
        isWebAuthnSupported={isWebAuthnSupported}
        onGoogleSignIn={handleGoogleSignInFlow}
        onSignOut={handleSecureSignOut}
        onSetupPin={handleSetupSecurityPin}
        onVerifyPin={handleVerifySecurityPin}
        onDisablePin={handleDisableSecurityPin}
        onVerifyBiometrics={async () => {
          const res = await handleQuickBiometricSignIn();
          if (res.ok) {
            setServerSession((prev) => ({
              ...prev,
              webauthnVerified: true,
              pinVerified: true,
            }));
            await refreshAdminCapabilities();
            if (firebaseUser && firebaseUser.emailVerified) {
              void recordSecurityLogToFirestore(firebaseUser, 'webauthn_verified', 'success').catch(
                () => {}
              );
            }
            await refreshAuditLogs(firebaseUser);
          }
          return res;
        }}
        onEnterAdminAfterUnlock={() => {
          setIsAuthModalOpen(false);
          if (pendingAdminTarget === 'white-label') {
            setPendingAdminTarget('dashboard');
            navigateTo('white-label');
          } else {
            setIsAdminOpen(true);
          }
        }}
        onNavigateToProfileSecurity={() => navigateTo('profile')}
      />

      {/* Master Prompt Modal (Promoter Admin Only — Verified by Server RBAC) */}
      <MasterPromptModal
        isOpen={isMasterPromptOpen && isAdminUnlocked && canAccessMasterPrompt}
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

      {/* Quick Target Price Drop Alert Configurator Modal */}
      <PriceAlertConfigModal
        isOpen={Boolean(priceAlertConfigProduct)}
        product={priceAlertConfigProduct}
        existingAlert={
          priceAlertConfigProduct
            ? priceAlerts.find((a) => a.isActive && a.productId === priceAlertConfigProduct.id)
            : undefined
        }
        settings={settings}
        onClose={() => setPriceAlertConfigProduct(null)}
        onSaveAlert={handleSavePriceAlert}
        onRemoveAlert={handleRemovePriceAlert}
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

      {/* Unified Floating AI Assistant & Live Seller Chat Button */}
      <FloatingConciergeButton
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenSellerChat={() => {
          setChatAttachedProduct(null);
          setIsSellerChatOpen(true);
        }}
        hasCompareBar={compareProducts.length > 0 && !isCompareOpen}
        hidden={isAIAssistantOpen || isSellerChatOpen || isCartOpen || isCheckoutOpen || isAdminOpen}
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
        isBiometricAuthenticated={webAuthnSession.authenticated}
        hasWebAuthnPasskey={webAuthnCredentials.length > 0}
        onQuickBiometricSignIn={handleQuickBiometricSignIn}
        authUser={authUser}
        isPinLocked={isPinLocked}
        isAdminUnlocked={isAdminUnlocked}
        onOpenAuth={() => {
          setAuthModalMode('account');
          setIsAuthModalOpen(true);
        }}
        activeCurrency={settings.activeCurrency}
        onChangeCurrency={handleChangeCurrency}
        onOpenAdmin={() => handleRequestAdminAccess('dashboard')}
      />

      {/* Offline Mode Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
