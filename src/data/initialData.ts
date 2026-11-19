import { Product, Order, AdminStats, StoreSettings, SellerChatMessage, ReturnRequest, FlashOfferConfig, UserProfile, LoyaltyTransaction } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'حاسوب نيوبروم بوك برو 16 (Pro M3 Max)',
    nameEn: 'NeoProm Book Pro 16',
    brand: 'نيوبروم (NeoProm)',
    category: 'electronics',
    categoryNameAr: 'إلكترونيات وحواسيب',
    price: 8999,
    originalPrice: 9999,
    rating: 4.9,
    reviewCount: 128,
    description: 'حاسوب محمول فائق الأداء مخصص للمحترفين والمطورين وصناع المحتوى. مزود بشاشة XDR OLED مقاس 16 بوصة ومعالج ثماني عشر النواة لسرعة معالجة استثنائية وبطارية تدوم حتى 22 ساعة.',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80'
    ],
    demoVideo: {
      url: '/videos/demo_laptop_pro.mp4',
      title: 'استعراض تقني: أداء معالج M3 Max وشاشة XDR',
      thumbnail: '/src/assets/images/demo_laptop_pro_1794555877381.jpg',
      duration: '0:12',
      chapters: [
        { label: 'التصميم الألمنيومي والهيكل', time: 0 },
        { label: 'شاشة Liquid Retina XDR والألوان', time: 4 },
        { label: 'نظام التبريد والمنافذ الاحترافية', time: 8 }
      ],
      highlights: [
        'اختبار معالجة الفيديو 8K بدون انخفاض الإطارات',
        'استعراض دقة الألوان والتباين العالي في الإضاءة المنخفضة',
        'نظرة قريبة على منافذ Thunderbolt 4 ولوحة المفاتيح'
      ]
    },
    dimensions: {
      widthCm: 35.6,
      heightCm: 1.7,
      depthCm: 24.8,
      weightKg: 2.14,
      labelAr: 'لابتوب احترافي 16 بوصة'
    },
    stock: 14,
    isFeatured: true,
    isNewArrival: true,
    badge: 'وفر 1000 ر.س',
    specifications: [
      { key: 'المعالج', value: 'M3 Max بـ 16 نواة معالجة و40 نواة رسومية' },
      { key: 'الذاكرة العشوائية (RAM)', value: '36 جيجابايت Unified Memory' },
      { key: 'سعة التخزين', value: '1 تيرابايت SSD فائق السرعة' },
      { key: 'الشاشة', value: '16.2 بوصة Liquid Retina XDR (120Hz)' },
      { key: 'البطارية', value: 'تصل إلى 22 ساعة من تشغيل الفيديو' },
      { key: 'الوزن', value: '2.14 كجم' },
      { key: 'الضمان', value: 'ضمان حاسبات العرب لمدة سنتين' }
    ],
    variants: [
      { id: 'v1', name: 'رمادي فلكي - 1TB SSD', priceOffset: 0, stock: 8 },
      { id: 'v2', name: 'فضيل لؤلؤي - 1TB SSD', priceOffset: 0, stock: 4 },
      { id: 'v3', name: 'رمادي فلكي - 2TB SSD', priceOffset: 1200, stock: 2 }
    ],
    customizationOptions: {
      engravingAvailable: true,
      giftWrapAvailable: true,
      warrantyOptions: [
        { id: 'w1', label: 'حماية شاملة ضد الحوادث (سنة واحدة)', price: 499 },
        { id: 'w2', label: 'حماية شاملة ضد الحوادث (سنتان)', price: 899 }
      ]
    },
    reviews: [
      { id: 'r1', userName: 'سعود الشمري', rating: 5, date: '2026-07-20', comment: 'جهاز خرافي للمونتاج والتصميم! سرعة لا تصدق والشاشة مريحة جداً للعين.', verified: true },
      { id: 'r2', userName: 'م. فهد العتيبي', rating: 5, date: '2026-07-15', comment: 'البطارية استثنائية وتدوم ليومين عمل كاملين بدون شاحن.', verified: true }
    ]
  },
  {
    id: 'prod-2',
    name: 'ساعة رواج الذكية Ultra Fit 3',
    nameEn: 'Rawaj SmartWatch Ultra Fit 3',
    brand: 'رواج (Rawaj)',
    category: 'accessories',
    categoryNameAr: 'ساعات وإكسسوارات',
    price: 1299,
    originalPrice: 1599,
    rating: 4.8,
    reviewCount: 94,
    description: 'ساعة رياضية ذكية هيكل من التيتانيوم ومقاومة للماء حتى عمق 100 متر. تتضمن مستشعر تخطيط القلب ومتابعة الأكسجين، ونظام GPS مزدوج التردد بدقة فائقة.',
    images: [
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=1000&q=80'
    ],
    demoVideo: {
      url: '/videos/demo_smartwatch_ultra.mp4',
      title: 'عرض توضيحي: مستشعرات الصحة ونظام GPS المزدوج',
      thumbnail: '/src/assets/images/demo_smartwatch_ultra_1794555878097.jpg',
      duration: '0:12',
      chapters: [
        { label: 'إطار التيتانيوم ومقاومة الصدمات', time: 0 },
        { label: 'قراءة نبض القلب والارتفاع المباشر', time: 4 },
        { label: 'أزرار التحكم السريع والغوص', time: 8 }
      ],
      highlights: [
        'توضيح واجهة قياس نبضات القلب ومقياس الارتفاع',
        'استعراض متانة زجاج الياقوت وإطار التيتانيوم',
        'شرح آلية تثبيت السوار الرياضي للظروف القاسية'
      ]
    },
    dimensions: {
      widthCm: 4.9,
      heightCm: 1.4,
      depthCm: 4.4,
      weightKg: 0.06,
      labelAr: 'ساعة ذكية 49 مم'
    },
    stock: 28,
    isFeatured: true,
    badge: 'الأكثر مبيعاً',
    specifications: [
      { key: 'مادة الهيكل', value: 'تيتانيوم درجة درع الطيران' },
      { key: 'مقاومة الماء', value: '100 متر (EN13319 للغوص)' },
      { key: 'عمر البطارية', value: 'تصل إلى 6 أيام في الاستخدام العادي' },
      { key: 'المستشعرات', value: 'مستشعر نبضات القلب، ECG، أكسجين الدم، مقياس العمق' },
      { key: 'الاتصال', value: 'شريحة إلكترونية eSIM + Wi-Fi + Bluetooth 5.3' }
    ],
    variants: [
      { id: 'v21', name: 'سوار برتقالي رياضي', priceOffset: 0, stock: 15 },
      { id: 'v22', name: 'سوار تيتانيوم فضي', priceOffset: 250, stock: 8 },
      { id: 'v23', name: 'سوار قماشي كحلي', priceOffset: 50, stock: 5 }
    ],
    customizationOptions: {
      engravingAvailable: true,
      giftWrapAvailable: true
    },
    reviews: [
      { id: 'r3', userName: 'عبدالله الغامدي', rating: 5, date: '2026-07-18', comment: 'قوية جداً للرياضات الخارجية والتسلق. الـ GPS دقيق جداً.', verified: true }
    ]
  },
  {
    id: 'prod-3',
    name: 'سماعات الصوت المحيطي رواج بودز برو Max',
    nameEn: 'Rawaj SoundPods Pro Max',
    brand: 'رواج (Rawaj)',
    category: 'accessories',
    categoryNameAr: 'ساعات وإكسسوارات',
    price: 849,
    originalPrice: 999,
    rating: 4.7,
    reviewCount: 210,
    description: 'سماعات رأس لاسلكية تعزل الضوضاء التكيفية بنسبة 99.8%. توفر صوتاً سينمائياً ثلاثي الأبعاد مع ميزة تتبع حركة الرأس وشحن سريع 5 دقائق يوفر 3 ساعات استماع.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1000&q=80'
    ],
    demoVideo: {
      url: '/videos/demo_headphones_max.mp4',
      title: 'شرح هندسة الصوت المحيطي والعزل التكيفي ANC 2.0',
      thumbnail: '/src/assets/images/demo_headphones_max_1794555876272.jpg',
      duration: '0:12',
      chapters: [
        { label: 'تصميم الوسائد الصوتية والألمنيوم', time: 0 },
        { label: 'أزرار التحكم بالعزل والمكالمات', time: 4 },
        { label: 'توزيع الصوت ثلاثي الأبعاد', time: 8 }
      ],
      highlights: [
        'جولة حول أزرار التحكم باللمس وتبديل وضع الشفافية',
        'استعراض جودة خامات الألمنيوم المؤكسد والوسائد المريحة',
        'توضيح منفذ الشحن السريع USB-C'
      ]
    },
    dimensions: {
      widthCm: 16.9,
      heightCm: 18.7,
      depthCm: 8.3,
      weightKg: 0.38,
      labelAr: 'سماعة رأس محيطية'
    },
    stock: 45,
    isFeatured: true,
    badge: 'عزل ضوضاء متطور',
    specifications: [
      { key: 'تقنية العزل', value: 'Active Noise Cancellation 2.0 التكيفية' },
      { key: 'مشغلات الصوت', value: 'مشغلات ديناميكية 40 مم مخصصة' },
      { key: 'المدى اللاسلكي', value: 'حتى 20 متراً مع تكنولوجيا Bluetooth 5.4' },
      { key: 'عمر البطارية', value: '35 ساعة تشغيل مستمر مع تفعيل العزل' }
    ],
    variants: [
      { id: 'v31', name: 'أسود ملكي', priceOffset: 0, stock: 20 },
      { id: 'v32', name: 'أبيض ثلجي', priceOffset: 0, stock: 15 },
      { id: 'v33', name: 'كحلي ليلي', priceOffset: 0, stock: 10 }
    ],
    reviews: [
      { id: 'r4', userName: 'سارة المحمد', rating: 5, date: '2026-07-22', comment: 'عزل الصوت في طائرات السفر مذهل والصوت نقي وواضح في المكالمات.', verified: true }
    ]
  },
  {
    id: 'prod-4',
    name: 'منصة الألعاب الاحترافية Titan Console X',
    nameEn: 'Titan Gaming Console X',
    brand: 'تايتن (Titan)',
    category: 'gaming',
    categoryNameAr: 'عالم الألعاب',
    price: 2399,
    originalPrice: 2699,
    rating: 4.9,
    reviewCount: 340,
    description: 'جهاز ألعاب بجودة 4K حقيقية ومعدل تحديث يصل إلى 120 إطاراً في الثانية. يدعم تقنية تتبع الأشعة Real-time Ray Tracing مع قرص SSD بسعة 1.5 تيرابايت.',
    images: [
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1000&q=80'
    ],
    demoVideo: {
      url: '/videos/demo_console_titan.mp4',
      title: 'استعراض منصة Titan Console X ويد التحكم اللمسية',
      thumbnail: '/src/assets/images/demo_console_titan_1794555877086.jpg',
      duration: '0:12',
      chapters: [
        { label: 'تصميم التبريد الانسيابي للجهاز', time: 0 },
        { label: 'يد التحكم بتقنية Haptic Feedback', time: 4 },
        { label: 'منافذ التوصيل ودعم 4K @ 120Hz', time: 8 }
      ],
      highlights: [
        'نظرة شاملة على التهوية الصامتة وتصميم الهيكل الثنائي',
        'توضيح استجابة المحفزات التكيفية في يد التحكم اللاسلكية',
        'مقارنة مساحة التخزين فائقة السرعة NVMe SSD'
      ]
    },
    dimensions: {
      widthCm: 39.0,
      heightCm: 10.4,
      depthCm: 26.0,
      weightKg: 4.5,
      labelAr: 'منصة ألعاب منزلية'
    },
    stock: 9,
    isFeatured: true,
    isNewArrival: true,
    badge: 'خصم لفترة محدودة',
    specifications: [
      { key: 'الدقة والسرعة', value: '4K Native @ 120 FPS / 8K Output' },
      { key: 'وحدة المعالجة', value: 'AMD Zen 2 مخصصة بـ 8 أنواة تردد 3.8 GHz' },
      { key: 'التخزين الداخلي', value: '1.5TB NVMe Custom SSD (7000 MB/s)' },
      { key: 'يد التحكم', value: 'يد تحكم لاسلكية مع ردود فعل لمسية haptic feedback' }
    ],
    variants: [
      { id: 'v41', name: 'النسخة الرقمية الأبيض', priceOffset: 0, stock: 5 },
      { id: 'v42', name: 'نسخة الأقراص + 2 يد تحكم', priceOffset: 450, stock: 4 }
    ],
    reviews: [
      { id: 'r5', userName: 'عمر القحطاني', rating: 5, date: '2026-07-11', comment: 'تحميل الألعاب يستغرق ثواني معدودة! رسوميات مذهلة بكل ما تحمله الكلمة من معنى.', verified: true }
    ]
  },
  {
    id: 'prod-5',
    name: 'كاميرا سينمائية احترافية CineCam 8K',
    nameEn: 'CineCam 8K Professional',
    brand: 'سيني كام (CineCam)',
    category: 'electronics',
    categoryNameAr: 'إلكترونيات وحواسيب',
    price: 6499,
    originalPrice: 7299,
    rating: 4.8,
    reviewCount: 42,
    description: 'كاميرا تصوير سينمائي بدون مرآة بدقة 8K مع تثبيت بصري خماسي المحاور، وتصوير بـ 120 إطاراً في الدقة الفائقة، ونظام ضبط بؤري ذكي بتتبع العين.',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=80'
    ],
    demoVideo: {
      url: '/videos/demo_camera_cinecam.mp4',
      title: 'فيديو تقني: نظام العدسة والتثبيت خماسي المحاور 8K',
      thumbnail: '/src/assets/images/demo_camera_cinecam_1794555878319.jpg',
      duration: '0:12',
      chapters: [
        { label: 'هيكل الكاميرا والعدسة السينمائية', time: 0 },
        { label: 'شاشة الإعدادات وأقراص التحكم اليدوي', time: 4 },
        { label: 'منافذ الصوت والبيانات الاحترافية', time: 8 }
      ],
      highlights: [
        'شرح تخطيط أزرار التصوير الفوري وإعدادات 8K RAW',
        'استعراض دقة حلقات التركيز اليدوي على العدسة',
        'توضيح منافذ CFexpress Type B ومخارج المراقبة'
      ]
    },
    dimensions: {
      widthCm: 15.0,
      heightCm: 11.5,
      depthCm: 13.5,
      weightKg: 0.85,
      labelAr: 'كاميرا مع عدسة سينمائية'
    },
    stock: 6,
    specifications: [
      { key: 'مستشعر التصوير', value: 'Full-Frame CMOS 45 Megapixels' },
      { key: 'تثبيت الصور', value: 'In-body 5-axis Stabilization حتى 8 وقفات' },
      { key: 'تسجيل الفيديو', value: '8K RAW internal @ 30fps / 4K @ 120fps' },
      { key: 'فتحات البطاقات', value: 'مزدوجة CFexpress Type B + SD UHS-II' }
    ],
    reviews: [
      { id: 'r10', userName: 'فيصل المطيري', rating: 5, date: '2026-07-25', comment: 'كاميرا احترافية بمعنى الكلمة، جودة الـ 8K RAW والتثبيت البصري شيء خيالي لصناع المحتوى.', verified: true },
      { id: 'r11', userName: 'خالد العنزي', rating: 4, date: '2026-07-20', comment: 'الأداء ممتاز والتركيز التلقائي على العين سريع جداً.', verified: true }
    ]
  },
  {
    id: 'prod-6',
    name: 'شاشة ألعاب منحنية UltraSight 34" OLED',
    nameEn: 'UltraSight 34 Curved OLED Monitor',
    brand: 'ألترا سايت (UltraSight)',
    category: 'gaming',
    categoryNameAr: 'عالم الألعاب',
    price: 3499,
    originalPrice: 3899,
    rating: 4.9,
    reviewCount: 77,
    description: 'شاشة OLED منحنية مقاس 34 بوصة بمعدل تحديث 240Hz وزمن استجابة 0.03ms، مع دعم HDR True Black 400 وتقنية G-Sync للتخلص من التقطيع.',
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=1000&q=80'
    ],
    demoVideo: {
      url: '/videos/demo_monitor_oled.mp4',
      title: 'عرض تقني: انحناء 1800R وتباين Quantum Dot OLED',
      thumbnail: '/src/assets/images/demo_monitor_oled_1794555878659.jpg',
      duration: '0:12',
      chapters: [
        { label: 'زوايا الرؤية والانحناء السينمائي', time: 0 },
        { label: 'عمق الأسود الحقيقي HDR True Black', time: 4 },
        { label: 'القاعدة المعدنية واستقرار المكتب', time: 8 }
      ],
      highlights: [
        'عرض عمق اللون الأسود النقي وتدرجات الألوان HDR 400',
        'توضيح سلاسة معدل التحديث 240Hz وزمن الاستجابة 0.03ms',
        'استعراض الحامل المعدني الرفيع وتوزيع الإضاءة الخلفية'
      ]
    },
    dimensions: {
      widthCm: 81.2,
      heightCm: 46.8,
      depthCm: 28.5,
      weightKg: 8.4,
      labelAr: 'شاشة منحنية 34 بوصة بالحامل'
    },
    stock: 11,
    specifications: [
      { key: 'نوع اللوحة', value: 'Quantum Dot OLED Curved 1800R' },
      { key: 'الدقة', value: 'UWQHD (3440 x 1440)' },
      { key: 'معدل التحديث', value: '240Hz' },
      { key: 'زمن الاستجابة', value: '0.03ms (GtG)' }
    ],
    reviews: [
      { id: 'r12', userName: 'بدر الحارثي', rating: 5, date: '2026-07-26', comment: 'أفضل شاشة ألعاب جربتها في حياتي، عمق الألوان والأصلح بالألوان السوداء 100%.', verified: true },
      { id: 'r13', userName: 'سلمان الدوسري', rating: 5, date: '2026-07-19', comment: 'معدل الـ 240Hz يجعل سلاسة اللعب غير طبيعية في ألعاب الشوتر.', verified: true }
    ]
  },
  {
    id: 'prod-7',
    name: 'ماكينة القهوة الذكية Espresso Master Touch',
    nameEn: 'Espresso Master Touch Smart Coffee Maker',
    brand: 'إسبريسو ماستر (Espresso Master)',
    category: 'home',
    categoryNameAr: 'أجهزة المنزل الذكي',
    price: 1899,
    originalPrice: 2199,
    rating: 4.9,
    reviewCount: 156,
    description: 'ماكينة إيسبيرسو إيطالية بالتحكم الذكي عبر الهاتف، مزودة بمطحنة سيراميك مدمجة مع 18 خياراً لإعداد القهوة والرغوة الحليبية تلقائياً.',
    images: [
      'https://images.unsplash.com/photo-1517668808822-9e428824603b?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80'
    ],
    dimensions: {
      widthCm: 33.0,
      heightCm: 38.5,
      depthCm: 41.0,
      weightKg: 9.8,
      labelAr: 'ماكينة قهوة مكتبية'
    },
    stock: 18,
    isFeatured: true,
    badge: 'لمحبي القهوة',
    specifications: [
      { key: 'ضغط المضخة', value: '19 بار مضخة إيطالية احترافية' },
      { key: 'المطحنة المدمجة', value: 'سيراميك بـ 12 درجة طحن متدرجة' },
      { key: 'سعة خزان المياه', value: '2.2 ليتر مع فلتر تنقية كربون' },
      { key: 'الربط الذكي', value: 'تطبيق هاتف مع حفظ تفضيلات 6 مستخدمين' }
    ],
    reviews: [
      { id: 'r6', userName: 'أحمد الزهراني', rating: 5, date: '2026-07-02', comment: 'طعم القهوة مثل أفضل مقهى مختص، والتبخير السريع ممتاز جداً.', verified: true },
      { id: 'r14', userName: 'نورة الشهري', rating: 5, date: '2026-07-14', comment: 'سهلة التنظيف والاستخدام والبرمجة من الجوال مريحة الصباح.', verified: true }
    ]
  },
  {
    id: 'prod-8',
    name: 'حقيبة سفر فاخرة مقاومة الصدمات رواج Travel Pro',
    nameEn: 'Rawaj Travel Pro Hard-Shell Luggage',
    brand: 'رواج (Rawaj)',
    category: 'fashion',
    categoryNameAr: 'الموضة والأزياء',
    price: 599,
    originalPrice: 799,
    rating: 4.6,
    reviewCount: 63,
    description: 'حقيبة سفر مصنوعة من بولي كربونات الألمنيوم عالية التحمل مع عجلات مزدوجة صامتة 360 درجة، وقفل TSA معتمد ومأخذ شحن USB مدمج.',
    images: [
      'https://images.unsplash.com/photo-1565026057447-b8899f291105?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1581553680321-4fffae59febd?auto=format&fit=crop&w=1000&q=80'
    ],
    dimensions: {
      widthCm: 38.0,
      heightCm: 55.0,
      depthCm: 23.0,
      weightKg: 3.4,
      labelAr: 'حقيبة سفر كابينة 20 بوصة'
    },
    stock: 22,
    specifications: [
      { key: 'المادة الخارجية', value: 'Polycarbonate Bayer German Grade' },
      { key: 'القفل', value: 'قفل رقمي معتمد من هيئة أمن نقل الجو TSA' },
      { key: 'العجلات', value: '8 عجلات صامتة بتقنية امتصاص اهتزاز الشوارع' }
    ],
    variants: [
      { id: 'v81', name: 'حجم الكابينة (20 بوصة) - أسود', priceOffset: 0, stock: 12 },
      { id: 'v82', name: 'حجم الشحن (28 بوصة) - فضي', priceOffset: 200, stock: 10 }
    ],
    reviews: [
      { id: 'r15', userName: 'طارق المالكي', rating: 5, date: '2026-07-21', comment: 'العجلات خفيفة جداً وهادئة والمساحة الداخلية مقسمة بشكل ممتاز.', verified: true }
    ]
  },
  {
    id: 'prod-9',
    name: 'مكتب رواج الذكي القابل لتعديل الارتفاع (خشب بلوط 140×70 سم)',
    nameEn: 'Rawaj Smart Standing Oak Desk 140x70',
    brand: 'رواج (Rawaj)',
    category: 'home',
    categoryNameAr: 'المنزل والأثاث الذكي',
    price: 1799,
    originalPrice: 2199,
    rating: 4.9,
    reviewCount: 89,
    description: 'مكتب عمل وألعاب حديث بسطح من خشب البلوط الطبيعي وهيكل فولاذي مزدوج المحركات، مع لوحة تحكم رقمية لحفظ 4 ارتفاعات مخصصة ومجاري إخفاء الأسلاك.',
    images: [
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=1000&q=80'
    ],
    dimensions: {
      widthCm: 140.0,
      heightCm: 75.0,
      depthCm: 70.0,
      weightKg: 34.5,
      labelAr: 'مكتب ذكي 140×70 سم',
      arModelType: 'desk'
    },
    stock: 12,
    isFeatured: true,
    isNewArrival: true,
    badge: 'معاينة AR ثلاثية',
    specifications: [
      { key: 'الأبعاد الكلية', value: 'العرض 140 سم × العمق 70 سم × الارتفاع (72–120 سم)' },
      { key: 'مادة السطح', value: 'خشب بلوط طبيعي معالج مقاوم للخدوش والسوائل' },
      { key: 'نظام الحركة', value: 'محركان صامتان (< 45 dB) بقدرة تحمل 120 كجم' },
      { key: 'لوحة التحكم', value: 'شاشة لمس OLED مع 4 ذاكرات ارتفاع ومنفذ شحن USB-C' }
    ],
    variants: [
      { id: 'v91', name: 'خشب بلوط دافئ + هيكل أسود', priceOffset: 0, stock: 7 },
      { id: 'v92', name: 'جوزي داكن + هيكل أسود', priceOffset: 100, stock: 3 },
      { id: 'v93', name: 'أبيض لؤلؤي + هيكل فضي', priceOffset: 50, stock: 2 }
    ],
    reviews: [
      { id: 'r16', userName: 'م. وليد القحطاني', rating: 5, date: '2026-08-01', comment: 'جربت مقاسه بالكاميرا قبل الشراء وجاء مطابقاً لزاوية الغرفة بالضبط، والخشب فخم جداً.', verified: true }
    ]
  },
  {
    id: 'prod-10',
    name: 'كرسي الاسترخاء والعمل الهندسي ErgoLounge Pro',
    nameEn: 'ErgoLounge Pro Ergonomic Chair',
    brand: 'تايتن (Titan)',
    category: 'home',
    categoryNameAr: 'المنزل والأثاث الذكي',
    price: 1149,
    originalPrice: 1399,
    rating: 4.8,
    reviewCount: 114,
    description: 'كرسي مكتبي ومنزلي بتصميم هندسي يدعم فقرات الظهر والرقبة مع شبكة تهوية عالية الكثافة، مساند ذراع 4D وقاعدة ألمنيوم متينة تتحمل حتى 150 كجم.',
    images: [
      'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=1000&q=80'
    ],
    dimensions: {
      widthCm: 68.0,
      heightCm: 118.0,
      depthCm: 66.0,
      weightKg: 18.2,
      labelAr: 'كرسي هندسي 68×66 سم',
      arModelType: 'chair'
    },
    stock: 16,
    isFeatured: true,
    badge: 'مريح للظهر',
    specifications: [
      { key: 'الأبعاد الكلية', value: 'العرض 68 سم × العمق 66 سم × الارتفاع 118 سم' },
      { key: 'دعم الظهر', value: 'دعم قطني ديناميكي مزدوج مع مسند رأس قابل للتعديل' },
      { key: 'القاعدة والعجلات', value: 'قاعدة ألمنيوم خماسية مع عجلات صامتة للأرضيات الخشبية' },
      { key: 'الضمان', value: 'ضمان 3 سنوات على الميكانيك والهيكل' }
    ],
    variants: [
      { id: 'v101', name: 'أسود فحمي + قاعدة ألمنيوم', priceOffset: 0, stock: 10 },
      { id: 'v102', name: 'رمادي سحابي + قاعدة فضية', priceOffset: 0, stock: 4 },
      { id: 'v103', name: 'كحلي ليلي + مسند قدم', priceOffset: 180, stock: 2 }
    ],
    reviews: [
      { id: 'r17', userName: 'فيصل الدوسري', rating: 5, date: '2026-08-03', comment: 'مريح جداً لساعات البرمجة الطويلة وتقدر تتأكد من ارتفاعه تحت المكتب بالمعاينة.', verified: true }
    ]
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'ORD-2026-8891',
    date: '2026-07-28 14:30',
    items: [
      {
        product: INITIAL_PRODUCTS[0],
        selectedVariant: INITIAL_PRODUCTS[0].variants?.[0],
        quantity: 1
      }
    ],
    customer: {
      fullName: 'خالد بن عبدالعزيز التميمي',
      email: 'khaled.t@gmail.com',
      phone: '+967 77 123 4567',
      city: 'المكلا (حضرموت)',
      district: 'حي فوه',
      street: 'شارع الستين، برج 14'
    },
    paymentMethod: 'card',
    paymentStatus: 'paid',
    subtotal: 8999,
    discount: 0,
    vat: 1349.85,
    shippingFee: 0,
    total: 10348.85,
    status: 'delivered'
  },
  {
    id: 'ord-1002',
    orderNumber: 'ORD-2026-8892',
    date: '2026-07-29 18:15',
    items: [
      {
        product: INITIAL_PRODUCTS[1],
        quantity: 1
      },
      {
        product: INITIAL_PRODUCTS[2],
        quantity: 1
      }
    ],
    customer: {
      fullName: 'منى السليمان',
      email: 'mona.s@hotmail.com',
      phone: '+967 73 987 6543',
      city: 'صنعاء',
      district: 'حي حدة',
      street: 'شارع حدة الرئيسي'
    },
    paymentMethod: 'apple_pay',
    paymentStatus: 'paid',
    subtotal: 2148,
    discount: 100,
    vat: 307.20,
    shippingFee: 0,
    total: 2355.20,
    status: 'shipped'
  },
  {
    id: 'ord-1003',
    orderNumber: 'ORD-2026-8893',
    date: '2026-07-30 09:10',
    items: [
      {
        product: INITIAL_PRODUCTS[6],
        quantity: 1
      }
    ],
    customer: {
      fullName: 'يوسف الهذلي',
      email: 'youssef.h@outlook.com',
      phone: '+967 71 444 3322',
      city: 'عدن',
      district: 'حي خور مكسر',
      street: 'شارع الكورنيش'
    },
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    subtotal: 1899,
    discount: 0,
    vat: 284.85,
    shippingFee: 25,
    total: 2208.85,
    status: 'processing'
  }
];

