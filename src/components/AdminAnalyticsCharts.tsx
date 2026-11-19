import React, { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  CalendarDays,
  PieChart as PieChartIcon,
  Award,
  AlertTriangle,
  BarChart3,
  ShoppingBag,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  Loader2,
  Table2,
  LayoutGrid,
} from 'lucide-react';
import { AdminStats, AuthUserRole, Order, Product, ReturnRequest, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import {
  DailySalesPoint,
  MonthlyProfitPoint,
  buildDailySalesSeries,
  buildMonthlyProfitSeries,
  buildFinancialAuditReport,
} from '../utils/financialAnalytics';
import { downloadFinancialExcelReport } from '../utils/excelExport';
import {
  downloadFinancialPdfReport,
  extractPaperReadyChartSvg,
  printFinancialAuditReport,
} from '../utils/pdfExport';
import { CompactSalesDataTables } from './CompactSalesDataTables';

interface AdminAnalyticsChartsProps {
  stats: AdminStats;
  orders: Order[];
  products: Product[];
  returnRequests: ReturnRequest[];
  settings: StoreSettings;
  exportedBy?: string;
  exporterRole?: AuthUserRole;
  onExportToast?: (msg: string) => void;
  compactMode?: boolean;
  onToggleCompactMode?: (next: boolean) => void;
}

type DailyPoint = DailySalesPoint;

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
  payload?: unknown;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadItem>;
  label?: string | number;
}

