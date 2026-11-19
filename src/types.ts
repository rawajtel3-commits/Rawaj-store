export type Category = 'all' | 'electronics' | 'gaming' | 'fashion' | 'home' | 'accessories';

export type PageView = 'home' | 'offers' | 'brands' | 'amazon-sa' | 'gift-vouchers' | 'track-order' | 'faq' | 'policies' | 'about' | 'wishlist' | 'ads' | 'profile' | 'white-label' | 'sitemap';

export type AppLanguage = 'ar' | 'en';

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

export type ArModelType =
  | 'laptop'
  | 'monitor'
  | 'console'
  | 'smartwatch'
  | 'headphones'
  | 'camera'
  | 'coffee_maker'
  | 'luggage'
  | 'desk'
  | 'chair'
  | 'generic_furniture'
  | 'generic_electronics';

export interface ProductDimensions {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  weightKg?: number;
  labelAr?: string;
  arModelType?: ArModelType;
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
  giftVoucherCode?: string;
  giftVoucherDiscount?: number;
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
  commercialRegistration?: string;
  vatNumber?: string;
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
  lastTriggeredPrice?: number;
  triggeredAt?: string;
  triggerCount?: number;
  createdAt: string;
  isActive: boolean;
}

export interface InAppNotification {
  id: string;
  type: 'price_drop' | 'checkout_reminder' | 'system';
  actionType?: 'open_cart' | 'open_product';
  productId?: string;
  productName?: string;
  productImage?: string;
  oldPrice?: number;
  newPrice?: number;
  targetPrice?: number;
  discountPercent?: number;
  itemsCount?: number;
  totalAmount?: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface WebAuthnCredentialRecord {
  id: string;
  label: string;
  userName: string;
  createdAt: string;
  lastVerifiedAt?: string;
}

export interface WebAuthnSession {
  authenticated: boolean;
  credentialId?: string;
  verifiedAt?: string;
  userName?: string;
}

export interface WebAuthnSecuritySettings {
  requireForHighValue: boolean;
  highValueThresholdSar: number;
}

export type GiftVoucherTheme = 'royal' | 'gold' | 'emerald' | 'midnight';
export type GiftVoucherDeliveryMethod = 'email' | 'custom_code';
export type GiftVoucherStatus = 'active' | 'partially_used' | 'redeemed';

export interface GiftVoucher {
  id: string;
  code: string;
  initialAmountSar: number;
  remainingBalanceSar: number;
  senderName: string;
  recipientName: string;
  recipientEmail?: string;
  message?: string;
  deliveryMethod: GiftVoucherDeliveryMethod;
  theme: GiftVoucherTheme;
  paymentMethod: 'card' | 'stc_pay' | 'apple_pay';
  createdAt: string;
  lastUsedAt?: string;
  status: GiftVoucherStatus;
}

export type AuthUserRole = 'customer' | 'user_admin' | 'promoter_admin';

export function isAdminRole(role?: string | null): boolean {
  return role === 'promoter_admin' || role === 'user_admin';
}

export function isPromoterAdminRole(role?: string | null): boolean {
  return role === 'promoter_admin';
}

export interface AuthUserSummary {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL?: string;
  role: AuthUserRole;
  providerId: string;
}

export interface ServerSessionState {
  authenticated: boolean;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: AuthUserRole;
  originalRole?: AuthUserRole;
  canAccessMasterPrompt?: boolean;
  masterPromptFeatureEnabled?: boolean;
  pinEnabled: boolean;
  pinVerified: boolean;
  webauthnVerified: boolean;
  expiresAt?: string;
  lockedUntil?: number;
}

export interface AdminCapabilitiesResponse {
  authenticated: boolean;
  role: AuthUserRole;
  originalRole: AuthUserRole;
  isAdmin: boolean;
  isPromoterAdmin: boolean;
  pinLocked: boolean;
  canAccessMasterPrompt: boolean;
  featureEnabled: boolean;
  canManageRoles: boolean;
  canRotateKeys: boolean;
}

export interface MasterPromptMetadata {
  promptId: string;
  accessRefId: string;
  keyId: string;
  keyVersion: number;
  checksumSha256: string;
  updatedAt: string;
  lastRotatedAt: string;
  nextRotationAt: string;
  featureEnabled: boolean;
}

export interface MasterPromptAuditEntry {
  id: string;
  accessRefId: string;
  actorUid: string;
  actorEmailMasked: string;
  actorRole: string;
  action: 'view' | 'denied' | 'feature_toggle' | 'key_rotated' | 'backup_created' | 'backup_restored' | 'role_switched' | 'role_assigned';
  outcome: 'granted' | 'blocked';
  httpStatus: number;
  keyVersion: number;
  ipAddress: string;
  userAgent: string;
  reason?: string;
  createdAt: string;
}

export interface MasterPromptEncryptedBackup {
  backupVersion: '1.0';
  exportedAt: string;
  exportedByRef: string;
  promptId: string;
  keyId: string;
  keyVersion: number;
  ivHex: string;
  tagHex: string;
  cipherHex: string;
  plaintextChecksumSha256: string;
  envelopeSignatureSha256: string;
  featureEnabled: boolean;
}

export type SecurityAuditEventType =
  | 'google_signin'
  | 'pin_verified'
  | 'pin_failed'
  | 'pin_enabled'
  | 'pin_disabled'
  | 'webauthn_verified'
  | 'signout'
  | 'admin_access';

export interface SecurityAuditEntry {
  id: string;
  uid: string;
  eventType: SecurityAuditEventType;
  status: 'success' | 'blocked';
  deviceSummary?: string;
  createdAt: string;
}

export type PerformanceWindow = '15m' | '1h' | '24h' | '7d';

export interface EndpointPerformanceStat {
  routeKey: string;
  totalRequests: number;
  successCount: number;
  clientErrorCount: number;
  serverErrorCount: number;
  successRatePercent: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface PerformanceTimeBucket {
  label: string;
  bucketStart: string;
  requests: number;
  successRatePercent: number;
  avgMs: number;
  p95Ms: number;
  errorCount: number;
}

export interface SecurityFeatureMetric {
  id: string;
  labelAr: string;
  adoptionPercent: number;
  enabledCount: number;
  totalBaseline: number;
  status: 'optimal' | 'moderate' | 'needs_attention';
  detailAr: string;
}

export interface BottleneckPrediction {
  id: string;
  routeKey: string;
  severity: 'critical' | 'warning' | 'info';
  titleAr: string;
  reasonAr: string;
  recommendationAr: string;
  currentP95Ms: number;
  baselineP95Ms: number;
  trendDeltaPercent: number;
  errorRatePercent: number;
}

export interface AdminPerformanceReport {
  window: PerformanceWindow;
  generatedAt: string;
  summary: {
    totalRequests: number;
    requestsPerMinute: number;
    successRatePercent: number;
    clientErrorRatePercent: number;
    serverErrorRatePercent: number;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    overallStatus: 'healthy' | 'warning' | 'critical';
  };
  timeSeries: PerformanceTimeBucket[];
  endpoints: EndpointPerformanceStat[];
  securityAdoption: {
    overallScorePercent: number;
    trackedUsers: number;
    activePinAccounts: number;
    webauthnPasskeys: number;
    rateLimitBlocksActive: number;
    authenticatedRequestPercent: number;
    features: SecurityFeatureMetric[];
  };
  bottlenecks: BottleneckPrediction[];
}

export type SecurityAlertRuleCode =
  | 'MULTI_IP_ADMIN_PROBE'
  | 'REPEATED_ADMIN_DENIALS'
  | 'PIN_BRUTE_FORCE'
  | 'ROLE_ESCALATION_ATTEMPT'
  | 'MANUAL_TEST_ALERT';

export type SecurityAlertSeverity = 'critical' | 'high' | 'medium';
export type SecurityAlertStatus = 'unread' | 'acknowledged' | 'resolved';
export type SecurityAlertEmailStatus = 'sent' | 'dashboard_only' | 'disabled' | 'failed';

export interface SecurityAlertRecord {
  id: string;
  ruleCode: SecurityAlertRuleCode;
  severity: SecurityAlertSeverity;
  status: SecurityAlertStatus;
  titleAr: string;
  descriptionAr: string;
  distinctIpCount: number;
  attemptCount: number;
  ips: string[];
  routes: string[];
  actorSummary: string;
  emailStatus: SecurityAlertEmailStatus;
  emailRecipient?: string;
  createdAt: string;
  updatedAt: string;
  resolvedBy?: string;
}

export interface SecurityAlertSettings {
  dashboardEnabled: boolean;
  emailEnabled: boolean;
  recipientEmail: string;
  multiIpThreshold: number;
  repeatedAttemptsThreshold: number;
  windowMinutes: number;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminSecurityAlertsResponse {
  alerts: SecurityAlertRecord[];
  unreadCount: number;
  settings: SecurityAlertSettings;
  emailTransportConfigured: boolean;
  emailTransportMode: 'resend' | 'webhook' | 'dashboard_only';
}

export type BehaviorEventType =
  | 'page_view'
  | 'view_item'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'search'
  | 'category_view';

export type BehaviorTimeRange = '24h' | '7d' | '30d';

export interface HourlyBehaviorStat {
  hour: number;
  label: string;
  pageViews: number;
  productViews: number;
  addToCartCount: number;
  purchaseCount: number;
  totalInteractions: number;
  isPeak: boolean;
}

export interface ProductBehaviorStat {
  productId: string;
  productName: string;
  category: string;
  views: number;
  addToCartCount: number;
  purchaseCount: number;
  viewToCartRatePercent: number;
  viewToPurchaseRatePercent: number;
  revenueSar: number;
}

export interface SearchTermStat {
  term: string;
  count: number;
}

export interface CategoryBehaviorStat {
  category: string;
  views: number;
  addToCartCount: number;
  sharePercent: number;
}

export interface DeviceBehaviorStat {
  device: 'mobile' | 'desktop' | 'tablet';
  labelAr: string;
  eventsCount: number;
  percentage: number;
}

export interface BehaviorRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'info';
  titleAr: string;
  detailAr: string;
  actionAr: string;
}

export interface AdminBehaviorAnalyticsReport {
  range: BehaviorTimeRange;
  generatedAt: string;
  gaStatus: {
    library: 'react-ga4';
    measurementIdConfigured: boolean;
    measurementIdMasked: string | null;
    firstPartyCollectorActive: boolean;
  };
  summary: {
    totalEvents: number;
    uniqueSessions: number;
    pageViews: number;
    productViews: number;
    addToCartCount: number;
    checkoutCount: number;
    purchaseCount: number;
    viewToCartRatePercent: number;
    conversionRatePercent: number;
    peakHour: number;
    peakHourLabel: string;
    peakHourEvents: number;
  };
  hourlyTraffic: HourlyBehaviorStat[];
  topViewedProducts: ProductBehaviorStat[];
  categoryInterest: CategoryBehaviorStat[];
  topSearchTerms: SearchTermStat[];
  deviceBreakdown: DeviceBehaviorStat[];
  recommendations: BehaviorRecommendation[];
}

export type AdminModificationCategory =
  | 'price_change'
  | 'stock_update'
  | 'permission_change'
  | 'product_catalog'
  | 'settings_update';

export interface AdminModificationLogEntry {
  id: string;
  category: AdminModificationCategory;
  actionLabelAr: string;
  targetType: 'product' | 'role' | 'feature_flag' | 'store_settings' | 'order';
  targetId: string;
  targetName: string;
  fieldLabelAr: string;
  previousValue: string;
  newValue: string;
  summaryAr: string;
  actorUid: string;
  actorName: string;
  actorEmailMasked: string;
  actorRole: string;
  ipAddress: string;
  createdAt: string;
}

export interface AdminModificationLogsResponse {
  logs: AdminModificationLogEntry[];
  summary: {
    total: number;
    priceChanges: number;
    stockUpdates: number;
    permissionChanges: number;
    otherChanges: number;
  };
}

export type AmazonSaCategoryKey =
  | 'all'
  | 'electronics'
  | 'mobiles'
  | 'home_kitchen'
  | 'gaming'
  | 'watches_perfumes';

export type AmazonSaFulfillmentType =
  | 'prime_riyadh'
  | 'amazon_sa_warehouse'
  | 'global_store_sa';

export type AmazonSaImageKey =
  | 'hero'
  | 'laptop'
  | 'audio'
  | 'home'
  | 'watch_gaming';

export interface AmazonSaProduct {
  asin: string;
  id: string;
  title: string;
  titleEn: string;
  brand: string;
  category: Exclude<AmazonSaCategoryKey, 'all'>;
  categoryLabelAr: string;
  categoryLabelEn: string;
  priceSar: number;
  listPriceSar?: number;
  discountPercent?: number;
  rating: number;
  reviewCount: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  availabilityTextAr: string;
  availabilityTextEn: string;
  stockCount: number;
  isPrime: boolean;
  fulfillment: AmazonSaFulfillmentType;
  deliveryEstimateAr: string;
  deliveryEstimateEn: string;
  sellerName: string;
  amazonUrl: string;
  imageKey: AmazonSaImageKey;
  imageUrl?: string;
  highlightsAr: string[];
  highlightsEn: string[];
  specifications: SpecificationItem[];
  lastSyncedAt: string;
}

export interface AmazonSaCatalogResponse {
  items: AmazonSaProduct[];
  totalCount: number;
  availableBrands: string[];
  priceBounds: {
    minSar: number;
    maxSar: number;
  };
  categoryCounts: Record<AmazonSaCategoryKey, number>;
  syncedAt: string;
  cacheHit: boolean;
  integrationMode: 'paapi_live' | 'catalog_proxy';
}

export interface MerchantRatingEntry {
  id: string;
  brandSlug: string;
  brandName: string;
  reviewerName: string;
  prepSpeedRating: number;
  packagingQualityRating: number;
  overallRating: number;
  comment?: string;
  orderNumber?: string;
  verifiedOrder: boolean;
  createdAt: string;
}

export interface MerchantRatingSummary {
  brandSlug: string;
  ratingsCount: number;
  avgPrepSpeed: number;
  avgPackagingQuality: number;
  avgOverall: number;
  reviews: MerchantRatingEntry[];
}



