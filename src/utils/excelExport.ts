import { zipSync, strToU8 } from 'fflate';
import {
  FinancialAuditReportData,
  convertSarAmount,
} from './financialAnalytics';

type CellValue = string | number | null | undefined;
type CellStyle = 'normal' | 'header' | 'number' | 'percent' | 'section' | 'total' | 'totalNumber';

interface SheetCell {
  value: CellValue;
  style?: CellStyle;
}

interface SheetDefinition {
  name: string;
  colWidths: number[];
  rows: SheetCell[][];
}

const STYLE_INDEX: Record<CellStyle, number> = {
  normal: 0,
  header: 1,
  number: 2,
  percent: 3,
  section: 4,
  total: 5,
  totalNumber: 6,
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeSpreadsheetString(text: string): string {
  // Strip illegal XML 1.0 control characters while preserving tabs/newlines
  const cleaned = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
  // Guard against CSV/Excel formula injection even inside inlineStr
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    return `'${cleaned}`;
  }
  return cleaned;
}

function colNumberToLetters(colOneBased: number): string {
  let n = colOneBased;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function buildWorksheetXml(sheet: SheetDefinition): string {
  const colsXml = sheet.colWidths
    .map(
      (width, idx) =>
        `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`
    )
    .join('');

  const rowsXml = sheet.rows
    .map((row, rowIdx) => {
      const rNum = rowIdx + 1;
      const cellsXml = row
        .map((cell, colIdx) => {
          const ref = `${colNumberToLetters(colIdx + 1)}${rNum}`;
          const styleId = STYLE_INDEX[cell.style || 'normal'];
          if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
            const numericStyle =
              cell.style === 'total'
                ? STYLE_INDEX.totalNumber
                : cell.style === 'percent'
                ? STYLE_INDEX.percent
                : cell.style
                ? styleId
                : STYLE_INDEX.number;
            return `<c r="${ref}" s="${numericStyle}"><v>${cell.value}</v></c>`;
          }
          const strVal = sanitizeSpreadsheetString(
            cell.value === null || cell.value === undefined ? '' : String(cell.value)
          );
          return `<c r="${ref}" t="inlineStr" s="${styleId}"><is><t xml:space="preserve">${escapeXml(strVal)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rNum}">${cellsXml}</row>`;
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="20"/>` +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`
  );
}

function buildStylesXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="2">` +
    `<numFmt numFmtId="164" formatCode="#,##0.##"/>` +
    `<numFmt numFmtId="165" formatCode="0.0&quot;%&quot;"/>` +
    `</numFmts>` +
    `<fonts count="4">` +
    `<font><sz val="11"/><color rgb="FF0F172A"/><name val="Arial"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FF461253"/><name val="Arial"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FF065F46"/><name val="Arial"/></font>` +
    `</fonts>` +
    `<fills count="5">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FF551465"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF3E8FF"/></patternFill></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="2">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border>` +
    `<left style="thin"><color rgb="FFCBD5E1"/></left>` +
    `<right style="thin"><color rgb="FFCBD5E1"/></right>` +
    `<top style="thin"><color rgb="FFCBD5E1"/></top>` +
    `<bottom style="thin"><color rgb="FFCBD5E1"/></bottom>` +
    `<diagonal/>` +
    `</border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="7">` +
    // 0: normal
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="center" readingOrder="2" wrapText="1"/></xf>` +
    // 1: header
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="center" vertical="center" readingOrder="2" wrapText="1"/></xf>` +
    // 2: number
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>` +
    // 3: percent
    `<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>` +
    // 4: section subheader
    `<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>` +
    // 5: total text
    `<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf>` +
    // 6: total number
    `<xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1" applyBorder="1"><alignment horizontal="right" vertical="center"/></xf>` +
    `</cellXfs>` +
    `</styleSheet>`
  );
}

function buildWorkbookSheets(report: FinancialAuditReportData): SheetDefinition[] {
  const conv = (sar: number) => convertSarAmount(sar, report.settings);
  const curr = report.currencyCode;

  // Sheet 1: Executive Summary & Audit Metadata
  const summarySheet: SheetDefinition = {
    name: 'الملخص التنفيذي',
    colWidths: [34, 28, 34],
    rows: [
      [
        { value: `التقرير المالي والتدقيقي — ${report.settings.storeName}`, style: 'header' },
        { value: `مرجع التقرير: ${report.reportRefId}`, style: 'header' },
        { value: `العملة: ${curr}`, style: 'header' },
      ],
      [
        { value: 'بيانات التوثيق والاعتماد الإداري', style: 'section' },
        { value: 'القيمة', style: 'section' },
        { value: 'ملاحظات التدقيق', style: 'section' },
      ],
      [{ value: 'اسم المنشأة / المتجر' }, { value: report.settings.storeName }, { value: 'الهوية التجارية المعتمدة' }],
      [{ value: 'السجل التجاري (CR)' }, { value: report.settings.commercialRegistration || 'غير محدد' }, { value: 'مرجع السجل الرسمي' }],
      [{ value: 'الرقم الضريبي (VAT)' }, { value: report.settings.vatNumber || 'غير محدد' }, { value: `نسبة الضريبة: ${report.settings.vatPercentage}%` }],
      [{ value: 'تاريخ ووقت الإصدار (ISO)' }, { value: report.generatedAtIso }, { value: report.generatedAtAr }],
      [{ value: 'المصدر بواسطة (المسؤول)' }, { value: report.exportedBy }, { value: `الصلاحية: ${report.exporterRole}` }],
      [{ value: 'النطاق الزمني المحدد' }, { value: `يومي: ${report.dailyRange} يوماً / شهري: ${report.monthlyRange} أشهر` }, { value: report.currencyLabel }],
      [{ value: 'بصمة التحقق الرقمية (SHA-256)' }, { value: report.integrityDigest }, { value: 'لضمان عدم تعديل الأرقام الإجمالية' }],
      [
        { value: 'ملخص مؤشرات الأداء المالية', style: 'section' },
        { value: `القيمة (${curr})`, style: 'section' },
        { value: 'التفصيل المرجعي', style: 'section' },
      ],
      [
        { value: 'إجمالي مبيعات المتجر التراكمية' },
        { value: conv(report.storeTotalSales), style: 'number' },
        { value: `إجمالي الطلبات: ${report.storeTotalOrdersCount} طلب` },
      ],
      [
        { value: `مبيعات الفترة اليومية (${report.dailyRange} يوماً)` },
        { value: conv(report.kpis.periodSalesTotal), style: 'number' },
        { value: `أعلى يوم: ${report.kpis.bestDayLabel} (${conv(report.kpis.bestDaySales).toLocaleString()} ${curr})` },
      ],
      [
        { value: `صافي أرباح الفترة اليومية التقديرية (${report.dailyRange} يوماً)` },
        { value: conv(report.kpis.periodProfitTotal), style: 'number' },
        { value: `متوسط المبيعات اليومي: ${conv(report.kpis.avgDailySales).toLocaleString()} ${curr}` },
      ],
      [
        { value: `حجم الطلبات في الفترة (${report.dailyRange} يوماً)` },
        { value: report.kpis.periodOrdersTotal, style: 'number' },
        { value: `متوسط قيمة الطلب (AOV): ${conv(report.kpis.averageOrderValue).toLocaleString()} ${curr}` },
      ],
      [
        { value: `إجمالي الإيرادات الشهرية (${report.monthlyRange} أشهر)` },
        { value: conv(report.kpis.totalMonthlySales), style: 'number' },
        { value: `التكاليف التشغيلية: ${conv(report.kpis.totalMonthlyCosts).toLocaleString()} ${curr}` },
      ],
      [
        { value: `صافي الأرباح الشهرية (${report.monthlyRange} أشهر)` },
        { value: conv(report.kpis.totalMonthlyProfit), style: 'totalNumber' },
        { value: `متوسط الهامش: ${report.kpis.avgProfitMargin}% | النمو الشهري: ${report.kpis.monthGrowthPercent}%` },
      ],
      [
        { value: 'مطابقة تحصيل الطلبات المباشرة (دفتر الأستاذ)', style: 'section' },
        { value: `القيمة (${curr})`, style: 'section' },
        { value: 'حالة المطابقة', style: 'section' },
      ],
      [
        { value: 'عدد الطلبات النشطة / الملغاة' },
        { value: report.liveOrdersSummary.activeCount, style: 'number' },
        { value: `ملغاة مستبعدة: ${report.liveOrdersSummary.cancelledCount}` },
      ],
      [
        { value: 'إجمالي المبالغ المحصلة (مدفوعة)' },
        { value: conv(report.liveOrdersSummary.paidTotal), style: 'number' },
        { value: 'تم تأكيد التحصيل' },
      ],
      [
        { value: 'مبالغ قيد التحصيل / عند الاستلام' },
        { value: conv(report.liveOrdersSummary.pendingPaymentTotal), style: 'number' },
        { value: 'بانتظار التسوية' },
      ],
      [
        { value: 'إجمالي ضريبة القيمة المضافة المحصلة (VAT)' },
        { value: conv(report.liveOrdersSummary.vatTotal), style: 'number' },
        { value: `معدل الضريبة المطبق: ${report.settings.vatPercentage}%` },
      ],
      [
        { value: 'إجمالي الخصومات وقسائم الولاء الممنوحة' },
        { value: conv(report.liveOrdersSummary.discountTotal), style: 'number' },
        { value: 'خصومات ترويجية وولاء وهدايا' },
      ],
      [
        { value: 'إجمالي رسوم الشحن المحصلة' },
        { value: conv(report.liveOrdersSummary.shippingTotal), style: 'number' },
        { value: 'شحن وتوصيل الطلبات النشطة' },
      ],
      [
        { value: 'صافي إجمالي الطلبات المباشرة' },
        { value: conv(report.liveOrdersSummary.grossTotal), style: 'totalNumber' },
        { value: 'مطابق لإجمالي دفتر الطلبات' },
      ],
    ],
  };

  // Sheet 2: Daily Sales & Orders
  const dailySheet: SheetDefinition = {
    name: 'المبيعات اليومية',
    colWidths: [16, 16, 14, 20, 20, 18, 14],
    rows: [
      [
        { value: 'التاريخ (ISO)', style: 'header' },
        { value: 'اليوم', style: 'header' },
        { value: 'عدد الطلبات', style: 'header' },
        { value: `المبيعات اليومية (${curr})`, style: 'header' },
        { value: `صافي الربح التقديري (${curr})`, style: 'header' },
        { value: `متوسط الطلب AOV (${curr})`, style: 'header' },
        { value: 'هامش الربح (%)', style: 'header' },
      ],
      ...report.dailyRows.map((row) => [
        { value: row.dateKey },
        { value: row.label },
        { value: row.orders, style: 'number' as const },
        { value: conv(row.sales), style: 'number' as const },
        { value: conv(row.profit), style: 'number' as const },
        { value: conv(row.aov), style: 'number' as const },
        { value: row.marginPercent, style: 'percent' as const },
      ]),
      [
        { value: `الإجمالي (${report.dailyRows.length} يوماً)`, style: 'total' },
        { value: 'المتوسط / المجموع', style: 'total' },
        { value: report.kpis.periodOrdersTotal, style: 'totalNumber' },
        { value: conv(report.kpis.periodSalesTotal), style: 'totalNumber' },
        { value: conv(report.kpis.periodProfitTotal), style: 'totalNumber' },
        { value: conv(report.kpis.averageOrderValue), style: 'totalNumber' },
        {
          value:
            report.kpis.periodSalesTotal > 0
              ? Math.round((report.kpis.periodProfitTotal / report.kpis.periodSalesTotal) * 100)
              : 0,
          style: 'totalNumber',
        },
      ],
    ],
  };

  // Sheet 3: Monthly Revenue & Net Profits
  const monthlySheet: SheetDefinition = {
    name: 'الأرباح الشهرية',
    colWidths: [18, 14, 22, 22, 22, 16, 16],
    rows: [
      [
        { value: 'الشهر', style: 'header' },
        { value: 'عدد الطلبات', style: 'header' },
        { value: `إجمالي الإيرادات (${curr})`, style: 'header' },
        { value: `التكاليف التشغيلية (${curr})`, style: 'header' },
        { value: `صافي الأرباح (${curr})`, style: 'header' },
        { value: 'هامش الربح (%)', style: 'header' },
        { value: 'نمو الربح الشهري (%)', style: 'header' },
      ],
      ...report.monthlyRows.map((row) => [
        { value: row.month },
        { value: row.orders, style: 'number' as const },
        { value: conv(row.sales), style: 'number' as const },
        { value: conv(row.costs), style: 'number' as const },
        { value: conv(row.profit), style: 'number' as const },
        { value: row.marginPercent, style: 'percent' as const },
        {
          value: row.growthPercent === null ? 'سنة الأساس' : row.growthPercent,
          style: row.growthPercent === null ? ('normal' as const) : ('percent' as const),
        },
      ]),
      [
        { value: `الإجمالي (${report.monthlyRows.length} أشهر)`, style: 'total' },
        {
          value: report.monthlyRows.reduce((s, r) => s + r.orders, 0),
          style: 'totalNumber',
        },
        { value: conv(report.kpis.totalMonthlySales), style: 'totalNumber' },
        { value: conv(report.kpis.totalMonthlyCosts), style: 'totalNumber' },
        { value: conv(report.kpis.totalMonthlyProfit), style: 'totalNumber' },
        { value: report.kpis.avgProfitMargin, style: 'totalNumber' },
        { value: report.kpis.monthGrowthPercent, style: 'totalNumber' },
      ],
    ],
  };

  // Sheet 4: Category Breakdown
  const categorySheet: SheetDefinition = {
    name: 'توزيع التصنيفات',
    colWidths: [28, 18, 18],
    rows: [
      [
        { value: 'التصنيف', style: 'header' },
        { value: 'عدد العمليات', style: 'header' },
        { value: 'الحصة المئوية (%)', style: 'header' },
      ],
      ...report.categoryRows.map((c) => [
        { value: c.category },
        { value: c.count, style: 'number' as const },
        { value: c.percentage, style: 'percent' as const },
      ]),
      [
        { value: 'الإجمالي', style: 'total' },
        {
          value: report.categoryRows.reduce((s, c) => s + c.count, 0),
          style: 'totalNumber',
        },
        {
          value: report.categoryRows.reduce((s, c) => s + c.percentage, 0),
          style: 'totalNumber',
        },
      ],
    ],
  };

  // Sheet 5: Detailed Orders Financial Ledger
  const ordersSheet: SheetDefinition = {
    name: 'دفتر الطلبات المالي',
    colWidths: [18, 20, 22, 20, 14, 16, 16, 14, 14, 14, 18],
    rows: [
      [
        { value: 'رقم الطلب', style: 'header' },
        { value: 'التاريخ', style: 'header' },
        { value: 'العميل', style: 'header' },
        { value: 'وسيلة الدفع', style: 'header' },
        { value: 'حالة الدفع', style: 'header' },
        { value: 'حالة الطلب', style: 'header' },
        { value: `المجموع الفرعي (${curr})`, style: 'header' },
        { value: `الخصم (${curr})`, style: 'header' },
        { value: `الضريبة VAT (${curr})`, style: 'header' },
        { value: `الشحن (${curr})`, style: 'header' },
        { value: `الإجمالي (${curr})`, style: 'header' },
      ],
      ...report.orderRows.map((o) => [
        { value: o.orderNumber },
        { value: o.date },
        { value: o.customerName },
        { value: o.paymentMethodAr },
        { value: o.paymentStatusAr },
        { value: o.orderStatusAr },
        { value: conv(o.subtotal), style: 'number' as const },
        { value: conv(o.discount), style: 'number' as const },
        { value: conv(o.vat), style: 'number' as const },
        { value: conv(o.shippingFee), style: 'number' as const },
        { value: conv(o.total), style: 'number' as const },
      ]),
      [
        { value: 'إجمالي الطلبات النشطة', style: 'total' },
        { value: `${report.liveOrdersSummary.activeCount} نشط`, style: 'total' },
        { value: `مستبعد ملغي: ${report.liveOrdersSummary.cancelledCount}`, style: 'total' },
        { value: '-', style: 'total' },
        { value: '-', style: 'total' },
        { value: '-', style: 'total' },
        { value: conv(report.liveOrdersSummary.subtotalTotal), style: 'totalNumber' },
        { value: conv(report.liveOrdersSummary.discountTotal), style: 'totalNumber' },
        { value: conv(report.liveOrdersSummary.vatTotal), style: 'totalNumber' },
        { value: conv(report.liveOrdersSummary.shippingTotal), style: 'totalNumber' },
        { value: conv(report.liveOrdersSummary.grossTotal), style: 'totalNumber' },
      ],
    ],
  };

  return [summarySheet, dailySheet, monthlySheet, categorySheet, ordersSheet];
}

export function buildFinancialWorkbookBytes(report: FinancialAuditReportData): Uint8Array {
  const sheets = buildWorkbookSheets(report);

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    `</Types>`;

  const rootRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    sheets
      .map(
        (s, i) =>
          `<sheet name="${escapeXml(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
      )
      .join('') +
    `</sheets>` +
    `</workbook>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(rootRelsXml),
    'xl/workbook.xml': strToU8(workbookXml),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelsXml),
    'xl/styles.xml': strToU8(buildStylesXml()),
  };

  sheets.forEach((sheet, idx) => {
    files[`xl/worksheets/sheet${idx + 1}.xml`] = strToU8(buildWorksheetXml(sheet));
  });

  return zipSync(files, { level: 6 });
}

export function downloadFinancialExcelReport(report: FinancialAuditReportData): string {
  const bytes = buildFinancialWorkbookBytes(report);
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const datePart = report.generatedAtIso.slice(0, 10);
  const fileName = `rawaj-financial-audit-${datePart}-${report.dailyRange}d-${report.monthlyRange}m.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return fileName;
}
