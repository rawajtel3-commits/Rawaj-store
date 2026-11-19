import crypto from "crypto";
import type { MerchantRatingEntry, MerchantRatingSummary } from "../src/types.js";
import { computeMerchantRatingSummary } from "../src/utils/brands.js";
import { merchantRatingQueries, type MerchantRatingRow } from "./sqliteStore.js";

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, maxLen);
}

export function isValidBrandSlug(slug: string): boolean {
  return /^[a-z0-9\-_%]{1,80}$/i.test(slug.trim());
}

function mapRowToEntry(row: MerchantRatingRow): MerchantRatingEntry {
  return {
    id: row.id,
    brandSlug: row.brand_slug,
    brandName: row.brand_name,
    reviewerName: row.reviewer_name,
    prepSpeedRating: row.prep_speed_rating,
    packagingQualityRating: row.packaging_quality_rating,
    overallRating: Number(row.overall_rating.toFixed(1)),
    comment: row.comment || undefined,
    orderNumber: row.order_number || undefined,
    verifiedOrder: Boolean(row.verified_order),
    createdAt: row.created_at,
  };
}

export function seedMerchantRatingsIfEmpty(): void {
  if (merchantRatingQueries.countRatings() > 0) return;

  const now = Date.now();
  const seeds: Array<{
    brandSlug: string;
    brandName: string;
    reviewerName: string;
    prepSpeedRating: number;
    packagingQualityRating: number;
    comment: string;
    orderNumber: string;
    hoursAgo: number;
  }> = [
    {
      brandSlug: "rawaj",
      brandName: "رواج (Rawaj)",
      reviewerName: "فهد العتيبي",
      prepSpeedRating: 5,
      packagingQualityRating: 5,
      comment: "تم تجهيز الطلب خلال ساعتين وتغليف الشحنة بطبقات حماية محكمة جداً.",
      orderNumber: "ORD-2026-8891",
      hoursAgo: 14,
    },
    {
      brandSlug: "rawaj",
      brandName: "رواج (Rawaj)",
      reviewerName: "سارة باوزير",
      prepSpeedRating: 5,
      packagingQualityRating: 4,
      comment: "سرعة ممتازة في التسليم لشركة الشحن وصندوق أنيق مناسب للإهداء.",
      orderNumber: "ORD-2026-8824",
      hoursAgo: 42,
    },
    {
      brandSlug: "neoprom",
      brandName: "نيوبروم (NeoProm)",
      reviewerName: "ماجد القحطاني",
      prepSpeedRating: 5,
      packagingQualityRating: 5,
      comment: "التجهيز كان فورياً مع ختم حماية أصلية على كرتون الجهاز.",
      orderNumber: "ORD-2026-8740",
      hoursAgo: 20,
    },
    {
      brandSlug: "neoprom",
      brandName: "نيوبروم (NeoProm)",
      reviewerName: "طارق الحضرمي",
      prepSpeedRating: 4,
      packagingQualityRating: 5,
      comment: "تغليف آمن ضد الصدمات وتأمين كامل للشاشة والملحقات.",
      orderNumber: "",
      hoursAgo: 70,
    },
    {
      brandSlug: "titan",
      brandName: "تايتن (Titan)",
      reviewerName: "عبدالرحمن الشمري",
      prepSpeedRating: 5,
      packagingQualityRating: 5,
      comment: "وصلت الساعة في علبة محكمة الغلق ومبطنة بالإسفنج خلال وقت قياسي.",
      orderNumber: "ORD-2026-8699",
      hoursAgo: 28,
    },
    {
      brandSlug: "cinecam",
      brandName: "سيني كام (CineCam)",
      reviewerName: "نواف الدوسري",
      prepSpeedRating: 4,
      packagingQualityRating: 5,
      comment: "عناية فائقة بتغليف الكاميرا والعدسات وبطانات هوائية داخلية.",
      orderNumber: "ORD-2026-8612",
      hoursAgo: 55,
    },
    {
      brandSlug: "ultrasight",
      brandName: "ألترا سايت (UltraSight)",
      reviewerName: "خالد المنصوري",
      prepSpeedRating: 5,
      packagingQualityRating: 4,
      comment: "شحن سريع وتجهيز دقيق مع فاتورة الضمان المرفقة داخل الكرتون.",
      orderNumber: "ORD-2026-8580",
      hoursAgo: 62,
    },
    {
      brandSlug: "espresso-master",
      brandName: "إسبريسو ماستر (Espresso Master)",
      reviewerName: "ياسر الزهراني",
      prepSpeedRating: 5,
      packagingQualityRating: 5,
      comment: "تغليف مزدوج للماكينة يحميها تماماً من الصدمات، والتجهيز تم في نفس اليوم.",
      orderNumber: "ORD-2026-8511",
      hoursAgo: 31,
    },
  ];

  const rows: MerchantRatingRow[] = seeds.map((s, idx) => ({
    id: `mrat-seed-${idx + 1}`,
    brand_slug: s.brandSlug,
    brand_name: s.brandName,
    reviewer_name: s.reviewerName,
    prep_speed_rating: s.prepSpeedRating,
    packaging_quality_rating: s.packagingQualityRating,
    overall_rating: Number(((s.prepSpeedRating + s.packagingQualityRating) / 2).toFixed(1)),
    comment: s.comment,
    order_number: s.orderNumber,
    verified_order: s.orderNumber ? 1 : 0,
    created_at: new Date(now - s.hoursAgo * 60 * 60 * 1000).toISOString(),
  }));

  merchantRatingQueries.insertBatch(rows);
}

