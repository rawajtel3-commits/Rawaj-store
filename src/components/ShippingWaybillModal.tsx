import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  MapPin,
  Package,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  Truck,
  Weight,
  X,
} from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { buildShippingWaybillData } from '../utils/waybill';
import { formatPrice } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';

interface ShippingWaybillModalProps {
  order: Order | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ShippingWaybillModal: React.FC<ShippingWaybillModalProps> = ({
  order,
  settings,
  onClose,
}) => {
  const { lang, isRtl } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedTracking, setCopiedTracking] = useState(false);

  const waybill = useMemo(() => {
    if (!order) return null;
    return buildShippingWaybillData(order, settings);
  }, [order, settings]);

  useEffect(() => {
    if (!waybill) return;
    let cancelled = false;
    QRCode.toDataURL(waybill.qrPayload, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [waybill]);

  useEffect(() => {
    if (!order) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [order, onClose]);

  if (!order || !waybill) return null;

  const handleCopyTracking = async () => {
    try {
      await navigator.clipboard.writeText(waybill.trackingUrl);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2200);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={isRtl ? 'بوليصة الشحن ورمز التتبع QR' : 'Shipping Waybill & QR Label'}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-[#551465]/60 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Screen Action Bar */}
        <div className="no-print px-5 py-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#551465]/30 border border-brand-400/40 flex items-center justify-center text-brand-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {isRtl ? 'بوليصة الشحن وملصق QR' : 'Shipping Waybill & QR Label'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {waybill.waybillNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTracking}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              {copiedTracking ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isRtl ? 'تم نسخ الرابط' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-brand-300" />
                  <span>{isRtl ? 'نسخ رابط التتبع' : 'Copy Link'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white border border-brand-400/40 text-xs font-extrabold flex items-center gap-1.5 shadow-lg transition"
            >
              <Printer className="w-4 h-4" />
              <span>{isRtl ? 'طباعة البوليصة' : 'Print Waybill'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={isRtl ? 'إغلاق' : 'Close'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Waybill Label */}
        <div className="printable-invoice-container p-5 sm:p-6 bg-slate-950 print:bg-white text-slate-100 print:text-slate-900 space-y-5">
          {/* Top Waybill Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-dashed border-[#551465]/60 print:border-slate-800 rounded-2xl p-4 bg-slate-900/70 print:bg-white">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#551465] print:bg-slate-900 text-white text-[11px] font-black tracking-wider uppercase">
                  {lang === 'en' ? waybill.courierNameEn : waybill.courierNameAr}
                </span>
                <span className="text-[11px] font-mono text-slate-400 print:text-slate-700">
                  {waybill.dispatchDate}
                </span>
              </div>
              <div className="font-mono text-lg sm:text-xl font-black text-white print:text-slate-900 tracking-wide">
                {waybill.waybillNumber}
              </div>
              <p className="text-xs text-slate-300 print:text-slate-700 font-mono">
                {isRtl ? 'رقم الطلب المرجعي:' : 'Order Ref:'}{' '}
                <strong className="text-brand-300 print:text-slate-900">
                  {waybill.orderNumber}
                </strong>
              </p>

              {/* Barcode Graphic */}
              <div className="pt-2 space-y-1">
                <div
                  className="bg-white px-3 py-1.5 rounded-lg inline-flex items-stretch gap-[2px] h-9 border border-slate-300"
                  aria-hidden="true"
                >
                  {waybill.barcodeBars.map((w, idx) => (
                    <span
                      key={idx}
                      className={idx % 2 === 0 ? 'bg-slate-950' : 'bg-white'}
                      style={{ width: `${w * 1.6}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Scannable QR Code */}
            <div className="flex flex-col items-center justify-center bg-white p-2.5 rounded-2xl border-2 border-slate-200 print:border-slate-800 shrink-0 self-center sm:self-auto">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${waybill.orderNumber}`}
                  className="w-28 h-28 object-contain"
                />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center text-slate-900">
                  <QrCode className="w-16 h-16" />
                </div>
              )}
              <span className="text-[9px] font-mono font-black text-slate-900 mt-1">
                {isRtl ? 'امسح للتتبع الفوري' : 'SCAN TO TRACK'}
              </span>
            </div>
          </div>

          {/* Sender & Recipient Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-brand-300 print:text-slate-800 border-b border-slate-800 print:border-slate-200 pb-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>{isRtl ? 'المُرسِل (من)' : 'SHIPPER (FROM)'}</span>
              </div>
              <p className="font-extrabold text-white print:text-slate-900 text-sm">
                {waybill.shipperName}
              </p>
              <p className="text-slate-300 print:text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{waybill.shipperLocation}</span>
              </p>
              <p className="text-slate-300 print:text-slate-700 font-mono flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span dir="ltr">{waybill.shipperPhone}</span>
              </p>
            </div>

            <div className="bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-400 print:text-slate-800 border-b border-slate-800 print:border-slate-200 pb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{isRtl ? 'المستلم (إلى)' : 'RECIPIENT (TO)'}</span>
              </div>
              <p className="font-extrabold text-white print:text-slate-900 text-sm">
                {waybill.recipientName}
              </p>
              <p className="text-slate-200 print:text-slate-800 font-medium">
                {waybill.recipientAddress}
              </p>
              <p className="text-emerald-300 print:text-slate-900 font-mono font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span dir="ltr">{waybill.recipientPhone}</span>
              </p>
              {waybill.notes && (
                <p className="text-[11px] text-amber-300 print:text-amber-800 bg-amber-950/40 print:bg-amber-50 border border-amber-500/30 rounded-lg px-2 py-1 mt-1">
                  {waybill.notes}
                </p>
              )}
            </div>
          </div>

          {/* Shipment Specs & COD Box */}
          <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
            <div className="bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">
                {isRtl ? 'عدد القطع' : 'Pieces'}
              </span>
              <strong className="text-sm font-black text-white print:text-slate-900 tabular-nums flex items-center justify-center gap-1 mt-0.5">
                <Package className="w-3.5 h-3.5 text-brand-300 print:text-slate-700" />
                {waybill.totalItemsCount}
              </strong>
            </div>

            <div className="bg-slate-900/70 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 print:text-slate-600 block">
                {isRtl ? 'الوزن التقديري' : 'Est. Weight'}
              </span>
              <strong className="text-sm font-black text-white print:text-slate-900 tabular-nums flex items-center justify-center gap-1 mt-0.5">
                <Weight className="w-3.5 h-3.5 text-purple-300 print:text-slate-700" />
                {waybill.estimatedWeightKg} kg
              </strong>
            </div>

            <div
              className={`border rounded-xl p-3 ${
                waybill.isCod
                  ? 'bg-amber-950/40 print:bg-amber-50 border-amber-500/50 print:border-slate-800'
                  : 'bg-emerald-950/40 print:bg-emerald-50 border-emerald-500/50 print:border-slate-800'
              }`}
            >
              <span className="text-[10px] text-slate-300 print:text-slate-700 block">
                {isRtl ? 'التحصيل عند التسليم' : 'Collection'}
              </span>
              <strong className="text-xs sm:text-sm font-black tabular-nums block mt-0.5 text-white print:text-slate-900">
                {waybill.isCod
                  ? `COD: ${formatPrice(
                      waybill.codAmountDueSar,
                      settings.activeCurrency,
                      settings.yerExchangeRate
                    )}`
                  : isRtl
                  ? 'مدفوع مسبقاً ✓'
                  : 'PREPAID ✓'}
              </strong>
            </div>
          </div>

          {/* Warehouse Pick & Pack Manifest */}
          <div className="border border-slate-800 print:border-slate-300 rounded-2xl overflow-hidden text-xs">
            <div className="bg-slate-900 print:bg-slate-100 px-4 py-2 font-extrabold text-slate-200 print:text-slate-900 flex items-center justify-between border-b border-slate-800 print:border-slate-300">
              <span>{isRtl ? 'قائمة محتويات الشحنة (تجهيز المستودع)' : 'Package Contents Manifest'}</span>
              <span className="text-[10px] font-mono text-slate-400 print:text-slate-600">
                {order.items.length} SKU
              </span>
            </div>
            <div className="divide-y divide-slate-800/70 print:divide-slate-200 bg-slate-950 print:bg-white">
              {order.items.map((item, idx) => (
                <div
                  key={`${item.product.id}-${idx}`}
                  className="px-4 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-white print:text-slate-900 block truncate">
                      {lang === 'en' && item.product.nameEn
                        ? item.product.nameEn
                        : item.product.name}
                    </span>
                    {item.selectedVariant && (
                      <span className="text-[10px] text-slate-400 print:text-slate-600 block">
                        {item.selectedVariant.name}
                      </span>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 print:bg-slate-100 border border-slate-700 print:border-slate-300 font-mono font-extrabold text-brand-300 print:text-slate-900 shrink-0 tabular-nums">
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Verification Line */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 print:text-slate-600 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:text-slate-800" />
              {isRtl
                ? 'وثيقة شحن إلكترونية معتمدة من متجر رواج'
                : 'Verified Electronic Waybill - Rawaj Store'}
            </span>
            <span className="font-mono">{waybill.orderNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
