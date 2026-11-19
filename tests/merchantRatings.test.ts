import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-merchant-ratings-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-merchant-ratings-wl-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-merchant-ratings-verification-012345";
process.env.PROMPT_KMS_KEY = "test-kms-key-merchant-ratings-verification-0123456789abcdef";

const serverMod = await import("../server.js");
const brandsUtil = await import("../src/utils/brands.js");

let httpServer: Server;
let baseUrl = "";

describe("Merchant Brand Rating System (Prep Speed & Packaging Quality)", () => {
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

  it("computes merchant rating averages accurately and sorts newest-first", () => {
    const emptySummary = brandsUtil.computeMerchantRatingSummary("unknown-brand", []);
    assert.equal(emptySummary.ratingsCount, 0);
    assert.equal(emptySummary.avgOverall, 0);

    const summary = brandsUtil.computeMerchantRatingSummary("rawaj", [
      {
        id: "r1",
        brandSlug: "rawaj",
        brandName: "رواج (Rawaj)",
        reviewerName: "أحمد",
        prepSpeedRating: 5,
        packagingQualityRating: 4,
        overallRating: 4.5,
        verifiedOrder: true,
        createdAt: "2026-11-01T10:00:00.000Z",
      },
      {
        id: "r2",
        brandSlug: "rawaj",
        brandName: "رواج (Rawaj)",
        reviewerName: "سعد",
        prepSpeedRating: 3,
        packagingQualityRating: 4,
        overallRating: 3.5,
        verifiedOrder: false,
        createdAt: "2026-11-02T12:00:00.000Z",
      },
      {
        id: "r-other",
        brandSlug: "titan",
        brandName: "تايتن (Titan)",
        reviewerName: "فيصل",
        prepSpeedRating: 1,
        packagingQualityRating: 1,
        overallRating: 1,
        verifiedOrder: false,
        createdAt: "2026-11-03T12:00:00.000Z",
      },
    ]);

    assert.equal(summary.ratingsCount, 2);
    assert.equal(summary.avgPrepSpeed, 4);
    assert.equal(summary.avgPackagingQuality, 4);
    assert.equal(summary.avgOverall, 4);
    assert.equal(summary.reviews[0]?.id, "r2");
    assert.equal(summary.reviews[1]?.id, "r1");
  });

  it("returns seeded merchant rating summaries via GET /api/brands/ratings", async () => {
    const res = await fetch(`${baseUrl}/api/brands/ratings`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const data = await res.json();

    assert.ok(data.summaries.rawaj);
    assert.ok(data.summaries.neoprom);
    assert.equal(data.summaries.rawaj.ratingsCount, 2);
    assert.equal(data.summaries.rawaj.avgPrepSpeed, 5);
    assert.equal(data.summaries.rawaj.avgPackagingQuality, 4.5);
    assert.equal(data.summaries.rawaj.avgOverall, 4.8);

    const singleRes = await fetch(`${baseUrl}/api/brands/ratings?brandSlug=rawaj`);
    assert.equal(singleRes.status, 200);
    const singleData = await singleRes.json();
    assert.deepEqual(Object.keys(singleData.summaries), ["rawaj"]);

    const badQueryRes = await fetch(`${baseUrl}/api/brands/ratings?brandSlug=invalid$slug!`);
    assert.equal(badQueryRes.status, 400);
  });

  it("rejects invalid rating payloads and persists valid ratings with recalculated averages", async () => {
    const invalidSpeed = await fetch(`${baseUrl}/api/brands/rawaj/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: "رواج (Rawaj)",
        reviewerName: "تركي الحربي",
        prepSpeedRating: 6,
        packagingQualityRating: 5,
      }),
    });
    assert.equal(invalidSpeed.status, 400);

    const shortName = await fetch(`${baseUrl}/api/brands/rawaj/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: "رواج (Rawaj)",
        reviewerName: "أ",
        prepSpeedRating: 4,
        packagingQualityRating: 5,
      }),
    });
    assert.equal(shortName.status, 400);

    const invalidOrder = await fetch(`${baseUrl}/api/brands/rawaj/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: "رواج (Rawaj)",
        reviewerName: "تركي الحربي",
        prepSpeedRating: 4,
        packagingQualityRating: 5,
        orderNumber: "bad order!!",
      }),
    });
    assert.equal(invalidOrder.status, 400);

    const validRes = await fetch(`${baseUrl}/api/brands/rawaj/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: "رواج (Rawaj)",
        reviewerName: "بدر العسيري",
        prepSpeedRating: 2,
        packagingQualityRating: 5,
        orderNumber: "ord-2026-9910",
        comment: "التغليف ممتاز لكن تجهيز الطلب تأخر قليلاً",
      }),
    });
    assert.equal(validRes.status, 201);
    const created = await validRes.json();

    assert.equal(created.entry.brandSlug, "rawaj");
    assert.equal(created.entry.reviewerName, "بدر العسيري");
    assert.equal(created.entry.prepSpeedRating, 2);
    assert.equal(created.entry.packagingQualityRating, 5);
    assert.equal(created.entry.overallRating, 3.5);
    assert.equal(created.entry.verifiedOrder, true);
    assert.equal(created.entry.orderNumber, "ORD-2026-9910");

    // Seeded rawaj had prepSpeed [5, 5] + new 2 => 12/3 = 4.0
    // Seeded rawaj had packaging [5, 4] + new 5 => 14/3 = 4.7
    // avgOverall = (4.0 + 4.7) / 2 = 4.349999... => 4.3
    assert.equal(created.summary.ratingsCount, 3);
    assert.equal(created.summary.avgPrepSpeed, 4);
    assert.equal(created.summary.avgPackagingQuality, 4.7);
    assert.equal(created.summary.avgOverall, 4.3);

    // Confirm persistence via subsequent GET
    const confirmRes = await fetch(`${baseUrl}/api/brands/ratings?brandSlug=rawaj`);
    assert.equal(confirmRes.status, 200);
    const confirmData = await confirmRes.json();
    assert.equal(confirmData.summaries.rawaj.ratingsCount, 3);
    assert.equal(confirmData.summaries.rawaj.avgOverall, 4.3);
  });
});
