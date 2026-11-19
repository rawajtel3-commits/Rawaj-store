import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { buildFinancialAuditReport } from "../src/utils/financialAnalytics.js";
import { buildFinancialWorkbookBytes } from "../src/utils/excelExport.js";
import { buildFinancialAuditHtmlPages } from "../src/utils/pdfExport.js";
import type { AdminStats, Order, Product, ReturnRequest, StoreSettings } from "../src/types.js";

const SAMPLE_SETTINGS: StoreSettings = {
  storeName: "متجر رواج للتجارة الإلكترونية",
  storeCurrency: "ر.س",
  activeCurrency: "SAR",
  yerExchangeRate: 670,
  vatPercentage: 15,
  freeShippingThreshold: 200,
  sellerChatGreeting: "مرحباً بكم",
  supportPhone: "0500000000",
  supportEmail: "support@rawaj.store",
  commercialRegistration: "1010998877",
  vatNumber: "310123456700003",
};

const SAMPLE_STATS: AdminStats = {
  totalSales: 120000,
  ordersCount: 95,
  customersCount: 62,
  productsCount: 18,
  monthlyRevenue: [
    { month: "يناير 26", sales: 21000, orders: 15 },
    { month: "فبراير 26", sales: 24500, orders: 17 },
    { month: "مارس 26", sales: 23000, orders: 16 },
    { month: "أبريل 26", sales: 28000, orders: 19 },
    { month: "مايو 26", sales: 31500, orders: 21 },
    { month: "يونيو 26", sales: 36000, orders: 24 },
  ],
  categorySales: [
    { category: "إلكترونيات وحواسيب", count: 48, percentage: 45 },
    { category: "ساعات وإكسسوارات", count: 32, percentage: 30 },
    { category: "المنزل الذكي", count: 27, percentage: 25 },
  ],
};

const SAMPLE_ORDERS: Order[] = [
  {
    id: "ord-1",
    orderNumber: "RWJ-2026-1001",
    date: "2026-11-15",
    items: [],
    customer: {
      fullName: "خالد العتيبي",
      email: "khaled@example.com",
      phone: "0501112223",
      city: "الرياض",
      district: "العليا",
      street: "طريق الملك فهد",
    },
    paymentMethod: "card",
    paymentStatus: "paid",
    subtotal: 2000,
    discount: 100,
    vat: 285,
    shippingFee: 0,
    total: 2185,
    status: "delivered",
  },
  {
    id: "ord-2",
    orderNumber: "RWJ-2026-1002",
    date: "2026-11-16",
    items: [],
    customer: {
      fullName: '=HYPERLINK("https://evil.test","xss<script>alert(1)</script>")',
      email: "sara@example.com",
      phone: "0503334445",
      city: "جدة",
      district: "الروضة",
      street: "شارع التحلية",
    },
    paymentMethod: "cod",
    paymentStatus: "pending",
    subtotal: 1000,
    discount: 0,
    vat: 150,
    shippingFee: 35,
    total: 1185,
    status: "processing",
  },
  {
    id: "ord-3",
    orderNumber: "RWJ-2026-1003",
    date: "2026-11-14",
    items: [],
    customer: {
      fullName: "طلب ملغي",
      email: "cancel@example.com",
      phone: "0500001111",
      city: "الدمام",
      district: "الشاطئ",
      street: "الكورنيش",
    },
    paymentMethod: "card",
    paymentStatus: "failed",
    subtotal: 500,
    discount: 0,
    vat: 75,
    shippingFee: 25,
    total: 600,
    status: "cancelled",
  },
];

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "p-1",
    name: "لابتوب رواج برو",
    category: "electronics",
    categoryNameAr: "إلكترونيات وحواسيب",
    price: 4500,
    rating: 4.9,
    reviewCount: 12,
    description: "جهاز احترافي",
    images: [],
    stock: 4,
    specifications: [],
    reviews: [],
  },
];

const SAMPLE_RETURNS: ReturnRequest[] = [
  {
    id: "ret-1",
    requestNumber: "RET-901",
    orderId: "ord-1",
    orderNumber: "RWJ-2026-1001",
    productId: "p-1",
    productName: "لابتوب رواج برو",
    productImage: "",
    quantity: 1,
    refundAmount: 500,
    customerName: "خالد العتيبي",
    customerPhone: "0501112223",
    reason: "استبدال",
    resolution: "exchange",
    condition: "unopened",
    status: "pending",
    createdAt: "2026-11-16",
  },
];

