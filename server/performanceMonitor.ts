import type {
  AdminPerformanceReport,
  BottleneckPrediction,
  EndpointPerformanceStat,
  PerformanceTimeBucket,
  PerformanceWindow,
  SecurityFeatureMetric,
} from "../src/types.js";
import { performanceStoreQueries, type ApiPerformanceMetricRow } from "./sqliteStore.js";

const WINDOW_DURATION_MS: Record<PerformanceWindow, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

const WINDOW_BUCKET_COUNT: Record<PerformanceWindow, number> = {
  "15m": 10,
  "1h": 12,
  "24h": 12,
  "7d": 7,
};

export function parsePerformanceWindow(raw: unknown): PerformanceWindow {
  if (raw === "15m" || raw === "1h" || raw === "24h" || raw === "7d") {
    return raw;
  }
  return "1h";
}

export function normalizeApiRouteKey(method: string, rawPath: string): string {
  const cleanMethod = String(method || "GET").toUpperCase().slice(0, 12);
  const pathOnly = String(rawPath || "/api/unknown").split("?")[0];
  const segments = pathOnly
    .split("/")
    .filter(Boolean)
    .slice(0, 8)
    .map((seg, idx, all) => {
      const prev = idx > 0 ? all[idx - 1] : "";
      if (
        prev === "tenants" ||
        prev === "blobs" ||
        prev === "snapshots" ||
        prev === "orders" ||
        prev === "products" ||
        prev === "audit" ||
        /^[0-9]+$/.test(seg) ||
        /^[0-9a-f]{16,}$/i.test(seg) ||
        /^(usr|ord|ten|bkp|paud|prm)-[a-z0-9_-]+$/i.test(seg)
      ) {
        return ":id";
      }
      return seg.slice(0, 48);
    });

  return `${cleanMethod} /${segments.join("/")}`;
}

