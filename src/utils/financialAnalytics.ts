import { AdminStats, AuthUserRole, Order, Product, ReturnRequest, StoreSettings } from '../types';
import { formatPrice } from './currency';

export interface DailySalesPoint {
  dateKey: string;
  label: string;
  sales: number;
  profit: number;
  orders: number;
  aov: number;
  marginPercent: number;
}

export interface MonthlyProfitPoint {
  month: string;
  sales: number;
  costs: number;
  profit: number;
  orders: number;
  marginPercent: number;
  growthPercent: number | null;
}

export interface FinancialOrderLedgerRow {
  orderNumber: string;
  date: string;
  customerName: string;
  paymentMethodAr: string;
  paymentStatusAr: string;
  orderStatusAr: string;
  isCancelled: boolean;
  subtotal: number;
  discount: number;
  vat: number;
  shippingFee: number;
  total: number;
}

export interface FinancialAuditReportData {
  reportRefId: string;
  generatedAtIso: string;
  generatedAtAr: string;
  exportedBy: string;
  exporterRole: AuthUserRole;
  dailyRange: 7 | 14 | 30;
  monthlyRange: 3 | 6 | 12;
  settings: StoreSettings;
  currencyCode: StoreSettings['activeCurrency'];
  currencyLabel: string;
  storeTotalSales: number;
  storeTotalOrdersCount: number;
  customersCount: number;
  productsCount: number;
  liveOrdersSummary: {
    activeCount: number;
    cancelledCount: number;
    paidTotal: number;
    pendingPaymentTotal: number;
    subtotalTotal: number;
    discountTotal: number;
    vatTotal: number;
    shippingTotal: number;
    grossTotal: number;
  };
  kpis: {
    periodSalesTotal: number;
    periodProfitTotal: number;
    periodOrdersTotal: number;
    avgDailySales: number;
    avgDailyOrders: number;
    averageOrderValue: number;
    bestDayLabel: string;
    bestDaySales: number;
    totalMonthlySales: number;
    totalMonthlyCosts: number;
    totalMonthlyProfit: number;
    avgProfitMargin: number;
    monthGrowthPercent: number;
    lowStockCount: number;
    outOfStockCount: number;
    pendingReturnsCount: number;
  };
  dailyRows: DailySalesPoint[];
  monthlyRows: MonthlyProfitPoint[];
  categoryRows: { category: string; count: number; percentage: number }[];
  orderRows: FinancialOrderLedgerRow[];
  integrityDigest: string;
}

// 30-day deterministic store pattern (offset 0 = today, 29 = 29 days ago) enriched with live session orders
export const BASE_30_DAY_PATTERN = [
  { offset: 29, sales: 3120, orders: 3 },
  { offset: 28, sales: 3680, orders: 4 },
  { offset: 27, sales: 2950, orders: 3 },
  { offset: 26, sales: 4120, orders: 4 },
  { offset: 25, sales: 4890, orders: 5 },
  { offset: 24, sales: 4410, orders: 4 },
  { offset: 23, sales: 5230, orders: 5 },
  { offset: 22, sales: 3980, orders: 4 },
  { offset: 21, sales: 4650, orders: 5 },
  { offset: 20, sales: 5420, orders: 6 },
  { offset: 19, sales: 4990, orders: 5 },
  { offset: 18, sales: 6150, orders: 6 },
  { offset: 17, sales: 5720, orders: 6 },
  { offset: 16, sales: 4840, orders: 5 },
  { offset: 15, sales: 5310, orders: 5 },
  { offset: 14, sales: 6080, orders: 6 },
  { offset: 13, sales: 4200, orders: 4 },
  { offset: 12, sales: 5150, orders: 5 },
  { offset: 11, sales: 3890, orders: 3 },
  { offset: 10, sales: 6420, orders: 6 },
  { offset: 9, sales: 7180, orders: 7 },
  { offset: 8, sales: 5940, orders: 5 },
  { offset: 7, sales: 6810, orders: 6 },
  { offset: 6, sales: 8250, orders: 8 },
  { offset: 5, sales: 7490, orders: 7 },
  { offset: 4, sales: 9320, orders: 9 },
  { offset: 3, sales: 10450, orders: 10 },
  { offset: 2, sales: 8760, orders: 8 },
  { offset: 1, sales: 11200, orders: 11 },
  { offset: 0, sales: 9650, orders: 9 },
];