export const INITIAL_RETURN_REQUESTS: ReturnRequest[] = [
  {
    id: 'ret-1001',
    requestNumber: 'RET-2026-401',
    orderId: 'ord-1002',
    orderNumber: 'ORD-2026-8892',
    productId: INITIAL_PRODUCTS[1].id,
    productName: INITIAL_PRODUCTS[1].name,
    productImage: INITIAL_PRODUCTS[1].images[0],
    quantity: 1,
    refundAmount: INITIAL_PRODUCTS[1].price,
    customerName: 'منى السليمان',
    customerPhone: '+967 73 987 6543',
    reason: 'غير مطابق للمواصفات المطلوبة',
    resolution: 'exchange',
    condition: 'opened_unused',
    notes: 'أرغب باستبدالها بمقاس أصغر مع الاحتفاظ بكامل الملحقات والكرتون.',
    status: 'reviewing',
    adminNote: 'تم استلام طلبك وجاري التنسيق مع شركة الشحن للاستلام.',
    createdAt: '2026-07-30 11:20',
  },
];

export const INITIAL_FLASH_OFFER: FlashOfferConfig = {
  enabled: true,
  title: 'عرض فلاش حصري لفترة محدودة على أحدث التقنيات!',
  subtitle: 'اغتنم الفرصة قبل انتهاء العداد التنازلي واحصل على شحن سريع وضمان سنتين مع خصم فوري.',
  discountLabel: 'خصم حتى 25%',
  promoCode: 'RAWAJ10',
  productId: INITIAL_PRODUCTS[0].id,
  ctaLabel: 'تسوق العرض الآن',
  endsAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
};

