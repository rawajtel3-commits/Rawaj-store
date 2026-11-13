import { InAppNotification, PriceDropAlert, Product } from '../types';

const PRICE_ALERTS_KEY = 'rawaj-price-drop-alerts';
const IN_APP_NOTIFICATIONS_KEY = 'rawaj-in-app-notifications';

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

export function evaluatePriceDropNotification(
  product: Product,
  oldPrice: number,
  newPrice: number,
  alerts: PriceDropAlert[]
): {
  triggeredNotification: InAppNotification | null;
  updatedAlerts: PriceDropAlert[];
} {
  if (!(newPrice > 0 && newPrice < oldPrice)) {
    return { triggeredNotification: null, updatedAlerts: alerts };
  }

  const matchingAlert = alerts.find(
    (a) =>
      a.isActive &&
      a.productId === product.id &&
      newPrice < a.subscribedPrice &&
      (!a.targetPrice || newPrice <= a.targetPrice)
  );

  if (!matchingAlert) {
    return { triggeredNotification: null, updatedAlerts: alerts };
  }

  const dropAmount = Math.round((oldPrice - newPrice) * 100) / 100;
  const discountPercent = Math.max(1, Math.round(((oldPrice - newPrice) / oldPrice) * 100));

  const notification: InAppNotification = {
    id: `notif-pd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'price_drop',
    productId: product.id,
    productName: product.name,
    productImage: product.images[0],
    oldPrice,
    newPrice,
    discountPercent,
    title: `انخفاض سعر بنسبة ${discountPercent}%!`,
    message: `انخفض سعر "${product.name}" بمقدار ${dropAmount.toLocaleString()} ر.س ليصبح ${newPrice.toLocaleString()} ر.س بدلاً من ${oldPrice.toLocaleString()} ر.س.`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  // Update the alert's baseline price to the new price so it stays ready for any further price drops
  const updatedAlerts = alerts.map((a) =>
    a.id === matchingAlert.id
      ? {
          ...a,
          subscribedPrice: newPrice,
        }
      : a
  );

  return {
    triggeredNotification: notification,
    updatedAlerts,
  };
}
