export type CurrencyCode = 'SAR' | 'YER' | 'USD';

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  nameAr: string;
  flag: string;
  symbolAr: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'SAR', symbol: 'ر.س', symbolAr: 'ريال سعودي', nameAr: 'الريال السعودي (ر.س)', flag: '🇸🇦' },
  { code: 'YER', symbol: 'ر.ي', symbolAr: 'ريال يمني', nameAr: 'الريال اليمني (ر.ي)', flag: '🇾🇪' },
  { code: 'USD', symbol: '$', symbolAr: 'دولار أمريكي', nameAr: 'الدولار الأمريكي ($)', flag: '🇺🇸' },
];

export function formatPrice(
  priceInSAR: number,
  currencyCode: CurrencyCode = 'SAR',
  yerRate: number = 670
): string {
  if (!priceInSAR && priceInSAR !== 0) return `0 ${currencyCode === 'YER' ? 'ر.ي' : currencyCode === 'USD' ? '$' : 'ر.س'}`;
  
  if (currencyCode === 'YER') {
    const yerAmount = Math.round(priceInSAR * (yerRate || 670));
    return `${yerAmount.toLocaleString('ar-YE')} ر.ي`;
  }
  if (currencyCode === 'USD') {
    const usdAmount = (priceInSAR * 0.2667).toFixed(2);
    return `$${Number(usdAmount).toLocaleString('en-US')}`;
  }
  return `${Math.round(priceInSAR).toLocaleString('ar-SA')} ر.س`;
}

export function getCurrencySymbol(code: CurrencyCode = 'SAR'): string {
  switch (code) {
    case 'YER':
      return 'ر.ي';
    case 'USD':
      return '$';
    default:
      return 'ر.س';
  }
}
