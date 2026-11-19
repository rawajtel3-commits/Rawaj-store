import { AppLanguage, Category, Product } from '../types';

export const LANGUAGE_STORAGE_KEY = 'rawaj-lang';

export function getStoredLanguage(): AppLanguage {
  try {
    if (typeof window === 'undefined') return 'ar';
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === 'en' || saved === 'ar' ? saved : 'ar';
  } catch {
    return 'ar';
  }
}

export function applyDocumentLanguage(lang: AppLanguage): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  } catch {
    // Ignore storage failures
  }
}

export function translateCategory(category: Category, lang: AppLanguage): string {
  if (lang === 'ar') {
    switch (category) {
      case 'all':
        return 'جميع المنتجات';
      case 'electronics':
        return 'حواسيب وإلكترونيات';
      case 'accessories':
        return 'ساعات وإكسسوارات';
      case 'gaming':
        return 'عالم الألعاب';
      case 'home':
        return 'المنزل والأثاث الذكي';
      case 'fashion':
        return 'أزياء ومستلزمات';
      default:
        return category;
    }
  }
  switch (category) {
    case 'all':
      return 'All Products';
    case 'electronics':
      return 'Computers & Electronics';
    case 'accessories':
      return 'Watches & Accessories';
    case 'gaming':
      return 'Gaming World';
    case 'home':
      return 'Smart Home & Furniture';
    case 'fashion':
      return 'Fashion & Gear';
    default:
      return category;
  }
}

export function getLocalizedProductName(product: Product, lang: AppLanguage): string {
  if (lang === 'en' && product.nameEn?.trim()) {
    return product.nameEn.trim();
  }
  return product.name;
}