export const INITIAL_USER_PROFILE: UserProfile = {
  fullName: 'خالد بن عبدالعزيز التميمي',
  email: 'khaled.t@gmail.com',
  phone: '+967 77 123 4567',
  city: 'المكلا (حضرموت)',
  joinedAt: '2026-01-15',
};

export const INITIAL_LOYALTY_HISTORY: LoyaltyTransaction[] = [
  {
    id: 'loy-1003',
    type: 'earned',
    points: 189,
    orderNumber: 'ORD-2026-8893',
    description: 'نقاط مكتسبة عن الطلب ORD-2026-8893',
    date: '2026-07-30',
  },
  {
    id: 'loy-1002',
    type: 'earned',
    points: 204,
    orderNumber: 'ORD-2026-8892',
    description: 'نقاط مكتسبة عن الطلب ORD-2026-8892',
    date: '2026-07-29',
  },
  {
    id: 'loy-1001',
    type: 'earned',
    points: 899,
    orderNumber: 'ORD-2026-8891',
    description: 'نقاط مكتسبة عن الطلب ORD-2026-8891',
    date: '2026-07-28',
  },
];

export const INITIAL_SELLER_CHAT: SellerChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'seller',
    senderName: 'فريق خدمة عملاء متجر رواج',
    text: 'أهلاً بك في متجر رواج! 👋 كيف يمكننا مساعدتك اليوم؟ يمكنك الاستفسار عن تفاصيل المنتجات، التوصيل، أو خصومات الجملة.',
    timestamp: '10:00 ص'
  }
];

