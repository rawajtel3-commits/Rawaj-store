import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type {
  AdminSecurityAlertsResponse,
  SecurityAlertRecord,
  SecurityAlertSeverity,
  SecurityAlertStatus,
} from '../types';
import { AdminModificationAuditTable } from './AdminModificationAuditTable';

interface AdminSecurityAlertsProps {
  isActive: boolean;
  isPromoterAdmin?: boolean;
  onAlertsUpdated?: (unreadCount: number, latestAlert: SecurityAlertRecord | null, dashboardEnabled: boolean) => void;
  onToast?: (msg: string) => void;
}

export const AdminSecurityAlerts: React.FC<AdminSecurityAlertsProps> = ({
  isActive,
  isPromoterAdmin = false,
  onAlertsUpdated,
  onToast,
}) => {
  const [data, setData] = useState<AdminSecurityAlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | SecurityAlertStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | SecurityAlertSeverity>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Settings form state
  const [recipientEmail, setRecipientEmail] = useState('telrawaj@gmail.com');
  const [dashboardEnabled, setDashboardEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [multiIpThreshold, setMultiIpThreshold] = useState(3);
  const [repeatedAttemptsThreshold, setRepeatedAttemptsThreshold] = useState(5);
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/security-alerts', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(body.error || 'تعذر تحميل التنبيهات الأمنية.');
        return;
      }
      const typed = body as AdminSecurityAlertsResponse;
      setData(typed);
      setRecipientEmail(typed.settings.recipientEmail);
      setDashboardEnabled(typed.settings.dashboardEnabled);
      setEmailEnabled(typed.settings.emailEnabled);
      setMultiIpThreshold(typed.settings.multiIpThreshold);
      setRepeatedAttemptsThreshold(typed.settings.repeatedAttemptsThreshold);
      setWindowMinutes(typed.settings.windowMinutes);

      if (onAlertsUpdated) {
        const latestUnread = typed.alerts.find((a) => a.status === 'unread') || null;
        onAlertsUpdated(typed.unreadCount, latestUnread, typed.settings.dashboardEnabled);
      }
    } catch {
      setErrorMsg('تعذر الاتصال بخادم التنبيهات الأمنية.');
    } finally {
      setLoading(false);
    }
  }, [onAlertsUpdated]);

  useEffect(() => {
    if (isActive) {
      void loadAlerts();
    }
  }, [isActive, loadAlerts]);

  const filteredAlerts = useMemo(() => {
    if (!data) return [];
    return data.alerts.filter((alert) => {
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [data, statusFilter, severityFilter]);

  const handleUpdateStatus = async (alertId: string, status: 'acknowledged' | 'resolved') => {
    setBusyId(alertId);
    try {
      const res = await fetch(`/api/admin/security-alerts/${encodeURIComponent(alertId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await loadAlerts();
        if (onToast) {
          onToast(status === 'resolved' ? '✅ تم إغلاق التنبيه الأمني' : '👁️ تم تأكيد استلام التنبيه');
        }
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/security-alerts/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          dashboardEnabled,
          emailEnabled,
          multiIpThreshold,
          repeatedAttemptsThreshold,
          windowMinutes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (onToast) onToast(`❌ ${body.error || 'تعذر حفظ الإعدادات'}`);
        return;
      }
      await loadAlerts();
      if (onToast) onToast('✅ تم حفظ إعدادات التنبيهات الأمنية والبريد');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTriggerTest = async () => {
    setSendingTest(true);
    try {
      const res = await fetch('/api/admin/security-alerts/test', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        await loadAlerts();
        const emailState = body?.alert?.emailStatus;
        if (onToast) {
          onToast(
            emailState === 'sent'
              ? '📧 تم إرسال تنبيه تجريبي إلى البريد ولوحة التحكم'
              : '🔔 تم تسجيل التنبيه التجريبي داخل لوحة التحكم'
          );
        }
      }
    } finally {
      setSendingTest(false);
    }
  };

  const severityLabel = (s: SecurityAlertSeverity) => {
    if (s === 'critical') return 'حرج';
    if (s === 'high') return 'مرتفع';
    return 'متوسط';
  };

  const statusLabel = (s: SecurityAlertStatus) => {
    if (s === 'unread') return 'غير مقروء';
    if (s === 'acknowledged') return 'قيد المتابعة';
    return 'تمت المعالجة';
  };

  const emailStatusLabel = (s: SecurityAlertRecord['emailStatus']) => {
    if (s === 'sent') return 'تم الإرسال عبر البريد';
    if (s === 'failed') return 'تعذر إرسال البريد';
    if (s === 'disabled') return 'البريد معطّل';
    return 'إشعار داخل اللوحة';
  };

  if (loading && !data) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-4" aria-busy="true">
        <div className="h-24 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-950 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-950 border border-rose-500/40 rounded-2xl p-6 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-sm font-bold text-white">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void loadAlerts()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
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
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-rose-400" />
            <span>مركز التنبيهات الأمنية ورصد النشاط المشبوه</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
            تنبيهات غير مقروءة: {data?.unreadCount || 0} · قناة البريد:{' '}
            {data?.emailTransportConfigured
              ? `نشطة (${data.emailTransportMode})`
              : 'إشعارات لوحة التحكم الفورية (لم يتم تفعيل مفتاح بريد خارجي)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={sendingTest}
            onClick={() => void handleTriggerTest()}
            className="px-4 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 font-bold flex items-center gap-1.5 transition disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingTest ? 'جاري الإرسال...' : 'إرسال تنبيه تجريبي'}</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void loadAlerts()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold flex items-center gap-1.5 transition disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Main Split: Alerts Feed (Left/Right) + Notification Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Alerts Feed */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              {([
                { id: 'all', label: 'الكل' },
                { id: 'unread', label: 'غير مقروء' },
                { id: 'acknowledged', label: 'قيد المتابعة' },
                { id: 'resolved', label: 'تمت المعالجة' },
              ] as const).map((tab) => (
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

            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              {([
                { id: 'all', label: 'كل المستويات' },
                { id: 'critical', label: 'حرج' },
                { id: 'high', label: 'مرتفع' },
                { id: 'medium', label: 'متوسط' },
              ] as const).map((sev) => (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverityFilter(sev.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
                    severityFilter === sev.id
                      ? 'bg-[#551465] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">لا توجد تنبيهات مشبوهة مطابقة للتصفية</h4>
              <p className="text-slate-400">
                يراقب النظام تلقائياً محاولات الوصول المتكررة لصفحات الإدارة من عناوين IP مختلفة وتخمين رمز PIN وتصعيد الصلاحيات.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const borderColor =
                  alert.status === 'resolved'
                    ? 'border-slate-800 opacity-75'
                    : alert.severity === 'critical'
                    ? 'border-rose-500/45'
                    : alert.severity === 'high'
                    ? 'border-amber-500/40'
                    : 'border-sky-500/35';
                const sevColor =
                  alert.severity === 'critical'
                    ? 'text-rose-300'
                    : alert.severity === 'high'
                    ? 'text-amber-300'
                    : 'text-sky-300';

                return (
                  <div
                    key={alert.id}
                    className={`bg-slate-950 border ${borderColor} rounded-2xl p-4 space-y-3`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums">
                          <span className={`font-extrabold ${sevColor}`}>{severityLabel(alert.severity)}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-300">{statusLabel(alert.status)}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400">{emailStatusLabel(alert.emailStatus)}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-slate-400" dir="ltr">
                            {new Date(alert.updatedAt).toLocaleString('en-GB')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{alert.titleAr}</h4>
                      </div>

                      {alert.status !== 'resolved' && (
                        <div className="flex items-center gap-2 shrink-0">
                          {alert.status === 'unread' && (
                            <button
                              type="button"
                              disabled={busyId === alert.id}
                              onClick={() => void handleUpdateStatus(alert.id, 'acknowledged')}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition whitespace-nowrap shrink-0"
                            >
                              تأكيد الاستلام
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === alert.id}
                            onClick={() => void handleUpdateStatus(alert.id, 'resolved')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 font-bold flex items-center gap-1 transition whitespace-nowrap shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>إغلاق وحل</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-slate-300 leading-relaxed">{alert.descriptionAr}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono tabular-nums">
                      <div>
                        <span className="text-slate-500 block">عناوين IP المرصودة ({alert.distinctIpCount}):</span>
                        <span className="text-rose-200 break-all" dir="ltr">
                          {alert.ips.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">المسارات المستهدفة:</span>
                        <span className="text-indigo-300 break-all" dir="ltr">
                          {alert.routes.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">الحساب / المحاولات:</span>
                        <span className="text-slate-200">
                          {alert.actorSummary} · {alert.attemptCount} محاولات
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Mail className="w-4 h-4 text-brand-300" />
            <h4 className="text-sm font-bold text-white">إعدادات التنبيهات وقناة البريد</h4>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-slate-200 font-bold">إشعارات فورية داخل لوحة الأدمن</span>
              <input
                type="checkbox"
                checked={dashboardEnabled}
                onChange={(e) => setDashboardEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#551465]"
              />
            </label>

            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-slate-200 font-bold">إرسال تنبيهات عبر الإيميل</span>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#551465]"
              />
            </label>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">البريد المستلم للتنبيهات الأمنية</label>
              <input
                type="email"
                dir="ltr"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 text-[11px] font-bold">تعدد IPs</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={multiIpThreshold}
                  onChange={(e) => setMultiIpThreshold(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 text-[11px] font-bold">المحاولات</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={repeatedAttemptsThreshold}
                  onChange={(e) => setRepeatedAttemptsThreshold(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 text-[11px] font-bold">النافذة (د)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={windowMinutes}
                  onChange={(e) => setWindowMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-100 font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            عند تجاوز {multiIpThreshold} عناوين IP مختلفة أو {repeatedAttemptsThreshold} محاولات مرفوضة خلال{' '}
            {windowMinutes} دقيقة، يُنشأ تنبيه فوري في اللوحة ويُرسل للبريد إذا كانت خدمة الإرسال (`RESEND_API_KEY` أو Webhook) مضبوطة على الخادم.
          </p>

          <button
            type="submit"
            disabled={savingSettings}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50"
          >
            {savingSettings ? 'جاري الحفظ...' : 'حفظ إعدادات الحماية والتنبيه'}
          </button>
        </form>
      </div>

      {/* Detailed Admin Modifications Audit Table (Prices, Stock, Permissions) */}
      <AdminModificationAuditTable
        isActive={isActive}
        isPromoterAdmin={isPromoterAdmin}
        onToast={onToast}
      />
    </div>
  );
};
