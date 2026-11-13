import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Camera,
  RotateCw,
  Move,
  Box,
  Layers,
  Ruler,
  SwitchCamera,
  Lock,
  Unlock,
  Download,
  AlertTriangle,
  Sparkles,
  ShoppingCart,
  Eye,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';
import { Product, ProductDimensions, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';

interface ProductARModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  settings?: StoreSettings;
}

type CameraStatus = 'requesting' | 'active' | 'denied' | 'unavailable' | 'simulated';
type ReferenceItemId = 'none' | 'smartphone' | 'a4' | 'mug' | 'desk_mat';
type PlaceholderStyle = 'wireframe_product' | 'box_only';

interface ReferenceSpec {
  id: ReferenceItemId;
  label: string;
  widthCm: number;
  heightCm: number;
}

const REFERENCE_ITEMS: ReferenceSpec[] = [
  { id: 'none', label: 'بدون عنصر مقارنة', widthCm: 0, heightCm: 0 },
  { id: 'smartphone', label: 'هاتف ذكي (15 × 7.5 سم)', widthCm: 7.5, heightCm: 15.0 },
  { id: 'a4', label: 'ورقة A4 (21 × 29.7 سم)', widthCm: 21.0, heightCm: 29.7 },
  { id: 'mug', label: 'كوب قهوة (8.5 × 9.5 سم)', widthCm: 8.5, heightCm: 9.5 },
  { id: 'desk_mat', label: 'مفرش مكتب (80 × 30 سم)', widthCm: 80.0, heightCm: 30.0 },
];

export function getProductDimensions(product: Product): ProductDimensions {
  if (product.dimensions) {
    return product.dimensions;
  }
  switch (product.category) {
    case 'electronics':
      return { widthCm: 34, heightCm: 2.2, depthCm: 24, labelAr: 'أبعاد تقديرية للإلكترونيات' };
    case 'gaming':
      return { widthCm: 42, heightCm: 14, depthCm: 26, labelAr: 'أبعاد تقديرية لأجهزة الألعاب' };
    case 'home':
      return { widthCm: 32, heightCm: 36, depthCm: 38, labelAr: 'أبعاد تقديرية لأجهزة المنزل' };
    case 'fashion':
      return { widthCm: 38, heightCm: 52, depthCm: 22, labelAr: 'أبعاد تقديرية لمنتجات الأزياء والسفر' };
    default:
      return { widthCm: 18, heightCm: 18, depthCm: 10, labelAr: 'أبعاد تقديرية للمنتج' };
  }
}

export const ProductARModal: React.FC<ProductARModalProps> = ({
  isOpen,
  product,
  onClose,
  onAddToCart,
  settings,
}) => {
  if (!isOpen || !product) return null;

  return (
    <ProductARContent
      key={product.id}
      product={product}
      onClose={onClose}
      onAddToCart={onAddToCart}
      settings={settings}
    />
  );
};

interface ProductARContentProps {
  product: Product;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  settings?: StoreSettings;
}