export const INITIAL_ADMIN_STATS: AdminStats = {
  totalSales: 148500,
  ordersCount: 84,
  customersCount: 62,
  productsCount: 10,
  monthlyRevenue: [
    { month: 'يناير', sales: 18500, orders: 12 },
    { month: 'فبراير', sales: 22400, orders: 15 },
    { month: 'مارس', sales: 19800, orders: 11 },
    { month: 'أبريل', sales: 26100, orders: 18 },
    { month: 'مايو', sales: 28900, orders: 20 },
    { month: 'يونيو', sales: 32800, orders: 24 }
  ],
  categorySales: [
    { category: 'إلكترونيات وحواسيب', count: 32, percentage: 42 },
    { category: 'ساعات وإكسسوارات', count: 24, percentage: 28 },
    { category: 'عالم الألعاب', count: 18, percentage: 20 },
    { category: 'أجهزة المنزل الذكي', count: 10, percentage: 10 }
  ]
};

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: 'متجر رواج | Rawaj Store',
  logoUrl: '/src/assets/images/rawaj_logo_1785437215576.jpg',
  storeCurrency: 'ر.س',
  activeCurrency: 'SAR',
  yerExchangeRate: 670,
  vatPercentage: 15,
  freeShippingThreshold: 200,
  sellerChatGreeting: 'مرحباً بك في متجر رواج! يسعدنا الإجابة على كافة استفساراتك وتزويدك بالخصومات والعروض المتاحة.',
  supportPhone: '733513128',
  supportEmail: 'saad@rawajye.com',
  location: 'اليمن، حضرموت',
  adminPhone: '770600046 / 780080555',
  customerServicePhone: '733513128',
  commercialRegistration: '',
  vatNumber: '',
};
