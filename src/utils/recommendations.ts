import {
  BrowsingHistoryEntry,
  Category,
  CrossSellRecommendationResult,
  Order,
  Product,
  RecommendedProductItem,
} from '../types';

const BROWSING_STORAGE_KEY = 'rawaj-browsing-history';
const MAX_HISTORY_ITEMS = 20;

export type RecommendationFocusMode = 'all' | 'purchases' | 'browsing';

export interface PurchaseSignal {
  productId: string;
  name: string;
  category: Category;
  categoryNameAr: string;
  price: number;
  orderNumber: string;
  date: string;
  quantity: number;
}

/**
 * Complementary product and category relationships for intelligent cross-selling.
 */
const COMPLEMENTARY_CATEGORIES: Record<Category, Category[]> = {
  electronics: ['accessories', 'home', 'gaming', 'fashion'],
  gaming: ['electronics', 'accessories', 'home'],
  accessories: ['electronics', 'gaming', 'fashion'],
  home: ['electronics', 'accessories', 'fashion'],
  fashion: ['accessories', 'electronics', 'home'],
  all: ['electronics', 'accessories', 'gaming', 'home', 'fashion'],
};

const COMPLEMENTARY_PRODUCTS: Record<string, string[]> = {
  'prod-1': ['prod-3', 'prod-6', 'prod-2', 'prod-7'], // Laptop -> Buds, OLED Monitor, Watch, Coffee
  'prod-2': ['prod-3', 'prod-8', 'prod-1', 'prod-7'], // Watch -> Buds, Travel Luggage, Laptop, Coffee
  'prod-3': ['prod-1', 'prod-2', 'prod-4', 'prod-6'], // Earbuds -> Laptop, Watch, Console, Monitor
  'prod-4': ['prod-6', 'prod-3', 'prod-1', 'prod-7'], // Console -> OLED Monitor, Earbuds, Laptop
  'prod-5': ['prod-2', 'prod-3', 'prod-7', 'prod-8'], // Smart/Fashion -> Watch, Earbuds, Coffee
  'prod-6': ['prod-4', 'prod-1', 'prod-3', 'prod-7'], // OLED Monitor -> Console, Laptop, Earbuds
  'prod-7': ['prod-2', 'prod-3', 'prod-1', 'prod-8'], // Coffee Maker -> Watch, Earbuds, Laptop
  'prod-8': ['prod-2', 'prod-3', 'prod-1', 'prod-7'], // Travel Luggage -> Watch, Earbuds, Laptop
};

export function loadBrowsingHistory(): BrowsingHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BROWSING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is BrowsingHistoryEntry =>
        Boolean(entry && typeof entry.productId === 'string' && typeof entry.category === 'string')
    );
  } catch {
    return [];
  }
}

export function saveBrowsingHistory(entries: BrowsingHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BROWSING_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // Ignore storage failures in restricted contexts
  }
}

export function recordBrowsingView(
  current: BrowsingHistoryEntry[],
  product: Product
): BrowsingHistoryEntry[] {
  const existing = current.find((item) => item.productId === product.id);
  const now = new Date().toISOString();
  const updatedEntry: BrowsingHistoryEntry = {
    productId: product.id,
    category: product.category,
    viewedAt: now,
    viewCount: existing ? existing.viewCount + 1 : 1,
  };
  const filtered = current.filter((item) => item.productId !== product.id);
  return [updatedEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
}

export function extractPurchaseSignals(orders: Order[]): PurchaseSignal[] {
  const map = new Map<string, PurchaseSignal>();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    for (const item of order.items) {
      const prev = map.get(item.product.id);
      if (prev) {
        prev.quantity += item.quantity;
      } else {
        map.set(item.product.id, {
          productId: item.product.id,
          name: item.product.name,
          category: item.product.category,
          categoryNameAr: item.product.categoryNameAr,
          price: item.product.price,
          orderNumber: order.orderNumber,
          date: order.date,
          quantity: item.quantity,
        });
      }
    }
  }
  return Array.from(map.values());
}

export interface CrossSellEngineInput {
  currentProduct: Product;
  catalog: Product[];
  browsingHistory: BrowsingHistoryEntry[];
  purchaseHistory: PurchaseSignal[];
  cartProductIds?: string[];
  focusMode?: RecommendationFocusMode;
  maxResults?: number;
}