const ProductARContent: React.FC<ProductARContentProps> = ({
  product,
  onClose,
  onAddToCart,
  settings,
}) => {
  const dims = useMemo(() => getProductDimensions(product), [product]);
  const maxDim = Math.max(dims.widthCm, dims.heightCm, dims.depthCm);
  const isSmallItem = maxDim < 18;

  const minDistance = isSmallItem ? 0.35 : 0.6;
  const maxDistance = isSmallItem ? 1.5 : 3.0;
  const defaultDistance = isSmallItem ? 0.55 : maxDim > 50 ? 1.5 : 1.1;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const [cameraErrorText, setCameraErrorText] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Interactive AR Simulation Controls
  const [distanceMeters, setDistanceMeters] = useState<number>(defaultDistance);
  const [viewStyle, setViewStyle] = useState<PlaceholderStyle>('wireframe_product');
  const [referenceId, setReferenceId] = useState<ReferenceItemId>('smartphone');
  const [yawDeg, setYawDeg] = useState<number>(18);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 8 });
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 640,
    height: 440,
  });
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (requestedFacing: 'environment' | 'user') => {
      stopCameraStream();
      setCameraStatus('requesting');
      setCameraErrorText('');

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraStatus('unavailable');
        setCameraErrorText('المتصفح الحالي أو الاتصال لا يدعم الوصول المباشر للكاميرا.');
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: requestedFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (err) {
          const errName = err instanceof DOMException ? err.name : '';
          if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw err;
          }
        }

        streamRef.current = stream;
        setCameraStatus('active');
      } catch (err) {
        const errName = err instanceof DOMException ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCameraStatus('denied');
          setCameraErrorText(
            'تم رفض صلاحية الكاميرا. يمكنك السماح بالوصول للكاميرا من إعدادات المتصفح أو تجربة المعاينة في البيئة الافتراضية.'
          );
        } else {
          setCameraStatus('unavailable');
          setCameraErrorText(
            'لم يتم العثور على كاميرا متصلة أو أن الكاميرا مستخدمة من تطبيق آخر. يمكنك متابعة قياس الأبعاد في الغرفة الافتراضية.'
          );
        }
      }
    },
    [stopCameraStream]
  );

  // Attach active stream to <video> element once mounted/ready
  useEffect(() => {
    if (cameraStatus === 'active' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStatus]);

  // Initial camera startup + cleanup on unmount
  useEffect(() => {
    startCamera('environment');
    return () => {
      stopCameraStream();
    };
  }, [startCamera, stopCameraStream]);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Track stage container size for accurate scaling
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Pinhole-calibrated cm -> pixel conversion based on distanceMeters
  // Assume ~62 deg horizontal FOV => visible real width at distance d (m) is roughly 1.18 * d * 100 cm
  const visibleSceneWidthCm = distanceMeters * 118;
  const rawPxPerCm = stageSize.width / Math.max(20, visibleSceneWidthCm);
  // Clamp scale safely so box never exceeds viewport boundaries while preserving product/reference ratio
  const maxAllowedWidthPx = stageSize.width * 0.62;
  const maxAllowedHeightPx = stageSize.height * 0.56;
  const safeScaleCap = Math.min(
    maxAllowedWidthPx / Math.max(1, dims.widthCm),
    maxAllowedHeightPx / Math.max(6, dims.heightCm)
  );
  const pxPerCm = Math.min(rawPxPerCm, safeScaleCap);

  const boxWidthPx = Math.max(46, dims.widthCm * pxPerCm);
  const boxHeightPx = Math.max(24, dims.heightCm * pxPerCm);
  const boxDepthOffsetPx = Math.min(64, Math.max(14, dims.depthCm * pxPerCm * 0.42));

  const selectedRefItem = REFERENCE_ITEMS.find((r) => r.id === referenceId) || REFERENCE_ITEMS[0];
  const refWidthPx = selectedRefItem.widthCm > 0 ? Math.max(18, selectedRefItem.widthCm * pxPerCm) : 0;
  const refHeightPx = selectedRefItem.heightCm > 0 ? Math.max(22, selectedRefItem.heightCm * pxPerCm) : 0;

  const handleToggleCameraDirection = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleEnableSimulatedRoom = () => {
    stopCameraStream();
    setCameraStatus('simulated');
  };

  const handleResetPlacement = () => {
    setOffset({ x: 0, y: 8 });
    setDistanceMeters(defaultDistance);
    setYawDeg(18);
    setIsLocked(false);
  };

  // Drag-and-drop pointer handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active || isLocked) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    const maxOffsetX = stageSize.width * 0.34;
    const maxOffsetY = stageSize.height * 0.28;
    setOffset({
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, dragStateRef.current.origX + dx)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, dragStateRef.current.origY + dy)),
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current.active = false;
  };

  const handleCaptureSnapshot = () => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const width = Math.round(stageEl.clientWidth) || 800;
    const height = Math.round(stageEl.clientHeight) || 520;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background: live video frame or simulated room gradient
    if (cameraStatus === 'active' && videoRef.current && videoRef.current.readyState >= 2) {
      const vid = videoRef.current;
      const vidRatio = vid.videoWidth / Math.max(1, vid.videoHeight);
      const canvasRatio = width / height;
      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;
      if (vidRatio > canvasRatio) {
        drawW = height * vidRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawH = width / vidRatio;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(vid, drawX, drawY, drawW, drawH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.65, '#1e293b');
      grad.addColorStop(1, '#334155');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Perspective floor grid
      ctx.strokeStyle = 'rgba(203, 109, 229, 0.22)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(width / 2 + (x - width / 2) * 0.35, height * 0.56);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Draw scaled AR placeholder box at offset
    const centerX = width / 2 + offset.x;
    const centerY = height / 2 + offset.y;
    const bx = centerX - boxWidthPx / 2;
    const by = centerY - boxHeightPx / 2;

    // Shadow footprint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(centerX, by + boxHeightPx + 10, boxWidthPx * 0.54, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back wireframe depth face
    const dxDepth = boxDepthOffsetPx * 0.6;
    const dyDepth = -boxDepthOffsetPx * 0.45;
    ctx.strokeStyle = 'rgba(203, 109, 229, 0.55)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + dxDepth, by + dyDepth, boxWidthPx, boxHeightPx);

    // Connecting depth edges
    [
      [bx, by],
      [bx + boxWidthPx, by],
      [bx, by + boxHeightPx],
      [bx + boxWidthPx, by + boxHeightPx],
    ].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dxDepth, cy + dyDepth);
      ctx.stroke();
    });

    // Front face bounding box
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(85, 20, 101, 0.25)';
    ctx.fillRect(bx, by, boxWidthPx, boxHeightPx);
    ctx.strokeStyle = '#e0a3f0';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx, by, boxWidthPx, boxHeightPx);

    // Dimensions watermark pill on snapshot
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(16, height - 62, Math.min(width - 32, 430), 46);
    ctx.strokeStyle = 'rgba(203, 109, 229, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, height - 62, Math.min(width - 32, 430), 46);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(
      `${product.name} — ${dims.widthCm} × ${dims.heightCm} × ${dims.depthCm} سم (مسافة ${distanceMeters.toFixed(2)}م)`,
      26,
      height - 34
    );

    try {
      setSnapshotUrl(canvas.toDataURL('image/png'));
    } catch {
      // Ignore tainted canvas errors if external image prevented export
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col my-auto">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#551465]/25 border border-[#551465]/50 flex items-center justify-center text-brand-300 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                معاينة الأبعاد في غرفتك (AR Simulation)
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {product.name} · {dims.widthCm} × {dims.heightCm} × {dims.depthCm} سم
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المعاينة بالواقع المعزز"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main AR Stage + Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5">
          {/* AR Camera / Virtual Room Stage */}
          <div className="lg:col-span-8 space-y-3">
            <div
              ref={stageRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="rawaj-dark-surface relative w-full h-[360px] sm:h-[460px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 select-none touch-none shadow-inner"
            >
              {/* Live Camera Video Element */}
              {cameraStatus === 'active' && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Virtual Room Backdrop (Fallback or User-Selected) */}
              {cameraStatus === 'simulated' && (
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
                  {/* Subtle room wall & surface horizon */}
                  <div className="absolute inset-x-0 top-0 h-[58%] bg-gradient-to-b from-slate-950/70 to-slate-900/40 border-b border-slate-700/60" />
                  <div
                    className="absolute inset-x-0 bottom-0 h-[42%]"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, rgba(203,109,229,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(203,109,229,0.16) 1px, transparent 1px)',
                      backgroundSize: '36px 26px',
                      transform: 'perspective(380px) rotateX(48deg)',
                      transformOrigin: 'top center',
                    }}
                  />
                  <div className="absolute top-3 right-3 bg-slate-950/80 border border-slate-700/80 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-300" />
                    <span>بيئة الغرفة الافتراضية المعايرة</span>
                  </div>
                </div>
              )}

              {/* Camera Requesting / Error States */}
              {(cameraStatus === 'requesting' ||
                cameraStatus === 'denied' ||
                cameraStatus === 'unavailable') && (
                <div className="absolute inset-0 z-20 bg-slate-950/92 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  {cameraStatus === 'requesting' ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-[#551465]/30 border border-[#551465]/60 flex items-center justify-center text-brand-300 animate-pulse">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="text-sm font-extrabold text-white">
                          جاري تشغيل الكاميرا للمعاينة الحية...
                        </h4>
                        <p className="text-xs text-slate-300">
                          اسمح للمتصفح بالوصول إلى الكاميرا لعرض نموذج أبعاد المنتج فوق مساحتك الحقيقية.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleEnableSimulatedRoom}
                        className="text-xs font-bold text-brand-300 hover:text-white underline"
                      >
                        أو استخدم الغرفة الافتراضية فوراً
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5 max-w-md">
                        <h4 className="text-sm font-extrabold text-white">
                          تعذر تشغيل الكاميرا مباشرة
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{cameraErrorText}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => startCamera(facingMode)}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>إعادة طلب الكاميرا</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleEnableSimulatedRoom}
                          className="bg-[#551465] hover:bg-brand-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 transition"
                        >
                          <Box className="w-4 h-4" />
                          <span>معاينة الأبعاد في غرفة افتراضية</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Top HUD Overlay Bar (Visible when active or simulated) */}
              {(cameraStatus === 'active' || cameraStatus === 'simulated') && (
                <>
                  <div className="absolute top-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5 text-brand-300" />
                      <span className="tabular-nums">
                        المسافة: {distanceMeters.toFixed(2)} م · مقياس: 1 سم = {pxPerCm.toFixed(1)} بكسل
                      </span>
                    </div>

                    <div className="pointer-events-auto flex items-center gap-1.5">
                      {cameraStatus === 'active' && (
                        <button
                          type="button"
                          onClick={handleToggleCameraDirection}
                          title="تبديل الكاميرا الأمامية/الخلفية"
                          className="bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md text-white p-2 rounded-xl border border-slate-700/80 transition"
                        >
                          <SwitchCamera className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsLocked((v) => !v)}
                        title={isLocked ? 'فتح تحريك النموذج' : 'تثبيت موضع النموذج'}
                        className={`backdrop-blur-md px-2.5 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                          isLocked
                            ? 'bg-emerald-600/90 border-emerald-400 text-white'
                            : 'bg-slate-950/80 hover:bg-slate-900 border-slate-700/80 text-white'
                        }`}
                      >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isLocked ? 'مثبّت' : 'اسحب للتحريك'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        title="التقاط صورة للمعاينة"
                        className="bg-[#551465]/95 hover:bg-brand-700 text-white px-2.5 py-2 rounded-xl border border-brand-400/50 text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">التقاط لقطة</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive 3D Wireframe Placeholder + Scaled Comparison Object */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center pointer-events-none`}
                  >
                    <div
                      style={{
                        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                      }}
                      className={`relative flex items-end gap-5 sm:gap-7 ${
                        isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                      }`}
                    >
                      {/* Main Product 3D Bounding Box Placeholder */}
                      <div
                        className="relative flex flex-col items-center"
                        style={{
                          transform: `perspective(700px) rotateY(${yawDeg}deg)`,
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {/* Top Height & Depth Tag */}
                        <div className="mb-2 bg-slate-950/90 border border-brand-400/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5 tabular-nums">
                          <span className="text-brand-300">المنتج:</span>
                          <span>
                            {dims.widthCm} × {dims.heightCm} × {dims.depthCm} سم
                          </span>
                        </div>

                        {/* 3D Isometric Extruded Cage */}
                        <div
                          className="relative"
                          style={{
                            width: `${boxWidthPx}px`,
                            height: `${boxHeightPx}px`,
                          }}
                        >
                          {/* Back Depth Face */}
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 border border-dashed border-brand-300/65 bg-brand-500/10 rounded-md"
                            style={{
                              transform: `translate(${boxDepthOffsetPx * 0.55}px, ${
                                -boxDepthOffsetPx * 0.42
                              }px)`,
                            }}
                          />

                          {/* SVG Perspective Edge Connectors */}
                          <svg
                            aria-hidden="true"
                            className="absolute inset-0 overflow-visible pointer-events-none"
                            width={boxWidthPx}
                            height={boxHeightPx}
                          >
                            {[
                              [0, 0],
                              [boxWidthPx, 0],
                              [0, boxHeightPx],
                              [boxWidthPx, boxHeightPx],
                            ].map(([cx, cy], idx) => (
                              <line
                                key={idx}
                                x1={cx}
                                y1={cy}
                                x2={cx + boxDepthOffsetPx * 0.55}
                                y2={cy - boxDepthOffsetPx * 0.42}
                                stroke="rgba(224, 163, 240, 0.7)"
                                strokeWidth="1.5"
                                strokeDasharray="4 3"
                              />
                            ))}
                          </svg>

                          {/* Front Bounding Frame with Optional Product Image */}
                          <div className="relative w-full h-full rounded-md border-2 border-brand-300 bg-[#551465]/20 backdrop-blur-[1px] shadow-[0_0_25px_rgba(175,63,210,0.35)] overflow-hidden flex items-center justify-center">
                            {viewStyle === 'wireframe_product' && product.images[0] ? (
                              <LazyImage
                                src={product.images[0]}
                                alt={product.name}
                                sizeHint="card"
                                wrapperClassName="relative w-full h-full overflow-hidden pointer-events-none"
                                className="w-full h-full object-contain opacity-85 p-1 pointer-events-none"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center p-1">
                                <Box className="w-5 h-5 text-brand-200 opacity-80" />
                                <span className="text-[9px] font-bold text-brand-100 leading-tight mt-0.5 line-clamp-1">
                                  {dims.labelAr || 'نموذج الأبعاد'}
                                </span>
                              </div>
                            )}

                            {/* Corner Reticle Markers */}
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-white" />
                            <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />
                            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
                          </div>

                          {/* Height Callout Arrow on Left Edge */}
                          <div
                            className="absolute -left-2 top-0 bottom-0 -translate-x-full flex items-center pr-1.5"
                            dir="ltr"
                          >
                            <div className="h-full flex flex-col items-center justify-between border-l border-amber-400/80 pl-1">
                              <span className="w-1.5 h-[1px] bg-amber-400" />
                              <span className="bg-slate-950/90 text-amber-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-400/40 whitespace-nowrap tabular-nums">
                                H: {dims.heightCm} cm
                              </span>
                              <span className="w-1.5 h-[1px] bg-amber-400" />
                            </div>
                          </div>

                          {/* Depth Callout on Top-Right */}
                          <div className="absolute -top-6 right-0 translate-x-2 flex items-center gap-1">
                            <span className="bg-slate-950/90 text-emerald-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-400/40 whitespace-nowrap tabular-nums">
                              D: {dims.depthCm} cm
                            </span>
                          </div>
                        </div>

                        {/* Surface Footprint Shadow & Width Callout */}
                        <div
                          className="mt-2.5 flex flex-col items-center"
                          style={{ width: `${boxWidthPx}px` }}
                        >
                          <div className="w-full h-2.5 rounded-full bg-black/55 blur-[3px]" />
                          <div className="w-full flex items-center justify-between border-t border-brand-300/80 pt-1 mt-1">
                            <span className="w-[1px] h-1.5 bg-brand-300" />
                            <span className="bg-slate-950/90 text-brand-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-brand-400/40 whitespace-nowrap tabular-nums">
                              W: {dims.widthCm} cm
                            </span>
                            <span className="w-[1px] h-1.5 bg-brand-300" />
                          </div>
                        </div>
                      </div>

                      {/* Real-World Reference Comparison Object (Same cm-to-px scale!) */}
                      {selectedRefItem.id !== 'none' && (
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            style={{
                              width: `${refWidthPx}px`,
                              height: `${refHeightPx}px`,
                            }}
                            className="border-2 border-dashed border-sky-300/90 bg-sky-500/15 rounded-md flex flex-col items-center justify-center p-1 text-center shadow-lg"
                          >
                            <span className="text-[9px] font-bold text-sky-200 leading-tight">
                              {selectedRefItem.id === 'smartphone'
                                ? '📱'
                                : selectedRefItem.id === 'a4'
                                ? '📄'
                                : selectedRefItem.id === 'mug'
                                ? '☕'
                                : '▭'}
                            </span>
                          </div>
                          <div className="mt-2 bg-slate-950/90 border border-sky-400/50 text-sky-200 text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap tabular-nums">
                            {selectedRefItem.label.split('(')[0].trim()} ({selectedRefItem.widthCm}×
                            {selectedRefItem.heightCm} سم)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Hint Strip inside Stage */}
                  <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
                    <span className="bg-slate-950/80 backdrop-blur-md text-slate-200 text-[10px] px-2.5 py-1 rounded-lg border border-slate-700/80 flex items-center gap-1.5">
                      <Move className="w-3 h-3 text-brand-300" />
                      <span>حرّك النموذج بالسحب لتجربة موقعه على الطاولة أو الرف</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetPlacement}
                      className="pointer-events-auto bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-700/80 transition"
                    >
                      إعادة توسيط
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Captured Snapshot Preview Bar */}
            {snapshotUrl && (
              <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={snapshotUrl}
                    alt="لقطة معاينة الأبعاد"
                    className="w-16 h-11 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>تم التقاط صورة المعاينة بنجاح</span>
                    </span>
                    <p className="text-[11px] text-slate-400 truncate">
                      يمكنك حفظ الصورة ومشاركتها للتأكد من ملاءمة المساحة.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={snapshotUrl}
                    download={`rawaj-ar-${product.id}.png`}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSnapshotUrl(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                  >
                    إخفاء
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Control Panel */}
          <div className="lg:col-span-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Physical Dimensions Breakdown Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-brand-300" />
                    <span>الأبعاد والمحيط المطلوب</span>
                  </span>
                  {dims.weightKg && (
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      الوزن: {dims.weightKg} كجم
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">العرض (W)</span>
                    <strong className="text-xs text-white font-mono tabular-nums">
                      {dims.widthCm} سم
                    </strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">الارتفاع (H)</span>
                    <strong className="text-xs text-white font-mono tabular-nums">
                      {dims.heightCm} سم
                    </strong>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                    <span className="text-[10px] text-slate-400 block">العمق (D)</span>
                    <strong className="text-xs text-white font-mono tabular-nums">
                      {dims.depthCm} سم
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 bg-slate-900/70 rounded-xl px-3 py-2 border border-slate-800/80 flex items-center justify-between">
                  <span>مساحة القاعدة على الطاولة:</span>
                  <strong className="text-brand-300 font-mono tabular-nums">
                    {dims.widthCm} × {dims.depthCm} سم
                  </strong>
                </div>
              </div>

              {/* Distance / Scale Slider */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>المسافة من السطح / الغرفة</span>
                  </span>
                  <span className="text-brand-300 font-mono font-bold tabular-nums">
                    {distanceMeters.toFixed(2)} متر
                  </span>
                </div>
                <input
                  type="range"
                  min={minDistance}
                  max={maxDistance}
                  step={0.05}
                  value={distanceMeters}
                  aria-label="المسافة التقديرية من الكاميرا بالمتر"
                  onChange={(e) => setDistanceMeters(Number(e.target.value))}
                  className="w-full h-1.5 accent-[#af3fd2] cursor-pointer bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
                  <span>قريب ({minDistance} م)</span>
                  <span>بعيد ({maxDistance} م)</span>
                </div>
              </div>

              {/* Placeholder Style & Angle Controls */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-brand-300" />
                    <span>نمط النموذج التجريبي</span>
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewStyle('wireframe_product')}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition ${
                        viewStyle === 'wireframe_product'
                          ? 'bg-[#551465] text-white border-brand-400/50'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      صورة + إطار الأبعاد
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewStyle('box_only')}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition ${
                        viewStyle === 'box_only'
                          ? 'bg-[#551465] text-white border-brand-400/50'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      صندوق الأبعاد الهندسي
                    </button>
                  </div>
                </div>

                {/* Angle Slider */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">زاوية المنظور الثلاثي الأبعاد</span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">{yawDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min={-35}
                    max={35}
                    step={1}
                    value={yawDeg}
                    aria-label="تدوير منظور النموذج"
                    onChange={(e) => setYawDeg(Number(e.target.value))}
                    className="w-full h-1.5 accent-[#af3fd2] cursor-pointer bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Comparison Reference Selector */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>مقارنة بعنصر مألوف في المحيط</span>
                </label>
                <select
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value as ReferenceItemId)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#551465]"
                >
                  {REFERENCE_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      cameraStatus === 'active'
                        ? handleEnableSimulatedRoom()
                        : startCamera(facingMode)
                    }
                    className="text-[11px] font-bold text-brand-300 hover:underline flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>
                      {cameraStatus === 'active'
                        ? 'التبديل للغرفة الافتراضية'
                        : 'تشغيل الكاميرا الحقيقية'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Action Button */}
            {onAddToCart && (
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                disabled={product.stock === 0}
                className="w-full min-h-[44px] bg-[#551465] hover:bg-brand-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg text-xs transition"
              >
                <ShoppingCart className="w-4 h-4 text-brand-200" />
                <span>
                  إضافة للسلة بثقة (
                  {formatPrice(product.price, settings?.activeCurrency, settings?.yerExchangeRate)})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
