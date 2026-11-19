import React, { useMemo, useState } from 'react';
import { Calculator, Calendar, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { StoreSettings } from '../types';
import { CurrencyCode, formatPrice } from '../utils/currency';

type InstallmentMonths = 3 | 6 | 12;

interface InstallmentCalculatorProps {
  totalPrice: number;
  settings?: StoreSettings;
}

interface InstallmentRow {
  index: number;
  title: string;
  dueLabel: string;
  amountFormatted: string;
  cumulativePercent: number;
  isFirst: boolean;
}

const DURATION_OPTIONS: { months: InstallmentMonths; label: string }[] = [
  { months: 3, label: '3 أشهر' },
  { months: 6, label: '6 أشهر' },
  { months: 12, label: '12 شهراً' },
];

function formatUnits(
  units: number,
  currency: CurrencyCode
): string {
  if (currency === 'YER') {
    return `${units.toLocaleString('ar-YE')} ر.ي`;
  }
  if (currency === 'USD') {
    const dollars = units / 100;
    return `$${dollars.toLocaleString('en-US', {
      minimumFractionDigits: units % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${units.toLocaleString('ar-SA')} ر.س`;
}

function getTotalUnits(
  totalPriceSar: number,
  currency: CurrencyCode,
  yerRate: number
): number {
  const safeTotal = Math.max(0, totalPriceSar);
  if (currency === 'YER') {
    return Math.round(safeTotal * (yerRate || 670));
  }
  if (currency === 'USD') {
    return Math.round(safeTotal * 0.2667 * 100);
  }
  return Math.round(safeTotal);
}

function buildInstallmentSchedule(
  totalPriceSar: number,
  months: InstallmentMonths,
  currency: CurrencyCode,
  yerRate: number
): {
  monthlyFormatted: string;
  totalFormatted: string;
  rows: InstallmentRow[];
} {
  const safeTotal = Math.max(0, totalPriceSar);
  const totalUnits = getTotalUnits(safeTotal, currency, yerRate);

  const baseUnits = Math.floor(totalUnits / months);
  const remainder = totalUnits % months;
  const now = new Date();
  const monthFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    month: 'long',
    year: 'numeric',
  });

  const rows: InstallmentRow[] = [];
  let accumulatedUnits = 0;

  for (let i = 0; i < months; i++) {
    const rowUnits = baseUnits + (i < remainder ? 1 : 0);
    accumulatedUnits += rowUnits;

    const dueDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const dueLabel =
      i === 0
        ? 'اليوم عند إتمام الطلب'
        : `${monthFormatter.format(dueDate)} (بعد ${i === 1 ? 'شهر' : i === 2 ? 'شهرين' : i <= 10 ? `${i} أشهر` : `${i} شهراً`})`;

    const cumulativePercent =
      totalUnits > 0 ? Math.min(100, Math.round((accumulatedUnits / totalUnits) * 100)) : Math.round(((i + 1) / months) * 100);

    rows.push({
      index: i + 1,
      title: i === 0 ? 'الدفعة الأولى' : `الدفعة ${i + 1}`,
      dueLabel,
      amountFormatted: formatUnits(rowUnits, currency),
      cumulativePercent,
      isFirst: i === 0,
    });
  }

  return {
    monthlyFormatted: formatUnits(baseUnits + (remainder > 0 ? 1 : 0), currency),
    totalFormatted: formatPrice(safeTotal, currency, yerRate),
    rows,
  };
}

