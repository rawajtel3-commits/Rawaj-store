import React, { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Eye,
  Flame,
  Lightbulb,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  AdminBehaviorAnalyticsReport,
  BehaviorTimeRange,
  StoreSettings,
} from '../types';
import { formatPrice } from '../utils/currency';

interface AdminBehaviorAnalyticsProps {
  isActive: boolean;
  settings: StoreSettings;
}

const RANGE_OPTIONS: Array<{ value: BehaviorTimeRange; label: string }> = [
  { value: '24h', label: 'آخر 24 ساعة' },
  { value: '7d', label: 'آخر 7 أيام' },
  { value: '30d', label: 'آخر 30 يوماً' },
];

const DEVICE_COLORS = ['#8b5cf6', '#10b981', '#f59e0b'];

export const AdminBehaviorAnalytics: React.FC<AdminBehaviorAnalyticsProps> = ({
  isActive,
  settings,
}) => {
  const [range, setRange] = useState<BehaviorTimeRange>('7d');
  const [report, setReport] = useState<AdminBehaviorAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBehaviorReport = useCallback(async (targetRange: BehaviorTimeRange) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/admin/behavior-analytics?range=${encodeURIComponent(targetRange)}`,
        { cache: 'no-store' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'تعذر تحميل تقارير سلوك المستخدمين.');
        return;
      }
      setReport(data as AdminBehaviorAnalyticsReport);
    } catch {
      setErrorMsg('تعذر الاتصال بخادم تحليلات سلوك المستخدمين.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      void fetchBehaviorReport(range);
    }
  }, [isActive, range, fetchBehaviorReport]);

  if (loading && !report) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-5" aria-busy="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (errorMsg && !report) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-950 border border-rose-500/40 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">تعذر عرض تحليلات سلوك المستخدمين</h3>
          <p className="text-xs text-slate-400">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void fetchBehaviorReport(range)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-2 transition whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const peakHoursList = report.hourlyTraffic
    .filter((h) => h.isPeak)
    .sort((a, b) => b.totalInteractions - a.totalInteractions)
    .slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            <span>تحليلات سلوك المستخدمين (Google Analytics & القياس الفوري)</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            رصد حي للمنتجات الأكثر مشاهدة، ساعات الذروة، قمع التحويل للسلة، وكلمات البحث لدعم القرارات الإدارية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* GA4 Library Stream Status (No key input UI per security policy) */}
          <span
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 ${
              report.gaStatus.measurementIdConfigured
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-sky-950/60 border-sky-500/40 text-sky-300'
            }`}
            title="حالة مكتبة react-ga4 ونظام التجميع المباشر"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>
              {report.gaStatus.measurementIdConfigured
                ? `GA4 متصل (${report.gaStatus.measurementIdMasked})`
                : 'react-ga4 جاهز + قياس مباشر فعّال'}
            </span>
          </span>

          {/* Time Range Switcher */}
          <div className="inline-flex bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                  range === opt.value
                    ? 'bg-[#551465] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void fetchBehaviorReport(range)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>ساعة الذروة الرئيسية</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-300 font-mono tabular-nums">
            {report.summary.peakHourLabel}
          </div>
          <p className="text-[11px] text-slate-400">
            <span className="font-mono tabular-nums font-bold text-white">
              {report.summary.peakHourEvents.toLocaleString()}
            </span>{' '}
            تفاعل خلال هذه الساعة
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>مشاهدات المنتجات</span>
            <Eye className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono tabular-nums">
            {report.summary.productViews.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">
            من أصل{' '}
            <span className="font-mono tabular-nums text-slate-200 font-bold">
              {report.summary.uniqueSessions.toLocaleString()}
            </span>{' '}
            جلسة تصفح
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>معدل الإضافة للسلة</span>
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {report.summary.viewToCartRatePercent}%
          </div>
          <p className="text-[11px] text-slate-400">
            <span className="font-mono tabular-nums text-white font-bold">
              {report.summary.addToCartCount.toLocaleString()}
            </span>{' '}
            إضافة للسلة مسجلة
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>تحويل الشراء الفعلي</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-sky-400 font-mono tabular-nums">
            {report.summary.conversionRatePercent}%
          </div>
          <p className="text-[11px] text-slate-400">
            <span className="font-mono tabular-nums text-white font-bold">
              {report.summary.purchaseCount.toLocaleString()}
            </span>{' '}
            طلب مكتمل من التصفح
          </p>
        </div>
      </div>

      {/* Peak Hours 24H Recharts Chart + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>توزيع التصفح وساعات الذروة (24 ساعة)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                الأعمدة الذهبية تمثل ساعات الذروة القصوى لحركة المتسوقين والإضافات للسلة.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                <span>ساعة ذروة</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 inline-block" />
                <span>نشاط اعتيادي</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={report.hourlyTraffic}
                margin={{ top: 10, right: 12, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval={2}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '11px',
                    direction: 'rtl',
                  }}
                  formatter={(value: unknown, name: unknown) => {
                    const labels: Record<string, string> = {
                      totalInteractions: 'إجمالي التفاعلات',
                      productViews: 'مشاهدات المنتجات',
                      addToCartCount: 'الإضافات للسلة',
                    };
                    const key = String(name || '');
                    return [Number(value || 0).toLocaleString(), labels[key] || key];
                  }}
                />
                <Bar dataKey="totalInteractions" radius={[6, 6, 0, 0]} maxBarSize={24}>
                  {report.hourlyTraffic.map((entry) => (
                    <Cell
                      key={`hour-cell-${entry.hour}`}
                      fill={entry.isPeak ? '#f59e0b' : '#8b5cf6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {peakHoursList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400">أعلى أوقات الذروة:</span>
              {peakHoursList.map((pk) => (
                <span
                  key={`pk-${pk.hour}`}
                  className="px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[11px] font-bold font-mono tabular-nums"
                >
                  {pk.label} ({pk.totalInteractions} تفاعل · {pk.addToCartCount} سلة)
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actionable Management Decisions */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              <span>توصيات دعم القرار الإداري</span>
            </h4>
            <div className="space-y-2.5">
              {report.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    rec.priority === 'high'
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : rec.priority === 'medium'
                      ? 'bg-violet-950/30 border-violet-500/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-extrabold text-white text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{rec.titleAr}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{rec.detailAr}</p>
                  <p className="text-[10px] font-bold text-emerald-300">
                    الإجراء المقترح: {rec.actionAr}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Device Split Summary */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                <span>توزيع الأجهزة</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                {report.summary.totalEvents.toLocaleString()} حدث
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={report.deviceBreakdown}
                      dataKey="eventsCount"
                      nameKey="labelAr"
                      innerRadius={22}
                      outerRadius={34}
                      paddingAngle={3}
                    >
                      {report.deviceBreakdown.map((entry, idx) => (
                        <Cell
                          key={entry.device}
                          fill={DEVICE_COLORS[idx % DEVICE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {report.deviceBreakdown.map((dev, idx) => (
                  <div
                    key={dev.device}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: DEVICE_COLORS[idx % DEVICE_COLORS.length] }}
                      />
                      <span>{dev.labelAr}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-white">
                      {dev.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Viewed Products Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-400" />
              <span>المنتجات الأكثر مشاهدة وتفاعلاً</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ترتيب المنتجات حسب عدد المشاهدات الفعلية ونسبة التحويل من المشاهدة إلى السلة والشراء.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-2.5 px-3 font-bold">#</th>
                <th className="py-2.5 px-3 font-bold">المنتج</th>
                <th className="py-2.5 px-3 font-bold">التصنيف</th>
                <th className="py-2.5 px-3 font-bold">المشاهدات</th>
                <th className="py-2.5 px-3 font-bold">إضافة للسلة</th>
                <th className="py-2.5 px-3 font-bold">معدل السلة</th>
                <th className="py-2.5 px-3 font-bold">مبيعات</th>
                <th className="py-2.5 px-3 font-bold">الإيراد المسجل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {report.topViewedProducts.map((prod, index) => (
                <tr
                  key={prod.productId}
                  className="hover:bg-slate-900/60 transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400 font-bold">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white max-w-xs truncate">
                    {prod.productName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{prod.category}</td>
                  <td className="py-2.5 px-3 font-mono tabular-nums font-extrabold text-violet-300">
                    {prod.views.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                    {prod.addToCartCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono tabular-nums font-bold text-[11px] ${
                        prod.viewToCartRatePercent >= 25
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                          : prod.viewToCartRatePercent >= 15
                          ? 'bg-sky-950/70 text-sky-300 border border-sky-500/30'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {prod.viewToCartRatePercent}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-400 font-bold">
                    {prod.purchaseCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                    {formatPrice(
                      prod.revenueSar,
                      settings.activeCurrency,
                      settings.yerExchangeRate
                    )}
                  </td>
                </tr>
              ))}
              {report.topViewedProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    لا توجد مشاهدات مسجلة في هذه الفترة الزمنية حتى الآن.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Interest & Search Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>الاهتمام حسب الأقسام</span>
          </h4>
          <div className="space-y-2.5">
            {report.categoryInterest.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-200">{cat.category}</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {cat.views.toLocaleString()} مشاهدة ({cat.sharePercent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-violet-500 to-emerald-400"
                    style={{ width: `${Math.min(100, Math.max(4, cat.sharePercent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-400" />
            <span>أكثر عبارات البحث داخل المتجر</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.topSearchTerms.map((term) => (
              <div
                key={term.term}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800"
              >
                <span className="font-bold text-slate-200 truncate">{term.term}</span>
                <span className="font-mono tabular-nums text-[11px] font-extrabold text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-500/30">
                  {term.count}
                </span>
              </div>
            ))}
            {report.topSearchTerms.length === 0 && (
              <p className="text-slate-400 col-span-2 py-4 text-center">
                لم يتم تسجيل عمليات بحث بعد في هذه الفترة.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
