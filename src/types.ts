export type Category = 'all' | 'electronics' | 'gaming' | 'fashion' | 'home' | 'accessories';

export type PageView = 'home' | 'offers' | 'track-order' | 'faq' | 'policies' | 'about' | 'wishlist' | 'ads' | 'profile' | 'white-label' | 'sitemap';

export interface ProductVariant {
  id: string;
  name: string; // e.g., "أزرق تيتانيوم - 256GB"
  color?: string;
  size?: string;
  storage?: string;
  priceOffset: number;
  stock: number;
  image?: string;
}

export interface SpecificationItem {
  key: string;
  value: string;
}

export interface ProductReview {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  images?: string[];
}

export interface ProductVideoChapter {
  label: string;
  time: number; // seconds
}

export interface ProductVideo {
  url: string;
  title?: string;
  thumbnail?: string;
  duration?: string;
  chapters?: ProductVideoChapter[];
  highlights?: string[];
}

export interface ProductDimensions {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  weightKg?: number;
  labelAr?: string;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  brand?: string;
  category: Category;
  categoryNameAr: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  description: string;
  images: string[];
  videoUrl?: string;
  demoVideo?: ProductVideo;
  dimensions?: ProductDimensions;
  stock: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  badge?: string;
  specifications: SpecificationItem[];
  variants?: ProductVariant[];
  customizationOptions?: {
    engravingAvailable?: boolean;
    giftWrapAvailable?: boolean;
    warrantyOptions?: { id: string; label: string; price: number }[];
  };
  reviews: ProductReview[];
}

export interface CartItem {
  product: Product;
  selectedVariant?: ProductVariant;
  selectedWarranty?: { id: string; label: string; price: number };
  customEngraving?: string;
  isGiftWrapped?: boolean;
  quantity: number;
}

export type PaymentMethodId = 'card' | 'cod' | 'stc_pay' | 'apple_pay' | 'tamara' | 'tabby';

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  items: CartItem[];
  customer: CustomerInfo;
  paymentMethod: PaymentMethodId;
  paymentStatus: 'paid' | 'pending' | 'failed';
  subtotal: number;
  discount: number;
  loyaltyDiscount?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsEarned?: number;
  vat: number; // 15%
  shippingFee: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed';
  points: number;
  discountValueSar?: number;
  orderNumber?: string;
  description: string;
  date: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: string;
}

export interface SellerChatMessage {
  id: string;
  sender: 'user' | 'seller' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
  productId?: string;
  productName?: string;
  orderNumber?: string;
  image?: string;
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedProductIds?: string[];
  timestamp: string;
}

export interface AdminStats {
  totalSales: number;
  ordersCount: number;
  customersCount: number;
  productsCount: number;
  monthlyRevenue: { month: string; sales: number; orders: number }[];
  categorySales: { category: string; count: number; percentage: number }[];
}

export type CurrencyCode = 'SAR' | 'YER' | 'USD';

export interface StoreSettings {
  storeName: string;
  logoUrl?: string;
  storeCurrency: string; // e.g., 'ر.س', 'ر.ي', '$'
  activeCurrency: CurrencyCode; // 'SAR' | 'YER' | 'USD'
  yerExchangeRate: number; // rate e.g., 670 (1 SAR = 670 YER)
  vatPercentage: number; // e.g. 15
  freeShippingThreshold: number; // e.g. 200
  sellerChatGreeting: string;
  supportPhone: string;
  supportEmail: string;
  location?: string;
  adminPhone?: string;
  customerServicePhone?: string;
}

export type ThemeMode = 'dark' | 'light';

export type ReturnResolution = 'refund' | 'exchange' | 'store_credit';
export type ReturnRequestStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed';

export interface ReturnRequest {
  id: string;
  requestNumber: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productImage: string;
  variantName?: string;
  quantity: number;
  refundAmount: number;
  customerName: string;
  customerPhone: string;
  reason: string;
  resolution: ReturnResolution;
  condition: 'unopened' | 'opened_unused' | 'defective';
  notes?: string;
  status: ReturnRequestStatus;
  adminNote?: string;
  createdAt: string;
}

