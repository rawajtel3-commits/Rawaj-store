import crypto from "crypto";
import type {
  AdminModificationCategory,
  AdminModificationLogEntry,
  AdminModificationLogsResponse,
} from "../src/types.js";
import {
  adminModificationQueries,
  type AdminModificationLogRow,
} from "./sqliteStore.js";

const ALLOWED_CATEGORIES = new Set<AdminModificationCategory>([
  "price_change",
  "stock_update",
  "permission_change",
  "product_catalog",
  "settings_update",
]);

const ALLOWED_TARGET_TYPES = new Set<AdminModificationLogEntry["targetType"]>([
  "product",
  "role",
  "feature_flag",
  "store_settings",
  "order",
]);

function cleanModText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, maxLen);
}

export function maskAdminEmail(email: string): string {
  const clean = cleanModText(email, 180).toLowerCase();
  const atIdx = clean.indexOf("@");
  if (atIdx <= 0) return clean || "unknown";
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  if (local.length <= 2) return `${local[0] || "*"}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export function normalizeModIp(rawIp: unknown): string {
  const s = cleanModText(String(rawIp || ""), 80);
  if (!s) return "127.0.0.1";
  return s.split(",")[0].trim().replace(/^::ffff:/i, "") || "127.0.0.1";
}

function mapRowToEntry(row: AdminModificationLogRow): AdminModificationLogEntry {
  return {
    id: row.id,
    category: (ALLOWED_CATEGORIES.has(row.category as AdminModificationCategory)
      ? row.category
      : "settings_update") as AdminModificationCategory,
    actionLabelAr: row.action_label_ar,
    targetType: (ALLOWED_TARGET_TYPES.has(row.target_type as AdminModificationLogEntry["targetType"])
      ? row.target_type
      : "store_settings") as AdminModificationLogEntry["targetType"],
    targetId: row.target_id,
    targetName: row.target_name,
    fieldLabelAr: row.field_label_ar,
    previousValue: row.previous_value,
    newValue: row.new_value,
    summaryAr: row.summary_ar,
    actorUid: row.actor_uid,
    actorName: row.actor_name,
    actorEmailMasked: row.actor_email_masked,
    actorRole: row.actor_role,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

export function recordAdminModification(params: {
  category: AdminModificationCategory;
  actionLabelAr: string;
  targetType: AdminModificationLogEntry["targetType"];
  targetId: string;
  targetName: string;
  fieldLabelAr: string;
  previousValue: string;
  newValue: string;
  summaryAr: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  ipAddress?: string;
  createdAt?: string;
}): AdminModificationLogEntry {
  const category = ALLOWED_CATEGORIES.has(params.category)
    ? params.category
    : "settings_update";
  const targetType = ALLOWED_TARGET_TYPES.has(params.targetType)
    ? params.targetType
    : "store_settings";

  const id = `amod-${crypto.randomBytes(6).toString("hex")}`;
  const createdAt = params.createdAt || new Date().toISOString();
  const actorNameClean =
    cleanModText(params.actorName, 100) ||
    cleanModText(params.actorEmail, 100) ||
    "مسؤول النظام";

  const row: AdminModificationLogRow = {
    id,
    category,
    action_label_ar: cleanModText(params.actionLabelAr, 80) || "تعديل إداري",
    target_type: targetType,
    target_id: cleanModText(params.targetId, 80) || "system",
    target_name: cleanModText(params.targetName, 140) || "عنصر النظام",
    field_label_ar: cleanModText(params.fieldLabelAr, 60) || "القيمة",
    previous_value: cleanModText(params.previousValue, 120) || "—",
    new_value: cleanModText(params.newValue, 120) || "—",
    summary_ar: cleanModText(params.summaryAr, 240) || "تم تنفيذ تعديل إداري",
    actor_uid: cleanModText(params.actorUid, 128) || "admin",
    actor_name: actorNameClean,
    actor_email_masked: maskAdminEmail(params.actorEmail),
    actor_role: cleanModText(params.actorRole, 32) || "user_admin",
    ip_address: normalizeModIp(params.ipAddress),
    created_at: createdAt,
  };

  adminModificationQueries.insertModification(row);
  return mapRowToEntry(row);
}

export interface ValidClientModification {
  category: AdminModificationCategory;
  actionLabelAr: string;
  targetType: AdminModificationLogEntry["targetType"];
  targetId: string;
  targetName: string;
  fieldLabelAr: string;
  previousValue: string;
  newValue: string;
  summaryAr: string;
}

export function validateClientModificationPayload(
  body: unknown
): { ok: true; data: ValidClientModification } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "صيغة بيانات سجل التعديل غير صالحة." };
  }
  const raw = body as Record<string, unknown>;
  const category = cleanModText(raw.category, 32) as AdminModificationCategory;
  if (!ALLOWED_CATEGORIES.has(category)) {
    return { error: "تصنيف التعديل الإداري غير مدعوم." };
  }

  const targetType = cleanModText(raw.targetType, 32) as AdminModificationLogEntry["targetType"];
  if (!ALLOWED_TARGET_TYPES.has(targetType)) {
    return { error: "نوع العنصر المستهدف غير صالح." };
  }

  const targetId = cleanModText(raw.targetId, 80);
  const targetName = cleanModText(raw.targetName, 140);
  const previousValue = cleanModText(raw.previousValue, 120);
  const newValue = cleanModText(raw.newValue, 120);
  const actionLabelAr = cleanModText(raw.actionLabelAr, 80);
  const fieldLabelAr = cleanModText(raw.fieldLabelAr, 60);
  const summaryAr = cleanModText(raw.summaryAr, 240);

  if (!targetId || !targetName || !newValue) {
    return { error: "بيانات العنصر المعدّل والقيمة الجديدة مطلوبة لتوثيق السجل." };
  }

  return {
    ok: true,
    data: {
      category,
      actionLabelAr: actionLabelAr || "تعديل إداري",
      targetType,
      targetId,
      targetName,
      fieldLabelAr: fieldLabelAr || "القيمة",
      previousValue: previousValue || "—",
      newValue,
      summaryAr: summaryAr || `${actionLabelAr || "تعديل"}: ${targetName}`,
    },
  };
}

export function seedAdminModificationBaselineIfEmpty(): void {
  if (adminModificationQueries.countModifications() > 0) return;

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  const initialRows: AdminModificationLogRow[] = [
    {
      id: "amod-seed-001",
      category: "price_change",
      action_label_ar: "تخفيض سعر منتج",
      target_type: "product",
      target_id: "prod-2",
      target_name: "ساعة رواج الذكية Ultra Fit 3",
      field_label_ar: "السعر",
      previous_value: "1,599 ر.س",
      new_value: "1,299 ر.س",
      summary_ar: "تخفيض سعر الساعة الذكية وإطلاق تنبيه السعر للمشتركين",
      actor_uid: "seed-promoter-1",
      actor_name: "إدارة متجر رواج (المروّج)",
      actor_email_masked: "te***j@gmail.com",
      actor_role: "promoter_admin",
      ip_address: "10.24.0.14",
      created_at: hoursAgo(2),
    },
    {
      id: "amod-seed-002",
      category: "stock_update",
      action_label_ar: "تحديث كمية المخزون",
      target_type: "product",
      target_id: "prod-1",
      target_name: "حاسوب نيوبروم بوك برو 16 (Pro M3 Max)",
      field_label_ar: "الكمية المتوفرة",
      previous_value: "9 قطعة",
      new_value: "14 قطعة",
      summary_ar: "توريد دفعة مخزون جديدة للمستودع الرئيسي (+5 قطع)",
      actor_uid: "seed-ops-2",
      actor_name: "مشرف العمليات والمخزون",
      actor_email_masked: "op***s@rawaj.store",
      actor_role: "user_admin",
      ip_address: "10.24.0.28",
      created_at: hoursAgo(5),
    },
    {
      id: "amod-seed-003",
      category: "permission_change",
      action_label_ar: "منح صلاحيات أدمن المتجر",
      target_type: "role",
      target_id: "ops@rawaj.store",
      target_name: "op***s@rawaj.store",
      field_label_ar: "الدور الوظيفي",
      previous_value: "customer",
      new_value: "user_admin",
      summary_ar: "ترقية حساب العمليات إلى صلاحية user_admin مع عزل خزنة البرومبت",
      actor_uid: "seed-promoter-1",
      actor_name: "إدارة متجر رواج (المروّج)",
      actor_email_masked: "te***j@gmail.com",
      actor_role: "promoter_admin",
      ip_address: "10.24.0.14",
      created_at: hoursAgo(11),
    },
    {
      id: "amod-seed-004",
      category: "price_change",
      action_label_ar: "تعديل سعر منتج",
      target_type: "product",
      target_id: "prod-1",
      target_name: "حاسوب نيوبروم بوك برو 16 (Pro M3 Max)",
      field_label_ar: "السعر",
      previous_value: "9,999 ر.س",
      new_value: "8,999 ر.س",
      summary_ar: "تحديث السعر الترويجي لفئة أجهزة الحاسوب الاحترافية",
      actor_uid: "seed-promoter-1",
      actor_name: "إدارة متجر رواج (المروّج)",
      actor_email_masked: "te***j@gmail.com",
      actor_role: "promoter_admin",
      ip_address: "10.24.0.14",
      created_at: hoursAgo(18),
    },
    {
      id: "amod-seed-005",
      category: "stock_update",
      action_label_ar: "تحديث كمية المخزون",
      target_type: "product",
      target_id: "prod-2",
      target_name: "ساعة رواج الذكية Ultra Fit 3",
      field_label_ar: "الكمية المتوفرة",
      previous_value: "18 قطعة",
      new_value: "28 قطعة",
      summary_ar: "إعادة تعبئة مخزون الساعات الذكية استعداداً لفترة الذروة",
      actor_uid: "seed-ops-2",
      actor_name: "مشرف العمليات والمخزون",
      actor_email_masked: "op***s@rawaj.store",
      actor_role: "user_admin",
      ip_address: "10.24.0.28",
      created_at: hoursAgo(27),
    },
    {
      id: "amod-seed-006",
      category: "settings_update",
      action_label_ar: "تحديث سعر صرف العملات",
      target_type: "store_settings",
      target_id: "currency-settings",
      target_name: "سعر الصرف وإعدادات الضريبة",
      field_label_ar: "سعر الصرف (YER)",
      previous_value: "650 ر.ي",
      new_value: "670 ر.ي",
      summary_ar: "تحديث سعر الصرف المعتمد للريال اليمني مقابل الريال السعودي",
      actor_uid: "seed-promoter-1",
      actor_name: "إدارة متجر رواج (المروّج)",
      actor_email_masked: "te***j@gmail.com",
      actor_role: "promoter_admin",
      ip_address: "10.24.0.14",
      created_at: hoursAgo(36),
    },
  ];

  adminModificationQueries.insertBatch(initialRows);
}

export function listAdminModificationLogs(options?: {
  category?: string;
  search?: string;
  limit?: number;
}): AdminModificationLogsResponse {
  const allRows = adminModificationQueries.listModifications(1000);
  const allEntries = allRows.map(mapRowToEntry);

  let priceChanges = 0;
  let stockUpdates = 0;
  let permissionChanges = 0;
  let otherChanges = 0;

  for (const entry of allEntries) {
    if (entry.category === "price_change") priceChanges += 1;
    else if (entry.category === "stock_update") stockUpdates += 1;
    else if (entry.category === "permission_change") permissionChanges += 1;
    else otherChanges += 1;
  }

  const filterCat = cleanModText(options?.category || "all", 32);
  const q = cleanModText(options?.search || "", 80).toLowerCase();
  const limitRaw = Number(options?.limit || 120);
  const safeLimit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(300, Math.round(limitRaw)))
    : 120;

  const filtered = allEntries
    .filter((entry) => {
      if (
        filterCat &&
        filterCat !== "all" &&
        ALLOWED_CATEGORIES.has(filterCat as AdminModificationCategory) &&
        entry.category !== filterCat
      ) {
        return false;
      }
      if (q) {
        const haystack = [
          entry.actorName,
          entry.actorEmailMasked,
          entry.actorRole,
          entry.actionLabelAr,
          entry.targetName,
          entry.previousValue,
          entry.newValue,
          entry.summaryAr,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .slice(0, safeLimit);

  return {
    logs: filtered,
    summary: {
      total: allEntries.length,
      priceChanges,
      stockUpdates,
      permissionChanges,
      otherChanges,
    },
  };
}