describe("Financial Analytics & Audit Export (Excel .xlsx & PDF)", () => {
  it("computes reconciled KPIs, excludes cancelled orders from totals, and stamps integrity digest", async () => {
    const fixedNow = new Date("2026-11-16T09:30:00.000Z");
    const report = await buildFinancialAuditReport({
      stats: SAMPLE_STATS,
      orders: SAMPLE_ORDERS,
      products: SAMPLE_PRODUCTS,
      returnRequests: SAMPLE_RETURNS,
      settings: SAMPLE_SETTINGS,
      dailyRange: 7,
      monthlyRange: 12,
      exportedBy: "auditor@rawaj.store",
      exporterRole: "promoter_admin",
      now: fixedNow,
    });

    assert.equal(report.dailyRows.length, 7);
    assert.equal(report.monthlyRows.length, 12);
    assert.equal(report.liveOrdersSummary.activeCount, 2);
    assert.equal(report.liveOrdersSummary.cancelledCount, 1);
    assert.equal(report.liveOrdersSummary.paidTotal, 2185);
    assert.equal(report.liveOrdersSummary.pendingPaymentTotal, 1185);
    assert.equal(report.liveOrdersSummary.vatTotal, 435);
    assert.equal(report.liveOrdersSummary.discountTotal, 100);
    assert.equal(report.liveOrdersSummary.shippingTotal, 35);
    assert.equal(report.liveOrdersSummary.grossTotal, 3370);
    assert.match(report.reportRefId, /^AUD-FIN-20261116-/);
    assert.ok(report.integrityDigest.length >= 16);
  });

  it("generates a valid 5-sheet RTL ECMA-376 .xlsx workbook with formula-injection protection", async () => {
    const report = await buildFinancialAuditReport({
      stats: SAMPLE_STATS,
      orders: SAMPLE_ORDERS,
      products: SAMPLE_PRODUCTS,
      returnRequests: SAMPLE_RETURNS,
      settings: { ...SAMPLE_SETTINGS, activeCurrency: "YER", yerExchangeRate: 670 },
      dailyRange: 14,
      monthlyRange: 6,
      exportedBy: "telrawaj@gmail.com",
      exporterRole: "user_admin",
      now: new Date("2026-11-16T10:00:00.000Z"),
    });

    const xlsxBytes = buildFinancialWorkbookBytes(report);
    // Standard ZIP magic header "PK\x03\x04"
    assert.equal(xlsxBytes[0], 0x50);
    assert.equal(xlsxBytes[1], 0x4b);

    const files = unzipSync(xlsxBytes);
    assert.ok(files["[Content_Types].xml"]);
    assert.ok(files["xl/workbook.xml"]);
    assert.ok(files["xl/styles.xml"]);
    assert.ok(files["xl/worksheets/sheet1.xml"]);
    assert.ok(files["xl/worksheets/sheet2.xml"]);
    assert.ok(files["xl/worksheets/sheet3.xml"]);
    assert.ok(files["xl/worksheets/sheet4.xml"]);
    assert.ok(files["xl/worksheets/sheet5.xml"]);

    const workbookXml = strFromU8(files["xl/workbook.xml"]);
    assert.ok(workbookXml.includes("الملخص التنفيذي"));
    assert.ok(workbookXml.includes("المبيعات اليومية"));
    assert.ok(workbookXml.includes("الأرباح الشهرية"));
    assert.ok(workbookXml.includes("توزيع التصنيفات"));
    assert.ok(workbookXml.includes("دفتر الطلبات المالي"));

    const sheet5Xml = strFromU8(files["xl/worksheets/sheet5.xml"]);
    assert.ok(sheet5Xml.includes('rightToLeft="1"'), "Expected native Arabic RTL sheet view");
    // Formula injection must be prefixed with apostrophe and XML-escaped
    assert.ok(sheet5Xml.includes("&apos;=HYPERLINK("));
    assert.ok(!sheet5Xml.includes("<script>"));
    assert.ok(sheet5Xml.includes("RWJ-2026-1001"));
  });

  it("renders multi-page A4 Arabic RTL HTML pages for PDF/Print and escapes unsafe input", async () => {
    const report = await buildFinancialAuditReport({
      stats: SAMPLE_STATS,
      orders: SAMPLE_ORDERS,
      products: SAMPLE_PRODUCTS,
      returnRequests: SAMPLE_RETURNS,
      settings: SAMPLE_SETTINGS,
      dailyRange: 30,
      monthlyRange: 6,
      exportedBy: "auditor@rawaj.store",
      exporterRole: "promoter_admin",
      now: new Date("2026-11-16T11:00:00.000Z"),
    });

    const pages = buildFinancialAuditHtmlPages(report);
    assert.equal(pages.length, 3, "Expected Page 1 (charts/KPIs), Page 2 (tables), Page 3 (orders ledger)");
    assert.ok(pages[0].includes('direction:rtl'));
    assert.ok(pages[0].includes("1010998877"));
    assert.ok(pages[0].includes("310123456700003"));
    assert.ok(pages[1].includes("بيان الإيرادات والتكاليف وصافي الأرباح الشهرية"));
    assert.ok(pages[2].includes("RWJ-2026-1001"));
    assert.ok(!pages[2].includes("<script>alert(1)</script>"), "XSS payload must be escaped");
    assert.ok(pages[2].includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  });
});