export interface FlashOfferConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  discountLabel: string;
  promoCode?: string;
  productId?: string;
  ctaLabel: string;
  endsAt: string; // ISO datetime string
}

export type WhiteLabelPlanTier = 'starter' | 'growth' | 'enterprise';
export type WhiteLabelUserRole = 'owner' | 'brand_admin' | 'viewer';
export type WhiteLabelAssetKind = 'app_icon' | 'splash_logo' | 'store_banner';

export interface WhiteLabelThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  textOnPrimary: string;
  textOnSurface: string;
}

export interface WhiteLabelSplashConfig {
  enabled: boolean;
  headline: string;
  subheadline: string;
  backgroundColor: string;
  textColor: string;
  spinnerColor: string;
  durationMs: number;
  showPoweredByLegal: boolean;
}

export interface WhiteLabelAsset {
  id: string;
  kind: WhiteLabelAssetKind;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  sha256: string;
  encrypted: boolean;
  encryptionAlgorithm: 'AES-256-GCM';
  scanStatus: 'clean' | 'rejected';
  cdnUrl: string;
  etag: string;
  uploadedAt: string;
}

export interface WhiteLabelLockedBoundaries {
  legalEntityName: string;
  vatNumber: string;
  crNumber: string;
  paymentGatewaysLocked: true;
  allowedPaymentGateways: string[];
  legalPagesLocked: true;
  vatRateLockedPercent: number;
}

export interface WhiteLabelBuildRecord {
  id: string;
  platform: 'android_aab' | 'ios_ipa' | 'dynamic_pwa';
  version: string;
  buildNumber: number;
  rolloutChannel: 'production' | 'beta' | 'ota_config';
  rolloutPercentage: number;
  status: 'signed_ready' | 'building' | 'failed';
  signatureFingerprint: string;
  signingAlgorithm: string;
  bundleSizeMb: number;
  createdAt: string;
  manifestUrl: string;
}

export interface WhiteLabelBackupSnapshot {
  id: string;
  label: string;
  createdAt: string;
  checksumSha256: string;
  sizeBytes: number;
  appName: string;
  primaryColor: string;
}

export interface WhiteLabelTenant {
  id: string;
  slug: string;
  appName: string;
  appNameEn: string;
  tagline: string;
  bundleId: string;
  plan: WhiteLabelPlanTier;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  theme: WhiteLabelThemeColors;
  splash: WhiteLabelSplashConfig;
  iconAsset?: WhiteLabelAsset;
  splashAsset?: WhiteLabelAsset;
  lockedBoundaries: WhiteLabelLockedBoundaries;
  builds: WhiteLabelBuildRecord[];
  backups: WhiteLabelBackupSnapshot[];
  updatedAt: string;
  version: number;
}

export interface WhiteLabelAuditLog {
  id: string;
  tenantId: string;
  level: 'info' | 'warning' | 'error' | 'security';
  action: string;
  actorRole: WhiteLabelUserRole;
  details: string;
  statusCode: number;
  timestamp: string;
}

export interface WhiteLabelOpsSummary {
  totalTenants: number;
  totalAssetsEncrypted: number;
  totalStorageUsedBytes: number;
  cdnRequestsTotal: number;
  cdnCacheHits: number;
  cdnCacheHitRatio: number;
  totalBuilds: number;
  errorEventsCount: number;
  logs: WhiteLabelAuditLog[];
}

export interface BrowsingHistoryEntry {
  productId: string;
  category: Category;
  viewedAt: string;
  viewCount: number;
}

export interface RecommendedProductItem {
  productId: string;
  reasonAr: string;
  badgeAr: string;
  matchScore: number;
}

export interface CrossSellRecommendationResult {
  headlineAr: string;
  source: 'gemini-ai' | 'smart-engine';
  recommendations: RecommendedProductItem[];
}

export interface PriceDropAlert {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  subscribedPrice: number;
  targetPrice?: number;
  createdAt: string;
  isActive: boolean;
}

export interface InAppNotification {
  id: string;
  type: 'price_drop' | 'system';
  productId?: string;
  productName?: string;
  productImage?: string;
  oldPrice?: number;
  newPrice?: number;
  discountPercent?: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