export const PRIOR_6_MONTHS_BASELINE = [
  { month: 'يوليو 25', sales: 13400, orders: 9, margin: 0.21 },
  { month: 'أغسطس 25', sales: 14900, orders: 10, margin: 0.22 },
  { month: 'سبتمبر 25', sales: 14200, orders: 9, margin: 0.22 },
  { month: 'أكتوبر 25', sales: 16100, orders: 11, margin: 0.23 },
  { month: 'نوفمبر 25', sales: 17800, orders: 12, margin: 0.24 },
  { month: 'ديسمبر 25', sales: 19400, orders: 13, margin: 0.24 },
];

export const MONTHLY_MARGIN_RATES = [0.24, 0.26, 0.25, 0.28, 0.29, 0.31];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'بطاقة ائتمانية / مدى',
  cod: 'الدفع عند الاستلام',
  stc_pay: 'STC Pay / محفظة إلكترونية',
  apple_pay: 'Apple Pay',
  tamara: 'تمارا (تقسيط)',
  tabby: 'تابي (تقسيط)',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'مدفوع',
  pending: 'قيد الانتظار',
  failed: 'فشل الدفع',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export function convertSarAmount(sarAmount: number, settings: StoreSettings): number {
  if (settings.activeCurrency === 'YER') {
    return Math.round(sarAmount * settings.yerExchangeRate);
  }
  if (settings.activeCurrency === 'USD') {
    return Number((sarAmount / 3.75).toFixed(2));
  }
  return Math.round(sarAmount);
}

export function formatReportMoney(sarAmount: number, settings: StoreSettings): string {
  return formatPrice(Math.round(sarAmount), settings.activeCurrency, settings.yerExchangeRate);
}

export function buildDailySalesSeries(orders: Order[], referenceDate = new Date()): DailySalesPoint[] {
  const todayKey = referenceDate.toISOString().split('T')[0];

  const orderTotalsByDate = new Map<string, { sales: number; orders: number }>();
  for (const ord of orders) {
    if (ord.status === 'cancelled') continue;
    const isoMatch = ord.date.match(/\d{4}-\d{2}-\d{2}/);
    const key = isoMatch ? isoMatch[0] : todayKey;
    const current = orderTotalsByDate.get(key) || { sales: 0, orders: 0 };
    orderTotalsByDate.set(key, {
      sales: current.sales + ord.total,
      orders: current.orders + 1,
    });
  }

  return BASE_30_DAY_PATTERN.map((entry) => {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - entry.offset);
    const key = d.toISOString().split('T')[0];
    const liveForDay = orderTotalsByDate.get(key);
    const extraSales =
      entry.offset === 0
        ? orders
            .filter((o) => o.status !== 'cancelled' && o.id.startsWith('ord-17'))
            .reduce((s, o) => s + o.total, 0)
        : liveForDay?.sales || 0;
    const extraOrders =
      entry.offset === 0
        ? orders.filter((o) => o.status !== 'cancelled' && o.id.startsWith('ord-17')).length
        : liveForDay?.orders || 0;

    const totalDaySales = Math.round(entry.sales + extraSales);
    const totalDayOrders = Math.max(1, entry.orders + extraOrders);
    const dayProfit = Math.round(totalDaySales * 0.28);
    const aov = Math.round(totalDaySales / totalDayOrders);

    const label = d.toLocaleDateString('ar-SA', {
      month: 'numeric',
      day: 'numeric',
    });

    return {
      dateKey: key,
      label,
      sales: totalDaySales,
      profit: dayProfit,
      orders: totalDayOrders,
      aov,
      marginPercent: totalDaySales > 0 ? Math.round((dayProfit / totalDaySales) * 100) : 0,
    };
  });
}

