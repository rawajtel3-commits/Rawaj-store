import React from 'react';
import { 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  MapPin, 
  PhoneCall, 
  Mail, 
  CheckCircle2, 
  ArrowRight,
  Heart
} from 'lucide-react';
import { StoreSettings } from '../../types';

interface AboutPageProps {
  onBackToHome: () => void;
  onOpenAIAssistant: () => void;
  onOpenSellerChat: () => void;
  settings: StoreSettings;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onBackToHome,
  onOpenAIAssistant,
  onOpenSellerChat,
  settings,
}) => {
  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* Header */}
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="شعار متجر رواج" className="w-8 h-8 rounded-lg object-cover shadow border border-brand-500/30 shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-brand-300 shrink-0" />
            )}
            <span>عن متجر رواج وتوثيقه الرسمي في الجمهورية اليمنية</span>
          </h1>
          <p className="text-xs text-slate-400">
            منصة تسوق عربية رائدة وموثقة رسمياً في التجارة الإلكترونية والتقنيات الذكية في الجمهورية اليمنية.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSellerChat}
          className="w-full sm:w-auto justify-center bg-[#551465] hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow border border-brand-500/30 shrink-0"
        >
          <PhoneCall className="w-4 h-4 text-brand-200" />
          <span>التواصل مع الإدارة والمبيعات</span>
        </button>
      </div>

      {/* Main Vision Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#551465]/40 border border-slate-800 p-5 sm:p-8 shadow-2xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#551465]/30 border border-[#551465]/50 text-brand-200 text-xs font-bold">
          <Sparkles className="w-4 h-4 text-brand-300" />
          <span>رؤيتنا المستقبلية في التسوق الرقمي</span>
        </div>

        <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-relaxed max-w-2xl">
          نسعى لبناء تجربة التسوق الرقمية الأكثر ذكاءً وموثوقية في الجمهورية اليمنية والخليج العربي.
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          تأسس "متجر رواج" لتقديم أحدث ما توصلت إليه تكنولوجيا الأجهزة الإلكترونية، ملحقات المنزل الذكي، والساعات الاحترافية. ندمج تقنيات الذكاء الاصطناعي لتسهيل اتخاذ قرار الشراء، مع الالتزام بأعلى معايير جودة الخدمة وضمان الوكلاء المحليين في الجمهورية اليمنية.
        </p>
      </div>

      {/* Accreditation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1 */}
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-3 shadow-lg">
          <div className="w-10 h-10 rounded-2xl bg-[#551465]/20 border border-[#551465]/40 flex items-center justify-center text-brand-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">متجر موثق في الغرفة التجارية والصناعية اليمنية</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            مسجل في الجمهورية اليمنية وموثق عبر وزارة الصناعة والتجارة
            {settings.commercialRegistration?.trim() ? (
              <>
                {' '}بالسجل التجاري رقم <strong className="text-slate-200 font-mono">{settings.commercialRegistration}</strong>
              </>
            ) : null}
            .
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-3 shadow-lg">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">الفاتورة الضريبية والامتثال القانوني</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            فواتير إلكترونية فورية بالرمز QR متوافقة مع الأنظمة التجارية في الجمهورية اليمنية
            {settings.vatNumber?.trim() ? (
              <>
                {' '}والرقم الضريبي <strong className="text-slate-200 font-mono">{settings.vatNumber}</strong>
              </>
            ) : null}
            .
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-3 shadow-lg">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">خدمة عملاء فائقة وضمان سنتين</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            أكثر من 50,000 عميل سعيد في كافة محافظات الجمهورية اليمنية، مع دعم مباشر واستبدال سريع عبر شركائنا المعتمدين.
          </p>
        </div>
      </div>

      {/* Physical Location & Contact Info */}
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-3xl space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-300" />
          <span>المقر الرئيسي ومعلومات التواصل الرسمية:</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block">العنوان الجغرافي والموقع:</span>
            <strong className="text-white block text-sm">{settings.location || 'الجمهورية اليمنية، حضرموت'}</strong>
            <span className="text-slate-500 text-[11px]">الفرع والمقر الرئيسي</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block">خدمة العملاء:</span>
            <strong className="text-emerald-400 font-mono block text-sm">{settings.customerServicePhone || settings.supportPhone || '733513128'}</strong>
            <span className="text-slate-500 text-[11px]">متاحة طوال اليوم</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block">هاتف الإدارة العامة:</span>
            <strong className="text-brand-300 font-mono block text-xs leading-relaxed">{settings.adminPhone || '770600046 / 780080555'}</strong>
            <span className="text-slate-500 text-[11px]">ساعات العمل والإدارة</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block">البريد الإلكتروني المعتمد:</span>
            <strong className="text-purple-300 font-mono block text-xs truncate">{settings.supportEmail || 'saad@rawajye.com'}</strong>
            <span className="text-slate-500 text-[11px]">التواصل والخدمات التجاريّة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
