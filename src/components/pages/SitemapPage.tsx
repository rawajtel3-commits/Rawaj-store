import React, { useMemo, useState } from 'react';
import {
  Map,
  ArrowRight,
  Search,
  Home,
  Flame,
  Truck,
  User,
  Heart,
  HelpCircle,
  ShieldCheck,
  Building2,
  Megaphone,
  Palette,
  ShoppingBag,
  Sparkles,
  MessageSquareText,
  Laptop,
  Watch,
  Gamepad2,
  Cpu,
  Shirt,
  FileCode2,
  Copy,
  Check,
  Download,
  ChevronLeft,
  Gift,
  Award
} from 'lucide-react';
import { Category, PageView, Product, StoreSettings } from '../../types';
import { formatPrice } from '../../utils/currency';

interface SitemapPageProps {
  products: Product[];
  settings: StoreSettings;
  onNavigate: (view: PageView) => void;
  onSelectCategory: (cat: Category) => void;
  onQuickViewProduct: (product: Product) => void;
  onBackToHome: () => void;
  onOpenCart: () => void;
  onOpenAIAssistant: () => void;
  onOpenSellerChat: () => void;
  isAdminUnlocked?: boolean;
}

interface SitemapRouteItem {
  id: string;
  view?: PageView;
  href: string;
  title: string;
  description: string;
  group: 'shopping' | 'support';
  icon: React.ReactNode;
  onAction?: () => void;
}

