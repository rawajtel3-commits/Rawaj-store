import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

export type ImageSizeHint = 'thumb' | 'card' | 'detail';

export function getAdaptiveImageUrl(
  src: string,
  sizeHint: ImageSizeHint = 'card'
): string {
  if (!src || !src.includes('images.unsplash.com')) {
    return src;
  }

  try {
    const nav = navigator as Navigator & { connection?: NetworkInformationLike };
    const conn = nav?.connection;
    const isSlowNetwork =
      Boolean(conn?.saveData) ||
      conn?.effectiveType === 'slow-2g' ||
      conn?.effectiveType === '2g' ||
      conn?.effectiveType === '3g';

    const targetWidthMap: Record<ImageSizeHint, number> = {
      thumb: isSlowNetwork ? 160 : 260,
      card: isSlowNetwork ? 420 : 680,
      detail: isSlowNetwork ? 640 : 1000,
    };

    const targetQualityMap: Record<ImageSizeHint, number> = {
      thumb: isSlowNetwork ? 55 : 70,
      card: isSlowNetwork ? 60 : 78,
      detail: isSlowNetwork ? 65 : 82,
    };

    const url = new URL(src);
    url.searchParams.set('w', String(targetWidthMap[sizeHint]));
    url.searchParams.set('q', String(targetQualityMap[sizeHint]));
    url.searchParams.set('auto', 'format');
    return url.toString();
  } catch {
    return src;
  }
}

interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  sizeHint?: ImageSizeHint;
  eager?: boolean;
  rootMargin?: string;
  onErrorExternal?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  wrapperClassName = 'relative w-full h-full overflow-hidden bg-slate-950',
  sizeHint: rawSizeHint,
  eager = false,
  rootMargin = '200px 0px',
  onErrorExternal,
}) => {
  const sizeHint: ImageSizeHint = rawSizeHint ?? 'card';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState<boolean>(() => {
    if (eager) return true;
    return typeof IntersectionObserver === 'undefined';
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const optimizedSrc = useMemo(
    () => (src ? getAdaptiveImageUrl(src, sizeHint) : ''),
    [src, sizeHint]
  );

  // Reset load/error states when URL changes (e.g. gallery image switch)
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [optimizedSrc]);

  useEffect(() => {
    if (eager || isInView) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [eager, isInView, rootMargin]);

  return (
    <div ref={containerRef} className={wrapperClassName}>
      {/* Lightweight Skeleton Shimmer while waiting for viewport or download */}
      {!isLoaded && !hasError && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-900 animate-pulse flex items-center justify-center"
        >
          <ImageIcon className="w-5 h-5 text-slate-700" />
        </div>
      )}

      {hasError || !optimizedSrc ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-500 bg-slate-900 p-2 text-center">
          <ImageIcon className="w-5 h-5 text-slate-600" />
          <span className="text-[10px] line-clamp-1">{alt || 'صورة المنتج'}</span>
        </div>
      ) : (
        <img
          src={isInView ? optimizedSrc : undefined}
          data-src={optimizedSrc}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            onErrorExternal?.();
          }}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