const CATEGORY_COLORS = ['#9127b3', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

export const AdminAnalyticsCharts: React.FC<AdminAnalyticsChartsProps> = ({
  stats,
  orders,
  products,
  returnRequests,
  settings,
  exportedBy,
  exporterRole,
  onExportToast,
  compactMode: controlledCompactMode,
  onToggleCompactMode,
}) => {
  const [dailyRange, setDailyRange] = useState<7 | 14 | 30>(14);
  const [dailySalesMode, setDailySalesMode] = useState<'sales-and-profit' | 'sales-only'>('sales-and-profit');
  const [monthlyRange, setMonthlyRange] = useState<3 | 6 | 12>(6);
  const [monthlyViewMode, setMonthlyViewMode] = useState<'combined' | 'profit-only'>('combined');
  const [internalCompactMode, setInternalCompactMode] = useState(false);
  const [exportingType, setExportingType] = useState<'excel' | 'pdf' | null>(null);
  const [lastExportMeta, setLastExportMeta] = useState<{
    format: 'Excel (.xlsx)' | 'PDF' | 'طباعة';
    refId: string;
    fileName?: string;
    time: string;
  } | null>(null);

  const isCompactMode = controlledCompactMode ?? internalCompactMode;
  const setCompactMode = (next: boolean) => {
    if (onToggleCompactMode) {
      onToggleCompactMode(next);
    } else {
      setInternalCompactMode(next);
    }
  };

  const dailySalesChartRef = useRef<HTMLDivElement | null>(null);
  const ordersVolumeChartRef = useRef<HTMLDivElement | null>(null);
  const monthlyProfitChartRef = useRef<HTMLDivElement | null>(null);

  const isLightTheme =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light';

  const axisColor = isLightTheme ? '#475569' : '#94a3b8';
  const gridColor = isLightTheme ? '#e2e8f0' : '#1e293b';

  const formatMoney = (sarVal: number) =>
    formatPrice(Math.round(sarVal), settings.activeCurrency, settings.yerExchangeRate);

  const liveOrdersSummary = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const totalSales = validOrders.reduce((sum, o) => sum + o.total, 0);
    return {
      count: validOrders.length,
      totalSales,
    };
  }, [orders]);

  // Build 30-day daily sales, order volume & AOV series enriched with live orders
  const dailySeriesFull: DailyPoint[] = useMemo(
    () => buildDailySalesSeries(orders),
    [orders]
  );

  const visibleDailyData = useMemo(
    () => dailySeriesFull.slice(-dailyRange),
    [dailySeriesFull, dailyRange]
  );

  // Build up to 12 months revenue, costs & net profit series
  const monthlyProfitFull: MonthlyProfitPoint[] = useMemo(
    () => buildMonthlyProfitSeries(stats, orders),
    [stats, orders]
  );

  const visibleMonthlyData = useMemo(
    () => monthlyProfitFull.slice(-monthlyRange),
    [monthlyProfitFull, monthlyRange]
  );

  const handleExportExcel = async () => {
    if (exportingType) return;
    setExportingType('excel');
    try {
      const report = await buildFinancialAuditReport({
        stats,
        orders,
        products,
        returnRequests,
        settings,
        dailyRange,
        monthlyRange,
        exportedBy,
        exporterRole,
      });
      const fileName = downloadFinancialExcelReport(report);
      setLastExportMeta({
        format: 'Excel (.xlsx)',
        refId: report.reportRefId,
        fileName,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      });
      onExportToast?.(`تم تصدير ملف التدقيق المالي Excel (${report.reportRefId}) بنجاح`);
    } catch {
      onExportToast?.('تعذر إنشاء ملف Excel المالي، يرجى المحاولة مرة أخرى.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPdf = async () => {
    if (exportingType) return;
    setExportingType('pdf');
    try {
      const report = await buildFinancialAuditReport({
        stats,
        orders,
        products,
        returnRequests,
        settings,
        dailyRange,
        monthlyRange,
        exportedBy,
        exporterRole,
      });
      const chartSnapshots = {
        dailySalesSvg: extractPaperReadyChartSvg(dailySalesChartRef.current),
        ordersVolumeSvg: extractPaperReadyChartSvg(ordersVolumeChartRef.current),
        monthlyProfitSvg: extractPaperReadyChartSvg(monthlyProfitChartRef.current),
      };
      const fileName = await downloadFinancialPdfReport(report, chartSnapshots);
      setLastExportMeta({
        format: 'PDF',
        refId: report.reportRefId,
        fileName,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      });
      onExportToast?.(`تم تصدير التقرير المالي المعتمد PDF (${report.reportRefId}) بنجاح`);
    } catch {
      onExportToast?.('تعذر إنشاء ملف PDF، جرب زر طباعة التقرير للتدقيق.');
    } finally {
      setExportingType(null);
    }
  };

  const handlePrintAuditReport = async () => {
    const report = await buildFinancialAuditReport({
      stats,
      orders,
      products,
      returnRequests,
      settings,
      dailyRange,
      monthlyRange,
      exportedBy,
      exporterRole,
    });
    const chartSnapshots = {
      dailySalesSvg: extractPaperReadyChartSvg(dailySalesChartRef.current),
      ordersVolumeSvg: extractPaperReadyChartSvg(ordersVolumeChartRef.current),
      monthlyProfitSvg: extractPaperReadyChartSvg(monthlyProfitChartRef.current),
    };
    printFinancialAuditReport(report, chartSnapshots);
    setLastExportMeta({
      format: 'طباعة',
      refId: report.reportRefId,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  // Decision-support KPIs synchronized with active timeframe filters
  const analyticsInsights = useMemo(() => {
    const periodSalesTotal = visibleDailyData.reduce((s, d) => s + d.sales, 0);
    const periodOrdersTotal = visibleDailyData.reduce((s, d) => s + d.orders, 0);
    const avgDailySales =
      visibleDailyData.length > 0 ? Math.round(periodSalesTotal / visibleDailyData.length) : 0;
    const avgDailyOrders =
      visibleDailyData.length > 0
        ? Number((periodOrdersTotal / visibleDailyData.length).toFixed(1))
        : 0;
    const bestDay = visibleDailyData.reduce(
      (best, curr) => (curr.sales > best.sales ? curr : best),
      visibleDailyData[0] || { label: '-', sales: 0, profit: 0, orders: 0, aov: 0, dateKey: '' }
    );

    const totalMonthlySales = visibleMonthlyData.reduce((s, m) => s + m.sales, 0);
    const totalMonthlyProfit = visibleMonthlyData.reduce((s, m) => s + m.profit, 0);
    const avgProfitMargin =
      totalMonthlySales > 0 ? Math.round((totalMonthlyProfit / totalMonthlySales) * 100) : 0;

    const lastMonth = visibleMonthlyData[visibleMonthlyData.length - 1];
    const prevMonth = visibleMonthlyData[visibleMonthlyData.length - 2];
    const monthGrowthPercent =
      lastMonth && prevMonth && prevMonth.profit > 0
        ? Number((((lastMonth.profit - prevMonth.profit) / prevMonth.profit) * 100).toFixed(1))
        : 0;

    const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= 10);
    const outOfStockCount = products.filter((p) => p.stock === 0).length;
    const pendingReturnsCount = returnRequests.filter(
      (r) => r.status === 'pending' || r.status === 'reviewing'
    ).length;

    const averageOrderValue =
      periodOrdersTotal > 0
        ? Math.round(periodSalesTotal / periodOrdersTotal)
        : Math.round(stats.totalSales / Math.max(1, stats.ordersCount));

    return {
      periodSalesTotal,
      periodOrdersTotal,
      avgDailyOrders,
      totalMonthlyProfit,
      avgProfitMargin,
      bestDay,
      avgDailySales,
      monthGrowthPercent,
      lowStockProducts,
      outOfStockCount,
      pendingReturnsCount,
      averageOrderValue,
    };
  }, [
    visibleMonthlyData,
    visibleDailyData,
    products,
    returnRequests,
    stats.totalSales,
    stats.ordersCount,
  ]);

  const renderDailyTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload as DailyPoint | undefined;
    if (!row) return null;
    return (
      <div
        dir="rtl"
        className="bg-slate-900 border border-[#551465]/60 rounded-2xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[180px]"
      >
        <div className="font-extrabold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
          <span>تاريخ {String(label ?? row.label)}</span>
          <span className="text-[10px] text-brand-300 font-bold font-mono tabular-nums">
            {row.orders} طلبات
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">المبيعات اليومية:</span>
          <strong className="text-brand-300 font-mono tabular-nums">
            {formatMoney(row.sales)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">صافي الربح:</span>
          <strong className="text-emerald-400 font-mono tabular-nums">
            {formatMoney(row.profit)}
          </strong>
        </div>
      </div>
    );
  };

  const renderOrdersTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload as DailyPoint | undefined;
    if (!row) return null;
    return (
      <div
        dir="rtl"
        className="bg-slate-900 border border-sky-500/50 rounded-2xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[185px]"
      >
        <div className="font-extrabold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
          <span>تاريخ {String(label ?? row.label)}</span>
          <span className="text-[10px] text-sky-300 font-bold font-mono tabular-nums">
            {row.orders} طلب
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">حجم الطلبات:</span>
          <strong className="text-sky-300 font-mono tabular-nums">{row.orders} طلبات</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">متوسط قيمة الطلب (AOV):</span>
          <strong className="text-amber-300 font-mono tabular-nums">
            {formatMoney(row.aov)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">إجمالي اليوم:</span>
          <strong className="text-slate-200 font-mono tabular-nums">
            {formatMoney(row.sales)}
          </strong>
        </div>
      </div>
    );
  };

  const renderMonthlyTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload as MonthlyProfitPoint | undefined;
    if (!row) return null;
    return (
      <div
        dir="rtl"
        className="bg-slate-900 border border-emerald-500/45 rounded-2xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[195px]"
      >
        <div className="font-extrabold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
          <span>شهر {String(label ?? row.month)}</span>
          <span className="text-[10px] text-amber-300 font-bold font-mono tabular-nums">
            هامش {row.marginPercent}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">إجمالي الإيرادات:</span>
          <strong className="text-brand-300 font-mono tabular-nums">
            {formatMoney(row.sales)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">صافي الأرباح:</span>
          <strong className="text-emerald-400 font-mono tabular-nums">
            {formatMoney(row.profit)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-300">التكاليف التشغيلية:</span>
          <strong className="text-slate-400 font-mono tabular-nums">
            {formatMoney(row.costs)}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80 text-[11px]">
          <span className="text-slate-400">عدد الطلبات:</span>
          <strong className="text-white font-mono tabular-nums">{row.orders} طلب</strong>
        </div>
      </div>
    );
  };

  const renderCategoryTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0]?.payload as
      | { category: string; count: number; percentage: number }
      | undefined;
    if (!item) return null;
    return (
      <div
        dir="rtl"
        className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-xl text-xs space-y-1"
      >
        <span className="font-extrabold text-white block">{item.category}</span>
        <span className="text-[11px] text-emerald-400 font-bold block font-mono tabular-nums">
          {item.percentage}% من إجمالي المبيعات ({item.count} عملية)
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Unified Timeframe & Financial Audit Export Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <CalendarDays className="w-4 h-4 text-brand-300 shrink-0" />
            <span className="font-bold text-white">لوحة التحليلات والتوثيق المالي</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400 text-[11px] font-mono tabular-nums">
              {dailyRange} يوماً للمبيعات والطلبات · {monthlyRange} أشهر للأرباح
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Compact Mode Accessible Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isCompactMode}
              onClick={() => setCompactMode(!isCompactMode)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
                isCompactMode
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="إخفاء الرسوم البيانية مؤقتاً وعرض جدول بيانات مبيعات تفصيلي أكثر كثافة"
            >
              {isCompactMode ? (
                <Table2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5 text-brand-300" />
              )}
              <span>الوضع المدمج (إخفاء الرسوم)</span>
              <span
                aria-hidden="true"
                className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                  isCompactMode ? 'bg-emerald-500 justify-start' : 'bg-slate-700 justify-end'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-white shadow-sm block" />
              </span>
            </button>

            {/* Daily Timeframe Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px]">
              <span className="px-2 text-slate-400 font-bold whitespace-nowrap shrink-0">يومي:</span>
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDailyRange(days)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                    dailyRange === days
                      ? 'bg-[#551465] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {days} {days === 7 ? 'أيام' : 'يوماً'}
                </button>
              ))}
            </div>

            {/* Monthly Timeframe Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px]">
              <span className="px-2 text-slate-400 font-bold whitespace-nowrap shrink-0">شهري:</span>
              {([
                { val: 3 as const, label: '3 أشهر' },
                { val: 6 as const, label: '6 أشهر' },
                { val: 12 as const, label: '12 شهراً' },
              ]).map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setMonthlyRange(item.val)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                    monthlyRange === item.val
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Audit Export Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400">
            تصدير تقارير المبيعات والأرباح ودفتر الطلبات للتدقيق المالي والاعتماد الإداري ({settings.activeCurrency})
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              disabled={exportingType !== null}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {exportingType === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>{exportingType === 'excel' ? 'جاري إنشاء Excel...' : 'تصدير Excel (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={exportingType !== null}
              className="px-3.5 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {exportingType === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{exportingType === 'pdf' ? 'جاري تجهيز PDF...' : 'تصدير PDF للتدقيق'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handlePrintAuditReport()}
              disabled={exportingType !== null}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>طباعة رسمية</span>
            </button>
          </div>
        </div>

        {lastExportMeta && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3 py-2 text-emerald-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                تم إصدار تقرير <strong className="font-mono">{lastExportMeta.format}</strong> بنجاح · المرجع:{' '}
                <strong className="font-mono" dir="ltr">{lastExportMeta.refId}</strong>
              </span>
            </div>
            <span className="text-emerald-400/90 font-mono tabular-nums" dir="ltr">
              {lastExportMeta.fileName ? `${lastExportMeta.fileName} · ` : ''}
              {lastExportMeta.time}
            </span>
          </div>
        )}
      </div>

      {/* Executive Decision Summary Strip Synced to Selected Timeframes */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 ${isCompactMode ? 'gap-2.5' : 'gap-3.5'}`}>
        <div className={`bg-slate-950 border border-slate-800 ${isCompactMode ? 'rounded-xl p-3' : 'rounded-2xl p-4'} flex items-center justify-between gap-3`}>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 block">
              صافي الأرباح ({monthlyRange} أشهر)
            </span>
            <strong className={`${isCompactMode ? 'text-base' : 'text-lg'} font-extrabold text-emerald-400 font-mono tabular-nums block`}>
              {formatMoney(analyticsInsights.totalMonthlyProfit)}
            </strong>
            <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
              متوسط الهامش: {analyticsInsights.avgProfitMargin}% · نمو شهري:{' '}
              {analyticsInsights.monthGrowthPercent >= 0 ? '+' : ''}
              {analyticsInsights.monthGrowthPercent}%
            </span>
          </div>
          {!isCompactMode && (
            <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className={`bg-slate-950 border border-slate-800 ${isCompactMode ? 'rounded-xl p-3' : 'rounded-2xl p-4'} flex items-center justify-between gap-3`}>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 block">
              مبيعات الفترة ({dailyRange} {dailyRange === 7 ? 'أيام' : 'يوماً'})
            </span>
            <strong className={`${isCompactMode ? 'text-base' : 'text-lg'} font-extrabold text-brand-300 font-mono tabular-nums block`}>
              {formatMoney(analyticsInsights.periodSalesTotal)}
            </strong>
            <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
              الأعلى: {analyticsInsights.bestDay.label} ({formatMoney(analyticsInsights.bestDay.sales)})
            </span>
          </div>
          {!isCompactMode && (
            <div className="w-10 h-10 rounded-xl bg-[#551465]/25 border border-brand-400/40 flex items-center justify-center text-brand-300 shrink-0">
              <Award className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className={`bg-slate-950 border border-slate-800 ${isCompactMode ? 'rounded-xl p-3' : 'rounded-2xl p-4'} flex items-center justify-between gap-3`}>
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 block">
              حجم الطلبات في الفترة ({dailyRange} {dailyRange === 7 ? 'أيام' : 'يوماً'})
            </span>
            <strong className={`${isCompactMode ? 'text-base' : 'text-lg'} font-extrabold text-sky-300 font-mono tabular-nums block`}>
              {analyticsInsights.periodOrdersTotal} طلب
            </strong>
            <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
              معدل {analyticsInsights.avgDailyOrders} طلب/يوم · AOV: {formatMoney(analyticsInsights.averageOrderValue)}
            </span>
          </div>
          {!isCompactMode && (
            <div className="w-10 h-10 rounded-xl bg-sky-950/60 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          )}
        </div>
      </div>

      {isCompactMode ? (
        <CompactSalesDataTables
          dailyRows={visibleDailyData}
          monthlyRows={visibleMonthlyData}
          orders={orders}
          categorySales={stats.categorySales}
          settings={settings}
          dailyRange={dailyRange}
          monthlyRange={monthlyRange}
          onShowCharts={() => setCompactMode(false)}
        />
      ) : (
        <>
      {/* Daily Charts Row: 1) Daily Sales Trends + 2) Daily Order Volume & AOV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Daily Sales & Profit Trends (AreaChart) */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-brand-300" />
                <span>اتجاهات المبيعات اليومية ({dailyRange} {dailyRange === 7 ? 'أيام' : 'يوماً'})</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                متابعة الأداء اليومي للمبيعات وصافي الربح التقديري لاكتشاف أيام الذروة
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px]">
              <button
                type="button"
                onClick={() => setDailySalesMode('sales-and-profit')}
                className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                  dailySalesMode === 'sales-and-profit'
                    ? 'bg-[#551465] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                المبيعات والأرباح
              </button>
              <button
                type="button"
                onClick={() => setDailySalesMode('sales-only')}
                className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                  dailySalesMode === 'sales-only'
                    ? 'bg-[#551465] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                المبيعات فقط
              </button>
            </div>
          </div>

          <div ref={dailySalesChartRef} className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={visibleDailyData}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rawajDailySalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#af3fd2" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#551465" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="rawajDailyProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(val: number) =>
                    val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)
                  }
                />
                <Tooltip content={renderDailyTooltip} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="المبيعات اليومية"
                  stroke="#cb6de5"
                  strokeWidth={2.5}
                  fill="url(#rawajDailySalesGrad)"
                  activeDot={{ r: 5, fill: '#cb6de5', stroke: '#ffffff', strokeWidth: 2 }}
                />
                {dailySalesMode === 'sales-and-profit' && (
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="صافي الربح"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#rawajDailyProfitGrad)"
                    activeDot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#cb6de5]" />
              <span>إجمالي المبيعات اليومية</span>
            </span>
            {dailySalesMode === 'sales-and-profit' && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>صافي الربح التقديري (28%)</span>
              </span>
            )}
          </div>
        </div>

        {/* Chart 2: Dedicated Order Volume & AOV ComposedChart */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                <span>حجم الطلبات اليومية ومتوسط السلة ({dailyRange} {dailyRange === 7 ? 'أيام' : 'يوماً'})</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                متابعة عدد الطلبات اليومية مقارنةً بمتوسط قيمة الطلب (AOV)
              </p>
            </div>
            <span className="text-[11px] text-sky-300 font-mono tabular-nums font-bold">
              الإجمالي: {analyticsInsights.periodOrdersTotal} طلب
            </span>
          </div>

          <div ref={ordersVolumeChartRef} className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={visibleDailyData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="orders"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="aov"
                  orientation="right"
                  tick={{ fill: '#fbbf24', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(val: number) =>
                    val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)
                  }
                />
                <Tooltip content={renderOrdersTooltip} />
                <Bar
                  yAxisId="orders"
                  dataKey="orders"
                  name="حجم الطلبات"
                  fill="#0ea5e9"
                  radius={[6, 6, 0, 0]}
                  barSize={dailyRange === 30 ? 8 : 16}
                />
                <Line
                  yAxisId="aov"
                  type="monotone"
                  dataKey="aov"
                  name="متوسط قيمة الطلب"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={dailyRange <= 14 ? { r: 3, fill: '#f59e0b' } : false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
              <span>عدد الطلبات اليومية</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>متوسط قيمة الطلب (AOV)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chart 3: Full-Width Monthly Revenue & Net Profits ComposedChart */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>الأرباح والإيرادات الشهرية ({monthlyRange} أشهر)</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              مقارنة الإيرادات الشهرية مع صافي الأرباح ومؤشر النمو المتدرج
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px]">
            <button
              type="button"
              onClick={() => setMonthlyViewMode('combined')}
              className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                monthlyViewMode === 'combined'
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              الإيرادات والأرباح
            </button>
            <button
              type="button"
              onClick={() => setMonthlyViewMode('profit-only')}
              className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                monthlyViewMode === 'profit-only'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              صافي الأرباح فقط
            </button>
          </div>
        </div>

        <div ref={monthlyProfitChartRef} className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={visibleMonthlyData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(val: number) =>
                  val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)
                }
              />
              <Tooltip content={renderMonthlyTooltip} />
              {monthlyViewMode === 'combined' && (
                <Bar
                  dataKey="sales"
                  name="الإيرادات الشهرية"
                  fill="#9127b3"
                  radius={[8, 8, 0, 0]}
                  barSize={monthlyRange === 12 ? 14 : 22}
                />
              )}
              <Bar
                dataKey="profit"
                name="صافي الأرباح"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                barSize={monthlyViewMode === 'combined' ? (monthlyRange === 12 ? 14 : 22) : 30}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="اتجاه صافي الربح"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#ffffff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300 pt-1">
          {monthlyViewMode === 'combined' && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#9127b3]" />
              <span>إجمالي الإيرادات</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>صافي الربح الشهري</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>مسار نمو الأرباح</span>
          </span>
        </div>
      </div>

      {/* Bottom Analytics Row: Category PieChart + Data-Driven Management Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Category Distribution Donut Chart */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-amber-400" />
              <span>حصة المبيعات حسب التصنيف</span>
            </h4>
            <span className="text-[11px] text-slate-400">تحليل المحفظة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-3">
            <div className="h-44 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categorySales}
                    dataKey="percentage"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {stats.categorySales.map((_, idx) => (
                      <Cell
                        key={`cat-cell-${idx}`}
                        fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={renderCategoryTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 text-xs">
              {stats.categorySales.map((cat, idx) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                    />
                    <span className="text-slate-200 font-bold truncate">{cat.category}</span>
                  </div>
                  <span className="font-mono font-extrabold text-brand-300 tabular-nums shrink-0">
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actionable Data-Driven Management Signals */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>مؤشرات القرار الإداري الفوري</span>
            </h4>
            <span className="text-[11px] text-brand-300 font-bold">تحليل حي للبيانات</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-emerald-400 font-extrabold block">
                التصنيف الأعلى مساهمة في الأرباح
              </span>
              <p className="text-slate-200 font-bold">
                {stats.categorySales[0]?.category || 'إلكترونيات وحواسيب'} (
                {stats.categorySales[0]?.percentage || 42}%)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                يُنصح بتوجيه ميزانية العروض الترويجية القادمة لهذا التصنيف لتعظيم العائد.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-amber-400 font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>تنبيه إعادة التزويد بالمخزون</span>
              </span>
              <p className="text-slate-200 font-bold font-mono tabular-nums">
                {analyticsInsights.lowStockProducts.length} منتجات منخفضة المخزون ·{' '}
                {analyticsInsights.outOfStockCount} نافدة
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {analyticsInsights.lowStockProducts.length > 0
                  ? `أبرزها: ${analyticsInsights.lowStockProducts[0].name} (متبقي ${analyticsInsights.lowStockProducts[0].stock})`
                  : 'كافة المنتجات حالياً بمستويات مخزون آمنة.'}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-brand-300 font-extrabold block">
                أداء التحصيل والطلبات المباشرة
              </span>
              <p className="text-slate-200 font-bold font-mono tabular-nums">
                {liveOrdersSummary.count} طلبات نشطة بقيمة {formatMoney(liveOrdersSummary.totalSales)}
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                أكثر من 65% من المشتريات تتم عبر المحافظ الإلكترونية والبطاقات البنكية.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-rose-400 font-extrabold block">
                طلبات الاسترجاع تحت المراجعة
              </span>
              <p className="text-slate-200 font-bold font-mono tabular-nums">
                {analyticsInsights.pendingReturnsCount} طلب بانتظار البتّ
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                سرعة معالجة الاسترجاعات تحافظ على مؤشر رضا العملاء فوق 96%.
              </p>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
