import { WhiteLabelAssetKind, WhiteLabelPlanTier, WhiteLabelTenant } from '../types';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function normalizeHex(hex: string): string {
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return (
      '#' +
      clean
        .split('')
        .map((c) => c + c)
        .join('')
        .toLowerCase()
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return '#' + clean.toLowerCase();
  }
  return '#551465';
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex).slice(1);
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export type WCAGLevel = 'AAA' | 'AA' | 'AA-Large' | 'FAIL';

export function getWCAGLevel(ratio: number): WCAGLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-Large';
  return 'FAIL';
}

export function autoFixContrastColor(fgHex: string, bgHex: string, targetRatio = 4.6): string {
  const currentRatio = getContrastRatio(fgHex, bgHex);
  if (currentRatio >= targetRatio) return normalizeHex(fgHex);

  const bgLum = getRelativeLuminance(bgHex);
  const fg = hexToRgb(fgHex);
  const moveLighter = bgLum < 0.35;
  const targetRgb: RgbColor = moveLighter ? { r: 255, g: 255, b: 255 } : { r: 2, g: 6, b: 23 };

  for (let step = 1; step <= 40; step++) {
    const t = step / 40;
    const candidate = rgbToHex({
      r: fg.r + (targetRgb.r - fg.r) * t,
      g: fg.g + (targetRgb.g - fg.g) * t,
      b: fg.b + (targetRgb.b - fg.b) * t,
    });
    if (getContrastRatio(candidate, bgHex) >= targetRatio) {
      return candidate;
    }
  }
  return moveLighter ? '#ffffff' : '#020617';
}

export function mixHex(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, weightB));
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

export function applyBrandPaletteToDocument(primaryHex: string | null) {
  const root = document.documentElement;
  if (!primaryHex) {
    root.removeAttribute('data-whitelabel');
    [
      '--color-brand-50',
      '--color-brand-100',
      '--color-brand-200',
      '--color-brand-300',
      '--color-brand-400',
      '--color-brand-500',
      '--color-brand-600',
      '--color-brand-700',
      '--color-brand-800',
      '--color-brand-900',
      '--color-brand-950',
    ].forEach((token) => root.style.removeProperty(token));
    return;
  }

  const base = normalizeHex(primaryHex);
  root.setAttribute('data-whitelabel', 'active');
  root.style.setProperty('--color-brand-50', mixHex(base, '#ffffff', 0.92));
  root.style.setProperty('--color-brand-100', mixHex(base, '#ffffff', 0.84));
  root.style.setProperty('--color-brand-200', mixHex(base, '#ffffff', 0.7));
  root.style.setProperty('--color-brand-300', mixHex(base, '#ffffff', 0.52));
  root.style.setProperty('--color-brand-400', mixHex(base, '#ffffff', 0.34));
  root.style.setProperty('--color-brand-500', mixHex(base, '#ffffff', 0.18));
  root.style.setProperty('--color-brand-600', mixHex(base, '#ffffff', 0.08));
  root.style.setProperty('--color-brand-700', base);
  root.style.setProperty('--color-brand-800', mixHex(base, '#020617', 0.16));
  root.style.setProperty('--color-brand-900', mixHex(base, '#020617', 0.32));
  root.style.setProperty('--color-brand-950', mixHex(base, '#020617', 0.54));
}

export interface InspectedImageFile {
  valid: boolean;
  error?: string;
  warning?: string;
  dataUrl?: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  fileName: string;
}

