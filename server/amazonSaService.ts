import crypto from "crypto";
import type {
  AmazonSaCatalogResponse,
  AmazonSaCategoryKey,
  AmazonSaProduct,
} from "../src/types.js";

const PAAPI_HOST = "webservices.amazon.sa";
const PAAPI_REGION = "eu-west-1";
const PAAPI_SERVICE = "ProductAdvertisingAPI";
const PAAPI_MARKETPLACE = "www.amazon.sa";

const CATALOG_CACHE_TTL_MS = 45_000;
const ITEM_CACHE_TTL_MS = 20_000;
const MAX_CACHE_SIZE = 120;

interface CachedEntry<T> {
  expiresAt: number;
  value: T;
}

const catalogCache = new Map<string, CachedEntry<AmazonSaCatalogResponse>>();
const itemRefreshCache = new Map<string, CachedEntry<AmazonSaProduct>>();

export interface AmazonSaQueryInput {
  q?: string;
  category?: AmazonSaCategoryKey;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  primeOnly?: boolean;
  inStockOnly?: boolean;
  sort?: "featured" | "price-asc" | "price-desc" | "rating-desc" | "discount-desc";
  limit?: number;
}

export interface SignedPaApiHeaders {
  [key: string]: string;
  host: string;
  "content-encoding": string;
  "content-type": string;
  "x-amz-date": string;
  "x-amz-target": string;
  Authorization: string;
}

