import ReactGA from 'react-ga4';
import type { BehaviorEventType, Order, PageView, Product } from '../types';

const GA_SESSION_STORAGE_KEY = 'rawaj-ga-session-id';
const VIEW_DEDUP_MS = 1200;

let gaInitialized = false;
let gaMeasurementIdActive: string | null = null;
const recentEventTimestamps = new Map<string, number>();

function getSafeSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-session';
  try {
    const existing = window.sessionStorage.getItem(GA_SESSION_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{6,64}$/.test(existing)) {
      return existing;
    }
    const randomPart =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        : Math.random().toString(36).slice(2, 14);
    const created = `rwj-${randomPart}`;
    window.sessionStorage.setItem(GA_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return 'rwj-fallback-sid';
  }
}

function getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function shouldSkipDuplicate(dedupKey: string): boolean {
  const now = Date.now();
  const prev = recentEventTimestamps.get(dedupKey) || 0;
  if (now - prev < VIEW_DEDUP_MS) return true;
  recentEventTimestamps.set(dedupKey, now);
  if (recentEventTimestamps.size > 100) {
    const firstKey = recentEventTimestamps.keys().next().value;
    if (firstKey) recentEventTimestamps.delete(firstKey);
  }
  return false;
}

function getEnvMeasurementId(): string {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return String(meta?.env?.VITE_GA_MEASUREMENT_ID || '').trim();
  } catch {
    return '';
  }
}

export function initGoogleAnalytics(): boolean {
  if (typeof window === 'undefined') return false;
  if (gaInitialized) return Boolean(gaMeasurementIdActive);

  const candidate = getEnvMeasurementId();
  if (/^G-[A-Z0-9]{4,16}$/i.test(candidate)) {
    try {
      ReactGA.initialize(candidate);
      gaMeasurementIdActive = candidate;
    } catch {
      gaMeasurementIdActive = null;
    }
  }
  gaInitialized = true;
  return Boolean(gaMeasurementIdActive);
}

export function isGoogleAnalyticsConfigured(): boolean {
  return Boolean(gaMeasurementIdActive) || /^G-[A-Z0-9]{4,16}$/i.test(getEnvMeasurementId());
}

interface FirstPartyBehaviorPayload {
  sessionId: string;
  eventType: BehaviorEventType;
  pagePath: string;
  productId?: string;
  productName?: string;
  category?: string;
  searchTerm?: string;
  valueSar?: number;
  hourOfDay: number;
  dayOfWeek: number;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

function dispatchFirstPartyBehavior(
  eventType: BehaviorEventType,
  extra: Partial<Omit<FirstPartyBehaviorPayload, 'sessionId' | 'eventType' | 'hourOfDay' | 'dayOfWeek' | 'deviceType'>>
): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;

  const now = new Date();
  const payload: FirstPartyBehaviorPayload = {
    sessionId: getSafeSessionId(),
    eventType,
    pagePath: extra.pagePath || window.location.pathname || '/',
    productId: extra.productId || '',
    productName: extra.productName || '',
    category: extra.category || '',
    searchTerm: extra.searchTerm || '',
    valueSar: Number.isFinite(Number(extra.valueSar)) ? Number(extra.valueSar) : 0,
    hourOfDay: now.getHours(),
    dayOfWeek: now.getDay(),
    deviceType: getDeviceType(),
  };

  try {
    void fetch('/api/analytics/behavior/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Telemetry failures must never impact user experience
    });
  } catch {
    // Ignore
  }
}

export function trackStorePageView(view: PageView, title?: string): void {
  if (typeof window === 'undefined') return;
  const pagePath = view === 'home' ? '/' : `/${view}`;
  if (shouldSkipDuplicate(`page:${pagePath}`)) return;

  if (gaInitialized && gaMeasurementIdActive) {
    try {
      ReactGA.send({ hitType: 'pageview', page: pagePath, title: title || pagePath });
    } catch {
      // Ignore GA4 runtime errors
    }
  }

  dispatchFirstPartyBehavior('page_view', { pagePath });
}

