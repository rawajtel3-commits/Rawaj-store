import crypto from "crypto";
import type {
  AdminSecurityAlertsResponse,
  SecurityAlertEmailStatus,
  SecurityAlertRecord,
  SecurityAlertRuleCode,
  SecurityAlertSettings,
  SecurityAlertSeverity,
  SecurityAlertStatus,
} from "../src/types.js";
import { maskActorEmail } from "./promptVault.js";
import {
  securityAlertQueries,
  type SecurityAlertRow,
  type SecurityAlertSettingsRow,
} from "./sqliteStore.js";

const DEFAULT_RECIPIENT_EMAIL = "telrawaj@gmail.com";

function getEmailTransportMode(): "resend" | "webhook" | "dashboard_only" {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey && resendKey !== "MY_RESEND_API_KEY") {
    return "resend";
  }
  const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL?.trim();
  if (webhookUrl && /^https:\/\/[a-z0-9.-]+/i.test(webhookUrl)) {
    return "webhook";
  }
  return "dashboard_only";
}

function mapSettingsRow(row?: SecurityAlertSettingsRow): SecurityAlertSettings {
  if (!row) {
    return {
      dashboardEnabled: true,
      emailEnabled: true,
      recipientEmail: DEFAULT_RECIPIENT_EMAIL,
      multiIpThreshold: 3,
      repeatedAttemptsThreshold: 5,
      windowMinutes: 15,
      updatedAt: new Date().toISOString(),
      updatedBy: "system-bootstrap",
    };
  }
  return {
    dashboardEnabled: row.dashboard_enabled === 1,
    emailEnabled: row.email_enabled === 1,
    recipientEmail: row.recipient_email,
    multiIpThreshold: row.multi_ip_threshold,
    repeatedAttemptsThreshold: row.repeated_attempts_threshold,
    windowMinutes: row.window_minutes,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function safeParseStringArray(jsonStr: string): string[] {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

function mapAlertRow(row: SecurityAlertRow): SecurityAlertRecord {
  return {
    id: row.id,
    ruleCode: row.rule_code as SecurityAlertRuleCode,
    severity: row.severity,
    status: row.status,
    titleAr: row.title_ar,
    descriptionAr: row.description_ar,
    distinctIpCount: row.distinct_ip_count,
    attemptCount: row.attempt_count,
    ips: safeParseStringArray(row.ips_json),
    routes: safeParseStringArray(row.routes_json),
    actorSummary: row.actor_summary,
    emailStatus: row.email_status,
    ...(row.email_recipient ? { emailRecipient: row.email_recipient } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.resolved_by ? { resolvedBy: row.resolved_by } : {}),
  };
}

export function getSecurityAlertSettings(): SecurityAlertSettings {
  const existing = securityAlertQueries.getAlertSettings();
  if (existing) return mapSettingsRow(existing);
  const now = new Date().toISOString();
  securityAlertQueries.upsertAlertSettings({
    dashboard_enabled: 1,
    email_enabled: 1,
    recipient_email: DEFAULT_RECIPIENT_EMAIL,
    multi_ip_threshold: 3,
    repeated_attempts_threshold: 5,
    window_minutes: 15,
    updated_at: now,
    updated_by: "system-bootstrap",
  });
  return mapSettingsRow(securityAlertQueries.getAlertSettings());
}

export function saveSecurityAlertSettings(
  input: {
    dashboardEnabled: boolean;
    emailEnabled: boolean;
    recipientEmail: string;
    multiIpThreshold: number;
    repeatedAttemptsThreshold: number;
    windowMinutes: number;
  },
  updatedByEmail: string
): SecurityAlertSettings {
  const now = new Date().toISOString();
  securityAlertQueries.upsertAlertSettings({
    dashboard_enabled: input.dashboardEnabled ? 1 : 0,
    email_enabled: input.emailEnabled ? 1 : 0,
    recipient_email: input.recipientEmail.trim().toLowerCase(),
    multi_ip_threshold: Math.max(2, Math.min(20, Math.round(input.multiIpThreshold))),
    repeated_attempts_threshold: Math.max(2, Math.min(50, Math.round(input.repeatedAttemptsThreshold))),
    window_minutes: Math.max(1, Math.min(120, Math.round(input.windowMinutes))),
    updated_at: now,
    updated_by: maskActorEmail(updatedByEmail),
  });
  return getSecurityAlertSettings();
}

async function dispatchAlertEmail(
  alert: SecurityAlertRecord,
  settings: SecurityAlertSettings
): Promise<SecurityAlertEmailStatus> {
  if (!settings.emailEnabled || !settings.recipientEmail) {
    return "disabled";
  }

  const mode = getEmailTransportMode();
  if (mode === "dashboard_only") {
    return "dashboard_only";
  }

  const subject = `[تنبيه أمني - ${alert.severity.toUpperCase()}] ${alert.titleAr}`;
  const textBody = [
    `تنبيه أمني من نظام حماية متجر رواج`,
    `القاعدة: ${alert.ruleCode}`,
    `الخطورة: ${alert.severity}`,
    `العنوان: ${alert.titleAr}`,
    `التفاصيل: ${alert.descriptionAr}`,
    `عدد عناوين IP المختلفة: ${alert.distinctIpCount}`,
    `إجمالي المحاولات: ${alert.attemptCount}`,
    `عناوين IP المرصودة: ${alert.ips.join(", ") || "غير محدد"}`,
    `المسارات المستهدفة: ${alert.routes.join(", ")}`,
    `الوقت: ${alert.updatedAt}`,
  ].join("\n");

  try {
    if (mode === "resend") {
      const apiKey = process.env.RESEND_API_KEY?.trim() || "";
      const fromEmail = process.env.SECURITY_ALERT_FROM_EMAIL?.trim() || "security@rawaj.store";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [settings.recipientEmail],
          subject,
          text: textBody,
        }),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok ? "sent" : "failed";
    }

    if (mode === "webhook") {
      const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL?.trim() || "";
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rawaj.security_alert",
          recipientEmail: settings.recipientEmail,
          subject,
          alert,
        }),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok ? "sent" : "failed";
    }
  } catch {
    return "failed";
  }
  return "dashboard_only";
}