export function buildMonthlyProfitSeries(stats: AdminStats, orders: Order[]): MonthlyProfitPoint[] {
  const newSessionSales = orders
    .filter((o) => o.status !== 'cancelled' && o.id.startsWith('ord-17'))
    .reduce((sum, o) => sum + o.total, 0);
  const newSessionOrdersCount = orders.filter(
    (o) => o.status !== 'cancelled' && o.id.startsWith('ord-17')
  ).length;

  const priorHalf: Omit<MonthlyProfitPoint, 'growthPercent'>[] = PRIOR_6_MONTHS_BASELINE.map((p) => {
    const profit = Math.round(p.sales * p.margin);
    return {
      month: p.month,
      sales: p.sales,
      costs: Math.max(0, p.sales - profit),
      profit,
      orders: p.orders,
      marginPercent: Math.round(p.margin * 100),
    };
  });

  const currentHalf: Omit<MonthlyProfitPoint, 'growthPercent'>[] = stats.monthlyRevenue.map((item, idx) => {
    const isLatestMonth = idx === stats.monthlyRevenue.length - 1;
    const sales = Math.round(item.sales + (isLatestMonth ? newSessionSales : 0));
    const ordersCount = item.orders + (isLatestMonth ? newSessionOrdersCount : 0);
    const margin = MONTHLY_MARGIN_RATES[idx % MONTHLY_MARGIN_RATES.length] ?? 0.27;
    const profit = Math.round(sales * margin);
    const costs = Math.max(0, sales - profit);

    return {
      month: item.month,
      sales,
      costs,
      profit,
      orders: ordersCount,
      marginPercent: Math.round(margin * 100),
    };
  });

  const combined = [...priorHalf, ...currentHalf];
  return combined.map((point, index) => {
    if (index === 0) return { ...point, growthPercent: null };
    const prev = combined[index - 1];
    const growthPercent =
      prev && prev.profit > 0
        ? Number((((point.profit - prev.profit) / prev.profit) * 100).toFixed(1))
        : null;
    return { ...point, growthPercent };
  });
}