export interface ValidatedMerchantRatingInput {
  brandSlug: string;
  brandName: string;
  reviewerName: string;
  prepSpeedRating: number;
  packagingQualityRating: number;
  comment: string;
  orderNumber: string;
}

export function validateMerchantRatingPayload(
  brandSlugRaw: string,
  body: unknown
): { data: ValidatedMerchantRatingInput } | { error: string } {
  const brandSlug = cleanText(brandSlugRaw, 80).toLowerCase();
  if (!isValidBrandSlug(brandSlug)) {
    return { error: "معرّف العلامة التجارية غير صالح." };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "بنية بيانات التقييم غير صالحة." };
  }

  const record = body as Record<string, unknown>;
  const reviewerName = cleanText(record.reviewerName, 60);
  if (reviewerName.length < 2) {
    return { error: "يرجى كتابة اسم المقيّم (حرفان على الأقل)." };
  }

  const prepSpeedRating = Number(record.prepSpeedRating);
  const packagingQualityRating = Number(record.packagingQualityRating);

  if (
    !Number.isInteger(prepSpeedRating) ||
    prepSpeedRating < 1 ||
    prepSpeedRating > 5
  ) {
    return { error: "تقييم سرعة تجهيز الطلبات يجب أن يكون من 1 إلى 5 نجوم." };
  }

  if (
    !Number.isInteger(packagingQualityRating) ||
    packagingQualityRating < 1 ||
    packagingQualityRating > 5
  ) {
    return { error: "تقييم جودة التغليف يجب أن يكون من 1 إلى 5 نجوم." };
  }

  const brandName = cleanText(record.brandName, 100) || brandSlug;
  const comment = cleanText(record.comment, 400);
  const rawOrder = cleanText(record.orderNumber, 32).toUpperCase();
  if (rawOrder && !/^[A-Z0-9-]{4,32}$/.test(rawOrder)) {
    return { error: "صيغة رقم الطلب المرجعي غير صالحة." };
  }

  return {
    data: {
      brandSlug,
      brandName,
      reviewerName,
      prepSpeedRating,
      packagingQualityRating,
      comment,
      orderNumber: rawOrder,
    },
  };
}

export function listMerchantRatingSummaries(
  brandSlug?: string
): Record<string, MerchantRatingSummary> {
  if (brandSlug && isValidBrandSlug(brandSlug)) {
    const cleanSlug = brandSlug.trim().toLowerCase();
    const rows = merchantRatingQueries.listRatingsByBrand(cleanSlug, 100);
    const entries = rows.map(mapRowToEntry);
    return {
      [cleanSlug]: computeMerchantRatingSummary(cleanSlug, entries),
    };
  }

  const rows = merchantRatingQueries.listAllRatings(500);
  const entries = rows.map(mapRowToEntry);
  const groupedSlugs = Array.from(new Set(entries.map((e) => e.brandSlug)));
  const summaries: Record<string, MerchantRatingSummary> = {};
  for (const slug of groupedSlugs) {
    summaries[slug] = computeMerchantRatingSummary(slug, entries);
  }
  return summaries;
}

export function recordMerchantRating(input: ValidatedMerchantRatingInput): {
  entry: MerchantRatingEntry;
  summary: MerchantRatingSummary;
} {
  const overallRating = Number(
    ((input.prepSpeedRating + input.packagingQualityRating) / 2).toFixed(1)
  );
  const row: MerchantRatingRow = {
    id: `mrat-${crypto.randomBytes(6).toString("hex")}`,
    brand_slug: input.brandSlug,
    brand_name: input.brandName,
    reviewer_name: input.reviewerName,
    prep_speed_rating: input.prepSpeedRating,
    packaging_quality_rating: input.packagingQualityRating,
    overall_rating: overallRating,
    comment: input.comment,
    order_number: input.orderNumber,
    verified_order: input.orderNumber ? 1 : 0,
    created_at: new Date().toISOString(),
  };

  merchantRatingQueries.insertRating(row);
  const updatedRows = merchantRatingQueries.listRatingsByBrand(input.brandSlug, 100);
  const entries = updatedRows.map(mapRowToEntry);

  return {
    entry: mapRowToEntry(row),
    summary: computeMerchantRatingSummary(input.brandSlug, entries),
  };
}
