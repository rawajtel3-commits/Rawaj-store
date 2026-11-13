import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  MessageSquareText, 
  Sparkles, 
  CreditCard, 
  Truck, 
  ShieldCheck, 
  ArrowRight,
  PhoneCall
} from 'lucide-react';
import { StoreSettings } from '../../types';

interface FAQPageProps {
  onBackToHome: () => void;
  onOpenAIAssistant: () => void;
  onOpenSellerChat: () => void;
  settings: StoreSettings;
}

interface FAQItem {
  id: string;
  category: 'payment' | 'shipping' | 'warranty' | 'ai';
  question: string;
  answer: string;
}

export const FAQPage: React.FC<FAQPageProps> = ({
  onBackToHome,
  onOpenAIAssistant,
  onOpenSellerChat,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('1');

  const faqItems: FAQItem[] = [
    {
      id: '1',
      category: 'payment',
      question: 'ما هي وسائل الدفع الإلكتروني المعتمدة في متجر رواج؟',
      answer: 'نوفر وسائل دفع شاملة وآمنة 100%: بطاقات مدى السعودية MADA، فيزا VISA، ماستركارد MasterCard، المحافظ الرقمية STC Pay، خيار تقسيط تمارا Tamara على 4 دفعات بدون فوائد، وخيار الدفع عند الاستلام داخل مدن المملكة الرئيسية.',
    },
    {
      id: '2',
      category: 'shipping',
      question: 'كم يستغرق توصيل الشحنة داخل الرياض وبقية مناطق المملكة؟',
      answer: `يتم توصيل الطلبات داخل مدينة الرياض خلال 24 ساعة عمل، وفي بقية مناطق ومدن المملكة خلال 24 إلى 48 ساعة كحد أقصى عبر شركائنا المعتمدين (سمسا، أرامكس، مندوب رواج السريع). والشحن مجاني للطلبات الأكبر من ${settings.freeShippingThreshold} ر.س.`,
    },
    {
      id: '3',
      category: 'warranty',
      question: 'كيف يتم تفعيل الضمان وطلب استبدال أو صيانة الأجهزة؟',
      answer: 'جميع المنتجات الإلكترونية والذكية في متجر رواج مغطاة بضمان الوكيل المحلي لمدة سنتين. يمكنك تسجيل طلب الاستبدال أو الصيانة مباشرة عبر تزويدنا بالسيريال نمبر من خلال الفاتورة الضريبية، وسيقوم مندوبنا باستلام الجهاز من باب بيتك.',
    },
    {
      id: '4',
      category: 'ai',
      question: 'كيف يمكن للمساعد الذكي Gemini AI مساعدتي أثناء التسوق؟',
      answer: 'يقوم المساعد الذكي بتحليل احتياجاتك وميزانيتك واقتراح أفضل المنتجات المتوافقة مع جهازك أو استخدامك، بالإضافة إلى مقارنة المواصفات الفنية بلغة عربية بسيطة فورياً.',
    },
    {
      id: '5',
      category: 'payment',
      question: 'هل توجد أي رسوم خفية أو رسوم إضافية عند استخدام خيار تقسيط تمارا؟',
      answer: 'لا توجد أي رسوم إضافية أو فوائد إطلاقاً عند تقسيط مشترياتك عبر تمارا Tamara. يتم تقسيم المبلغ الإجمالي بالضبط إلى 4 دفعات متساوية بدون أي زيادة.',
    },
    {
      id: '6',
      category: 'warranty',
      question: 'ما هي مهلة الاسترجاع والاستبدال المتاحة للعميل؟',
      answer: 'يحق للعميل استبدال أو استرجاع المنتج خلال 14 يوماً من تاريخ استلام الشحنة، بشرط أن يكون المنتج بحالته الأصلية وفي عبوته المغلقة.',
    },
  ];

  const filteredFaqs = faqItems.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
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
            <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-brand-300 shrink-0" />
            <span>مركز الأسئلة الشائعة والدعم الفني</span>
          </h1>
          <p className="text-xs text-slate-400">
            إجابات فورية وشاملة على استفسارات الدفع، الشحن، الضمان، وتجربة الشراء الذكي.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={onOpenAIAssistant}
            className="flex-1 sm:flex-initial justify-center bg-[#551465] hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow border border-brand-500/30 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 text-brand-200" />
            <span>اسأل المساعد الذكي</span>
          </button>
          <button
            type="button"
            onClick={onOpenSellerChat}
            className="flex-1 sm:flex-initial justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow whitespace-nowrap"
          >
            <MessageSquareText className="w-4 h-4 text-purple-400" />
            <span>محادثة مباشرة</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الأسئلة الشائعة (مثل: تقسيط تمارا، مدة الشحن، الضمان...)"
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pr-10 pl-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465] focus:ring-2 focus:ring-[#551465]/30 shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>

        <div className="flex items-center justify-start sm:justify-center gap-2 flex-wrap text-xs font-bold">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl transition ${
              activeCategory === 'all'
                ? 'bg-[#551465] text-white shadow border border-brand-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            جميع الأسئلة
          </button>
          <button
            onClick={() => setActiveCategory('payment')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1 ${
              activeCategory === 'payment'
                ? 'bg-[#551465] text-white shadow border border-brand-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-brand-300" />
            <span>الدفع والتقسيط</span>
          </button>
          <button
            onClick={() => setActiveCategory('shipping')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1 ${
              activeCategory === 'shipping'
                ? 'bg-[#551465] text-white shadow border border-brand-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-purple-300" />
            <span>الشحن والتوصيل</span>
          </button>
          <button
            onClick={() => setActiveCategory('warranty')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1 ${
              activeCategory === 'warranty'
                ? 'bg-[#551465] text-white shadow border border-brand-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>الضمان والاسترجاع</span>
          </button>
          <button
            onClick={() => setActiveCategory('ai')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1 ${
              activeCategory === 'ai'
                ? 'bg-[#551465] text-white shadow border border-brand-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>مساعد Gemini AI</span>
          </button>
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="max-w-3xl mx-auto space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-2">
            <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">لم نجد نتائج تطابق بحثك</h4>
            <p className="text-xs text-slate-400">تواصل مع البائع مباشرة للحصول على إجابة سريعة.</p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className={`border rounded-2xl overflow-hidden transition-all ${
                  isOpen
                    ? 'bg-slate-900 border-[#551465] shadow-lg shadow-[#551465]/10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full p-4 text-right flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-white focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />
                    <span>{faq.question}</span>
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-brand-300 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="p-4 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 bg-slate-950/40">
                    <p className="mt-2">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Support CTA Box */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#551465]/30 border border-slate-800 p-6 rounded-3xl max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-right">
          <h4 className="font-bold text-white text-sm">هل لديك سؤال آخر لم يذكر هنا؟</h4>
          <p className="text-xs text-slate-400">فريق خدمة العملاء متواجد على مدار الساعة للرد على استفساراتكم.</p>
        </div>

        <button
          onClick={onOpenSellerChat}
          className="bg-[#551465] hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow border border-brand-500/30 shrink-0"
        >
          <PhoneCall className="w-4 h-4 text-brand-200" />
          <span>محادثة مباشرة الآن</span>
        </button>
      </div>
    </div>
  );
};
