import { ArModelType, Product, ProductDimensions } from '../types';

export type ArReferenceItemId =
  | 'none'
  | 'smartphone'
  | 'a4'
  | 'mug'
  | 'desk_mat'
  | 'dining_chair';

export type ArSurfaceMode = 'floor' | 'desk';

export interface ArReferenceSpec {
  id: ArReferenceItemId;
  labelAr: string;
  labelEn: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
}

export interface ArFinishPreset {
  id: string;
  labelAr: string;
  labelEn: string;
  primaryHex: string;
  accentHex: string;
  metalness?: number;
  roughness?: number;
}

export interface RoomFitResult {
  fits: boolean;
  fitsWidth: boolean;
  fitsDepth: boolean;
  marginWidthCm: number;
  marginDepthCm: number;
  footprintSqCm: number;
  availableSqCm: number;
  utilizationPercent: number;
  verdictAr: string;
  verdictEn: string;
}

export const AR_REFERENCE_ITEMS: ArReferenceSpec[] = [
  { id: 'none', labelAr: 'بدون عنصر مقارنة', labelEn: 'No Reference Object', widthCm: 0, heightCm: 0, depthCm: 0 },
  { id: 'smartphone', labelAr: 'هاتف ذكي (7.5 × 15 × 0.8 سم)', labelEn: 'Smartphone (7.5×15×0.8 cm)', widthCm: 7.5, heightCm: 15.0, depthCm: 0.8 },
  { id: 'mug', labelAr: 'كوب قهوة قياسي (8.5 × 9.5 سم)', labelEn: 'Coffee Mug (8.5×9.5 cm)', widthCm: 8.5, heightCm: 9.5, depthCm: 8.5 },
  { id: 'a4', labelAr: 'ورقة A4 (21 × 29.7 سم)', labelEn: 'A4 Sheet (21×29.7 cm)', widthCm: 21.0, heightCm: 0.4, depthCm: 29.7 },
  { id: 'desk_mat', labelAr: 'مفرش مكتب (80 × 30 سم)', labelEn: 'Desk Mat (80×30 cm)', widthCm: 80.0, heightCm: 0.5, depthCm: 30.0 },
  { id: 'dining_chair', labelAr: 'كرسي قياسي للمقارنة (48 × 85 × 48 سم)', labelEn: 'Standard Chair (48×85×48 cm)', widthCm: 48.0, heightCm: 85.0, depthCm: 48.0 },
];

export const AR_FINISH_PRESETS: ArFinishPreset[] = [
  { id: 'default', labelAr: 'الأصلي للمنتج', labelEn: 'Original Finish', primaryHex: '', accentHex: '' },
  { id: 'obsidian', labelAr: 'أسود مطفي فلكي', labelEn: 'Space Black', primaryHex: '#1f2937', accentHex: '#6366f1', metalness: 0.55, roughness: 0.35 },
  { id: 'silver', labelAr: 'فضي تيتانيوم', labelEn: 'Titanium Silver', primaryHex: '#cbd5e1', accentHex: '#94a3b8', metalness: 0.85, roughness: 0.2 },
  { id: 'oak', labelAr: 'خشب بلوط طبيعي', labelEn: 'Natural Oak', primaryHex: '#c28b57', accentHex: '#27272a', metalness: 0.08, roughness: 0.68 },
  { id: 'royal', labelAr: 'بنفسجي رواج الملكي', labelEn: 'Rawaj Royal', primaryHex: '#6b21a8', accentHex: '#e0a3f0', metalness: 0.42, roughness: 0.3 },
];

