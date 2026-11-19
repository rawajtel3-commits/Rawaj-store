import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  CreditCard, 
  PhoneCall, 
  Mail, 
  MapPin, 
  Sparkles, 
  Building2,
  Flame,
  HelpCircle,
  FileText,
  Megaphone,
  Sun,
  Moon,
  Palette,
  Map,
  Gift,
  Languages,
  Store
} from 'lucide-react';
import { StoreSettings, PageView, ThemeMode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface FooterProps {
  settings: StoreSettings;
  onNavigate?: (view: PageView) => void;
  onOpenAIAssistant: () => void;
  onOpenSellerChat: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  isAdminUnlocked?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onNavigate,
  onOpenAIAssistant,
  onOpenSellerChat,
  theme = 'dark',
  onToggleTheme,
  isAdminUnlocked = false,
}) => {
  const { lang, toggleLang, isRtl, t } = useLanguage();
  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800 pt-12 pb-24 md:pb-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Value Proposition Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pb-8 border-b border-slate-800 text-xs">
          <div 
            onClick={() => onNavigate?.('track-order')}
            className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 p-3.5 rounded-2xl border border-slate-800/80 cursor-pointer transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#551465]/20 text-brand-300 flex items-center justify-center shrink-0 border border-[#551465]/40">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white">تتبع الشحنات مجاناً</h4>
              <p className="text-slate-400 text-[11px]">للطلبات الأكبر من {settings.freeShippingThreshold} {settings.storeCurrency}</p>
            </div>
          </div>

          <div 
            onClick={() => onNavigate?.('policies')}
            className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 p-3.5 rounded-2xl border border-slate-800/80 cursor-pointer transition"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white">ضمان الوكيل المعتمد</h4>
              <p className="text-slate-400 text-[11px]">ضمان لمدة سنتين شامل قطع الغيار</p>
            </div>
          </div>

          <div 
            onClick={() => onNavigate?.('policies')}
            className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 p-3.5 rounded-2xl border border-slate-800/80 cursor-pointer transition"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white">سياسة استرجاع مرنة</h4>
              <p className="text-slate-400 text-[11px]">استبدال واسترجاع خلال 14 يوماً</p>
            </div>
          </div>

          <div 
            onClick={() => onNavigate?.('offers')}
            className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 p-3.5 rounded-2xl border border-slate-800/80 cursor-pointer transition"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white">دفع آمن وتقسيط 0%</h4>
              <p className="text-slate-400 text-[11px]">فيزا، ماستركارد، محافظ محلية، Apple Pay</p>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
          {/* Brand & Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#551465] flex items-center justify-center text-white font-bold border border-brand-500/40 overflow-hidden shrink-0 shadow-md">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="شعار متجر رواج" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Sparkles className="w-4 h-4 text-brand-300" />
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white leading-none">{settings.storeName.split('|')[0].trim() || 'متجر رواج'}</h3>
                <span className="text-[10px] text-brand-300 font-semibold tracking-wider uppercase">
                  {settings.storeName.includes('|') ? settings.storeName.split('|')[1].trim() : 'Rawaj Store'}
                </span>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              متجر رواج - وجهتك الموثوقة للتسوق الإلكتروني الأحدث والمنتجات الذكية الأصلية 100% مع الضمان المحلي وتوصيل لجميع محافظات الجمهورية اليمنية.
            </p>
            <div className="space-y-1.5 text-slate-400 text-[11px]">
              <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-brand-300" /> {settings.location || 'الجمهورية اليمنية، حضرموت'}</p>
              <p className="flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5 text-emerald-400" /> <strong className="text-slate-300 font-normal">خدمة العملاء:</strong> {settings.customerServicePhone || settings.supportPhone || '733513128'}</p>
              <p className="flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5 text-purple-300" /> <strong className="text-slate-300 font-normal">الإدارة:</strong> {settings.adminPhone || '770600046 / 780080555'}</p>
              <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-400" /> {settings.supportEmail || 'saad@rawajye.com'}</p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div>
            <h4 className="font-bold text-white mb-3 text-sm">صفحات الخدمات الذكية</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button onClick={() => onNavigate?.('offers')} className="hover:text-brand-300 transition flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>{t.navOffers}</span>
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('brands')} className="hover:text-brand-300 transition flex items-center gap-1 font-bold">
                  <Store className="w-3 h-3 text-brand-300" />
                  <span>{t.navBrands}</span>
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('gift-vouchers')} className="hover:text-brand-300 transition flex items-center gap-1 font-bold">
                  <Gift className="w-3 h-3 text-brand-300" />
                  <span>قسائم الهدايا الرقمية</span>
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('profile')} className="hover:text-amber-300 transition flex items-center gap-1 font-bold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>الملف الشخصي ونقاط الولاء</span>
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('track-order')} className="hover:text-brand-300 transition flex items-center gap-1">
                  <Truck className="w-3 h-3 text-purple-300" />
                  <span>تتبع شحنتك المباشرة</span>
                </button>
              </li>
              <li>
                <button onClick={onOpenAIAssistant} className="hover:text-[#551465] transition flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-300" />
                  <span>المساعد الذكي (Gemini AI)</span>
                </button>
              </li>
              <li>
                <button onClick={onOpenSellerChat} className="hover:text-purple-300 transition">
                  دردشة مباشرة مع فريق البائع
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('ads')} className="hover:text-amber-400 transition flex items-center gap-1 font-bold">
                  <Megaphone className="w-3 h-3 text-amber-400" />
                  <span>الإعلانات المدفوعة (إعلن معنا)</span>
                </button>
              </li>
              {isAdminUnlocked && (
                <li>
                  <button onClick={() => onNavigate?.('white-label')} className="hover:text-brand-300 transition flex items-center gap-1 font-bold">
                    <Palette className="w-3 h-3 text-brand-300" />
                    <span>تطبيق باسمك وشعارك (White-Label)</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-bold text-white mb-3 text-sm">خدمة العملاء والضمان</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <button onClick={() => onNavigate?.('policies')} className="hover:text-white transition">
                  الشروط والأحكام العامة
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('policies')} className="hover:text-white transition">
                  سياسة الخصوصية وحماية البيانات
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('policies')} className="hover:text-white transition">
                  سياسة الاستبدال والضمان (سنتين)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('faq')} className="hover:text-white transition">
                  دليل الأسئلة الشائعة والدعم الفني
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('about')} className="hover:text-white transition flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-brand-300" />
                  <span>عن المتجر والتوثيق الرسمي في اليمن</span>
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('sitemap')} className="hover:text-emerald-300 transition flex items-center gap-1 font-bold">
                  <Map className="w-3 h-3 text-emerald-400" />
                  <span>خريطة الموقع (Sitemap)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Accepted Payments & Accreditation */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">التوثيق وطرق الدفع المقبولة</h4>
            <div className="flex flex-wrap gap-1.5 font-extrabold text-[10px]">
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-emerald-400">كريمي</span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-teal-300">جيب</span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-cyan-300">فلوسي</span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-violet-300">قروش</span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-lime-300">كاش ون</span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-blue-400">VISA</span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-amber-400">MasterCard</span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-100">Apple Pay</span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-purple-400">الدفع عند الاستلام</span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
              <p>الرقم الضريبي VAT: <strong className="text-slate-200 font-mono">{settings.vatNumber?.trim() || ''}</strong></p>
              <p>السجل التجاري CR: <strong className="text-slate-200 font-mono">{settings.commercialRegistration?.trim() || ''}</strong></p>
              <p className="text-emerald-400 font-medium">متجر موثق في الجمهورية اليمنية ☑️</p>
            </div>
          </div>
        </div>

        {/* Bottom copyright & Theme Toggle */}
        <div className="pt-6 border-t border-slate-800/80 text-center text-slate-500 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 جميع الحقوق محفوظة لمتجر رواج.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-brand-200 border border-slate-700 font-bold text-xs transition"
            >
              <Languages className="w-3.5 h-3.5 text-brand-300" />
              <span>{lang === 'ar' ? 'English (LTR)' : 'العربية (RTL)'}</span>
            </button>
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-pressed={theme === 'light'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isRtl ? 'الوضع الفاتح عالي التباين' : 'Light Mode'}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-brand-300" />
                    <span>{isRtl ? 'الوضع الداكن' : 'Dark Mode'}</span>
                  </>
                )}
              </button>
            )}
            <p className="text-slate-400">
              {isRtl ? 'متجر رواج الإلكتروني الذكي — الجمهورية اليمنية، حضرموت' : 'Rawaj Smart Store — Hadhramaut, Yemen'}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
