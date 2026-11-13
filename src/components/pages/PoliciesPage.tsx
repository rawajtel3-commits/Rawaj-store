import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  RotateCcw, 
  Lock, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface PoliciesPageProps {
  onBackToHome: () => void;
}

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ onBackToHome }) => {
  const [activeTab, setActiveTab] = useState<'return' | 'warranty' | 'privacy' | 'terms'>('return');

  // Serial Number Warranty Checker state
  const [serialInput, setSerialInput] = useState('');
  const [warrantyResult, setWarrantyResult] = useState<{
    valid: boolean;
    productName?: string;
    warrantyYears?: number;
    expiryDate?: string;
  } | null>(null);

  const handleCheckWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) return;

    // Simulate warranty check calculation
    if (serialInput.length >= 4) {
      setWarrantyResult({
        valid: true,
        productName: 'حاسوب محمول UltraBook Pro X / جهاز ذكي معتمد',
        warrantyYears: 2,
        expiryDate: '15 أغسطس 2028',
      });
    } else {
      setWarrantyResult({
        valid: false,
      });
    }
  };

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
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-brand-300 shrink-0" />
            <span>سياسات المتجر، الشروط والأنظمة</span>
          </h1>
          <p className="text-xs text-slate-400">
            اللوائح المعتمدة وفقاً لنظام التجارة الإلكترونية السعودي ونظام حماية البيانات الشخصية (PDPL).
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none text-xs font-bold gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('return')}
          className={`py-3 px-4 sm:px-5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'return'
              ? 'border-[#551465] text-brand-300 bg-[#551465]/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>سياسة الاستبدال والاسترجاع</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('warranty')}
          className={`py-3 px-4 sm:px-5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'warranty'
              ? 'border-[#551465] text-brand-300 bg-[#551465]/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>الضمان وصيانة الأجهزة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('privacy')}
          className={`py-3 px-4 sm:px-5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'privacy'
              ? 'border-[#551465] text-brand-300 bg-[#551465]/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>سياسة الخصوصية وحماية البيانات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('terms')}
          className={`py-3 px-4 sm:px-5 border-b-2 flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
            activeTab === 'terms'
              ? 'border-[#551465] text-brand-300 bg-[#551465]/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>الشروط والأحكام العامة</span>
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed shadow-xl">
        {/* RETURN POLICY */}
        {activeTab === 'return' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-brand-300" />
              <span>سياسة الاستبدال والاسترجاع المعتمدة (خلال 14 يوماً)</span>
            </h3>

            <div className="space-y-3">
              <h4 className="font-bold text-white">1. شروط الاسترجاع والاستبدال:</h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 mr-2">
                <li>يمكن للمشتري تقديم طلب استبدال أو استرجاع المنتج خلال 14 يوماً تقويمية من تاريخ استلام الشحنة.</li>
                <li>يجب أن يكون المنتج غلافه الأصلي مغلقاً وغير مفتوح أو مستخدم، مع وجود كافة الملحقات والكتيبات والهدايا المرفقة.</li>
                <li>تغطى تكاليف إرجاع الشحنة بالكامل من قبل المتجر في حال وجود عيب مصنعي أو خطأ في نوع المنتج المرسل.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white">2. حالات استثناء الاسترجاع:</h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 mr-2">
                <li>المنتجات المخفضة أو البرمجيات والبطاقات الرقمية التي تم كشف الرقم السري الخاص بها.</li>
                <li>المنتجات التي تم تقديم خدمة النقش المخصص أو التعديل الخاص بطلب العميل بناءً على رغبته.</li>
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-brand-300 text-xs">طريقة تقديم طلب استرجاع:</h4>
              <p className="text-xs text-slate-400">
                تواصل مع فريق خدمة العملاء عبر محادثة البائع المباشرة مع تزويدنا برقم الطلب وسيقوم مندوب التوصيل باستلام الشحنة فوراً.
              </p>
            </div>
          </div>
        )}

        {/* WARRANTY POLICY & SERIAL CHECKER */}
        {activeTab === 'warranty' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>ضمان الوكيل المحلي والتغطية الشاملة لمدة سنتين</span>
            </h3>

            <p>
              تلتزم جميع المنتجات والإلكترونيات المباعة عبر متجر أفق بضمان الوكيل المعتمد في المملكة العربية السعودية لمدة (24 شهراً) ضد أي عيوب مصنعية.
            </p>

            {/* Interactive Warranty Checker Tool */}
            <div className="bg-slate-950 border border-slate-800 p-4 sm:p-6 rounded-3xl space-y-4">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <Search className="w-4 h-4 text-brand-300" />
                <span>أداة الاستعلام السريع عن حالة ضمان الجهاز:</span>
              </h4>

              <form onSubmit={handleCheckWarranty} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="أدخل الرقم التسلسلي (Serial Number S/N)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#551465]"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#551465] hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow border border-brand-500/30 shrink-0"
                >
                  فحص الضمان
                </button>
              </form>

              {warrantyResult && (
                <div className="pt-2">
                  {warrantyResult.valid ? (
                    <div className="bg-[#551465]/20 border border-[#551465] p-3 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-brand-300 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>الجهاز مغطى بالضمان المعتمد!</span>
                      </div>
                      <p className="text-slate-200">المنتج: {warrantyResult.productName}</p>
                      <p className="text-slate-400 text-[11px]">صلاحية الضمان: 24 شهراً | ينتهي في: {warrantyResult.expiryDate}</p>
                    </div>
                  ) : (
                    <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>الرقم التسلسلي غير مسجل في النظام. يرجى التأكد من الرقم المدون خلف علبة المنتج.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRIVACY POLICY */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              <span>سياسة الخصوصية وحماية البيانات الشخصية (KSA PDPL)</span>
            </h3>

            <p>
              نحن في متجر رواج نحترم خصوصية جميع زوارنا وعملائنا، ونلتزم التزاماً كاملاً بنظام حماية البيانات الشخصية الصادر بالمرسوم الملكي في المملكة العربية السعودية.
            </p>

            <div className="space-y-3">
              <h4 className="font-bold text-white">البيانات التي نجمعها وكيفية حمايتها:</h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 mr-2">
                <li>الاسم ورقم الهاتف والعنوان تستخدم حصرياً لغرض إكمال التوصيل وتوثيق الفواتير الضريبية.</li>
                <li>يتم تشفير جميع المعاملات المالية باستخدام بروتوكول التشفير العالمي High-Grade SSL 256-bit.</li>
                <li>لا يتم مشاركة بياناتك إطلاقاً مع أي أطراف ثالثة خارج نطاق شركات الشحن والجهات الحكومية المختصة عند الطلب القانوني.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TERMS & CONDITIONS */}
        {activeTab === 'terms' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>الشروط والأحكام العامة والتجارة الإلكترونية</span>
            </h3>

            <p>
              باستخدامك لموقع ومتجر رواج فإنك توافق التزامياً على الشروط والأحكام المبينة أدناه:
            </p>

            <ul className="list-disc list-inside space-y-2 text-slate-400 mr-2">
              <li>جميع الأسعار المعروضة في المتجر شاملة لضريبة القيمة المضافة المعتمدة (15%).</li>
              <li>يحق للمتجر إغلاق الطلب أو تعديل السعر في حال وجود خطأ تقني ظاهر في أسعار المنتجات مع إعادة كامل المبلغ المدفوع للعميل.</li>
              <li>تخضع جميع المعاملات لنظام المحاكم والأنظمة المعتمدة في المملكة العربية السعودية.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