export function resolveArModelType(product: Product): ArModelType {
  if (product.dimensions?.arModelType) {
    return product.dimensions.arModelType;
  }
  const text = `${product.id} ${product.name} ${product.nameEn || ''}`.toLowerCase();
  const tokens = text.split(/[\s\-_.,()[\]{}/"'،]+/).filter(Boolean);
  const hasWord = (...words: string[]) => words.some((w) => tokens.includes(w));

  if (text.includes('قهوة') || text.includes('إسبريسو') || text.includes('espresso') || text.includes('coffee')) {
    return 'coffee_maker';
  }
  if (hasWord('مكتب', 'مكتباً', 'طاولة', 'desk', 'table') || text.includes('standing desk')) {
    return 'desk';
  }
  if (text.includes('كرسي') || text.includes('أريكة') || text.includes('كنب') || hasWord('chair', 'sofa', 'lounge', 'armchair')) {
    return 'chair';
  }
  if (text.includes('شاشة') || text.includes('monitor') || text.includes('display') || hasWord('oled')) {
    return 'monitor';
  }
  if (
    text.includes('لابتوب') ||
    text.includes('حاسوب') ||
    text.includes('ماك بوك') ||
    text.includes('ماكبوك') ||
    text.includes('macbook') ||
    hasWord('book', 'laptop', 'mac')
  ) {
    return 'laptop';
  }
  if (text.includes('ألعاب') || text.includes('بلايستيشن') || hasWord('console', 'titan', 'xbox', 'ps5')) {
    return 'console';
  }
  if (hasWord('ساعة', 'ساعات', 'watch', 'smartwatch')) {
    return 'smartwatch';
  }
  if (text.includes('سماعة') || text.includes('سماعات') || hasWord('pods', 'headphone', 'headphones', 'soundpods')) {
    return 'headphones';
  }
  if (text.includes('كاميرا') || hasWord('camera', 'cinecam')) {
    return 'camera';
  }
  if (text.includes('حقيبة') || text.includes('سفر') || hasWord('luggage', 'suitcase', 'bag')) {
    return 'luggage';
  }

  return product.category === 'home' ? 'generic_furniture' : 'generic_electronics';
}

export function getProductDimensions(product: Product): ProductDimensions & { arModelType: ArModelType } {
  const arModelType = resolveArModelType(product);
  if (product.dimensions) {
    return {
      ...product.dimensions,
      arModelType,
    };
  }
  switch (product.category) {
    case 'electronics':
      return { widthCm: 34, heightCm: 2.2, depthCm: 24, weightKg: 1.9, labelAr: 'أبعاد تقديرية للإلكترونيات', arModelType };
    case 'gaming':
      return { widthCm: 42, heightCm: 14, depthCm: 26, weightKg: 4.2, labelAr: 'أبعاد تقديرية لأجهزة الألعاب', arModelType };
    case 'home':
      return { widthCm: 65, heightCm: 75, depthCm: 55, weightKg: 12.0, labelAr: 'أبعاد تقديرية للأثاث والمنزل', arModelType };
    case 'fashion':
      return { widthCm: 38, heightCm: 52, depthCm: 22, weightKg: 3.1, labelAr: 'أبعاد تقديرية لمنتجات السفر', arModelType };
    default:
      return { widthCm: 18, heightCm: 18, depthCm: 10, weightKg: 0.45, labelAr: 'أبعاد تقديرية للمنتج', arModelType };
  }
}

export function isFloorFurnitureModel(modelType: ArModelType): boolean {
  return modelType === 'desk' || modelType === 'chair' || modelType === 'luggage' || modelType === 'generic_furniture';
}

export function computeRoomFitAnalysis(
  dims: Pick<ProductDimensions, 'widthCm' | 'depthCm'>,
  availableWidthCm: number,
  availableDepthCm: number,
  rotated90 = false
): RoomFitResult {
  const safeAvailW = Math.max(10, Number.isFinite(availableWidthCm) ? availableWidthCm : 120);
  const safeAvailD = Math.max(10, Number.isFinite(availableDepthCm) ? availableDepthCm : 80);

  const effectiveWidth = rotated90 ? dims.depthCm : dims.widthCm;
  const effectiveDepth = rotated90 ? dims.widthCm : dims.depthCm;

  const marginWidthCm = Number((safeAvailW - effectiveWidth).toFixed(1));
  const marginDepthCm = Number((safeAvailD - effectiveDepth).toFixed(1));

  const fitsWidth = marginWidthCm >= 0;
  const fitsDepth = marginDepthCm >= 0;
  const fits = fitsWidth && fitsDepth;

  const footprintSqCm = Number((effectiveWidth * effectiveDepth).toFixed(1));
  const availableSqCm = Number((safeAvailW * safeAvailD).toFixed(1));
  const utilizationPercent = Math.min(999, Math.round((footprintSqCm / Math.max(1, availableSqCm)) * 100));

  let verdictAr = '';
  let verdictEn = '';

  if (fits) {
    verdictAr = `مناسب للمساحة! يتبقى هامش أمان ${marginWidthCm} سم عرضاً × ${marginDepthCm} سم عمقاً.`;
    verdictEn = `Fits your space! Leaves ${marginWidthCm} cm width × ${marginDepthCm} cm depth clearance.`;
  } else {
    const issuesAr: string[] = [];
    const issuesEn: string[] = [];
    if (!fitsWidth) {
      issuesAr.push(`العرض يزيد بمقدار ${Math.abs(marginWidthCm)} سم`);
      issuesEn.push(`width exceeds by ${Math.abs(marginWidthCm)} cm`);
    }
    if (!fitsDepth) {
      issuesAr.push(`العمق يزيد بمقدار ${Math.abs(marginDepthCm)} سم`);
      issuesEn.push(`depth exceeds by ${Math.abs(marginDepthCm)} cm`);
    }
    verdictAr = `تحذير المقاس: المنتج يتجاوز المساحة المحددة (${issuesAr.join(' و')}).`;
    verdictEn = `Size alert: exceeds your space (${issuesEn.join(' and ')}).`;
  }

  return {
    fits,
    fitsWidth,
    fitsDepth,
    marginWidthCm,
    marginDepthCm,
    footprintSqCm,
    availableSqCm,
    utilizationPercent,
    verdictAr,
    verdictEn,
  };
}

export function clampRoomPlacement(
  xMeters: number,
  zMeters: number,
  maxRadiusMeters = 2.2
): { x: number; z: number } {
  const safeX = Number.isFinite(xMeters) ? xMeters : 0;
  const safeZ = Number.isFinite(zMeters) ? zMeters : 0;
  return {
    x: Number(Math.max(-maxRadiusMeters, Math.min(maxRadiusMeters, safeX)).toFixed(3)),
    z: Number(Math.max(-maxRadiusMeters, Math.min(maxRadiusMeters, safeZ)).toFixed(3)),
  };
}
