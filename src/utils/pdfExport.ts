import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  FinancialAuditReportData,
  formatReportMoney,
} from './financialAnalytics';

export interface ChartSnapshotSvgs {
  dailySalesSvg?: string;
  ordersVolumeSvg?: string;
  monthlyProfitSvg?: string;
}

function escapeHtml(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function extractPaperReadyChartSvg(container: HTMLElement | null): string | undefined {
  if (!container) return undefined;
  const svg = container.querySelector('svg.recharts-surface');
  if (!svg) return undefined;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const w = Math.max(320, Math.round(rect.width || Number(svg.getAttribute('width')) || 520));
  const h = Math.max(160, Math.round(rect.height || Number(svg.getAttribute('height')) || 220));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  clone.setAttribute('width', '100%');
  clone.setAttribute('height', '175');
  clone.style.display = 'block';
  clone.style.maxWidth = '100%';
  clone.style.background = '#ffffff';

  // Convert dark-theme axis/grid colors to crisp print ink
  clone.querySelectorAll('[stroke="#1e293b"]').forEach((el) => {
    el.setAttribute('stroke', '#e2e8f0');
  });
  clone.querySelectorAll('[fill="#94a3b8"], [stroke="#94a3b8"]').forEach((el) => {
    if (el.getAttribute('fill') === '#94a3b8') el.setAttribute('fill', '#334155');
    if (el.getAttribute('stroke') === '#94a3b8') el.setAttribute('stroke', '#334155');
  });
  clone.querySelectorAll('[fill="#fbbf24"]').forEach((el) => {
    if (el.tagName.toLowerCase() === 'text' || el.closest('.recharts-yAxis')) {
      el.setAttribute('fill', '#b45309');
    }
  });

  const serialized = new XMLSerializer().serializeToString(clone);
  return serialized;
}

function buildPageHeaderHtml(report: FinancialAuditReportData, pageLabel: string): string {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #551465;padding-bottom:12px;margin-bottom:14px;">
      <div>
        <div style="font-size:18px;font-weight:800;color:#461253;margin-bottom:3px;">
          ${escapeHtml(report.settings.storeName)} — التقرير المالي والتدقيقي المعتمد
        </div>
        <div style="font-size:11px;color:#475569;">
          السجل التجاري: <strong>${escapeHtml(report.settings.commercialRegistration || 'غير محدد')}</strong>
          &nbsp;·&nbsp;
          الرقم الضريبي (VAT): <strong>${escapeHtml(report.settings.vatNumber || 'غير محدد')}</strong>
          &nbsp;·&nbsp;
          العملة: <strong>${escapeHtml(report.currencyLabel)}</strong>
        </div>
      </div>
      <div style="text-align:left;font-size:10px;color:#334155;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;">
        <div><strong>مرجع التدقيق:</strong> <span style="font-family:monospace;">${escapeHtml(report.reportRefId)}</span></div>
        <div><strong>تاريخ الإصدار:</strong> ${escapeHtml(report.generatedAtAr)}</div>
        <div><strong>المُصدر:</strong> ${escapeHtml(report.exportedBy)} (${escapeHtml(report.exporterRole)})</div>
        <div style="color:#551465;font-weight:700;margin-top:2px;">${escapeHtml(pageLabel)}</div>
      </div>
    </div>
  `;
}

function buildPageFooterHtml(report: FinancialAuditReportData, pageNum: number, totalPages: number): string {
  return `
    <div style="margin-top:auto;padding-top:10px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#475569;">
      <div>
        وثيقة مراجعة مالية رسمية صادرة عن لوحة إدارة ${escapeHtml(report.settings.storeName)}
        &nbsp;·&nbsp;
        بصمة التحقق: <span style="font-family:monospace;color:#0f172a;">${escapeHtml(report.integrityDigest.slice(0, 24))}</span>
      </div>
      <div style="font-weight:700;color:#461253;">صفحة ${pageNum} من ${totalPages}</div>
    </div>
  `;
}

function buildInlineMonthlyFallbackSvg(report: FinancialAuditReportData): string {
  const rows = report.monthlyRows;
  if (rows.length === 0) return '';
  const maxSales = Math.max(1, ...rows.map((r) => r.sales));
  const width = 680;
  const height = 165;
  const barGroupWidth = Math.floor((width - 40) / rows.length);

  const bars = rows
    .map((r, i) => {
      const x = 20 + i * barGroupWidth;
      const salesH = Math.max(6, Math.round((r.sales / maxSales) * 110));
      const profitH = Math.max(4, Math.round((r.profit / maxSales) * 110));
      const bw = Math.max(8, Math.min(18, Math.floor(barGroupWidth / 3)));
      return `
        <rect x="${x + 4}" y="${130 - salesH}" width="${bw}" height="${salesH}" rx="3" fill="#9127b3" />
        <rect x="${x + bw + 7}" y="${130 - profitH}" width="${bw}" height="${profitH}" rx="3" fill="#059669" />
        <text x="${x + bw + 5}" y="148" text-anchor="middle" font-size="9" fill="#334155">${escapeHtml(r.month)}</text>
      `;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="165" style="background:#ffffff;">${bars}</svg>`;
}

export function buildFinancialAuditHtmlPages(
  report: FinancialAuditReportData,
  charts: ChartSnapshotSvgs = {}
): string[] {
  const m = (sar: number) => escapeHtml(formatReportMoney(sar, report.settings));
  const orderChunks: FinancialAuditReportData['orderRows'][] = [];
  const CHUNK_SIZE = 18;
  for (let i = 0; i < report.orderRows.length; i += CHUNK_SIZE) {
    orderChunks.push(report.orderRows.slice(i, i + CHUNK_SIZE));
  }

  const totalPages = 2 + orderChunks.length;
  const pages: string[] = [];

  // PAGE 1: Executive KPIs + Financial Charts + Category Share
  const page1Html = `
    <div style="width:794px;height:1122px;box-sizing:border-box;padding:28px 32px;background:#ffffff;color:#0f172a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;display:flex;flex-direction:column;">
      ${buildPageHeaderHtml(report, `النطاق: يومي (${report.dailyRange} يوم) · شهري (${report.monthlyRange} شهر)`)}

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
        <div style="border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#faf5ff;">
          <div style="font-size:10.5px;color:#461253;font-weight:700;">إجمالي مبيعات المتجر التراكمية</div>
          <div style="font-size:17px;font-weight:800;color:#0f172a;margin:3px 0;font-variant-numeric:tabular-nums;">${m(report.storeTotalSales)}</div>
          <div style="font-size:10px;color:#475569;">إجمالي الطلبات: ${report.storeTotalOrdersCount} · العملاء: ${report.customersCount}</div>
        </div>
        <div style="border:1px solid #a7f3d0;border-radius:10px;padding:10px 12px;background:#ecfdf5;">
          <div style="font-size:10.5px;color:#065f46;font-weight:700;">صافي الأرباح (${report.monthlyRange} أشهر)</div>
          <div style="font-size:17px;font-weight:800;color:#065f46;margin:3px 0;font-variant-numeric:tabular-nums;">${m(report.kpis.totalMonthlyProfit)}</div>
          <div style="font-size:10px;color:#047857;">متوسط الهامش: ${report.kpis.avgProfitMargin}% · النمو: ${report.kpis.monthGrowthPercent >= 0 ? '+' : ''}${report.kpis.monthGrowthPercent}%</div>
        </div>
        <div style="border:1px solid #bae6fd;border-radius:10px;padding:10px 12px;background:#f0f9ff;">
          <div style="font-size:10.5px;color:#0369a1;font-weight:700;">مبيعات وطلبات الفترة (${report.dailyRange} يوم)</div>
          <div style="font-size:17px;font-weight:800;color:#0f172a;margin:3px 0;font-variant-numeric:tabular-nums;">${m(report.kpis.periodSalesTotal)}</div>
          <div style="font-size:10px;color:#0369a1;">${report.kpis.periodOrdersTotal} طلب · متوسط الطلب AOV: ${m(report.kpis.averageOrderValue)}</div>
        </div>
      </div>

      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;background:#f8fafc;margin-bottom:14px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:10.5px;">
        <div><span style="color:#475569;display:block;">الطلبات النشطة</span><strong>${report.liveOrdersSummary.activeCount} (ملغي: ${report.liveOrdersSummary.cancelledCount})</strong></div>
        <div><span style="color:#475569;display:block;">المبالغ المحصلة</span><strong style="color:#047857;">${m(report.liveOrdersSummary.paidTotal)}</strong></div>
        <div><span style="color:#475569;display:block;">قيد التحصيل</span><strong style="color:#b45309;">${m(report.liveOrdersSummary.pendingPaymentTotal)}</strong></div>
        <div><span style="color:#475569;display:block;">ضريبة VAT (${report.settings.vatPercentage}%)</span><strong>${m(report.liveOrdersSummary.vatTotal)}</strong></div>
        <div><span style="color:#475569;display:block;">الخصومات والشحن</span><strong>-${m(report.liveOrdersSummary.discountTotal)} / +${m(report.liveOrdersSummary.shippingTotal)}</strong></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div style="border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#ffffff;">
          <div style="font-size:11.5px;font-weight:800;color:#461253;margin-bottom:6px;">
            اتجاهات المبيعات والأرباح اليومية (${report.dailyRange} يوماً)
          </div>
          ${charts.dailySalesSvg || '<div style="font-size:11px;color:#64748b;padding:40px 0;text-align:center;">بيانات المبيعات اليومية مدرجة في الجدول التفصيلي بالصفحة التالية.</div>'}
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#ffffff;">
          <div style="font-size:11.5px;font-weight:800;color:#0369a1;margin-bottom:6px;">
            حجم الطلبات اليومية ومتوسط السلة (${report.dailyRange} يوماً)
          </div>
          ${charts.ordersVolumeSvg || '<div style="font-size:11px;color:#64748b;padding:40px 0;text-align:center;">بيانات حجم الطلبات مدرجة في الجدول التفصيلي بالصفحة التالية.</div>'}
        </div>
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#ffffff;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-size:11.5px;font-weight:800;color:#065f46;">
            الأرباح والإيرادات الشهرية (${report.monthlyRange} أشهر)
          </div>
          <div style="font-size:10px;color:#475569;">
            الإيرادات: <strong>${m(report.kpis.totalMonthlySales)}</strong> · التكاليف: <strong>${m(report.kpis.totalMonthlyCosts)}</strong> · صافي الربح: <strong style="color:#065f46;">${m(report.kpis.totalMonthlyProfit)}</strong>
          </div>
        </div>
        ${charts.monthlyProfitSvg || buildInlineMonthlyFallbackSvg(report)}
      </div>

      <div style="border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#ffffff;">
        <div style="font-size:11.5px;font-weight:800;color:#0f172a;margin-bottom:6px;">توزيع المبيعات حسب التصنيف</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:10.5px;">
          ${report.categoryRows
            .map(
              (c) => `
            <div style="display:flex;justify-content:space-between;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;">
              <span>${escapeHtml(c.category)}</span>
              <strong style="color:#551465;font-variant-numeric:tabular-nums;">${c.percentage}% (${c.count})</strong>
            </div>`
            )
            .join('')}
        </div>
      </div>

      ${buildPageFooterHtml(report, 1, totalPages)}
    </div>
  `;
  pages.push(page1Html);

  // PAGE 2: Monthly Financial Audit Table + Daily Breakdown Table + Sign-off
  const page2Html = `
    <div style="width:794px;height:1122px;box-sizing:border-box;padding:28px 32px;background:#ffffff;color:#0f172a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;display:flex;flex-direction:column;">
      ${buildPageHeaderHtml(report, 'جداول التدقيق المالي الشهرية واليومية')}

      <div style="margin-bottom:14px;">
        <div style="font-size:12px;font-weight:800;color:#461253;margin-bottom:6px;">
          أولاً: بيان الإيرادات والتكاليف وصافي الأرباح الشهرية (${report.monthlyRange} أشهر)
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums;">
          <thead>
            <tr style="background:#551465;color:#ffffff;">
              <th style="padding:6px 8px;border:1px solid #551465;text-align:right;">الشهر</th>
              <th style="padding:6px 8px;border:1px solid #551465;text-align:center;">الطلبات</th>
              <th style="padding:6px 8px;border:1px solid #551465;text-align:right;">الإيرادات</th>
              <th style="padding:6px 8px;border:1px solid #551465;text-align:right;">التكاليف التشغيلية</th>
              <th style="padding:6px 8px;border:1px solid #551465;text-align:right;">صافي الربح</th>
              <th style="padding:6px 8px;border:1px solid #551465;text-align:center;">الهامش</th>
              <th style="padding:6px 8px;border:1px solid #551465;text-align:center;">النمو الشهري</th>
            </tr>
          </thead>
          <tbody>
            ${report.monthlyRows
              .map(
                (r, idx) => `
              <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding:4.5px 8px;border:1px solid #cbd5e1;font-weight:700;">${escapeHtml(r.month)}</td>
                <td style="padding:4.5px 8px;border:1px solid #cbd5e1;text-align:center;">${r.orders}</td>
                <td style="padding:4.5px 8px;border:1px solid #cbd5e1;">${m(r.sales)}</td>
                <td style="padding:4.5px 8px;border:1px solid #cbd5e1;color:#475569;">${m(r.costs)}</td>
                <td style="padding:4.5px 8px;border:1px solid #cbd5e1;color:#065f46;font-weight:700;">${m(r.profit)}</td>
                <td style="padding:4.5px 8px;border:1px solid #cbd5e1;text-align:center;">${r.marginPercent}%</td>
                <td style="padding:4.5px 8px;border:1px solid #cbd5e1;text-align:center;">${r.growthPercent === null ? 'الأساس' : `${r.growthPercent >= 0 ? '+' : ''}${r.growthPercent}%`}</td>
              </tr>`
              )
              .join('')}
            <tr style="background:#ecfdf5;font-weight:800;color:#065f46;">
              <td style="padding:5.5px 8px;border:1px solid #6ee7b7;">الإجمالي</td>
              <td style="padding:5.5px 8px;border:1px solid #6ee7b7;text-align:center;">${report.monthlyRows.reduce((s, r) => s + r.orders, 0)}</td>
              <td style="padding:5.5px 8px;border:1px solid #6ee7b7;">${m(report.kpis.totalMonthlySales)}</td>
              <td style="padding:5.5px 8px;border:1px solid #6ee7b7;">${m(report.kpis.totalMonthlyCosts)}</td>
              <td style="padding:5.5px 8px;border:1px solid #6ee7b7;">${m(report.kpis.totalMonthlyProfit)}</td>
              <td style="padding:5.5px 8px;border:1px solid #6ee7b7;text-align:center;">${report.kpis.avgProfitMargin}%</td>
              <td style="padding:5.5px 8px;border:1px solid #6ee7b7;text-align:center;">${report.kpis.monthGrowthPercent >= 0 ? '+' : ''}${report.kpis.monthGrowthPercent}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-size:12px;font-weight:800;color:#0369a1;margin-bottom:6px;">
          ثانياً: سجل المبيعات اليومية وحجم الطلبات (آخر ${Math.min(16, report.dailyRows.length)} يوم من أصل ${report.dailyRange} يوماً)
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;font-variant-numeric:tabular-nums;">
          <thead>
            <tr style="background:#0f172a;color:#ffffff;">
              <th style="padding:5px 7px;border:1px solid #0f172a;text-align:right;">التاريخ</th>
              <th style="padding:5px 7px;border:1px solid #0f172a;text-align:center;">اليوم</th>
              <th style="padding:5px 7px;border:1px solid #0f172a;text-align:center;">الطلبات</th>
              <th style="padding:5px 7px;border:1px solid #0f172a;text-align:right;">المبيعات</th>
              <th style="padding:5px 7px;border:1px solid #0f172a;text-align:right;">الربح التقديري</th>
              <th style="padding:5px 7px;border:1px solid #0f172a;text-align:right;">متوسط الطلب AOV</th>
            </tr>
          </thead>
          <tbody>
            ${report.dailyRows
              .slice(-16)
              .map(
                (d, idx) => `
              <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding:3.5px 7px;border:1px solid #cbd5e1;font-family:monospace;">${escapeHtml(d.dateKey)}</td>
                <td style="padding:3.5px 7px;border:1px solid #cbd5e1;text-align:center;">${escapeHtml(d.label)}</td>
                <td style="padding:3.5px 7px;border:1px solid #cbd5e1;text-align:center;">${d.orders}</td>
                <td style="padding:3.5px 7px;border:1px solid #cbd5e1;font-weight:700;">${m(d.sales)}</td>
                <td style="padding:3.5px 7px;border:1px solid #cbd5e1;color:#065f46;">${m(d.profit)}</td>
                <td style="padding:3.5px 7px;border:1px solid #cbd5e1;">${m(d.aov)}</td>
              </tr>`
              )
              .join('')}
            <tr style="background:#f0f9ff;font-weight:800;color:#0369a1;">
              <td style="padding:4.5px 7px;border:1px solid #7dd3fc;">إجمالي الفترة (${report.dailyRange} يوماً)</td>
              <td style="padding:4.5px 7px;border:1px solid #7dd3fc;text-align:center;">متوسط يومي: ${report.kpis.avgDailyOrders}</td>
              <td style="padding:4.5px 7px;border:1px solid #7dd3fc;text-align:center;">${report.kpis.periodOrdersTotal}</td>
              <td style="padding:4.5px 7px;border:1px solid #7dd3fc;">${m(report.kpis.periodSalesTotal)}</td>
              <td style="padding:4.5px 7px;border:1px solid #7dd3fc;">${m(report.kpis.periodProfitTotal)}</td>
              <td style="padding:4.5px 7px;border:1px solid #7dd3fc;">${m(report.kpis.averageOrderValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px;border:1px dashed #94a3b8;border-radius:8px;padding:10px 14px;background:#f8fafc;font-size:10px;">
        <div>
          <strong style="color:#461253;display:block;margin-bottom:4px;">اعتماد الإدارة المالية:</strong>
          <div>الاسم / التوقيع: ................................................</div>
        </div>
        <div>
          <strong style="color:#461253;display:block;margin-bottom:4px;">مراجعة المدقق الداخلي:</strong>
          <div>التاريخ / الختم: ................................................</div>
        </div>
      </div>

      ${buildPageFooterHtml(report, 2, totalPages)}
    </div>
  `;
  pages.push(page2Html);

  // PAGE 3+: Orders Financial Reconciliation Ledger
  orderChunks.forEach((chunk, chunkIdx) => {
    const pageNum = 3 + chunkIdx;
    const isLastChunk = chunkIdx === orderChunks.length - 1;
    const pageHtml = `
      <div style="width:794px;height:1122px;box-sizing:border-box;padding:28px 32px;background:#ffffff;color:#0f172a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;display:flex;flex-direction:column;">
        ${buildPageHeaderHtml(report, `ملحق دفتر الطلبات المالي (${chunkIdx + 1}/${orderChunks.length})`)}

        <div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:8px;">
          ثالثاً: دفتر الطلبات المفصّل للمطابقة الضريبية والمحاسبية
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;font-variant-numeric:tabular-nums;">
          <thead>
            <tr style="background:#551465;color:#ffffff;">
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">رقم الطلب</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">التاريخ</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">العميل</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">الدفع</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:center;">الحالة</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">الفرعي</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">الخصم</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">الضريبة</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">الشحن</th>
              <th style="padding:5px 6px;border:1px solid #551465;text-align:right;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${chunk
              .map(
                (o, idx) => `
              <tr style="background:${o.isCancelled ? '#fff1f2' : idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;font-family:monospace;font-weight:700;">${escapeHtml(o.orderNumber)}</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;">${escapeHtml(o.date)}</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;">${escapeHtml(o.customerName)}</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;">${escapeHtml(o.paymentMethodAr)} (${escapeHtml(o.paymentStatusAr)})</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;text-align:center;">${escapeHtml(o.orderStatusAr)}</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;">${m(o.subtotal)}</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;color:#be123c;">${m(o.discount)}</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;">${m(o.vat)}</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;">${m(o.shippingFee)}</td>
                <td style="padding:4.5px 6px;border:1px solid #cbd5e1;font-weight:800;">${m(o.total)}</td>
              </tr>`
              )
              .join('')}
            ${
              isLastChunk
                ? `
              <tr style="background:#ecfdf5;font-weight:800;color:#065f46;">
                <td colspan="5" style="padding:6px;border:1px solid #6ee7b7;">إجمالي الطلبات النشطة (${report.liveOrdersSummary.activeCount} طلب · مستبعد ملغي: ${report.liveOrdersSummary.cancelledCount})</td>
                <td style="padding:6px;border:1px solid #6ee7b7;">${m(report.liveOrdersSummary.subtotalTotal)}</td>
                <td style="padding:6px;border:1px solid #6ee7b7;">${m(report.liveOrdersSummary.discountTotal)}</td>
                <td style="padding:6px;border:1px solid #6ee7b7;">${m(report.liveOrdersSummary.vatTotal)}</td>
                <td style="padding:6px;border:1px solid #6ee7b7;">${m(report.liveOrdersSummary.shippingTotal)}</td>
                <td style="padding:6px;border:1px solid #6ee7b7;">${m(report.liveOrdersSummary.grossTotal)}</td>
              </tr>`
                : ''
            }
          </tbody>
        </table>

        ${buildPageFooterHtml(report, pageNum, totalPages)}
      </div>
    `;
    pages.push(pageHtml);
  });

  return pages;
}

export async function downloadFinancialPdfReport(
  report: FinancialAuditReportData,
  charts: ChartSnapshotSvgs = {}
): Promise<string> {
  const pagesHtml = buildFinancialAuditHtmlPages(report, charts);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pagesHtml.length; i += 1) {
      host.innerHTML = pagesHtml[i];
      const pageNode = host.firstElementChild as HTMLElement | null;
      if (!pageNode) continue;

      const pngDataUrl = await toPng(pageNode, {
        width: 794,
        height: 1122,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
      });

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const datePart = report.generatedAtIso.slice(0, 10);
    const fileName = `rawaj-financial-audit-${datePart}-${report.dailyRange}d-${report.monthlyRange}m.pdf`;
    pdf.save(fileName);
    return fileName;
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

export function printFinancialAuditReport(
  report: FinancialAuditReportData,
  charts: ChartSnapshotSvgs = {}
): void {
  const pagesHtml = buildFinancialAuditHtmlPages(report, charts);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`<!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>التقرير المالي - ${escapeHtml(report.reportRefId)}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; background: #ffffff; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        </style>
      </head>
      <body>
        ${pagesHtml.map((p) => `<div class="print-page">${p}</div>`).join('')}
      </body>
    </html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  }, 200);
}
