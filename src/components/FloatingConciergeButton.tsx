import React, { useEffect, useRef, useState } from 'react';
import {
  Headphones,
  MessageSquareText,
  Sparkles,
  X,
  ChevronUp,
} from 'lucide-react';

interface FloatingConciergeButtonProps {
  onOpenAIAssistant: () => void;
  onOpenSellerChat: () => void;
  hasCompareBar?: boolean;
  hidden?: boolean;
}

export const FloatingConciergeButton: React.FC<FloatingConciergeButtonProps> = ({
  onOpenAIAssistant,
  onOpenSellerChat,
  hasCompareBar = false,
  hidden = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (hidden) return null;

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className={`fixed left-4 md:left-6 z-30 no-print transition-all duration-300 ${
        hasCompareBar
          ? 'bottom-44 sm:bottom-36 md:bottom-24'
          : 'bottom-20 md:bottom-6'
      }`}
    >
      {/* Expandable Quick Action Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="خيارات المساعدة والدعم المباشر"
          className="mb-3 w-64 sm:w-72 bg-slate-900/95 backdrop-blur-md border border-[#551465]/70 rounded-2xl shadow-2xl p-2 space-y-1.5 animate-fade-in"
        >
          <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-800/80">
            <span className="text-[11px] font-extrabold text-brand-200">
              المساعدة الفورية والدعم
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="إغلاق القائمة"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onOpenAIAssistant();
            }}
            className="w-full min-h-[48px] px-3 py-2.5 rounded-xl bg-[#551465]/25 hover:bg-[#551465]/45 border border-[#551465]/50 text-right flex items-center gap-3 transition group"
          >
            <span className="w-9 h-9 rounded-xl bg-[#551465] text-white flex items-center justify-center shrink-0 shadow">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-xs font-extrabold text-white block whitespace-nowrap truncate">
                المساعد الذكي للمتجر
              </span>
              <span className="text-[11px] text-slate-300 block truncate">
                اقتراح منتجات ومقارنة حسب ميزانيتك
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onOpenSellerChat();
            }}
            className="w-full min-h-[48px] px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-right flex items-center gap-3 transition group"
          >
            <span className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/35 text-purple-300 flex items-center justify-center shrink-0">
              <MessageSquareText className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-xs font-extrabold text-white block whitespace-nowrap truncate">
                محادثة البائع المباشرة
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                استفسر عن الطلبات والضمان والتخصيص
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Single Floating Concierge Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="المساعد الذكي ومحادثة البائع"
        title="المساعد الذكي ومحادثة البائع"
        className={`min-h-[46px] px-3.5 sm:px-4 py-2.5 rounded-2xl shadow-xl border transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
          isOpen
            ? 'bg-slate-900 text-white border-[#551465] shadow-[#551465]/30'
            : 'bg-gradient-to-l from-[#551465] to-purple-700 hover:from-brand-700 hover:to-purple-600 text-white border-brand-400/40 shadow-[#551465]/35 hover:scale-[1.03] active:scale-95'
        }`}
      >
        <span className="w-6 h-6 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          {isOpen ? (
            <X className="w-4 h-4 text-white" />
          ) : (
            <Headphones className="w-4 h-4 text-amber-300" />
          )}
        </span>
        <span className="text-xs font-extrabold hidden sm:inline">
          المساعد والدعم
        </span>
        {!isOpen && (
          <ChevronUp className="w-3.5 h-3.5 text-brand-200 hidden sm:inline shrink-0" />
        )}
      </button>
    </div>
  );
};
