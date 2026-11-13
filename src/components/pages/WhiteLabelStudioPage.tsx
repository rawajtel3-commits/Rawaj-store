import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Palette,
  Upload,
  ShieldCheck,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Package,
  KeyRound,
  RotateCcw,
  Activity,
  Database,
  Play,
  Plus,
  Download,
  FileText,
  Layers,
  HardDrive,
  RefreshCw,
  Eye
} from 'lucide-react';
import {
  WhiteLabelBuildRecord,
  WhiteLabelOpsSummary,
  WhiteLabelPlanTier,
  WhiteLabelTenant,
  WhiteLabelUserRole
} from '../../types';
import {
  WHITE_LABEL_PLANS,
  autoFixContrastColor,
  formatBytes,
  getContrastRatio,
  getWCAGLevel,
  inspectImageFile
} from '../../utils/whiteLabel';
import { DevicePreviewSimulator, PreviewScreenMode } from '../whitelabel/DevicePreviewSimulator';
import { WhiteLabelDeliverablesTab } from '../whitelabel/WhiteLabelDeliverablesTab';

interface WhiteLabelStudioPageProps {
  onBackToHome: () => void;
  activeAppliedTenantId?: string | null;
  onApplyBrandingToStore: (tenant: WhiteLabelTenant) => void;
  onResetStoreBranding: () => void;
}

type StudioTab = 'studio' | 'builds' | 'qa-backup' | 'ops' | 'deliverables';

interface QACheckResult {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'fail';
  metric: string;
  detail: string;
}

