import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-perf-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-perf-wl-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-performance-monitor-verification-0123456";
process.env.PROMPT_KMS_KEY = "test-kms-key-performance-monitor-verification-0123456789ab";

const { performanceStoreQueries } = await import("../server/sqliteStore.js");
const perfMon = await import("../server/performanceMonitor.js");
const serverMod = await import("../server.js");

let httpServer: Server;
let baseUrl = "";

function makeJwt(role: "promoter_admin" | "user_admin" | "customer", email: string, uid: string): string {
  return serverMod.issueServerJwtToken({
    sid: `sid-perf-${uid}-${Date.now()}`,
    uid,
    email,
    displayName: `Perf ${role}`,
    role,
    originalRole: role,
    pinEnabled: false,
    pinVerified: true,
    webauthnVerified: false,
    exp: Date.now() + 60 * 60 * 1000,
  });
}

describe("API Performance Monitoring & Bottleneck Prediction", () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      httpServer = serverMod.app.listen(0, "127.0.0.1", () => {
        const addr = httpServer.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    for (const file of [
      TEST_DB_PATH,
      `${TEST_DB_PATH}-wal`,
      `${TEST_DB_PATH}-shm`,
      TEST_WHITELABEL_DB_PATH,
      `${TEST_WHITELABEL_DB_PATH}-wal`,
      `${TEST_WHITELABEL_DB_PATH}-shm`,
    ]) {
      if (fs.existsSync(file)) {
        fs.rmSync(file, { force: true });
      }
    }
  });

  it("normalizes dynamic route parameters and computes accurate percentiles", () => {
    assert.equal(
      perfMon.normalizeApiRouteKey("GET", "/api/whitelabel/tenants/ten-12345/snapshots/bkp-999"),
      "GET /api/whitelabel/tenants/:id/snapshots/:id"
    );
    assert.equal(
      perfMon.computePercentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95),
      95.5
    );
  });

  it("enforces admin RBAC on GET /api/admin/performance (401 anon, 403 customer)", async () => {
    const anonRes = await fetch(`${baseUrl}/api/admin/performance`);
    assert.equal(anonRes.status, 401);

    const custJwt = makeJwt("customer", "buyer@example.com", "uid-perf-cust");
    const custRes = await fetch(`${baseUrl}/api/admin/performance`, {
      headers: { Authorization: `Bearer ${custJwt}` },
    });
    assert.equal(custRes.status, 403);
  });

  it("records real API traffic and computes latency, success rates, security adoption, and bottlenecks", async () => {
    // Generate some real traffic first
    await fetch(`${baseUrl}/api/health`);
    await fetch(`${baseUrl}/api/admin/capabilities`);

    // Simulate a slow endpoint spike in SQLite to validate bottleneck predictor
    const now = Date.now();
    for (let i = 0; i < 6; i++) {
      performanceStoreQueries.insertMetric({
        route_key: "POST /api/ai-assistant",
        method: "POST",
        status_code: i === 5 ? 502 : 200,
        duration_ms: i >= 4 ? 1350 : 180,
        outcome: i === 5 ? "server_error" : "success",
        auth_mode: "cookie",
        created_at: new Date(now - (6 - i) * 60_000).toISOString(),
      });
    }

    const userAdminJwt = makeJwt("user_admin", "ops@rawaj.store", "uid-perf-ua");
    const uaRes = await fetch(`${baseUrl}/api/admin/performance?window=1h`, {
      headers: { Authorization: `Bearer ${userAdminJwt}` },
    });
    assert.equal(uaRes.status, 200);
    const uaReport = await uaRes.json();

    assert.equal(uaReport.window, "1h");
    assert.ok(uaReport.summary.totalRequests >= 8);
    assert.ok(uaReport.summary.p95Ms > 0);
    assert.ok(uaReport.timeSeries.length === 12);
    assert.ok(uaReport.securityAdoption.features.length === 4);

    // Ensure user_admin does not receive vault key version details
    const rbacFeature = uaReport.securityAdoption.features.find((f: any) => f.id === "rbac_rate_limit");
    assert.ok(rbacFeature);
    assert.equal(rbacFeature.detailAr.includes("مفاتيح الخزنة"), false);

    // Verify bottleneck predictor flagged POST /api/ai-assistant
    const aiBottleneck = uaReport.bottlenecks.find((b: any) => b.routeKey === "POST /api/ai-assistant");
    assert.ok(aiBottleneck, "Expected bottleneck alert for slow/failing POST /api/ai-assistant");
    assert.equal(aiBottleneck.severity, "critical");

    // Promoter admin sees full vault telemetry
    const promoterJwt = makeJwt("promoter_admin", "telrawaj@gmail.com", "uid-perf-pa");
    const paRes = await fetch(`${baseUrl}/api/admin/performance?window=15m`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(paRes.status, 200);
    const paReport = await paRes.json();
    const paRbacFeature = paReport.securityAdoption.features.find((f: any) => f.id === "rbac_rate_limit");
    assert.ok(paRbacFeature.detailAr.includes("مفاتيح الخزنة"));
  });
});