export function trackProductView(product: Product): void {
  if (typeof window === 'undefined' || !product?.id) return;
  if (shouldSkipDuplicate(`view_item:${product.id}`)) return;

  if (gaInitialized && gaMeasurementIdActive) {
    try {
      ReactGA.event('view_item', {
        currency: 'SAR',
        value: product.price,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            item_category: product.category,
            price: product.price,
          },
        ],
      });
    } catch {
      // Ignore
    }
  }

  dispatchFirstPartyBehavior('view_item', {
    pagePath: `/product/${product.id}`,
    productId: product.id,
    productName: product.name,
    category: product.category,
    valueSar: product.price,
  });
}

export function trackAddToCart(product: Product, quantity = 1, valueSar?: number): void {
  if (typeof window === 'undefined' || !product?.id) return;
  const safeQty = Math.max(1, Math.round(quantity));
  const totalValue = Number.isFinite(Number(valueSar))
    ? Number(valueSar)
    : product.price * safeQty;

  if (gaInitialized && gaMeasurementIdActive) {
    try {
      ReactGA.event('add_to_cart', {
        currency: 'SAR',
        value: totalValue,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            item_category: product.category,
            price: product.price,
            quantity: safeQty,
          },
        ],
      });
    } catch {
      // Ignore
    }
  }

  dispatchFirstPartyBehavior('add_to_cart', {
    pagePath: `/product/${product.id}`,
    productId: product.id,
    productName: product.name,
    category: product.category,
    valueSar: totalValue,
  });
}

export function trackBeginCheckout(itemsCount: number, totalSar: number): void {
  if (typeof window === 'undefined') return;
  if (shouldSkipDuplicate(`begin_checkout:${itemsCount}:${Math.round(totalSar)}`)) return;

  if (gaInitialized && gaMeasurementIdActive) {
    try {
      ReactGA.event('begin_checkout', {
        currency: 'SAR',
        value: totalSar,
        items_count: itemsCount,
      });
    } catch {
      // Ignore
    }
  }

  dispatchFirstPartyBehavior('begin_checkout', {
    pagePath: '/checkout',
    valueSar: totalSar,
  });
}

export function trackPurchase(order: Order): void {
  if (typeof window === 'undefined' || !order) return;

  if (gaInitialized && gaMeasurementIdActive) {
    try {
      ReactGA.event('purchase', {
        transaction_id: order.orderNumber || order.id,
        currency: 'SAR',
        value: order.total,
        items: (order.items || []).map((item) => ({
          item_id: item.product.id,
          item_name: item.product.name,
          item_category: item.product.category,
          price: item.product.price,
          quantity: item.quantity,
        })),
      });
    } catch {
      // Ignore
    }
  }

  const firstItem = order.items?.[0];
  dispatchFirstPartyBehavior('purchase', {
    pagePath: '/checkout',
    productId: firstItem?.product.id || '',
    productName: firstItem?.product.name || '',
    category: firstItem?.product.category || '',
    valueSar: order.total,
  });
}

export function trackStoreSearch(searchTerm: string): void {
  if (typeof window === 'undefined') return;
  const clean = searchTerm.trim();
  if (clean.length < 2) return;
  if (shouldSkipDuplicate(`search:${clean.toLowerCase()}`)) return;

  if (gaInitialized && gaMeasurementIdActive) {
    try {
      ReactGA.event('search', { search_term: clean });
    } catch {
      // Ignore
    }
  }

  dispatchFirstPartyBehavior('search', {
    pagePath: '/',
    searchTerm: clean,
  });
}

export function trackCategoryView(category: string): void {
  if (typeof window === 'undefined' || !category || category === 'all') return;
  if (shouldSkipDuplicate(`category:${category}`)) return;

  if (gaInitialized && gaMeasurementIdActive) {
    try {
      ReactGA.event('view_item_list', { item_list_name: category });
    } catch {
      // Ignore
    }
  }

  dispatchFirstPartyBehavior('category_view', {
    pagePath: `/?category=${category}`,
    category,
  });
}