export const InstallmentCalculator: React.FC<InstallmentCalculatorProps> = ({
  totalPrice,
  settings,
}) => {
  const [selectedMonths, setSelectedMonths] = useState<InstallmentMonths>(3);
  const [showAllRows, setShowAllRows] = useState(false);

  const currency: CurrencyCode = settings?.activeCurrency || 'SAR';
  const yerRate = settings?.yerExchangeRate || 670;

  const optionSummaries = useMemo(() => {
    const totalUnits = getTotalUnits(totalPrice, currency, yerRate);
    return DURATION_OPTIONS.map((opt) => {
      const baseUnits = Math.floor(totalUnits / opt.months);
      const remainder = totalUnits % opt.months;
      return {
        ...opt,
        monthlyFormatted: formatUnits(baseUnits + (remainder > 0 ? 1 : 0), currency),
      };
    });
  }, [totalPrice, currency, yerRate]);

  const schedule = useMemo(
    () => buildInstallmentSchedule(totalPrice, selectedMonths, currency, yerRate),
    [totalPrice, selectedMonths, currency, yerRate]
  );

  const visibleRows =
    selectedMonths > 6 && !showAllRows ? schedule.rows.slice(0, 4) : schedule.rows;
  const hiddenCount = schedule.rows.length - visibleRows.length;

  return (
    <section
      aria-label="حاسبة التقسيط"
      className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 space-y-3.5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-600/15 border border-brand-500/30 text-brand-300 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white leading-tight">
              حاسبة التقسيط الشهري
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              قسّم المبلغ على دفعات ميسرة · بدون فوائد (0%)
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-400 whitespace-nowrap shrink-0 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          بدون رسوم خفية
        </span>
      </div>

      {/* Duration selector (3, 6, 12 months) */}
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="اختر مدة التقسيط">
        {optionSummaries.map((option) => {
          const isSelected = selectedMonths === option.months;
          return (
            <button
              key={option.months}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                setSelectedMonths(option.months);
                if (option.months <= 6) setShowAllRows(false);
              }}
              className={`rounded-xl border px-3 py-2.5 text-center transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-brand-600/20 border-brand-500 text-white shadow-sm shadow-brand-600/15'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span className="block text-xs font-bold whitespace-nowrap">
                {option.label}
              </span>
              <span
                className={`block text-[11px] mt-1 tabular-nums truncate ${
                  isSelected ? 'text-brand-300 font-bold' : 'text-slate-400'
                }`}
              >
                {option.monthlyFormatted} / شهر
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-2 border-y border-slate-800 py-3">
        <div>
          <span className="text-[11px] text-slate-400 block">القسط الشهري</span>
          <span className="text-sm sm:text-base font-extrabold text-brand-300 tabular-nums mt-0.5 block">
            {schedule.monthlyFormatted}
          </span>
        </div>
        <div className="border-r border-slate-800 pr-2.5">
          <span className="text-[11px] text-slate-400 block">عدد الدفعات</span>
          <span className="text-sm sm:text-base font-bold text-white tabular-nums mt-0.5 block">
            {selectedMonths} دفعات
          </span>
        </div>
        <div className="border-r border-slate-800 pr-2.5">
          <span className="text-[11px] text-slate-400 block">الإجمالي الكلي</span>
          <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums mt-0.5 block">
            {schedule.totalFormatted}
          </span>
        </div>
      </div>

      {/* Illustrative Installment Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-300" />
            عرض توضيحي لجدول الأقساط
          </span>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {selectedMonths} أشهر · 0% فائدة
          </span>
        </div>

        <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/50 overflow-hidden">
          {visibleRows.map((row) => (
            <div
              key={row.index}
              className={`px-3 py-2.5 flex items-center justify-between gap-3 ${
                row.isFirst ? 'bg-brand-600/10' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-6 h-6 rounded-lg text-[11px] font-bold tabular-nums flex items-center justify-center shrink-0 ${
                    row.isFirst
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {row.index}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {row.title}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      ({row.cumulativePercent}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {row.dueLabel}
                  </p>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="text-xs sm:text-sm font-bold text-white tabular-nums block">
                  {row.amountFormatted}
                </span>
                <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full ${
                      row.isFirst ? 'bg-brand-500' : 'bg-emerald-500/80'
                    }`}
                    style={{ width: `${row.cumulativePercent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedMonths > 6 && (
          <button
            type="button"
            onClick={() => setShowAllRows((prev) => !prev)}
            className="w-full py-2 px-3 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 text-xs font-semibold text-brand-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {showAllRows ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                إظهار ملخص الأقساط
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                عرض جميع الأقساط ({hiddenCount} دفعات متبقية)
              </>
            )}
          </button>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          تتحدث قيمة الأقساط تلقائياً عند تغيير الكمية أو خيارات المنتج والتغليف.
        </p>
      </div>
    </section>
  );
};
