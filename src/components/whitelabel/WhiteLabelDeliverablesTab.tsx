import React, { useEffect, useState } from 'react';
import {
  FileCode2,
  GitBranch,
  BookOpen,
  CheckSquare,
  CalendarClock,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { WhiteLabelTenant } from '../../types';
import {
  ACCEPTANCE_CRITERIA_LIST,
  EXECUTION_TIMELINE_PHASES,
  MULTI_DPI_SPECS,
  buildCICDYaml,
  buildClientConfigExport
} from '../../utils/whiteLabel';

interface WhiteLabelDeliverablesTabProps {
  tenant: WhiteLabelTenant;
}

export const WhiteLabelDeliverablesTab: React.FC<WhiteLabelDeliverablesTabProps> = ({ tenant }) => {
  const [subTab, setSubTab] = useState<'api' | 'cicd' | 'guide' | 'acceptance' | 'timeline'>('api');
  const [openApiJson, setOpenApiJson] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ACCEPTANCE_CRITERIA_LIST.map((item) => [item.id, true]))
  );

  useEffect(() => {
    fetch('/api/whitelabel/docs')
      .then((r) => r.json())
      .then((data) => setOpenApiJson(JSON.stringify(data, null, 2)))
      .catch(() => {
        setOpenApiJson('{\n  "openapi": "3.1.0",\n  "info": { "title": "Rawaj White-Label API" }\n}');
      });
  }, []);

  const cicdYaml = buildCICDYaml(tenant);
  const clientConfigJson = buildClientConfigExport(tenant);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const totalHours = EXECUTION_TIMELINE_PHASES.reduce((sum, p) => sum + p.hours, 0);

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs">
        {[
          { id: 'api', label: 'وثائق API (OpenAPI)', icon: <FileCode2 className="w-3.5 h-3.5" /> },
          { id: 'cicd', label: 'سير عمل CI/CD', icon: <GitBranch className="w-3.5 h-3.5" /> },
          { id: 'guide', label: 'دليل تكوين العميل', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: 'acceptance', label: 'معايير القبول', icon: <CheckSquare className="w-3.5 h-3.5" /> },
          { id: 'timeline', label: 'الجدول الزمني والتقدير', icon: <CalendarClock className="w-3.5 h-3.5" /> },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubTab(item.id as typeof subTab)}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
              subTab === item.id
                ? 'bg-[#551465] text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 1. API Docs */}
      {subTab === 'api' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">وثائق واجهات البرمجة الخلفية (REST API · OpenAPI 3.1)</h3>
              <p className="text-xs text-slate-400">
                جميع المسارات تعمل فعلياً على الخادم مع عزل المستأجرين، فحص التباين، وتشفير AES-256-GCM
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy('api', openApiJson)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
              >
                {copiedKey === 'api' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'api' ? 'تم النسخ' : 'نسخ المواصفة'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('whitelabel-openapi.json', openApiJson, 'application/json')}
                className="px-3 py-1.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل JSON</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">الطريقة</th>
                  <th className="p-3">المسار (Endpoint)</th>
                  <th className="p-3">الوظيفة والأمن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900">
                {[
                  ['GET / POST', '/api/whitelabel/tenants', 'جلب قائمة المستأجرين أو إنشاء مساحة مستأجر معزولة بحصة تخزين محددة'],
                  ['PUT', '/api/whitelabel/tenants/:tenantId', 'تحديث الهوية والألوان مع فرض تباين WCAG AA >= 4.5:1 ومنع تعديل العناصر المقفلة'],
                  ['POST', '/api/whitelabel/tenants/:tenantId/assets', 'رفع الشعار مع فحص Magic Bytes وتعقيم SVG وتشفيره بـ AES-256-GCM'],
                  ['GET', '/api/whitelabel/cdn/:tenantId/:assetId', 'توزيع الأصول المفكوكة تشفيرها مع Cache-Control immutable و ETag 304'],
                  ['POST', '/api/whitelabel/tenants/:tenantId/builds', 'توليد حزمة Android AAB / iOS IPA / PWA وتوقيعها رقمياً ببصمة SHA-256'],
                  ['POST', '/api/whitelabel/tenants/:tenantId/backup', 'إنشاء لقطة نسخ احتياطي كاملة والتحقق منها ببصمة SHA-256'],
                  ['POST', '/api/whitelabel/tenants/:tenantId/restore/:backupId', 'استرجاع فوري لإعدادات المستأجر من النسخة الاحتياطية المحددة'],
                  ['GET', '/api/whitelabel/ops', 'قراءة مؤشرات التشغيل، نسبة إصابة كاش CDN، الحصص، وسجلات الأخطاء والتدقيق'],
                ].map(([method, path, desc]) => (
                  <tr key={path} className="hover:bg-slate-950/60">
                    <td className="p-3 font-mono font-bold text-brand-300 whitespace-nowrap" dir="ltr">{method}</td>
                    <td className="p-3 font-mono text-slate-200 whitespace-nowrap" dir="ltr">{path}</td>
                    <td className="p-3 text-slate-300">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <pre dir="ltr" className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64">
            {openApiJson}
          </pre>
        </div>
      )}

      {/* 2. CI/CD Workflow */}
      {subTab === 'cicd' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">خط أنابيب البناء والتوقيع الآلي (GitHub Actions + Fastlane)</h3>
              <p className="text-xs text-slate-400">
                مُخصص للمستأجر الحالي ({tenant.appName}) لتوليد أيقونات Multi-DPI وتوقيع حزم Android AAB و iOS IPA
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy('cicd', cicdYaml)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
              >
                {copiedKey === 'cicd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'cicd' ? 'تم النسخ' : 'نسخ YAML'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(`whitelabel-${tenant.slug}.yml`, cicdYaml)}
                className="px-3 py-1.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل Workflow</span>
              </button>
            </div>
          </div>

          <pre dir="ltr" className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[420px]">
            {cicdYaml}
          </pre>
        </div>
      )}

      {/* 3. Client Guide & Config */}
      {subTab === 'guide' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">دليل تكوين العميل وملف الإعداد المصدّر</h3>
              <p className="text-xs text-slate-400">
                خطوات تجهيز الأصول واختبارها قبل إصدار التطبيق في المتاجر
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload(`${tenant.slug}-config.json`, clientConfigJson, 'application/json')}
              className="px-3 py-1.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل ملف التكوين JSON</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white">1. متطلبات الأصول والصور</h4>
              <ul className="space-y-1.5 text-slate-300 pr-4 list-disc">
                <li>أيقونة التطبيق الرئيسية: <strong className="text-white">1024×1024 px</strong> بصيغة PNG أو SVG آمن (بدون شفافية لـ iOS).</li>
                <li>أيقونة Android التكيفية (Adaptive): العناصر الأساسية داخل المنطقة الآمنة الوسطى (<strong className="tabular-nums">66%</strong>).</li>
                <li>الحد الأقصى لحجم الملف الواحد: <strong className="tabular-nums">4 MB</strong> مع فحص Magic Bytes تلقائي.</li>
              </ul>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white">2. قيود الألوان والتباين والامتثال</h4>
              <ul className="space-y-1.5 text-slate-300 pr-4 list-disc">
                <li>نسبة التباين الدنيا للنصوص على الأزرار وشاشة البدء: <strong className="text-emerald-400 tabular-nums">4.5:1 (WCAG AA)</strong>.</li>
                <li>لا يمكن تعديل بوابات الدفع (مدى، فيزا، تمارا، تابي) أو الرقم الضريبي VAT أو السياسات القانونية.</li>
                <li>يتم توزيع الأصول المشفرة عبر CDN مع تخزين مؤقت دائم (Immutable ETag).</li>
              </ul>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">الكثافة (DPI)</th>
                  <th className="p-3">الأبعاد المطلوبة</th>
                  <th className="p-3">المنصة</th>
                  <th className="p-3">الاستخدام الفعلي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {MULTI_DPI_SPECS.map((row) => (
                  <tr key={row.density}>
                    <td className="p-3 font-mono font-bold text-white">{row.density}</td>
                    <td className="p-3 font-mono text-brand-300 tabular-nums">{row.px}×{row.px} px</td>
                    <td className="p-3 text-slate-300">{row.platform}</td>
                    <td className="p-3 text-slate-400">{row.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <pre dir="ltr" className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60">
            {clientConfigJson}
          </pre>
        </div>
      )}

      {/* 4. Acceptance Criteria */}
      {subTab === 'acceptance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">قائمة معايير القبول (Definition of Done)</h3>
              <p className="text-xs text-slate-400">
                تحقق تفاعلي من اكتمال المعايير الوظيفية والأمنية والتشغيلية للميزة
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-400 tabular-nums">
              {Object.values(checkedCriteria).filter(Boolean).length} / {ACCEPTANCE_CRITERIA_LIST.length} محقق
            </span>
          </div>

          <div className="space-y-2.5">
            {ACCEPTANCE_CRITERIA_LIST.map((item) => {
              const checked = Boolean(checkedCriteria[item.id]);
              return (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setCheckedCriteria((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                    }
                    className="mt-1 accent-[#551465] w-4 h-4 shrink-0"
                  />
                  <div className="space-y-0.5 text-xs">
                    <span className="text-[11px] text-brand-300 font-bold block">{item.category}</span>
                    <strong className="text-white block">{item.title}</strong>
                    <p className="text-slate-400 leading-relaxed">{item.detail}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Execution Timeline & Effort Estimation */}
      {subTab === 'timeline' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">الجدول الزمني وتقدير الساعات والموارد البشرية</h3>
              <p className="text-xs text-slate-400">
                خطة تنفيذ مرحلية مدتها 9 أسابيع بإجمالي {totalHours} ساعة عمل هندسية
              </p>
            </div>
            <span className="text-xs font-extrabold text-brand-300 tabular-nums">
              الإجمالي: {totalHours} ساعة · 9 أسابيع
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">المرحلة</th>
                  <th className="p-3">المدة</th>
                  <th className="p-3">الساعات المقدرة</th>
                  <th className="p-3">الموارد المطلوبة</th>
                  <th className="p-3">المخرجات الرئيسية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {EXECUTION_TIMELINE_PHASES.map((row) => (
                  <tr key={row.phase} className="hover:bg-slate-950/60">
                    <td className="p-3 font-bold text-white">{row.phase}</td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">{row.durationWeeks}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">{row.hours} ساعة</td>
                    <td className="p-3 text-slate-300">{row.resources}</td>
                    <td className="p-3 text-slate-400 leading-relaxed">{row.deliverables}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
