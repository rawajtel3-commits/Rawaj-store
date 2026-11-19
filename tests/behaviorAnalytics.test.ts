import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-behavior-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-behavior-wl-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-behavior-analytics-check-01234567";
process.env.PROMPT_KMS_KEY = "test-kms-key-behavior-analytics-verification-0123456789abcdef";

const serverMod = await import("../server.js");
const behaviorMod = await import("../server/behaviorAnalytics.js");

let httpServer: Server;
let baseUrl = "";

function makeJwt(role: "promoter_admin" | "user_admin" | "customer", email: string, uid: string): string {
  return serverMod.issueServerJwtToken({
    sid: `sid-beh-${uid}-${Date.now()}`,
    uid,
    email,
    displayName: `Behavior ${role}`,
    role,
    originalRole: role,
    pinEnabled: false,
    pinVerified: true,
    webauthnVerified: false,
    exp: Date.now() + 60 * 60 * 1000,
  });
}

describe("Google Analytics & Storefront User Behavior Tracking", () => {
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

  it("enforces admin RBAC on GET /api/admin/behavior-analytics (401/403 vs 200)", async () => {
    const anon = await fetch(`${baseUrl}/api/admin/behavior-analytics?range=7d`);
    assert.equal(anon.status, 401);

    const custJwt = makeJwt("customer", "shopper@rawaj.store", "uid-beh-cust");
    const custRes = await fetch(`${baseUrl}/api/admin/behavior-analytics?range=7d`, {
      headers: { Authorization: `Bearer ${custJwt}` },
    });
    assert.equal(custRes.status, 403);

    const userAdminJwt = makeJwt("user_admin", "ops@rawaj.store", "uid-beh-ua");
    const adminRes = await fetch(`${baseUrl}/api/admin/behavior-analytics?range=7d`, {
      headers: { Authorization: `Bearer ${userAdminJwt}` },
    });
    assert.equal(adminRes.status, 200);
    const body = await adminRes.json();
    assert.equal(body.gaStatus.library, "react-ga4");
    assert.equal(body.hourlyTraffic.length, 24);
  });

  it("rejects malformed or unsupported behavior event payloads with HTTP 400", async () => {
    const invalidType = await fetch(`${baseUrl}/api/analytics/behavior/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "drop_tables", sessionId: "sess-1234" }),
    });
    assert.equal(invalidType.status, 400);

    const missingProduct = await fetch(`${baseUrl}/api/analytics/behavior/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "view_item", sessionId: "sess-1234" }),
    });
    assert.equal(missingProduct.status, 400);

    const shortSearch = await fetch(`${baseUrl}/api/analytics/behavior/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "search", searchTerm: "a", sessionId: "sess-1234" }),
    });
    assert.equal(shortSearch.status, 400);
  });

  it("records live behavior events in SQLite and computes peak hours, most viewed products, and funnel rates", async () => {
    const targetProdId = "prod-ga-live-99";
    const targetProdName = "شاشة قيمنق منحنية OLED 4K";

    // Send 4 views, 2 add_to_cart, 1 purchase concentrated at hour 21
    for (let i = 0; i < 4; i++) {
      const r = await fetch(`${baseUrl}/api/analytics/behavior/event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
        },
        body: JSON.stringify({
          sessionId: `ga-live-sess-${i}`,
          eventType: "view_item",
          pagePath: `/product/${targetProdId}`,
          productId: targetProdId,
          productName: targetProdName,
          category: "gaming",
          valueSar: 2499,
          hourOfDay: 21,
          dayOfWeek: 4,
        }),
      });
      assert.equal(r.status, 202);
    }

    for (let i = 0; i < 2; i++) {
      const r = await fetch(`${baseUrl}/api/analytics/behavior/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `ga-live-sess-${i}`,
          eventType: "add_to_cart",
          pagePath: `/product/${targetProdId}`,
          productId: targetProdId,
          productName: targetProdName,
          category: "gaming",
          valueSar: 2499,
          hourOfDay: 21,
          dayOfWeek: 4,
          deviceType: "mobile",
        }),
      });
      assert.equal(r.status, 202);
    }

    const buyRes = await fetch(`${baseUrl}/api/analytics/behavior/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "ga-live-sess-0",
        eventType: "purchase",
        pagePath: "/checkout",
        productId: targetProdId,
        productName: targetProdName,
        category: "gaming",
        valueSar: 2499,
        hourOfDay: 21,
        dayOfWeek: 4,
        deviceType: "mobile",
      }),
    });
    assert.equal(buyRes.status, 202);

    const searchRes = await fetch(`${baseUrl}/api/analytics/behavior/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "ga-live-sess-0",
        eventType: "search",
        searchTerm: "شاشة OLED 4K",
        hourOfDay: 21,
        dayOfWeek: 4,
      }),
    });
    assert.equal(searchRes.status, 202);

    const promoterJwt = makeJwt("promoter_admin", "telrawaj@gmail.com", "uid-beh-pa");
    const reportRes = await fetch(`${baseUrl}/api/admin/behavior-analytics?range=24h`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(reportRes.status, 200);
    const report = await reportRes.json();

    assert.equal(report.summary.peakHour, 21);
    assert.equal(report.summary.peakHourLabel, "21:00");
    assert.ok(report.hourlyTraffic[21].isPeak);
    assert.equal(report.hourlyTraffic[21].productViews, 4);

    const prodRow = report.topViewedProducts.find((p: any) => p.productId === targetProdId);
    assert.ok(prodRow, "Expected tracked product to appear in topViewedProducts");
    assert.equal(prodRow.views, 4);
    assert.equal(prodRow.addToCartCount, 2);
    assert.equal(prodRow.purchaseCount, 1);
    assert.equal(prodRow.viewToCartRatePercent, 50);
    assert.equal(prodRow.viewToPurchaseRatePercent, 25);
    assert.equal(prodRow.revenueSar, 2499);

    const searchEntry = report.topSearchTerms.find((s: any) => s.term === "شاشة OLED 4K");
    assert.ok(searchEntry && searchEntry.count >= 1);
  });

  it("masks GA4 Measurement IDs safely for display", () => {
    assert.equal(behaviorMod.maskMeasurementId("G-ABC123XYZ9"), "G-AB••••YZ9");
    assert.equal(behaviorMod.maskMeasurementId("invalid-id"), null);
  });
});
