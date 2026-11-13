import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  MessageSquare,
  Sparkles,
  ShoppingCart,
  Gift,
  PenTool,
  PackageCheck,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCw,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Box,
  Bell,
  BellRing,
  TrendingDown
} from 'lucide-react';
import {
  Product,
  ProductVariant,
  CartItem,
  StoreSettings,
  ProductVideo,
  BrowsingHistoryEntry,
  Order,
  PriceDropAlert,
} from '../types';
import { formatPrice } from '../utils/currency';
import { parseVideoSource, formatVideoTime } from '../utils/video';
import { calculateEarnedPoints } from '../utils/loyalty';
import { ProductARModal, getProductDimensions } from './ProductARModal';
import { LazyImage } from './LazyImage';
import { RecommendedProductsSection } from './RecommendedProductsSection';
import { ProductReviewsPanel } from './ProductReviewsPanel';

interface ProductDetailModalProps {
  product: Product | null;
  initialMediaMode?: 'images' | 'video';
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
  onOpenSellerChatWithProduct: (product: Product) => void;
  onAskAIAboutProduct: (product: Product) => void;
  isCompared?: boolean;
  onToggleCompare?: (productId: string) => void;
  settings?: StoreSettings;
  allProducts?: Product[];
  browsingHistory?: BrowsingHistoryEntry[];
  orders?: Order[];
  cartItems?: CartItem[];
  onSelectRecommendedProduct?: (product: Product) => void;
  onQuickAddRecommendedToCart?: (product: Product) => void;
  priceAlert?: PriceDropAlert;
  onTogglePriceAlert?: (product: Product, targetPrice?: number) => void;
  onAddReview?: (
    productId: string,
    review: { userName: string; rating: number; comment: string; images?: string[] }
  ) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  initialMediaMode = 'images',
  onClose,
  onAddToCart,
  onOpenSellerChatWithProduct,
  onAskAIAboutProduct,
  isCompared = false,
  onToggleCompare,
  settings,
  allProducts = [],
  browsingHistory = [],
  orders = [],
  cartItems = [],
  onSelectRecommendedProduct,
  onQuickAddRecommendedToCart,
  priceAlert,
  onTogglePriceAlert,
  onAddReview,
}) => {
  if (!product) return null;

  return (
    <ProductDetailContent
      key={`${product.id}-${initialMediaMode}`}
      product={product}
      initialMediaMode={initialMediaMode}
      onClose={onClose}
      onAddToCart={onAddToCart}
      onOpenSellerChatWithProduct={onOpenSellerChatWithProduct}
      onAskAIAboutProduct={onAskAIAboutProduct}
      isCompared={isCompared}
      onToggleCompare={onToggleCompare}
      settings={settings}
      allProducts={allProducts}
      browsingHistory={browsingHistory}
      orders={orders}
      cartItems={cartItems}
      onSelectRecommendedProduct={onSelectRecommendedProduct}
      onQuickAddRecommendedToCart={onQuickAddRecommendedToCart}
      priceAlert={priceAlert}
      onTogglePriceAlert={onTogglePriceAlert}
      onAddReview={onAddReview}
    />
  );
};

interface ProductDetailContentProps {
  product: Product;
  initialMediaMode: 'images' | 'video';
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
  onOpenSellerChatWithProduct: (product: Product) => void;
  onAskAIAboutProduct: (product: Product) => void;
  isCompared: boolean;
  onToggleCompare?: (productId: string) => void;
  settings?: StoreSettings;
  allProducts: Product[];
  browsingHistory: BrowsingHistoryEntry[];
  orders: Order[];
  cartItems: CartItem[];
  onSelectRecommendedProduct?: (product: Product) => void;
  onQuickAddRecommendedToCart?: (product: Product) => void;
  priceAlert?: PriceDropAlert;
  onTogglePriceAlert?: (product: Product, targetPrice?: number) => void;
  onAddReview?: (
    productId: string,
    review: { userName: string; rating: number; comment: string; images?: string[] }
  ) => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5] as const;

