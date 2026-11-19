import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  TrendingUp, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Truck, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  Search,
  Eye,
  Save,
  Video,
  RotateCcw,
  AlertCircle,
  Flame,
  Palette,
  BellRing,
  TrendingDown,
  FileCode2,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  RefreshCw,
  Download,
  ToggleLeft,
  ToggleRight,
  UserCog,
  Activity,
  Table2,
  QrCode,
} from 'lucide-react';
import {
  Product,
  Order,
  AdminStats,
  StoreSettings,
  Category,
  CurrencyCode,
  ReturnRequest,
  ReturnRequestStatus,
  FlashOfferConfig,
  PriceDropAlert,
  AuthUserRole,
  MasterPromptMetadata,
  MasterPromptAuditEntry,
  SecurityAlertRecord,
  isPromoterAdminRole
} from '../types';
import { formatPrice } from '../utils/currency';
import { AdminFlashOfferManager } from './AdminFlashOfferManager';
import { AdminAnalyticsCharts } from './AdminAnalyticsCharts';
import { AdminPerformanceMonitor } from './AdminPerformanceMonitor';
import { AdminSecurityAlerts } from './AdminSecurityAlerts';
import { AdminBehaviorAnalytics } from './AdminBehaviorAnalytics';
import { ShippingWaybillModal } from './ShippingWaybillModal';
import { LazyImage } from './LazyImage';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProductStock: (id: string, newStock: number) => void;
  onUpdateProductPrice?: (id: string, newPrice: number) => void;
  onUpdateProductVideo?: (id: string, videoUrl: string, videoTitle?: string) => void;
  onDeleteProduct: (id: string) => void;
  priceAlerts?: PriceDropAlert[];
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  returnRequests?: ReturnRequest[];
  onUpdateReturnStatus?: (returnId: string, status: ReturnRequestStatus, adminNote?: string) => void;
  flashOffer?: FlashOfferConfig;
  onSaveFlashOffer?: (updated: FlashOfferConfig) => void;
  stats: AdminStats;
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
  onOpenWhiteLabelStudio?: () => void;
  onOpenMasterPrompt?: () => void;
  authUserEmail?: string;
  adminRole?: AuthUserRole;
  originalAdminRole?: AuthUserRole;
  canAccessMasterPrompt?: boolean;
  masterPromptFeatureEnabled?: boolean;
  onCapabilitiesChanged?: () => Promise<void>;
  onSwitchRolePreview?: (targetRole: 'promoter_admin' | 'user_admin') => Promise<void>;
  onLockAdmin?: () => void;
  isAuthorized?: boolean;
}