function sanitizeClientIp(rawIp: string | undefined): string {
  const raw = String(rawIp || "127.0.0.1")
    .split(",")[0]
    .trim()
    .replace(/^::ffff:/, "");
  return raw.slice(0, 64) || "127.0.0.1";
}

function upsertAnomalyAlert(params: {
  ruleCode: SecurityAlertRuleCode;
  severity: SecurityAlertSeverity;
  titleAr: string;
  descriptionAr: string;
  distinctIpCount: number;
  attemptCount: number;
  ips: string[];
  routes: string[];
  actorSummary: string;
  windowMinutes: number;
  settings: SecurityAlertSettings;
}): SecurityAlertRecord {
  const nowIso = new Date().toISOString();
  const dedupeSinceIso = new Date(Date.now() - params.windowMinutes * 60_000).toISOString();
  const existing = securityAlertQueries.findActiveAlertByRuleSince(params.ruleCode, dedupeSinceIso);

  const uniqueIps = Array.from(new Set(params.ips)).slice(0, 15);
  const uniqueRoutes = Array.from(new Set(params.routes)).slice(0, 10);

  if (existing) {
    securityAlertQueries.updateSecurityAlertCounters({
      id: existing.id,
      severity: params.severity,
      title_ar: params.titleAr,
      description_ar: params.descriptionAr,
      distinct_ip_count: params.distinctIpCount,
      attempt_count: params.attemptCount,
      ips_json: JSON.stringify(uniqueIps),
      routes_json: JSON.stringify(uniqueRoutes),
      actor_summary: params.actorSummary,
      updated_at: nowIso,
    });
    const updatedRow = securityAlertQueries.getSecurityAlertById(existing.id) || existing;
    return mapAlertRow(updatedRow);
  }

  const initialEmailStatus: SecurityAlertEmailStatus = !params.settings.emailEnabled
    ? "disabled"
    : getEmailTransportMode() === "dashboard_only"
    ? "dashboard_only"
    : "dashboard_only";

  const newRow: SecurityAlertRow = {
    id: `salert-${crypto.randomBytes(6).toString("hex")}`,
    rule_code: params.ruleCode,
    severity: params.severity,
    status: "unread",
    title_ar: params.titleAr,
    description_ar: params.descriptionAr,
    distinct_ip_count: params.distinctIpCount,
    attempt_count: params.attemptCount,
    ips_json: JSON.stringify(uniqueIps),
    routes_json: JSON.stringify(uniqueRoutes),
    actor_summary: params.actorSummary,
    email_status: initialEmailStatus,
    email_recipient: params.settings.emailEnabled ? params.settings.recipientEmail : null,
    created_at: nowIso,
    updated_at: nowIso,
    resolved_by: null,
  };

  securityAlertQueries.insertSecurityAlert(newRow);
  const created = mapAlertRow(newRow);

  // Dispatch external email asynchronously if transport is configured
  if (params.settings.emailEnabled && getEmailTransportMode() !== "dashboard_only") {
    void dispatchAlertEmail(created, params.settings).then((finalStatus) => {
      securityAlertQueries.updateSecurityAlertEmailStatus(
        created.id,
        finalStatus,
        params.settings.recipientEmail
      );
    });
  }

  return created;
}

