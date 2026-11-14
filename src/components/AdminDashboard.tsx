import React, { useState } from 'react';
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
  TrendingDown
} from 'lucide-react';
import { Product, Order, AdminStats, StoreSettings, Category, CurrencyCode, ReturnRequest, ReturnRequestStatus, FlashOfferConfig, PriceDropAlert } from '../types';
import { formatPrice } from '../utils/currency';
import { AdminFlashOfferManager } from './AdminFlashOfferManager';
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
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders' | 'returns' | 'flash-offer' | 'customers' | 'settings'>('analytics');
  const [returnFilter, setReturnFilter] = useState<'all' | ReturnRequestStatus>('all');
  const [returnAdminNotes, setReturnAdminNotes] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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

          <div className="flex items-center gap-2">
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
        </div>

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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>إجمالي مبيعات المتجر</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xl font-extrabold text-white block">
                  {totalRevenueCalc.toLocaleString()} ر.س
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">+18.4% عن الشهر السابق</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>إجمالي عدد الطلبات</span>
                  <ShoppingBag className="w-4 h-4 text-teal-400" />
                </div>
                <span className="text-xl font-extrabold text-white block">
                  {stats.ordersCount + orders.length} طلب
                </span>
                <span className="text-[10px] text-teal-400 font-medium">معدل تنفيذ 98.2%</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>العملاء المسجلون</span>
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xl font-extrabold text-white block">
                  {stats.customersCount} عميل
                </span>
                <span className="text-[10px] text-amber-400 font-medium">عملاء نشطون هذا الشهر</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-slate-400 text-xs">
                  <span>المنتجات النشطة في الكتالوج</span>
                  <Package className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-xl font-extrabold text-white block">
                  {products.length} منتج
                </span>
                <span className="text-[10px] text-indigo-400 font-medium">جميع المنتجات متوفرة</span>
              </div>
            </div>

            {/* Sales Monthly Graph Visualization */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white">رسم بياني لتطور الإيرادات والمبيعات الشهرية:</h4>
                <span className="text-xs text-slate-400">النصف الأول من 2026</span>
              </div>

              <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
                {stats.monthlyRevenue.map((m, idx) => {
                  const maxVal = 35000;
                  const heightPercent = Math.min(100, (m.sales / maxVal) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition">
                        {m.sales.toLocaleString()} ر.س
                      </span>
                      <div
                        className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-xl transition-all duration-500 group-hover:from-emerald-500 group-hover:to-teal-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[11px] text-slate-400 font-medium">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
      </div>
    </div>
  );
};
