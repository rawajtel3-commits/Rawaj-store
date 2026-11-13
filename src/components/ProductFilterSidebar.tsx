import React from 'react';
import {
  SlidersHorizontal,
  Star,
  RotateCcw,
  Check,
  Tag,
  Sparkles,
  PackageCheck,
  X
} from 'lucide-react';
import { StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';

export interface BrandFacet {
  name: string;
  count: number;
}

interface ProductFilterSidebarProps {
  minCatalogPrice: number;
  maxCatalogPrice: number;
  priceMin: number;
  priceMax: number;
  onPriceRangeChange: (min: number, max: number) => void;
  brands: BrandFacet[];
  selectedBrands: string[];
  onToggleBrand: (brand: string) => void;
  minRating: number;
  onMinRatingChange: (rating: number) => void;
  inStockOnly: boolean;
  onToggleInStockOnly: () => void;
  onSaleOnly: boolean;
  onToggleOnSaleOnly: () => void;
  activeFilterCount: number;
  onResetFilters: () => void;
  totalMatching: number;
  settings: StoreSettings;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const ProductFilterSidebar: React.FC<ProductFilterSidebarProps> = ({
  minCatalogPrice,
  maxCatalogPrice,
  priceMin,
  priceMax,
  onPriceRangeChange,
  brands,
  selectedBrands,
  onToggleBrand,
  minRating,
  onMinRatingChange,
  inStockOnly,
  onToggleInStockOnly,
  onSaleOnly,
  onToggleOnSaleOnly,
  activeFilterCount,
  onResetFilters,
  totalMatching,
  settings,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const ratingOptions = [
    { value: 0, label: 'جميع التقييمات' },
    { value: 4.9, label: '4.9 ★ فأعلى (نخبة المتجر)' },
    { value: 4.8, label: '4.8 ★ فأعلى (ممتاز)' },
    { value: 4.5, label: '4.5 ★ فأعلى (جيد جداً)' },
    { value: 4.0, label: '4.0 ★ فأعلى' },
  ];

  const pricePresets = [
    { label: 'الكل', min: minCatalogPrice, max: maxCatalogPrice },
    { label: `أقل من ${formatPrice(1500, settings.activeCurrency, settings.yerExchangeRate)}`, min: minCatalogPrice, max: Math.min(1500, maxCatalogPrice) },
    {
      label: `${formatPrice(1500, settings.activeCurrency, settings.yerExchangeRate)} - ${formatPrice(4000, settings.activeCurrency, settings.yerExchangeRate)}`,
      min: Math.max(minCatalogPrice, 1500),
      max: Math.min(maxCatalogPrice, 4000),
    },
    { label: `أعلى من ${formatPrice(4000, settings.activeCurrency, settings.yerExchangeRate)}`, min: Math.min(maxCatalogPrice, 4000), max: maxCatalogPrice },
  ];

  const filterPanelBody = (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-5 shadow-xl" dir="rtl">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#551465]/25 border border-[#551465]/40 flex items-center justify-center text-brand-300">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>تصفية المنتجات</span>
              {activeFilterCount > 0 && (
                <span className="bg-[#551465] text-white text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </h4>
            <span className="text-[11px] text-slate-400 block tabular-nums">
              تحديث لحظي ({totalMatching} منتج)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 px-2.5 py-1.5 rounded-xl border border-rose-500/30 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>مسح</span>
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              aria-label="إغلاق الفلاتر"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Price Range Filter */}
      <div className="space-y-3 border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-white flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-brand-300" />
            <span>النطاق السعري</span>
          </span>
          <span className="text-[11px] font-bold text-brand-300 tabular-nums">
            {formatPrice(priceMin, settings.activeCurrency, settings.yerExchangeRate)} —{' '}
            {formatPrice(priceMax, settings.activeCurrency, settings.yerExchangeRate)}
          </span>
        </div>

        {/* Min / Max Numeric Inputs (in SAR base catalog values) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">من (ر.س)</label>
            <input
              type="number"
              min={minCatalogPrice}
              max={priceMax}
              value={priceMin}
              onChange={(e) => {
                const nextMin = Math.max(minCatalogPrice, Math.min(Number(e.target.value) || 0, priceMax));
                onPriceRangeChange(nextMin, priceMax);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold tabular-nums focus:outline-none focus:border-[#551465]"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">إلى (ر.س)</label>
            <input
              type="number"
              min={priceMin}
              max={maxCatalogPrice}
              value={priceMax}
              onChange={(e) => {
                const nextMax = Math.min(maxCatalogPrice, Math.max(Number(e.target.value) || minCatalogPrice, priceMin));
                onPriceRangeChange(priceMin, nextMax);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white font-bold tabular-nums focus:outline-none focus:border-[#551465]"
            />
          </div>
        </div>

        {/* Interactive Max Price Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min={minCatalogPrice}
            max={maxCatalogPrice}
            step={50}
            value={priceMax}
            aria-label="الحد الأقصى للسعر"
            onChange={(e) => {
              const nextMax = Math.max(Number(e.target.value), priceMin);
              onPriceRangeChange(priceMin, nextMax);
            }}
            className="w-full h-1.5 accent-[#af3fd2] cursor-pointer bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
            <span>{formatPrice(minCatalogPrice, settings.activeCurrency, settings.yerExchangeRate)}</span>
            <span>{formatPrice(maxCatalogPrice, settings.activeCurrency, settings.yerExchangeRate)}</span>
          </div>
        </div>

        {/* Quick Price Range Presets */}
        <div className="flex flex-wrap gap-1.5">
          {pricePresets.map((preset, idx) => {
            const isActive = priceMin === preset.min && priceMax === preset.max;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onPriceRangeChange(preset.min, preset.max)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  isActive
                    ? 'bg-[#551465] text-white border-brand-500/50'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Brand Multi-Select Filter */}
      <div className="space-y-2.5 border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>العلامة التجارية</span>
          </span>
          {selectedBrands.length > 0 && (
            <span className="text-[10px] text-brand-300 font-bold">
              ({selectedBrands.length} محدد)
            </span>
          )}
        </div>

        <div className="space-y-1.5 max-h-52 overflow-y-auto pl-1">
          {brands.map((brand) => {
            const isChecked = selectedBrands.includes(brand.name);
            return (
              <button
                key={brand.name}
                type="button"
                onClick={() => onToggleBrand(brand.name)}
                aria-pressed={isChecked}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition text-right ${
                  isChecked
                    ? 'bg-[#551465]/20 border-[#551465] text-white font-bold'
                    : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                      isChecked
                        ? 'bg-[#551465] border-brand-400 text-white'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                  </span>
                  <span className="truncate">{brand.name}</span>
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono tabular-nums shrink-0">
                  {brand.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Ratings Filter */}
      <div className="space-y-2.5 border-b border-slate-800 pb-4">
        <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>تقييم العملاء</span>
        </span>

        <div className="space-y-1.5">
          {ratingOptions.map((opt) => {
            const isSelected = minRating === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onMinRatingChange(opt.value)}
                aria-pressed={isSelected}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition ${
                  isSelected
                    ? 'bg-[#551465]/20 border-[#551465] text-white font-bold'
                    : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {opt.value > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-400" dir="ltr">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                    </span>
                  )}
                  <span>{opt.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-300 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Availability & Offers Quick Toggles */}
      <div className="space-y-2">
        <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
          <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>خيارات إضافية</span>
        </span>

        <button
          type="button"
          onClick={onToggleInStockOnly}
          aria-pressed={inStockOnly}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition ${
            inStockOnly
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 font-bold'
              : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
          }`}
        >
          <span>المتوفر في المخزون فقط</span>
          <span
            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
              inStockOnly ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900 border-slate-700'
            }`}
          >
            {inStockOnly && <Check className="w-3 h-3" />}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleOnSaleOnly}
          aria-pressed={onSaleOnly}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition ${
            onSaleOnly
              ? 'bg-rose-950/50 border-rose-500/40 text-rose-300 font-bold'
              : 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-slate-300'
          }`}
        >
          <span>منتجات عليها خصم فقط</span>
          <span
            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
              onSaleOnly ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-900 border-slate-700'
            }`}
          >
            {onSaleOnly && <Check className="w-3 h-3" />}
          </span>
        </button>
      </div>

      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden w-full min-h-[44px] bg-[#551465] hover:bg-brand-700 text-white font-extrabold rounded-2xl text-xs shadow-lg transition"
        >
          عرض {totalMatching} منتج مطابق
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block lg:col-span-3 sticky top-36 self-start">
        {filterPanelBody}
      </aside>

      {/* Mobile / Tablet Slide-Over Filter Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-start" dir="rtl">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-full max-w-sm h-full overflow-y-auto p-3 sm:p-4 bg-slate-950 border-l border-slate-800 shadow-2xl">
            {filterPanelBody}
          </div>
        </div>
      )}
    </>
  );
};
