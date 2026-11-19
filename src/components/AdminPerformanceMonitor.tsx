import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type {
  AdminPerformanceReport,
  BottleneckPrediction,
  EndpointPerformanceStat,
  PerformanceWindow,
} from '../types';

interface AdminPerformanceMonitorProps {
  isActive: boolean;
}

const WINDOW_OPTIONS: Array<{ value: PerformanceWindow; label: string }> = [
  { value: '15m', label: 'آخر 15 دقيقة' },
  { value: '1h', label: 'آخر ساعة' },
  { value: '24h', label: '24 ساعة' },
  { value: '7d', label: '7 أيام' },
];

export const AdminPerformanceMonitor: React.FC<AdminPerformanceMonitorProps> = ({ isActive }) => {
  const [windowRange, setWindowRange] = useState<PerformanceWindow>('1h');
  const [report, setReport] = useState<AdminPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'slow' | 'errors'>('all');

  const fetchPerformance = useCallback(async (targetWindow: PerformanceWindow) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/performance?window=${encodeURIComponent(targetWindow)}`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'تعذر تحميل بيانات مراقبة الأداء.');
        return;
      }
      setReport(data as AdminPerformanceReport);
    } catch {
      setErrorMsg('تعذر الاتصال بخادم مراقبة الأداء.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      void fetchPerformance(windowRange);
    }
  }, [isActive, windowRange, fetchPerformance]);

  const filteredEndpoints = useMemo<EndpointPerformanceStat[]>(() => {
    if (!report) return [];
    const q = searchTerm.trim().toLowerCase();
    return report.endpoints.filter((ep) => {
      if (q && !ep.routeKey.toLowerCase().includes(q)) return false;
      if (statusFilter === 'slow') return ep.status === 'warning' || ep.status === 'critical';
      if (statusFilter === 'errors') return ep.clientErrorCount > 0 || ep.serverErrorCount > 0;
      return true;
    });
  }, [report, searchTerm, statusFilter]);

  const statusText = (s: EndpointPerformanceStat['status']) => {
    if (s === 'critical') return 'حرج';
    if (s === 'warning') return 'بطيء';
    return 'طبيعي';
  };

  const severityLabel = (s: BottleneckPrediction['severity']) => {
    if (s === 'critical') return 'اختناق حرج متوقع';
    if (s === 'warning') return 'تنبيه ارتفاع الكمون';
    return 'مؤشر حماية نشط';
  };

  if (loading && !report) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-5" aria-busy="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse" />
          <div className="h-72 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse" />
        </div>
        <div className="h-56 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (errorMsg && !report) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-950 border border-rose-500/40 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">تعذر عرض لوحة مراقبة الأداء</h3>
          <p className="text-xs text-slate-400">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void fetchPerformance(windowRange)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-2 transition whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
      {/* Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>مراقبة أداء الـ API والتنبؤ بالاختناقات التقنية</span>
          </h3>
          {report && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 font-mono tabular-nums">
              <span>الحالة العامة: {report.summary.overallStatus === 'critical' ? 'اختناق متوقع' : report.summary.overallStatus === 'warning' ? 'تحذير كمون' : 'مستقر'}</span>
              <span aria-hidden="true">·</span>
              <span>آخر قياس: {new Date(report.generatedAt).toLocaleTimeString('en-GB')}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {WINDOW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWindowRange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
                  windowRange === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchPerformance(windowRange)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold flex items-center gap-1.5 transition disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث الآن</span>
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* 4-Column KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>المئين 95 للاستجابة (P95)</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl font-extrabold text-white font-mono tabular-nums" dir="ltr">
                {report.summary.p95Ms.toFixed(1)} ms
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-2">
                <span>Avg: {report.summary.avgMs.toFixed(1)}ms</span>
                <span aria-hidden="true">·</span>
                <span>P50: {report.summary.p50Ms.toFixed(1)}ms</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>معدل نجاح الـ API</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-extrabold text-emerald-300 font-mono tabular-nums" dir="ltr">
                {report.summary.successRatePercent.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-2">
                <span>4xx: {report.summary.clientErrorRatePercent.toFixed(1)}%</span>
                <span aria-hidden="true">·</span>
                <span>5xx: {report.summary.serverErrorRatePercent.toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>حجم الطلبات المرصودة</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl font-extrabold text-white font-mono tabular-nums">
                {report.summary.totalRequests.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-2">
                <span>{report.summary.requestsPerMinute.toFixed(2)} req/min</span>
                <span aria-hidden="true">·</span>
                <span>P99: {report.summary.p99Ms.toFixed(1)}ms</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>مؤشر استخدام ميزات الأمان</span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-extrabold text-amber-300 font-mono tabular-nums" dir="ltr">
                {report.securityAdoption.overallScorePercent.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums flex items-center gap-2">
                <span>2FA: {report.securityAdoption.activePinAccounts}</span>
                <span aria-hidden="true">·</span>
                <span>WebAuthn: {report.securityAdoption.webauthnPasskeys}</span>
              </div>
            </div>
          </div>

          {/* Empty State if zero requests recorded in selected window */}
          {report.summary.totalRequests === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <Activity className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">لا توجد طلبات مسجلة في هذه النافذة الزمنية</h4>
              <p className="text-slate-400 max-w-md mx-auto">
                يبدأ الخادم بجمع قياسات زمن الاستجابة ونسب النجاح فور ورود الطلبات إلى مسارات الـ API.
              </p>
              <button
                type="button"
                onClick={() => setWindowRange('24h')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition whitespace-nowrap shrink-0"
              >
                عرض آخر 24 ساعة
              </button>
            </div>
          ) : (
            <>
              {/* Charts Grid: Latency Trend + Security Feature Adoption */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">اتجاه أوقات استجابة الـ API</h4>
                      <p className="text-[11px] text-slate-400">
                        مقارنة المئين P95 بالمتوسط (ms) عبر الفترات الزمنية لاكتشاف تصاعد الكمون
                      </p>
                    </div>
                  </div>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={report.timeSeries} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="ms" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#f8fafc',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="p95Ms"
                          name="P95 (ms)"
                          stroke="#6366f1"
                          fill="#6366f1"
                          fillOpacity={0.18}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgMs"
                          name="المتوسط (ms)"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Bar dataKey="errorCount" name="الأخطاء" fill="#f43f5e" barSize={12} radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">نسبة استخدام ميزات الأمان</h4>
                      <p className="text-[11px] text-slate-400">
                        قياس فعلي من سجلات المصادقة، مفاتيح WebAuthn، الجلسات الموقّعة، وحظر الصلاحيات
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-emerald-300" dir="ltr">
                      {report.securityAdoption.authenticatedRequestPercent.toFixed(1)}% جلسات موثّقة
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {report.securityAdoption.features.map((feat) => {
                      const barColor =
                        feat.status === 'optimal'
                          ? 'bg-emerald-500'
                          : feat.status === 'moderate'
                          ? 'bg-amber-500'
                          : 'bg-rose-500';
                      const statusLabel =
                        feat.status === 'optimal'
                          ? 'تغطية ممتازة'
                          : feat.status === 'moderate'
                          ? 'تغطية متوسطة'
                          : 'يحتاج تعزيز';
                      const labelTone =
                        feat.status === 'optimal'
                          ? 'text-emerald-300'
                          : feat.status === 'moderate'
                          ? 'text-amber-300'
                          : 'text-rose-300';

                      return (
                        <div key={feat.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-200">{feat.labelAr}</span>
                            <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] shrink-0">
                              <span className={labelTone}>{statusLabel}</span>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="font-extrabold text-white" dir="ltr">
                                {feat.adoptionPercent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full ${barColor} transition-all duration-300`}
                              style={{ width: `${Math.max(3, Math.min(100, feat.adoptionPercent))}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-400">{feat.detailAr}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottleneck Prediction Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">التنبؤ بالاختناقات التقنية وتنبيهات الـ SLA</h4>
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    عتبة التحذير: P95 &ge; 350ms · الحرج: P95 &ge; 1000ms
                  </span>
                </div>

                {report.bottlenecks.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3 text-emerald-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">لا توجد مؤشرات لاختناقات وشيكة</p>
                      <p className="text-[11px] text-slate-300">
                        تعمل جميع مسارات الـ API ضمن زمن الاستجابة المستهدف دون قفزات كمون أو ارتفاع في أخطاء الخادم.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.bottlenecks.map((bn) => {
                      const tone =
                        bn.severity === 'critical'
                          ? 'border-rose-500/40 bg-rose-950/20'
                          : bn.severity === 'warning'
                          ? 'border-amber-500/40 bg-amber-950/20'
                          : 'border-sky-500/40 bg-sky-950/20';
                      const textTone =
                        bn.severity === 'critical'
                          ? 'text-rose-300'
                          : bn.severity === 'warning'
                          ? 'text-amber-300'
                          : 'text-sky-300';
                      return (
                        <div key={bn.id} className={`p-4 rounded-xl border ${tone} space-y-2`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-extrabold ${textTone}`}>{severityLabel(bn.severity)}</span>
                            <span className="font-mono tabular-nums text-[11px] text-slate-300" dir="ltr">
                              P95 {bn.currentP95Ms.toFixed(1)}ms ({bn.trendDeltaPercent >= 0 ? '+' : ''}
                              {bn.trendDeltaPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <p className="font-bold text-white">{bn.titleAr}</p>
                          <p className="text-[11px] text-slate-300">{bn.reasonAr}</p>
                          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                            التوصية: {bn.recommendationAr}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Endpoint Breakdown Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-white">تفصيل أداء نقاط النهاية (Endpoints)</h4>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="تصفية حسب المسار..."
                        className="bg-slate-900 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                      {(
                        [
                          { id: 'all', label: 'الكل' },
                          { id: 'slow', label: 'بطيء / حرج' },
                          { id: 'errors', label: 'يحتوي أخطاء' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStatusFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
                            statusFilter === tab.id
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead className="bg-slate-900/90 text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">المسار</th>
                        <th className="py-2.5 px-3">الطلبات</th>
                        <th className="py-2.5 px-3">النجاح %</th>
                        <th className="py-2.5 px-3">Avg</th>
                        <th className="py-2.5 px-3">P50</th>
                        <th className="py-2.5 px-3">P95</th>
                        <th className="py-2.5 px-3">4xx / 5xx</th>
                        <th className="py-2.5 px-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {filteredEndpoints.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-500">
                            لا توجد نقاط نهاية مطابقة لمعايير البحث الحالية.
                          </td>
                        </tr>
                      ) : (
                        filteredEndpoints.map((ep) => {
                          const statusColor =
                            ep.status === 'critical'
                              ? 'text-rose-300'
                              : ep.status === 'warning'
                              ? 'text-amber-300'
                              : 'text-emerald-300';
                          return (
                            <tr key={ep.routeKey} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-slate-200" dir="ltr">
                                {ep.routeKey}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                                {ep.totalRequests}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-300" dir="ltr">
                                {ep.successRatePercent.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300" dir="ltr">
                                {ep.avgMs.toFixed(1)} ms
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300" dir="ltr">
                                {ep.p50Ms.toFixed(1)} ms
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-indigo-300" dir="ltr">
                                {ep.p95Ms.toFixed(1)} ms
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400" dir="ltr">
                                {ep.clientErrorCount} / {ep.serverErrorCount}
                              </td>
                              <td className={`py-2.5 px-3 font-bold ${statusColor}`}>
                                {statusText(ep.status)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