export function evaluateSuspiciousAdminActivity(params: {
  ipAddress: string;
  routeKey: string;
  actorUid?: string;
  actorEmail?: string;
  statusCode: number;
  eventKind: "admin_denied" | "pin_failed" | "role_escalation";
  userAgent?: string;
}): SecurityAlertRecord[] {
  const settings = getSecurityAlertSettings();
  const cleanIp = sanitizeClientIp(params.ipAddress);
  const maskedEmail = params.actorEmail ? maskActorEmail(params.actorEmail) : "anonymous";
  const nowIso = new Date().toISOString();

  securityAlertQueries.insertAdminAccessEvent({
    ip_address: cleanIp,
    route_key: params.routeKey.slice(0, 120),
    actor_uid: String(params.actorUid || "anonymous").slice(0, 128),
    actor_email_masked: maskedEmail,
    status_code: params.statusCode,
    event_kind: params.eventKind,
    user_agent: String(params.userAgent || "unknown").slice(0, 120),
    created_at: nowIso,
  });

  const sinceIso = new Date(Date.now() - settings.windowMinutes * 60_000).toISOString();
  const recentEvents = securityAlertQueries.listAdminAccessEventsSince(sinceIso, 1000);

  const distinctIps = Array.from(new Set(recentEvents.map((e) => e.ip_address)));
  const distinctRoutes = Array.from(new Set(recentEvents.map((e) => e.route_key)));
  const distinctActors = Array.from(new Set(recentEvents.map((e) => e.actor_email_masked)));
  const actorSummary = distinctActors.slice(0, 3).join(", ");

  const triggered: SecurityAlertRecord[] = [];

  // Rule 1: Multi-IP probes against admin/security routes within window
  if (distinctIps.length >= settings.multiIpThreshold) {
    triggered.push(
      upsertAnomalyAlert({
        ruleCode: "MULTI_IP_ADMIN_PROBE",
        severity: distinctIps.length >= settings.multiIpThreshold + 2 ? "critical" : "high",
        titleAr: `محاولات وصول مرفوضة لصفحات الإدارة من ${distinctIps.length} عناوين IP مختلفة`,
        descriptionAr: `تم رصد ${recentEvents.length} محاولة وصول غير مصرح بها إلى نقاط الإدارة من ${distinctIps.length} عناوين IP متفرقة خلال آخر ${settings.windowMinutes} دقيقة.`,
        distinctIpCount: distinctIps.length,
        attemptCount: recentEvents.length,
        ips: distinctIps,
        routes: distinctRoutes,
        actorSummary,
        windowMinutes: settings.windowMinutes,
        settings,
      })
    );
  }

  // Rule 2: Repeated failed admin attempts within window
  if (recentEvents.length >= settings.repeatedAttemptsThreshold) {
    triggered.push(
      upsertAnomalyAlert({
        ruleCode: "REPEATED_ADMIN_DENIALS",
        severity: recentEvents.length >= settings.repeatedAttemptsThreshold * 2 ? "critical" : "high",
        titleAr: `تكرار محاولات اختراق أو وصول مرفوضة (${recentEvents.length} محاولات)`,
        descriptionAr: `تجاوز عدد المحاولات المرفوضة (401/403) العتبة المحددة (${settings.repeatedAttemptsThreshold} محاولات خلال ${settings.windowMinutes} دقيقة).`,
        distinctIpCount: distinctIps.length,
        attemptCount: recentEvents.length,
        ips: distinctIps,
        routes: distinctRoutes,
        actorSummary,
        windowMinutes: settings.windowMinutes,
        settings,
      })
    );
  }

  // Rule 3: Repeated 2FA PIN failures (Brute-force indicator)
  const pinFailures = recentEvents.filter((e) => e.event_kind === "pin_failed");
  if (pinFailures.length >= 3) {
    const pinIps = Array.from(new Set(pinFailures.map((e) => e.ip_address)));
    triggered.push(
      upsertAnomalyAlert({
        ruleCode: "PIN_BRUTE_FORCE",
        severity: pinIps.length >= 2 ? "critical" : "high",
        titleAr: `محاولات تخمين متكررة لرمز التحقق الثنائي (2FA PIN)`,
        descriptionAr: `رُصدت ${pinFailures.length} محاولات فاشلة لإدخال رمز الأمان من ${pinIps.length} عنوان IP خلال ${settings.windowMinutes} دقيقة.`,
        distinctIpCount: pinIps.length,
        attemptCount: pinFailures.length,
        ips: pinIps,
        routes: Array.from(new Set(pinFailures.map((e) => e.route_key))),
        actorSummary: Array.from(new Set(pinFailures.map((e) => e.actor_email_masked))).join(", "),
        windowMinutes: settings.windowMinutes,
        settings,
      })
    );
  }

  // Rule 4: Privilege escalation attempts on promoter_admin-only resources
  if (params.eventKind === "role_escalation") {
    const escalations = recentEvents.filter((e) => e.event_kind === "role_escalation");
    const escIps = Array.from(new Set(escalations.map((e) => e.ip_address)));
    triggered.push(
      upsertAnomalyAlert({
        ruleCode: "ROLE_ESCALATION_ATTEMPT",
        severity: "critical",
        titleAr: `محاولة تصعيد صلاحيات أو وصول غير مصرح به لموارد promoter_admin`,
        descriptionAr: `حاول حساب بصلاحية غير كافية (${maskedEmail}) استدعاء مسار حساس مقتصر على أدمن المروّج (${params.routeKey}).`,
        distinctIpCount: escIps.length,
        attemptCount: escalations.length,
        ips: escIps,
        routes: Array.from(new Set(escalations.map((e) => e.route_key))),
        actorSummary: maskedEmail,
        windowMinutes: settings.windowMinutes,
        settings,
      })
    );
  }

  return triggered;
}

