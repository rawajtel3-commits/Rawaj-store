import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-price-alerts-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-price-alerts-wl-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-price-alerts-verification-012345";
process.env.PROMPT_KMS_KEY = "test-kms-key-price-alerts-verification-0123456789abcdef";

const serverMod = await import("../server.js");
const priceAlertsUtil = await import("../src/utils/priceAlerts.js");
const initialData = await import("../src/data/initialData.js");

let httpServer: Server;
let baseUrl = "";

describe("Automatic Target Price Drop Alerts & In-App Notifications", () => {
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
        fs.unlinkSync(file);
      }
    }
  });

  it("evaluates target-price conditions accurately and triggers notification only when target is reached", () => {
    const product = initialData.INITIAL_PRODUCTS[0];
    const alerts = [
      {
        id: "pa-target-1",
        productId: product.id,
        productName: product.name,
        productImage: product.images[0],
        subscribedPrice: 8999,
        targetPrice: 7500,
        createdAt: "2026-11-18T08:00:00.000Z",
        isActive: true,
      },
    ];

    // Drop to 8100 is still above targetPrice 7500 -> should NOT trigger
    const partialDrop = priceAlertsUtil.evaluatePriceDropNotification(product, 8999, 8100, alerts);
    assert.equal(partialDrop.triggeredNotification, null);

    // Drop to 7400 reaches targetPrice 7500 -> triggers target notification
    const targetHit = priceAlertsUtil.evaluatePriceDropNotification(product, 8100, 7400, alerts);
    assert.ok(targetHit.triggeredNotification);
    assert.equal(targetHit.triggeredNotification.type, "price_drop");
    assert.equal(targetHit.triggeredNotification.newPrice, 7400);
    assert.equal(targetHit.triggeredNotification.targetPrice, 7500);
    assert.ok(targetHit.triggeredNotification.title.includes("السعر المستهدف"));
    assert.equal(targetHit.updatedAlerts[0]?.lastTriggeredPrice, 7400);
    assert.equal(targetHit.updatedAlerts[0]?.triggerCount, 1);

    // Re-evaluating at same price 7400 must NOT spam duplicate notification
    const repeatCheck = priceAlertsUtil.evaluatePriceDropNotification(
      product,
      7400,
      7400,
      targetHit.updatedAlerts
    );
    assert.equal(repeatCheck.triggeredNotification, null);
  });

  it("computes suggested target discount presets and monitors full catalog price changes", () => {
    const presets = priceAlertsUtil.computeSuggestedTargetPrices(1000);
    assert.deepEqual(
      presets.map((p) => p.targetPrice),
      [950, 900, 850, 800]
    );

    const p1 = initialData.INITIAL_PRODUCTS[0];
    const p2 = initialData.INITIAL_PRODUCTS[1];
    const updatedCatalog = initialData.INITIAL_PRODUCTS.map((p) =>
      p.id === p2.id ? { ...p, price: 999 } : p
    );

    const monitorRes = priceAlertsUtil.monitorAllProductsForPriceAlerts(
      updatedCatalog,
      { [p1.id]: p1.price, [p2.id]: 1299 },
      [
        {
          id: "pa-p2",
          productId: p2.id,
          productName: p2.name,
          productImage: p2.images[0],
          subscribedPrice: 1299,
          targetPrice: 1050,
          createdAt: "2026-11-18T08:00:00.000Z",
          isActive: true,
        },
      ]
    );
    assert.equal(monitorRes.triggeredNotifications.length, 1);
    assert.equal(monitorRes.triggeredNotifications[0]?.productId, p2.id);
    assert.equal(monitorRes.triggeredNotifications[0]?.newPrice, 999);
  });

  it("persists, evaluates against catalog, and removes price alerts via /api/price-alerts", async () => {
    const clientKey = "cli_test_price_alert_user_1";
    const prod = initialData.INITIAL_PRODUCTS[0];

    // Reject invalid target >= current price
    const badRes = await fetch(`${baseUrl}/api/price-alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientKey,
        productId: prod.id,
        productName: prod.name,
        productImage: prod.images[0],
        currentPrice: 8999,
        targetPrice: 9500,
      }),
    });
    assert.equal(badRes.status, 400);

    // Save valid target price alert
    const saveRes = await fetch(`${baseUrl}/api/price-alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientKey,
        productId: prod.id,
        productName: prod.name,
        productImage: prod.images[0],
        currentPrice: 8999,
        targetPrice: 7800,
      }),
    });
    assert.equal(saveRes.status, 201);
    const saved = await saveRes.json();
    assert.equal(saved.alert.targetPrice, 7800);
    assert.equal(saved.alert.isActive, true);

    // Retrieve active alerts
    const listRes = await fetch(`${baseUrl}/api/price-alerts?clientKey=${clientKey}`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.alerts.length, 1);
    assert.equal(listData.alerts[0].productId, prod.id);

    // Evaluate catalog price drop to 7650 (reaches <= 7800)
    const droppedCatalog = initialData.INITIAL_PRODUCTS.map((p) =>
      p.id === prod.id ? { ...p, price: 7650 } : p
    );
    const evalRes = await fetch(`${baseUrl}/api/price-alerts/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientKey,
        products: droppedCatalog,
        previousPrices: { [prod.id]: 8999 },
      }),
    });
    assert.equal(evalRes.status, 200);
    const evalData = await evalRes.json();
    assert.equal(evalData.triggeredNotifications.length, 1);
    assert.equal(evalData.triggeredNotifications[0].newPrice, 7650);
    assert.equal(evalData.alerts[0].lastTriggeredPrice, 7650);

    // Delete alert cleanly
    const delRes = await fetch(`${baseUrl}/api/price-alerts/${prod.id}?clientKey=${clientKey}`, {
      method: "DELETE",
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.removed, true);
  });
});
