import React, { useEffect, useRef, useState } from 'react';
import {
  Star,
  Camera,
  ImagePlus,
  X,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
} from 'lucide-react';
import { Product, ProductReview } from '../types';
import { MAX_REVIEW_IMAGES, validateAndProcessReviewImage } from '../utils/reviewImages';
import { LazyImage } from './LazyImage';

interface ProductReviewsPanelProps {
  product: Product;
  onAddReview?: (
    productId: string,
    review: { userName: string; rating: number; comment: string; images?: string[] }
  ) => void;
  onLightboxOpenChange?: (isOpen: boolean) => void;
}

export const ProductReviewsPanel: React.FC<ProductReviewsPanelProps> = ({
  product,
  onAddReview,
  onLightboxOpenChange,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);

  // Review form state
  const [userName, setUserName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Lightbox state for reviewing attached customer photos
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    index: number;
    reviewerName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onLightboxOpenChange?.(Boolean(lightboxData));
  }, [lightboxData, onLightboxOpenChange]);

  useEffect(() => {
    if (!lightboxData) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setLightboxData(null);
      } else if (e.key === 'ArrowLeft' && lightboxData.images.length > 1) {
        setLightboxData((prev) =>
          prev
            ? {
                ...prev,
                index: prev.index < prev.images.length - 1 ? prev.index + 1 : 0,
              }
            : null
        );
      } else if (e.key === 'ArrowRight' && lightboxData.images.length > 1) {
        setLightboxData((prev) =>
          prev
            ? {
                ...prev,
                index: prev.index > 0 ? prev.index - 1 : prev.images.length - 1,
              }
            : null
        );
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [lightboxData]);

  const reviewsWithPhotosCount = product.reviews.filter(
    (r) => Array.isArray(r.images) && r.images.length > 0
  ).length;

  const displayedReviews: ProductReview[] = onlyWithPhotos
    ? product.reviews.filter((r) => Array.isArray(r.images) && r.images.length > 0)
    : product.reviews;

  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setUploadError(null);
    const remainingSlots = MAX_REVIEW_IMAGES - attachedImages.length;
    if (remainingSlots <= 0) {
      setUploadError(`الحد الأقصى هو ${MAX_REVIEW_IMAGES} صور لكل تقييم.`);
      return;
    }

    const toProcess = fileList.slice(0, remainingSlots);
    if (fileList.length > remainingSlots) {
      setUploadError(`تم أخذ أول ${remainingSlots} صور فقط (الحد الأقصى ${MAX_REVIEW_IMAGES} صور).`);
    }

    setIsProcessingImages(true);
    try {
      const processed: string[] = [];
      for (const file of toProcess) {
        const dataUrl = await validateAndProcessReviewImage(file);
        processed.push(dataUrl);
      }
      setAttachedImages((prev) => [...prev, ...processed].slice(0, MAX_REVIEW_IMAGES));
    } catch (err: any) {
      setUploadError(err?.message || 'تعذر رفع بعض الصور المختارة.');
    } finally {
      setIsProcessingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== index));
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !onAddReview) return;

    onAddReview(product.id, {
      userName: userName.trim() || 'عميل متجر رواج',
      rating,
      comment: comment.trim(),
      images: attachedImages.length > 0 ? attachedImages : undefined,
    });

    setSubmitSuccess(true);
    setComment('');
    setUserName('');
    setRating(5);
    setAttachedImages([]);
    setUploadError(null);
    setIsFormOpen(false);
    setOnlyWithPhotos(false);

    window.setTimeout(() => {
      setSubmitSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-amber-400 font-extrabold tabular-nums">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{product.rating}</span>
          </div>
          <span className="text-slate-400 text-[11px] tabular-nums">
            ({product.reviews.length} مراجعة)
          </span>
          {reviewsWithPhotosCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyWithPhotos((v) => !v)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                onlyWithPhotos
                  ? 'bg-[#551465] text-white border-brand-400/50'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>بالصور فقط ({reviewsWithPhotosCount})</span>
            </button>
          )}
        </div>

        {onAddReview && (
          <button
            type="button"
            onClick={() => {
              setIsFormOpen((v) => !v);
              setSubmitSuccess(false);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 shadow transition whitespace-nowrap"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            <span>{isFormOpen ? 'إغلاق النموذج' : 'أضف تقييمك بالصور'}</span>
          </button>
        )}
      </div>

      {/* Confirmation Message after Submission */}
      {submitSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-2.5 text-xs text-emerald-300 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>شكراً لك! تم نشر تقييمك وصورك المرفقة بنجاح.</span>
        </div>
      )}

      {/* Write Review + Attach Images Form */}
      {isFormOpen && onAddReview && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-white">شارك تجربتك وصور المنتج مع المشترين</span>
            {/* Interactive Star Rating Picker */}
            <div className="flex items-center gap-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const active = (hoverRating || rating) >= starVal;
                return (
                  <button
                    key={starVal}
                    type="button"
                    aria-label={`تقييم ${starVal} من 5 نجوم`}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(starVal)}
                    className="p-0.5 transition transform hover:scale-110"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        active ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="الاسم (اختياري، مثال: سارة العتيبي)"
            maxLength={40}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#551465]"
          />

          <textarea
            rows={2}
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب رأيك حول الجودة، التغليف، وسرعة التوصيل..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#551465]"
          />

          {/* Photo Attachment Uploader */}
          <div className="space-y-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.length) {
                  handleFilesSelected(e.dataTransfer.files);
                }
              }}
              className={`rounded-xl border border-dashed p-3 transition flex flex-wrap items-center justify-between gap-2 ${
                isDragging
                  ? 'border-brand-400 bg-[#551465]/20'
                  : 'border-slate-700 bg-slate-900/70'
              }`}
            >
              <div className="flex items-center gap-2 text-slate-300 min-w-0">
                <Camera className="w-4 h-4 text-brand-300 shrink-0" />
                <div className="text-[11px]">
                  <span className="font-bold block text-slate-200">
                    إرفاق صور حقيقية للمنتج ({attachedImages.length}/{MAX_REVIEW_IMAGES})
                  </span>
                  <span className="text-slate-500">
                    PNG أو JPG أو WebP · يمكنك السحب والإفلات أو الاختيار من جهازك
                  </span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleFilesSelected(e.target.files);
                  }
                }}
                className="hidden"
              />

              <button
                type="button"
                disabled={isProcessingImages || attachedImages.length >= MAX_REVIEW_IMAGES}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-white text-[11px] font-bold flex items-center gap-1.5 border border-slate-700 transition whitespace-nowrap"
              >
                <ImagePlus className="w-3.5 h-3.5 text-brand-300" />
                <span>{isProcessingImages ? 'جاري التجهيز...' : 'اختيار صور'}</span>
              </button>
            </div>

            {uploadError && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-bold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Attached Previews */}
            {attachedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachedImages.map((imgSrc, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group"
                  >
                    <img
                      src={imgSrc}
                      alt={`معاينة صورة التقييم ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label={`حذف الصورة ${idx + 1}`}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-slate-950/85 hover:bg-rose-600 text-white flex items-center justify-center shadow transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!comment.trim() || isProcessingImages}
              className="px-4 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 disabled:opacity-45 text-white text-[11px] font-extrabold transition shadow"
            >
              نشر التقييم
            </button>
          </div>
        </form>
      )}

      {/* Customer Reviews List */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {displayedReviews.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4 bg-slate-950/60 rounded-xl border border-slate-800">
            {onlyWithPhotos
              ? 'لا توجد مراجعات مرفقة بصور بعد. أضف أول تقييم مصور لهذا المنتج!'
              : 'لا توجد مراجعات مكتوبة بعد. كن أول من يكتب تقييماً لهذا المنتج!'}
          </p>
        ) : (
          displayedReviews.map((rev) => {
            const reviewImages = Array.isArray(rev.images) ? rev.images : [];
            return (
              <div
                key={rev.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-200 truncate">{rev.userName}</span>
                    {rev.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        <span>موثق</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 tabular-nums shrink-0">{rev.date}</span>
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-3 h-3 ${
                        idx < rev.rating ? 'fill-amber-400' : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">{rev.comment}</p>

                {reviewImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {reviewImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setLightboxData({
                            images: reviewImages,
                            index: idx,
                            reviewerName: rev.userName,
                          })
                        }
                        aria-label={`تكبير صورة المراجعة ${idx + 1} من ${rev.userName}`}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-700 hover:border-brand-400 bg-slate-900 group transition"
                      >
                        <LazyImage
                          src={imgUrl}
                          alt={`صورة من مراجعة ${rev.userName}`}
                          sizeHint="thumb"
                          wrapperClassName="w-full h-full"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Fullscreen Photo Lightbox for Customer Review Images */}
      {lightboxData && (
        <div
          role="dialog"
          aria-label="عرض صورة مراجعة العميل"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxData(null);
          }}
          className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="rawaj-dark-surface relative max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-white font-bold">
                <Camera className="w-4 h-4 text-brand-300" />
                <span>صورة مرفقة من تقييم: {lightboxData.reviewerName}</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxData(null)}
                aria-label="إغلاق معاينة الصورة"
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-slate-950 flex items-center justify-center max-h-[70vh] min-h-[280px]">
              <img
                src={lightboxData.images[lightboxData.index]}
                alt={`صورة مراجعة ${lightboxData.reviewerName}`}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />

              {lightboxData.images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="الصورة السابقة"
                    onClick={() =>
                      setLightboxData((prev) =>
                        prev
                          ? {
                              ...prev,
                              index: prev.index > 0 ? prev.index - 1 : prev.images.length - 1,
                            }
                          : null
                      )
                    }
                    className="absolute right-3 p-2 rounded-full bg-slate-900/85 hover:bg-slate-800 text-white border border-slate-700"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="الصورة التالية"
                    onClick={() =>
                      setLightboxData((prev) =>
                        prev
                          ? {
                              ...prev,
                              index: prev.index < prev.images.length - 1 ? prev.index + 1 : 0,
                            }
                          : null
                      )
                    }
                    className="absolute left-3 p-2 rounded-full bg-slate-900/85 hover:bg-slate-800 text-white border border-slate-700"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {lightboxData.images.length > 1 && (
              <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 text-center text-[11px] text-slate-300 tabular-nums">
                صورة {lightboxData.index + 1} من {lightboxData.images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
