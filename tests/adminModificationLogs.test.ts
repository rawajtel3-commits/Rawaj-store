import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-admin-mods-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-admin-mods-wl-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-admin-modification-logs-01234567";
process.env.PROMPT_KMS_KEY = "test-kms-key-admin-modification-logs-0123456789abcdef";

const serverMod = await import("../server.js");

let httpServer: Server;
let baseUrl = "";

function makeJwt(
  role: "promoter_admin" | "user_admin" | "customer",
  email: string,
  uid: string,
  displayName: string
): string {
  return serverMod.issueServerJwtToken({
    sid: `sid-mod-${uid}-${Date.now()}`,
    uid,
    email,
    displayName,
    role,
    originalRole: role,
    pinEnabled: false,
    pinVerified: true,
    webauthnVerified: false,
    exp: Date.now() + 60 * 60 * 1000,
  });
}

describe("Admin Modification Audit Logs (Prices, Stock, Permissions)", () => {
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

  it("enforces admin RBAC on GET and POST /api/admin/modification-logs (401/403)", async () => {
    const anonGet = await fetch(`${baseUrl}/api/admin/modification-logs`);
    assert.equal(anonGet.status, 401);

    const anonPost = await fetch(`${baseUrl}/api/admin/modification-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "price_change",
        targetType: "product",
        targetId: "prod-1",
        targetName: "Test Product",
        previousValue: "100",
        newValue: "90",
      }),
    });
    assert.equal(anonPost.status, 401);

    const custJwt = makeJwt("customer", "buyer@example.com", "uid-mod-cust", "Customer");
    const custGet = await fetch(`${baseUrl}/api/admin/modification-logs`, {
      headers: { Authorization: `Bearer ${custJwt}` },
    });
    assert.equal(custGet.status, 403);
  });

  it("rejects invalid modification audit payloads with HTTP 400", async () => {
    const adminJwt = makeJwt("user_admin", "ops@rawaj.store", "uid-mod-ua", "سالم العتيبي");
    const badCat = await fetch(`${baseUrl}/api/admin/modification-logs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "invalid_category",
        targetType: "product",
        targetId: "prod-1",
        targetName: "منتج",
        newValue: "50",
      }),
    });
    assert.equal(badCat.status, 400);

    const missingTarget = await fetch(`${baseUrl}/api/admin/modification-logs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "price_change",
        targetType: "product",
      }),
    });
    assert.equal(missingTarget.status, 400);
  });

  it("records price changes, stock updates, and automatic RBAC permission changes with server-verified actor and timestamp", async () => {
    const opsJwt = makeJwt("user_admin", "salem@rawaj.store", "uid-mod-ops", "سالم العتيبي");
    const promoterJwt = makeJwt("promoter_admin", "telrawaj@gmail.com", "uid-mod-pa", "طارق الرواج");

    const priceRes = await fetch(`${baseUrl}/api/admin/modification-logs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opsJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "price_change",
        actionLabelAr: "تخفيض سعر منتج",
        targetType: "product",
        targetId: "prod-2",
        targetName: "ساعة رواج الذكية Ultra Fit 3",
        fieldLabelAr: "السعر",
        previousValue: "1,299 ر.س",
        newValue: "1,099 ر.س",
        summaryAr: "تخفيض السعر بمقدار 200 ر.س",
      }),
    });
    assert.equal(priceRes.status, 201);
    const priceBody = await priceRes.json();
    assert.equal(priceBody.entry.actorName, "سالم العتيبي");
    assert.equal(priceBody.entry.actorRole, "user_admin");
    assert.ok(Date.parse(priceBody.entry.createdAt) > 0);

    const stockRes = await fetch(`${baseUrl}/api/admin/modification-logs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opsJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: "stock_update",
        actionLabelAr: "تحديث كمية المخزون",
        targetType: "product",
        targetId: "prod-1",
        targetName: "حاسوب نيوبروم بوك برو 16",
        fieldLabelAr: "الكمية المتوفرة",
        previousValue: "14 قطعة",
        newValue: "30 قطعة",
        summaryAr: "إضافة 16 قطعة للمخزون",
      }),
    });
    assert.equal(stockRes.status, 201);

    // Automatic audit capture when promoter_admin assigns a role
    const assignRes = await fetch(`${baseUrl}/api/admin/roles/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "new.manager@rawaj.store",
        role: "user_admin",
      }),
    });
    assert.equal(assignRes.status, 200);

    // Verify all logs + category filtering + search filtering
    const allRes = await fetch(`${baseUrl}/api/admin/modification-logs`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(allRes.status, 200);
    const allBody = await allRes.json();
    assert.equal(allBody.summary.total, 3);
    assert.equal(allBody.summary.priceChanges, 1);
    assert.equal(allBody.summary.stockUpdates, 1);
    assert.equal(allBody.summary.permissionChanges, 1);

    const permRes = await fetch(
      `${baseUrl}/api/admin/modification-logs?category=permission_change`,
      { headers: { Authorization: `Bearer ${promoterJwt}` } }
    );
    const permBody = await permRes.json();
    assert.equal(permBody.logs.length, 1);
    assert.equal(permBody.logs[0].actorName, "طارق الرواج");
    assert.equal(permBody.logs[0].targetName, "new.manager@rawaj.store");
    assert.equal(permBody.logs[0].newValue, "user_admin");

    const searchRes = await fetch(
      `${baseUrl}/api/admin/modification-logs?search=${encodeURIComponent("سالم العتيبي")}`,
      { headers: { Authorization: `Bearer ${opsJwt}` } }
    );
    const searchBody = await searchRes.json();
    assert.equal(searchBody.logs.length, 2);
  });
});
