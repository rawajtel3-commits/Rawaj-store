export const POINTS_PER_TEN_SAR = 1; // 1 نقطة لكل 10 ر.س إنفاق
export const POINTS_PER_SAR_DISCOUNT = 10; // كل 10 نقاط = 1 ر.س خصم مباشر
export const MIN_REDEEM_POINTS = 50; // الحد الأدنى للاستبدال 50 نقطة (5 ر.س)

export function calculateEarnedPoints(amountSar: number): number {
  if (!Number.isFinite(amountSar) || amountSar <= 0) return 0;
  return Math.floor((amountSar / 10) * POINTS_PER_TEN_SAR);
}

export function pointsToDiscountSar(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.floor((points / POINTS_PER_SAR_DISCOUNT) * 100) / 100;
}

export function discountSarToPoints(discountSar: number): number {
  if (!Number.isFinite(discountSar) || discountSar <= 0) return 0;
  return Math.ceil(discountSar * POINTS_PER_SAR_DISCOUNT);
}

export interface LoyaltyTierInfo {
  id: 'silver' | 'gold' | 'platinum';
  nameAr: string;
  nextTierNameAr: string | null;
  minPoints: number;
  nextTierPoints: number | null;
  progressPercent: number;
  perkAr: string;
}

export function getLoyaltyTier(lifetimeEarnedPoints: number): LoyaltyTierInfo {
  if (lifetimeEarnedPoints >= 2500) {
    return {
      id: 'platinum',
      nameAr: 'العضوية البلاتينية',
      nextTierNameAr: null,
      minPoints: 2500,
      nextTierPoints: null,
      progressPercent: 100,
      perkAr: 'أولوية التجهيز والشحن + عروض حصرية لأعضاء النخبة',
    };
  }
  if (lifetimeEarnedPoints >= 1000) {
    const progress = Math.min(100, Math.round(((lifetimeEarnedPoints - 1000) / 1500) * 100));
    return {
      id: 'gold',
      nameAr: 'العضوية الذهبية',
      nextTierNameAr: 'العضوية البلاتينية',
      minPoints: 1000,
      nextTierPoints: 2500,
      progressPercent: progress,
      perkAr: 'اكسب نقاطاً مع كل طلب واستبدلها بخصومات فورية بدون حد أقصى',
    };
  }
  const progress = Math.min(100, Math.round((lifetimeEarnedPoints / 1000) * 100));
  return {
    id: 'silver',
    nameAr: 'العضوية الفضية',
    nextTierNameAr: 'العضوية الذهبية',
    minPoints: 0,
    nextTierPoints: 1000,
    progressPercent: progress,
    perkAr: '1 نقطة ولاء مقابل كل 10 ر.س مشتريات',
  };
}
