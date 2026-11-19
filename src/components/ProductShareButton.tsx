import React, { useEffect, useRef, useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Globe,
  X,
  Smartphone,
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';

interface ProductShareButtonProps {
  product: Product;
  settings?: StoreSettings;
  variant?: 'card' | 'icon';
}

export const ProductShareButton: React.FC<ProductShareButtonProps> = ({
  product,
  settings,
  variant = 'card',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const productUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?product=${encodeURIComponent(product.id)}`
      : `/?product=${encodeURIComponent(product.id)}`;

  const formattedPrice = formatPrice(
    product.price,
    settings?.activeCurrency,
    settings?.yerExchangeRate
  );
  const storeName = settings?.storeName?.split('|')[0].trim() || 'متجر رواج';
  const shareText = `${product.name} بسعر ${formattedPrice} من ${storeName}`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(productUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = productUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy attempt
      const textarea = document.createElement('textarea');
      textarea.value = productUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canNativeShare) return;
    try {
      await navigator.share({
        title: product.name,
        text: shareText,
        url: productUrl,
      });
      setIsOpen(false);
    } catch {
      // User dismissed share sheet
    }
  };

  const socialChannels = [
    {
      name: 'واتساب',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${productUrl}`)}`,
      icon: <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      name: 'تيليجرام',
      href: `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`,
      icon: <Send className="w-3.5 h-3.5 text-sky-400" />,
    },
    {
      name: 'منصة X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`,
      icon: <Globe className="w-3.5 h-3.5 text-brand-300" />,
    },
    {
      name: 'فيسبوك',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
      icon: <Share2 className="w-3.5 h-3.5 text-blue-400" />,
    },
  ];

  return (
    <div ref={containerRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-label="مشاركة المنتج"
        title="مشاركة المنتج"
        className={
          variant === 'icon'
            ? `p-2 rounded-xl border text-xs font-bold transition ${
                isOpen
                  ? 'bg-[#551465] border-brand-400/50 text-white shadow'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`
            : `px-2.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isOpen
                  ? 'bg-[#551465] border-brand-400/50 text-white shadow'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`
        }
      >
        <Share2 className="w-3.5 h-3.5" />
        {variant === 'card' && <span>مشاركة</span>}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`مشاركة ${product.name}`}
          dir="rtl"
          className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 border border-[#551465]/60 rounded-2xl shadow-2xl p-3.5 z-40 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-brand-300" />
              <span>مشاركة المنتج</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="إغلاق نافذة المشاركة"
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Direct Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`w-full min-h-[38px] px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 border transition ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-400/60'
                : 'bg-[#551465] hover:bg-brand-700 text-white border-brand-400/40'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>تم نسخ رابط المنتج!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ رابط المنتج إلى الحافظة</span>
              </>
            )}
          </button>

          {/* Native System Share Sheet (Android / Supported Browsers) */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-brand-300" />
              <span>مشاركة عبر تطبيقات الجهاز</span>
            </button>
          )}

          {/* Social Media Links */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold block">
              أو شارك مباشرة عبر التواصل الاجتماعي:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {socialChannels.map((channel) => (
                <a
                  key={channel.name}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl px-2.5 py-2 flex items-center gap-1.5 font-bold text-slate-200 transition"
                >
                  {channel.icon}
                  <span>{channel.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