export const WhiteLabelStudioPage: React.FC<WhiteLabelStudioPageProps> = ({
  onBackToHome,
  activeAppliedTenantId,
  onApplyBrandingToStore,
  onResetStoreBranding,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const [tenants, setTenants] = useState<WhiteLabelTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('tenant-rawaj');
  const [draftTenant, setDraftTenant] = useState<WhiteLabelTenant | null>(null);
  const [actorRole, setActorRole] = useState<WhiteLabelUserRole>('owner');
  const [previewMode, setPreviewMode] = useState<PreviewScreenMode>('storefront');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Local immediate image previews before/after upload
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | undefined>(undefined);
  const [splashPreviewUrl, setSplashPreviewUrl] = useState<string | undefined>(undefined);

  // New tenant form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantNameEn, setNewTenantNameEn] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState<WhiteLabelPlanTier>('growth');
  const [newTenantColor, setNewTenantColor] = useState('#0f766e');

  // Build generator state
  const [buildPlatform, setBuildPlatform] = useState<WhiteLabelBuildRecord['platform']>('android_aab');
  const [buildVersion, setBuildVersion] = useState('2.5.0');
  const [rolloutChannel, setRolloutChannel] = useState<WhiteLabelBuildRecord['rolloutChannel']>('production');
  const [rolloutPercent, setRolloutPercent] = useState(100);
  const [isBuilding, setIsBuilding] = useState(false);

  // Backup & QA state
  const [backupLabel, setBackupLabel] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [qaResults, setQaResults] = useState<QACheckResult[]>([]);
  const [isRunningQA, setIsRunningQA] = useState(false);

  // Ops & Logs
  const [opsSummary, setOpsSummary] = useState<WhiteLabelOpsSummary | null>(null);
  const [isLoadingOps, setIsLoadingOps] = useState(false);

  const notify = (type: 'success' | 'error' | 'warning', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  const fetchTenants = useCallback(async (preferredId?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/whitelabel/tenants');
      const data = await res.json();
      const list: WhiteLabelTenant[] = data.tenants || [];
      setTenants(list);
      const targetId = preferredId || selectedTenantId;
      const found = list.find((t) => t.id === targetId) || list[0] || null;
      if (found) {
        setSelectedTenantId(found.id);
        setDraftTenant(found);
        setIconPreviewUrl(undefined);
        setSplashPreviewUrl(undefined);
      }
    } catch {
      notify('error', 'تعذر الاتصال بخدمة تخصيص التطبيق الخلفية.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTenantId]);

  const fetchOps = useCallback(async () => {
    setIsLoadingOps(true);
    try {
      const res = await fetch('/api/whitelabel/ops');
      if (res.ok) {
        const data: WhiteLabelOpsSummary = await res.json();
        setOpsSummary(data);
      }
    } catch {
      // Ignore transient errors
    } finally {
      setIsLoadingOps(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
    fetchOps();
  }, [fetchTenants, fetchOps]);

  const handleSelectTenant = (id: string) => {
    setSelectedTenantId(id);
    const match = tenants.find((t) => t.id === id) || null;
    setDraftTenant(match);
    setIconPreviewUrl(undefined);
    setSplashPreviewUrl(undefined);
  };

  // Real-time WCAG Contrast calculations
  const primaryContrast = useMemo(() => {
    if (!draftTenant) return 7;
    return getContrastRatio(draftTenant.theme.textOnPrimary, draftTenant.theme.primary);
  }, [draftTenant]);

  const surfaceContrast = useMemo(() => {
    if (!draftTenant) return 15;
    return getContrastRatio(draftTenant.theme.textOnSurface, draftTenant.theme.surface);
  }, [draftTenant]);

  const splashContrast = useMemo(() => {
    if (!draftTenant) return 12;
    return getContrastRatio(draftTenant.splash.textColor, draftTenant.splash.backgroundColor);
  }, [draftTenant]);

  const handleAutoFixAllContrasts = () => {
    if (!draftTenant) return;
    setDraftTenant({
      ...draftTenant,
      theme: {
        ...draftTenant.theme,
        textOnPrimary: autoFixContrastColor(draftTenant.theme.textOnPrimary, draftTenant.theme.primary, 4.7),
        textOnSurface: autoFixContrastColor(draftTenant.theme.textOnSurface, draftTenant.theme.surface, 4.7),
      },
      splash: {
        ...draftTenant.splash,
        textColor: autoFixContrastColor(draftTenant.splash.textColor, draftTenant.splash.backgroundColor, 4.7),
      },
    });
    notify('success', 'تم ضبط ألوان النصوص تلقائياً لتحقيق معيار التباين WCAG AA (>= 4.5:1).');
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) {
      notify('error', 'الرجاء إدخال اسم التطبيق الجديد.');
      return;
    }

    try {
      const res = await fetch('/api/whitelabel/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Role': actorRole,
        },
        body: JSON.stringify({
          appName: newTenantName.trim(),
          appNameEn: newTenantNameEn.trim() || newTenantName.trim(),
          plan: newTenantPlan,
          primaryColor: newTenantColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'تعذر إنشاء مساحة المستأجر.');
        return;
      }
      setIsCreateOpen(false);
      setNewTenantName('');
      setNewTenantNameEn('');
      await fetchTenants(data.tenant.id);
      await fetchOps();
      notify('success', `تم إنشاء مساحة المستأجر "${data.tenant.appName}" مع عزل كامل للبيانات.`);
    } catch {
      notify('error', 'حدث خطأ في الشبكة أثناء إنشاء المستأجر.');
    }
  };

  const handleSaveBrandConfig = async () => {
    if (!draftTenant) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/whitelabel/tenants/${draftTenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Role': actorRole,
        },
        body: JSON.stringify({
          appName: draftTenant.appName,
          appNameEn: draftTenant.appNameEn,
          tagline: draftTenant.tagline,
          bundleId: draftTenant.bundleId,
          plan: draftTenant.plan,
          theme: draftTenant.theme,
          splash: draftTenant.splash,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'تعذر حفظ التعديلات.');
        fetchOps();
        return;
      }
      setTenants((prev) => prev.map((t) => (t.id === data.tenant.id ? data.tenant : t)));
      setDraftTenant(data.tenant);
      fetchOps();
      notify('success', `تم حفظ إعدادات "${data.tenant.appName}" (الإصدار v${data.tenant.version}) بنجاح.`);
    } catch {
      notify('error', 'تعذر الاتصال بالخادم أثناء الحفظ.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssetFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'app_icon' | 'splash_logo'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draftTenant) return;

    setIsUploadingAsset(true);
    try {
      const inspected = await inspectImageFile(file, kind);
      if (!inspected.valid || !inspected.dataUrl) {
        notify('error', inspected.error || 'ملف غير صالح.');
        return;
      }

      if (inspected.warning) {
        notify('warning', inspected.warning);
      }

      const res = await fetch(`/api/whitelabel/tenants/${draftTenant.id}/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Role': actorRole,
        },
        body: JSON.stringify({
          kind,
          fileName: inspected.fileName,
          mimeType: inspected.mimeType,
          width: inspected.width,
          height: inspected.height,
          dataUrl: inspected.dataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'فشل رفع الأصل.');
        fetchOps();
        return;
      }

      if (kind === 'app_icon') {
        setIconPreviewUrl(inspected.dataUrl);
      } else {
        setSplashPreviewUrl(inspected.dataUrl);
      }
      setDraftTenant(data.tenant);
      setTenants((prev) => prev.map((t) => (t.id === data.tenant.id ? data.tenant : t)));
      fetchOps();
      notify(
        'success',
        `تم فحص "${inspected.fileName}" (${inspected.width}×${inspected.height}px) وتشفيره بـ AES-256-GCM بنجاح.`
      );
    } catch {
      notify('error', 'حدث خطأ أثناء معالجة ورفع الصورة.');
    } finally {
      setIsUploadingAsset(false);
    }
  };

  const handleTriggerBuild = async () => {
    if (!draftTenant) return;
    setIsBuilding(true);
    try {
      const res = await fetch(`/api/whitelabel/tenants/${draftTenant.id}/builds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Role': actorRole,
        },
        body: JSON.stringify({
          platform: buildPlatform,
          version: buildVersion,
          rolloutChannel,
          rolloutPercentage: rolloutPercent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'فشل توليد الحزمة.');
        fetchOps();
        return;
      }
      setDraftTenant(data.tenant);
      setTenants((prev) => prev.map((t) => (t.id === data.tenant.id ? data.tenant : t)));
      fetchOps();
      notify('success', `تم بناء وتوقيع حزمة ${data.build.platform} v${data.build.version} بنجاح.`);
    } catch {
      notify('error', 'تعذر تنفيذ بناء الحزمة.');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!draftTenant) return;
    setIsBackingUp(true);
    try {
      const res = await fetch(`/api/whitelabel/tenants/${draftTenant.id}/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Role': actorRole,
        },
        body: JSON.stringify({
          label: backupLabel.trim() || `نسخة احتياطية ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'تعذر إنشاء النسخة الاحتياطية.');
        fetchOps();
        return;
      }
      setBackupLabel('');
      setDraftTenant(data.tenant);
      setTenants((prev) => prev.map((t) => (t.id === data.tenant.id ? data.tenant : t)));
      fetchOps();
      notify('success', `تم إنشاء النسخة الاحتياطية "${data.backup.label}" ببصمة SHA-256.`);
    } catch {
      notify('error', 'خطأ في إنشاء النسخة الاحتياطية.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!draftTenant) return;
    try {
      const res = await fetch(`/api/whitelabel/tenants/${draftTenant.id}/restore/${backupId}`, {
        method: 'POST',
        headers: {
          'X-Tenant-Role': actorRole,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'فشل استرجاع النسخة الاحتياطية.');
        fetchOps();
        return;
      }
      setDraftTenant(data.tenant);
      setTenants((prev) => prev.map((t) => (t.id === data.tenant.id ? data.tenant : t)));
      setIconPreviewUrl(undefined);
      setSplashPreviewUrl(undefined);
      fetchOps();
      notify('success', `تم استرجاع إعدادات "${data.tenant.appName}" من النسخة "${data.restoredFrom.label}".`);
    } catch {
      notify('error', 'تعذر استرجاع النسخة الاحتياطية.');
    }
  };

  const handleSimulateBoundaryTamper = async () => {
    if (!draftTenant) return;
    try {
      const res = await fetch(`/api/whitelabel/tenants/${draftTenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Role': actorRole,
        },
        body: JSON.stringify({
          lockedBoundaries: {
            vatNumber: '999999999999999',
            paymentGatewaysLocked: false,
          },
        }),
      });
      const data = await res.json();
      fetchOps();
      if (res.status === 403) {
        notify('success', `حماية الحوكمة نجحت (HTTP 403): ${data.error}`);
      } else {
        notify('warning', 'تم فحص حدود الحماية.');
      }
    } catch {
      notify('error', 'خطأ في اختبار الحماية.');
    }
  };

  // Live Automated QA, DOM, Security & Recovery Test Suite
  const handleRunAutomatedQA = async () => {
    if (!draftTenant) return;
    setIsRunningQA(true);
    const results: QACheckResult[] = [];
    const t0 = performance.now();

    // 1. Contrast ratio WCAG check
    const minContrast = Math.min(primaryContrast, surfaceContrast, splashContrast);
    results.push({
      id: 'qa-wcag',
      name: 'فحص تباين الألوان (WCAG 2.1 AA)',
      category: 'تجربة المستخدم والوصول',
      status: minContrast >= 4.5 ? 'pass' : 'fail',
      metric: `${minContrast.toFixed(2)}:1`,
      detail: minContrast >= 4.5 ? 'جميع الأزرار وشاشة البدء تحقق نسبة >= 4.5:1' : 'أحد العناصر أقل من 4.5:1 — استخدم التصحيح التلقائي',
    });

    // 2. DOM Render & RTL Layout Overflow Check
    const domOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;
    const domMs = Math.max(1, Number((performance.now() - t0).toFixed(1)));
    results.push({
      id: 'qa-dom',
      name: 'اختبار DOM وتوافق RTL وعدم الفيض الأفقي',
      category: 'الأداء والواجهة',
      status: !domOverflow ? 'pass' : 'fail',
      metric: `${domMs} ms`,
      detail: !domOverflow ? `لا يوجد تجاوز أفقي (scrollWidth ${document.documentElement.scrollWidth}px)` : 'تم رصد تمرير أفقي غير مرغوب',
    });

    // 3. Immutable Legal & Payment Boundary Test against Backend
    try {
      const boundaryRes = await fetch(`/api/whitelabel/tenants/${draftTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Role': 'owner' },
        body: JSON.stringify({ lockedBoundaries: { paymentGatewaysLocked: false } }),
      });
      results.push({
        id: 'qa-boundary',
        name: 'حماية العناصر القانونية وبوابات الدفع ضد التلاعب',
        category: 'الأمن والحوكمة',
        status: boundaryRes.status === 403 ? 'pass' : 'fail',
        metric: `HTTP ${boundaryRes.status}`,
        detail: boundaryRes.status === 403 ? 'الخادم رفض تعديل VAT وبوابات الدفع وسجّل الواقعة' : 'تحذير: لم يرفض الخادم التعديل',
      });
    } catch {
      results.push({
        id: 'qa-boundary',
        name: 'حماية العناصر القانونية وبوابات الدفع',
        category: 'الأمن والحوكمة',
        status: 'fail',
        metric: 'Network Err',
        detail: 'تعذر الوصول لنقطة النهاية',
      });
    }

    // 4. Malicious SVG XSS Rejection Test
    try {
      const maliciousSvg = btoa(unescape(encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')));
      const xssRes = await fetch(`/api/whitelabel/tenants/${draftTenant.id}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Role': 'owner' },
        body: JSON.stringify({
          kind: 'app_icon',
          fileName: 'xss-probe.svg',
          mimeType: 'image/svg+xml',
          width: 512,
          height: 512,
          dataUrl: `data:image/svg+xml;base64,${maliciousSvg}`,
        }),
      });
      results.push({
        id: 'qa-xss',
        name: 'اختبار صد ملفات SVG المصابة بـ XSS / Script',
        category: 'أمن الأصول',
        status: xssRes.status === 400 ? 'pass' : 'fail',
        metric: `HTTP ${xssRes.status}`,
        detail: xssRes.status === 400 ? 'نجح فاحص المحتوى في حظر الملف المصاب فوراً' : 'فشل في صد الملف',
      });
    } catch {
      results.push({
        id: 'qa-xss',
        name: 'اختبار صد ملفات SVG المصابة',
        category: 'أمن الأصول',
        status: 'fail',
        metric: 'Error',
        detail: 'خطأ اتصال',
      });
    }

    // 5. CDN Cache Headers Verification
    if (draftTenant.iconAsset?.cdnUrl) {
      try {
        const cdnRes = await fetch(draftTenant.iconAsset.cdnUrl);
        const cacheControl = cdnRes.headers.get('Cache-Control') || '';
        const etag = cdnRes.headers.get('ETag') || '';
        results.push({
          id: 'qa-cdn',
          name: 'التحقق من ترويسات الكاش والتشفير في CDN',
          category: 'البنية والأداء',
          status: cdnRes.ok && cacheControl.includes('immutable') && Boolean(etag) ? 'pass' : 'fail',
          metric: cdnRes.headers.get('X-CDN-Cache') || 'HIT',
          detail: `Cache-Control: ${cacheControl} · ETag: ${etag}`,
        });
      } catch {
        results.push({
          id: 'qa-cdn',
          name: 'التحقق من ترويسات الكاش في CDN',
          category: 'البنية والأداء',
          status: 'fail',
          metric: 'Error',
          detail: 'تعذر فحص مسار CDN',
        });
      }
    }

    setQaResults(results);
    await fetchOps();
    setIsRunningQA(false);
  };

  if (isLoading && !draftTenant) {
    return (
      <div className="py-20 text-center space-y-3" dir="rtl">
        <div className="w-10 h-10 border-4 border-[#551465] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-300 font-bold">جاري تحميل استوديو "تطبيق باسمك وشعارك"...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onBackToHome}
            className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1.5 mb-2 transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى واجهة المتجر</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-brand-300 shrink-0" />
            <span>منصة "تطبيق باسمك وشعارك" (White-Label App Studio)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            خصّص اسم التطبيق، الأيقونة، شاشة البدء، وألوان العلامة مع حماية كاملة للعناصر القانونية والدفع، وبناء حزم Android/iOS موقعة رقمياً.
          </p>
        </div>

        {/* Workspace Tenant Switcher & RBAC Role Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold whitespace-nowrap">المستأجر:</span>
            <select
              value={selectedTenantId}
              onChange={(e) => handleSelectTenant(e.target.value)}
              aria-label="اختر مساحة المستأجر"
              className="bg-transparent text-white font-bold focus:outline-none"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.appName} ({t.plan})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
            <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-bold whitespace-nowrap">الصلاحية:</span>
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value as WhiteLabelUserRole)}
              aria-label="اختر دور المستخدم RBAC"
              className="bg-transparent text-amber-300 font-bold focus:outline-none"
            >
              <option value="owner" className="bg-slate-900 text-white">مالك (Owner)</option>
              <option value="brand_admin" className="bg-slate-900 text-white">مدير علامة (Admin)</option>
              <option value="viewer" className="bg-slate-900 text-white">مشاهد فقط (Viewer)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen((v) => !v)}
            className="px-3.5 py-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition"
          >
            <Plus className="w-4 h-4" />
            <span>مستأجر جديد</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusBanner && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : statusBanner.type === 'warning'
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create New Tenant Drawer */}
      {isCreateOpen && (
        <form
          onSubmit={handleCreateTenant}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end text-xs"
        >
          <div>
            <label className="block text-slate-300 font-bold mb-1">اسم التطبيق (عربي) *</label>
            <input
              type="text"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              placeholder="مثال: متجر المستقبل"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-bold mb-1">الاسم الإنجليزي</label>
            <input
              type="text"
              dir="ltr"
              value={newTenantNameEn}
              onChange={(e) => setNewTenantNameEn(e.target.value)}
              placeholder="Future Store"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-bold mb-1">الخطة والحصة</label>
            <select
              value={newTenantPlan}
              onChange={(e) => setNewTenantPlan(e.target.value as WhiteLabelPlanTier)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            >
              <option value="starter">Starter (25 MB)</option>
              <option value="growth">Growth (250 MB)</option>
              <option value="enterprise">Enterprise (2 GB)</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-300 font-bold mb-1">اللون الأساسي</label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <input
                type="color"
                value={newTenantColor}
                onChange={(e) => setNewTenantColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer bg-transparent"
              />
              <span className="font-mono text-slate-300">{newTenantColor}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold"
            >
              إنشاء المستأجر
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Workspace Navigation Tabs */}
      <nav className="flex items-center gap-1.5 overflow-x-auto bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs scrollbar-none">
        {[
          { id: 'studio', label: 'استوديو الهوية والمعاينة', icon: <Palette className="w-4 h-4" /> },
          { id: 'builds', label: 'الحزم والتوقيع والمتاجر', icon: <Package className="w-4 h-4" /> },
          { id: 'qa-backup', label: 'اختبار الجودة والنسخ الاحتياطي', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'ops', label: 'التشغيل والحصص والسجلات', icon: <Activity className="w-4 h-4" /> },
          { id: 'deliverables', label: 'الوثائق و CI/CD والجدول', icon: <FileText className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as StudioTab);
              if (tab.id === 'ops') fetchOps();
            }}
            className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition ${
              activeTab === tab.id
                ? 'bg-[#551465] text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Active Store Branding Banner */}
      {draftTenant && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Sparkles className="w-4 h-4 text-brand-300 shrink-0" />
            <span>
              المساحة النشطة: <strong className="text-white">{draftTenant.appName}</strong> · الباقة:{' '}
              <strong className="text-brand-300">{draftTenant.plan}</strong> · التخزين:{' '}
              <strong className="font-mono tabular-nums text-white">
                {formatBytes(draftTenant.storageUsedBytes)} / {formatBytes(draftTenant.storageQuotaBytes)}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onApplyBrandingToStore(draftTenant);
                notify('success', `تم تطبيق هوية "${draftTenant.appName}" مباشرة على واجهة المتجر!`);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold flex items-center gap-1.5 whitespace-nowrap transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {activeAppliedTenantId === draftTenant.id
                  ? 'مُفعّل على المتجر الآن'
                  : 'تطبيق الهوية على المتجر مباشرة'}
              </span>
            </button>

            {activeAppliedTenantId && (
              <button
                type="button"
                onClick={() => {
                  onResetStoreBranding();
                  notify('info' as 'success', 'تمت استعادة الهوية الافتراضية لمتجر رواج.');
                }}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center gap-1.5 whitespace-nowrap transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة رواج الافتراضي</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: Brand Studio & Live Preview */}
      {activeTab === 'studio' && draftTenant && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Identity & Bundle Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">01. هوية التطبيق ومعرّف الحزمة</h3>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">v{draftTenant.version}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">اسم التطبيق الظاهر (عربي)</label>
                  <input
                    type="text"
                    value={draftTenant.appName}
                    onChange={(e) => setDraftTenant({ ...draftTenant, appName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الاسم المختصر (English)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={draftTenant.appNameEn}
                    onChange={(e) => setDraftTenant({ ...draftTenant, appNameEn: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الشعار اللفظي (Tagline)</label>
                  <input
                    type="text"
                    value={draftTenant.tagline}
                    onChange={(e) => setDraftTenant({ ...draftTenant, tagline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">معرّف الحزمة (Bundle / Package ID)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={draftTenant.bundleId}
                    onChange={(e) => setDraftTenant({ ...draftTenant, bundleId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-brand-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. Assets Upload & Security Verification */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">02. أيقونة التطبيق وشاشة البدء (تشفير AES-256-GCM)</h3>
                  <p className="text-[11px] text-slate-400">
                    صيغ مقبولة: PNG, WebP, SVG, JPEG · حد أقصى 4 MB · أبعاد مثالية 1024×1024px
                  </p>
                </div>
                {isUploadingAsset && (
                  <span className="text-xs text-brand-300 font-bold">جاري الفحص والتشفير...</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* App Icon Upload */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-white">أيقونة التطبيق (App Icon)</strong>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('multi-dpi')}
                      className="text-[11px] text-brand-300 hover:underline font-bold"
                    >
                      فحص Multi-DPI
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center">
                      {(iconPreviewUrl || draftTenant.iconAsset?.cdnUrl) ? (
                        <img
                          src={iconPreviewUrl || draftTenant.iconAsset?.cdnUrl}
                          alt="App Icon"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Layers className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5 text-[11px] text-slate-400">
                      <span className="text-slate-200 font-bold block truncate">
                        {draftTenant.iconAsset?.fileName || 'لم يُرفع ملف بعد'}
                      </span>
                      {draftTenant.iconAsset && (
                        <>
                          <span className="font-mono tabular-nums block">
                            {draftTenant.iconAsset.width}×{draftTenant.iconAsset.height} px · {formatBytes(draftTenant.iconAsset.sizeBytes)}
                          </span>
                          <span className="text-emerald-400 font-bold block">
                            مشفّر ({draftTenant.iconAsset.encryptionAlgorithm}) · CDN
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <label className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5 text-brand-300" />
                    <span>رفع أيقونة جديدة</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleAssetFileUpload(e, 'app_icon')}
                    />
                  </label>
                </div>

                {/* Splash Logo Upload */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-white">شعار شاشة البدء (Splash)</strong>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('splash')}
                      className="text-[11px] text-brand-300 hover:underline font-bold"
                    >
                      معاينة الإقلاع
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 flex items-center justify-center">
                      {(splashPreviewUrl || draftTenant.splashAsset?.cdnUrl || draftTenant.iconAsset?.cdnUrl) ? (
                        <img
                          src={splashPreviewUrl || draftTenant.splashAsset?.cdnUrl || draftTenant.iconAsset?.cdnUrl}
                          alt="Splash Logo"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Layers className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5 text-[11px] text-slate-400">
                      <span className="text-slate-200 font-bold block truncate">
                        {draftTenant.splashAsset?.fileName || 'مرتبط بأيقونة التطبيق'}
                      </span>
                      {draftTenant.splashAsset && (
                        <>
                          <span className="font-mono tabular-nums block">
                            {draftTenant.splashAsset.width}×{draftTenant.splashAsset.height} px · {formatBytes(draftTenant.splashAsset.sizeBytes)}
                          </span>
                          <span className="text-emerald-400 font-bold block">
                            مشفّر ({draftTenant.splashAsset.encryptionAlgorithm}) · CDN
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <label className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5 text-brand-300" />
                    <span>رفع شعار شاشة البدء</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleAssetFileUpload(e, 'splash_logo')}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 3. Contrast-Enforced Brand Colors & Splash Screen */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">03. ألوان العلامة وقيود التباين (WCAG 2.1 AA)</h3>
                  <p className="text-[11px] text-slate-400">
                    يُشترط تحقيق تباين لا يقل عن <span className="font-mono tabular-nums">4.5:1</span> لضمان وضوح القراءة
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFixAllContrasts}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-300 transition"
                >
                  تصحيح التباين تلقائياً
                </button>
              </div>

              {/* Color Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { key: 'primary', label: 'اللون الأساسي (Primary)' },
                  { key: 'textOnPrimary', label: 'نص الأزرار (On Primary)' },
                  { key: 'accent', label: 'لون التمييز (Accent)' },
                  { key: 'surface', label: 'خلفية الواجهة (Surface)' },
                  { key: 'secondary', label: 'خلفية البطاقات (Card)' },
                  { key: 'textOnSurface', label: 'لون النص الأساسي' },
                ].map((field) => {
                  const val = draftTenant.theme[field.key as keyof typeof draftTenant.theme];
                  return (
                    <div key={field.key} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                      <span className="text-[11px] text-slate-400 block truncate">{field.label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={val}
                          onChange={(e) =>
                            setDraftTenant({
                              ...draftTenant,
                              theme: { ...draftTenant.theme, [field.key]: e.target.value },
                            })
                          }
                          className="w-7 h-7 rounded cursor-pointer bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          dir="ltr"
                          value={val}
                          onChange={(e) =>
                            setDraftTenant({
                              ...draftTenant,
                              theme: { ...draftTenant.theme, [field.key]: e.target.value },
                            })
                          }
                          className="w-full bg-transparent font-mono text-white text-[11px] focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Contrast Meters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                {[
                  { label: 'تباين الأزرار الرئيسية', ratio: primaryContrast },
                  { label: 'تباين النصوص والبطاقات', ratio: surfaceContrast },
                  { label: 'تباين شاشة البدء (Splash)', ratio: splashContrast },
                ].map((meter) => {
                  const level = getWCAGLevel(meter.ratio);
                  const ok = meter.ratio >= 4.5;
                  return (
                    <div
                      key={meter.label}
                      className={`p-2.5 rounded-xl border flex items-center justify-between ${
                        ok
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <span className="font-bold">{meter.label}</span>
                      <span className="font-mono font-extrabold tabular-nums">
                        {meter.ratio}:1 ({level})
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Splash Screen Controls */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">عنوان شاشة البدء</label>
                  <input
                    type="text"
                    value={draftTenant.splash.headline}
                    onChange={(e) =>
                      setDraftTenant({
                        ...draftTenant,
                        splash: { ...draftTenant.splash, headline: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">رسالة التهيئة الفرعية</label>
                  <input
                    type="text"
                    value={draftTenant.splash.subheadline}
                    onChange={(e) =>
                      setDraftTenant({
                        ...draftTenant,
                        splash: { ...draftTenant.splash, subheadline: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <input
                    type="color"
                    value={draftTenant.splash.backgroundColor}
                    onChange={(e) =>
                      setDraftTenant({
                        ...draftTenant,
                        splash: { ...draftTenant.splash, backgroundColor: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded cursor-pointer bg-transparent"
                  />
                  <div>
                    <span className="text-[11px] text-slate-400 block">خلفية شاشة البدء</span>
                    <span className="font-mono text-white">{draftTenant.splash.backgroundColor}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <input
                    type="color"
                    value={draftTenant.splash.textColor}
                    onChange={(e) =>
                      setDraftTenant({
                        ...draftTenant,
                        splash: { ...draftTenant.splash, textColor: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded cursor-pointer bg-transparent"
                  />
                  <div>
                    <span className="text-[11px] text-slate-400 block">لون نص شاشة البدء</span>
                    <span className="font-mono text-white">{draftTenant.splash.textColor}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveBrandConfig}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'جاري التحقق والحفظ...' : 'حفظ الإعدادات في الخادم'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateBoundaryTamper}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>اختبار حماية العناصر المقفلة</span>
                </button>
              </div>
            </div>

            {/* 4. Locked Governance Boundaries */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>حدود التخصيص والحوكمة (Immutable Boundaries)</span>
                </h3>
                <span className="text-[11px] text-emerald-400 font-bold">محمي على مستوى الخادم</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                  <strong className="text-slate-200 block">الكيان القانوني والضريبي (مقفل)</strong>
                  <p className="text-slate-400">{draftTenant.lockedBoundaries.legalEntityName}</p>
                  <p className="font-mono text-slate-300 tabular-nums">
                    VAT: {draftTenant.lockedBoundaries.vatNumber} · CR: {draftTenant.lockedBoundaries.crNumber}
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                  <strong className="text-slate-200 block">نظام الدفع المعتمد (مقفل)</strong>
                  <p className="text-slate-400 leading-relaxed">
                    {draftTenant.lockedBoundaries.allowedPaymentGateways.join(' · ')}
                  </p>
                  <p className="text-emerald-400 font-bold tabular-nums">
                    ضريبة القيمة المضافة المقفلة: {draftTenant.lockedBoundaries.vatRateLockedPercent}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Preview Column (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <DevicePreviewSimulator
              tenant={draftTenant}
              iconPreviewUrl={iconPreviewUrl}
              splashPreviewUrl={splashPreviewUrl}
              previewMode={previewMode}
              onChangePreviewMode={setPreviewMode}
            />
          </div>
        </div>
      )}

      {/* TAB 2: App Packaging, Digital Signing & Store Simulator */}
      {activeTab === 'builds' && draftTenant && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">توليد حزم التطبيق والتوقيع الرقمي وخطط الترقية</h3>
                <p className="text-xs text-slate-400">
                  بناء حزمة مخصصة (Android AAB / iOS IPA / Dynamic PWA) مع توقيع رقمي آلي وتحديثات OTA
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المنصة المستهدفة</label>
                  <select
                    value={buildPlatform}
                    onChange={(e) => setBuildPlatform(e.target.value as WhiteLabelBuildRecord['platform'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  >
                    <option value="android_aab">Android App Bundle (.aab)</option>
                    <option value="ios_ipa">iOS Signed Archive (.ipa)</option>
                    <option value="dynamic_pwa">Dynamic Web / PWA Package</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم الإصدار (Semantic Version)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={buildVersion}
                    onChange={(e) => setBuildVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">مسار التحديث والنشر</label>
                  <select
                    value={rolloutChannel}
                    onChange={(e) =>
                      setRolloutChannel(e.target.value as WhiteLabelBuildRecord['rolloutChannel'])
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white"
                  >
                    <option value="production">نشر إنتاجي بالمتجر (Store Release)</option>
                    <option value="beta">قناة تجريبية (TestFlight / Internal)</option>
                    <option value="ota_config">تحديث فوري ديناميكي (OTA Config)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 tabular-nums">
                    نسبة الإطلاق التدريجي (Staged Rollout): {rolloutPercent}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={10}
                    value={rolloutPercent}
                    onChange={(e) => setRolloutPercent(Number(e.target.value))}
                    className="w-full accent-[#551465] mt-2"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerBuild}
                disabled={isBuilding}
                className="px-5 py-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-60"
              >
                <Play className="w-4 h-4" />
                <span>{isBuilding ? 'جاري التجميع والتوقيع الرقمي...' : 'بدء البناء والتوقيع الرقمي الآن'}</span>
              </button>
            </div>

            {/* Build History Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-white">سجل الحزم الموقعة ({draftTenant.builds.length})</h4>
              {draftTenant.builds.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  لا توجد حزم مبنية لهذا المستأجر بعد. اضغط على زر البناء أعلاه لتوليد أول حزمة موقعة.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {draftTenant.builds.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-white font-mono">
                            {b.platform.toUpperCase()} · v{b.version} (#{b.buildNumber})
                          </strong>
                          <span className="text-emerald-400 font-bold">موقع رقمياً</span>
                          <span className="text-slate-400 tabular-nums">· {b.bundleSizeMb} MB · طرح {b.rolloutPercentage}%</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate" dir="ltr">
                          {b.signingAlgorithm} · {b.signatureFingerprint}
                        </p>
                      </div>

                      <a
                        href={b.manifestUrl}
                        download={`${draftTenant.slug}-${b.id}-manifest.json`}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-brand-300 font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Manifest JSON</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <DevicePreviewSimulator
              tenant={draftTenant}
              iconPreviewUrl={iconPreviewUrl}
              splashPreviewUrl={splashPreviewUrl}
              previewMode="app-stores"
              onChangePreviewMode={setPreviewMode}
            />
          </div>
        </div>
      )}

      {/* TAB 3: QA, Security Tests & Backup/Restore */}
      {activeTab === 'qa-backup' && draftTenant && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Live QA Suite */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">مختبر اختبارات الجودة والأمن والأداء (QA & DOM Suite)</h3>
                <p className="text-xs text-slate-400">
                  تنفيذ فحوصات حية على DOM، التباين، صد ملفات XSS، ترويسات CDN، وحماية العناصر القانونية
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunAutomatedQA}
                disabled={isRunningQA}
                className="px-4 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunningQA ? 'جاري الفحص...' : 'تشغيل الفحص الشامل الآن'}</span>
              </button>
            </div>

            {qaResults.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2 text-xs">
                <ShieldCheck className="w-8 h-8 text-brand-300 mx-auto" />
                <p className="text-slate-300 font-bold">اضغط على "تشغيل الفحص الشامل الآن" لتنفيذ جميع سيناريوهات الاختبار والأمن.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {qaResults.map((res) => (
                  <div
                    key={res.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 block">{res.category}</span>
                      <strong className="text-white block">{res.name}</strong>
                      <p className="text-slate-400">{res.detail}</p>
                    </div>
                    <div className="text-left shrink-0 space-y-0.5">
                      <span
                        className={`font-extrabold block ${
                          res.status === 'pass' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {res.status === 'pass' ? 'ناجح (PASS)' : 'فشل (FAIL)'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-300 tabular-nums block">{res.metric}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Backup & Restore Snapshots */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-300" />
                <span>النسخ الاحتياطي والاسترجاع الفوري</span>
              </h3>
              <p className="text-xs text-slate-400">
                إنشاء لقطة محفوظة ببصمة SHA-256 واستعادتها في أي لحظة عند فشل التحديث
              </p>
            </div>

            <div className="flex gap-2 text-xs">
              <input
                type="text"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                placeholder="اسم النسخة الاحتياطية (اختياري)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                className="px-4 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold whitespace-nowrap"
              >
                {isBackingUp ? 'جاري الحفظ...' : 'حفظ نسخة'}
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {draftTenant.backups.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد نسخ احتياطية مسجلة لهذا المستأجر بعد.</p>
              ) : (
                draftTenant.backups.map((bkp) => (
                  <div
                    key={bkp.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <strong className="text-white block truncate">{bkp.label}</strong>
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums block truncate">
                        {bkp.appName} · {formatBytes(bkp.sizeBytes)} · SHA: {bkp.checksumSha256.slice(0, 12)}...
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreBackup(bkp.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold whitespace-nowrap shrink-0 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>استرجاع</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Operations, Storage Quotas, Pricing Matrix & Audit Logs */}
      {activeTab === 'ops' && (
        <div className="space-y-6">
          {/* Operational KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'المستأجرون النشطون',
                value: String(opsSummary?.totalTenants ?? tenants.length),
                sub: 'عزل Multi-Tenant كامل',
              },
              {
                label: 'نسبة إصابة كاش CDN',
                value: `${opsSummary?.cdnCacheHitRatio ?? 97.5}%`,
                sub: `${opsSummary?.cdnCacheHits ?? 0} / ${opsSummary?.cdnRequestsTotal ?? 0} طلب`,
              },
              {
                label: 'الأصول المشفرة AES-256',
                value: String(opsSummary?.totalAssetsEncrypted ?? 0),
                sub: formatBytes(opsSummary?.totalStorageUsedBytes ?? 0),
              },
              {
                label: 'أحداث الأمن والأخطاء المسجلة',
                value: String(opsSummary?.errorEventsCount ?? 0),
                sub: `إجمالي الحزم الموقعة: ${opsSummary?.totalBuilds ?? 0}`,
              },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
                <span className="text-xs text-slate-400 block">{kpi.label}</span>
                <strong className="text-2xl font-extrabold text-white tabular-nums block">{kpi.value}</strong>
                <span className="text-[11px] text-brand-300 font-mono tabular-nums block">{kpi.sub}</span>
              </div>
            ))}
          </div>

          {/* Storage Quotas Per Tenant */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-brand-300" />
              <span>حدود التخزين والاستهلاك الفعلي لكل مستأجر</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {tenants.map((t) => {
                const pct = Math.min(100, Math.max(2, (t.storageUsedBytes / t.storageQuotaBytes) * 100));
                return (
                  <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-white truncate">{t.appName}</strong>
                      <span className="font-mono text-brand-300">{t.plan}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-[#551465]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>{formatBytes(t.storageUsedBytes)} مستخدم</span>
                      <span>الحد: {formatBytes(t.storageQuotaBytes)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Tiers & Limits Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">سياسات التسعير وقيود الاستخدام</h3>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">الباقة</th>
                    <th className="p-3">السعر الشهري</th>
                    <th className="p-3">حصة التخزين</th>
                    <th className="p-3">حزم البناء الشهرية</th>
                    <th className="p-3">التحديثات و CDN</th>
                    <th className="p-3">دعم المتاجر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {WHITE_LABEL_PLANS.map((plan) => (
                    <tr key={plan.tier} className="hover:bg-slate-950/60">
                      <td className="p-3">
                        <strong className="text-white block">{plan.nameAr}</strong>
                        <span className="text-[11px] text-slate-400">{plan.audience}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                        {plan.monthlyPriceSar.toLocaleString()} ر.س / شهر
                      </td>
                      <td className="p-3 font-mono text-white tabular-nums">{plan.storageQuotaLabel}</td>
                      <td className="p-3 text-slate-300">{plan.buildsPerMonth}</td>
                      <td className="p-3 text-slate-300">{plan.customDomainAndOta}</td>
                      <td className="p-3 text-slate-300">{plan.storeSubmissionSupport}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit & Error Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">سجل الأحداث والأخطاء والتنبيهات الأمنية</h3>
              <button
                type="button"
                onClick={fetchOps}
                disabled={isLoadingOps}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOps ? 'animate-spin' : ''}`} />
                <span>تحديث السجل</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-80">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">الوقت</th>
                    <th className="p-2.5">المستأجر</th>
                    <th className="p-2.5">الحدث</th>
                    <th className="p-2.5">الدور</th>
                    <th className="p-2.5">الحالة</th>
                    <th className="p-2.5">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(opsSummary?.logs || []).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-950/60">
                      <td className="p-2.5 font-mono text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-300">{log.tenantId}</td>
                      <td className="p-2.5 font-mono text-[11px] font-bold text-white">{log.action}</td>
                      <td className="p-2.5 text-[11px] text-slate-300">{log.actorRole}</td>
                      <td className="p-2.5 font-mono tabular-nums">
                        <span
                          className={`font-bold ${
                            log.statusCode >= 400
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Technical Deliverables & Timeline */}
      {activeTab === 'deliverables' && draftTenant && (
        <WhiteLabelDeliverablesTab tenant={draftTenant} />
      )}
    </div>
  );
};
