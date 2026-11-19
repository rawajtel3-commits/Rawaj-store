import crypto from "crypto";
import type { InAppNotification, PriceDropAlert, Product } from "../src/types.js";
import { monitorAllProductsForPriceAlerts } from "../src/utils/priceAlerts.js";
import { priceDropAlertQueries, type PriceDropAlertRow } from "./sqliteStore.js";

const CLIENT_KEY_REGEX = /^[a-zA-Z0-9_-]{6,100}$/;
const PRODUCT_ID_REGEX = /^[a-zA-Z0-9_-]{2,80}$/;

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, maxLen);
}

export function isValidClientKey(value: string): boolean {
  return CLIENT_KEY_REGEX.test(value.trim());
}

export function isValidProductId(value: string): boolean {
  return PRODUCT_ID_REGEX.test(value.trim());
}

function mapRowToAlert(row: PriceDropAlertRow): PriceDropAlert {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productImage: row.product_image,
    subscribedPrice: row.subscribed_price,
    targetPrice: row.target_price !== null ? row.target_price : undefined,
    lastTriggeredPrice:
      row.last_triggered_price !== null ? row.last_triggered_price : undefined,
    triggeredAt: row.triggered_at || undefined,
    triggerCount: row.trigger_count || 0,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

export function listClientPriceAlerts(clientKey: string): PriceDropAlert[] {
  return priceDropAlertQueries.listByClient(clientKey).map(mapRowToAlert);
}

export interface UpsertPriceAlertPayload {
  clientKey: string;
  productId: string;
  productName: string;
  productImage: string;
  currentPrice: number;
  targetPrice?: number;
}

export function validateUpsertPriceAlertPayload(
  rawClientKey: unknown,
  rawBody: unknown
): { data: UpsertPriceAlertPayload } | { error: string } {
  const clientKey = cleanText(rawClientKey, 100);
  if (!isValidClientKey(clientKey)) {
    return { error: "معرّف الجلسة أو العميل غير صالح." };
  }
  if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
    return { error: "بيانات تنبيه السعر غير صالحة." };
  }
  const b = rawBody as Record<string, unknown>;
  const productId = cleanText(b.productId, 80);
  if (!isValidProductId(productId)) {
    return { error: "معرّف المنتج غير صالح." };
  }
  const productName = cleanText(b.productName, 160);
  if (productName.length < 2) {
    return { error: "اسم المنتج مطلوب لحفظ التنبيه." };
  }
  const productImage = cleanText(b.productImage, 500) || "";
  const currentPrice = Number(b.currentPrice);
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return { error: "السعر الحالي للمنتج غير صالح." };
  }

  let targetPrice: number | undefined;
  if (b.targetPrice !== undefined && b.targetPrice !== null && b.targetPrice !== "") {
    const parsedTarget = Number(b.targetPrice);
    if (!Number.isFinite(parsedTarget) || parsedTarget < 1 || parsedTarget >= currentPrice) {
      return {
        error: "يجب أن يكون السعر المستهدف أكبر من صفر وأقل من السعر الحالي للمنتج.",
      };
    }
    targetPrice = Math.round(parsedTarget * 100) / 100;
  }

  return {
    data: {
      clientKey,
      productId,
      productName,
      productImage,
      currentPrice: Math.round(currentPrice * 100) / 100,
      targetPrice,
    },
  };
}

export function upsertClientPriceAlert(payload: UpsertPriceAlertPayload): PriceDropAlert {
  const nowIso = new Date().toISOString();
  const row: PriceDropAlertRow = {
    id: `pa_${crypto.randomUUID().slice(0, 12)}`,
    client_key: payload.clientKey,
    product_id: payload.productId,
    product_name: payload.productName,
    product_image: payload.productImage,
    subscribed_price: payload.currentPrice,
    target_price: payload.targetPrice ?? null,
    last_triggered_price: null,
    triggered_at: null,
    trigger_count: 0,
    is_active: 1,
    created_at: nowIso,
  };
  priceDropAlertQueries.upsertAlert(row);
  return mapRowToAlert(row);
}

export function removeClientPriceAlert(clientKey: string, productId: string): boolean {
  return priceDropAlertQueries.deleteByClientAndProduct(clientKey, productId) > 0;
}

export function evaluateClientPriceAlertsAgainstCatalog(
  clientKey: string,
  catalogProducts: Product[],
  previousPrices: Record<string, number>
): {
  triggeredNotifications: InAppNotification[];
  alerts: PriceDropAlert[];
} {
  const existingAlerts = listClientPriceAlerts(clientKey);
  if (existingAlerts.length === 0) {
    return { triggeredNotifications: [], alerts: [] };
  }

  const { triggeredNotifications, updatedAlerts } = monitorAllProductsForPriceAlerts(
    catalogProducts,
    previousPrices,
    existingAlerts
  );

  if (triggeredNotifications.length > 0) {
    for (const alert of updatedAlerts) {
      const prev = existingAlerts.find((a) => a.id === alert.id);
      if (
        prev &&
        (prev.lastTriggeredPrice !== alert.lastTriggeredPrice ||
          prev.triggerCount !== alert.triggerCount)
      ) {
        priceDropAlertQueries.upsertAlert({
          id: alert.id,
          client_key: clientKey,
          product_id: alert.productId,
          product_name: alert.productName,
          product_image: alert.productImage,
          subscribed_price: alert.subscribedPrice,
          target_price: alert.targetPrice ?? null,
          last_triggered_price: alert.lastTriggeredPrice ?? null,
          triggered_at: alert.triggeredAt ?? null,
          trigger_count: alert.triggerCount ?? 0,
          is_active: alert.isActive ? 1 : 0,
          created_at: alert.createdAt,
        });
      }
    }
  }

  return {
    triggeredNotifications,
    alerts: updatedAlerts,
  };
}
