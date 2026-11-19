import React, { useMemo, useState } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  BarChart3,
  ShoppingBag,
  Layers,
  X,
} from 'lucide-react';
import { AdminStats, Order, StoreSettings } from '../types';
import {
  DailySalesPoint,
  MonthlyProfitPoint,
  formatReportMoney,
} from '../utils/financialAnalytics';

interface CompactSalesDataTablesProps {
  dailyRows: DailySalesPoint[];
  monthlyRows: MonthlyProfitPoint[];
  orders: Order[];
  categorySales: AdminStats['categorySales'];
  settings: StoreSettings;
  dailyRange: 7 | 14 | 30;
  monthlyRange: 3 | 6 | 12;
  onShowCharts: () => void;
}

type TableViewTab = 'daily' | 'monthly' | 'orders';
type DailySortKey = 'dateKey' | 'orders' | 'sales' | 'profit' | 'aov' | 'deltaPercent';
type MonthlySortKey = 'monthIndex' | 'orders' | 'sales' | 'costs' | 'profit' | 'marginPercent';
type OrdersSortKey = 'date' | 'orderNumber' | 'subtotal' | 'vat' | 'total';
type SortDirection = 'asc' | 'desc';

const PAYMENT_METHOD_AR: Record<string, string> = {
  card: 'بطاقة بنكية',
  cod: 'عند الاستلام',
  stc_pay: 'STC Pay',
  apple_pay: 'Apple Pay',
  tamara: 'تمارا',
  tabby: 'تابي',
};

const ORDER_STATUS_AR: Record<Order['status'], { label: string; cls: string }> = {
  delivered: { label: 'تم التوصيل', cls: 'text-emerald-400' },
  shipped: { label: 'تم الشحن', cls: 'text-sky-400' },
  processing: { label: 'قيد التجهيز', cls: 'text-amber-400' },
  pending: { label: 'بانتظار التأكيد', cls: 'text-slate-300' },
  cancelled: { label: 'ملغي', cls: 'text-rose-400' },
};