const IMAGE_PRESETS = [
  { label: 'حاسوب / إلكترونيات', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80' },
  { label: 'ساعة ذكية', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80' },
  { label: 'سماعات رأس', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80' },
  { label: 'جهاز ألعاب', url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1000&q=80' },
  { label: 'منزل ذكي', url: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=80' },
  { label: 'إكسسوارات', url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=80' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  products,
  onAddProduct,
  onUpdateProductStock,
  onUpdateProductPrice,
  onUpdateProductVideo,
  onDeleteProduct,
  priceAlerts = [],
  orders,
  onUpdateOrderStatus,
  returnRequests = [],
  onUpdateReturnStatus,
  flashOffer,
  onSaveFlashOffer,
  stats,
  settings,
  onSaveSettings,
  onOpenWhiteLabelStudio,
  onOpenMasterPrompt,
  authUserEmail,
  adminRole = 'user_admin',
  originalAdminRole,
  canAccessMasterPrompt = false,
  masterPromptFeatureEnabled = true,
  onCapabilitiesChanged,
  onSwitchRolePreview,
  onLockAdmin,
  isAuthorized = false,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'behavior-analytics' | 'performance' | 'security-alerts' | 'products' | 'orders' | 'returns' | 'flash-offer' | 'customers' | 'settings' | 'master-prompt'>('analytics');
  const [returnFilter, setReturnFilter] = useState<'all' | ReturnRequestStatus>('all');
  const [returnAdminNotes, setReturnAdminNotes] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  // Live Security Alerts State
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [latestUnreadAlert, setLatestUnreadAlert] = useState<SecurityAlertRecord | null>(null);
  const [securityBannerEnabled, setSecurityBannerEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rawaj-admin-compact-mode') === '1';
    } catch {
      return false;
    }
  });
  const [waybillOrder, setWaybillOrder] = useState<Order | null>(null);

  // Server-fetched Master Prompt Vault State (promoter_admin ONLY)
  const isPromoterAdmin = isPromoterAdminRole(adminRole);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptContent, setPromptContent] = useState<string | null>(null);
  const [promptMeta, setPromptMeta] = useState<MasterPromptMetadata | null>(null);
  const [promptError, setPromptError] = useState<{ status?: number; code?: string; message: string; accessRefId?: string } | null>(null);
  const [promptAuditLogs, setPromptAuditLogs] = useState<MasterPromptAuditEntry[]>([]);
  const [vaultBusy, setVaultBusy] = useState(false);
  const [roleSwitching, setRoleSwitching] = useState(false);

  // New Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<Category>('electronics');
  const [newProdPrice, setNewProdPrice] = useState<number>(999);
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState<number>(1199);
  const [newProdStock, setNewProdStock] = useState<number>(20);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImageUrl, setNewProdImageUrl] = useState('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80');
  const [newProdVideoUrl, setNewProdVideoUrl] = useState('');
  const [newProdVideoTitle, setNewProdVideoTitle] = useState('');
  const [editingVideoProductId, setEditingVideoProductId] = useState<string | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [editVideoTitle, setEditVideoTitle] = useState('');
  const [editingPriceProductId, setEditingPriceProductId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [customSpecs, setCustomSpecs] = useState<{ key: string; value: string }[]>([
    { key: 'الضمان', value: 'سنتان وكيل محلي' },
    { key: 'حالة المنتج', value: 'جديد بكرتونه الاصلي' }
  ]);

  // Editable settings state
  const [editableSettings, setEditableSettings] = useState<StoreSettings>(settings);

  const loadMasterPromptVault = useCallback(async () => {
    if (!isPromoterAdmin) {
      setPromptContent(null);
      setPromptMeta(null);
      setPromptAuditLogs([]);
      return;
    }
    setPromptLoading(true);
    setPromptError(null);
    try {
      const [promptRes, auditRes] = await Promise.all([
        fetch('/api/admin/master-prompt', { cache: 'no-store' }),
        fetch('/api/admin/master-prompt/audit?limit=30', { cache: 'no-store' }),
      ]);
      const promptData = await promptRes.json().catch(() => ({}));
      if (!promptRes.ok) {
        setPromptContent(null);
        setPromptMeta(null);
        setPromptError({
          status: promptRes.status,
          code: promptData.code || 'ACCESS_DENIED',
          message: promptData.error || 'غير مصرح بعرض البرومبت الهندسي.',
          accessRefId: promptData.accessRefId,
        });
      } else {
        setPromptContent(typeof promptData.prompt === 'string' ? promptData.prompt : null);
        setPromptMeta(promptData.metadata || null);
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json().catch(() => ({}));
        setPromptAuditLogs(Array.isArray(auditData.entries) ? auditData.entries : []);
        if (!promptRes.ok && auditData.metadata) {
          setPromptMeta(auditData.metadata);
        }
      }
    } catch {
      setPromptContent(null);
      setPromptError({
        status: 500,
        code: 'NETWORK_ERROR',
        message: 'تعذر الاتصال بخادم الخزنة الآمنة للبرومبت الهندسي.',
      });
    } finally {
      setPromptLoading(false);
    }
  }, [isPromoterAdmin]);

  // Wipe secret prompt from client memory immediately whenever modal closes or role is downgraded to user_admin
  useEffect(() => {
    if (!isOpen || !isAuthorized || !isPromoterAdmin) {
      setPromptContent(null);
      setPromptMeta(null);
      setPromptAuditLogs([]);
      setPromptError(null);
      setPromptCopied(false);
      if (activeTab === 'master-prompt') {
        setActiveTab('analytics');
      }
    }
  }, [isOpen, isAuthorized, isPromoterAdmin, activeTab]);

  useEffect(() => {
    if (isOpen && isAuthorized && isPromoterAdmin && activeTab === 'master-prompt') {
      void loadMasterPromptVault();
    }
  }, [isOpen, isAuthorized, isPromoterAdmin, activeTab, loadMasterPromptVault]);

  const pollSecurityAlertsSummary = useCallback(async () => {
    if (!isOpen || !isAuthorized) return;
    try {
      const res = await fetch('/api/admin/security-alerts', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadAlertsCount(Number(data.unreadCount || 0));
      setSecurityBannerEnabled(Boolean(data?.settings?.dashboardEnabled ?? true));
      const unread = Array.isArray(data.alerts)
        ? (data.alerts as SecurityAlertRecord[]).find((a) => a.status === 'unread') || null
        : null;
      setLatestUnreadAlert(unread);
    } catch {
      // Ignore transient polling error
    }
  }, [isOpen, isAuthorized]);

  useEffect(() => {
    if (!isOpen || !isAuthorized) return;
    void pollSecurityAlertsSummary();
    const timer = setInterval(() => {
      void pollSecurityAlertsSummary();
    }, 30_000);
    return () => clearInterval(timer);
  }, [isOpen, isAuthorized, pollSecurityAlertsSummary]);

  if (!isOpen || !isAuthorized) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleCompactMode = (next: boolean) => {
    setCompactMode(next);
    try {
      localStorage.setItem('rawaj-admin-compact-mode', next ? '1' : '0');
    } catch {
      // Ignore storage quota errors
    }
    showToast(
      next
        ? 'تم تفعيل الوضع المدمج: إخفاء الرسوم الكبيرة وعرض جداول المبيعات التفصيلية'
        : 'تمت العودة إلى وضع الرسوم البيانية التفاعلية'
    );
  };

  const handleAddSpec = () => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      setCustomSpecs([...customSpecs, { key: newSpecKey.trim(), value: newSpecValue.trim() }]);
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };

  const handleRemoveSpec = (index: number) => {
    setCustomSpecs(customSpecs.filter((_, idx) => idx !== index));
  };

  const handleCreateProduct = () => {
    if (!newProdName.trim()) {
      showToast('❌ يرجى أدخال اسم المنتج');
      return;
    }

    const categoryNames: Record<Category, string> = {
      all: 'عام',
      electronics: 'إلكترونيات وحواسيب',
      accessories: 'ساعات وإكسسوارات',
      gaming: 'عالم الألعاب',
      home: 'المنزل الذكي',
      fashion: 'أزياء ومستلزمات'
    };

    const trimmedVideo = newProdVideoUrl.trim();
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: newProdName,
      category: newProdCategory,
      categoryNameAr: categoryNames[newProdCategory],
      price: Number(newProdPrice) || 0,
      originalPrice: newProdOriginalPrice > newProdPrice ? Number(newProdOriginalPrice) : undefined,
      rating: 5.0,
      reviewCount: 1,
      description: newProdDesc || 'منتج عالي الجودة متوفر بمستودعات متجر رواج.',
      images: [newProdImageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=80'],
      ...(trimmedVideo
        ? {
            videoUrl: trimmedVideo,
            demoVideo: {
              url: trimmedVideo,
              title: newProdVideoTitle.trim() || `فيديو توضيحي: ${newProdName}`,
              thumbnail: newProdImageUrl || undefined,
            },
          }
        : {}),
      stock: Number(newProdStock) || 1,
      badge: newProdOriginalPrice > newProdPrice ? 'عرض خاص' : undefined,
      specifications: customSpecs,
      reviews: []
    };

    onAddProduct(newProd);
    showToast(`✅ تمت إضافة المنتج "${newProd.name}" بنجاح!`);
    setIsAddProductOpen(false);
    setNewProdName('');
    setNewProdDesc('');
    setNewProdVideoUrl('');
    setNewProdVideoTitle('');
    setNewProdPrice(999);
  };

  const totalRevenueCalc = orders.reduce((sum, o) => sum + o.total, 0) + stats.totalSales;
  const pendingReturnsCount = returnRequests.filter((r) => r.status === 'pending' || r.status === 'reviewing').length;
  const filteredReturnRequests =
    returnFilter === 'all' ? returnRequests : returnRequests.filter((r) => r.status === returnFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full h-[88vh] shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Admin Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#551465]/20 border border-[#551465]/40 flex items-center justify-center text-brand-300">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>لوحة تحكم إدارة متجر رواج</span>
                <span className="text-[10px] bg-[#551465]/30 text-brand-300 border border-[#551465]/40 px-2 py-0.5 rounded-full font-bold">إدارة المنتجات والعملات</span>
              </h2>
              <span className="text-[10px] text-slate-400">إدارة المنتجات، المخزون، الطلبات، ودعم الريال اليمني (YER)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold ${
                isPromoterAdmin
                  ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-200'
                  : 'bg-sky-950/70 border-sky-500/40 text-sky-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isPromoterAdmin ? 'أدمن المروّج (promoter_admin)' : 'أدمن المتجر (user_admin)'}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={compactMode}
              onClick={() => {
                const next = !compactMode;
                handleToggleCompactMode(next);
                if (next && activeTab !== 'analytics') {
                  setActiveTab('analytics');
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
                compactMode
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="مفتاح تبديل الوضع المدمج لإخفاء الرسوم البيانية وعرض جداول المبيعات الكثيفة"
            >
              <Table2 className={`w-3.5 h-3.5 ${compactMode ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>الوضع المدمج</span>
              <span
                aria-hidden="true"
                className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                  compactMode ? 'bg-emerald-500 justify-start' : 'bg-slate-600 justify-end'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-white shadow-sm block" />
              </span>
            </button>
            {originalAdminRole === 'promoter_admin' && onSwitchRolePreview && (
              <button
                type="button"
                disabled={roleSwitching}
                onClick={async () => {
                  setRoleSwitching(true);
                  try {
                    const nextRole = isPromoterAdmin ? 'user_admin' : 'promoter_admin';
                    await onSwitchRolePreview(nextRole);
                    showToast(
                      nextRole === 'user_admin'
                        ? 'تم تفعيل معاينة أدمن المستخدم (user_admin) — تم إخفاء البرومبت الهندسي بالكامل'
                        : 'تمت العودة إلى صلاحية أدمن المروّج (promoter_admin)'
                    );
                  } finally {
                    setRoleSwitching(false);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                title="تبديل جلسة الخادم للمعاينة والتحقق من عزل الصلاحيات"
              >
                <UserCog className="w-3.5 h-3.5 text-amber-400" />
                <span>{isPromoterAdmin ? 'معاينة كـ user_admin' : 'عودة لـ promoter_admin'}</span>
              </button>
            )}
            {authUserEmail && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono" dir="ltr">{authUserEmail}</span>
              </span>
            )}
            {onLockAdmin && (
              <button
                type="button"
                onClick={onLockAdmin}
                className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                title="قفل لوحة الإدارة وتسجيل الخروج"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروج آمن</span>
              </button>
            )}
            {onOpenWhiteLabelStudio && (
              <button
                type="button"
                onClick={onOpenWhiteLabelStudio}
                className="px-3 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">استوديو تطبيق باسمك وشعارك</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-emerald-500 text-slate-950 font-extrabold px-4 py-2 rounded-xl shadow-xl border border-emerald-300 animate-bounce text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 flex gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>التقارير والإحصائيات</span>
          </button>

          <button
            onClick={() => setActiveTab('behavior-analytics')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'behavior-analytics'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <span>سلوك المستخدمين (GA4)</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'performance'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>مراقبة الأداء والـ API</span>
          </button>

          <button
            onClick={() => setActiveTab('security-alerts')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'security-alerts'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BellRing className="w-4 h-4 text-rose-400" />
            <span>الأمان والتنبيهات</span>
            {unreadAlertsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full tabular-nums">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>إدارة دليل المنتجات ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>إدارة الطلبات الشاملة ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'returns'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>الاسترجاعات ({returnRequests.length})</span>
            {pendingReturnsCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full tabular-nums">
                {pendingReturnsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('flash-offer')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'flash-offer'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>العرض الخاص والمؤقت</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'customers'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>دليل العملاء (62)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-[#551465] text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إعدادات المتجر</span>
          </button>

          {/* Server-Driven RBAC: Omitted completely from DOM when role !== promoter_admin */}
          {isPromoterAdmin && (
            <button
              onClick={() => setActiveTab('master-prompt')}
              className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                activeTab === 'master-prompt'
                  ? 'border-[#551465] text-brand-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-4 h-4 text-indigo-400" />
              <span>البرومبت الهندسي المعتمد</span>
            </button>
          )}
        </div>

        {/* Live Suspicious Activity Notification Strip */}
        {unreadAlertsCount > 0 && securityBannerEnabled && activeTab !== 'security-alerts' && latestUnreadAlert && (
          <div className="bg-rose-950/50 border-b border-rose-500/40 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-100">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-extrabold">تنبيه أمني ({unreadAlertsCount}):</span>
              <span className="text-rose-200 truncate max-w-xl">{latestUnreadAlert.titleAr}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('security-alerts')}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition whitespace-nowrap shrink-0"
            >
              معاينة واستجابة سريعة
            </button>
          </div>
        )}

        {/* Tab: Google Analytics User Behavior & Peak Hours */}
        {activeTab === 'behavior-analytics' && (
          <AdminBehaviorAnalytics
            isActive={activeTab === 'behavior-analytics'}
            settings={settings}
          />
        )}

        {/* Tab: API Performance, Security Adoption & Bottleneck Monitor */}
        {activeTab === 'performance' && (
          <AdminPerformanceMonitor isActive={activeTab === 'performance'} />
        )}

        {/* Tab: Security Center, Suspicious Activity Alerts & Admin Modifications Log */}
        {activeTab === 'security-alerts' && (
          <AdminSecurityAlerts
            isActive={activeTab === 'security-alerts'}
            isPromoterAdmin={isPromoterAdmin}
            onAlertsUpdated={(count, latest, enabled) => {
              setUnreadAlertsCount(count);
              setLatestUnreadAlert(latest);
              setSecurityBannerEnabled(enabled);
            }}
            onToast={showToast}
          />
        )}

        {/* Tab: Flash Offer Manager */}
        {activeTab === 'flash-offer' && flashOffer && onSaveFlashOffer && (
          <AdminFlashOfferManager
            flashOffer={flashOffer}
            products={products}
            settings={settings}
            onSaveFlashOffer={onSaveFlashOffer}
            onSavedToast={showToast}
          />
        )}

        {/* Tab 1: Analytics & Reports */}
        {activeTab === 'analytics' && (
          <div className={`flex-1 overflow-y-auto ${compactMode ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}>
            {/* KPI Cards */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 ${compactMode ? 'gap-2.5' : 'gap-4'}`}>
              <div className={`bg-slate-950 border border-slate-800 ${compactMode ? 'p-3 rounded-xl space-y-0.5' : 'p-4 rounded-2xl space-y-1'}`}>
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>إجمالي مبيعات المتجر</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <span className={`${compactMode ? 'text-base' : 'text-xl'} font-extrabold text-white font-mono tabular-nums block`}>
                  {totalRevenueCalc.toLocaleString()} ر.س
                </span>
                {!compactMode && (
                  <span className="text-[10px] text-emerald-400 font-medium">+18.4% عن الشهر السابق</span>
                )}
              </div>

              <div className={`bg-slate-950 border border-slate-800 ${compactMode ? 'p-3 rounded-xl space-y-0.5' : 'p-4 rounded-2xl space-y-1'}`}>
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>إجمالي عدد الطلبات</span>
                  <ShoppingBag className="w-4 h-4 text-teal-400" />
                </div>
                <span className={`${compactMode ? 'text-base' : 'text-xl'} font-extrabold text-white font-mono tabular-nums block`}>
                  {stats.ordersCount + orders.length} طلب
                </span>
                {!compactMode && (
                  <span className="text-[10px] text-teal-400 font-medium">معدل تنفيذ 98.2%</span>
                )}
              </div>

              <div className={`bg-slate-950 border border-slate-800 ${compactMode ? 'p-3 rounded-xl space-y-0.5' : 'p-4 rounded-2xl space-y-1'}`}>
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>العملاء المسجلون</span>
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <span className={`${compactMode ? 'text-base' : 'text-xl'} font-extrabold text-white font-mono tabular-nums block`}>
                  {stats.customersCount} عميل
                </span>
                {!compactMode && (
                  <span className="text-[10px] text-amber-400 font-medium">عملاء نشطون هذا الشهر</span>
                )}
              </div>

              <div className={`bg-slate-950 border border-slate-800 ${compactMode ? 'p-3 rounded-xl space-y-0.5' : 'p-4 rounded-2xl space-y-1'}`}>
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>المنتجات النشطة في الكتالوج</span>
                  <Package className="w-4 h-4 text-indigo-400" />
                </div>
                <span className={`${compactMode ? 'text-base' : 'text-xl'} font-extrabold text-white font-mono tabular-nums block`}>
                  {products.length} منتج
                </span>
                {!compactMode && (
                  <span className="text-[10px] text-indigo-400 font-medium">جميع المنتجات متوفرة</span>
                )}
              </div>
            </div>

            {/* Interactive Recharts Analytics: Daily Sales Trends, Monthly Profits & Category Breakdown */}
            <AdminAnalyticsCharts
              stats={stats}
              orders={orders}
              products={products}
              returnRequests={returnRequests}
              settings={settings}
              exportedBy={authUserEmail}
              exporterRole={adminRole}
              onExportToast={showToast}
              compactMode={compactMode}
              onToggleCompactMode={handleToggleCompactMode}
            />
          </div>
        )}

        {/* Tab 2: Products Manager */}
        {activeTab === 'products' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">إدارة دليل المنتجات وتحديث الكميات:</h3>
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="bg-[#551465] hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow border border-brand-500/30"
              >
                <Plus className="w-4 h-4 text-brand-200" />
                <span>إضافة منتج جديد</span>
              </button>
            </div>

            {/* Add product modal subform */}
            {isAddProductOpen && (
              <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 space-y-4 text-xs shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-extrabold text-emerald-400 text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>إضافة منتج جديد وتفاصيل المواصفات والصور</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">جميع الحقول تفاعلية ومجهزة للعرض المباشر</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم المنتج *</label>
                    <input
                      type="text"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder="مثال: حاسوب محمول رواج برو"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">التصنيف الرئيسي *</label>
                    <select
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value as Category)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="electronics">حواسيب وإلكترونيات</option>
                      <option value="accessories">ساعات وإكسسوارات</option>
                      <option value="gaming">عالم الألعاب</option>
                      <option value="home">المنزل الذكي</option>
                      <option value="fashion">أزياء ومستلزمات</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الكمية والمخزون *</label>
                    <input
                      type="number"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Pricing & Currency Conversion Live Preview */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">السعر بالريال السعودي (ر.س) *</label>
                      <input
                        type="number"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">السعر السابق قبل الخصم (اختياري)</label>
                      <input
                        type="number"
                        value={newProdOriginalPrice}
                        onChange={(e) => setNewProdOriginalPrice(Number(e.target.value))}
                        placeholder="السعر قبل الخصم..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>

                  {/* Live Currency Calculation Badge */}
                  <div className="pt-2 flex items-center justify-between text-[11px] bg-slate-950 p-2.5 rounded-lg border border-[#551465]/40 text-slate-300">
                    <span className="font-bold text-brand-300">معاينة تحويل العملة للمنتج:</span>
                    <div className="flex items-center gap-3">
                      <span>🇸🇦 <strong className="text-white">{newProdPrice.toLocaleString()}</strong> ر.س</span>
                      <span className="text-amber-400 font-extrabold">🇾🇪 <strong>{formatPrice(newProdPrice, 'YER', settings.yerExchangeRate)}</strong></span>
                      <span className="text-emerald-400 font-bold">🇺🇸 <strong>{formatPrice(newProdPrice, 'USD')}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Image Selection & URL */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">صورة المنتج الرئيسية (اختر نموذج أو ادخل رابط خاص):</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {IMAGE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewProdImageUrl(preset.url)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
                          newProdImageUrl === preset.url
                            ? 'bg-[#551465] text-white font-bold border border-brand-300'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newProdImageUrl}
                    onChange={(e) => setNewProdImageUrl(e.target.value)}
                    placeholder="رابط صورة المنتـج (Image URL)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs font-mono"
                  />
                </div>

                {/* Product Demonstration Video URL & Title */}
                <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-2">
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Video className="w-4 h-4 text-brand-300" />
                    <span>فيديو الشرح التقني للمنتج (اختياري - MP4 / YouTube / Vimeo):</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newProdVideoUrl}
                      onChange={(e) => setNewProdVideoUrl(e.target.value)}
                      placeholder="https://... أو /videos/demo_laptop_pro.mp4"
                      dir="ltr"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={newProdVideoTitle}
                      onChange={(e) => setNewProdVideoTitle(e.target.value)}
                      placeholder="عنوان الفيديو التوضيحي (مثال: استعراض الأداء والتصميم)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { label: 'فيديو حاسوب', url: '/videos/demo_laptop_pro.mp4' },
                      { label: 'فيديو ساعة', url: '/videos/demo_smartwatch_ultra.mp4' },
                      { label: 'فيديو سماعات', url: '/videos/demo_headphones_max.mp4' },
                    ].map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setNewProdVideoUrl(preset.url)}
                        className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specifications Builder */}
                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold">مواصفات المنتج الفنية (جدول المواصفات):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="اسم الخاصية (مثال: الذاكرة)"
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                    <input
                      type="text"
                      placeholder="القيمة (مثال: 16 جيجابايت)"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      className="bg-slate-800 hover:bg-slate-700 text-brand-300 font-bold px-3 py-2 rounded-lg"
                    >
                      + إضافة
                    </button>
                  </div>

                  {customSpecs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {customSpecs.map((spec, idx) => (
                        <span key={idx} className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded-md text-[11px] flex items-center gap-1">
                          <strong>{spec.key}:</strong> {spec.value}
                          <button onClick={() => handleRemoveSpec(idx)} className="text-rose-400 hover:text-rose-300 mr-1 font-bold">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الوصف المختصر والتفاصيل</label>
                  <textarea
                    rows={2}
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="وصف مميزات المنتج الضمان وجودة التصنيع..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setIsAddProductOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCreateProduct}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-2 rounded-xl shadow-lg flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ ونشر المنتج فوراً</span>
                  </button>
                </div>
              </div>
            )}

            {/* Products Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                    <th className="p-3">المنتج</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3">السعر الحالي</th>
                    <th className="p-3">المخزون المتوفر</th>
                    <th className="p-3">فيديو الشرح</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => {
                    const currentVideoUrl = p.demoVideo?.url || p.videoUrl || '';
                    const isEditingVideo = editingVideoProductId === p.id;
                    const isEditingPrice = editingPriceProductId === p.id;
                    const hasActiveAlert = priceAlerts.some(
                      (a) => a.isActive && a.productId === p.id
                    );
                    return (
                      <React.Fragment key={p.id}>
                        <tr className="text-slate-200 hover:bg-slate-900/30">
                          <td className="p-3 flex items-center gap-2">
                            <LazyImage
                              src={p.images[0]}
                              alt={p.name}
                              sizeHint="thumb"
                              wrapperClassName="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-900 shrink-0"
                              className="w-full h-full object-cover"
                            />
                            <div>
                              <span className="font-bold text-white block">{p.name}</span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span>ID: {p.id}</span>
                                {hasActiveAlert && (
                                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                                    <BellRing className="w-3 h-3" />
                                    <span>مراقب للسعر</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400">{p.categoryNameAr}</td>
                          <td className="p-3 font-bold text-emerald-400">
                            {isEditingPrice && onUpdateProductPrice ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  value={editPriceValue}
                                  onChange={(e) => setEditPriceValue(e.target.value)}
                                  className="w-20 bg-slate-900 border border-emerald-500/60 rounded px-2 py-1 text-center font-bold text-white tabular-nums"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const parsed = Number(editPriceValue);
                                    if (Number.isFinite(parsed) && parsed > 0) {
                                      onUpdateProductPrice(p.id, parsed);
                                      setEditingPriceProductId(null);
                                      showToast(
                                        parsed < p.price
                                          ? '✅ تم تخفيض السعر وإرسال تنبيه للمشتركين'
                                          : '✅ تم تحديث سعر المنتج بنجاح'
                                      );
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px]"
                                >
                                  حفظ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPriceProductId(null)}
                                  className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums">
                                  {formatPrice(p.price, settings.activeCurrency, settings.yerExchangeRate)}
                                </span>
                                {onUpdateProductPrice && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPriceProductId(p.id);
                                        setEditPriceValue(String(p.price));
                                      }}
                                      title="تعديل السعر"
                                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const reduced = Math.max(1, Math.round(p.price * 0.9));
                                        onUpdateProductPrice(p.id, reduced);
                                        showToast(`📉 تم تخفيض "${p.name}" بنسبة 10%`);
                                      }}
                                      title="تخفيض سريع -10%"
                                      className="px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-0.5 transition"
                                    >
                                      <TrendingDown className="w-3 h-3" />
                                      <span>-10%</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={p.stock}
                                onChange={(e) => onUpdateProductStock(p.id, Number(e.target.value))}
                                className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center font-bold text-white"
                              />
                              <span className="text-slate-500 text-[10px]">قطعة</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingVideo) {
                                  setEditingVideoProductId(null);
                                } else {
                                  setEditingVideoProductId(p.id);
                                  setEditVideoUrl(currentVideoUrl);
                                  setEditVideoTitle(p.demoVideo?.title || '');
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
                                currentVideoUrl
                                  ? 'bg-[#551465]/25 border-[#551465]/60 text-brand-200 hover:bg-[#551465]/40'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>{currentVideoUrl ? 'تعديل الفيديو' : 'إضافة فيديو'}</span>
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => onDeleteProduct(p.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                              title="حذف المنتج"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {isEditingVideo && (
                          <tr className="bg-slate-900/70">
                            <td colSpan={6} className="p-3">
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input
                                  type="text"
                                  dir="ltr"
                                  value={editVideoUrl}
                                  onChange={(e) => setEditVideoUrl(e.target.value)}
                                  placeholder="رابط الفيديو (MP4 / YouTube / Vimeo) أو اتركه فارغاً للإزالة"
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                                />
                                <input
                                  type="text"
                                  value={editVideoTitle}
                                  onChange={(e) => setEditVideoTitle(e.target.value)}
                                  placeholder="عنوان الفيديو التوضيحي"
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs"
                                />
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onUpdateProductVideo) {
                                        onUpdateProductVideo(p.id, editVideoUrl, editVideoTitle);
                                      }
                                      setEditingVideoProductId(null);
                                      showToast('✅ تم تحديث فيديو المنتج بنجاح');
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs"
                                  >
                                    حفظ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingVideoProductId(null)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Orders Lifecycle Manager */}
        {activeTab === 'orders' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">قائمة وإحصائيات كافة الطلبات وتحديث حالتها:</h3>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                    <th className="p-3">رقم الطلب والتاريخ</th>
                    <th className="p-3">مستلم الشحنة</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3">المبلغ الإجمالي</th>
                    <th className="p-3">حالة الطلب الحالية</th>
                    <th className="p-3">بوليصة الشحن / QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-slate-200 hover:bg-slate-900/30">
                      <td className="p-3 font-mono">
                        <span className="font-bold text-emerald-400 block">{order.orderNumber}</span>
                        <span className="text-[10px] text-slate-500">{order.date}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{order.customer.fullName}</span>
                        <span className="text-[10px] text-slate-400">{order.customer.city} • {order.customer.phone}</span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {order.paymentMethod === 'card' && '💳 فيزا/ماستركارد'}
                        {order.paymentMethod === 'stc_pay' && '📱 محفظة رقمية'}
                        {order.paymentMethod === 'cod' && '💵 دفع عند الاستلام'}
                        {order.paymentMethod === 'tamara' && '⏳ تقسيط تمارا'}
                        {order.paymentMethod === 'apple_pay' && '🍏 Apple Pay'}
                      </td>
                      <td className="p-3 font-extrabold text-white">
                        {order.total.toLocaleString()} ر.س
                      </td>
                      <td className="p-3">
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as Order['status'])}
                          className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="pending">قيد الانتظار ⏳</option>
                          <option value="processing">جاري المعالجة 🔄</option>
                          <option value="shipped">جاري الشحن 🚚</option>
                          <option value="delivered">تم التوصيل ✅</option>
                          <option value="cancelled">ملغي ❌</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setWaybillOrder(order)}
                          className="min-h-[34px] px-3 py-1.5 rounded-lg bg-[#551465]/25 hover:bg-[#551465]/45 text-brand-200 border border-[#551465]/50 font-bold text-[11px] inline-flex items-center gap-1.5 whitespace-nowrap transition"
                        >
                          <QrCode className="w-3.5 h-3.5 text-brand-300" />
                          <span>إصدار بوليصة / QR</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3.5: Returns Management */}
        {activeTab === 'returns' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>إدارة طلبات الاسترجاع والاستبدال ({returnRequests.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  استعرض طلبات الاسترجاع الواردة من صفحة الطلبات، وحدّث حالتها أو أرسل رداً مباشراً للعميل.
                </p>
              </div>
            </div>

            {/* Returns Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">إجمالي الطلبات</span>
                <strong className="text-lg font-extrabold text-white tabular-nums">{returnRequests.length}</strong>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/30 space-y-1">
                <span className="text-amber-300 block">بانتظار المراجعة / الفحص</span>
                <strong className="text-lg font-extrabold text-amber-400 tabular-nums">{pendingReturnsCount}</strong>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/30 space-y-1">
                <span className="text-emerald-300 block">تمت الموافقة / مكتمل</span>
                <strong className="text-lg font-extrabold text-emerald-400 tabular-nums">
                  {returnRequests.filter((r) => r.status === 'approved' || r.status === 'completed').length}
                </strong>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">قيمة الاسترجاعات</span>
                <strong className="text-base font-extrabold text-brand-300 tabular-nums">
                  {formatPrice(
                    returnRequests.reduce((sum, r) => sum + r.refundAmount, 0),
                    settings.activeCurrency,
                    settings.yerExchangeRate
                  )}
                </strong>
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'pending', label: 'بانتظار المراجعة' },
                { id: 'reviewing', label: 'قيد الفحص' },
                { id: 'approved', label: 'مقبول' },
                { id: 'completed', label: 'مكتمل' },
                { id: 'rejected', label: 'مرفوض' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setReturnFilter(pill.id as 'all' | ReturnRequestStatus)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                    returnFilter === pill.id
                      ? 'bg-[#551465] text-white border-brand-500/40'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Return Requests List */}
            {filteredReturnRequests.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
                <RotateCcw className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-300">لا توجد طلبات استرجاع ضمن هذا التصنيف حالياً</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReturnRequests.map((ret) => {
                  const noteDraft = returnAdminNotes[ret.id] ?? ret.adminNote ?? '';
                  const conditionLabels: Record<ReturnRequest['condition'], string> = {
                    unopened: 'مغلف بحالة المصنع',
                    opened_unused: 'مفتوح غير مستخدم',
                    defective: 'به عطل أو تلف',
                  };
                  const resolutionLabels: Record<ReturnRequest['resolution'], string> = {
                    refund: 'استرداد المبلغ',
                    exchange: 'استبدال بمنتج جديد',
                    store_credit: 'رصيد في محفظة المتجر',
                  };

                  return (
                    <div
                      key={ret.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4 text-xs"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <LazyImage
                            src={ret.productImage}
                            alt={ret.productName}
                            sizeHint="thumb"
                            wrapperClassName="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shrink-0"
                            className="w-full h-full object-cover"
                          />
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-extrabold text-brand-300 bg-[#551465]/20 px-2 py-0.5 rounded border border-[#551465]/40">
                                {ret.requestNumber}
                              </span>
                              <span className="font-mono text-[11px] text-emerald-400 font-bold">
                                طلب: {ret.orderNumber}
                              </span>
                              <span className="text-[10px] text-slate-500">{ret.createdAt}</span>
                            </div>
                            <h4 className="font-extrabold text-white text-sm truncate">{ret.productName}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                              <span>العميل: <strong className="text-slate-200">{ret.customerName}</strong></span>
                              <span className="font-mono">الجوال: <strong className="text-slate-200">{ret.customerPhone}</strong></span>
                              <span>الكمية: <strong className="text-white tabular-nums">{ret.quantity}</strong></span>
                              <span>المبلغ: <strong className="text-brand-300 tabular-nums">{formatPrice(ret.refundAmount, settings.activeCurrency, settings.yerExchangeRate)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Status Selector & Quick Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <select
                            value={ret.status}
                            onChange={(e) => {
                              const nextStatus = e.target.value as ReturnRequestStatus;
                              onUpdateReturnStatus?.(ret.id, nextStatus, noteDraft);
                              showToast(`✅ تم تحديث حالة طلب الاسترجاع ${ret.requestNumber}`);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#551465]"
                          >
                            <option value="pending">بانتظار المراجعة ⏳</option>
                            <option value="reviewing">قيد الفحص والتنسيق 🔍</option>
                            <option value="approved">تمت الموافقة ✅</option>
                            <option value="completed">مكتمل (تم التعويض) 🎉</option>
                            <option value="rejected">مرفوض ❌</option>
                          </select>

                          {ret.status !== 'approved' && ret.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => {
                                const defaultNote = noteDraft || 'تمت الموافقة على طلب الاسترجاع وجاري التنسيق للاستلام.';
                                setReturnAdminNotes((prev) => ({ ...prev, [ret.id]: defaultNote }));
                                onUpdateReturnStatus?.(ret.id, 'approved', defaultNote);
                                showToast(`✅ تمت الموافقة على طلب الاسترجاع ${ret.requestNumber}`);
                              }}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-3 py-2 rounded-xl text-[11px] transition"
                            >
                              موافقة سريعة
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-slate-900/70 p-3 rounded-xl border border-slate-800 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">سبب الاسترجاع:</span>
                          <strong className="text-white">{ret.reason}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">حالة المنتج:</span>
                          <strong className="text-slate-200">{conditionLabels[ret.condition]}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">التعويض المطلوب:</span>
                          <strong className="text-brand-300">{resolutionLabels[ret.resolution]}</strong>
                        </div>
                      </div>

                      {ret.notes && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-300">
                          <strong className="text-slate-200">ملاحظة العميل: </strong>
                          {ret.notes}
                        </div>
                      )}

                      {/* Admin Reply Note */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800/80">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) =>
                            setReturnAdminNotes((prev) => ({ ...prev, [ret.id]: e.target.value }))
                          }
                          placeholder="أضف رد الإدارة أو تعليمات الاستلام للعميل (يظهر مباشرة للعميل)..."
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#551465]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateReturnStatus?.(ret.id, ret.status, noteDraft);
                            showToast(`✅ تم حفظ رد الإدارة لطلب ${ret.requestNumber}`);
                          }}
                          className="bg-[#551465] hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shrink-0"
                        >
                          حفظ الرد للعميل
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Customers Directory */}
        {activeTab === 'customers' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">دليل وسجل عملاء متجر رواج:</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {orders.map((o) => (
                <div key={o.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{o.customer.fullName}</h4>
                      <span className="text-slate-400 block text-[11px]">{o.customer.email}</span>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                      عميل موثق
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-300">
                    <span>العنوان: {o.customer.city}، {o.customer.district}</span>
                    <span className="font-mono">{o.customer.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Settings */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-brand-300" />
              <span>إعدادات المتجر العامة وإدارة العملات أسعار الصرف:</span>
            </h3>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 max-w-xl shadow-xl">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المتجر الرسمي *</label>
                <input
                  type="text"
                  value={editableSettings.storeName}
                  onChange={(e) => setEditableSettings({ ...editableSettings, storeName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">رابط الشعار (Logo Image URL)</label>
                <input
                  type="text"
                  value={editableSettings.logoUrl || ''}
                  onChange={(e) => setEditableSettings({ ...editableSettings, logoUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="رابط صورة الشعار..."
                />
              </div>

              {/* Currency Settings Box */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-[#551465]/40 space-y-3">
                <h4 className="font-extrabold text-brand-200 text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>إعدادات العملات والتحويل المالي (دعم الريال اليمني YER):</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">العملة الافتراضية للمتجر</label>
                    <select
                      value={editableSettings.activeCurrency || 'SAR'}
                      onChange={(e) => {
                        const curr = e.target.value as CurrencyCode;
                        const symbolMap: Record<CurrencyCode, string> = { SAR: 'ر.س', YER: 'ر.ي', USD: '$' };
                        setEditableSettings({
                          ...editableSettings,
                          activeCurrency: curr,
                          storeCurrency: symbolMap[curr] || 'ر.س'
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-300 font-bold"
                    >
                      <option value="SAR">🇸🇦 الريال السعودي (ر.س)</option>
                      <option value="YER">🇾🇪 الريال اليمني (ر.ي)</option>
                      <option value="USD">🇺🇸 الدولار الأمريكي ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">سعر صرف الريال اليمني (مقابل 1 ر.س)</label>
                    <input
                      type="number"
                      value={editableSettings.yerExchangeRate || 670}
                      onChange={(e) => setEditableSettings({ ...editableSettings, yerExchangeRate: Number(e.target.value) })}
                      placeholder="670"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">1 ريال سعودي = {editableSettings.yerExchangeRate || 670} ريال يمني</span>
                  </div>
                </div>

                {/* Conversion Sample */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                  <span>مثال تحويل قيمة منتج بـ 100 ر.س:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {formatPrice(100, editableSettings.activeCurrency, editableSettings.yerExchangeRate)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white text-xs">معلومات التواصل والموقع:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">الموقع والجغرافيا</label>
                    <input
                      type="text"
                      value={editableSettings.location || 'اليمن، حضرموت'}
                      onChange={(e) => setEditableSettings({ ...editableSettings, location: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">البريد الإلكتروني المعتمد</label>
                    <input
                      type="email"
                      value={editableSettings.supportEmail || 'saad@rawajye.com'}
                      onChange={(e) => setEditableSettings({ ...editableSettings, supportEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">هاتف خدمة العملاء</label>
                    <input
                      type="text"
                      value={editableSettings.customerServicePhone || '733513128'}
                      onChange={(e) => setEditableSettings({ ...editableSettings, customerServicePhone: e.target.value, supportPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">هواتف الإدارة العامة</label>
                    <input
                      type="text"
                      value={editableSettings.adminPhone || '770600046/780080555'}
                      onChange={(e) => setEditableSettings({ ...editableSettings, adminPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">السجل التجاري (CR)</label>
                    <input
                      type="text"
                      value={editableSettings.commercialRegistration || ''}
                      onChange={(e) => setEditableSettings({ ...editableSettings, commercialRegistration: e.target.value })}
                      placeholder="يُترك فارغاً للإضافة لاحقاً"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">الرقم الضريبي (VAT)</label>
                    <input
                      type="text"
                      value={editableSettings.vatNumber || ''}
                      onChange={(e) => setEditableSettings({ ...editableSettings, vatNumber: e.target.value })}
                      placeholder="يُترك فارغاً للإضافة لاحقاً"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">رمز العملة المباشر</label>
                  <input
                    type="text"
                    value={editableSettings.storeCurrency}
                    onChange={(e) => setEditableSettings({ ...editableSettings, storeCurrency: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">نسبة ضريبة القيمة المضافة (%)</label>
                  <input
                    type="number"
                    value={editableSettings.vatPercentage}
                    onChange={(e) => setEditableSettings({ ...editableSettings, vatPercentage: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">حد الشحن المجاني (ر.س)</label>
                <input
                  type="number"
                  value={editableSettings.freeShippingThreshold}
                  onChange={(e) => setEditableSettings({ ...editableSettings, freeShippingThreshold: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <button
                onClick={() => {
                  onSaveSettings(editableSettings);
                  showToast('✅ تم حفظ جميع إعدادات المتجر والعملة بنجاح!');
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition text-xs"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات والتحديث الفوري</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab: Saved Master Engineering Prompt (Strictly Promoter Admin Only via Server Capabilities & Vault API) */}
        {activeTab === 'master-prompt' && isPromoterAdmin && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>خزنة البرومبت الهندسي المعتمد</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold">
                      AES-256-GCM Vault
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    مشفّر على الخادم ومقصور حصرياً على دور <span className="font-mono text-indigo-300">promoter_admin</span> ومخفي تماماً عن لوحة <span className="font-mono text-slate-300">user_admin</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={vaultBusy}
                  onClick={async () => {
                    setVaultBusy(true);
                    try {
                      const nextEnabled = !masterPromptFeatureEnabled;
                      const res = await fetch('/api/admin/master-prompt/feature', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enabled: nextEnabled }),
                      });
                      if (res.ok) {
                        if (onCapabilitiesChanged) await onCapabilitiesChanged();
                        await loadMasterPromptVault();
                        showToast(nextEnabled ? '✅ تم تفعيل ميزة البرومبت الهندسي' : '🔒 تم تعطيل عرض البرومبت الهندسي (403)');
                      }
                    } finally {
                      setVaultBusy(false);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition disabled:opacity-50 ${
                    masterPromptFeatureEnabled
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
                  }`}
                >
                  {masterPromptFeatureEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  <span>{masterPromptFeatureEnabled ? 'الميزة مفعّلة' : 'الميزة معطّلة'}</span>
                </button>

                <button
                  type="button"
                  disabled={vaultBusy}
                  onClick={async () => {
                    setVaultBusy(true);
                    try {
                      const res = await fetch('/api/admin/master-prompt/rotate-key', { method: 'POST' });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok) {
                        await loadMasterPromptVault();
                        showToast(`🔑 تم تدوير مفتاح التشفير إلى الإصدار v${data?.metadata?.keyVersion || ''}`);
                      } else {
                        showToast(data?.error || '❌ تعذر تدوير مفتاح التشفير');
                      }
                    } finally {
                      setVaultBusy(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>تدوير المفتاح</span>
                </button>

                <button
                  type="button"
                  disabled={vaultBusy}
                  onClick={async () => {
                    setVaultBusy(true);
                    try {
                      const res = await fetch('/api/admin/master-prompt/backup', { method: 'POST' });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.backup) {
                        const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `rawaj-master-prompt-backup-v${data.backup.keyVersion || 1}.enc.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        await loadMasterPromptVault();
                        showToast('💾 تم تصدير النسخة الاحتياطية المشفّرة والموقّعة');
                      } else {
                        showToast(data?.error || '❌ تعذر تصدير النسخة الاحتياطية');
                      }
                    } finally {
                      setVaultBusy(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>نسخة احتياطية مشفّرة</span>
                </button>

                {onOpenMasterPrompt && canAccessMasterPrompt && (
                  <button
                    type="button"
                    onClick={onOpenMasterPrompt}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span>عرض مستقل</span>
                  </button>
                )}

                {promptContent && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(promptContent);
                      setPromptCopied(true);
                      showToast('✅ تم نسخ البرومبت الهندسي المعتمد إلى الحافظة');
                      setTimeout(() => setPromptCopied(false), 2000);
                    }}
                    className={`px-4 py-2 rounded-xl font-extrabold flex items-center gap-1.5 transition ${
                      promptCopied
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                    }`}
                  >
                    {promptCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{promptCopied ? 'تم النسخ!' : 'نسخ البرومبت الكامل'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Keyring Metadata Strip */}
            {promptMeta && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block">إصدار مفتاح التشفير (DEK)</span>
                  <span className="font-mono font-bold text-indigo-300">v{promptMeta.keyVersion} ({promptMeta.keyId})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">خوارزمية التشفير</span>
                  <span className="font-mono font-bold text-emerald-300 uppercase">AES-256-GCM</span>
                </div>
                <div>
                  <span className="text-slate-400 block">معرّف الوصول المسجّل</span>
                  <span className="font-mono font-bold text-slate-200">{promptMeta.accessRefId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">التدوير الدوري القادم</span>
                  <span className="font-mono font-bold text-amber-300">
                    {promptMeta.nextRotationAt ? new Date(promptMeta.nextRotationAt).toLocaleDateString('ar-SA') : 'تلقائي كل 30 يوم'}
                  </span>
                </div>
              </div>
            )}

            {/* Prompt Viewer OR Safe Fallback UI */}
            {promptLoading ? (
              <div className="bg-slate-950 p-10 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-300">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="font-bold">جاري التحقق من الجلسة وفك التشفير من الخزنة...</p>
              </div>
            ) : promptError ? (
              <div className="bg-rose-950/20 border border-rose-500/40 rounded-2xl p-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-extrabold text-white">
                  {promptError.code === 'FEATURE_DISABLED'
                    ? 'عرض البرومبت الهندسي معطّل مؤقتاً (Feature Flag OFF)'
                    : `تم حجب الوصول (${promptError.status || 403})`}
                </h4>
                <p className="text-slate-300 text-xs">{promptError.message}</p>
                {promptError.accessRefId && (
                  <p className="text-[11px] font-mono text-rose-300">Audit Ref: {promptError.accessRefId}</p>
                )}
              </div>
            ) : promptContent ? (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-400 font-bold mb-3">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    <span>المستند الهندسي المرجعي للنظام (مفكوك التشفير لحظياً في الجلسة)</span>
                  </span>
                  <span className="font-mono text-slate-400" dir="ltr">
                    SHA256: {promptMeta?.checksumSha256?.slice(0, 16)}...
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-slate-200 leading-relaxed select-all">
                  {promptContent}
                </pre>
              </div>
            ) : null}

            {/* Audit Log Table (Never contains raw prompt text) */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>سجل التدقيق والوصول إلى البرومبت الهندسي (معرّف الوصول فقط دون أي نص خام)</span>
                </div>
                <button
                  type="button"
                  onClick={() => void loadMasterPromptVault()}
                  className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 font-bold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تحديث</span>
                </button>
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-right text-[11px]">
                  <thead className="bg-slate-900/90 text-slate-400">
                    <tr>
                      <th className="py-2 px-3">معرّف الوصول</th>
                      <th className="py-2 px-3">المستخدم</th>
                      <th className="py-2 px-3">الدور</th>
                      <th className="py-2 px-3">العملية</th>
                      <th className="py-2 px-3">الحالة</th>
                      <th className="py-2 px-3">المفتاح</th>
                      <th className="py-2 px-3">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {promptAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-500">
                          لا توجد سجلات وصول بعد.
                        </td>
                      </tr>
                    ) : (
                      promptAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-mono text-indigo-300">{log.accessRefId}</td>
                          <td className="py-2 px-3 font-mono text-slate-300" dir="ltr">{log.actorEmailMasked}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{log.actorRole}</td>
                          <td className="py-2 px-3 text-slate-200">{log.action}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                log.outcome === 'granted'
                                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {log.outcome} ({log.httpStatus})
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">v{log.keyVersion}</td>
                          <td className="py-2 px-3 font-mono text-slate-400" dir="ltr">
                            {new Date(log.createdAt).toLocaleString('en-GB')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <ShippingWaybillModal
        order={waybillOrder}
        settings={settings}
        onClose={() => setWaybillOrder(null)}
      />
    </div>
  );
};