export async function inspectImageFile(
  file: File,
  kind: WhiteLabelAssetKind
): Promise<InspectedImageFile> {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  const maxBytes = 4 * 1024 * 1024; // 4 MB

  if (!allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: 'صيغة الملف غير مدعومة. الصيغ المسموحة: PNG, WebP, SVG, JPEG فقط.',
      width: 0,
      height: 0,
      sizeBytes: file.size,
      mimeType: file.type || 'unknown',
      fileName: file.name,
    };
  }

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `حجم الملف (${(file.size / 1024 / 1024).toFixed(2)} MB) يتجاوز الحد المسموح (4 MB).`,
      width: 0,
      height: 0,
      sizeBytes: file.size,
      mimeType: file.type,
      fileName: file.name,
    };
  }

  if (file.type === 'image/svg+xml') {
    const rawText = await file.text();
    const dangerousPattern = /<script|javascript:|on\w+\s*=|<foreignObject|<iframe|<object/i;
    if (dangerousPattern.test(rawText)) {
      return {
        valid: false,
        error: 'تم رفض ملف SVG لاحتوائه على وسوم برمجية غير آمنة (XSS Guard).',
        width: 0,
        height: 0,
        sizeBytes: file.size,
        mimeType: file.type,
        fileName: file.name,
      };
    }
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الملف محلياً'));
    reader.readAsDataURL(file);
  });

  const dims = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 512, height: img.naturalHeight || 512 });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });

  if (dims.width === 0 || dims.height === 0) {
    return {
      valid: false,
      error: 'تعذر فك ترميز أبعاد الصورة. تأكد من سلامة الملف.',
      width: 0,
      height: 0,
      sizeBytes: file.size,
      mimeType: file.type,
      fileName: file.name,
    };
  }

  let warning: string | undefined;
  if (kind === 'app_icon') {
    if (dims.width !== dims.height) {
      warning = `يفضل أن تكون أيقونة التطبيق مربعة (1:1). الأبعاد الحالية: ${dims.width}×${dims.height} بكسل.`;
    } else if (dims.width < 512) {
      warning = `الدقة الموصى بها للأيقونة 1024×1024 (حد أدنى 512×512). الدقة الحالية: ${dims.width}×${dims.height}px.`;
    }
  } else if (kind === 'splash_logo' && (dims.width < 400 || dims.height < 400)) {
    warning = `لشاشات الهواتف عالية الكثافة (xxhdpi/xxxhdpi)، يُنصح بدقة لا تقل عن 512×512 بكسل.`;
  }

  return {
    valid: true,
    warning,
    dataUrl,
    width: dims.width,
    height: dims.height,
    sizeBytes: file.size,
    mimeType: file.type,
    fileName: file.name,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface PlanPolicySpec {
  tier: WhiteLabelPlanTier;
  nameAr: string;
  audience: string;
  monthlyPriceSar: number;
  storageQuotaLabel: string;
  storageQuotaBytes: number;
  buildsPerMonth: string;
  customDomainAndOta: string;
  storeSubmissionSupport: string;
  maxAssets: number;
}

export const WHITE_LABEL_PLANS: PlanPolicySpec[] = [
  {
    tier: 'starter',
    nameAr: 'الباقة الأساسية (Starter)',
    audience: 'للمتاجر الناشئة والتجربة السريعة',
    monthlyPriceSar: 299,
    storageQuotaLabel: '25 MB',
    storageQuotaBytes: 25 * 1024 * 1024,
    buildsPerMonth: '3 حزم شهرياً (Dynamic PWA + APK)',
    customDomainAndOta: 'تحديثات OTA فورية للشعار والألوان',
    storeSubmissionSupport: 'دليل النشر الذاتي',
    maxAssets: 10,
  },
  {
    tier: 'growth',
    nameAr: 'باقة النمو (Growth)',
    audience: 'للعلامات التجارية المتنامية',
    monthlyPriceSar: 699,
    storageQuotaLabel: '250 MB',
    storageQuotaBytes: 250 * 1024 * 1024,
    buildsPerMonth: '20 حزمة شهرياً (Android AAB + iOS IPA)',
    customDomainAndOta: 'OTA + CDN مخصص + نطاق فرعي',
    storeSubmissionSupport: 'توقيع رقمي آلي ومراجعة متاجر',
    maxAssets: 50,
  },
  {
    tier: 'enterprise',
    nameAr: 'باقة المؤسسات (Enterprise)',
    audience: 'للسلاسل التجارية ومتاجر التجزئة الكبرى',
    monthlyPriceSar: 1499,
    storageQuotaLabel: '2 GB',
    storageQuotaBytes: 2048 * 1024 * 1024,
    buildsPerMonth: 'بناء غير محدود + CI/CD مخصص',
    customDomainAndOta: 'Multi-Region CDN + تشفير مفاتيح KMS خاصة',
    storeSubmissionSupport: 'نشر مباشر على حسابات App Store / Google Play',
    maxAssets: 500,
  },
];

export const MULTI_DPI_SPECS = [
  { density: 'mdpi (1x)', px: 48, platform: 'Android', usage: 'شاشات قياسية قديمة' },
  { density: 'hdpi (1.5x)', px: 72, platform: 'Android', usage: 'هواتف متوسطة الكثافة' },
  { density: 'xhdpi (2x)', px: 96, platform: 'Android / iOS @2x', usage: 'أغلب شاشات HD و Retina' },
  { density: 'xxhdpi (3x)', px: 144, platform: 'Android / iOS @3x', usage: 'شاشات FHD+ و Super Retina' },
  { density: 'xxxhdpi (4x)', px: 192, platform: 'Android Adaptive', usage: 'شاشات QHD+ و Launchers' },
  { density: 'Store Master', px: 1024, platform: 'Play Store & App Store', usage: 'أيقونة المتجر الرئيسية (بدون شفافية لـ iOS)' },
];

export const ACCEPTANCE_CRITERIA_LIST = [
  {
    id: 'ac-1',
    category: 'نطاق التخصيص والحوكمة',
    title: 'قفل العناصر القانونية وبوابات الدفع ضد أي تعديل من المستأجر',
    detail: 'يرفض الخادم أي محاولة لتغيير الرقم الضريبي VAT أو السجل التجاري أو بوابات الدفع المعتمدة مع تسجيل تنبيه أمني.',
  },
  {
    id: 'ac-2',
    category: 'تجربة المستخدم والتباين',
    title: 'ضمان معيار WCAG 2.1 AA (نسبة تباين >= 4.5:1)',
    detail: 'يمنع النظام حفظ ألوان نص/خلفية ذات تباين منخفض مع توفير زر تصحيح تلقائي فوري.',
  },
  {
    id: 'ac-3',
    category: 'أمن الأصول والتحقق',
    title: 'فحص Magic Bytes وتعقيم SVG وتشفير AES-256-GCM',
    detail: 'يتم فحص التوقيع الثنائي للملفات، حظر أي وسوم script/XSS، وتشفير الأصول قبل حفظها وتوزيعها عبر CDN بـ ETag.',
  },
  {
    id: 'ac-4',
    category: 'تعدد المستأجرين والنسخ الاحتياطي',
    title: 'عزل البيانات لكل مستأجر مع نسخ احتياطي واسترجاع بضغطة زر',
    detail: 'تُحفظ إعدادات وأصول كل عميل بمعزل تام مع لقطات Snapshot موثقة ببصمة SHA-256.',
  },
  {
    id: 'ac-5',
    category: 'البناء والنشر والتوزيع',
    title: 'توليد حزم Android AAB / iOS IPA / PWA بتوقيع رقمي ومحاكي متاجر',
    detail: 'بناء حزمة موقعة رقمياً ببصمة Keystore/Certificate مع معاينة مطابقة لشروط Google Play وApp Store.',
  },
  {
    id: 'ac-6',
    category: 'التشغيل والمراقبة والخطط',
    title: 'تتبع الحصص التخزينية وسجل الأخطاء والتدقيق الأمني',
    detail: 'مراقبة فورية لنسبة إصابة الكاش (Cache Hit Ratio)، استهلاك التخزين لكل مستأجر، وتطبيق قيود الصلاحيات RBAC.',
  },
];

export const EXECUTION_TIMELINE_PHASES = [
  {
    phase: 'المرحلة 1: التصميم والهندسة (Design & Architecture)',
    durationWeeks: 'أسبوعان',
    hours: 72,
    resources: 'مهندس معماري، مصمم UX/UI، مختص أمن معلومات',
    deliverables: 'مخطط قاعدة البيانات Multi-Tenant، عقود OpenAPI، نماذج المعاينة وقيود التباين WCAG AA',
  },
  {
    phase: 'المرحلة 2: التطوير الخلفي والواجهات (Core Development)',
    durationWeeks: '4 أسابيع',
    hours: 168,
    resources: '2 مطور Full-Stack، مطور Mobile/CI-CD',
    deliverables: 'استوديو العلامة، محرك رفع وفحص وتشفير الأصول، طبقة CDN/ETag، وخط بناء الحزم والتوقيع الرقمي',
  },
  {
    phase: 'المرحلة 3: الاختبار وضمان الجودة والأمن (QA & Security)',
    durationWeeks: 'أسبوعان',
    hours: 84,
    resources: 'مهندس QA أتمتة، مختبر اختراق وأداء',
    deliverables: 'اختبارات أجهزة فعلية متعددة الدقة، فحص XSS/Polyglot، قياس زمن DOM، وسيناريوهات الفشل والاسترجاع',
  },
  {
    phase: 'المرحلة 4: النشر التدريجي والتشغيل (Rollout & Ops)',
    durationWeeks: 'أسبوع واحد',
    hours: 40,
    resources: 'مهندس DevOps / SRE، فريق دعم العملاء',
    deliverables: 'خطوط Fastlane/GitHub Actions، لوحة مراقبة الحصص والأخطاء، ودليل تفعيل العملاء الأوائل',
  },
];

export function buildCICDYaml(tenant?: WhiteLabelTenant): string {
  const slug = tenant?.slug || 'merchant-app';
  const bundleId = tenant?.bundleId || 'com.rawaj.merchantapp';
  return `name: White-Label Mobile Build & Sign (${slug})

on:
  workflow_dispatch:
    inputs:
      tenant_id:
        description: 'Tenant Identifier'
        required: true
        default: '${tenant?.id || 'tenant-rawaj'}'
      platform:
        description: 'Target Platform (android_aab | ios_ipa | all)'
        default: 'all'

jobs:
  security-and-contrast-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fetch & Verify Locked Boundaries
        run: |
          curl -fsSL "$API_BASE/api/whitelabel/tenants/\${{ inputs.tenant_id }}" -o tenant.json
          node scripts/verify-wcag-and-boundaries.mjs tenant.json

  build-android-aab:
    needs: security-and-contrast-gate
    runs-on: ubuntu-latest
    steps:
      - name: Generate Multi-DPI Adaptive Icons (mdpi -> xxxhdpi)
        run: node scripts/generate-mipmap-icons.mjs tenant.json
      - name: Build & Sign Android Release AAB
        env:
          BUNDLE_ID: '${bundleId}'
          ANDROID_KEYSTORE_B64: \${{ secrets.RAWAJ_PLAY_KEYSTORE }}
        run: ./gradlew bundleRelease -PapplicationId=$BUNDLE_ID
      - name: Upload to Google Play Internal Track
        run: bundle exec fastlane android deploy_internal

  build-ios-ipa:
    needs: security-and-contrast-gate
    runs-on: macos-14
    steps:
      - name: Generate AppIcon.appiconset (1024px non-alpha) & LaunchScreen
        run: node scripts/generate-xcassets.mjs tenant.json
      - name: Match Certificates & Export Signed IPA
        run: bundle exec fastlane ios release_tenant
`;
}

export function buildClientConfigExport(tenant: WhiteLabelTenant): string {
  return JSON.stringify(
    {
      schemaVersion: '2026.1',
      tenantId: tenant.id,
      slug: tenant.slug,
      branding: {
        appName: tenant.appName,
        appNameEn: tenant.appNameEn,
        tagline: tenant.tagline,
        bundleId: tenant.bundleId,
        theme: tenant.theme,
        splash: tenant.splash,
        assets: {
          appIconCdn: tenant.iconAsset?.cdnUrl || null,
          splashLogoCdn: tenant.splashAsset?.cdnUrl || null,
        },
      },
      immutableGovernance: tenant.lockedBoundaries,
    },
    null,
    2
  );
}
