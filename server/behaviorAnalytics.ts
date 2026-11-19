import type {
  AdminBehaviorAnalyticsReport,
  BehaviorEventType,
  BehaviorRecommendation,
  BehaviorTimeRange,
  CategoryBehaviorStat,
  DeviceBehaviorStat,
  HourlyBehaviorStat,
  ProductBehaviorStat,
  SearchTermStat,
} from "../src/types.js";
import { INITIAL_PRODUCTS } from "../src/data/initialData.js";
import {
  behaviorAnalyticsQueries,
  type StoreBehaviorEventRow,
} from "./sqliteStore.js";

const ALLOWED_EVENT_TYPES = new Set<BehaviorEventType>([
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
  "search",
  "category_view",
]);

const ALLOWED_CATEGORIES = new Set([
  "all",
  "electronics",
  "gaming",
  "fashion",
  "home",
  "accessories",
]);

const CATEGORY_LABELS_AR: Record<string, string> = {
  electronics: "إلكترونيات وحواسيب",
  gaming: "ألعاب وبثوث",
  fashion: "أزياء وإكسسوارات",
  home: "المنزل الذكي",
  accessories: "ساعات وإكسسوارات",
  all: "كل الأقسام",
};

const HOUR_LABELS_AR: string[] = Array.from({ length: 24 }, (_, hour) => {
  const padded = String(hour).padStart(2, "0");
  return `${padded}:00`;
});

const RANGE_DURATION_MS: Record<BehaviorTimeRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function cleanBehaviorText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, maxLen);
}

export function parseBehaviorTimeRange(raw: unknown): BehaviorTimeRange {
  if (raw === "24h" || raw === "7d" || raw === "30d") return raw;
  return "7d";
}

export function detectDeviceFromUserAgent(
  ua: unknown
): "mobile" | "desktop" | "tablet" {
  const s = String(ua || "").toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(s)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(s)) {
    return "mobile";
  }
  return "desktop";
}