export function computeDeterministicCrossSell({
  currentProduct,
  catalog,
  browsingHistory,
  purchaseHistory,
  cartProductIds = [],
  focusMode = 'all',
  maxResults = 3,
}: CrossSellEngineInput): CrossSellRecommendationResult {
  const candidates = catalog.filter((p) => p.id !== currentProduct.id && p.stock > 0);
  if (candidates.length === 0) {
    return {
      headlineAr: 'لا توجد منتجات إضافية متاحة حالياً في المخزون.',
      source: 'smart-engine',
      recommendations: [],
    };
  }

  const viewedIds = new Set(browsingHistory.map((b) => b.productId));
  const viewedCategories = new Map<Category, number>();
  browsingHistory.forEach((b, idx) => {
    const recencyWeight = Math.max(1, 6 - idx);
    viewedCategories.set(
      b.category,
      (viewedCategories.get(b.category) || 0) + recencyWeight * b.viewCount
    );
  });

  const purchasedIds = new Set(purchaseHistory.map((p) => p.productId));
  const purchasedCategories = new Set(purchaseHistory.map((p) => p.category));
  const cartSet = new Set(cartProductIds);
  const directComplements = COMPLEMENTARY_PRODUCTS[currentProduct.id] || [];
  const complementaryCats = COMPLEMENTARY_CATEGORIES[currentProduct.category] || [];

  const scored = candidates.map((candidate) => {
    let score = 50;
    let badgeAr = 'مقترح ذكي';
    let reasonAr = `خيار عالي التقييم (${candidate.rating}/5) يكمل تجربتك مع ${currentProduct.name}.`;

    const signals: string[] = [];

    // 1. Direct complementary cross-sell pair with current product
    const directIdx = directComplements.indexOf(candidate.id);
    if (directIdx !== -1) {
      score += 28 - directIdx * 4;
      signals.push('complement');
    }

    // 2. Category complementarity (prefer complementary over identical for true cross-selling)
    const compCatIdx = complementaryCats.indexOf(candidate.category);
    if (compCatIdx !== -1) {
      score += Math.max(6, 18 - compCatIdx * 4);
    }

    // 3. Purchase history cross-sell signal
    if (focusMode === 'all' || focusMode === 'purchases') {
      const relatedPurchase = purchaseHistory.find((p) => {
        const pComp = COMPLEMENTARY_PRODUCTS[p.productId] || [];
        return pComp.includes(candidate.id) || COMPLEMENTARY_CATEGORIES[p.category]?.includes(candidate.category);
      });
      if (purchasedIds.has(candidate.id)) {
        // Already bought before; slightly deprioritize unless consumable/gift
        score -= 10;
      } else if (relatedPurchase) {
        score += focusMode === 'purchases' ? 32 : 20;
        signals.push(`purchase:${relatedPurchase.name}`);
      } else if (purchasedCategories.size > 0 && !purchasedCategories.has(candidate.category)) {
        score += 8;
      }
    }

    // 4. Browsing history affinity signal
    if (focusMode === 'all' || focusMode === 'browsing') {
      const catInterest = viewedCategories.get(candidate.category) || 0;
      const relatedViewed = browsingHistory.find(
        (b) => b.productId !== candidate.id && (COMPLEMENTARY_PRODUCTS[b.productId] || []).includes(candidate.id)
      );
      if (viewedIds.has(candidate.id)) {
        score += focusMode === 'browsing' ? 24 : 14;
        signals.push('revisit');
      } else if (catInterest > 0) {
        score += Math.min(24, catInterest * 2);
        signals.push('browsing_cat');
      } else if (relatedViewed) {
        score += 18;
        signals.push('browsing_pair');
      }
    }

    // 5. Quality, discount, and cart awareness
    if (candidate.rating >= 4.8) score += 6;
    if (candidate.originalPrice && candidate.originalPrice > candidate.price) score += 5;
    if (cartSet.has(candidate.id)) score -= 25;

    // Build crisp Arabic cross-sell rationale
    const purchaseSignal = signals.find((s) => s.startsWith('purchase:'));
    if (purchaseSignal) {
      const boughtName = purchaseSignal.replace('purchase:', '');
      badgeAr = 'يكمّل مشترياتك';
      reasonAr = `يتكامل مباشرة مع "${boughtName}" من مشترياتك السابقة ويعزز استخدام ${currentProduct.name}.`;
    } else if (signals.includes('revisit')) {
      badgeAr = 'بناءً على تصفحك';
      reasonAr = `تصفحته مؤخراً ويتكامل تقنياً مع ${currentProduct.name} ضمن حزمة واحدة.`;
    } else if (signals.includes('browsing_cat') || signals.includes('browsing_pair')) {
      badgeAr = 'حسب اهتماماتك';
      reasonAr = `متوافق مع اهتمامك المتكرر بفئة ${candidate.categoryNameAr} ومكمل عملي لمنتجك الحالي.`;
    } else if (signals.includes('complement')) {
      badgeAr = 'بيع متقاطع مثالي';
      reasonAr = `الرفيق الأكثر طلباً مع ${currentProduct.name} لتحقيق أقصى استفادة وتكامل.`;
    }

    const matchScore = Math.min(98, Math.max(76, Math.round(score)));

    return {
      productId: candidate.id,
      reasonAr,
      badgeAr,
      matchScore,
    } satisfies RecommendedProductItem;
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top = scored.slice(0, maxResults);

  const viewedCount = browsingHistory.length;
  const purchaseCount = purchaseHistory.length;
  let headlineAr = `اختيارات بيع متقاطع متوافقة مع ${currentProduct.name}`;
  if (focusMode === 'purchases' && purchaseCount > 0) {
    headlineAr = `مقترحات مخصصة تتكامل مع ${purchaseCount} من مشترياتك السابقة في المتجر`;
  } else if (focusMode === 'browsing' && viewedCount > 0) {
    headlineAr = `منتجات ذات صلة مستخلصة من سجل تصفحك الأخير (${viewedCount} منتجات)`;
  } else if (purchaseCount > 0 && viewedCount > 0) {
    headlineAr = `حلل المساعد الذكي ${viewedCount} منتجات في سجل تصفحك و${purchaseCount} من مشترياتك لاقتراح أنسب الإضافات`;
  } else if (purchaseCount > 0) {
    headlineAr = `بناءً على مشترياتك السابقة (${purchaseCount} طلبات)، هذه الإضافات تكمل تجربتك`;
  }

  return {
    headlineAr,
    source: 'smart-engine',
    recommendations: top,
  };
}
