import React from 'react';
import { 
  Printer, 
  CheckCircle2, 
  QrCode, 
  MapPin, 
  PhoneCall, 
  Mail, 
  Building2, 
  CreditCard, 
  Calendar, 
  Package, 
  ShieldCheck, 
  Award,
  Sparkles,
  Barcode
} from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';

interface InvoiceViewProps {
  order: Order;
  settings: StoreSettings;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  order,
  settings,
  onClose,
  showCloseButton = false,
}) => {
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'card':
        return 'بطاقة مدى / ائتمان (Visa / Mastercard)';
      case 'stc_pay':
        return 'محفظة STC Pay / Apple Pay';
      case 'tamara':
        return 'تقسيط تمارا (4 دفعات)';
      case 'cod':
        return 'الدفع عند الاستلام (COD)';
      default:
        return method;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Action Header for Screen (Hidden on Print) */}
      <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-2xl border border-slate-800 no-print">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">الفاتورة الضريبية الرسمية</h3>
            <span className="text-xs text-slate-400">جاهزة للطباعة والحفظ بصيغة رسمية</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#551465]/30 border border-brand-500/30 transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-brand-200" />
            <span>طباعة الفاتورة الرسمية</span>
          </button>

          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition"
            >
              متابعة التسوق
            </button>
          )}
        </div>
      </div>

      {/* Printable Paper Invoice Container */}
      <div className="printable-invoice-container bg-slate-950 print:bg-white text-slate-100 print:text-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 print:border-slate-300 shadow-2xl relative overflow-hidden font-sans">
        
        {/* Decorative Top Accent Line */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-brand-600 via-brand-400 to-[#551465]" />

        {/* 1. Official Store & Invoice Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b border-slate-800 print:border-slate-300 pb-6">
          {/* Store Logo & Branding */}
          <div className="flex items-start gap-4">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="شعار متجر رواج"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500/40 shadow-md shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#551465] to-brand-900 border-2 border-brand-400/50 flex flex-col items-center justify-center text-white font-black shadow-lg shrink-0">
                <span className="text-lg leading-none tracking-tight">رواج</span>
                <span className="text-[9px] text-brand-200 uppercase tracking-widest mt-0.5">RAWAJ</span>
              </div>
            )}

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white print:text-slate-900 tracking-tight flex items-center gap-2">
                <span>{settings.storeName || 'متجر رواج الإلكتروني'}</span>
                <span className="bg-brand-500/10 text-brand-300 print:bg-slate-100 print:text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-brand-500/30 print:border-slate-300">
                  علامة توثيق معتمدة
                </span>
              </h2>

              <p className="text-xs text-slate-300 print:text-slate-700 font-medium">
                المقر الرئيسي: {settings.location || 'اليمن، حضرموت'}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 print:text-slate-600 pt-1 font-mono">
                <span>السجل التجاري (CR): <strong className="text-slate-200 print:text-slate-900">1010889221</strong></span>
                <span>•</span>
                <span>الرقم الضريبي (VAT): <strong className="text-slate-200 print:text-slate-900">310992837400003</strong></span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 print:text-slate-600 font-mono">
                <span>خدمة العملاء: <strong className="text-emerald-400 print:text-emerald-700">{settings.customerServicePhone || settings.supportPhone || '733513128'}</strong></span>
                <span>•</span>
                <span>الإدارة: <strong className="text-purple-300 print:text-purple-700">{settings.adminPhone || '770600046 / 780080555'}</strong></span>
                <span>•</span>
                <span>البريد: <strong className="text-slate-300 print:text-slate-800">{settings.supportEmail || 'saad@rawajye.com'}</strong></span>
              </div>
            </div>
          </div>

          {/* Invoice Document Title & Order Metadata Box */}
          <div className="bg-slate-900/90 print:bg-slate-50 p-4 rounded-2xl border border-slate-800 print:border-slate-300 text-left sm:text-right shrink-0 min-w-[200px] space-y-1.5">
            <div className="inline-block bg-[#551465]/30 print:bg-slate-200 text-brand-300 print:text-slate-900 text-[11px] font-bold px-3 py-1 rounded-lg border border-[#551465]/50 print:border-slate-400 mb-1">
              فاتورة ضريبية مبسطة (ZATCA Tax Invoice)
            </div>

            <div className="space-y-1 font-mono text-xs">
              <p className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-400 print:text-slate-600">رقم الفاتورة:</span>
                <strong className="text-brand-300 print:text-slate-900 font-bold">{order.orderNumber}</strong>
              </p>
              <p className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-400 print:text-slate-600">تاريخ الإصدار:</span>
                <span className="text-slate-200 print:text-slate-800">{order.date}</span>
              </p>
              <p className="flex justify-between sm:justify-end gap-3">
                <span className="text-slate-400 print:text-slate-600">حالة الدفع:</span>
                <span className={`font-bold ${order.paymentStatus === 'paid' ? 'text-emerald-400 print:text-emerald-700' : 'text-amber-400 print:text-amber-700'}`}>
                  {order.paymentStatus === 'paid' ? 'تم الدفع بنجاح' : 'في انتظار التجميع/الدفع'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 2. Customer & Shipping Info Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div className="bg-slate-900/60 print:bg-slate-50 p-4 rounded-2xl border border-slate-800/80 print:border-slate-300 space-y-1 text-xs">
            <h4 className="font-bold text-slate-300 print:text-slate-700 flex items-center gap-1.5 mb-2 border-b border-slate-800 print:border-slate-200 pb-1.5 text-xs">
              <Building2 className="w-4 h-4 text-brand-300 print:text-slate-800" />
              <span>بيانات العميل (Bill To):</span>
            </h4>
            <p className="text-sm font-extrabold text-white print:text-slate-900">{order.customer.fullName}</p>
            <p className="text-slate-300 print:text-slate-700 font-mono">رقم الجوال: {order.customer.phone}</p>
            <p className="text-slate-400 print:text-slate-600 font-mono">البريد: {order.customer.email}</p>
          </div>

          <div className="bg-slate-900/60 print:bg-slate-50 p-4 rounded-2xl border border-slate-800/80 print:border-slate-300 space-y-1 text-xs">
            <h4 className="font-bold text-slate-300 print:text-slate-700 flex items-center gap-1.5 mb-2 border-b border-slate-800 print:border-slate-200 pb-1.5 text-xs">
              <MapPin className="w-4 h-4 text-brand-300 print:text-slate-800" />
              <span>عنوان التوصيل ووسيلة الدفع:</span>
            </h4>
            <p className="text-slate-200 print:text-slate-900 font-medium">
              {order.customer.city}، {order.customer.district} - {order.customer.street}
            </p>
            <p className="text-slate-400 print:text-slate-700 pt-1">
              وسيلة الدفع: <strong className="text-brand-300 print:text-slate-900 font-bold">{getPaymentMethodLabel(order.paymentMethod)}</strong>
            </p>
            {order.customer.notes && (
              <p className="text-amber-300 print:text-amber-800 text-[11px] pt-1">
                ملاحظة العميل: {order.customer.notes}
              </p>
            )}
          </div>
        </div>

        {/* 3. Products Breakdown Table */}
        <div className="overflow-x-auto my-6 border border-slate-800 print:border-slate-300 rounded-2xl">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 print:bg-slate-100 text-slate-300 print:text-slate-800 border-b border-slate-800 print:border-slate-300 font-bold text-[11px]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">وصف المنتج والخيارات المحددة</th>
                <th className="py-3 px-4 text-center">سعر الوحدة</th>
                <th className="py-3 px-4 text-center">الكمية</th>
                <th className="py-3 px-4 text-left">الإجمالي الفرعي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 print:divide-slate-200 bg-slate-950 print:bg-white text-slate-200 print:text-slate-900">
              {order.items.map((item, idx) => {
                const variantOffset = item.selectedVariant?.priceOffset || 0;
                const warrantyPrice = item.selectedWarranty?.price || 0;
                const giftWrapPrice = item.isGiftWrapped ? 25 : 0;
                const unitPrice = item.product.price + variantOffset + warrantyPrice + giftWrapPrice;
                const itemTotal = unitPrice * item.quantity;

                return (
                  <tr key={idx} className="hover:bg-slate-900/40 print:hover:bg-transparent">
                    <td className="py-3 px-4 font-mono text-slate-500 print:text-slate-600 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 space-y-1">
                      <span className="font-extrabold text-white print:text-slate-900 block text-xs">{item.product.name}</span>
                      
                      {item.selectedVariant && (
                        <span className="text-[11px] text-brand-300 print:text-purple-700 block">
                          • الخيار: <strong>{item.selectedVariant.name}</strong>
                          {item.selectedVariant.priceOffset > 0 && ` (+${formatPrice(item.selectedVariant.priceOffset, settings.activeCurrency, settings.yerExchangeRate)})`}
                        </span>
                      )}

                      {item.selectedWarranty && (
                        <span className="text-[11px] text-emerald-400 print:text-emerald-700 block">
                          • الضمان: <strong>{item.selectedWarranty.title} (+{formatPrice(item.selectedWarranty.price, settings.activeCurrency, settings.yerExchangeRate)})</strong>
                        </span>
                      )}

                      {item.customEngraving && (
                        <span className="text-[11px] text-purple-300 print:text-purple-800 block font-mono">
                          • نقش مخصص: "{item.customEngraving}"
                        </span>
                      )}

                      {item.isGiftWrapped && (
                        <span className="text-[11px] text-rose-300 print:text-rose-700 block">
                          • تغليف هدايا فاخر (+{formatPrice(25, settings.activeCurrency, settings.yerExchangeRate)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-300 print:text-slate-800">
                      {formatPrice(unitPrice, settings.activeCurrency, settings.yerExchangeRate)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-extrabold text-white print:text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-left font-mono font-extrabold text-brand-300 print:text-slate-900 text-xs">
                      {formatPrice(itemTotal, settings.activeCurrency, settings.yerExchangeRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Totals Summary & Financial Calculations */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 my-6 pt-2">
          {/* Notes & Guarantees */}
          <div className="space-y-2 text-xs text-slate-400 print:text-slate-600 max-w-sm">
            <h5 className="font-bold text-slate-200 print:text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-300 print:text-slate-800" />
              <span>شروط وضمان الفاتورة الرسمية:</span>
            </h5>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
              <li>جميع المنتجات أصلية 100% ومغطاة بالضمان المحلي المعتمد.</li>
              <li>الأسعار الموضحة شاملة ضريبة القيمة المضافة المعمول بها ({settings.vatPercentage || 15}%).</li>
              <li>يحق للعميل الاستبدال أو الاسترجاع خلال 14 يوماً وفقاً لسياسة المتجر.</li>
            </ul>
          </div>

          {/* Totals Table */}
          <div className="w-full sm:w-80 bg-slate-900/80 print:bg-slate-50 p-4 rounded-2xl border border-slate-800 print:border-slate-300 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-300 print:text-slate-700">
              <span>المجموع الفرعي:</span>
              <span>{formatPrice(order.subtotal, settings.activeCurrency, settings.yerExchangeRate)}</span>
            </div>

            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-400 print:text-emerald-700 font-bold">
                <span>خصم الكوبون:</span>
                <span>-{formatPrice(order.discount, settings.activeCurrency, settings.yerExchangeRate)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-300 print:text-slate-700">
              <span>ضريبة القيمة المضافة ({settings.vatPercentage || 15}%):</span>
              <span>{formatPrice(order.vat, settings.activeCurrency, settings.yerExchangeRate)}</span>
            </div>

            <div className="flex justify-between text-slate-300 print:text-slate-700">
              <span>رسوم الشحن والتوصيل:</span>
              <span>
                {order.shippingFee === 0 ? (
                  <strong className="text-emerald-400 print:text-emerald-700">شحن مجاني</strong>
                ) : (
                  formatPrice(order.shippingFee, settings.activeCurrency, settings.yerExchangeRate)
                )}
              </span>
            </div>

            <div className="border-t border-slate-800 print:border-slate-300 pt-3 flex justify-between items-center text-sm font-black text-white print:text-slate-900">
              <span className="text-xs font-bold font-sans">الإجمالي الكلي المدفوع:</span>
              <span className="text-base text-brand-300 print:text-slate-900">
                {formatPrice(order.total, settings.activeCurrency, settings.yerExchangeRate)}
              </span>
            </div>
          </div>
        </div>

        {/* 5. ZATCA Tax Verification Seal & Stamp Footer */}
        <div className="border-t border-slate-800 print:border-slate-300 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* ZATCA QR Code Graphic */}
          <div className="flex items-center gap-3 bg-slate-900/90 print:bg-slate-100 p-3 rounded-2xl border border-slate-800 print:border-slate-300">
            <div className="bg-white p-1.5 rounded-xl shrink-0">
              <QrCode className="w-12 h-12 text-slate-950" />
            </div>
            <div className="space-y-0.5 text-right">
              <span className="font-extrabold text-white print:text-slate-900 text-xs block">
                رمز التحقق الضريبي ZATCA QR
              </span>
              <span className="text-[10px] text-slate-400 print:text-slate-600 block leading-tight">
                فاتورة موثقة رقمياً ومسجلة رسمياً لدى هيئة الزكاة والضريبة والجمارك.
              </span>
            </div>
          </div>

          {/* Barcode representation */}
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            <Barcode className="w-32 h-8 text-slate-300 print:text-slate-800" />
            <span className="text-[10px] font-mono font-bold text-slate-400 print:text-slate-600">
              {order.orderNumber}
            </span>
          </div>

          {/* Official Digital Stamp */}
          <div className="flex items-center gap-2 border-2 border-dashed border-brand-500/40 print:border-slate-400 p-2.5 px-4 rounded-2xl bg-brand-500/5 print:bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#551465] to-brand-500 flex items-center justify-center text-white shrink-0 shadow">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="font-extrabold text-white print:text-slate-900 text-[11px] block">
                ختم الاعتماد الرقمي
              </span>
              <span className="text-[9px] text-brand-300 print:text-slate-700 block font-bold">
                متجر رواج الإلكتروني - Rawaj Store
              </span>
            </div>
          </div>
        </div>

        {/* Footer legal text */}
        <div className="text-center pt-6 text-[10px] text-slate-500 print:text-slate-600 font-medium">
          شكراً لثقتكم بمتجر رواج! هذه الفاتورة صادرة من النظام الإلكتروني الرسمي وتعتبر وثيقة إثبات قانونية دون الحاجة لتوقيع يديوي.
        </div>
      </div>
    </div>
  );
};