async function computeSha256Hex(input: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const encoded = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic FNV-1a 64-bit style hex if WebCrypto subtle is absent
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function buildFinancialAuditReport(params: {
  stats: AdminStats;
  orders: Order[];
  products: Product[];
  returnRequests: ReturnRequest[];
  settings: StoreSettings;
  dailyRange: 7 | 14 | 30;
  monthlyRange: 3 | 6 | 12;
  exportedBy?: string;
  exporterRole?: AuthUserRole;
  now?: Date;
}): Promise<FinancialAuditReportData> {
  const now = params.now || new Date();
  const { stats, orders, products, returnRequests, settings, dailyRange, monthlyRange } = params;

  const dailyFull = buildDailySalesSeries(orders, now);
  const dailyRows = dailyFull.slice(-dailyRange);

  const monthlyFull = buildMonthlyProfitSeries(stats, orders);
  const monthlyRows = monthlyFull.slice(-monthlyRange);

  const periodSalesTotal = dailyRows.reduce((s, d) => s + d.sales, 0);
  const periodProfitTotal = dailyRows.reduce((s, d) => s + d.profit, 0);
  const periodOrdersTotal = dailyRows.reduce((s, d) => s + d.orders, 0);
  const avgDailySales = dailyRows.length > 0 ? Math.round(periodSalesTotal / dailyRows.length) : 0;
  const avgDailyOrders =
    dailyRows.length > 0 ? Number((periodOrdersTotal / dailyRows.length).toFixed(1)) : 0;
  const bestDay = dailyRows.reduce(
    (best, curr) => (curr.sales > best.sales ? curr : best),
    dailyRows[0] || { label: '-', sales: 0, profit: 0, orders: 0, aov: 0, dateKey: '', marginPercent: 0 }
  );

  const totalMonthlySales = monthlyRows.reduce((s, m) => s + m.sales, 0);
  const totalMonthlyCosts = monthlyRows.reduce((s, m) => s + m.costs, 0);
  const totalMonthlyProfit = monthlyRows.reduce((s, m) => s + m.profit, 0);
  const avgProfitMargin =
    totalMonthlySales > 0 ? Math.round((totalMonthlyProfit / totalMonthlySales) * 100) : 0;

  const lastMonth = monthlyRows[monthlyRows.length - 1];
  const prevMonth = monthlyRows[monthlyRows.length - 2];
  const monthGrowthPercent =
    lastMonth && prevMonth && prevMonth.profit > 0
      ? Number((((lastMonth.profit - prevMonth.profit) / prevMonth.profit) * 100).toFixed(1))
      : 0;

  const averageOrderValue =
    periodOrdersTotal > 0
      ? Math.round(periodSalesTotal / periodOrdersTotal)
      : Math.round(stats.totalSales / Math.max(1, stats.ordersCount));

  const activeOrders = orders.filter((o) => o.status !== 'cancelled');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  const liveOrdersSummary = {
    activeCount: activeOrders.length,
    cancelledCount: cancelledOrders.length,
    paidTotal: activeOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.total, 0),
    pendingPaymentTotal: activeOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((s, o) => s + o.total, 0),
    subtotalTotal: activeOrders.reduce((s, o) => s + o.subtotal, 0),
    discountTotal: activeOrders.reduce(
      (s, o) => s + (o.discount || 0) + (o.loyaltyDiscount || 0) + (o.giftVoucherDiscount || 0),
      0
    ),
    vatTotal: activeOrders.reduce((s, o) => s + (o.vat || 0), 0),
    shippingTotal: activeOrders.reduce((s, o) => s + (o.shippingFee || 0), 0),
    grossTotal: activeOrders.reduce((s, o) => s + o.total, 0),
  };

  const orderRows: FinancialOrderLedgerRow[] = orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: o.date,
    customerName: o.customer.fullName,
    paymentMethodAr: PAYMENT_METHOD_LABELS[o.paymentMethod] || o.paymentMethod,
    paymentStatusAr: PAYMENT_STATUS_LABELS[o.paymentStatus] || o.paymentStatus,
    orderStatusAr: ORDER_STATUS_LABELS[o.status] || o.status,
    isCancelled: o.status === 'cancelled',
    subtotal: o.subtotal,
    discount: (o.discount || 0) + (o.loyaltyDiscount || 0) + (o.giftVoucherDiscount || 0),
    vat: o.vat,
    shippingFee: o.shippingFee,
    total: o.total,
  }));

  const storeTotalSales = activeOrders.reduce((sum, o) => sum + o.total, 0) + stats.totalSales;
  const storeTotalOrdersCount = stats.ordersCount + orders.length;

  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const shortSeq = now.toISOString().slice(11, 19).replace(/:/g, '');
  const reportRefId = `AUD-FIN-${yyyymmdd}-${shortSeq}`;

  const canonicalPayload = JSON.stringify({
    reportRefId,
    storeName: settings.storeName,
    vatNumber: settings.vatNumber || '',
    crNumber: settings.commercialRegistration || '',
    dailyRange,
    monthlyRange,
    periodSalesTotal,
    totalMonthlySales,
    totalMonthlyProfit,
    liveGross: liveOrdersSummary.grossTotal,
    liveVat: liveOrdersSummary.vatTotal,
  });

  const integrityDigest = await computeSha256Hex(canonicalPayload);

  const currencyLabel =
    settings.activeCurrency === 'YER'
      ? `الريال اليمني (1 ر.س = ${settings.yerExchangeRate} ر.ي)`
      : settings.activeCurrency === 'USD'
      ? 'الدولار الأمريكي (USD)'
      : 'الريال السعودي (SAR)';

  return {
    reportRefId,
    generatedAtIso: now.toISOString(),
    generatedAtAr: now.toLocaleString('ar-SA', {
      dateStyle: 'full',
      timeStyle: 'short',
    }),
    exportedBy: params.exportedBy || 'حساب الإدارة المعتمد',
    exporterRole: params.exporterRole || 'user_admin',
    dailyRange,
    monthlyRange,
    settings,
    currencyCode: settings.activeCurrency,
    currencyLabel,
    storeTotalSales,
    storeTotalOrdersCount,
    customersCount: stats.customersCount,
    productsCount: products.length,
    liveOrdersSummary,
    kpis: {
      periodSalesTotal,
      periodProfitTotal,
      periodOrdersTotal,
      avgDailySales,
      avgDailyOrders,
      averageOrderValue,
      bestDayLabel: bestDay.label,
      bestDaySales: bestDay.sales,
      totalMonthlySales,
      totalMonthlyCosts,
      totalMonthlyProfit,
      avgProfitMargin,
      monthGrowthPercent,
      lowStockCount: products.filter((p) => p.stock > 0 && p.stock <= 10).length,
      outOfStockCount: products.filter((p) => p.stock === 0).length,
      pendingReturnsCount: returnRequests.filter(
        (r) => r.status === 'pending' || r.status === 'reviewing'
      ).length,
    },
    dailyRows,
    monthlyRows,
    categoryRows: stats.categorySales,
    orderRows,
    integrityDigest,
  };
}
