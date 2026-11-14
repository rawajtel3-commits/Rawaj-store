import React, { useState } from 'react';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  FileText,
  ArrowRight,
  PhoneCall,
  AlertCircle,
  PackageCheck,
  ClipboardCheck,
  Check,
  RotateCcw,
  Send,
  X
} from 'lucide-react';
import { Order, ReturnRequest, ReturnResolution, ReturnRequestStatus, StoreSettings } from '../../types';
import { formatPrice } from '../../utils/currency';
import { LazyImage } from '../LazyImage';

interface OrderTrackingPageProps {
  orders: Order[];
  returnRequests: ReturnRequest[];
  onSubmitReturnRequest: (request: ReturnRequest) => void;
  onBackToHome: () => void;
  onOpenSellerChat: () => void;
  settings: StoreSettings;
}

const RETURN_REASONS = [
  'عيب مصنعي أو عطل تقني في المنتج',
  'المنتج غير مطابق للمواصفات المعروضة',
  'تلف أو خدش أثناء الشحن والتوصيل',
  'وصل منتج أو لون مختلف عن الطلب',
  'تغيير الرأي (ضمن سياسة الاسترجاع 14 يوماً)',
];

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({
  orders,
  returnRequests,
  onSubmitReturnRequest,
  onBackToHome,
  onOpenSellerChat,
  settings,
}) => {
  const getStatusStepIndex = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'processing':
        return 1;
      case 'shipped':
        return 2;
      case 'delivered':
        return 3;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(orders[0] || null);
  const [hasSearched, setHasSearched] = useState(false);
  const [invoiceDownloadedNotice, setInvoiceDownloadedNotice] = useState(false);
  const [inspectedStepIdx, setInspectedStepIdx] = useState<number>(() =>
    orders[0] ? Math.max(0, getStatusStepIndex(orders[0].status)) : 0
  );

  // Keep displayed order synced with latest updates (e.g., status changes from AdminDashboard)
  const activeOrder = searchedOrder
    ? orders.find((o) => o.id === searchedOrder.id) || searchedOrder
    : null;

  // Return Request Form State
  const [isReturnFormOpen, setIsReturnFormOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>(RETURN_REASONS[0]);
  const [returnCondition, setReturnCondition] = useState<'unopened' | 'opened_unused' | 'defective'>('opened_unused');
  const [returnResolution, setReturnResolution] = useState<ReturnResolution>('refund');
  const [returnPhone, setReturnPhone] = useState<string>(orders[0]?.customer.phone || '');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [returnFormError, setReturnFormError] = useState<string>('');
  const [submittedReturnNumber, setSubmittedReturnNumber] = useState<string | null>(null);

  const selectOrder = (order: Order | null) => {
    setSearchedOrder(order);
    setInspectedStepIdx(order ? Math.max(0, getStatusStepIndex(order.status)) : 0);
    setIsReturnFormOpen(false);
    setSubmittedReturnNumber(null);
    setReturnFormError('');
    setSelectedItemIndex(0);
    setReturnQty(1);
    setReturnPhone(order?.customer.phone || '');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    const found = orders.find(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.id.toLowerCase().includes(q)
    );
    selectOrder(found || null);
  };

  const handleOpenReturnForProduct = (itemIndex: number) => {
    if (!activeOrder) return;
    setSelectedItemIndex(itemIndex);
    setReturnQty(1);
    setReturnPhone(activeOrder.customer.phone);
    setReturnNotes('');
    setReturnFormError('');
    setSubmittedReturnNumber(null);
    setIsReturnFormOpen(true);
  };

  const getReturnStatusMeta = (status: ReturnRequestStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'بانتظار المراجعة', badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40' };
      case 'reviewing':
        return { label: 'قيد الفحص والتنسيق', badgeClass: 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40' };
      case 'approved':
        return { label: 'تمت الموافقة', badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' };
      case 'completed':
        return { label: 'مكتمل (تم التعويض)', badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' };
      case 'rejected':
        return { label: 'مرفوض من الإدارة', badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-500/40' };
    }
  };

  const getResolutionLabel = (res: ReturnResolution) => {
    switch (res) {
      case 'refund':
        return 'استرداد المبلغ';
      case 'exchange':
        return 'استبدال بمنتج آخر';
      case 'store_credit':
        return 'رصيد في محفظة المتجر';
    }
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const targetItem = activeOrder.items[selectedItemIndex];
    if (!targetItem) {
      setReturnFormError('يرجى اختيار المنتج المراد استرجاعه.');
      return;
    }

    if (!returnPhone.trim() || returnPhone.trim().length < 7) {
      setReturnFormError('يرجى إدخال رقم جوال صحيح للتواصل والتنسيق.');
      return;
    }

    const existingActive = returnRequests.find(
      (r) =>
        r.orderId === activeOrder.id &&
        r.productId === targetItem.product.id &&
        r.status !== 'rejected'
    );
    if (existingActive) {
      setReturnFormError(`يوجد طلب استرجاع مسجل مسبقاً لهذا المنتج برقم (${existingActive.requestNumber}).`);
      return;
    }

    const unitPrice =
      targetItem.product.price +
      (targetItem.selectedVariant?.priceOffset || 0) +
      (targetItem.selectedWarranty?.price || 0);
    const safeQty = Math.min(Math.max(1, returnQty), targetItem.quantity);
    const requestNumber = `RET-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newRequest: ReturnRequest = {
      id: `ret-${Date.now()}`,
      requestNumber,
      orderId: activeOrder.id,
      orderNumber: activeOrder.orderNumber,
      productId: targetItem.product.id,
      productName: targetItem.product.name,
      productImage: targetItem.product.images[0],
      variantName: targetItem.selectedVariant?.name,
      quantity: safeQty,
      refundAmount: unitPrice * safeQty,
      customerName: activeOrder.customer.fullName,
      customerPhone: returnPhone.trim(),
      reason: returnReason,
      resolution: returnResolution,
      condition: returnCondition,
      notes: returnNotes.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toLocaleString('ar-SA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    onSubmitReturnRequest(newRequest);
    setSubmittedReturnNumber(requestNumber);
    setReturnNotes('');
    setReturnFormError('');
    setIsReturnFormOpen(false);
  };

  const steps = [
    {
      key: 'pending' as const,
      title: 'تم الطلب',
      shortDesc: 'تأكيد الطلب والدفع',
      desc: 'تم استلام طلبك بنجاح وتأكيد بيانات الفاتورة الضريبية وجدولته للتجهيز.',
      checklist: ['تسجيل رقم الطلب المرجعي', 'التحقق من حالة الدفع', 'إحالة الطلب للمستودع'],
      icon: ClipboardCheck,
    },
    {
      key: 'processing' as const,
      title: 'قيد التجهيز',
      shortDesc: 'التغليف وفحص الجودة',
      desc: 'يقوم فريق المستودع الآن بمطابقة الأصناف، فحص الجودة، والتغليف الوقائي الآمن.',
      checklist: ['مطابقة الموديل والملحقات', 'تطبيق خيارات التخصيص والتغليف', 'إصدار بوليصة الشحن'],
      icon: Package,
    },
    {
      key: 'shipped' as const,
      title: 'جاري الشحن',
      shortDesc: 'في الطريق إليك',
      desc: 'تم تسليم الشحنة لشركة التوصيل وهي في طريقها إلى عنوانك المسجل.',
      checklist: ['مغادرة مركز الفرز والتوزيع', 'تخصيص مندوب التوصيل الميداني', 'التواصل قبل الوصول للمستلم'],
      icon: Truck,
    },
    {
      key: 'delivered' as const,
      title: 'تم التوصيل',
      shortDesc: 'تم الاستلام بنجاح',
      desc: 'تم تسليم الشحنة بنجاح للعميل وتفعيل الضمان المعتمد وفترة الاسترجاع.',
      checklist: ['تأكيد استلام العميل للشحنة', 'تفعيل ضمان الوكيل (سنتان)', 'إتاحة خدمة الاسترجاع خلال 14 يوماً'],
      icon: PackageCheck,
    },
  ];

  const currentStepIdx = activeOrder ? getStatusStepIndex(activeOrder.status) : 0;
  const progressPercentage =
    currentStepIdx < 0 ? 0 : Math.round(((currentStepIdx + 1) / steps.length) * 100);
  const trackFillPercent =
    currentStepIdx <= 0 ? 0 : (currentStepIdx / (steps.length - 1)) * 100;

  const inspectedStep = steps[inspectedStepIdx] || steps[Math.max(0, currentStepIdx)];

  const orderReturns = activeOrder
    ? returnRequests.filter((r) => r.orderId === activeOrder.id)
    : [];

  const activeReturnItem = activeOrder?.items[selectedItemIndex];
  const estimatedRefundAmount = activeReturnItem
    ? (activeReturnItem.product.price +
        (activeReturnItem.selectedVariant?.priceOffset || 0) +
        (activeReturnItem.selectedWarranty?.price || 0)) *
      Math.min(Math.max(1, returnQty), activeReturnItem.quantity)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-brand-300 hover:text-white inline-flex items-center gap-2 font-bold transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-brand-300 shrink-0" />
            <span>تتبع الطلبات وطلبات الاسترجاع</span>
          </h1>
          <p className="text-xs text-slate-400">
            أدخل رقم الطلب أو رقم الجوال لاستعراض حالة التوصيل، الفاتورة الضريبية، أو تقديم طلب استرجاع منتج معين مباشرة للإدارة.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSellerChat}
          className="w-full sm:w-auto justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow shrink-0"
        >
          <PhoneCall className="w-4 h-4 text-purple-400" />
          <span>تواصل مع مندوب التوصيل / الدعم</span>
        </button>
      </div>

      {/* Search Input Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-6 rounded-3xl shadow-xl max-w-2xl mx-auto space-y-4">
        <h3 className="text-sm font-bold text-white text-center">ابحث عن حالة طلبك الآن</h3>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="أدخل رقم الطلب (مثال: ORD-2026-8891) أو رقم جوال العميل..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-10 pl-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465] focus:ring-2 focus:ring-[#551465]/30 font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-[#551465] hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-lg shadow-[#551465]/30 transition shrink-0 border border-brand-500/30"
          >
            تتبع الطلب
          </button>
        </form>

        {/* Quick Demo Badges */}
        {orders.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
            <span>الطلبات الأخيرة المسجلة للتجربة:</span>
            {orders.slice(0, 3).map((ord) => (
              <button
                key={ord.id}
                type="button"
                onClick={() => {
                  setSearchQuery(ord.orderNumber);
                  selectOrder(ord);
                  setHasSearched(true);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-brand-300 px-2.5 py-1 rounded-lg border border-slate-700 font-mono font-bold transition"
              >
                {ord.orderNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Result */}
      {activeOrder ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl space-y-6 sm:space-y-8">
          {/* Order Header Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-lg sm:text-xl font-mono font-extrabold text-white">{activeOrder.orderNumber}</span>
                <span className="bg-[#551465]/20 text-brand-300 border border-[#551465]/40 text-xs px-3 py-1 rounded-full font-bold">
                  {activeOrder.status === 'delivered'
                    ? 'تم التوصيل'
                    : activeOrder.status === 'shipped'
                    ? 'جاري الشحن'
                    : activeOrder.status === 'processing'
                    ? 'قيد التجهيز'
                    : activeOrder.status === 'cancelled'
                    ? 'طلب ملغي'
                    : 'تم الطلب'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تاريخ الطلب: <strong className="text-slate-200">{activeOrder.date}</strong> | وسيلة الدفع:{' '}
                <strong className="text-slate-200 uppercase">{activeOrder.paymentMethod}</strong>
              </p>
            </div>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {activeOrder.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => handleOpenReturnForProduct(0)}
                  className="min-h-[42px] px-4 py-2.5 rounded-2xl bg-amber-950/60 hover:bg-amber-950 text-amber-300 border border-amber-500/40 text-xs font-extrabold flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>طلب استرجاع منتج من الطلب</span>
                </button>
              )}

              <div className="text-right bg-slate-950 p-3 px-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">إجمالي المبلغ المدفوع:</span>
                <span className="text-lg font-bold text-brand-300 tabular-nums">
                  {formatPrice(activeOrder.total, settings.activeCurrency, settings.yerExchangeRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Return Request Submission Confirmation Banner */}
          {submittedReturnNumber && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-white">
                    تم إرسال طلب الاسترجاع رقم <span className="font-mono text-emerald-300">{submittedReturnNumber}</span> بنجاح!
                  </p>
                  <p className="text-emerald-200">
                    تم تحويل الطلب مباشرة إلى قسم الاسترجاعات في لوحة تحكم الإدارة، وسيتم مراجعته والرد عليك قريباً.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmittedReturnNumber(null)}
                className="p-1.5 rounded-lg bg-slate-900/60 text-slate-300 hover:text-white self-end sm:self-center"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Interactive Shipment Progress Bar */}
          {activeOrder.status !== 'cancelled' ? (
            <div className="bg-slate-950/75 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-6">
              {/* Top Progress Bar Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-300 shrink-0" />
                    <span>مراحل الشحن والتوصيل</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    اضغط على أي مرحلة في شريط التقدم لاستعراض تفاصيلها وحالتها الحالية.
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">نسبة الإنجاز</span>
                    <strong className="text-sm font-extrabold text-brand-300 font-mono tabular-nums">
                      {progressPercentage}%
                    </strong>
                  </div>
                  <div className="h-7 w-px bg-slate-800" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">المرحلة الحالية</span>
                    <strong className="text-xs font-extrabold text-white">
                      {steps[currentStepIdx]?.title} ({currentStepIdx + 1} من {steps.length})
                    </strong>
                  </div>
                </div>
              </div>

              {/* Overall Continuous Progress Bar Track + Interactive Stage Nodes */}
              <div className="relative pt-2 pb-1">
                {/* Connected Rail Behind Nodes (centered from 1st to 4th column centers) */}
                <div className="relative mx-[12.5%]">
                  <div
                    role="progressbar"
                    aria-label="تقدم مراحل الشحن"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercentage}
                    className="relative h-2.5 w-full bg-slate-800 rounded-full overflow-hidden"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 rounded-full bg-gradient-to-l from-[#551465] via-[#af3fd2] to-emerald-500 transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(4, trackFillPercent)}%` }}
                    />
                  </div>
                </div>

                {/* 4 Clickable Stage Nodes Aligned Across the Bar */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3 -mt-6 relative z-10">
                  {steps.map((stepItem, idx) => {
                    const IconComponent = stepItem.icon;
                    const isCompleted = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    const isInspected = idx === inspectedStepIdx;

                    return (
                      <button
                        key={stepItem.key}
                        type="button"
                        onClick={() => setInspectedStepIdx(idx)}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-pressed={isInspected}
                        className="group flex flex-col items-center text-center focus:outline-none"
                      >
                        <span
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 shadow-lg ${
                            isCurrent
                              ? 'bg-[#551465] border-brand-300 text-white scale-105 ring-4 ring-[#551465]/30'
                              : isCompleted
                              ? 'bg-emerald-600 border-emerald-400 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-400 group-hover:border-slate-500 group-hover:text-slate-200'
                          } ${isInspected && !isCurrent ? 'ring-2 ring-brand-400/60' : ''}`}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5 stroke-[2.75]" />
                          ) : (
                            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </span>

                        <span
                          className={`mt-2.5 text-[11px] sm:text-xs font-extrabold transition-colors leading-tight ${
                            isCurrent || isInspected
                              ? 'text-white'
                              : isCompleted
                              ? 'text-emerald-300'
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          {stepItem.title}
                        </span>

                        <span className="hidden sm:block text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {stepItem.shortDesc}
                        </span>

                        <span
                          className={`mt-1 text-[10px] font-bold ${
                            isCurrent
                              ? 'text-brand-300'
                              : isCompleted
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {isCurrent ? 'نشط الآن' : isCompleted ? 'مكتمل' : 'قادم'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Inspected Stage Details Panel */}
              <div
                className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                  inspectedStepIdx === currentStepIdx
                    ? 'bg-[#551465]/15 border-[#551465]/60'
                    : inspectedStepIdx < currentStepIdx
                    ? 'bg-emerald-950/25 border-emerald-500/35'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-white">
                        المرحلة {inspectedStepIdx + 1}: {inspectedStep.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          inspectedStepIdx === currentStepIdx
                            ? 'bg-[#551465] text-white border-brand-400/50'
                            : inspectedStepIdx < currentStepIdx
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {inspectedStepIdx === currentStepIdx
                          ? 'المرحلة الحالية للطلب'
                          : inspectedStepIdx < currentStepIdx
                          ? 'تم إتمام هذه المرحلة ✓'
                          : 'مرحلة مجدولة قادمة'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{inspectedStep.desc}</p>
                  </div>

                  {inspectedStep.key === 'shipped' && (
                    <button
                      type="button"
                      onClick={onOpenSellerChat}
                      className="shrink-0 bg-slate-900 hover:bg-slate-800 text-brand-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>استفسر عن موقع المندوب</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3.5 pt-3.5 border-t border-slate-800/80">
                  {inspectedStep.checklist.map((item, cIdx) => {
                    const done =
                      inspectedStepIdx < currentStepIdx ||
                      (inspectedStepIdx === currentStepIdx && cIdx <= 1);
                    return (
                      <div
                        key={cIdx}
                        className="flex items-center gap-2 text-[11px] bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2"
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            done ? 'text-emerald-400' : 'text-slate-600'
                          }`}
                        />
                        <span className={done ? 'text-slate-200 font-medium' : 'text-slate-400'}>
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-rose-950/30 border border-rose-500/40 p-4 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>هذا الطلب ملغي. إذا كنت قد قمت بالدفع المسبق، سيتم استرداد المبلغ خلال 3-5 أيام عمل.</span>
            </div>
          )}

          {/* Details & Items */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
            {/* Products List */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                <span>المنتجات المشمولة في هذا الطلب ({activeOrder.items.length}):</span>
              </h4>

              <div className="space-y-2.5">
                {activeOrder.items.map((item, index) => {
                  const existingReturn = returnRequests.find(
                    (r) => r.orderId === activeOrder.id && r.productId === item.product.id
                  );
                  const statusMeta = existingReturn ? getReturnStatusMeta(existingReturn.status) : null;

                  return (
                    <div
                      key={index}
                      className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <LazyImage
                          src={item.product.images[0]}
                          alt={item.product.name}
                          sizeHint="thumb"
                          wrapperClassName="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shrink-0"
                          className="w-full h-full object-cover"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate">{item.product.name}</h5>
                          {item.selectedVariant && (
                            <span className="text-[10px] text-brand-300 block">• {item.selectedVariant.name}</span>
                          )}
                          {item.customEngraving && (
                            <span className="text-[10px] text-purple-300 block">• نقش: "{item.customEngraving}"</span>
                          )}
                          <span className="text-[11px] text-slate-400 block tabular-nums">
                            الكمية: {item.quantity} × {formatPrice(item.product.price, settings.activeCurrency, settings.yerExchangeRate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
                        <span className="text-xs font-bold text-white tabular-nums">
                          {formatPrice(item.product.price * item.quantity, settings.activeCurrency, settings.yerExchangeRate)}
                        </span>

                        {activeOrder.status !== 'cancelled' && (
                          existingReturn && existingReturn.status !== 'rejected' && statusMeta ? (
                            <span className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 ${statusMeta.badgeClass}`}>
                              <RotateCcw className="w-3 h-3" />
                              <span>{statusMeta.label}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenReturnForProduct(index)}
                              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#551465] text-brand-300 hover:text-white border border-slate-700 hover:border-[#551465] text-[11px] font-bold inline-flex items-center gap-1.5 transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>طلب استرجاع</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Product Return Request Form */}
              {isReturnFormOpen && activeOrder.status !== 'cancelled' && (
                <form
                  onSubmit={handleReturnSubmit}
                  className="mt-4 bg-slate-950 border-2 border-[#551465]/60 rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl animate-fade-in"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[#551465]/20 border border-[#551465]/40 flex items-center justify-center text-brand-300 shrink-0">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-white">نموذج طلب استرجاع منتج</h4>
                        <p className="text-[11px] text-slate-400">
                          يرسل الطلب مباشرة إلى فريق الإدارة في تبويب الاسترجاعات
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReturnFormOpen(false)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                      aria-label="إغلاق نموذج الاسترجاع"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {returnFormError && (
                    <div className="bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{returnFormError}</span>
                    </div>
                  )}

                  {/* Select Product */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      1. اختر المنتج المراد استرجاعه *
                    </label>
                    <select
                      value={selectedItemIndex}
                      onChange={(e) => {
                        setSelectedItemIndex(Number(e.target.value));
                        setReturnQty(1);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white font-bold focus:outline-none focus:border-[#551465]"
                    >
                      {activeOrder.items.map((item, idx) => (
                        <option key={idx} value={idx}>
                          {item.product.name} {item.selectedVariant ? `(${item.selectedVariant.name})` : ''} — الكمية: {item.quantity}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Reason */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-200">
                        2. سبب الاسترجاع *
                      </label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#551465]"
                      >
                        {RETURN_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity & Condition */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-200">الكمية</label>
                        <input
                          type="number"
                          min={1}
                          max={activeReturnItem?.quantity || 1}
                          value={returnQty}
                          onChange={(e) => setReturnQty(Number(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white font-bold tabular-nums focus:outline-none focus:border-[#551465]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-200">حالة المنتج</label>
                        <select
                          value={returnCondition}
                          onChange={(e) =>
                            setReturnCondition(e.target.value as 'unopened' | 'opened_unused' | 'defective')
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#551465]"
                        >
                          <option value="unopened">مغلف بحالة المصنع</option>
                          <option value="opened_unused">مفتوح غير مستخدم</option>
                          <option value="defective">به عطل أو تلف</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Preferred Resolution */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-200">
                        3. طريقة التعويض المفضلة *
                      </label>
                      <select
                        value={returnResolution}
                        onChange={(e) => setReturnResolution(e.target.value as ReturnResolution)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#551465]"
                      >
                        <option value="refund">استرداد المبلغ لنفس وسيلة الدفع</option>
                        <option value="exchange">استبدال فوري بمنتج جديد</option>
                        <option value="store_credit">رصيد فوري في محفظة المتجر</option>
                      </select>
                    </div>

                    {/* Contact Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-200">
                        رقم الجوال للتواصل واستلام الشحنة *
                      </label>
                      <input
                        type="tel"
                        value={returnPhone}
                        onChange={(e) => setReturnPhone(e.target.value)}
                        placeholder="733513128"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-[#551465]"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      تفاصيل إضافية أو وصف المشكلة (اختياري)
                    </label>
                    <textarea
                      rows={3}
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="اكتب أي تفاصيل توضح سبب الاسترجاع أو الموعد المناسب لاستلام المندوب..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                    />
                  </div>

                  {/* Refund Summary & Submit */}
                  <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs">
                      <span className="text-slate-400">قيمة الاسترجاع التقديرية: </span>
                      <strong className="text-brand-300 font-extrabold tabular-nums">
                        {formatPrice(estimatedRefundAmount, settings.activeCurrency, settings.yerExchangeRate)}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsReturnFormOpen(false)}
                        className="flex-1 sm:flex-initial px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="flex-1 sm:flex-initial bg-[#551465] hover:bg-brand-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs shadow-lg shadow-[#551465]/30 flex items-center justify-center gap-2 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال طلب الاسترجاع للإدارة</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Existing Return Requests for This Order */}
              {orderReturns.length > 0 && (
                <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>طلبات الاسترجاع المسجلة لهذا الطلب ({orderReturns.length}):</span>
                  </h4>
                  <div className="space-y-2">
                    {orderReturns.map((ret) => {
                      const statusMeta = getReturnStatusMeta(ret.status);
                      return (
                        <div
                          key={ret.id}
                          className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-brand-300">{ret.requestNumber}</span>
                              <span className="text-slate-500">•</span>
                              <span className="font-bold text-white">{ret.productName}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span>السبب: <strong className="text-slate-200">{ret.reason}</strong></span>
                            <span>التعويض: <strong className="text-slate-200">{getResolutionLabel(ret.resolution)}</strong></span>
                            <span className="tabular-nums">المبلغ: <strong className="text-brand-300">{formatPrice(ret.refundAmount, settings.activeCurrency, settings.yerExchangeRate)}</strong></span>
                          </div>
                          {ret.adminNote && (
                            <p className="text-[11px] bg-slate-900 border border-slate-800 rounded-xl p-2 text-emerald-300">
                              رد الإدارة: {ret.adminNote}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Delivery & Tax Summary Sidebar */}
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <MapPin className="w-4 h-4 text-brand-300" />
                  <span>عنوان المستلم والتوصيل:</span>
                </h4>
                <div className="space-y-1 text-slate-300">
                  <p className="font-bold text-white">{activeOrder.customer.fullName}</p>
                  <p>{activeOrder.customer.phone}</p>
                  <p>{activeOrder.customer.email}</p>
                  <p className="text-slate-400">
                    {activeOrder.customer.city} - {activeOrder.customer.district} - {activeOrder.customer.street}
                  </p>
                  {activeOrder.customer.notes && (
                    <p className="text-amber-400 text-[10px] bg-amber-950/40 p-1.5 rounded border border-amber-500/20">
                      ملاحظة للمندوب: {activeOrder.customer.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* VAT Invoice Badge */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-8 h-8 text-brand-300 shrink-0" />
                    <div>
                      <span className="font-bold text-white block">الفاتورة الضريبية الإلكترونية</span>
                      <span className="text-[10px] text-slate-400">شامل ضريبة القيمة المضافة {settings?.vatPercentage || 15}%</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceDownloadedNotice(true);
                      setTimeout(() => setInvoiceDownloadedNotice(false), 3500);
                      window.print();
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-brand-300 font-bold px-3 py-2 rounded-xl border border-slate-700 text-[11px] flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>طباعة</span>
                  </button>
                </div>
                {invoiceDownloadedNotice && (
                  <p className="text-[11px] text-emerald-400 font-bold">
                    تم تجهيز نسخة الفاتورة الضريبية للطلب {activeOrder.orderNumber}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        hasSearched && (
          <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">عفواً، لم نجد طلباً بهذا الرقم</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              تأكد من إدخال رقم الطلب بشكل صحيح (مثل ORD-2026-8891) أو تواصل مع الدعم الفني لمساعدتك فوراً.
            </p>
          </div>
        )
      )}
    </div>
  );
};
