import { InAppNotification, PriceDropAlert, Product } from '../types';

const PRICE_ALERTS_KEY = 'rawaj-price-drop-alerts';
const IN_APP_NOTIFICATIONS_KEY = 'rawaj-in-app-notifications';
const PRICE_ALERT_CLIENT_KEY = 'rawaj-price-alert-client-id';

export interface TargetPricePreset {
  discountPercent: number;
  targetPrice: number;
  savingsAmount: number;
}

export function getOrCreatePriceAlertClientKey(): string {
  if (typeof window === 'undefined') return 'server-client';
  try {
    const existing = window.localStorage.getItem(PRICE_ALERT_CLIENT_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,80}$/.test(existing)) {
      return existing;
    }
    const generated = `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(PRICE_ALERT_CLIENT_KEY, generated);
    return generated;
  } catch {
    return 'web-guest-client';
  }
}

export function loadPriceAlerts(): PriceDropAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PRICE_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePriceAlerts(alerts: PriceDropAlert[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
  } catch {
    // Ignore storage failures
  }
}

export function loadNotifications(): InAppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(IN_APP_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: InAppNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      IN_APP_NOTIFICATIONS_KEY,
      JSON.stringify(notifications.slice(0, 40))
    );
  } catch {
    // Ignore storage failures
  }
}

export function computeSuggestedTargetPrices(currentPrice: number): TargetPricePreset[] {
  if (!Number.isFinite(currentPrice) || currentPrice <= 1) return [];
  const percentages = [5, 10, 15, 20];
  const seenPrices = new Set<number>();
  const presets: TargetPricePreset[] = [];

  for (const pct of percentages) {
    const target = Math.max(1, Math.round(currentPrice * (1 - pct / 100)));
    if (target < currentPrice && !seenPrices.has(target)) {
      seenPrices.add(target);
      presets.push({
        discountPercent: pct,
        targetPrice: target,
        savingsAmount: Math.round((currentPrice - target) * 100) / 100,
      });
    }
  }
  return presets;
}

export function evaluatePriceDropNotification(
  product: Pick<Product, 'id' | 'name' | 'images'>,
  oldPrice: number,
  newPrice: number,
  alerts: PriceDropAlert[]
): {
  triggeredNotification: InAppNotification | null;
  updatedAlerts: PriceDropAlert[];
} {
  if (!(newPrice > 0 && oldPrice > 0)) {
    return { triggeredNotification: null, updatedAlerts: alerts };
  }

  const matchingAlert = alerts.find((a) => {
    if (!a.isActive || a.productId !== product.id) return false;
    if (a.lastTriggeredPrice !== undefined && newPrice >= a.lastTriggeredPrice) {
      return false;
    }
    if (a.targetPrice !== undefined && a.targetPrice > 0) {
      return newPrice <= a.targetPrice && (newPrice < oldPrice || a.lastTriggeredPrice === undefined);
    }
    return newPrice < oldPrice && newPrice < a.subscribedPrice;
  });

  if (!matchingAlert) {
    return { triggeredNotification: null, updatedAlerts: alerts };
  }

  const referenceOldPrice =
    oldPrice > newPrice ? oldPrice : Math.max(matchingAlert.subscribedPrice, newPrice);
  const dropAmount = Math.max(0, Math.round((referenceOldPrice - newPrice) * 100) / 100);
  const discountPercent =
    referenceOldPrice > newPrice
      ? Math.max(1, Math.round(((referenceOldPrice - newPrice) / referenceOldPrice) * 100))
      : 1;

  const isTargetAlert = Boolean(matchingAlert.targetPrice && matchingAlert.targetPrice > 0);
  const nowIso = new Date().toISOString();

  const title = isTargetAlert
    ? `تحقق السعر المستهدف! انخفاض ${discountPercent}%`
    : `انخفاض سعر بنسبة ${discountPercent}%!`;

  const message = isTargetAlert
    ? `وصل سعر "${product.name}" إلى ${newPrice.toLocaleString()} ر.س (حقق السعر المستهدف ${matchingAlert.targetPrice!.toLocaleString()} ر.س) بدلاً من ${referenceOldPrice.toLocaleString()} ر.س.`
    : `انخفض سعر "${product.name}" بمقدار ${dropAmount.toLocaleString()} ر.س ليصبح ${newPrice.toLocaleString()} ر.س بدلاً من ${referenceOldPrice.toLocaleString()} ر.س.`;

  const notification: InAppNotification = {
    id: `notif-pd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'price_drop',
    actionType: 'open_product',
    productId: product.id,
    productName: product.name,
    productImage:
      (Array.isArray(product.images) && product.images[0]) ||
      (typeof (product as { image?: unknown }).image === 'string'
        ? ((product as { image?: string }).image ?? '')
        : ''),
    oldPrice: referenceOldPrice,
    newPrice,
    targetPrice: matchingAlert.targetPrice,
    discountPercent,
    title,
    message,
    read: false,
    createdAt: nowIso,
  };

  const updatedAlerts = alerts.map((a) =>
    a.id === matchingAlert.id
      ? {
          ...a,
          subscribedPrice: newPrice,
          lastTriggeredPrice: newPrice,
          triggeredAt: nowIso,
          triggerCount: (a.triggerCount || 0) + 1,
        }
      : a
  );

  return {
    triggeredNotification: notification,
    updatedAlerts,
  };
}

export function monitorAllProductsForPriceAlerts(
  products: Product[],
  previousPrices: Record<string, number>,
  alerts: PriceDropAlert[]
): {
  triggeredNotifications: InAppNotification[];
  updatedAlerts: PriceDropAlert[];
} {
  let workingAlerts = alerts;
  const triggeredNotifications: InAppNotification[] = [];

  for (const product of products) {
    const prevPrice = previousPrices[product.id];
    const baseline =
      typeof prevPrice === 'number' && prevPrice > 0 ? prevPrice : product.price;
    const { triggeredNotification, updatedAlerts } = evaluatePriceDropNotification(
      product,
      baseline,
      product.price,
      workingAlerts
    );
    workingAlerts = updatedAlerts;
    if (triggeredNotification) {
      triggeredNotifications.push(triggeredNotification);
    }
  }

  return {
    triggeredNotifications,
    updatedAlerts: workingAlerts,
  };
}
