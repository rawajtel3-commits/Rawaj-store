import { Order, StoreSettings } from '../types';

export interface ShippingWaybillData {
  waybillNumber: string;
  orderNumber: string;
  courierNameAr: string;
  courierNameEn: string;
  trackingUrl: string;
  qrPayload: string;
  shipperName: string;
  shipperLocation: string;
  shipperPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientAddress: string;
  notes?: string;
  totalItemsCount: number;
  estimatedWeightKg: number;
  isCod: boolean;
  codAmountDueSar: number;
  dispatchDate: string;
  barcodeBars: number[];
}

export function generateDeterministicBarcodeBars(code: string): number[] {
  const safe = code.trim() || 'AWB-RAWAJ-0001';
  const bars: number[] = [];
  for (let i = 0; i < safe.length; i++) {
    const ch = safe.charCodeAt(i);
    bars.push((ch % 3) + 1);
    bars.push(((ch >> 2) % 2) + 1);
    bars.push(((ch >> 4) % 3) + 1);
  }
  return bars;
}

export function buildShippingWaybillData(
  order: Order,
  settings: StoreSettings,
  origin?: string
): ShippingWaybillData {
  const sanitizedOrder = order.orderNumber.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
  const waybillNumber = `AWB-${sanitizedOrder || 'RWJ2026'}`;

  const resolvedOrigin =
    origin ??
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://rawaj.store');

  const trackingUrl = `${resolvedOrigin}/?view=track-order&order=${encodeURIComponent(
    order.orderNumber
  )}`;

  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedWeightKg = Number(
    order.items
      .reduce(
        (sum, item) =>
          sum + (item.product.dimensions?.weightKg ?? 0.55) * item.quantity,
        0
      )
      .toFixed(2)
  );

  const isCod = order.paymentMethod === 'cod' && order.paymentStatus !== 'paid';
  const codAmountDueSar = isCod ? order.total : 0;

  return {
    waybillNumber,
    orderNumber: order.orderNumber,
    courierNameAr: 'رواج إكسبرس للشحن السريع',
    courierNameEn: 'Rawaj Express Logistics',
    trackingUrl,
    qrPayload: trackingUrl,
    shipperName: settings.storeName.split('|')[0].trim() || 'متجر رواج',
    shipperLocation: settings.location || 'الجمهورية اليمنية، حضرموت',
    shipperPhone: settings.customerServicePhone || settings.supportPhone || '733513128',
    recipientName: order.customer.fullName,
    recipientPhone: order.customer.phone,
    recipientCity: order.customer.city,
    recipientAddress: [order.customer.city, order.customer.district, order.customer.street]
      .filter(Boolean)
      .join(' - '),
    notes: order.customer.notes,
    totalItemsCount,
    estimatedWeightKg,
    isCod,
    codAmountDueSar,
    dispatchDate: order.date,
    barcodeBars: generateDeterministicBarcodeBars(waybillNumber),
  };
}