export const SitemapPage: React.FC<SitemapPageProps> = ({
  products,
  settings,
  onNavigate,
  onSelectCategory,
  onQuickViewProduct,
  onBackToHome,
  onOpenCart,
  onOpenAIAssistant,
  onOpenSellerChat,
  isAdminUnlocked = false,
}) => {
  const [filterText, setFilterText] = useState('');
  const [xmlCopied, setXmlCopied] = useState(false);
  const [showXmlPreview, setShowXmlPreview] = useState(false);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://rawaj-store.example';

  const categoriesMeta: {
    id: Category;
    nameAr: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'all',
      nameAr: 'جميع المنتجات',
      description: 'تصفح الكتالوج الكامل لجميع الأقسام والعروض المتاحة.',
      icon: <ShoppingBag className="w-4 h-4 text-brand-300" />,
    },
    {
      id: 'electronics',
      nameAr: 'حواسيب وإلكترونيات',
      description: 'أجهزة لابتوب احترافية، شاشات ألعاب، وتقنيات مكتبية.',
      icon: <Laptop className="w-4 h-4 text-sky-400" />,
    },
    {
      id: 'accessories',
      nameAr: 'ساعات وإكسسوارات',
      description: 'ساعات ذكية، سماعات عازلة للضوضاء، وملحقات أصلية.',
      icon: <Watch className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'gaming',
      nameAr: 'عالم الألعاب',
      description: 'منصات ألعاب الجيل الجديد وملحقات اللاعبين الاحترافية.',
      icon: <Gamepad2 className="w-4 h-4 text-purple-400" />,
    },
    {
      id: 'home',
      nameAr: 'المنزل الذكي',
      description: 'مكائن القهوة المختصة وأنظمة التحكم الذكية بالمنزل.',
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'fashion',
      nameAr: 'أزياء ومستلزمات',
      description: 'مستلزمات يومية أنيقة وتصاميم عملية.',
      icon: <Shirt className="w-4 h-4 text-rose-400" />,
    },
  ];

  const routeItems: SitemapRouteItem[] = useMemo(
    () => [
      {
        id: 'home',
        view: 'home',
        href: '/?view=home',
        title: 'الصفحة الرئيسية ومعرض المنتجات',
        description: 'واجهة المتجر مع الفلترة المتقدمة، البحث الذكي، والعروض المميزة.',
        group: 'shopping',
        icon: <Home className="w-4 h-4 text-brand-300" />,
      },
      {
        id: 'offers',
        view: 'offers',
        href: '/?view=offers',
        title: 'العروض والخصومات وكوبونات التوفير',
        description: 'أقوى التخفيضات اليومية وأكواد الخصم المعتمدة.',
        group: 'shopping',
        icon: <Flame className="w-4 h-4 text-amber-400" />,
      },
      {
        id: 'brands',
        view: 'brands',
        href: '/?view=brands',
        title: 'الماركات والعلامات التجارية الرسمية',
        description: 'تصفح متاجر العلامات التجارية المعتمدة ومنتجات كل علامة مع ضمان الوكيل.',
        group: 'shopping',
        icon: <Award className="w-4 h-4 text-brand-300" />,
      },
      {
        id: 'amazon-sa',
        view: 'amazon-sa',
        href: '/?view=amazon-sa',
        title: 'تسوق منتجات أمازون السعودية (Amazon.sa)',
        description: 'استعرض واشترِ منتجات أمازون السعودية بأسعار محدثة ودفع محلي آمن.',
        group: 'shopping',
        icon: <ShoppingBag className="w-4 h-4 text-amber-400" />,
      },
      {
        id: 'gift-vouchers',
        view: 'gift-vouchers',
        href: '/?view=gift-vouchers',
        title: 'قسائم الهدايا الرقمية',
        description: 'شراء قسائم هدايا رقمية وإرسالها للأصدقاء عبر البريد أو كود مخصص.',
        group: 'shopping',
        icon: <Gift className="w-4 h-4 text-brand-300" />,
      },
      {
        id: 'track-order',
        view: 'track-order',
        href: '/?view=track-order',
        title: 'تتبع الطلبات وطلبات الاسترجاع',
        description: 'متابعة مراحل الشحن لحظياً وتقديم طلب استرجاع أو استبدال.',
        group: 'shopping',
        icon: <Truck className="w-4 h-4 text-emerald-400" />,
      },
      {
        id: 'profile',
        view: 'profile',
        href: '/?view=profile',
        title: 'الملف الشخصي ونقاط الولاء',
        description: 'إدارة بيانات الحساب، رصيد نقاط الولاء، واستبدال الخصومات.',
        group: 'shopping',
        icon: <User className="w-4 h-4 text-amber-300" />,
      },
      {
        id: 'wishlist',
        view: 'wishlist',
        href: '/?view=wishlist',
        title: 'قائمة المفضلة',
        description: 'المنتجات المحفوظة للعودة والشراء في أي وقت.',
        group: 'shopping',
        icon: <Heart className="w-4 h-4 text-rose-400" />,
      },
      {
        id: 'cart-action',
        href: '#cart',
        title: 'سلة التسوق والدفع الآمن',
        description: 'مراجعة المنتجات المضافة، تطبيق الكوبونات والنقاط، وإتمام الطلب.',
        group: 'shopping',
        icon: <ShoppingBag className="w-4 h-4 text-brand-300" />,
        onAction: onOpenCart,
      },
      ...(isAdminUnlocked
        ? [
            {
              id: 'white-label',
              view: 'white-label' as PageView,
              href: '/?view=white-label',
              title: 'منصة "تطبيق باسمك وشعارك" (White-Label)',
              description: 'تخصيص هوية المتجر، الشعار، شاشة البدء، وبناء حزم التطبيقات.',
              group: 'support' as const,
              icon: <Palette className="w-4 h-4 text-brand-300" />,
            },
          ]
        : []),
      {
        id: 'ads',
        view: 'ads',
        href: '/?view=ads',
        title: 'الإعلانات المدفوعة وحملات الترويج',
        description: 'باقات الإعلان للتجار والعلامات التجارية داخل المتجر.',
        group: 'support',
        icon: <Megaphone className="w-4 h-4 text-amber-400" />,
      },
      {
        id: 'faq',
        view: 'faq',
        href: '/?view=faq',
        title: 'الأسئلة الشائعة والدعم الفني',
        description: 'إجابات وافية حول الشحن، الضمان، طرق الدفع، والتقسيط.',
        group: 'support',
        icon: <HelpCircle className="w-4 h-4 text-purple-300" />,
      },
      {
        id: 'policies',
        view: 'policies',
        href: '/?view=policies',
        title: 'السياسات والضمان والخصوصية',
        description: 'الشروط والأحكام، سياسة الاسترجاع خلال 14 يوماً، وحماية البيانات.',
        group: 'support',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      },
      {
        id: 'about',
        view: 'about',
        href: '/?view=about',
        title: 'عن المتجر والتوثيق الرسمي',
        description: 'بيانات السجل التجاري، الرقم الضريبي، وهوية متجر رواج.',
        group: 'support',
        icon: <Building2 className="w-4 h-4 text-indigo-300" />,
      },
      {
        id: 'ai-action',
        href: '#ai-assistant',
        title: 'المساعد الذكي لاختيار المنتجات',
        description: 'استشارة فورية بالذكاء الاصطناعي لترشيح المنتج الأنسب لميزانيتك.',
        group: 'support',
        icon: <Sparkles className="w-4 h-4 text-brand-300" />,
        onAction: onOpenAIAssistant,
      },
      {
        id: 'seller-chat',
        href: '#seller-chat',
        title: 'المحادثة المباشرة مع البائع',
        description: 'تواصل فوري مع خدمة العملاء للاستفسار عن الشحن والضمان.',
        group: 'support',
        icon: <MessageSquareText className="w-4 h-4 text-purple-400" />,
        onAction: onOpenSellerChat,
      },
    ],
    [onOpenCart, onOpenAIAssistant, onOpenSellerChat]
  );

  const normalizedFilter = filterText.trim().toLowerCase();

  const filteredCategories = useMemo(
    () =>
      categoriesMeta.filter(
        (cat) =>
          !normalizedFilter ||
          cat.nameAr.toLowerCase().includes(normalizedFilter) ||
          cat.description.toLowerCase().includes(normalizedFilter)
      ),
    [normalizedFilter]
  );

  const filteredShoppingRoutes = useMemo(
    () =>
      routeItems.filter(
        (r) =>
          r.group === 'shopping' &&
          (!normalizedFilter ||
            r.title.toLowerCase().includes(normalizedFilter) ||
            r.description.toLowerCase().includes(normalizedFilter))
      ),
    [routeItems, normalizedFilter]
  );

  const filteredSupportRoutes = useMemo(
    () =>
      routeItems.filter(
        (r) =>
          r.group === 'support' &&
          (!normalizedFilter ||
            r.title.toLowerCase().includes(normalizedFilter) ||
            r.description.toLowerCase().includes(normalizedFilter))
      ),
    [routeItems, normalizedFilter]
  );

  const groupedProducts = useMemo(() => {
    const groups: { categoryId: Category; categoryName: string; items: Product[] }[] = [];
    categoriesMeta
      .filter((c) => c.id !== 'all')
      .forEach((cat) => {
        const items = products.filter(
          (p) =>
            p.category === cat.id &&
            (!normalizedFilter ||
              p.name.toLowerCase().includes(normalizedFilter) ||
              p.categoryNameAr.toLowerCase().includes(normalizedFilter) ||
              (p.brand || '').toLowerCase().includes(normalizedFilter))
        );
        if (items.length > 0) {
          groups.push({
            categoryId: cat.id,
            categoryName: cat.nameAr,
            items,
          });
        }
      });
    return groups;
  }, [products, normalizedFilter]);

  const xmlSitemapContent = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const routeEntries = routeItems
      .filter((r) => r.view)
      .map(
        (r) => `  <url>
    <loc>${origin}${r.href}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${r.view === 'home' ? '1.0' : '0.8'}</priority>
  </url>`
      );

    const catEntries = categoriesMeta
      .filter((c) => c.id !== 'all')
      .map(
        (c) => `  <url>
    <loc>${origin}/?category=${c.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`
      );

    const prodEntries = products.map(
      (p) => `  <url>
    <loc>${origin}/?product=${p.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    );

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...routeEntries, ...catEntries, ...prodEntries].join('\n')}
</urlset>`;
  }, [origin, routeItems, products]);

  const schemaJsonLd = useMemo(
    () =>
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `خريطة موقع ${settings.storeName}`,
        itemListElement: [
          ...routeItems
            .filter((r) => r.view)
            .map((r, index) => ({
              '@type': 'SiteNavigationElement',
              position: index + 1,
              name: r.title,
              url: `${origin}${r.href}`,
            })),
        ],
      }),
    [origin, routeItems, settings.storeName]
  );

  const handleCopyXml = () => {
    navigator.clipboard?.writeText(xmlSitemapContent);
    setXmlCopied(true);
    setTimeout(() => setXmlCopied(false), 2000);
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xmlSitemapContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const totalIndexedLinks =
    routeItems.filter((r) => r.view).length +
    categoriesMeta.filter((c) => c.id !== 'all').length +
    products.length;

  return (
    <div className="space-y-8 animate-fade-in pb-8" dir="rtl">
      {/* Structured Data for Search Engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaJsonLd }}
      />

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-brand-300 hover:text-white inline-flex items-center gap-2 font-bold transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Map className="w-6 h-6 text-brand-300 shrink-0" />
            <span>خريطة الموقع والفهرس الشامل (Sitemap)</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            دليل منظم للوصول السريع إلى جميع أقسام المتجر، الصفحات الفرعية، وفهرس المنتجات مع دعم كامل لمعايير فهرسة محركات البحث (SEO & XML Sitemap).
          </p>
        </div>

        {/* Filter Input & Indexed Counter */}
        <div className="w-full lg:w-80 space-y-2">
          <div className="relative">
            <input
              type="search"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="ابحث داخل خريطة الموقع (قسم، صفحة، منتج)..."
              aria-label="ابحث داخل خريطة الموقع"
              className="w-full bg-slate-900 text-white placeholder-slate-400 border border-slate-800 rounded-xl pr-10 pl-3 py-2.5 text-xs focus:outline-none focus:border-[#551465]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>إجمالي الروابط المفهرسة:</span>
            <strong className="text-brand-300 font-mono tabular-nums">
              {totalIndexedLinks} رابط منظم
            </strong>
          </div>
        </div>
      </div>

      {/* Section 1: Main Store Categories */}
      <section aria-labelledby="sitemap-categories-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="sitemap-categories-heading" className="text-base sm:text-lg font-extrabold text-white">
            01. الأقسام والتصنيفات الرئيسية للمتجر
          </h2>
          <span className="text-xs text-slate-400 tabular-nums">
            {filteredCategories.length} أقسام
          </span>
        </div>

        {filteredCategories.length === 0 ? (
          <p className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            لا توجد أقسام تطابق كلمة البحث "{filterText}".
          </p>
        ) : (
          <nav aria-label="أقسام المتجر الرئيسية" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCategories.map((cat) => {
              const count =
                cat.id === 'all'
                  ? products.length
                  : products.filter((p) => p.category === cat.id).length;

              return (
                <a
                  key={cat.id}
                  href={`/?category=${cat.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory(cat.id);
                    onNavigate('home');
                  }}
                  className="bg-slate-900 hover:bg-slate-900/80 border border-slate-800 hover:border-[#551465]/70 rounded-2xl p-4 flex items-start justify-between gap-3 transition group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      <strong className="text-sm font-bold text-white group-hover:text-brand-300 transition">
                        {cat.nameAr}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>
                    <span className="text-[11px] font-mono text-brand-300 block pt-1 tabular-nums">
                      {count} منتج متاح · /?category={cat.id}
                    </span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-brand-300 shrink-0 mt-1" />
                </a>
              );
            })}
          </nav>
        )}
      </section>

      {/* Section 2: Primary Store Pages & Sub-Pages */}
      <section aria-labelledby="sitemap-pages-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shopping & Account Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 id="sitemap-pages-heading" className="text-sm sm:text-base font-extrabold text-white">
              02. صفحات التسوق وحساب العميل
            </h2>
            <span className="text-xs text-slate-400 tabular-nums">{filteredShoppingRoutes.length} صفحات</span>
          </div>

          <nav aria-label="صفحات التسوق والحساب" className="space-y-2">
            {filteredShoppingRoutes.map((route) => (
              <a
                key={route.id}
                href={route.href}
                onClick={(e) => {
                  e.preventDefault();
                  if (route.onAction) {
                    route.onAction();
                  } else if (route.view) {
                    onNavigate(route.view);
                  }
                }}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 transition group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{route.icon}</div>
                  <div className="min-w-0">
                    <strong className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-300 block transition">
                      {route.title}
                    </strong>
                    <span className="text-[11px] text-slate-400 block leading-relaxed">
                      {route.description}
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-brand-300 shrink-0" />
              </a>
            ))}
          </nav>
        </div>

        {/* Support, Policies, SEO & Platform Tools Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm sm:text-base font-extrabold text-white">
              03. الدعم، السياسات، والمنصة التجارية
            </h2>
            <span className="text-xs text-slate-400 tabular-nums">{filteredSupportRoutes.length} صفحات</span>
          </div>

          <nav aria-label="صفحات الدعم والسياسات" className="space-y-2">
            {filteredSupportRoutes.map((route) => (
              <a
                key={route.id}
                href={route.href}
                onClick={(e) => {
                  e.preventDefault();
                  if (route.onAction) {
                    route.onAction();
                  } else if (route.view) {
                    onNavigate(route.view);
                  }
                }}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 transition group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">{route.icon}</div>
                  <div className="min-w-0">
                    <strong className="text-xs sm:text-sm font-bold text-white group-hover:text-brand-300 block transition">
                      {route.title}
                    </strong>
                    <span className="text-[11px] text-slate-400 block leading-relaxed">
                      {route.description}
                    </span>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-brand-300 shrink-0" />
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Section 3: Full Product Catalog Index Grouped by Category */}
      <section aria-labelledby="sitemap-products-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="sitemap-products-heading" className="text-base sm:text-lg font-extrabold text-white">
            04. فهرس المنتجات المباشر حسب التصنيف
          </h2>
          <span className="text-xs text-slate-400 tabular-nums">
            {groupedProducts.reduce((sum, g) => sum + g.items.length, 0)} منتج مفهرس
          </span>
        </div>

        {groupedProducts.length === 0 ? (
          <p className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
            لم يتم العثور على منتجات مطابقة في الفهرس لـ "{filterText}".
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedProducts.map((group) => (
              <div
                key={group.categoryId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(group.categoryId);
                      onNavigate('home');
                    }}
                    className="text-sm font-extrabold text-brand-300 hover:text-white transition"
                  >
                    {group.categoryName}
                  </button>
                  <span className="text-xs text-slate-400 tabular-nums">{group.items.length} منتجات</span>
                </div>

                <ul className="space-y-2">
                  {group.items.map((product) => (
                    <li key={product.id}>
                      <a
                        href={`/?product=${product.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onQuickViewProduct(product);
                        }}
                        className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800/70 text-xs transition group"
                      >
                        <div className="min-w-0">
                          <strong className="text-slate-100 group-hover:text-brand-300 block truncate transition">
                            {product.name}
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            {product.brand || 'رواج'} · تقييم {product.rating} ★
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 tabular-nums shrink-0">
                          {formatPrice(product.price, settings.activeCurrency, settings.yerExchangeRate)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 4: Search Engine XML Sitemap & Robots.txt Integration */}
      <section aria-labelledby="sitemap-seo-heading" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 id="sitemap-seo-heading" className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-brand-300" />
              <span>ملف فهرسة محركات البحث (XML Sitemap &amp; SEO)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              يتوفر ملف <code className="font-mono text-brand-300">/sitemap.xml</code> و{' '}
              <code className="font-mono text-brand-300">/robots.txt</code> وبيانات{' '}
              <code className="font-mono text-brand-300">Schema.org JSON-LD</code> تلقائياً لزواحف Google ومحركات البحث.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowXmlPreview((v) => !v)}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition"
            >
              {showXmlPreview ? 'إخفاء XML' : 'معاينة sitemap.xml'}
            </button>
            <button
              type="button"
              onClick={handleCopyXml}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5 transition"
            >
              {xmlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{xmlCopied ? 'تم النسخ' : 'نسخ XML'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadXml}
              className="px-3.5 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل sitemap.xml</span>
            </button>
          </div>
        </div>

        {showXmlPreview && (
          <pre
            dir="ltr"
            className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-72"
          >
            {xmlSitemapContent}
          </pre>
        )}
      </section>
    </div>
  );
};
