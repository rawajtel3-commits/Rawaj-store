import React, { useState } from 'react';
import { 
  Megaphone, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Eye, 
  MousePointerClick, 
  Award, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Send, 
  Building2, 
  HelpCircle, 
  Zap, 
  Layers, 
  ArrowLeft,
  BadgePercent,
  Star,
  ShieldCheck,
  Smartphone,
  Check,
  ArrowRight
} from 'lucide-react';
import { StoreSettings, Product } from '../../types';
import { LazyImage } from '../LazyImage';

interface AdsPageProps {
  settings: StoreSettings;
  products: Product[];
  onNavigate: (view: any) => void;
  onBackToHome?: () => void;
  onQuickView: (product: Product) => void;
}

export const AdsPage: React.FC<AdsPageProps> = ({
  settings,
  products,
  onNavigate,
  onBackToHome,
  onQuickView,
}) => {
  // Form state
  const [selectedPackage, setSelectedPackage] = useState<string>('banner');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [advertiserName, setAdvertiserName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [productUrl, setProductUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  // Advertising packages data
  const packages = [
    {
      id: 'banner',
      title: 'بانر رئيسي بالصفحة الأولى (Hero Banner)',
      badge: 'الأعلى مشاهدة',
      pricePerDay: 350,
      estimatedViews: '150,000+',
      estimatedClicks: '12,500+',
      color: 'from-[#551465] to-purple-800',
      borderColor: 'border-[#551465]',
      features: [
        'ظهور البانر في أعلى الصفحة الرئيسية للمتجر',
        'تصميم محترف مجاني أو رفع تصاميمك الخاصة',
        'رابط مباشر لصفحة منتجك أو قسمك المحدد',
        'تقرير حصري يومي بنسب النقر والظهور (CTR)'
      ]
    },
    {
      id: 'featured',
      title: 'إعلان منتج مميز (Featured Spotlight)',
      badge: 'أعلى مبيعات',
      pricePerDay: 220,
      estimatedViews: '95,000+',
      estimatedClicks: '8,200+',
      color: 'from-amber-600 to-amber-800',
      borderColor: 'border-amber-500',
      features: [
        'تثبيت المنتج في أعلى قائمة المنتجات بجميع الأقسام',
        'شارة "برعاية / Sponsored" ذهبية فاخرة',
        'إبراز المنتج في قسم الأكثر مبيعاً وعروض اليوم',
        'زيادة نسبة إضافة المنتج للسلة بنسبة 45%'
      ]
    },
    {
      id: 'ai-recommend',
      title: 'ترشيح ذكي (Gemini AI Priority)',
      badge: 'تقنية حصرية',
      pricePerDay: 180,
      estimatedViews: '70,000+',
      estimatedClicks: '6,800+',
      color: 'from-indigo-600 to-purple-700',
      borderColor: 'border-indigo-500',
      features: [
        'ترشيح منتجك في إجابات المساعد الذكي لجميع الزوار',
        'إدراج المنتج عند الاستفسار عن التصنيفات ذات الصلة',
        'عرض بطاقة تفاعلية سريعة للشراء داخل محادثة AI',
        'معدل استجابة وتحويل عالي الجودة'
      ]
    },
    {
      id: 'push-sms',
      title: 'حملة إشعارات التطبيق والرسائل النصية',
      badge: 'وصول مباشر',
      pricePerDay: 400,
      estimatedViews: '250,000+',
      estimatedClicks: '22,000+',
      color: 'from-emerald-600 to-teal-800',
      borderColor: 'border-emerald-500',
      features: [
        'إرسال إشعار مستهدف لأكثر من 100,000 مشتري نشط',
        'رسالة SMS ترويجية مخصصة للعملاء المستهدفين',
        'ربط برابط الخصم أو صفحة المنتج المباشرة',
        'تحويل فوري وزيادة قياسية في زيارات اليوم الأول'
      ]
    }
  ];

  const currentPkg = packages.find(p => p.id === selectedPackage) || packages[0];
  const totalPrice = currentPkg.pricePerDay * durationDays;
  const discountAmount = durationDays >= 30 ? totalPrice * 0.2 : durationDays >= 14 ? totalPrice * 0.1 : 0;
  const finalPrice = totalPrice - discountAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const randomRef = 'RAW-AD-' + Math.floor(100000 + Math.random() * 900000);
      setBookingRef(randomRef);
    }, 1200);
  };

  return (
    <div className="space-y-8 sm:space-y-10 animate-fade-in" dir="rtl">
      {/* Top Back Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => (onBackToHome ? onBackToHome() : onNavigate('home'))}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-brand-300 hover:text-white inline-flex items-center gap-2 font-bold transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>
        <span className="text-xs text-slate-400 hidden sm:inline">بوابة المعلنين والرعايات التجارية</span>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#551465]/40 to-slate-900 rounded-3xl p-5 sm:p-8 lg:p-12 border border-slate-800 shadow-2xl">
        <div className="absolute -left-10 -top-10 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4 text-center sm:text-right">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#551465]/30 text-brand-300 border border-brand-500/40 text-xs font-bold">
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>منصة الإعلانات المدفوعة والرعايات لمتجر رواج</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            سوّق لمنتجاتك وعلامتك التجارية أمام ملايين المتسوقين
          </h1>

          <p className="text-slate-300 text-xs sm:text-base leading-relaxed">
            احصل على مساحات إعلانية ممتازة وترشيحات ذكية حصرية في متجر رواج، وضاعف مبيعاتك مع أعلى معدلات تحويل في المملكة.
          </p>

          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center sm:justify-start gap-3 sm:gap-4">
            <a
              href="#booking-form"
              className="bg-[#551465] hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-2xl text-xs sm:text-sm transition shadow-lg shadow-[#551465]/30 flex items-center justify-center gap-2 border border-brand-500/30"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>حجز حملة إعلانية الآن</span>
            </a>

            <a
              href="#calculator"
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold px-5 py-3 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>حاسبة التكلفة والوصول</span>
            </a>
          </div>
        </div>
      </div>

      {/* Key Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-brand-300 flex items-center justify-center mx-auto mb-2 border border-purple-500/20">
            <Eye className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-3xl font-extrabold text-white tabular-nums">500,000+</span>
          <span className="text-[11px] sm:text-xs text-slate-400 block font-medium">مشاهدة شهرية نشطة</span>
        </div>

        <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-3xl font-extrabold text-white tabular-nums">8.5x</span>
          <span className="text-[11px] sm:text-xs text-slate-400 block font-medium">متوسط عائد الاستثمار (ROAS)</span>
        </div>

        <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-500/20">
            <MousePointerClick className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-3xl font-extrabold text-white tabular-nums">12.4%</span>
          <span className="text-[11px] sm:text-xs text-slate-400 block font-medium">معدل النقرات الإعلانية (CTR)</span>
        </div>

        <div className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-3xl font-extrabold text-white tabular-nums">100%</span>
          <span className="text-[11px] sm:text-xs text-slate-400 block font-medium">تكامل كامل مع الذكاء الاصطناعي</span>
        </div>
      </div>

      {/* Advertising Packages List */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-brand-300 bg-[#551465]/20 px-3 py-1 rounded-full border border-[#551465]/40">
            باقات ومساحات الإعلانات
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-white">اختر المساحة الإعلانية الأنسب لأهدافك</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            نوفر خيارات متنوعة تناسب مختلف المنتجات والعلامات التجارية من البانرات الرئيسية وحتى الترشيحات الذكية.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {packages.map((pkg) => (
              <div 
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`bg-slate-900 rounded-3xl p-6 border transition-all duration-300 cursor-pointer flex flex-col justify-between relative group ${
                  selectedPackage === pkg.id 
                    ? `${pkg.borderColor} shadow-xl shadow-[#551465]/20 ring-2 ring-brand-500/40 bg-slate-900/90` 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {pkg.badge}
                    </span>
                    {selectedPackage === pkg.id && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition">
                    {pkg.title}
                  </h3>

                  <div className="py-2 border-y border-slate-800 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white">{pkg.pricePerDay}</span>
                    <span className="text-xs text-brand-300 font-bold">ر.س / يومياً</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>الوصول المتوقع:</span>
                      <strong className="text-slate-200">{pkg.estimatedViews}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>النقرات المتوقعة:</span>
                      <strong className="text-emerald-400">{pkg.estimatedClicks}</strong>
                    </div>
                  </div>

                  <ul className="space-y-2 pt-2 text-xs text-slate-300">
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug text-slate-300">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => {
                      setSelectedPackage(pkg.id);
                      const el = document.getElementById('booking-form');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      selectedPackage === pkg.id
                        ? 'bg-[#551465] text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <span>اختيار الباقة</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Ad Cost & Reach Calculator */}
        <div id="calculator" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">حاسبة تكلفة الإعلانات والوصول المتوقع</h3>
              <p className="text-xs text-slate-400">احسب الميزانية والوصول التقديري لحملتك الإعلانية بسهولة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Input Controls */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">اختر الباقة الإعلانية:</label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-bold focus:outline-none focus:border-[#551465]"
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.pricePerDay} ر.س / يوم)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-slate-300 mb-2">
                  <span className="font-bold">مدة الحملة الإعلانية:</span>
                  <span className="text-amber-400 font-extrabold text-sm">{durationDays} أيام</span>
                </div>
                
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#551465]"
                />
                
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>يوم واحد</span>
                  <span>14 يوم (خصم 10%)</span>
                  <span>30 يوم (خصم 20%)</span>
                  <span>60 يوم</span>
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <BadgePercent className="w-4 h-4 text-emerald-400" />
                    وفرت معك خصم المدة الطويلة:
                  </span>
                  <strong className="text-emerald-300 font-extrabold">{discountAmount.toLocaleString()} ر.س</strong>
                </div>
              )}
            </div>

            {/* Calculated Results Box */}
            <div className="lg:col-span-5 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ملخص تقديرات الحملة</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between text-xs pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">الباقة المختارة:</span>
                  <span className="font-bold text-slate-200">{currentPkg.title.split('(')[0]}</span>
                </div>

                <div className="flex justify-between text-xs pb-2 border-b border-slate-800/80 gap-2">
                  <span className="text-slate-400">الوصول والظهور المتوقع:</span>
                  <span className="font-bold text-purple-300 tabular-nums">~{Math.round(parseInt(currentPkg.estimatedViews.replace(/,/g, ''), 10) * (durationDays / 7)).toLocaleString()} مشاهدة</span>
                </div>

                <div className="flex justify-between text-xs pb-2 border-b border-slate-800/80 gap-2">
                  <span className="text-slate-400">النقرات المباشرة المتوقعة:</span>
                  <span className="font-bold text-emerald-400 tabular-nums">~{Math.round(parseInt(currentPkg.estimatedClicks.replace(/,/g, ''), 10) * (durationDays / 7)).toLocaleString()} نقرة</span>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-xs text-slate-300 font-bold">التكلفة الإجمالية:</span>
                  <div className="text-left">
                    <span className="text-2xl font-extrabold text-white">{finalPrice.toLocaleString()}</span>
                    <span className="text-xs text-brand-300 mr-1 font-bold">ر.س</span>
                  </div>
                </div>
              </div>

              <a
                href="#booking-form"
                className="block text-center w-full py-3 bg-[#551465] hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition shadow border border-brand-500/30"
              >
                اعتماد وتأكيد هذا الحساب
              </a>
            </div>
          </div>
        </div>

        {/* Current Active Ads Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <span>أحدث المنتجات والحملات الرائعة المميزة حالياً</span>
            </h3>
            <span className="text-xs text-slate-400">منتجات تم تفعيل إعلاناتها بمتجر رواج</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.slice(0, 4).map((product) => (
              <div 
                key={product.id}
                onClick={() => onQuickView(product)}
                className="bg-slate-900 border border-slate-800 hover:border-[#551465]/60 rounded-2xl p-3 transition cursor-pointer flex items-center gap-3 relative"
              >
                <span className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow">
                  برعاية Sponsored
                </span>

                <LazyImage
                  src={product.images[0]}
                  alt={product.name}
                  sizeHint="thumb"
                  wrapperClassName="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0"
                  className="w-full h-full object-cover"
                />

                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-white truncate">{product.name}</h4>
                  <span className="text-[11px] text-amber-300 font-extrabold block mt-0.5">
                    {product.price} ر.س
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">معدل النقرات: high CTR</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Request Form */}
        <div id="booking-form" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#551465]/30 text-brand-300 flex items-center justify-center border border-[#551465]/50">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تقديم طلب حجز إعلان مدفوع</h3>
              <p className="text-xs text-slate-400">قم بتعبئة البيانات وسيتواصل معك فريق تسويق متجر رواج خلال أقل من ساعتين</p>
            </div>
          </div>

          {bookingRef ? (
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-8 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-bold text-white">تم استلام طلب الإعلان المدفوع بنجاح!</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  رقم المرجعية الحصري لطلبك: <strong className="text-amber-300 font-mono text-sm px-2 py-0.5 bg-slate-900 rounded">{bookingRef}</strong>
                </p>
                <p className="text-xs text-slate-400">
                  سيتواصل معك مستشار الإعلانات عبر الواتساب والبريد المرفق لإرسال الفاتورة والبدء في نشر حملتك فوراً.
                </p>
              </div>

              <button
                onClick={() => setBookingRef(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl border border-slate-700 transition"
              >
                تقديم طلب إعلاني جديد
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={advertiserName}
                    onChange={(e) => setAdvertiserName(e.target.value)}
                    placeholder="مثال: عبدالله الشمري"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#551465]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم الشركة أو العلامة التجارية</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="مثال: متجر التقنية الذكية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#551465]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني للتواصل *</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#551465]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف / الواتساب *</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="05xxxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#551465]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رابط المنتج أو الصفحة المراد إعلانها</label>
                  <input
                    type="url"
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#551465]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الباقة المختارة</label>
                  <input
                    type="text"
                    disabled
                    value={`${currentPkg.title} (${finalPrice.toLocaleString()} ر.س / ${durationDays} أيام)`}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-amber-300 text-xs font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تفاصيل إضافية أو متطلبات خاصة بالحملة</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب أي ملاحظات أو تواريخ مفضلة لإطلاق الحملة الإعلانية..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#551465]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#551465] hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-[#551465]/20 flex items-center justify-center gap-2 border border-brand-500/30"
              >
                {isSubmitting ? (
                  <span>جاري إرسال طلب الحجز...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>تأكيد وإرسال طلب الإعلان المدفوع</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Advertising Policies & FAQ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-xs text-slate-400">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>معايير القبول والجودة</span>
            </h4>
            <p className="leading-relaxed">
              تخضع جميع المنتجات والإعلانات للمراجعة لضمان مطابقتها للمواصفات السعودية وتوفر الضمان وتجربة مستخدم ممتازة.
            </p>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-300" />
              <span>سرعة التفعيل والإطلاق</span>
            </h4>
            <p className="leading-relaxed">
              يتم مراجعة وتفعيل الإعلان خلال أقل من 24 ساعة من تاريخ اعتماد الطلب واستلام المواد الترويجية.
            </p>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>تقارير وأرقام شفافة</span>
            </h4>
            <p className="leading-relaxed">
              يزودك فريق التسويق بتقرير شامل في نهاية كل حملة موضحاً فيه المشاهدات والنقرات ومعدلات التحويل الفعلية.
            </p>
          </div>
        </div>
      </div>
  );
};
