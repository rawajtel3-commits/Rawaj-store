import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  TrendingDown,
  Trash2,
  ArrowUpLeft,
  X,
} from 'lucide-react';
import { InAppNotification, PriceDropAlert, Product, StoreSettings } from '../types';
import { formatPrice } from '../utils/currency';
import { LazyImage } from './LazyImage';

interface NotificationCenterPopoverProps {
  notifications: InAppNotification[];
  priceAlerts: PriceDropAlert[];
  products: Product[];
  settings: StoreSettings;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onRemovePriceAlert: (productId: string) => void;
  onOpenProduct: (product: Product) => void;
}

export const NotificationCenterPopover: React.FC<NotificationCenterPopoverProps> = ({
  notifications,
  priceAlerts,
  products,
  settings,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotifications,
  onRemovePriceAlert,
  onOpenProduct,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'notifications' | 'alerts'>('notifications');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif: InAppNotification) => {
    onMarkAsRead(notif.id);
    if (notif.productId) {
      const target = products.find((p) => p.id === notif.productId);
      if (target) {
        setIsOpen(false);
        onOpenProduct(target);
      }
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="الإشعارات وتنبيهات انخفاض الأسعار"
        title="الإشعارات وتنبيهات الأسعار"
        className={`p-1.5 sm:p-2 rounded-xl border transition relative ${
          isOpen || unreadCount > 0
            ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
        }`}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-amber-400" />
        ) : (
          <Bell className="w-4 h-4 text-slate-300" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-black tabular-nums shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="مركز الإشعارات وتنبيهات الأسعار"
          className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:left-0 top-[108px] sm:top-full sm:mt-2 sm:w-96 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-right"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-extrabold text-white">إشعارات الأسعار والتنبيهات</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              aria-label="إغلاق الإشعارات"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Segmented Tabs */}
          <div className="p-2 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab('notifications')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition ${
                tab === 'notifications'
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الإشعارات ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('alerts')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition ${
                tab === 'alerts'
                  ? 'bg-[#551465] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              تنبيهاتي النشطة ({priceAlerts.length})
            </button>
          </div>

          {/* Body */}
          {tab === 'notifications' ? (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">لا توجد إشعارات حالياً</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    فعّل «تنبيه انخفاض السعر» من صفحة أي منتج ليصلك إشعار فوري عند تخفيض سعره.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition ${
                      notif.read ? 'bg-slate-900/60' : 'bg-[#551465]/15'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notif.productImage ? (
                        <LazyImage
                          src={notif.productImage}
                          alt={notif.productName || notif.title}
                          sizeHint="thumb"
                          wrapperClassName="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <TrendingDown className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>{notif.title}</span>
                          </span>
                          {!notif.read && (
                            <span className="text-[10px] font-bold text-amber-300">جديد</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-200 leading-relaxed">
                          {notif.message}
                        </p>

                        {notif.oldPrice !== undefined && notif.newPrice !== undefined && (
                          <div className="flex items-center gap-2 text-[11px] tabular-nums pt-0.5">
                            <span className="font-extrabold text-white">
                              {formatPrice(notif.newPrice, settings.activeCurrency, settings.yerExchangeRate)}
                            </span>
                            <span className="text-slate-500 line-through">
                              {formatPrice(notif.oldPrice, settings.activeCurrency, settings.yerExchangeRate)}
                            </span>
                          </div>
                        )}

                        {notif.productId && (
                          <button
                            type="button"
                            onClick={() => handleNotificationClick(notif)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-300 hover:text-brand-200 pt-1"
                          >
                            <span>فتح المنتج للشراء الآن</span>
                            <ArrowUpLeft className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
              {priceAlerts.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <TrendingDown className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">لم تفعّل أي تنبيهات أسعار بعد</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    افتح صفحة تفاصيل أي منتج واضغط على «تفعيل تنبيه انخفاض السعر».
                  </p>
                </div>
              ) : (
                priceAlerts.map((alert) => {
                  const liveProd = products.find((p) => p.id === alert.productId);
                  return (
                    <div
                      key={alert.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-950/60 transition"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (liveProd) {
                            setIsOpen(false);
                            onOpenProduct(liveProd);
                          }
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-right"
                      >
                        <LazyImage
                          src={liveProd?.images[0] || alert.productImage}
                          alt={alert.productName}
                          sizeHint="thumb"
                          wrapperClassName="w-11 h-11 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0"
                          className="w-full h-full object-cover"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-xs font-bold text-white block truncate">
                            {liveProd?.name || alert.productName}
                          </span>
                          <span className="text-[10px] text-slate-400 block tabular-nums">
                            السعر المراقب:{' '}
                            {formatPrice(
                              liveProd?.price ?? alert.subscribedPrice,
                              settings.activeCurrency,
                              settings.yerExchangeRate
                            )}
                            {alert.targetPrice
                              ? ` · الهدف: ${formatPrice(
                                  alert.targetPrice,
                                  settings.activeCurrency,
                                  settings.yerExchangeRate
                                )}`
                              : ' · أي تخفيض'}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemovePriceAlert(alert.productId)}
                        aria-label={`إلغاء تنبيه السعر لـ ${alert.productName}`}
                        className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 transition shrink-0"
                        title="إلغاء التنبيه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Footer Actions */}
          {tab === 'notifications' && notifications.length > 0 && (
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-brand-300 hover:text-brand-200 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>تحديد الكل كمقروء</span>
              </button>
              <button
                type="button"
                onClick={onClearNotifications}
                className="text-slate-400 hover:text-rose-400 font-bold px-2 py-1 rounded-lg hover:bg-slate-900 transition"
              >
                مسح السجل
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
