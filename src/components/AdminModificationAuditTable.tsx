import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  DollarSign,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type {
  AdminModificationCategory,
  AdminModificationLogsResponse,
} from '../types';

interface AdminModificationAuditTableProps {
  isActive: boolean;
  isPromoterAdmin?: boolean;
  onToast?: (msg: string) => void;
}

type CategoryFilter = 'all' | AdminModificationCategory;

const CATEGORY_TABS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'جميع التعديلات' },
  { id: 'price_change', label: 'تغيير الأسعار' },
  { id: 'stock_update', label: 'تحديث المخزون' },
  { id: 'permission_change', label: 'تعديل الصلاحيات' },
  { id: 'settings_update', label: 'الإعدادات' },
  { id: 'product_catalog', label: 'الكتالوج' },
];

export const AdminModificationAuditTable: React.FC<AdminModificationAuditTableProps> = ({
  isActive,
  isPromoterAdmin = false,
  onToast,
}) => {
  const [data, setData] = useState<AdminModificationLogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Optional inline RBAC assignment drawer for promoter_admin
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleEmail, setRoleEmail] = useState('');
  const [roleTarget, setRoleTarget] = useState<'user_admin' | 'promoter_admin' | 'customer'>('user_admin');
  const [savingRole, setSavingRole] = useState(false);

  const loadModificationLogs = useCallback(
    async (cat: CategoryFilter, search: string) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const params = new URLSearchParams();
        params.set('category', cat);
        if (search.trim()) params.set('search', search.trim());
        params.set('limit', '150');

        const res = await fetch(`/api/admin/modification-logs?${params.toString()}`, {
          cache: 'no-store',
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMsg(body.error || 'تعذر تحميل سجل تعديلات المسؤولين.');
          return;
        }
        setData(body as AdminModificationLogsResponse);
      } catch {
        setErrorMsg('تعذر الاتصال بخادم سجل التعديلات.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isActive) return;
    const timer = window.setTimeout(() => {
      void loadModificationLogs(categoryFilter, searchQuery);
    }, searchQuery ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [isActive, categoryFilter, searchQuery, loadModificationLogs]);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleEmail.trim()) return;
    setSavingRole(true);
    try {
      const res = await fetch('/api/admin/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: roleEmail.trim(), role: roleTarget }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (onToast) onToast(`❌ ${body.error || 'تعذر تحديث الصلاحية'}`);
        return;
      }
      setRoleEmail('');
      setShowRoleForm(false);
      await loadModificationLogs(categoryFilter, searchQuery);
      if (onToast) onToast('✅ تم تحديث صلاحيات المسؤول وتوثيقه في سجل الأمان');
    } finally {
      setSavingRole(false);
    }
  };

  const renderCategoryBadge = (category: AdminModificationCategory) => {
    switch (category) {
      case 'price_change':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold whitespace-nowrap">
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
            <span>تغيير سعر</span>
          </span>
        );
      case 'stock_update':
        return (
          <span className="inline-flex items-center gap-1.5 text-sky-300 font-bold whitespace-nowrap">
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>تحديث مخزون</span>
          </span>
        );
      case 'permission_change':
        return (
          <span className="inline-flex items-center gap-1.5 text-rose-300 font-bold whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>تعديل صلاحيات</span>
          </span>
        );
      case 'product_catalog':
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold whitespace-nowrap">
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span>الكتالوج</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-indigo-300 font-bold whitespace-nowrap">
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span>إعدادات</span>
          </span>
        );
    }
  };

  const formatRoleArabic = (role: string) => {
    if (role === 'promoter_admin') return 'أدمن المروّج';
    if (role === 'user_admin') return 'أدمن المتجر';
    return role;
  };

  const formatTimestamp = (iso: string) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const summary = data?.summary;

  return (
    <section className="pt-6 border-t border-slate-800 space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>سجل تعديلات المسؤولين (الأسعار، المخزون، والصلاحيات)</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            توثيق غير قابل للتعديل من الواجهة لجميع التعديلات الإدارية مع اسم المسؤول، القيمة السابقة والجديدة، والطابع الزمني الدقيق.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPromoterAdmin && (
            <button
              type="button"
              onClick={() => setShowRoleForm((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{showRoleForm ? 'إغلاق نموذج الصلاحيات' : 'تعديل صلاحية مسؤول'}</span>
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadModificationLogs(categoryFilter, searchQuery)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-[11px] font-bold inline-flex items-center gap-1.5 transition disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث السجل</span>
          </button>
        </div>
      </div>

      {/* Inline RBAC Role Assignment Form (Promoter Admin Only) */}
      {isPromoterAdmin && showRoleForm && (
        <form
          onSubmit={handleAssignRole}
          className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              البريد الإلكتروني للحساب
            </label>
            <input
              type="email"
              dir="ltr"
              required
              value={roleEmail}
              onChange={(e) => setRoleEmail(e.target.value)}
              placeholder="manager@rawaj.store"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="w-48">
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              الصلاحية الجديدة
            </label>
            <select
              value={roleTarget}
              onChange={(e) =>
                setRoleTarget(e.target.value as 'user_admin' | 'promoter_admin' | 'customer')
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
            >
              <option value="user_admin">أدمن المتجر (user_admin)</option>
              <option value="promoter_admin">أدمن المروّج (promoter_admin)</option>
              <option value="customer">سحب صلاحية الإدارة (customer)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={savingRole}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {savingRole ? 'جاري الحفظ...' : 'اعتماد الصلاحية'}
          </button>
        </form>
      )}

      {/* Summary Counters Row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400">إجمالي التعديلات</span>
            <span className="text-base font-extrabold text-white font-mono tabular-nums">
              {summary.total.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400">تغييرات الأسعار</span>
            <span className="text-base font-extrabold text-amber-300 font-mono tabular-nums">
              {summary.priceChanges.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400">تحديثات المخزون</span>
            <span className="text-base font-extrabold text-sky-300 font-mono tabular-nums">
              {summary.stockUpdates.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400">تعديلات الصلاحيات</span>
            <span className="text-base font-extrabold text-rose-300 font-mono tabular-nums">
              {summary.permissionChanges.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap shrink-0 ${
                categoryFilter === tab.id
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المسؤول أو المنتج..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
          />
        </div>
      </div>

      {/* Loading / Error / Table */}
      {loading && !data ? (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2" aria-busy="true">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-10 rounded-lg bg-slate-900 animate-pulse" />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="bg-slate-950 border border-rose-500/40 rounded-2xl p-6 text-center space-y-2">
          <p className="text-rose-300 font-bold">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void loadModificationLogs(categoryFilter, searchQuery)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] text-slate-400">
                  <th className="py-3 px-3.5 font-bold whitespace-nowrap">المسؤول</th>
                  <th className="py-3 px-3.5 font-bold whitespace-nowrap">نوع التعديل</th>
                  <th className="py-3 px-3.5 font-bold">العنصر المستهدف والتفاصيل</th>
                  <th className="py-3 px-3.5 font-bold whitespace-nowrap">القيمة السابقة ← الجديدة</th>
                  <th className="py-3 px-3.5 font-bold whitespace-nowrap">الطابع الزمني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data && data.logs.length > 0 ? (
                  data.logs.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-900/50 transition-colors text-[11px]"
                    >
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="font-bold text-white">{entry.actorName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{formatRoleArabic(entry.actorRole)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono" dir="ltr">
                            {entry.actorEmailMasked}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 align-top">
                        <div>{renderCategoryBadge(entry.category)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {entry.actionLabelAr}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 align-top max-w-xs">
                        <div className="font-bold text-slate-100 truncate" title={entry.targetName}>
                          {entry.targetName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={entry.summaryAr}>
                          {entry.summaryAr}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 align-top whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                          <span className="text-slate-400 line-through">
                            {entry.previousValue}
                          </span>
                          <ArrowLeft className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="text-emerald-300 font-bold">
                            {entry.newValue}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {entry.fieldLabelAr}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 align-top whitespace-nowrap">
                        <div className="font-mono tabular-nums text-slate-200" dir="ltr">
                          {formatTimestamp(entry.createdAt)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums mt-0.5" dir="ltr">
                          IP: {entry.ipAddress}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      لا توجد تعديلات مطابقة لمعايير البحث أو التصفية الحالية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