export function listAdminSecurityAlerts(): AdminSecurityAlertsResponse {
  const settings = getSecurityAlertSettings();
  const rows = securityAlertQueries.listSecurityAlerts(50);
  const unreadCount = securityAlertQueries.countUnreadSecurityAlerts();
  const mode = getEmailTransportMode();

  return {
    alerts: rows.map(mapAlertRow),
    unreadCount,
    settings,
    emailTransportConfigured: mode !== "dashboard_only",
    emailTransportMode: mode,
  };
}

export function updateAlertStatusById(
  alertId: string,
  status: Exclude<SecurityAlertStatus, "unread">,
  actorEmail: string
): SecurityAlertRecord | null {
  const existing = securityAlertQueries.getSecurityAlertById(alertId);
  if (!existing) return null;
  securityAlertQueries.updateSecurityAlertStatus(
    alertId,
    status,
    status === "resolved" ? maskActorEmail(actorEmail) : existing.resolved_by
  );
  const updated = securityAlertQueries.getSecurityAlertById(alertId);
  return updated ? mapAlertRow(updated) : null;
}

export async function triggerTestSecurityAlert(
  actorEmail: string,
  sourceIp: string
): Promise<SecurityAlertRecord> {
  const settings = getSecurityAlertSettings();
  const nowIso = new Date().toISOString();
  const row: SecurityAlertRow = {
    id: `salert-test-${crypto.randomBytes(4).toString("hex")}`,
    rule_code: "MANUAL_TEST_ALERT",
    severity: "medium",
    status: "unread",
    title_ar: "تنبيه أمني تجريبي للتحقق من قناة الإشعارات والبريد",
    description_ar: `تم إطلاق اختبار تنبيه يدوي من لوحة التحكم للتحقق من فورية التنبيهات (${maskActorEmail(actorEmail)}).`,
    distinct_ip_count: 1,
    attempt_count: 1,
    ips_json: JSON.stringify([sanitizeClientIp(sourceIp)]),
    routes_json: JSON.stringify(["POST /api/admin/security-alerts/test"]),
    actor_summary: maskActorEmail(actorEmail),
    email_status: settings.emailEnabled ? "dashboard_only" : "disabled",
    email_recipient: settings.emailEnabled ? settings.recipientEmail : null,
    created_at: nowIso,
    updated_at: nowIso,
    resolved_by: null,
  };
  securityAlertQueries.insertSecurityAlert(row);
  const record = mapAlertRow(row);
  if (settings.emailEnabled && getEmailTransportMode() !== "dashboard_only") {
    const emailStatus = await dispatchAlertEmail(record, settings);
    securityAlertQueries.updateSecurityAlertEmailStatus(
      record.id,
      emailStatus,
      settings.recipientEmail
    );
    const refreshed = securityAlertQueries.getSecurityAlertById(record.id);
    if (refreshed) return mapAlertRow(refreshed);
  }
  return record;
}