export function recordApiPerformanceSample(params: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  authMode: "cookie" | "jwt_bearer" | "anonymous";
}): void {
  const safeDuration = Number.isFinite(params.durationMs)
    ? Math.max(0.05, Math.round(params.durationMs * 100) / 100)
    : 0.1;
  const status = Math.max(100, Math.min(599, Math.round(params.statusCode || 200)));
  const outcome: ApiPerformanceMetricRow["outcome"] =
    status >= 500 ? "server_error" : status >= 400 ? "client_error" : "success";

  try {
    performanceStoreQueries.insertMetric({
      route_key: normalizeApiRouteKey(params.method, params.path),
      method: String(params.method || "GET").toUpperCase().slice(0, 12),
      status_code: status,
      duration_ms: safeDuration,
      outcome,
      auth_mode: params.authMode,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Telemetry failure must never interrupt live HTTP traffic
  }
}

export function computePercentile(sortedAsc: number[], percentile: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return Math.round(sortedAsc[0] * 100) / 100;
  const rank = (percentile / 100) * (sortedAsc.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return Math.round(sortedAsc[low] * 100) / 100;
  const weight = rank - low;
  const val = sortedAsc[low] * (1 - weight) + sortedAsc[high] * weight;
  return Math.round(val * 100) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatBucketLabel(tsMs: number, window: PerformanceWindow): string {
  const d = new Date(tsMs);
  if (window === "7d") {
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function classifyEndpointStatus(
  p95Ms: number,
  serverErrorCount: number,
  total: number
): EndpointPerformanceStat["status"] {
  const errRate = total > 0 ? (serverErrorCount / total) * 100 : 0;
  if (p95Ms >= 1000 || errRate >= 5) return "critical";
  if (p95Ms >= 350 || errRate >= 1.5) return "warning";
  return "healthy";
}

function buildBottleneckPredictions(
  rows: ApiPerformanceMetricRow[],
  endpoints: EndpointPerformanceStat[],
  windowStartMs: number,
  nowMs: number
): BottleneckPrediction[] {
  const predictions: BottleneckPrediction[] = [];
  const splitPointMs = windowStartMs + (nowMs - windowStartMs) * 0.7;

  const groupedRecent = new Map<string, number[]>();
  const groupedBaseline = new Map<string, number[]>();
  for (const r of rows) {
    const ts = new Date(r.created_at).getTime();
    if (ts >= splitPointMs) {
      const list = groupedRecent.get(r.route_key) || [];
      list.push(r.duration_ms);
      groupedRecent.set(r.route_key, list);
    } else {
      const list = groupedBaseline.get(r.route_key) || [];
      list.push(r.duration_ms);
      groupedBaseline.set(r.route_key, list);
    }
  }

  for (const ep of endpoints) {
    const recentVals = (groupedRecent.get(ep.routeKey) || []).slice().sort((a, b) => a - b);
    const baseVals = (groupedBaseline.get(ep.routeKey) || []).slice().sort((a, b) => a - b);
    const currentP95 = recentVals.length >= 2 ? computePercentile(recentVals, 95) : ep.p95Ms;
    const baselineP95 = baseVals.length >= 2 ? computePercentile(baseVals, 95) : ep.p50Ms || ep.p95Ms;
    const trendDeltaPercent =
      baselineP95 > 0.5 ? round2(((currentP95 - baselineP95) / baselineP95) * 100) : 0;
    const serverErrorRate = ep.totalRequests > 0 ? round2((ep.serverErrorCount / ep.totalRequests) * 100) : 0;
    const clientErrorRate = ep.totalRequests > 0 ? round2((ep.clientErrorCount / ep.totalRequests) * 100) : 0;

    if (ep.p95Ms >= 1000 || serverErrorRate >= 5) {
      predictions.push({
        id: `bn-crit-${ep.routeKey}`,
        routeKey: ep.routeKey,
        severity: "critical",
        titleAr:
          serverErrorRate >= 5
            ? `ارتفاع أخطاء الخادم (${serverErrorRate}%) في ${ep.routeKey}`
            : `كمون حرج (P95 = ${ep.p95Ms} ms) في ${ep.routeKey}`,
        reasonAr: `تجاوز المئين 95 عتبة الاستجابة الآمنة مع نسبة أخطاء خادم ${serverErrorRate}% ومعدل نجاح ${ep.successRatePercent}%.`,
        recommendationAr: ep.routeKey.includes("ai-assistant") || ep.routeKey.includes("recommendations")
          ? "فعّل مهلة استجابة أقصر لنموذج Gemini أو خزّن التوصيات الشائعة مؤقتاً بالذاكرة لتقليل زمن الانتظار."
          : "افحص استعلامات قاعدة البيانات والفهارس في هذا المسار وفعّل المعالجة المتوازية أو التخزين المؤقت.",
        currentP95Ms: currentP95,
        baselineP95Ms: baselineP95,
        trendDeltaPercent,
        errorRatePercent: serverErrorRate,
      });
    } else if (
      ep.p95Ms >= 350 ||
      (recentVals.length >= 3 && baseVals.length >= 3 && trendDeltaPercent >= 35 && currentP95 >= 120)
    ) {
      predictions.push({
        id: `bn-warn-${ep.routeKey}`,
        routeKey: ep.routeKey,
        severity: "warning",
        titleAr: `تباطؤ متصاعد (+${Math.max(0, trendDeltaPercent)}%) في ${ep.routeKey}`,
        reasonAr: `ارتفع زمن الاستجابة P95 من ${baselineP95} ms إلى ${currentP95} ms خلال آخر 30% من النافذة الزمنية.`,
        recommendationAr: "راقب نمو حجم الحمولة أو تنافس القفل على SQLite WAL عند ارتفاع التزامن.",
        currentP95Ms: currentP95,
        baselineP95Ms: baselineP95,
        trendDeltaPercent,
        errorRatePercent: serverErrorRate,
      });
    } else if (
      (ep.routeKey.includes("/api/auth/") || ep.routeKey.includes("/api/admin/")) &&
      ep.totalRequests >= 3 &&
      clientErrorRate >= 40
    ) {
      predictions.push({
        id: `bn-auth-${ep.routeKey}`,
        routeKey: ep.routeKey,
        severity: "info",
        titleAr: `نسبة رفض مصادقة/صلاحيات مرتفعة (${clientErrorRate}%) على ${ep.routeKey}`,
        reasonAr: `تم صد ${ep.clientErrorCount} محاولة غير مصرح بها أو برمز تحقق خاطئ من أصل ${ep.totalRequests} طلب.`,
        recommendationAr: "تعمل طبقة الحماية (RBAC / Rate Limiting) بكفاءة؛ راجع سجل التدقيق للتأكد من عدم وجود محاولات متكررة.",
        currentP95Ms: currentP95,
        baselineP95Ms: baselineP95,
        trendDeltaPercent,
        errorRatePercent: clientErrorRate,
      });
    }
  }

  return predictions.sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity] || b.currentP95Ms - a.currentP95Ms;
  });
}

export function buildAdminPerformanceReport(params: {
  window: PerformanceWindow;
  pinEnabledCount: number;
  activePromptKeyVersion?: number;
  includeVaultTelemetry?: boolean;
}): AdminPerformanceReport {
  const nowMs = Date.now();
  const durationMs = WINDOW_DURATION_MS[params.window];
  const sinceMs = nowMs - durationMs;
  const sinceIso = new Date(sinceMs).toISOString();

  const rows = performanceStoreQueries.listMetricsSince(sinceIso, 4000);
  const allDurations = rows.map((r) => r.duration_ms).sort((a, b) => a - b);

  let successCount = 0;
  let clientErrorCount = 0;
  let serverErrorCount = 0;
  let authenticatedCalls = 0;
  let totalDurationSum = 0;

  const byRoute = new Map<
    string,
    {
      durations: number[];
      success: number;
      clientErr: number;
      serverErr: number;
    }
  >();

  for (const r of rows) {
    totalDurationSum += r.duration_ms;
    if (r.outcome === "success") successCount += 1;
    else if (r.outcome === "client_error") clientErrorCount += 1;
    else serverErrorCount += 1;

    if (r.auth_mode !== "anonymous") {
      authenticatedCalls += 1;
    }

    let entry = byRoute.get(r.route_key);
    if (!entry) {
      entry = { durations: [], success: 0, clientErr: 0, serverErr: 0 };
      byRoute.set(r.route_key, entry);
    }
    entry.durations.push(r.duration_ms);
    if (r.outcome === "success") entry.success += 1;
    else if (r.outcome === "client_error") entry.clientErr += 1;
    else entry.serverErr += 1;
  }

  const totalRequests = rows.length;
  const windowMinutes = Math.max(1, durationMs / 60_000);
  const successRatePercent = totalRequests > 0 ? round2((successCount / totalRequests) * 100) : 100;
  const clientErrorRatePercent =
    totalRequests > 0 ? round2((clientErrorCount / totalRequests) * 100) : 0;
  const serverErrorRatePercent =
    totalRequests > 0 ? round2((serverErrorCount / totalRequests) * 100) : 0;

  const avgMs = totalRequests > 0 ? round2(totalDurationSum / totalRequests) : 0;
  const p50Ms = computePercentile(allDurations, 50);
  const p95Ms = computePercentile(allDurations, 95);
  const p99Ms = computePercentile(allDurations, 99);

  // Build time-series buckets across the window
  const bucketCount = WINDOW_BUCKET_COUNT[params.window];
  const bucketWidthMs = durationMs / bucketCount;
  const bucketsRaw: Array<{
    startMs: number;
    durations: number[];
    success: number;
    errors: number;
  }> = Array.from({ length: bucketCount }, (_, i) => ({
    startMs: sinceMs + i * bucketWidthMs,
    durations: [],
    success: 0,
    errors: 0,
  }));

  for (const r of rows) {
    const ts = new Date(r.created_at).getTime();
    const idx = Math.max(0, Math.min(bucketCount - 1, Math.floor((ts - sinceMs) / bucketWidthMs)));
    bucketsRaw[idx].durations.push(r.duration_ms);
    if (r.outcome === "success") bucketsRaw[idx].success += 1;
    else bucketsRaw[idx].errors += 1;
  }

  const timeSeries: PerformanceTimeBucket[] = bucketsRaw.map((b) => {
    const sorted = b.durations.slice().sort((x, y) => x - y);
    const total = b.durations.length;
    const sum = b.durations.reduce((acc, v) => acc + v, 0);
    return {
      label: formatBucketLabel(b.startMs, params.window),
      bucketStart: new Date(b.startMs).toISOString(),
      requests: total,
      successRatePercent: total > 0 ? round2((b.success / total) * 100) : 100,
      avgMs: total > 0 ? round2(sum / total) : 0,
      p95Ms: computePercentile(sorted, 95),
      errorCount: b.errors,
    };
  });

  const endpoints: EndpointPerformanceStat[] = Array.from(byRoute.entries())
    .map(([routeKey, info]) => {
      const sorted = info.durations.slice().sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((a, b) => a + b, 0);
      const epP95 = computePercentile(sorted, 95);
      return {
        routeKey,
        totalRequests: count,
        successCount: info.success,
        clientErrorCount: info.clientErr,
        serverErrorCount: info.serverErr,
        successRatePercent: count > 0 ? round2((info.success / count) * 100) : 100,
        avgMs: count > 0 ? round2(sum / count) : 0,
        p50Ms: computePercentile(sorted, 50),
        p95Ms: epP95,
        p99Ms: computePercentile(sorted, 99),
        maxMs: count > 0 ? round2(sorted[count - 1]) : 0,
        status: classifyEndpointStatus(epP95, info.serverErr, count),
      };
    })
    .sort((a, b) => b.p95Ms - a.p95Ms || b.totalRequests - a.totalRequests);

  // Real Security Feature Adoption
  const secCounts = performanceStoreQueries.getSecurityTelemetryCounts();
  const activePinAccounts = Math.max(params.pinEnabledCount, secCounts.pinVerifiedUsers);
  const trackedUsers = Math.max(secCounts.distinctUsers, activePinAccounts, secCounts.webauthnCredentials);
  const userDenominator = Math.max(1, trackedUsers);

  const pinAdoptionPercent =
    trackedUsers > 0 ? Math.min(100, round2((activePinAccounts / userDenominator) * 100)) : 0;
  const webauthnAdoptionPercent =
    trackedUsers > 0
      ? Math.min(100, round2((secCounts.webauthnCredentials / userDenominator) * 100))
      : 0;
  const authenticatedRequestPercent =
    totalRequests > 0 ? round2((authenticatedCalls / totalRequests) * 100) : 0;

  // Protected admin/auth RBAC & vault coverage
  const totalProtectedChecks = secCounts.promptGrantedCount + secCounts.promptBlockedCount;
  const securityFeatures: SecurityFeatureMetric[] = [
    {
      id: "two_factor_pin",
      labelAr: "التحقق الثنائي بالرمز السري (2FA PIN)",
      adoptionPercent: pinAdoptionPercent,
      enabledCount: activePinAccounts,
      totalBaseline: trackedUsers,
      status: pinAdoptionPercent >= 70 ? "optimal" : pinAdoptionPercent >= 35 ? "moderate" : "needs_attention",
      detailAr:
        trackedUsers > 0
          ? `${activePinAccounts} من أصل ${trackedUsers} حسابات مسجّلة تفعّل رمز 2FA.`
          : "لم يتم تسجيل حسابات مستخدمين بعد على هذا الخادم.",
    },
    {
      id: "webauthn_passkeys",
      labelAr: "مفاتيح المرور والبصمة الحيوية (WebAuthn)",
      adoptionPercent: webauthnAdoptionPercent,
      enabledCount: secCounts.webauthnCredentials,
      totalBaseline: trackedUsers,
      status:
        webauthnAdoptionPercent >= 50
          ? "optimal"
          : webauthnAdoptionPercent >= 20
          ? "moderate"
          : "needs_attention",
      detailAr: `${secCounts.webauthnCredentials} مفتاح WebAuthn مسجّل للتحقق السريع دون كلمة مرور.`,
    },
    {
      id: "authenticated_sessions",
      labelAr: "طلبات API مصادق عليها (HttpOnly / Bearer JWT)",
      adoptionPercent: authenticatedRequestPercent,
      enabledCount: authenticatedCalls,
      totalBaseline: totalRequests,
      status:
        authenticatedRequestPercent >= 60
          ? "optimal"
          : authenticatedRequestPercent >= 25
          ? "moderate"
          : "needs_attention",
      detailAr: `${authenticatedCalls} من أصل ${totalRequests} طلباً ضمن النافذة عبر جلسة موقّعة.`,
    },
    {
      id: "rbac_rate_limit",
      labelAr: "تغطية RBAC وحماية المحاولات المفرطة",
      adoptionPercent: 100,
      enabledCount: secCounts.blockedAuthEvents + secCounts.promptBlockedCount,
      totalBaseline: Math.max(1, totalProtectedChecks + secCounts.blockedAuthEvents),
      status: "optimal",
      detailAr: params.includeVaultTelemetry
        ? `مفاتيح الخزنة v${params.activePromptKeyVersion || 1} نشطة؛ إجمالي الحظر الوقائي المسجّل: ${secCounts.blockedAuthEvents + secCounts.promptBlockedCount}.`
        : `تفعيل التحقق الصارم؛ إجمالي الحظر الوقائي المسجّل: ${secCounts.blockedAuthEvents + secCounts.promptBlockedCount}.`,
    },
  ];

  const overallScorePercent = round2(
    (pinAdoptionPercent + webauthnAdoptionPercent + authenticatedRequestPercent + 100) / 4
  );

  const bottlenecks = buildBottleneckPredictions(rows, endpoints, sinceMs, nowMs);
  const overallStatus: AdminPerformanceReport["summary"]["overallStatus"] =
    bottlenecks.some((b) => b.severity === "critical") || serverErrorRatePercent >= 5 || p95Ms >= 1000
      ? "critical"
      : bottlenecks.some((b) => b.severity === "warning") || p95Ms >= 350
      ? "warning"
      : "healthy";

  return {
    window: params.window,
    generatedAt: new Date(nowMs).toISOString(),
    summary: {
      totalRequests,
      requestsPerMinute: round2(totalRequests / windowMinutes),
      successRatePercent,
      clientErrorRatePercent,
      serverErrorRatePercent,
      avgMs,
      p50Ms,
      p95Ms,
      p99Ms,
      overallStatus,
    },
    timeSeries,
    endpoints,
    securityAdoption: {
      overallScorePercent,
      trackedUsers,
      activePinAccounts,
      webauthnPasskeys: secCounts.webauthnCredentials,
      rateLimitBlocksActive: secCounts.rateLimitTriggers,
      authenticatedRequestPercent,
      features: securityFeatures,
    },
    bottlenecks,
  };
}