export function maskMeasurementId(rawId?: string): string | null {
  const clean = String(rawId || "").trim();
  if (!/^G-[A-Z0-9]{4,16}$/i.test(clean)) return null;
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 4)}••••${clean.slice(-3)}`;
}

export interface ValidatedBehaviorEventInput {
  ok: true;
  event: Omit<StoreBehaviorEventRow, "id">;
}

export interface InvalidBehaviorEventInput {
  ok: false;
  error: string;
}

export function validateBehaviorEventInput(
  body: unknown,
  userAgent: unknown
): ValidatedBehaviorEventInput | InvalidBehaviorEventInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "صيغة بيانات حدث السلوك غير صالحة." };
  }

  const raw = body as Record<string, unknown>;
  const rawType = cleanBehaviorText(raw.eventType, 32) as BehaviorEventType;
  if (!ALLOWED_EVENT_TYPES.has(rawType)) {
    return { ok: false, error: "نوع الحدث السلوكي غير مدعوم." };
  }

  const rawSession = cleanBehaviorText(raw.sessionId, 64).replace(/[^a-zA-Z0-9_-]/g, "");
  const sessionId = rawSession.length >= 4 ? rawSession : "anon-session";

  const pagePath = cleanBehaviorText(raw.pagePath, 120) || "/";
  const productId = cleanBehaviorText(raw.productId, 64).replace(/[^a-zA-Z0-9_-]/g, "");
  const productName = cleanBehaviorText(raw.productName, 140);
  const rawCategory = cleanBehaviorText(raw.category, 32).toLowerCase();
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : "";
  const searchTerm = cleanBehaviorText(raw.searchTerm, 80);

  if (rawType === "view_item" && !productId) {
    return { ok: false, error: "معرف المنتج مطلوب لتسجيل مشاهدة المنتج." };
  }
  if (rawType === "search" && searchTerm.length < 2) {
    return { ok: false, error: "عبارة البحث قصيرة جداً للتسجيل." };
  }

  const parsedValue = Number(raw.valueSar ?? 0);
  const valueSar =
    Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 1_000_000
      ? Math.round(parsedValue * 100) / 100
      : 0;

  const now = new Date();
  const rawHour = raw.hourOfDay !== undefined ? Number(raw.hourOfDay) : now.getHours();
  const hourOfDay =
    Number.isInteger(rawHour) && rawHour >= 0 && rawHour <= 23
      ? rawHour
      : now.getHours();

  const rawDay = raw.dayOfWeek !== undefined ? Number(raw.dayOfWeek) : now.getDay();
  const dayOfWeek =
    Number.isInteger(rawDay) && rawDay >= 0 && rawDay <= 6 ? rawDay : now.getDay();

  const explicitDevice = cleanBehaviorText(raw.deviceType, 16);
  const deviceType: "mobile" | "desktop" | "tablet" =
    explicitDevice === "mobile" ||
    explicitDevice === "desktop" ||
    explicitDevice === "tablet"
      ? explicitDevice
      : detectDeviceFromUserAgent(userAgent);

  return {
    ok: true,
    event: {
      session_id: sessionId,
      event_type: rawType,
      page_path: pagePath,
      product_id: productId,
      product_name: productName,
      category,
      search_term: searchTerm,
      value_sar: valueSar,
      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,
      device_type: deviceType,
      created_at: now.toISOString(),
    },
  };
}

export function recordBehaviorEvent(
  event: Omit<StoreBehaviorEventRow, "id">
): void {
  behaviorAnalyticsQueries.insertEvent(event);
}

/**
 * Seeds deterministic initial behavioral events ONLY if the table is completely empty,
 * creating realistic 24h peak-hour traffic and product view weights across the catalog.
 * Subsequent real customer interactions are recorded and aggregated directly on top.
 */
export function seedBehaviorBaselineIfEmpty(): void {
  if (behaviorAnalyticsQueries.countEvents() > 0) return;

  const nowMs = Date.now();
  const rows: Array<Omit<StoreBehaviorEventRow, "id">> = [];

  // Hourly traffic distribution mimicking realistic Saudi e-commerce peaks:
  // Midday lull bump (12:00-14:00) and Evening Peak (20:00-23:00)
  const hourlyWeights = [
    3, 2, 1, 1, 1, 2, 3, 4, 6, 8, 10, 12,
    15, 16, 13, 11, 12, 14, 16, 20, 27, 30, 23, 11,
  ];

  // Product weights aligned with INITIAL_PRODUCTS
  const catalogWeights = INITIAL_PRODUCTS.slice(0, 8).map((prod, idx) => ({
    prod,
    viewWeight: Math.max(4, 24 - idx * 3),
    cartRatio: idx === 1 ? 0.34 : idx === 0 ? 0.25 : 0.22 - idx * 0.015,
    purchaseRatio: idx === 1 ? 0.16 : 0.09,
  }));

  const searchSamples = [
    "لابتوب برو",
    "ساعة ذكية",
    "سماعات بلوتوث",
    "كيبورد ميكانيكي",
    "كاميرا منزل ذكي",
    "سماعات عزل ضوضاء",
    "شاحن سريع",
  ];

  let seq = 0;
  for (let hour = 0; hour < 24; hour++) {
    const count = hourlyWeights[hour] || 4;
    for (let i = 0; i < count; i++) {
      seq += 1;
      // Spread events within last 6 days so 24h, 7d, and 30d filters all return realistic telemetry
      const dayOffset = seq % 5;
      const eventDate = new Date(
        nowMs - dayOffset * 24 * 60 * 60 * 1000 - ((seq * 13) % 55) * 60 * 1000
      );
      eventDate.setHours(hour, (seq * 7) % 60, 0, 0);
      if (eventDate.getTime() > nowMs) {
        eventDate.setTime(nowMs - ((seq % 12) + 1) * 35 * 60 * 1000);
      }

      const sessionId = `ga-seed-${Math.floor(seq / 2)}`;
      const deviceType: "mobile" | "desktop" | "tablet" =
        seq % 10 < 6 ? "mobile" : seq % 10 < 9 ? "desktop" : "tablet";

      rows.push({
        session_id: sessionId,
        event_type: "page_view",
        page_path: seq % 4 === 0 ? "/offers" : "/",
        product_id: "",
        product_name: "",
        category: "",
        search_term: "",
        value_sar: 0,
        hour_of_day: hour,
        day_of_week: eventDate.getDay(),
        device_type: deviceType,
        created_at: eventDate.toISOString(),
      });

      if (seq % 7 === 0) {
        rows.push({
          session_id: sessionId,
          event_type: "search",
          page_path: "/",
          product_id: "",
          product_name: "",
          category: "",
          search_term: searchSamples[seq % searchSamples.length],
          value_sar: 0,
          hour_of_day: hour,
          day_of_week: eventDate.getDay(),
          device_type: deviceType,
          created_at: eventDate.toISOString(),
        });
      }
    }
  }

  // Deterministic catalog views, add_to_cart, and purchases weighted toward peak hours
  const peakHours = [20, 21, 22, 13, 12, 19, 23, 14];
  catalogWeights.forEach(({ prod, viewWeight, cartRatio, purchaseRatio }, pIdx) => {
    for (let v = 0; v < viewWeight; v++) {
      const hour = peakHours[(v + pIdx) % peakHours.length];
      const dayOffset = v % 3;
      const eventDate = new Date(nowMs - dayOffset * 24 * 60 * 60 * 1000);
      eventDate.setHours(hour, (v * 5 + pIdx) % 60, 0, 0);
      if (eventDate.getTime() > nowMs) {
        eventDate.setTime(nowMs - ((v % 8) + 1) * 40 * 60 * 1000);
      }
      const sessionId = `ga-prod-${pIdx}-${v}`;
      const deviceType: "mobile" | "desktop" | "tablet" =
        (v + pIdx) % 10 < 6 ? "mobile" : (v + pIdx) % 10 < 9 ? "desktop" : "tablet";

      rows.push({
        session_id: sessionId,
        event_type: "view_item",
        page_path: `/product/${prod.id}`,
        product_id: prod.id,
        product_name: prod.name,
        category: prod.category,
        search_term: "",
        value_sar: prod.price,
        hour_of_day: hour,
        day_of_week: eventDate.getDay(),
        device_type: deviceType,
        created_at: eventDate.toISOString(),
      });

      const cartThreshold = Math.max(1, Math.round(viewWeight * cartRatio));
      if (v < cartThreshold) {
        rows.push({
          session_id: sessionId,
          event_type: "add_to_cart",
          page_path: `/product/${prod.id}`,
          product_id: prod.id,
          product_name: prod.name,
          category: prod.category,
          search_term: "",
          value_sar: prod.price,
          hour_of_day: hour,
          day_of_week: eventDate.getDay(),
          device_type: deviceType,
          created_at: eventDate.toISOString(),
        });
      }

      const buyThreshold = Math.max(1, Math.round(viewWeight * purchaseRatio));
      if (v < buyThreshold) {
        rows.push({
          session_id: sessionId,
          event_type: "purchase",
          page_path: "/checkout",
          product_id: prod.id,
          product_name: prod.name,
          category: prod.category,
          search_term: "",
          value_sar: prod.price,
          hour_of_day: hour,
          day_of_week: eventDate.getDay(),
          device_type: deviceType,
          created_at: eventDate.toISOString(),
        });
      }
    }
  });

  behaviorAnalyticsQueries.insertBatch(rows);
}

export function buildAdminBehaviorReport(
  range: BehaviorTimeRange,
  gaMeasurementId?: string
): AdminBehaviorAnalyticsReport {
  const cutoffIso = new Date(Date.now() - RANGE_DURATION_MS[range]).toISOString();
  const events = behaviorAnalyticsQueries.listEventsSince(cutoffIso, 5000);

  const uniqueSessions = new Set<string>();
  let pageViews = 0;
  let productViews = 0;
  let addToCartCount = 0;
  let checkoutCount = 0;
  let purchaseCount = 0;

  const hourlyBuckets: HourlyBehaviorStat[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: HOUR_LABELS_AR[hour],
    pageViews: 0,
    productViews: 0,
    addToCartCount: 0,
    purchaseCount: 0,
    totalInteractions: 0,
    isPeak: false,
  }));

  const productMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      category: string;
      views: number;
      addToCartCount: number;
      purchaseCount: number;
      revenueSar: number;
    }
  >();

  const categoryMap = new Map<
    string,
    { category: string; views: number; addToCartCount: number }
  >();
  const searchMap = new Map<string, number>();
  const deviceCounts: Record<"mobile" | "desktop" | "tablet", number> = {
    mobile: 0,
    desktop: 0,
    tablet: 0,
  };

  for (const ev of events) {
    uniqueSessions.add(ev.session_id);
    const hourIdx = Math.max(0, Math.min(23, Number(ev.hour_of_day) || 0));
    const bucket = hourlyBuckets[hourIdx];
    bucket.totalInteractions += 1;

    if (ev.device_type === "mobile" || ev.device_type === "tablet") {
      deviceCounts[ev.device_type] += 1;
    } else {
      deviceCounts.desktop += 1;
    }

    switch (ev.event_type) {
      case "page_view":
        pageViews += 1;
        bucket.pageViews += 1;
        break;
      case "view_item":
        productViews += 1;
        bucket.productViews += 1;
        break;
      case "add_to_cart":
        addToCartCount += 1;
        bucket.addToCartCount += 1;
        break;
      case "begin_checkout":
        checkoutCount += 1;
        break;
      case "purchase":
        purchaseCount += 1;
        bucket.purchaseCount += 1;
        break;
      case "search":
        if (ev.search_term) {
          const cleanTerm = ev.search_term.trim();
          searchMap.set(cleanTerm, (searchMap.get(cleanTerm) || 0) + 1);
        }
        break;
      case "category_view":
        if (ev.category && ev.category !== "all") {
          const label = CATEGORY_LABELS_AR[ev.category] || ev.category;
          const curCat = categoryMap.get(label) || {
            category: label,
            views: 0,
            addToCartCount: 0,
          };
          curCat.views += 1;
          categoryMap.set(label, curCat);
        }
        break;
    }

    if (
      ev.product_id &&
      (ev.event_type === "view_item" ||
        ev.event_type === "add_to_cart" ||
        ev.event_type === "purchase")
    ) {
      const existing = productMap.get(ev.product_id) || {
        productId: ev.product_id,
        productName: ev.product_name || ev.product_id,
        category: CATEGORY_LABELS_AR[ev.category] || ev.category || "عام",
        views: 0,
        addToCartCount: 0,
        purchaseCount: 0,
        revenueSar: 0,
      };
      if (ev.product_name && existing.productName === existing.productId) {
        existing.productName = ev.product_name;
      }
      if (ev.event_type === "view_item") existing.views += 1;
      if (ev.event_type === "add_to_cart") existing.addToCartCount += 1;
      if (ev.event_type === "purchase") {
        existing.purchaseCount += 1;
        existing.revenueSar += Number(ev.value_sar || 0);
      }
      productMap.set(ev.product_id, existing);
    }

    if (
      ev.category &&
      ev.category !== "all" &&
      (ev.event_type === "view_item" || ev.event_type === "add_to_cart")
    ) {
      const label = CATEGORY_LABELS_AR[ev.category] || ev.category;
      const curCat = categoryMap.get(label) || {
        category: label,
        views: 0,
        addToCartCount: 0,
      };
      if (ev.event_type === "view_item") curCat.views += 1;
      if (ev.event_type === "add_to_cart") curCat.addToCartCount += 1;
      categoryMap.set(label, curCat);
    }
  }

  // Peak hours calculation (highlight top 3 hours above 80% of max or top hour)
  const maxHourInteractions = hourlyBuckets.reduce(
    (max, h) => Math.max(max, h.totalInteractions),
    0
  );
  let peakBucket = hourlyBuckets[0];
  for (const h of hourlyBuckets) {
    if (h.totalInteractions > peakBucket.totalInteractions) {
      peakBucket = h;
    }
  }
  const peakCutoff = Math.max(1, Math.floor(maxHourInteractions * 0.78));
  for (const h of hourlyBuckets) {
    h.isPeak = maxHourInteractions > 0 && h.totalInteractions >= peakCutoff;
  }

  // Top Viewed Products ranked by views desc, then addToCartCount desc
  const topViewedProducts: ProductBehaviorStat[] = Array.from(productMap.values())
    .sort((a, b) => b.views - a.views || b.addToCartCount - a.addToCartCount)
    .slice(0, 10)
    .map((p) => ({
      productId: p.productId,
      productName: p.productName,
      category: p.category,
      views: p.views,
      addToCartCount: p.addToCartCount,
      purchaseCount: p.purchaseCount,
      viewToCartRatePercent:
        p.views > 0 ? Math.round((p.addToCartCount / p.views) * 1000) / 10 : 0,
      viewToPurchaseRatePercent:
        p.views > 0 ? Math.round((p.purchaseCount / p.views) * 1000) / 10 : 0,
      revenueSar: Math.round(p.revenueSar * 100) / 100,
    }));

  const totalCatViews = Array.from(categoryMap.values()).reduce(
    (sum, c) => sum + c.views,
    0
  );
  const categoryInterest: CategoryBehaviorStat[] = Array.from(categoryMap.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 6)
    .map((c) => ({
      category: c.category,
      views: c.views,
      addToCartCount: c.addToCartCount,
      sharePercent:
        totalCatViews > 0
          ? Math.round((c.views / totalCatViews) * 1000) / 10
          : 0,
    }));

  const topSearchTerms: SearchTermStat[] = Array.from(searchMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }));

  const totalEvents = events.length;
  const deviceBreakdown: DeviceBehaviorStat[] = [
    {
      device: "mobile",
      labelAr: "الهاتف الجوال",
      eventsCount: deviceCounts.mobile,
      percentage:
        totalEvents > 0
          ? Math.round((deviceCounts.mobile / totalEvents) * 1000) / 10
          : 0,
    },
    {
      device: "desktop",
      labelAr: "الكمبيوتر المكتبي",
      eventsCount: deviceCounts.desktop,
      percentage:
        totalEvents > 0
          ? Math.round((deviceCounts.desktop / totalEvents) * 1000) / 10
          : 0,
    },
    {
      device: "tablet",
      labelAr: "الجهاز اللوحي",
      eventsCount: deviceCounts.tablet,
      percentage:
        totalEvents > 0
          ? Math.round((deviceCounts.tablet / totalEvents) * 1000) / 10
          : 0,
    },
  ];

  const viewToCartRatePercent =
    productViews > 0 ? Math.round((addToCartCount / productViews) * 1000) / 10 : 0;
  const conversionRatePercent =
    productViews > 0 ? Math.round((purchaseCount / productViews) * 1000) / 10 : 0;

  const maskedGa = maskMeasurementId(gaMeasurementId);
  const recommendations: BehaviorRecommendation[] = [];

  if (peakBucket.totalInteractions > 0) {
    recommendations.push({
      id: "rec-peak-hour",
      priority: "high",
      titleAr: `ذروة النشاط الساعة ${peakBucket.label}`,
      detailAr: `يسجل المتجر أعلى معدل تصفح وإضافة للسلة في الساعة ${peakBucket.label} بواقع ${peakBucket.totalInteractions} تفاعل.`,
      actionAr: "جدولة العروض الخاطفة وإشعارات التخفيض قبل الذروة بـ 30 دقيقة",
    });
  }

  const topProd = topViewedProducts[0];
  if (topProd) {
    recommendations.push({
      id: "rec-top-product",
      priority: "medium",
      titleAr: `المنتج الأكثر مشاهدة: ${topProd.productName}`,
      detailAr: `حصد ${topProd.views} مشاهدة بنسبة إضافة للسلة ${topProd.viewToCartRatePercent}% وتحويل شراء ${topProd.viewToPurchaseRatePercent}%.`,
      actionAr:
        topProd.viewToCartRatePercent < 20
          ? "مراجعة التسعير أو إضافة شارة عرض مؤقت لرفع معدل الإضافة للسلة"
          : "الحفاظ على توفر المخزون وتثبيته في الصفحة الرئيسية",
    });
  }

  if (deviceCounts.mobile >= deviceCounts.desktop && totalEvents > 0) {
    const mobilePct = Math.round((deviceCounts.mobile / totalEvents) * 100);
    recommendations.push({
      id: "rec-mobile-first",
      priority: "info",
      titleAr: `هيمنة زيارات الجوال (${mobilePct}%)`,
      detailAr: `أغلب المتسوقين يتصفحون عبر الهواتف الذكية، مما يجعل سرعة إتمام الدفع عبر Apple Pay و STC Pay حاسمة.`,
      actionAr: "التأكد من إبراز أزرار الشراء السريع في بطاقات الجوال",
    });
  }

  return {
    range,
    generatedAt: new Date().toISOString(),
    gaStatus: {
      library: "react-ga4",
      measurementIdConfigured: Boolean(maskedGa),
      measurementIdMasked: maskedGa,
      firstPartyCollectorActive: true,
    },
    summary: {
      totalEvents,
      uniqueSessions: uniqueSessions.size,
      pageViews,
      productViews,
      addToCartCount,
      checkoutCount,
      purchaseCount,
      viewToCartRatePercent,
      conversionRatePercent,
      peakHour: peakBucket.hour,
      peakHourLabel: peakBucket.label,
      peakHourEvents: peakBucket.totalInteractions,
    },
    hourlyTraffic: hourlyBuckets,
    topViewedProducts,
    categoryInterest,
    topSearchTerms,
    deviceBreakdown,
    recommendations,
  };
}
