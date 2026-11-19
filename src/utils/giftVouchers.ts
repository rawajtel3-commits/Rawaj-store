import { GiftVoucher } from '../types';

const STORAGE_KEY = 'rawaj-gift-vouchers';

export function loadGiftVouchers(): GiftVoucher[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GiftVoucher[]) : [];
  } catch {
    return [];
  }
}

export function saveGiftVouchers(vouchers: GiftVoucher[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vouchers));
  } catch {
    // Ignore storage quota errors
  }
}

export function normalizeGiftVoucherCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '-');
}

export function validateGiftVoucherCodeFormat(code: string): boolean {
  const normalized = normalizeGiftVoucherCode(code);
  return /^[A-Z0-9_-]{4,24}$/.test(normalized);
}

export function generateGiftVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * chars.length)];
    part2 += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GIFT-${part1}-${part2}`;
}

export function findRedeemableGiftVoucher(
  vouchers: GiftVoucher[],
  rawCode: string
): { voucher?: GiftVoucher; error?: string } {
  const normalized = normalizeGiftVoucherCode(rawCode);
  if (!normalized) {
    return { error: 'يرجى إدخال كود قسيمة الهدية.' };
  }

  const found = vouchers.find(
    (v) => normalizeGiftVoucherCode(v.code) === normalized
  );
  if (!found) {
    return { error: 'كود قسيمة الهدية غير موجود أو غير صحيح.' };
  }
  if (found.status === 'redeemed' || found.remainingBalanceSar <= 0) {
    return { error: 'تم استنفاد رصيد هذه القسيمة بالكامل مسبقاً.' };
  }

  return { voucher: found };
}

export function buildGiftShareUrl(code: string): string {
  const normalized = normalizeGiftVoucherCode(code);
  if (typeof window === 'undefined') {
    return `https://rawaj-store.example/?gift=${encodeURIComponent(normalized)}`;
  }
  return `${window.location.origin}/?gift=${encodeURIComponent(normalized)}`;
}

export function buildGiftEmailHref(voucher: GiftVoucher, storeName: string): string {
  const to = voucher.recipientEmail?.trim() || '';
  const subject = encodeURIComponent(`🎁 وصلتك قسيمة هدية من ${voucher.senderName} في ${storeName}`);
  const shareUrl = buildGiftShareUrl(voucher.code);
  const body = encodeURIComponent(
    `مرحباً ${voucher.recipientName}،\n\n` +
      `أهديتك قسيمة هدية رقمية بقيمة ${voucher.initialAmountSar} ر.س للتسوق في ${storeName}!\n` +
      (voucher.message ? `\nرسالة خاصة لك: "${voucher.message}"\n` : '') +
      `\nكود القسيمة: ${voucher.code}\n` +
      `رابط الاستخدام المباشر: ${shareUrl}\n\n` +
      `يمكنك إدخال الكود في سلة المشتريات أو عند إتمام الدفع لخصم قيمة القسيمة فوراً.`
  );
  return `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
}