export const TRANSLATIONS = {
  ar: {
    storeBrandFallback: 'متجر رواج',
    storeTaglineFallback: 'Rawaj Store',
    promoDiscountPrefix: '✨ خصم 10% مع الكود:',
    freeShippingBanner: 'توصيل مجاني للطلبات فوق',
    warrantyBanner: 'ضمان وكيل محلي لمدة سنتين',
    categoriesLabel: 'التصنيفات:',
    cart: 'السلة',
    secureLogin: 'دخول آمن',
    navHome: 'الرئيسية',
    navOffers: 'العروض والخصومات',
    navBrands: 'الماركات الرسمية',
    navAmazonSa: 'أمازون السعودية',
    navGiftVouchers: 'قسائم الهدايا',
    navTrackOrder: 'تتبع الطلبات',
    navProfile: 'حسابي ونقاطي',
    navFaq: 'الأسئلة الشائعة',
    navPolicies: 'السياسات والضمان',
    navAbout: 'عن المتجر والتوثيق',
    navWhiteLabel: 'تطبيق باسمك وشعارك',
    navAds: 'الإعلانات المدفوعة',
    navSitemap: 'خريطة الموقع',
    badgeOffers: 'تخفيضات',
    badgeBrands: 'متاجر',
    badgeAmazonSa: 'سريع',
    badgeGift: 'هدية',
    badgePoints: 'نقطة',
    badgeAdmin: 'إدارة',
    badgeAds: 'إعلن معنا',
    bottomHome: 'الرئيسية',
    bottomSearch: 'بحث',
    bottomCart: 'السلة',
    bottomAccount: 'حسابي',
    languageLabel: 'لغة المتجر',
    languageArabic: 'العربية (RTL)',
    languageEnglish: 'English (LTR)',
    catalogTitle: 'معرض المنتجات المتاحة',
    catalogSubtitle: 'تصفح المواصفات، فلتر حسب السعر والماركة والتقييم، واطلب التخصيص الفوري',
    catalogProductUnit: 'منتج',
    searchPlaceholder: 'ابحث عن منتج أو مواصفات...',
    sortDefault: 'الترتيب: الافتراضي',
    sortPriceAsc: 'السعر: من الأقل للأعلى',
    sortPriceDesc: 'السعر: من الأعلى للأقل',
    sortRatingDesc: 'التقييم: الأعلى تقييماً',
    advancedFilter: 'تصفية متقدمة',
    heroBadge: 'أهلاً بكم في متجر رواج الإلكتروني الذكي المدعوم بـ Gemini AI',
    heroTitleLine1: 'تسوق أحدث المنتجات الذكية مع',
    heroTitleLine2: 'مساعد الشراء الذكي والدردشة المباشرة',
    heroSubtitle:
      'اكتشف تجربة تسوق متطورة: مواصفات تفصيلية، خيارات تخصيص ونقش مجاني، أنظمة دفع آمنة، ومساعد ذكي يختار الأنسب لميزانيتك.',
    heroCta: 'تحدث مع المساعد الذكي الآن',
    addToCartShort: 'سلة',
    outOfStock: 'نفذت الكمية',
    inStockPrefix: 'متوفر',
    lowStockPrefix: 'كمية محدودة',
    quickView: 'عرض المواصفات',
    aiAnalyze: 'تحليل AI',
    vatIncluded: 'شامل ضريبة القيمة المضافة',
    inWishlist: 'في المفضلة',
    addWishlist: 'إضافة للمفضلة',
    compare: 'مقارنة',
    back: 'رجوع',
    preferencesTitle: 'تفضيلات العرض والأدوات السريعة',
    preferencesDesc:
      'تحكم في لغة المتجر، العملة، المظهر (الداكن/الفاتح)، مقارنة المنتجات، وقائمة المفضلة من مكان واحد.',
    tryAr: 'معاينة AR',
  },
  en: {
    storeBrandFallback: 'Rawaj Store',
    storeTaglineFallback: 'Smart Electronics',
    promoDiscountPrefix: '✨ 10% OFF with code:',
    freeShippingBanner: 'Free shipping on orders over',
    warrantyBanner: '2-Year Authorized Local Warranty',
    categoriesLabel: 'Categories:',
    cart: 'Bag',
    secureLogin: 'Secure Login',
    navHome: 'Home',
    navOffers: 'Offers & Deals',
    navBrands: 'Official Brands',
    navAmazonSa: 'Amazon.sa',
    navGiftVouchers: 'Gift Vouchers',
    navTrackOrder: 'Track Orders',
    navProfile: 'Account & Points',
    navFaq: 'FAQ',
    navPolicies: 'Policies & Warranty',
    navAbout: 'About Store',
    navWhiteLabel: 'White-Label Studio',
    navAds: 'Sponsored Ads',
    navSitemap: 'Sitemap',
    badgeOffers: 'Sale',
    badgeBrands: 'Stores',
    badgeAmazonSa: 'Fast',
    badgeGift: 'Gift',
    badgePoints: 'pts',
    badgeAdmin: 'Admin',
    badgeAds: 'Advertise',
    bottomHome: 'Home',
    bottomSearch: 'Search',
    bottomCart: 'Bag',
    bottomAccount: 'Account',
    languageLabel: 'Store Language',
    languageArabic: 'العربية (RTL)',
    languageEnglish: 'English (LTR)',
    catalogTitle: 'Available Products Catalog',
    catalogSubtitle: 'Browse specifications, filter by price, brand, and rating, and customize instantly',
    catalogProductUnit: 'items',
    searchPlaceholder: 'Search products or specs...',
    sortDefault: 'Sort: Featured',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    sortRatingDesc: 'Rating: Top Rated',
    advancedFilter: 'Filters',
    heroBadge: 'Welcome to Rawaj Smart Storefront powered by Gemini AI',
    heroTitleLine1: 'Shop the latest smart tech with',
    heroTitleLine2: 'AI Shopping Concierge & Live Seller Chat',
    heroSubtitle:
      'Explore detailed specs, free custom engraving, secure local and card payments, and an AI advisor tailored to your budget.',
    heroCta: 'Ask AI Shopping Assistant',
    addToCartShort: 'Add',
    outOfStock: 'Out of Stock',
    inStockPrefix: 'In Stock',
    lowStockPrefix: 'Low Stock',
    quickView: 'Specs',
    aiAnalyze: 'Ask AI',
    vatIncluded: 'Includes VAT',
    inWishlist: 'Saved',
    addWishlist: 'Wishlist',
    compare: 'Compare',
    back: 'Back',
    preferencesTitle: 'Display Preferences & Quick Tools',
    preferencesDesc:
      'Manage storefront language, currency, dark/light theme, product comparison, and wishlist from one place.',
    tryAr: 'Try AR',
  },
} as const;