const ProductDetailContent: React.FC<ProductDetailContentProps> = ({
  product,
  initialMediaMode,
  onClose,
  onAddToCart,
  onOpenSellerChatWithProduct,
  onAskAIAboutProduct,
  isCompared,
  onToggleCompare,
  settings,
  allProducts,
  browsingHistory,
  orders,
  cartItems,
  onSelectRecommendedProduct,
  onQuickAddRecommendedToCart,
  priceAlert,
  onTogglePriceAlert,
  onAddReview,
}) => {
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const [isReviewLightboxOpen, setIsReviewLightboxOpen] = useState(false);
  const [showTargetPriceForm, setShowTargetPriceForm] = useState(false);
  const [customTargetPrice, setCustomTargetPrice] = useState<string>(() =>
    String(Math.max(1, Math.round(product.price * 0.9)))
  );
  const demoVideo: ProductVideo | undefined =
    product.demoVideo ||
    (product.videoUrl
      ? {
          url: product.videoUrl,
          title: `فيديو توضيحي: ${product.name}`,
          thumbnail: product.images[0],
        }
      : undefined);

  const hasVideo = Boolean(demoVideo?.url);

  const [mediaMode, setMediaMode] = useState<'images' | 'video'>(
    initialMediaMode === 'video' && hasVideo ? 'video' : 'images'
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRateIndex, setPlaybackRateIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);

  // Product options state
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  );
  const [selectedWarranty, setSelectedWarranty] = useState<
    { id: string; label: string; price: number } | undefined
  >(undefined);
  const [customEngraving, setCustomEngraving] = useState('');
  const [isGiftWrapped, setIsGiftWrapped] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'customization' | 'reviews'>('specs');
  const [isARModalOpen, setIsARModalOpen] = useState(false);

  const dims = getProductDimensions(product);
  const parsedVideo = demoVideo ? parseVideoSource(demoVideo.url) : null;

  // Pause HTML5 video cleanly if user switches back to images tab
  useEffect(() => {
    if (mediaMode === 'images' && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [mediaMode]);

  // Scroll modal back to top when switching products
  useEffect(() => {
    modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.id]);

  // Close on Escape (only when AR modal and review lightbox are not open)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isARModalOpen && !isReviewLightboxOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, isARModalOpen, isReviewLightboxOpen]);

  const basePrice = product.price + (selectedVariant?.priceOffset || 0);
  const warrantyPrice = selectedWarranty?.price || 0;
  const giftWrapPrice = isGiftWrapped ? 25 : 0;
  const finalUnitPrice = basePrice + warrantyPrice + giftWrapPrice;
  const totalPrice = finalUnitPrice * quantity;

  const handleTogglePlay = () => {
    const vid = videoRef.current;
    if (!vid || videoError) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (targetTime: number, autoPlay = false) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Math.max(0, Math.min(targetTime, duration || targetTime));
    setCurrentTime(vid.currentTime);
    if (autoPlay && vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleToggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleCycleSpeed = () => {
    const nextIdx = (playbackRateIndex + 1) % SPEED_OPTIONS.length;
    setPlaybackRateIndex(nextIdx);
    if (videoRef.current) {
      videoRef.current.playbackRate = SPEED_OPTIONS[nextIdx];
    }
  };

  const handleFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  const handleRetryVideo = () => {
    setVideoError(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // Determine active chapter based on currentTime
  const chapters = demoVideo?.chapters || [];
  const activeChapterIndex = chapters.reduce((activeIdx, ch, idx) => {
    return currentTime >= ch.time ? idx : activeIdx;
  }, 0);

  const handleAddToCart = () => {
    onAddToCart({
      product,
      selectedVariant,
      selectedWarranty,
      customEngraving: customEngraving.trim() || undefined,
      isGiftWrapped,
      quantity,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalBodyRef}
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative flex flex-col my-auto"
      >
        {/* Header Close Button */}
        <button
          onClick={onClose}
          aria-label="إغلاق نافذة التفاصيل"
          className="absolute top-4 left-4 z-30 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-full border border-slate-700 transition focus-visible:outline-2 focus-visible:outline-brand-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
          {/* Media Column (Images & Demonstration Video) */}
          <div className="space-y-4">
            {/* Media Mode Segmented Control (when video is available) */}
            {hasVideo && (
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMediaMode('images')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition whitespace-nowrap ${
                    mediaMode === 'images'
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>صور المنتج ({product.images.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode('video')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition whitespace-nowrap ${
                    mediaMode === 'video'
                      ? 'bg-[#551465] text-white shadow-sm border border-brand-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>فيديو الشرح التقني</span>
                  {demoVideo?.duration && (
                    <span className="text-[10px] font-mono tabular-nums opacity-85">
                      ({demoVideo.duration})
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Main Media Viewport */}
            {mediaMode === 'images' || !demoVideo || !parsedVideo ? (
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                {!imageError ? (
                  <LazyImage
                    src={product.images[selectedImageIndex] || product.images[0]}
                    alt={product.name}
                    sizeHint="detail"
                    eager={selectedImageIndex === 0}
                    onErrorExternal={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-center">
                    <ImageIcon className="w-10 h-10 text-slate-600" />
                    <span className="text-xs font-medium">{product.name}</span>
                  </div>
                )}

                {product.images.length > 1 && (
                  <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      aria-label="الصورة السابقة"
                      onClick={() => {
                        setImageError(false);
                        setSelectedImageIndex((prev) =>
                          prev > 0 ? prev - 1 : product.images.length - 1
                        );
                      }}
                      className="pointer-events-auto bg-slate-900/80 hover:bg-slate-800 text-white p-2 rounded-full border border-slate-700 backdrop-blur"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="الصورة التالية"
                      onClick={() => {
                        setImageError(false);
                        setSelectedImageIndex((prev) =>
                          prev < product.images.length - 1 ? prev + 1 : 0
                        );
                      }}
                      className="pointer-events-auto bg-slate-900/80 hover:bg-slate-800 text-white p-2 rounded-full border border-slate-700 backdrop-blur"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Product badge */}
                {product.badge && (
                  <span className="absolute top-3 right-3 bg-[#551465] text-white text-xs font-bold px-3 py-1 rounded-lg shadow border border-brand-400/40">
                    {product.badge}
                  </span>
                )}

                {/* Quick Switch to Video & AR Buttons on Image Corners */}
                <button
                  type="button"
                  onClick={() => setIsARModalOpen(true)}
                  className="rawaj-dark-surface absolute bottom-3 right-3 bg-slate-950/85 hover:bg-[#551465] text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-700/80 hover:border-brand-400/50 backdrop-blur flex items-center gap-2 shadow-lg transition"
                >
                  <Box className="w-3.5 h-3.5 text-brand-300" />
                  <span>عرض في غرفتك</span>
                </button>

                {hasVideo && (
                  <button
                    type="button"
                    onClick={() => setMediaMode('video')}
                    className="rawaj-dark-surface absolute bottom-3 left-3 bg-slate-950/85 hover:bg-[#551465] text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-700/80 hover:border-brand-400/50 backdrop-blur flex items-center gap-2 shadow-lg transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>تشغيل الفيديو التوضيحي</span>
                  </button>
                )}
              </div>
            ) : (
              /* Video Demonstration Stage */
              <div className="space-y-3">
                <div
                  ref={videoContainerRef}
                  className="rawaj-dark-surface relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group"
                >
                  {parsedVideo.type === 'youtube' || parsedVideo.type === 'vimeo' ? (
                    <iframe
                      src={parsedVideo.src}
                      title={demoVideo.title || product.name}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : videoError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950">
                      <AlertTriangle className="w-9 h-9 text-amber-400" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white">تعذر تحميل ملف الفيديو التوضيحي</p>
                        <p className="text-[11px] text-slate-400">
                          يرجى التحقق من رابط الفيديو أو العودة لاستعراض صور المنتج.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRetryVideo}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>إعادة المحاولة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaMode('images')}
                          className="bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                        >
                          عرض الصور
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        src={parsedVideo.src}
                        poster={demoVideo.thumbnail || product.images[0]}
                        playsInline
                        preload="metadata"
                        onClick={handleTogglePlay}
                        onLoadedMetadata={(e) => {
                          setDuration(e.currentTarget.duration || 0);
                        }}
                        onTimeUpdate={(e) => {
                          setCurrentTime(e.currentTarget.currentTime || 0);
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        onError={() => setVideoError(true)}
                        className="w-full h-full object-cover cursor-pointer"
                      />

                      {/* Active Chapter Caption Overlay */}
                      {chapters.length > 0 && isPlaying && (
                        <div className="absolute top-3 right-3 left-3 flex justify-between items-start pointer-events-none">
                          <div className="bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-700/70 shadow">
                            <span className="text-brand-300 font-mono tabular-nums ml-2">
                              {formatVideoTime(chapters[activeChapterIndex].time)}
                            </span>
                            <span>{chapters[activeChapterIndex].label}</span>
                          </div>
                        </div>
                      )}

                      {/* Center Play Overlay when paused */}
                      {!isPlaying && (
                        <button
                          type="button"
                          aria-label="تشغيل الفيديو التوضيحي"
                          onClick={handleTogglePlay}
                          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent flex flex-col items-center justify-center gap-2 transition"
                        >
                          <span className="w-14 h-14 rounded-full bg-[#551465]/95 hover:bg-brand-600 text-white flex items-center justify-center shadow-2xl border border-brand-300/40 transition transform hover:scale-105">
                            <Play className="w-6 h-6 fill-white translate-x-0.5" />
                          </span>
                          <span className="text-xs font-bold text-white drop-shadow">
                            اضغط لتشغيل الشرح التقني
                          </span>
                        </button>
                      )}

                      {/* Custom Interactive Control Bar */}
                      <div
                        dir="ltr"
                        className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-6 pb-2.5 px-3 space-y-1.5"
                      >
                        {/* Scrubber Slider */}
                        <div className="relative flex items-center">
                          <input
                            type="range"
                            min={0}
                            max={duration || 12}
                            step={0.1}
                            value={currentTime}
                            aria-label="شريط تقدم الفيديو"
                            onChange={(e) => handleSeek(Number(e.target.value))}
                            className="w-full h-1.5 accent-[#af3fd2] cursor-pointer bg-slate-700 rounded-lg"
                          />
                        </div>

                        <div className="flex items-center justify-between text-white text-[11px]">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                              onClick={handleTogglePlay}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition"
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4 fill-white" />
                              )}
                            </button>

                            <button
                              type="button"
                              aria-label={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
                              onClick={handleToggleMute}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition"
                            >
                              {isMuted ? (
                                <VolumeX className="w-4 h-4 text-slate-400" />
                              ) : (
                                <Volume2 className="w-4 h-4" />
                              )}
                            </button>

                            <span className="font-mono tabular-nums text-slate-200 text-[11px]">
                              {formatVideoTime(currentTime)} / {formatVideoTime(duration || 12)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCycleSpeed}
                              title="سرعة التشغيل"
                              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 font-mono tabular-nums text-[10px] font-bold transition"
                            >
                              {SPEED_OPTIONS[playbackRateIndex]}x
                            </button>
                            <button
                              type="button"
                              aria-label="ملء الشاشة"
                              onClick={handleFullscreen}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Video Technical Chapters & Highlights Panel */}
                {(demoVideo.title || chapters.length > 0 || (demoVideo.highlights && demoVideo.highlights.length > 0)) && (
                  <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs">
                    {demoVideo.title && (
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-white flex items-center gap-2">
                          <Video className="w-4 h-4 text-brand-300 shrink-0" />
                          <span>{demoVideo.title}</span>
                        </h4>
                        {demoVideo.duration && (
                          <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                            {demoVideo.duration}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Interactive Chapters (for HTML5 videos) */}
                    {chapters.length > 0 && parsedVideo.type === 'html5' && !videoError && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] text-slate-400 block font-medium">
                          فصول الشرح التقني (اضغط للانتقال مباشرة):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          {chapters.map((chapter, idx) => {
                            const isActive = activeChapterIndex === idx && (isPlaying || currentTime > 0);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSeek(chapter.time, true)}
                                className={`text-right p-2 rounded-xl border text-[11px] transition flex items-center justify-between gap-1.5 ${
                                  isActive
                                    ? 'bg-[#551465]/35 border-[#551465] text-white font-bold'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{chapter.label}</span>
                                <span className="font-mono tabular-nums text-[10px] text-brand-300 shrink-0">
                                  {formatVideoTime(chapter.time)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Key Technical Highlights */}
                    {demoVideo.highlights && demoVideo.highlights.length > 0 && (
                      <ul className="space-y-1 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                        {demoVideo.highlights.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-300 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Unified Thumbnail Selector (Images + Video Thumbnail) */}
            {(product.images.length > 1 || hasVideo) && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => {
                      setMediaMode('images');
                      setImageError(false);
                      setSelectedImageIndex(idx);
                    }}
                    className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition ${
                      mediaMode === 'images' && selectedImageIndex === idx
                        ? 'border-[#551465] scale-95'
                        : 'border-slate-800 opacity-65 hover:opacity-100'
                    }`}
                  >
                    <LazyImage
                      src={img}
                      alt={`${product.name} - صورة ${idx + 1}`}
                      sizeHint="thumb"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}

                {hasVideo && demoVideo && (
                  <button
                    type="button"
                    onClick={() => setMediaMode('video')}
                    aria-label="عرض الفيديو التوضيحي للمنتج"
                    className={`rawaj-dark-surface relative w-20 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition bg-slate-950 ${
                      mediaMode === 'video'
                        ? 'border-[#af3fd2] scale-95 shadow-md shadow-[#551465]/40'
                        : 'border-slate-800 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <LazyImage
                      src={demoVideo.thumbnail || product.images[0]}
                      alt="معاينة الفيديو التوضيحي"
                      sizeHint="thumb"
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-slate-950/45 flex flex-col items-center justify-center gap-0.5">
                      <span className="w-6 h-6 rounded-full bg-[#551465] text-white flex items-center justify-center shadow">
                        <Play className="w-3 h-3 fill-white translate-x-[1px]" />
                      </span>
                      <span className="text-[9px] font-bold text-white">فيديو</span>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* AI Analysis, Seller Chat, AR Room Simulation & Compare Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsARModalOpen(true)}
                className="col-span-2 bg-slate-950 hover:bg-[#551465]/25 text-white border border-brand-500/40 hover:border-brand-400 p-3 rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 transition shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-brand-300" />
                  <span>عرض في غرفتك (AR Simulation)</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums text-brand-300">
                  {dims.widthCm} × {dims.heightCm} × {dims.depthCm} سم
                </span>
              </button>

              <button
                type="button"
                onClick={() => onAskAIAboutProduct(product)}
                className="bg-[#551465]/20 hover:bg-[#551465]/35 text-brand-200 border border-[#551465]/40 p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Sparkles className="w-4 h-4 text-brand-300" />
                <span>تحليل المنتج مع AI</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenSellerChatWithProduct(product)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition"
              >
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <span>دردشة مباشرة مع البائع</span>
              </button>

              {onToggleCompare && (
                <button
                  type="button"
                  onClick={() => onToggleCompare(product.id)}
                  className={`col-span-2 p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                    isCompared
                      ? 'bg-[#551465] text-white border-brand-400/50'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>{isCompared ? 'مضاف في جدول المقارنة (اضغط للإزالة)' : 'إضافة إلى مقارنة المنتجات'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column (Details & Customization Options) */}
          <div className="flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{product.categoryNameAr}</span>
                <span className="text-brand-300 font-medium font-mono">كود المنتج: {product.id}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-snug">
                {product.name}
              </h2>

              {/* Rating & Reviews */}
              <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="tabular-nums">{product.rating}</span>
                </div>
                <span className="text-slate-400 text-xs">
                  مستند إلى ({product.reviewCount} تقييم موثق)
                </span>
                <span className="text-brand-300 text-xs font-semibold flex items-center gap-1">
                  <PackageCheck className="w-3.5 h-3.5" /> متوفر في المستودعات
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                {product.description}
              </p>

              {/* Pricing breakdown */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">السعر النهائي للقطعة</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white tabular-nums">
                      {formatPrice(finalUnitPrice, settings?.activeCurrency, settings?.yerExchangeRate)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-slate-500 line-through tabular-nums">
                        {formatPrice(product.originalPrice, settings?.activeCurrency, settings?.yerExchangeRate)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    السعر شامل {settings?.vatPercentage || 15}% ضريبة القيمة المضافة
                  </span>
                  <span className="text-[11px] text-amber-300 font-bold block mt-1 tabular-nums">
                    + ستكسب {calculateEarnedPoints(totalPrice).toLocaleString()} نقطة ولاء عند الشراء
                  </span>
                </div>

                {/* Quantity Controller */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-white text-sm tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price Drop Alert Toggle & Target Config */}
              {onTogglePriceAlert && (
                <div
                  className={`mb-4 rounded-2xl border p-3.5 transition ${
                    priceAlert?.isActive
                      ? 'bg-emerald-950/35 border-emerald-500/45'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          priceAlert?.isActive
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {priceAlert?.isActive ? (
                          <BellRing className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-white block">
                          {priceAlert?.isActive
                            ? 'تنبيه انخفاض السعر مفعّل'
                            : 'تنبيه انخفاض السعر'}
                        </span>
                        <span className="text-[11px] text-slate-400 block leading-snug tabular-nums">
                          {priceAlert?.isActive
                            ? priceAlert.targetPrice
                              ? `سيصلك إشعار فوري إذا انخفض السعر إلى ${formatPrice(
                                  priceAlert.targetPrice,
                                  settings?.activeCurrency,
                                  settings?.yerExchangeRate
                                )} أو أقل`
                              : `سيصلك إشعار فوري داخل التطبيق عند أي تخفيض عن ${formatPrice(
                                  priceAlert.subscribedPrice,
                                  settings?.activeCurrency,
                                  settings?.yerExchangeRate
                                )}`
                            : 'احصل على إشعار فوري داخل المتجر فور تخفيض سعر هذا المنتج'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!priceAlert?.isActive ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowTargetPriceForm((v) => !v)}
                            className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold transition whitespace-nowrap"
                          >
                            {showTargetPriceForm ? 'إخفاء الهدف' : 'سعر مستهدف'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowTargetPriceForm(false);
                              onTogglePriceAlert(product);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition whitespace-nowrap shadow"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>تفعيل التنبيه</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTargetPrice(
                                String(priceAlert.targetPrice || Math.max(1, Math.round(product.price * 0.9)))
                              );
                              setShowTargetPriceForm((v) => !v);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-bold transition whitespace-nowrap"
                          >
                            {showTargetPriceForm ? 'إغلاق' : 'تعديل الهدف'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowTargetPriceForm(false);
                              onTogglePriceAlert(product);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition whitespace-nowrap"
                          >
                            إلغاء التنبيه
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {showTargetPriceForm && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const numeric = Number(customTargetPrice);
                        if (Number.isFinite(numeric) && numeric > 0 && numeric < product.price) {
                          onTogglePriceAlert(product, numeric);
                          setShowTargetPriceForm(false);
                        }
                      }}
                      className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs"
                    >
                      <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
                      <label htmlFor="target-price-input" className="text-[11px] text-slate-300 font-bold">
                        نبهني عندما يصل السعر (بالريال السعودي) إلى:
                      </label>
                      <input
                        id="target-price-input"
                        type="number"
                        min={1}
                        max={Math.max(1, product.price - 1)}
                        value={customTargetPrice}
                        onChange={(e) => setCustomTargetPrice(e.target.value)}
                        className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!Number(customTargetPrice) || Number(customTargetPrice) >= product.price}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-[11px] transition"
                      >
                        حفظ الهدف وتفعيل
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Product Variants Selection */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-300 block mb-2">
                    اختر الموديل أو السعة التخزينية / اللون:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.variants.map((variant) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      return (
                        <button
                          type="button"
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={`p-2.5 rounded-xl text-xs text-right border transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#551465]/30 border-[#551465] text-white font-bold shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span>{variant.name}</span>
                          {variant.priceOffset > 0 && (
                            <span className="text-[10px] text-brand-300 tabular-nums">
                              +{variant.priceOffset} ر.س
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tabs: Specifications / Customization / Reviews */}
              <div className="border-b border-slate-800 flex gap-4 text-xs font-bold mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={`pb-2 transition border-b-2 ${
                    activeTab === 'specs'
                      ? 'border-[#551465] text-brand-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  جدول المواصفات
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('customization')}
                  className={`pb-2 transition border-b-2 ${
                    activeTab === 'customization'
                      ? 'border-[#551465] text-brand-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  خيارات التخصيص والضمان
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2 transition border-b-2 ${
                    activeTab === 'reviews'
                      ? 'border-[#551465] text-brand-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  آراء العملاء ({product.reviews.length})
                </button>
              </div>

              {/* Tab 1: Specifications */}
              {activeTab === 'specs' && (
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-2 mb-4">
                  <div className="flex justify-between py-1 border-b border-slate-900 gap-4">
                    <span className="text-slate-400 font-medium">الأبعاد الفيزيائية (العرض × الارتفاع × العمق)</span>
                    <span className="text-brand-300 font-bold font-mono tabular-nums text-left">
                      {dims.widthCm} × {dims.heightCm} × {dims.depthCm} سم
                    </span>
                  </div>
                  {product.specifications.map((spec, i) => (
                    <div
                      key={i}
                      className="flex justify-between py-1 border-b border-slate-900 last:border-none gap-4"
                    >
                      <span className="text-slate-400 font-medium">{spec.key}</span>
                      <span className="text-slate-200 font-bold text-left">{spec.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2: Customization */}
              {activeTab === 'customization' && (
                <div className="space-y-3 mb-4 text-xs">
                  {product.customizationOptions?.warrantyOptions && (
                    <div>
                      <span className="font-bold text-slate-300 block mb-1">باقات الضمان الممتد:</span>
                      <div className="space-y-1.5">
                        <label
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${
                            !selectedWarranty
                              ? 'bg-[#551465]/20 border-[#551465]'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="warranty"
                              checked={!selectedWarranty}
                              onChange={() => setSelectedWarranty(undefined)}
                            />
                            <span>الضمان الموحد المجاني (سنتان)</span>
                          </div>
                          <span className="text-brand-300 font-bold">مجاناً</span>
                        </label>

                        {product.customizationOptions.warrantyOptions.map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${
                              selectedWarranty?.id === opt.id
                                ? 'bg-[#551465]/20 border-[#551465]'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="warranty"
                                checked={selectedWarranty?.id === opt.id}
                                onChange={() => setSelectedWarranty(opt)}
                              />
                              <span>{opt.label}</span>
                            </div>
                            <span className="text-brand-300 font-bold tabular-nums">+{opt.price} ر.س</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.customizationOptions?.engravingAvailable && (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <label className="flex items-center gap-2 text-slate-200 font-bold mb-1">
                        <PenTool className="w-3.5 h-3.5 text-purple-400" />
                        <span>نقش ليزري مخصص مجاني (اسم أو إهداء):</span>
                      </label>
                      <input
                        type="text"
                        maxLength={30}
                        value={customEngraving}
                        onChange={(e) => setCustomEngraving(e.target.value)}
                        placeholder="أدخل النص المراد نقشه على الجهاز..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#551465]"
                      />
                    </div>
                  )}

                  {product.customizationOptions?.giftWrapAvailable && (
                    <label
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${
                        isGiftWrapped
                          ? 'bg-[#551465]/20 border-[#551465]'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-slate-200">
                        <Gift className="w-4 h-4 text-brand-300" />
                        <span>تغليف هدايا فاخر مع بطاقة معايدة مخصصة (+25 ر.س)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isGiftWrapped}
                        onChange={(e) => setIsGiftWrapped(e.target.checked)}
                        className="accent-[#551465] w-4 h-4"
                      />
                    </label>
                  )}

                  {!product.customizationOptions && (
                    <p className="text-xs text-slate-400 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      يشمل هذا المنتج ضمان الوكيل المعتمد لمدة سنتين مع تغليف شحن آمن مجاناً.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Reviews (with Photo Attachments) */}
              {activeTab === 'reviews' && (
                <ProductReviewsPanel
                  product={product}
                  onAddReview={onAddReview}
                  onLightboxOpenChange={setIsReviewLightboxOpen}
                />
              )}

              {/* Store Guarantee Icons */}
              <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 text-center pt-2 border-t border-slate-800">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-brand-300" />
                  <span>ضمان وكيل 2 سنة</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-4 h-4 text-purple-300" />
                  <span>شحن سريع وموثوق</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-indigo-400" />
                  <span>استرجاع خلال 14 يوماً</span>
                </div>
              </div>
            </div>

            {/* Add to Cart Footer CTA */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="w-full bg-[#551465] hover:bg-brand-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-[#551465]/30 text-sm transition transform active:scale-95 border border-brand-500/30"
              >
                <ShoppingCart className="w-5 h-5 text-brand-200" />
                <span>
                  إضافة إلى السلة (إجمالي:{' '}
                  {formatPrice(totalPrice, settings?.activeCurrency, settings?.yerExchangeRate)})
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Cross-Selling Recommended Products Section */}
        {allProducts.length > 1 && (
          <RecommendedProductsSection
            currentProduct={product}
            allProducts={allProducts}
            browsingHistory={browsingHistory}
            orders={orders}
            cartItems={cartItems}
            settings={settings}
            onSelectProduct={(recProd) => {
              if (onSelectRecommendedProduct) {
                onSelectRecommendedProduct(recProd);
              }
            }}
            onQuickAddToCart={(recProd) => {
              if (onQuickAddRecommendedToCart) {
                onQuickAddRecommendedToCart(recProd);
              } else {
                onAddToCart({ product: recProd, quantity: 1 });
              }
            }}
          />
        )}
      </div>

      {/* AR Room Simulation Modal */}
      <ProductARModal
        isOpen={isARModalOpen}
        product={product}
        onClose={() => setIsARModalOpen(false)}
        onAddToCart={() => handleAddToCart()}
        settings={settings}
      />
    </div>
  );
};