function sha256Hex(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

export function signAmazonPaApiRequest(params: {
  accessKey: string;
  secretKey: string;
  path: "/paapi5/searchitems" | "/paapi5/getitems";
  target:
    | "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems"
    | "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";
  payloadJson: string;
  timestamp?: Date;
}): SignedPaApiHeaders {
  const now = params.timestamp ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeadersMap: Record<string, string> = {
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=utf-8",
    host: PAAPI_HOST,
    "x-amz-date": amzDate,
    "x-amz-target": params.target,
  };

  const sortedHeaderKeys = Object.keys(canonicalHeadersMap).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${canonicalHeadersMap[k]}\n`)
    .join("");
  const signedHeaders = sortedHeaderKeys.join(";");
  const payloadHash = sha256Hex(params.payloadJson);

  const canonicalRequest = [
    "POST",
    params.path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${PAAPI_REGION}/${PAAPI_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${params.secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, PAAPI_REGION);
  const kService = hmacSha256(kRegion, PAAPI_SERVICE);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${params.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    host: PAAPI_HOST,
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=utf-8",
    "x-amz-date": amzDate,
    "x-amz-target": params.target,
    Authorization: authorization,
  };
}

export function isAmazonPaApiConfigured(): boolean {
  return Boolean(
    process.env.AMAZON_SA_ACCESS_KEY?.trim() &&
      process.env.AMAZON_SA_SECRET_KEY?.trim() &&
      process.env.AMAZON_SA_PARTNER_TAG?.trim()
  );
}

const BASE_AMAZON_SA_CATALOG: Omit<AmazonSaProduct, "lastSyncedAt">[] = [
  {
    asin: "B0D8X9K2M1",
    id: "amz-B0D8X9K2M1",
    title: "ماك بوك برو 14 إنش شريحة M4 – ذاكرة 16GB، تخزين 512GB SSD (نسخة الشرق الأوسط)",
    titleEn: "MacBook Pro 14-inch M4 Chip, 16GB Unified Memory, 512GB SSD (ME Spec)",
    brand: "Apple",
    category: "electronics",
    categoryLabelAr: "حواسيب وإلكترونيات",
    categoryLabelEn: "Computers & Electronics",
    priceSar: 6799,
    listPriceSar: 7499,
    discountPercent: 9,
    rating: 4.9,
    reviewCount: 418,
    availability: "in_stock",
    availabilityTextAr: "متوفر في مستودع الرياض",
    availabilityTextEn: "In stock at Riyadh Warehouse",
    stockCount: 14,
    isPrime: true,
    fulfillment: "prime_riyadh",
    deliveryEstimateAr: "توصيل سريع غداً إلى الرياض وجدة والدمام",
    deliveryEstimateEn: "Fast Next-Day Delivery across KSA & Gulf hub",
    sellerName: "Amazon.sa",
    amazonUrl: "https://www.amazon.sa/dp/B0D8X9K2M1",
    imageKey: "laptop",
    highlightsAr: [
      "شاشة Liquid Retina XDR سطوع حتى 1600 شمعة",
      "لوحة مفاتيح عربية / إنجليزية أصلية بإضاءة خلفية",
      "شاحن 70W USB-C مع كابل MagSafe 3",
    ],
    highlightsEn: [
      "Liquid Retina XDR display up to 1600 nits peak brightness",
      "Official Arabic / English backlit Magic Keyboard",
      "70W USB-C power adapter with MagSafe 3 cable",
    ],
    specifications: [
      { key: "ASIN", value: "B0D8X9K2M1" },
      { key: "المعالج", value: "Apple M4 (10-Core CPU)" },
      { key: "الذاكرة", value: "16GB Unified RAM" },
      { key: "التخزين", value: "512GB NVMe SSD" },
      { key: "الضمان", value: "ضمان حاسبات العرب / وكيل السعودية سنتين" },
    ],
  },
  {
    asin: "B0C7P4N8L2",
    id: "amz-B0C7P4N8L2",
    title: "لابتوب ASUS Zenbook 14 OLED بمعالج Intel Core Ultra 7 وذاكرة 16GB",
    titleEn: "ASUS Zenbook 14 OLED Laptop, Intel Core Ultra 7, 16GB RAM, 1TB SSD",
    brand: "ASUS",
    category: "electronics",
    categoryLabelAr: "حواسيب وإلكترونيات",
    categoryLabelEn: "Computers & Electronics",
    priceSar: 4299,
    listPriceSar: 4899,
    discountPercent: 12,
    rating: 4.7,
    reviewCount: 263,
    availability: "in_stock",
    availabilityTextAr: "متوفر في مستودع أمازون السعودية",
    availabilityTextEn: "In stock at Amazon.sa Fulfillment",
    stockCount: 19,
    isPrime: true,
    fulfillment: "prime_riyadh",
    deliveryEstimateAr: "شحن مجاني خلال 24-48 ساعة",
    deliveryEstimateEn: "Free shipping within 24–48 hours",
    sellerName: "Amazon.sa",
    amazonUrl: "https://www.amazon.sa/dp/B0C7P4N8L2",
    imageKey: "laptop",
    highlightsAr: [
      "شاشة OLED دقة 3K معدل تحديث 120Hz",
      "هيكل ألمنيوم نحيف بوزن 1.2 كجم فقط",
      "بطارية تدوم حتى 15 ساعة مع شحن سريع USB-C",
    ],
    highlightsEn: [
      "3K 120Hz Lumina OLED touchscreen display",
      "Ultra-thin 1.2kg anodized aluminum chassis",
      "Up to 15-hour battery life with USB-C fast charge",
    ],
    specifications: [
      { key: "ASIN", value: "B0C7P4N8L2" },
      { key: "الشاشة", value: "14-inch 3K OLED 120Hz" },
      { key: "التخزين", value: "1TB PCIe 4.0 SSD" },
      { key: "الوزن", value: "1.20 كجم" },
    ],
  },
  {
    asin: "B0CX9V3T6R",
    id: "amz-B0CX9V3T6R",
    title: "قرص تخزين محمول Samsung T9 SSD سعة 2TB – سرعة نقل 2000MB/s",
    titleEn: "Samsung T9 Portable SSD 2TB USB 3.2 Gen 2x2 External Drive",
    brand: "Samsung",
    category: "electronics",
    categoryLabelAr: "حواسيب وإلكترونيات",
    categoryLabelEn: "Computers & Electronics",
    priceSar: 749,
    listPriceSar: 899,
    discountPercent: 17,
    rating: 4.8,
    reviewCount: 540,
    availability: "in_stock",
    availabilityTextAr: "متوفر للشحن المباشر",
    availabilityTextEn: "In stock · Ready to dispatch",
    stockCount: 38,
    isPrime: true,
    fulfillment: "amazon_sa_warehouse",
    deliveryEstimateAr: "توصيل سريع مع برايم",
    deliveryEstimateEn: "Prime Priority Dispatch",
    sellerName: "Samsung Official SA",
    amazonUrl: "https://www.amazon.sa/dp/B0CX9V3T6R",
    imageKey: "laptop",
    highlightsAr: [
      "سرعة قراءة وكتابة متتابعة تصل إلى 2,000 ميجابايت/ثانية",
      "مقاوم للسقوط حتى ارتفاع 3 أمتار بتصميم مطاطي محكم",
      "تشفير عتادي AES 256-bit لحماية الملفات",
    ],
    highlightsEn: [
      "Sequential read/write up to 2,000 MB/s via USB 3.2 Gen 2x2",
      "Drop resistant up to 3 meters with thermal guard",
      "AES 256-bit hardware password encryption",
    ],
    specifications: [
      { key: "ASIN", value: "B0CX9V3T6R" },
      { key: "السعة", value: "2TB" },
      { key: "الواجهة", value: "USB Type-C (20Gbps)" },
    ],
  },
  {
    asin: "B0D4W8R1Z3",
    id: "amz-B0D4W8R1Z3",
    title: "سماعة Sony WH-1000XM5 اللاسلكية لعزل الضوضاء الفائق – أسود مطفي",
    titleEn: "Sony WH-1000XM5 Wireless Industry-Leading Noise Cancelling Headphones",
    brand: "Sony",
    category: "mobiles",
    categoryLabelAr: "جوالات وصوتيات",
    categoryLabelEn: "Mobiles & Audio",
    priceSar: 1249,
    listPriceSar: 1599,
    discountPercent: 22,
    rating: 4.9,
    reviewCount: 1290,
    availability: "in_stock",
    availabilityTextAr: "متوفر في مستودع الرياض",
    availabilityTextEn: "In stock at Riyadh Warehouse",
    stockCount: 25,
    isPrime: true,
    fulfillment: "prime_riyadh",
    deliveryEstimateAr: "توصيل سريع مجاني",
    deliveryEstimateEn: "Free Prime Delivery",
    sellerName: "Amazon.sa",
    amazonUrl: "https://www.amazon.sa/dp/B0D4W8R1Z3",
    imageKey: "audio",
    highlightsAr: [
      "معالجان و8 ميكروفونات لعزل ضوضاء احترافي",
      "بطارية 30 ساعة مع شحن 3 دقائق يعطي 3 ساعات تشغيل",
      "اتصال مزدوج لجهازين في آنٍ واحد (Multipoint)",
    ],
    highlightsEn: [
      "Dual processors & 8 microphones for industry-leading ANC",
      "30-hour battery life + 3-minute quick charge for 3 hours",
      "Simultaneous dual-device Bluetooth Multipoint pairing",
    ],
    specifications: [
      { key: "ASIN", value: "B0D4W8R1Z3" },
      { key: "العلامة", value: "Sony" },
      { key: "البطارية", value: "30 ساعة تشغيل متواصل" },
      { key: "الاتصال", value: "Bluetooth 5.2 / LDAC / USB-C" },
    ],
  },
  {
    asin: "B0CH7L2P9M",
    id: "amz-B0CH7L2P9M",
    title: "سماعات Apple AirPods Pro (الجيل الثاني) مع منفذ USB-C وشريحة H2",
    titleEn: "Apple AirPods Pro (2nd Gen) with MagSafe Charging Case (USB-C)",
    brand: "Apple",
    category: "mobiles",
    categoryLabelAr: "جوالات وصوتيات",
    categoryLabelEn: "Mobiles & Audio",
    priceSar: 879,
    listPriceSar: 999,
    discountPercent: 12,
    rating: 4.9,
    reviewCount: 2410,
    availability: "in_stock",
    availabilityTextAr: "متوفر – كمية ممتازة",
    availabilityTextEn: "In stock · Ready to ship",
    stockCount: 44,
    isPrime: true,
    fulfillment: "prime_riyadh",
    deliveryEstimateAr: "يصل خلال 24 ساعة في المدن الرئيسية",
    deliveryEstimateEn: "Arrives within 24h in major cities",
    sellerName: "Amazon.sa",
    amazonUrl: "https://www.amazon.sa/dp/B0CH7L2P9M",
    imageKey: "audio",
    highlightsAr: [
      "إلغاء ضجيج نشط مضاعف مع وضع الشفافية التكيفي",
      "مقاومة للغبار والعرق والماء بمعيار IP54",
      "علبة شحن تدعم MagSafe ومنفذ USB-C ومكبر صوت للتتبع",
    ],
    highlightsEn: [
      "Up to 2x more Active Noise Cancellation with Adaptive Audio",
      "IP54 dust, sweat, and water resistant",
      "MagSafe USB-C case with Precision Finding speaker",
    ],
    specifications: [
      { key: "ASIN", value: "B0CH7L2P9M" },
      { key: "الشريحة", value: "Apple H2" },
      { key: "المقاومة", value: "IP54" },
    ],
  },
  {
    asin: "B0DJ5N1K8V",
    id: "amz-B0DJ5N1K8V",
    title: "بنك طاقة Anker Prime سعة 20,000mAh بقدرة شحن سريع 200W وشاشة رقمية",
    titleEn: "Anker Prime 20,000mAh Power Bank, 200W Smart Digital Display",
    brand: "Anker",
    category: "mobiles",
    categoryLabelAr: "جوالات وصوتيات",
    categoryLabelEn: "Mobiles & Audio",
    priceSar: 429,
    listPriceSar: 549,
    discountPercent: 22,
    rating: 4.8,
    reviewCount: 685,
    availability: "low_stock",
    availabilityTextAr: "متبقي 5 قطع فقط في المستودع",
    availabilityTextEn: "Only 5 left in warehouse",
    stockCount: 5,
    isPrime: true,
    fulfillment: "amazon_sa_warehouse",
    deliveryEstimateAr: "شحن فوري خلال 48 ساعة",
    deliveryEstimateEn: "Ships within 48 hours",
    sellerName: "Anker Direct KSA",
    amazonUrl: "https://www.amazon.sa/dp/B0DJ5N1K8V",
    imageKey: "audio",
    highlightsAr: [
      "منفذا USB-C بقدرة إجمالية 200W لشحن اللابتوب والجوال معاً",
      "شاشة LCD تعرض الواط الفوري ونسبة الشحن المتبقية",
      "معتمد للسفر الجوي داخل مقصورة الطائرة",
    ],
    highlightsEn: [
      "Dual 100W USB-C ports (200W total) for laptops & phones",
      "Smart digital readout showing live wattage & remaining runtime",
      "Airline cabin-approved 72Wh capacity",
    ],
    specifications: [
      { key: "ASIN", value: "B0DJ5N1K8V" },
      { key: "السعة", value: "20,000 mAh" },
      { key: "القدرة القصوى", value: "200W PD 3.1" },
    ],
  },
  {
    asin: "B09V7R4W2Q",
    id: "amz-B09V7R4W2Q",
    title: "ماكينة إسبريسو Breville Barista Express Pro مع مطحنة مدمجة – ستانلس ستيل",
    titleEn: "Breville Barista Express Espresso Machine, Brushed Stainless Steel (220V KSA)",
    brand: "Breville",
    category: "home_kitchen",
    categoryLabelAr: "المنزل والقهوة الذكية",
    categoryLabelEn: "Smart Home & Coffee",
    priceSar: 2690,
    listPriceSar: 3299,
    discountPercent: 18,
    rating: 4.8,
    reviewCount: 812,
    availability: "in_stock",
    availabilityTextAr: "متوفر – قابس ثلاثي 220 فولت (السعودية)",
    availabilityTextEn: "In stock · 220V Saudi UK-Style Plug",
    stockCount: 11,
    isPrime: true,
    fulfillment: "prime_riyadh",
    deliveryEstimateAr: "توصيل مجاني مؤمّن خلال 24-48 ساعة",
    deliveryEstimateEn: "Free insured shipping 24–48h",
    sellerName: "Amazon.sa",
    amazonUrl: "https://www.amazon.sa/dp/B09V7R4W2Q",
    imageKey: "home",
    highlightsAr: [
      "مطحنة مخروطية مدمجة بـ 16 درجة طحن دقيقة",
      "تحكم رقمي بدرجة الحرارة PID لاستخلاص متوازن",
      "متوافقة مع كهرباء المملكة 220-240 فولت وقابس ثلاثي",
    ],
    highlightsEn: [
      "Integrated stainless conical burr grinder with 16 settings",
      "Digital PID temperature control for balanced espresso extraction",
      "Native 220-240V / 50-60Hz KSA power plug",
    ],
    specifications: [
      { key: "ASIN", value: "B09V7R4W2Q" },
      { key: "الجهد", value: "220-240 فولت (50/60Hz)" },
      { key: "الضغط", value: "15 Bar Italian Pump" },
    ],
  },
  {
    asin: "B0CB6M3Y7T",
    id: "amz-B0CB6M3Y7T",
    title: "غلاية ترشيح القهوة Fellow Stagg EKG Pro الكهربائية – تحكم حراري دقيق 0.9 لتر",
    titleEn: "Fellow Stagg EKG Pro Electric Gooseneck Kettle, Matte Black (220V)",
    brand: "Fellow",
    category: "home_kitchen",
    categoryLabelAr: "المنزل والقهوة الذكية",
    categoryLabelEn: "Smart Home & Coffee",
    priceSar: 795,
    listPriceSar: 920,
    discountPercent: 14,
    rating: 4.7,
    reviewCount: 319,
    availability: "in_stock",
    availabilityTextAr: "متوفر في مستودع جدة",
    availabilityTextEn: "In stock at Jeddah Warehouse",
    stockCount: 16,
    isPrime: true,
    fulfillment: "amazon_sa_warehouse",
    deliveryEstimateAr: "شحن سريع خلال يومين",
    deliveryEstimateEn: "Fast 2-day delivery",
    sellerName: "Specialty Brew KSA",
    amazonUrl: "https://www.amazon.sa/dp/B0CB6M3Y7T",
    imageKey: "home",
    highlightsAr: [
      "تحكم دقيق بدرجة الحرارة درجة بدرجة حتى 100°م",
      "مؤقت ترشيح مدمج وشاشة ملونة عالية التباين",
      "فوهة صب دقيقة لتدفق متوازن للقهوة المختصة V60",
    ],
    highlightsEn: [
      "Degree-by-degree PID temperature precision up to 100°C",
      "Built-in brew stopwatch and crisp full-color screen",
      "Precision gooseneck spout engineered for V60 pour-over",
    ],
    specifications: [
      { key: "ASIN", value: "B0CB6M3Y7T" },
      { key: "السعة", value: "0.9 لتر" },
      { key: "القدرة", value: "1200 واط" },
    ],
  },
  {
    asin: "B0DG9K1X5P",
    id: "amz-B0DG9K1X5P",
    title: "منقي هواء ذكي Philips Series 3000i مع فلتر HEPA – يغطي حتى 135 م²",
    titleEn: "Philips Air Purifier Series 3000i Smart HEPA Connected (App Control)",
    brand: "Philips",
    category: "home_kitchen",
    categoryLabelAr: "المنزل والقهوة الذكية",
    categoryLabelEn: "Smart Home & Coffee",
    priceSar: 1649,
    listPriceSar: 1999,
    discountPercent: 18,
    rating: 4.6,
    reviewCount: 204,
    availability: "in_stock",
    availabilityTextAr: "متوفر للتوصيل المنزلي",
    availabilityTextEn: "In stock for home delivery",
    stockCount: 9,
    isPrime: false,
    fulfillment: "global_store_sa",
    deliveryEstimateAr: "التوصيل خلال 3-5 أيام عمل",
    deliveryEstimateEn: "Delivery in 3–5 business days",
    sellerName: "Philips Saudi Official",
    amazonUrl: "https://www.amazon.sa/dp/B0DG9K1X5P",
    imageKey: "home",
    highlightsAr: [
      "يزيل 99.97% من الغبار الناعم وحبوب اللقاح",
      "مستشعر جودة هواء ذكي وتطبيق تحكم عن بُعد",
      "وضع ليلي فائق الهدوء 15 ديسيبل",
    ],
    highlightsEn: [
      "Captures 99.97% of fine desert dust & allergens via NanoProtect HEPA",
      "Real-time air quality ring sensor with Wi-Fi app control",
      "Whisper-quiet 15dB sleep mode",
    ],
    specifications: [
      { key: "ASIN", value: "B0DG9K1X5P" },
      { key: "التغطية", value: "حتى 135 متر مربع" },
      { key: "CADR", value: "520 m³/h" },
    ],
  },
  {
    asin: "B0CL8Q2H4N",
    id: "amz-B0CL8Q2H4N",
    title: "يد تحكم Xbox Elite Series 2 Core اللاسلكية الاحترافية مع أزرار خلفية",
    titleEn: "Xbox Elite Wireless Controller Series 2 Core – Black/Graphite",
    brand: "Microsoft",
    category: "gaming",
    categoryLabelAr: "ألعاب الفيديو",
    categoryLabelEn: "Gaming",
    priceSar: 569,
    listPriceSar: 679,
    discountPercent: 16,
    rating: 4.7,
    reviewCount: 492,
    availability: "in_stock",
    availabilityTextAr: "متوفر في مستودع الرياض",
    availabilityTextEn: "In stock at Riyadh Warehouse",
    stockCount: 27,
    isPrime: true,
    fulfillment: "prime_riyadh",
    deliveryEstimateAr: "توصيل غداً في الرياض",
    deliveryEstimateEn: "Next-day delivery in Riyadh",
    sellerName: "Amazon.sa",
    amazonUrl: "https://www.amazon.sa/dp/B0CL8Q2H4N",
    imageKey: "watch_gaming",
    highlightsAr: [
      "أذرع تحكم قابلة لضبط الشد ومشغلات إطلاق قصيرة المدى",
      "بطارية مدمجة تدوم حتى 40 ساعة شحن عبر USB-C",
      "توافق كامل مع Xbox و Windows PC والهواتف عبر Bluetooth",
    ],
    highlightsEn: [
      "Adjustable-tension thumbsticks and shorter hair-trigger locks",
      "Built-in 40-hour rechargeable USB-C battery",
      "Works seamlessly across Xbox, Windows PC, and mobile",
    ],
    specifications: [
      { key: "ASIN", value: "B0CL8Q2H4N" },
      { key: "التوافق", value: "Xbox Series X|S, PC, Android/iOS" },
      { key: "البطارية", value: "40 ساعة" },
    ],
  },
  {
    asin: "B0DC3F7M9B",
    id: "amz-B0DC3F7M9B",
    title: "كيبورد ميكانيكي Keychron Q2 Pro QMK/VIA لا سلكي هيكل ألمنيوم كامل 65%",
    titleEn: "Keychron Q2 Pro Wireless Custom Mechanical Keyboard, Full CNC Aluminum",
    brand: "Keychron",
    category: "gaming",
    categoryLabelAr: "ألعاب الفيديو",
    categoryLabelEn: "Gaming",
    priceSar: 799,
    listPriceSar: 899,
    discountPercent: 11,
    rating: 4.8,
    reviewCount: 178,
    availability: "in_stock",
    availabilityTextAr: "متوفر للشحن الفوري",
    availabilityTextEn: "In stock · Instant dispatch",
    stockCount: 12,
    isPrime: true,
    fulfillment: "amazon_sa_warehouse",
    deliveryEstimateAr: "توصيل سريع 24-48 ساعة",
    deliveryEstimateEn: "Express 24–48h delivery",
    sellerName: "Keychron Middle East",
    amazonUrl: "https://www.amazon.sa/dp/B0DC3F7M9B",
    imageKey: "watch_gaming",
    highlightsAr: [
      "هيكل ألمنيوم CNC بالكامل مع نظام Gasket Mount ناعم",
      "مفاتيح قابلة للتبديل السريع (Hot-Swappable) وإضاءة RGB",
      "يدعم macOS و Windows عبر Bluetooth 5.1 أو كابل USB-C",
    ],
    highlightsEn: [
      "Full CNC machined aluminum body with double-gasket mount",
      "Hot-swappable switches with south-facing RGB backlight",
      "Dual macOS/Windows layout via Bluetooth 5.1 or USB-C",
    ],
    specifications: [
      { key: "ASIN", value: "B0DC3F7M9B" },
      { key: "الحجم", value: "65% Compact" },
      { key: "الهيكل", value: "6063 CNC Aluminum" },
    ],
  },
  {
    asin: "B0D6T1V8N4",
    id: "amz-B0D6T1V8N4",
    title: "ساعة Garmin Fenix 8 تيتانيوم AMOLED مقاس 47mm – خرائط GPS وبطارية 16 يوماً",
    titleEn: "Garmin Fenix 8 47mm AMOLED Titanium GPS Multisport Smartwatch",
    brand: "Garmin",
    category: "watches_perfumes",
    categoryLabelAr: "ساعات وإكسسوارات",
    categoryLabelEn: "Watches & Gear",
    priceSar: 3899,
    listPriceSar: 4299,
    discountPercent: 9,
    rating: 4.9,
    reviewCount: 145,
    availability: "in_stock",
    availabilityTextAr: "متوفر – وكيل رسمي بالسعودية",
    availabilityTextEn: "In stock · Official KSA Distributor",
    stockCount: 8,
    isPrime: true,
    fulfillment: "prime_riyadh",
    deliveryEstimateAr: "شحن مجاني مؤمّن خلال 24 ساعة",
    deliveryEstimateEn: "Free insured 24h shipping",
    sellerName: "Amazon.sa",
    amazonUrl: "https://www.amazon.sa/dp/B0D6T1V8N4",
    imageKey: "watch_gaming",
    highlightsAr: [
      "إطار تيتانيوم وزجاج ياقوتي مقاوم للخدش مع مقاومة غوص 40م",
      "بطارية تدوم حتى 16 يوماً في وضع الساعة الذكية",
      "مكبر صوت وميكروفون مدمج للمكالمات مع مصباح LED ليلي",
    ],
    highlightsEn: [
      "Titanium bezel, sapphire lens & 40m dive rating",
      "Up to 16 days battery life in smartwatch mode",
      "Built-in speaker/mic for calls & tactical LED flashlight",
    ],
    specifications: [
      { key: "ASIN", value: "B0D6T1V8N4" },
      { key: "المقاس", value: "47mm AMOLED" },
      { key: "الخامات", value: "Titanium + Sapphire" },
    ],
  },
  {
    asin: "B0CF5R9W3L",
    id: "amz-B0CF5R9W3L",
    title: "ساعة Samsung Galaxy Watch Ultra تيتانيوم LTE مقاس 47mm",
    titleEn: "Samsung Galaxy Watch Ultra 47mm Titanium LTE Smartwatch (UAE/KSA)",
    brand: "Samsung",
    category: "watches_perfumes",
    categoryLabelAr: "ساعات وإكسسوارات",
    categoryLabelEn: "Watches & Gear",
    priceSar: 1999,
    listPriceSar: 2499,
    discountPercent: 20,
    rating: 4.7,
    reviewCount: 380,
    availability: "in_stock",
    availabilityTextAr: "متوفر في مستودع الرياض",
    availabilityTextEn: "In stock at Riyadh Warehouse",
    stockCount: 21,
    isPrime: true,
    fulfillment: "prime_riyadh",
    deliveryEstimateAr: "توصيل سريع خلال 24 ساعة",
    deliveryEstimateEn: "Fast 24h delivery",
    sellerName: "Samsung Official SA",
    amazonUrl: "https://www.amazon.sa/dp/B0CF5R9W3L",
    imageKey: "watch_gaming",
    highlightsAr: [
      "تحمل درجات حرارة حتى 55°م ومقاومة ماء 10ATM",
      "GPS مزدوج التردد دقيق للتنقل والرياضات الصحراوية",
      "قياس متقدم لنبض القلب والنوم والجهد عبر Galaxy AI",
    ],
    highlightsEn: [
      "10ATM water resistance & heat resilience up to 55°C",
      "Dual-frequency L1+L5 GPS for pinpoint outdoor navigation",
      "Galaxy AI energy score, sleep & heart rate analytics",
    ],
    specifications: [
      { key: "ASIN", value: "B0CF5R9W3L" },
      { key: "الاتصال", value: "LTE eSIM + Bluetooth 5.3" },
      { key: "الشاشة", value: "3000 nits Sapphire Glass" },
    ],
  },
];

function hydrateTimestamp(
  base: Omit<AmazonSaProduct, "lastSyncedAt">,
  syncedAt: string
): AmazonSaProduct {
  return {
    ...base,
    lastSyncedAt: syncedAt,
  };
}

function getAllBaseProducts(): AmazonSaProduct[] {
  const nowIso = new Date().toISOString();
  return BASE_AMAZON_SA_CATALOG.map((item) => hydrateTimestamp(item, nowIso));
}

function clampPrice(val: unknown, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0 || n > 500_000) return fallback;
  return n;
}

export function sanitizeSearchText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, 100);
}

export function normalizeAmazonCategory(raw: unknown): AmazonSaCategoryKey {
  const allowed: AmazonSaCategoryKey[] = [
    "all",
    "electronics",
    "mobiles",
    "home_kitchen",
    "gaming",
    "watches_perfumes",
  ];
  return typeof raw === "string" && allowed.includes(raw as AmazonSaCategoryKey)
    ? (raw as AmazonSaCategoryKey)
    : "all";
}

export function isValidAsin(asin: string): boolean {
  return /^[A-Z0-9]{10}$/i.test(asin.trim());
}

async function tryFetchLivePaApiCatalog(
  query: AmazonSaQueryInput
): Promise<AmazonSaProduct[] | null> {
  if (!isAmazonPaApiConfigured()) return null;

  const accessKey = process.env.AMAZON_SA_ACCESS_KEY!.trim();
  const secretKey = process.env.AMAZON_SA_SECRET_KEY!.trim();
  const partnerTag = process.env.AMAZON_SA_PARTNER_TAG!.trim();

  const keywords = sanitizeSearchText(query.q) || "electronics smart home";
  const payload = JSON.stringify({
    Keywords: keywords,
    Marketplace: PAAPI_MARKETPLACE,
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    ItemCount: 10,
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "ItemInfo.Features",
      "Offers.Listings.Price",
      "Offers.Listings.SavingBasis",
      "Offers.Listings.DeliveryInfo.IsPrimeEligible",
      "Offers.Listings.Availability.Message",
    ],
  });

  const headers = signAmazonPaApiRequest({
    accessKey,
    secretKey,
    path: "/paapi5/searchitems",
    target: "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
    payloadJson: payload,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`https://${PAAPI_HOST}/paapi5/searchitems`, {
      method: "POST",
      headers,
      body: payload,
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const json = (await response.json()) as {
      SearchResult?: {
        Items?: Array<{
          ASIN?: string;
          DetailPageURL?: string;
          Images?: { Primary?: { Large?: { URL?: string } } };
          ItemInfo?: {
            Title?: { DisplayValue?: string };
            ByLineInfo?: { Brand?: { DisplayValue?: string } };
            Features?: { DisplayValues?: string[] };
          };
          Offers?: {
            Listings?: Array<{
              Price?: { Amount?: number };
              SavingBasis?: { Amount?: number };
              DeliveryInfo?: { IsPrimeEligible?: boolean };
              Availability?: { Message?: string };
            }>;
          };
        }>;
      };
    };

    const rawItems = json.SearchResult?.Items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) return null;

    const nowIso = new Date().toISOString();
    return rawItems
      .filter((item) => Boolean(item.ASIN && item.ItemInfo?.Title?.DisplayValue))
      .map((item) => {
        const asin = item.ASIN!;
        const listing = item.Offers?.Listings?.[0];
        const priceSar = Number(listing?.Price?.Amount || 0);
        const listPriceSar = listing?.SavingBasis?.Amount
          ? Number(listing.SavingBasis.Amount)
          : undefined;
        const discountPercent =
          listPriceSar && listPriceSar > priceSar && priceSar > 0
            ? Math.round(((listPriceSar - priceSar) / listPriceSar) * 100)
            : undefined;
        const title = item.ItemInfo?.Title?.DisplayValue || asin;
        const brand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || "Amazon.sa";
        const isPrime = Boolean(listing?.DeliveryInfo?.IsPrimeEligible);
        const features = item.ItemInfo?.Features?.DisplayValues?.slice(0, 3) || [];

        return {
          asin,
          id: `amz-${asin}`,
          title,
          titleEn: title,
          brand,
          category: "electronics",
          categoryLabelAr: "حواسيب وإلكترونيات",
          categoryLabelEn: "Computers & Electronics",
          priceSar: priceSar > 0 ? priceSar : 299,
          listPriceSar,
          discountPercent,
          rating: 4.7,
          reviewCount: 120,
          availability: "in_stock",
          availabilityTextAr: listing?.Availability?.Message || "متوفر في أمازون السعودية",
          availabilityTextEn: listing?.Availability?.Message || "In Stock at Amazon.sa",
          stockCount: 15,
          isPrime,
          fulfillment: isPrime ? "prime_riyadh" : "amazon_sa_warehouse",
          deliveryEstimateAr: isPrime ? "توصيل سريع مع برايم السعودية" : "شحن قياسي داخل المملكة",
          deliveryEstimateEn: isPrime ? "Fast Prime KSA Delivery" : "Standard KSA Shipping",
          sellerName: "Amazon.sa",
          amazonUrl: item.DetailPageURL || `https://www.amazon.sa/dp/${asin}`,
          imageKey: "laptop",
          imageUrl: item.Images?.Primary?.Large?.URL,
          highlightsAr: features,
          highlightsEn: features,
          specifications: [{ key: "ASIN", value: asin }],
          lastSyncedAt: nowIso,
        };
      });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function queryAmazonSaCatalog(
  rawQuery: AmazonSaQueryInput = {}
): Promise<AmazonSaCatalogResponse> {
  const q = sanitizeSearchText(rawQuery.q);
  const category = normalizeAmazonCategory(rawQuery.category);
  const brandFilter = sanitizeSearchText(rawQuery.brand).toLowerCase();
  const minPrice = clampPrice(rawQuery.minPrice, 0);
  const maxPrice = clampPrice(rawQuery.maxPrice, 500_000);
  const minRating = Math.max(0, Math.min(5, Number(rawQuery.minRating || 0) || 0));
  const primeOnly = Boolean(rawQuery.primeOnly);
  const inStockOnly = Boolean(rawQuery.inStockOnly);
  const sort =
    rawQuery.sort === "price-asc" ||
    rawQuery.sort === "price-desc" ||
    rawQuery.sort === "rating-desc" ||
    rawQuery.sort === "discount-desc"
      ? rawQuery.sort
      : "featured";
  const limit = Math.max(1, Math.min(48, Number(rawQuery.limit || 24) || 24));

  const cacheKey = JSON.stringify({
    q,
    category,
    brandFilter,
    minPrice,
    maxPrice,
    minRating,
    primeOnly,
    inStockOnly,
    sort,
    limit,
  });

  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ...cached.value,
      cacheHit: true,
    };
  }

  const liveItems = await tryFetchLivePaApiCatalog({ q, category });
  const integrationMode: "paapi_live" | "catalog_proxy" = liveItems
    ? "paapi_live"
    : "catalog_proxy";
  const sourceCatalog = liveItems ?? getAllBaseProducts();

  // Compute global facets from source catalog before filtering
  const availableBrands = Array.from(
    new Set(sourceCatalog.map((item) => item.brand))
  ).sort((a, b) => a.localeCompare(b));

  const prices = sourceCatalog.map((item) => item.priceSar);
  const priceBounds = {
    minSar: prices.length > 0 ? Math.min(...prices) : 0,
    maxSar: prices.length > 0 ? Math.max(...prices) : 10_000,
  };

  const categoryCounts: Record<AmazonSaCategoryKey, number> = {
    all: sourceCatalog.length,
    electronics: 0,
    mobiles: 0,
    home_kitchen: 0,
    gaming: 0,
    watches_perfumes: 0,
  };
  for (const item of sourceCatalog) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  let filtered = sourceCatalog.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (brandFilter && item.brand.toLowerCase() !== brandFilter) return false;
    if (item.priceSar < minPrice || item.priceSar > maxPrice) return false;
    if (item.rating < minRating) return false;
    if (primeOnly && !item.isPrime) return false;
    if (inStockOnly && item.availability === "out_of_stock") return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = [
        item.asin,
        item.title,
        item.titleEn,
        item.brand,
        item.categoryLabelAr,
        item.categoryLabelEn,
        ...item.highlightsAr,
        ...item.highlightsEn,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  if (sort === "price-asc") {
    filtered = [...filtered].sort((a, b) => a.priceSar - b.priceSar);
  } else if (sort === "price-desc") {
    filtered = [...filtered].sort((a, b) => b.priceSar - a.priceSar);
  } else if (sort === "rating-desc") {
    filtered = [...filtered].sort(
      (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount
    );
  } else if (sort === "discount-desc") {
    filtered = [...filtered].sort(
      (a, b) => (b.discountPercent || 0) - (a.discountPercent || 0)
    );
  }

  const response: AmazonSaCatalogResponse = {
    items: filtered.slice(0, limit),
    totalCount: filtered.length,
    availableBrands,
    priceBounds,
    categoryCounts,
    syncedAt: new Date().toISOString(),
    cacheHit: false,
    integrationMode,
  };

  if (catalogCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = catalogCache.keys().next().value;
    if (oldestKey) catalogCache.delete(oldestKey);
  }
  catalogCache.set(cacheKey, {
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
    value: response,
  });

  return response;
}

export async function refreshAmazonSaItemByAsin(
  rawAsin: string,
  forceRefresh = false
): Promise<{ item: AmazonSaProduct; cacheHit: boolean } | null> {
  const normalized = rawAsin.trim().toUpperCase();
  if (!isValidAsin(normalized)) return null;

  if (!forceRefresh) {
    const cached = itemRefreshCache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      return { item: cached.value, cacheHit: true };
    }
  }

  const base = BASE_AMAZON_SA_CATALOG.find(
    (entry) => entry.asin.toUpperCase() === normalized
  );
  if (!base) return null;

  const refreshed = hydrateTimestamp(base, new Date().toISOString());

  if (itemRefreshCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = itemRefreshCache.keys().next().value;
    if (oldestKey) itemRefreshCache.delete(oldestKey);
  }
  itemRefreshCache.set(normalized, {
    expiresAt: Date.now() + ITEM_CACHE_TTL_MS,
    value: refreshed,
  });

  return { item: refreshed, cacheHit: false };
}

export function findAmazonSaCatalogProductById(productId: string): {
  id: string;
  name: string;
  stock: number;
  price: number;
} | null {
  const cleanId = productId.trim();
  const match = BASE_AMAZON_SA_CATALOG.find(
    (item) => item.id === cleanId || item.asin === cleanId.replace(/^amz-/i, "")
  );
  if (!match) return null;
  return {
    id: match.id,
    name: match.title,
    stock: match.stockCount,
    price: match.priceSar,
  };
}
