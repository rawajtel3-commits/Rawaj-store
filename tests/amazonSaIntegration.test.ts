import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-amazon-sa-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-amazon-sa-wl-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-amazon-sa-proxy-verification-012345";
process.env.PROMPT_KMS_KEY = "test-kms-key-amazon-sa-proxy-verification-0123456789abcdef";

const serverMod = await import("../server.js");
const amazonMod = await import("../server/amazonSaService.js");

let httpServer: Server;
let baseUrl = "";

describe("Amazon Saudi Arabia Storefront API Proxy & AWS4 Signing", () => {
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

  it("produces deterministic AWS Signature Version 4 headers for webservices.amazon.sa", () => {
    const fixedDate = new Date("2026-11-18T12:00:00.000Z");
    const signedA = amazonMod.signAmazonPaApiRequest({
      accessKey: "AKIAEXAMPLETESTKEY12",
      secretKey: "ExampleSecretKeyForSigningCheckOnly123456789",
      path: "/paapi5/searchitems",
      target: "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
      payloadJson: JSON.stringify({ Keywords: "MacBook", Marketplace: "www.amazon.sa" }),
      timestamp: fixedDate,
    });
    const signedB = amazonMod.signAmazonPaApiRequest({
      accessKey: "AKIAEXAMPLETESTKEY12",
      secretKey: "ExampleSecretKeyForSigningCheckOnly123456789",
      path: "/paapi5/searchitems",
      target: "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
      payloadJson: JSON.stringify({ Keywords: "MacBook", Marketplace: "www.amazon.sa" }),
      timestamp: fixedDate,
    });

    assert.equal(signedA.Authorization, signedB.Authorization);
    assert.ok(signedA.Authorization.startsWith("AWS4-HMAC-SHA256 "));
    assert.ok(
      signedA.Authorization.includes("Credential=AKIAEXAMPLETESTKEY12/20261118/eu-west-1/ProductAdvertisingAPI/aws4_request")
    );
    assert.equal(signedA.host, "webservices.amazon.sa");
    assert.equal(signedA["x-amz-date"], "20261118T120000Z");
  });

  it("filters, sorts, and caches Amazon.sa catalog responses with private cache headers", async () => {
    const resFirst = await fetch(
      `${baseUrl}/api/amazon-sa/products?category=electronics&sort=price-asc`
    );
    assert.equal(resFirst.status, 200);
    assert.equal(resFirst.headers.get("cache-control"), "private, max-age=30");
    const bodyFirst = await resFirst.json();
    assert.equal(bodyFirst.cacheHit, false);
    assert.ok(bodyFirst.items.length >= 2);
    for (let i = 1; i < bodyFirst.items.length; i++) {
      assert.ok(bodyFirst.items[i].priceSar >= bodyFirst.items[i - 1].priceSar);
    }

    const resSecond = await fetch(
      `${baseUrl}/api/amazon-sa/products?category=electronics&sort=price-asc`
    );
    assert.equal(resSecond.status, 200);
    const bodySecond = await resSecond.json();
    assert.equal(bodySecond.cacheHit, true);

    const rawText = JSON.stringify(bodySecond);
    assert.ok(!rawText.includes("AMAZON_SA_SECRET_KEY"));
    assert.ok(!rawText.includes("AWS4-HMAC-SHA256"));
  });

  it("validates ASIN parameters and refreshes real-time item availability cleanly", async () => {
    const badRes = await fetch(`${baseUrl}/api/amazon-sa/products/INVALID/refresh`);
    assert.equal(badRes.status, 400);

    const notFoundRes = await fetch(`${baseUrl}/api/amazon-sa/products/B000000000/refresh`);
    assert.equal(notFoundRes.status, 404);

    const okRes = await fetch(`${baseUrl}/api/amazon-sa/products/B0D8X9K2M1/refresh?force=1`);
    assert.equal(okRes.status, 200);
    assert.equal(okRes.headers.get("cache-control"), "no-store");
    const payload = await okRes.json();
    assert.equal(payload.item.asin, "B0D8X9K2M1");
    assert.equal(payload.cacheHit, false);
    assert.ok(typeof payload.item.priceSar === "number" && payload.item.priceSar > 0);
  });

  it("resolves amz- prefixed products inside /api/seller-chat", async () => {
    const res = await fetch(`${baseUrl}/api/seller-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "هل المنتج متوفر؟",
        productId: "amz-B0D8X9K2M1",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.reply === "string" && data.reply.includes("ماك بوك"));
  });
});