export const CompactSalesDataTables: React.FC<CompactSalesDataTablesProps> = ({
  dailyRows,
  monthlyRows,
  orders,
  categorySales,
  settings,
  dailyRange,
  monthlyRange,
  onShowCharts,
}) => {
  const [tableTab, setTableTab] = useState<TableViewTab>('daily');
  const [searchQuery, setSearchQuery] = useState('');

  const [dailySort, setDailySort] = useState<{ key: DailySortKey; dir: SortDirection }>({
    key: 'dateKey',
    dir: 'desc',
  });
  const [monthlySort, setMonthlySort] = useState<{ key: MonthlySortKey; dir: SortDirection }>({
    key: 'monthIndex',
    dir: 'desc',
  });
  const [ordersSort, setOrdersSort] = useState<{ key: OrdersSortKey; dir: SortDirection }>({
    key: 'date',
    dir: 'desc',
  });

  const formatMoney = (sarVal: number) =>
    formatReportMoney(sarVal, settings);

  // Enrich daily rows with estimated costs, cumulative sales, share %, day-over-day delta %, and benchmark
  const enrichedDailyRows = useMemo(() => {
    const totalSales = dailyRows.reduce((s, r) => s + r.sales, 0);
    const avgSales = dailyRows.length > 0 ? totalSales / dailyRows.length : 0;
    let runningSales = 0;

    return dailyRows.map((row, idx) => {
      runningSales += row.sales;
      const costs = Math.max(0, row.sales - row.profit);
      const sharePercent = totalSales > 0 ? Number(((row.sales / totalSales) * 100).toFixed(1)) : 0;
      const prev = idx > 0 ? dailyRows[idx - 1] : null;
      const deltaPercent =
        prev && prev.sales > 0
          ? Number((((row.sales - prev.sales) / prev.sales) * 100).toFixed(1))
          : null;
      const aboveAvg = row.sales >= avgSales;
      return {
        ...row,
        costs,
        cumulativeSales: runningSales,
        sharePercent,
        deltaPercent,
        aboveAvg,
      };
    });
  }, [dailyRows]);

  const filteredSortedDaily = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? enrichedDailyRows.filter(
          (r) =>
            r.dateKey.toLowerCase().includes(q) ||
            r.label.toLowerCase().includes(q) ||
            String(r.orders).includes(q)
        )
      : enrichedDailyRows;

    return [...filtered].sort((a, b) => {
      const mul = dailySort.dir === 'asc' ? 1 : -1;
      if (dailySort.key === 'dateKey') return a.dateKey.localeCompare(b.dateKey) * mul;
      if (dailySort.key === 'deltaPercent') {
        return ((a.deltaPercent ?? -9999) - (b.deltaPercent ?? -9999)) * mul;
      }
      return (a[dailySort.key] - b[dailySort.key]) * mul;
    });
  }, [enrichedDailyRows, searchQuery, dailySort]);

  const dailyTotals = useMemo(() => {
    const ordersCount = filteredSortedDaily.reduce((s, r) => s + r.orders, 0);
    const sales = filteredSortedDaily.reduce((s, r) => s + r.sales, 0);
    const costs = filteredSortedDaily.reduce((s, r) => s + r.costs, 0);
    const profit = filteredSortedDaily.reduce((s, r) => s + r.profit, 0);
    const aov = ordersCount > 0 ? Math.round(sales / ordersCount) : 0;
    const margin = sales > 0 ? Math.round((profit / sales) * 100) : 0;
    return { ordersCount, sales, costs, profit, aov, margin };
  }, [filteredSortedDaily]);

  const enrichedMonthlyRows = useMemo(() => {
    const totalSales = monthlyRows.reduce((s, m) => s + m.sales, 0);
    return monthlyRows.map((row, idx) => ({
      ...row,
      monthIndex: idx,
      sharePercent: totalSales > 0 ? Number(((row.sales / totalSales) * 100).toFixed(1)) : 0,
    }));
  }, [monthlyRows]);

  const filteredSortedMonthly = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? enrichedMonthlyRows.filter((r) => r.month.toLowerCase().includes(q))
      : enrichedMonthlyRows;

    return [...filtered].sort((a, b) => {
      const mul = monthlySort.dir === 'asc' ? 1 : -1;
      return (a[monthlySort.key] - b[monthlySort.key]) * mul;
    });
  }, [enrichedMonthlyRows, searchQuery, monthlySort]);

  const monthlyTotals = useMemo(() => {
    const ordersCount = filteredSortedMonthly.reduce((s, r) => s + r.orders, 0);
    const sales = filteredSortedMonthly.reduce((s, r) => s + r.sales, 0);
    const costs = filteredSortedMonthly.reduce((s, r) => s + r.costs, 0);
    const profit = filteredSortedMonthly.reduce((s, r) => s + r.profit, 0);
    const margin = sales > 0 ? Math.round((profit / sales) * 100) : 0;
    return { ordersCount, sales, costs, profit, margin };
  }, [filteredSortedMonthly]);

  const filteredSortedOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? orders.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customer.fullName.toLowerCase().includes(q) ||
            o.date.toLowerCase().includes(q) ||
            (PAYMENT_METHOD_AR[o.paymentMethod] || o.paymentMethod).toLowerCase().includes(q)
        )
      : orders;

    return [...filtered].sort((a, b) => {
      const mul = ordersSort.dir === 'asc' ? 1 : -1;
      if (ordersSort.key === 'date') return a.date.localeCompare(b.date) * mul;
      if (ordersSort.key === 'orderNumber') return a.orderNumber.localeCompare(b.orderNumber) * mul;
      return (a[ordersSort.key] - b[ordersSort.key]) * mul;
    });
  }, [orders, searchQuery, ordersSort]);

  const ordersTotals = useMemo(() => {
    const active = filteredSortedOrders.filter((o) => o.status !== 'cancelled');
    return {
      activeCount: active.length,
      cancelledCount: filteredSortedOrders.length - active.length,
      subtotal: active.reduce((s, o) => s + o.subtotal, 0),
      discount: active.reduce(
        (s, o) => s + (o.discount || 0) + (o.loyaltyDiscount || 0) + (o.giftVoucherDiscount || 0),
        0
      ),
      vat: active.reduce((s, o) => s + o.vat, 0),
      shipping: active.reduce((s, o) => s + o.shippingFee, 0),
      total: active.reduce((s, o) => s + o.total, 0),
    };
  }, [filteredSortedOrders]);

  const toggleDailySort = (key: DailySortKey) => {
    setDailySort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const toggleMonthlySort = (key: MonthlySortKey) => {
    setMonthlySort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const toggleOrdersSort = (key: OrdersSortKey) => {
    setOrdersSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const renderSortIcon = (active: boolean, dir: SortDirection) => {
    if (!active) return <ArrowUpDown className="w-3 h-3 text-slate-500 inline-block mr-1" />;
    return dir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-brand-300 inline-block mr-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-brand-300 inline-block mr-1" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Compact Mode Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-white">الوضع المدمج نشط</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400 text-[11px]">
            تم إخفاء الرسوم البيانية الكبيرة مؤقتاً لتوفير رؤية جدولية مكثفة وسريعة القراءة
          </span>
        </div>
        <button
          type="button"
          onClick={onShowCharts}
          className="text-[11px] font-bold text-brand-300 hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0 transition"
        >
          إظهار الرسوم البيانية الكبيرة
        </button>
      </div>

      {/* High-Density Data Table Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Table Workbench Header: Sub-views + Search */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-[11px] overflow-x-auto">
            <button
              type="button"
              onClick={() => setTableTab('daily')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                tableTab === 'daily'
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>المبيعات اليومية ({dailyRange} يوماً)</span>
            </button>

            <button
              type="button"
              onClick={() => setTableTab('monthly')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                tableTab === 'monthly'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>الأرباح الشهرية ({monthlyRange} أشهر)</span>
            </button>

            <button
              type="button"
              onClick={() => setTableTab('orders')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                tableTab === 'orders'
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>سجل الطلبات والتصنيفات ({orders.length})</span>
            </button>
          </div>

          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                tableTab === 'daily'
                  ? 'تصفية بالتاريخ أو اليوم...'
                  : tableTab === 'monthly'
                  ? 'تصفية باسم الشهر...'
                  : 'بحث برقم الطلب أو العميل...'
              }
              className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl pr-8 pl-8 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table 1: Daily Sales & Order Volume Detailed Table */}
        {tableTab === 'daily' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            {filteredSortedDaily.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <p>لا توجد أيام مطابقة لعبارة البحث "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  عرض جميع الأيام
                </button>
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-[11px]">
                <thead className="bg-slate-900 text-slate-300 sticky top-0 z-10 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleDailySort('dateKey')} className="hover:text-white">
                        التاريخ (ISO)
                        {renderSortIcon(dailySort.key === 'dateKey', dailySort.dir)}
                      </button>
                    </th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">اليوم</th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleDailySort('orders')} className="hover:text-white">
                        الطلبات
                        {renderSortIcon(dailySort.key === 'orders', dailySort.dir)}
                      </button>
                    </th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleDailySort('sales')} className="hover:text-white">
                        المبيعات اليومية
                        {renderSortIcon(dailySort.key === 'sales', dailySort.dir)}
                      </button>
                    </th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">التكاليف المقدّرة</th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleDailySort('profit')} className="hover:text-white">
                        صافي الربح
                        {renderSortIcon(dailySort.key === 'profit', dailySort.dir)}
                      </button>
                    </th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleDailySort('aov')} className="hover:text-white">
                        متوسط السلة
                        {renderSortIcon(dailySort.key === 'aov', dailySort.dir)}
                      </button>
                    </th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">التراكمي</th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">الحصة</th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleDailySort('deltaPercent')} className="hover:text-white">
                        التغير
                        {renderSortIcon(dailySort.key === 'deltaPercent', dailySort.dir)}
                      </button>
                    </th>
                    <th className="py-2 px-2.5 font-bold whitespace-nowrap">الأداء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredSortedDaily.map((row) => (
                    <tr key={row.dateKey} className="even:bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                      <td className="py-1.5 px-2.5 font-mono tabular-nums text-slate-300 whitespace-nowrap" dir="ltr">
                        {row.dateKey}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-200 font-bold whitespace-nowrap">
                        {row.label}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono tabular-nums text-sky-300 font-bold whitespace-nowrap">
                        {row.orders}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono tabular-nums text-white font-extrabold whitespace-nowrap">
                        {formatMoney(row.sales)}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {formatMoney(row.costs)}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono tabular-nums text-emerald-400 font-bold whitespace-nowrap">
                        {formatMoney(row.profit)}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono tabular-nums text-amber-300 whitespace-nowrap">
                        {formatMoney(row.aov)}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono tabular-nums text-brand-300 whitespace-nowrap">
                        {formatMoney(row.cumulativeSales)}
                      </td>
                      <td className="py-1.5 px-2.5 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {row.sharePercent}%
                      </td>
                      <td className="py-1.5 px-2.5 font-mono tabular-nums whitespace-nowrap" dir="ltr">
                        {row.deltaPercent === null ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <span className={row.deltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {row.deltaPercent >= 0 ? '+' : ''}
                            {row.deltaPercent}%
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <span className={row.aboveAvg ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {row.aboveAvg ? 'فوق المتوسط' : 'ضمن المتوسط'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-extrabold text-[11px] sticky bottom-0">
                  <tr>
                    <td className="py-2 px-2.5 text-brand-300" colSpan={2}>
                      الإجمالي ({filteredSortedDaily.length} يوماً)
                    </td>
                    <td className="py-2 px-2.5 font-mono tabular-nums text-sky-300">
                      {dailyTotals.ordersCount}
                    </td>
                    <td className="py-2 px-2.5 font-mono tabular-nums text-white">
                      {formatMoney(dailyTotals.sales)}
                    </td>
                    <td className="py-2 px-2.5 font-mono tabular-nums text-slate-300">
                      {formatMoney(dailyTotals.costs)}
                    </td>
                    <td className="py-2 px-2.5 font-mono tabular-nums text-emerald-400">
                      {formatMoney(dailyTotals.profit)}
                    </td>
                    <td className="py-2 px-2.5 font-mono tabular-nums text-amber-300">
                      {formatMoney(dailyTotals.aov)}
                    </td>
                    <td className="py-2 px-2.5 font-mono tabular-nums text-slate-300" colSpan={4}>
                      متوسط الهامش: {dailyTotals.margin}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* Table 2: Monthly Revenue, Costs & Net Profit Detailed Table */}
        {tableTab === 'monthly' && (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            {filteredSortedMonthly.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <p>لا توجد أشهر مطابقة لعبارة البحث "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  عرض جميع الأشهر
                </button>
              </div>
            ) : (
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-slate-900 text-slate-300 sticky top-0 z-10 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleMonthlySort('monthIndex')} className="hover:text-white">
                        الشهر
                        {renderSortIcon(monthlySort.key === 'monthIndex', monthlySort.dir)}
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleMonthlySort('orders')} className="hover:text-white">
                        الطلبات
                        {renderSortIcon(monthlySort.key === 'orders', monthlySort.dir)}
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleMonthlySort('sales')} className="hover:text-white">
                        إجمالي الإيرادات
                        {renderSortIcon(monthlySort.key === 'sales', monthlySort.dir)}
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleMonthlySort('costs')} className="hover:text-white">
                        التكاليف التشغيلية
                        {renderSortIcon(monthlySort.key === 'costs', monthlySort.dir)}
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleMonthlySort('profit')} className="hover:text-white">
                        صافي الربح
                        {renderSortIcon(monthlySort.key === 'profit', monthlySort.dir)}
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                      <button type="button" onClick={() => toggleMonthlySort('marginPercent')} className="hover:text-white">
                        هامش الربح
                        {renderSortIcon(monthlySort.key === 'marginPercent', monthlySort.dir)}
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">النمو الشهري</th>
                    <th className="py-2.5 px-3 font-bold whitespace-nowrap">مساهمة الفترة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredSortedMonthly.map((row) => (
                    <tr key={row.month} className="even:bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                      <td className="py-2 px-3 font-bold text-white whitespace-nowrap">
                        {row.month}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-sky-300 font-bold whitespace-nowrap">
                        {row.orders}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-white font-extrabold whitespace-nowrap">
                        {formatMoney(row.sales)}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {formatMoney(row.costs)}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-emerald-400 font-extrabold whitespace-nowrap">
                        {formatMoney(row.profit)}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-amber-300 font-bold whitespace-nowrap">
                        {row.marginPercent}%
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap" dir="ltr">
                        {row.growthPercent === null ? (
                          <span className="text-slate-500">سنة الأساس</span>
                        ) : (
                          <span className={row.growthPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {row.growthPercent >= 0 ? '+' : ''}
                            {row.growthPercent}%
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {row.sharePercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-extrabold text-xs sticky bottom-0">
                  <tr>
                    <td className="py-2.5 px-3 text-brand-300">
                      الإجمالي ({filteredSortedMonthly.length} أشهر)
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-sky-300">
                      {monthlyTotals.ordersCount}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-white">
                      {formatMoney(monthlyTotals.sales)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                      {formatMoney(monthlyTotals.costs)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-400">
                      {formatMoney(monthlyTotals.profit)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-amber-300" colSpan={3}>
                      متوسط هامش الفترة: {monthlyTotals.margin}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* Table 3: Detailed Orders Ledger & Category Share */}
        {tableTab === 'orders' && (
          <div className="divide-y divide-slate-800">
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              {filteredSortedOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <p>لا توجد طلبات مطابقة لعبارة البحث.</p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      عرض جميع الطلبات
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-slate-900 text-slate-300 sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <button type="button" onClick={() => toggleOrdersSort('orderNumber')} className="hover:text-white">
                          رقم الطلب
                          {renderSortIcon(ordersSort.key === 'orderNumber', ordersSort.dir)}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <button type="button" onClick={() => toggleOrdersSort('date')} className="hover:text-white">
                          التاريخ
                          {renderSortIcon(ordersSort.key === 'date', ordersSort.dir)}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 font-bold whitespace-nowrap">العميل</th>
                      <th className="py-2.5 px-3 font-bold whitespace-nowrap">الدفع</th>
                      <th className="py-2.5 px-3 font-bold whitespace-nowrap">حالة الطلب</th>
                      <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <button type="button" onClick={() => toggleOrdersSort('subtotal')} className="hover:text-white">
                          الفرعي
                          {renderSortIcon(ordersSort.key === 'subtotal', ordersSort.dir)}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <button type="button" onClick={() => toggleOrdersSort('vat')} className="hover:text-white">
                          الضريبة VAT
                          {renderSortIcon(ordersSort.key === 'vat', ordersSort.dir)}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <button type="button" onClick={() => toggleOrdersSort('total')} className="hover:text-white">
                          الإجمالي
                          {renderSortIcon(ordersSort.key === 'total', ordersSort.dir)}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {filteredSortedOrders.map((ord) => {
                      const statusMeta = ORDER_STATUS_AR[ord.status] || {
                        label: ord.status,
                        cls: 'text-slate-300',
                      };
                      return (
                        <tr key={ord.id} className="even:bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                          <td className="py-2 px-3 font-mono tabular-nums text-brand-300 font-bold whitespace-nowrap">
                            {ord.orderNumber}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                            {ord.date}
                          </td>
                          <td className="py-2 px-3 text-slate-200 font-bold whitespace-nowrap">
                            {ord.customer.fullName}
                          </td>
                          <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                            {PAYMENT_METHOD_AR[ord.paymentMethod] || ord.paymentMethod}{' '}
                            <span className="text-slate-500">·</span>{' '}
                            <span className={ord.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}>
                              {ord.paymentStatus === 'paid' ? 'مدفوع' : ord.paymentStatus === 'pending' ? 'معلق' : 'فشل'}
                            </span>
                          </td>
                          <td className={`py-2 px-3 font-bold whitespace-nowrap ${statusMeta.cls}`}>
                            {statusMeta.label}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                            {formatMoney(ord.subtotal)}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                            {formatMoney(ord.vat)}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-white font-extrabold whitespace-nowrap">
                            {formatMoney(ord.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-900 border-t-2 border-slate-700 font-extrabold text-xs sticky bottom-0">
                    <tr>
                      <td className="py-2.5 px-3 text-brand-300" colSpan={5}>
                        الطلبات النشطة ({ordersTotals.activeCount}) · مستبعد ملغي ({ordersTotals.cancelledCount})
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                        {formatMoney(ordersTotals.subtotal)}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-amber-300">
                        {formatMoney(ordersTotals.vat)}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-400">
                        {formatMoney(ordersTotals.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Compact Category Breakdown Strip */}
            <div className="p-3.5 bg-slate-900/40 flex flex-wrap items-center gap-4 text-xs">
              <span className="font-bold text-slate-300">ملخص التصنيفات:</span>
              {categorySales.map((cat) => (
                <div key={cat.category} className="flex items-center gap-1.5 text-slate-300">
                  <span>{cat.category}</span>
                  <span className="text-slate-600">·</span>
                  <strong className="font-mono tabular-nums text-brand-300">{cat.percentage}%</strong>
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">({cat.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
