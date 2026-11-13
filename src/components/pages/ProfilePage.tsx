import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  Coins,
  Crown,
  Gift,
  History,
  Mail,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  User,
  Edit3,
  Save,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Heart,
} from 'lucide-react';
import { LoyaltyTransaction, Order, StoreSettings, UserProfile } from '../../types';
import { formatPrice } from '../../utils/currency';
import {
  MIN_REDEEM_POINTS,
  getLoyaltyTier,
  pointsToDiscountSar,
} from '../../utils/loyalty';

interface ProfilePageProps {
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
  loyaltyPoints: number;
  pendingRedeemPoints: number;
  onSetPendingRedeemPoints: (points: number) => void;
  loyaltyHistory: LoyaltyTransaction[];
  orders: Order[];
  wishlistCount: number;
  cartCount: number;
  onBackToHome: () => void;
  onNavigateToOrders: () => void;
  onNavigateToHome: () => void;
  onOpenCart: () => void;
  settings: StoreSettings;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  onUpdateProfile,
  loyaltyPoints,
  pendingRedeemPoints,
  onSetPendingRedeemPoints,
  loyaltyHistory,
  orders,
  wishlistCount,
  cartCount,
  onBackToHome,
  onNavigateToOrders,
  onNavigateToHome,
  onOpenCart,
  settings,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  const maxRedeemable = Math.floor(loyaltyPoints / 10) * 10;
  const [customRedeemPoints, setCustomRedeemPoints] = useState<number>(() =>
    pendingRedeemPoints > 0
      ? pendingRedeemPoints
      : Math.min(250, Math.max(MIN_REDEEM_POINTS, maxRedeemable))
  );
  const [redeemFeedback, setRedeemFeedback] = useState<string>('');

  const lifetimeEarned = loyaltyHistory
    .filter((t) => t.type === 'earned')
    .reduce((sum, t) => sum + t.points, 0);
  const totalRedeemedPoints = loyaltyHistory
    .filter((t) => t.type === 'redeemed')
    .reduce((sum, t) => sum + t.points, 0);

  const tier = getLoyaltyTier(lifetimeEarned);
  const pointsCashValueSar = pointsToDiscountSar(loyaltyPoints);
  const pendingDiscountSar = pointsToDiscountSar(pendingRedeemPoints);

  const presetPacks = [
    { points: 100, label: '100 نقطة' },
    { points: 250, label: '250 نقطة' },
    { points: 500, label: '500 نقطة' },
    { points: 1000, label: '1,000 نقطة' },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...draftProfile,
      fullName: draftProfile.fullName.trim() || profile.fullName,
      email: draftProfile.email.trim() || profile.email,
      phone: draftProfile.phone.trim() || profile.phone,
      city: draftProfile.city.trim() || profile.city,
    });
    setIsEditingProfile(false);
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 3000);
  };

  const handleActivateRedemption = (targetPoints: number) => {
    const clamped = Math.min(maxRedeemable, Math.max(MIN_REDEEM_POINTS, Math.floor(targetPoints / 10) * 10));
    if (loyaltyPoints < MIN_REDEEM_POINTS || clamped < MIN_REDEEM_POINTS) {
      setRedeemFeedback(`الحد الأدنى للاستبدال هو ${MIN_REDEEM_POINTS} نقطة.`);
      return;
    }
    setCustomRedeemPoints(clamped);
    onSetPendingRedeemPoints(clamped);
    setRedeemFeedback(
      `تم تفعيل خصم ${formatPrice(
        pointsToDiscountSar(clamped),
        settings.activeCurrency,
        settings.yerExchangeRate
      )} (${clamped.toLocaleString()} نقطة) وسيُطبق تلقائياً على طلبك القادم.`
    );
  };

  const handleCancelPendingRedeem = () => {
    onSetPendingRedeemPoints(0);
    setRedeemFeedback('');
  };

  const totalSpentSar = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-brand-300 hover:text-white inline-flex items-center gap-2 font-bold transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
            <span>الملف الشخصي ونظام نقاط الولاء</span>
          </h1>
          <p className="text-xs text-slate-400">
            تابع رصيد نقاطك المكتسبة مع كل عملية شراء، واستبدلها بخصومات فورية على طلباتك القادمة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNavigateToOrders}
            className="flex-1 sm:flex-initial min-h-[40px] bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Package className="w-4 h-4 text-brand-300" />
            <span>طلباتي ({orders.length})</span>
          </button>
          <button
            type="button"
            onClick={cartCount > 0 ? onOpenCart : onNavigateToHome}
            className="flex-1 sm:flex-initial min-h-[40px] bg-[#551465] hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition"
          >
            <ShoppingBag className="w-4 h-4 text-brand-200" />
            <span>{cartCount > 0 ? `الذهاب للسلة (${cartCount})` : 'تسوق واكسب نقاطاً'}</span>
          </button>
        </div>
      </div>

      {/* Top Grid: User Profile Card + Loyalty Wallet Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer Profile Card */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#551465] to-purple-500 p-0.5 shrink-0 shadow-lg">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-brand-300">
                  <User className="w-7 h-7" />
                </div>
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                  {profile.fullName}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold mt-0.5">
                  <Award className="w-4 h-4 shrink-0" />
                  <span>{tier.nameAr}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDraftProfile(profile);
                setIsEditingProfile((v) => !v);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
              title="تعديل بيانات الملف الشخصي"
              aria-label="تعديل بيانات الملف الشخصي"
            >
              {isEditingProfile ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
          </div>

          {profileSavedNotice && (
            <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>تم تحديث بيانات ملفك الشخصي بنجاح.</span>
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={draftProfile.fullName}
                  onChange={(e) => setDraftProfile({ ...draftProfile, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#551465]"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={draftProfile.email}
                  onChange={(e) => setDraftProfile({ ...draftProfile, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#551465]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    value={draftProfile.phone}
                    onChange={(e) => setDraftProfile({ ...draftProfile, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#551465]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={draftProfile.city}
                    onChange={(e) => setDraftProfile({ ...draftProfile, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#551465]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full min-h-[40px] bg-[#551465] hover:bg-brand-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ التعديلات</span>
              </button>
            </form>
          ) : (
            <div className="space-y-2.5 text-xs bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-brand-300 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-mono" dir="ltr">
                  {profile.phone}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{profile.city}</span>
              </div>
            </div>
          )}

          {/* Account Quick KPIs */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] text-slate-400 block">إجمالي الطلبات</span>
              <strong className="text-base font-extrabold text-white tabular-nums">
                {orders.length}
              </strong>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] text-slate-400 block">المفضلة</span>
              <strong className="text-base font-extrabold text-rose-400 tabular-nums flex items-center justify-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-400" />
                {wishlistCount}
              </strong>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
              <span className="text-[10px] text-slate-400 block">مجموع الإنفاق</span>
              <strong className="text-xs sm:text-sm font-extrabold text-brand-300 tabular-nums">
                {formatPrice(totalSpentSar, settings.activeCurrency, settings.yerExchangeRate)}
              </strong>
            </div>
          </div>
        </div>

        {/* Loyalty Wallet & Tier Card */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400 block">محفظة مكافآت رواج</span>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span>رصيد نقاط الولاء المتاح</span>
                </h3>
              </div>

              <span className="bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>10 نقاط = 1 ر.س خصم</span>
              </span>
            </div>

            {/* Points Hero Balance */}
            <div className="bg-gradient-to-l from-[#551465]/35 via-slate-950 to-slate-950 border border-[#551465]/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">
                    {loyaltyPoints.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-brand-300">نقطة متاحة</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  تعادل خصماً فورياً بقيمة{' '}
                  <strong className="text-emerald-400 tabular-nums">
                    {formatPrice(
                      pointsCashValueSar,
                      settings.activeCurrency,
                      settings.yerExchangeRate
                    )}
                  </strong>{' '}
                  على طلباتك القادمة
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 shrink-0">
                <div>
                  <span className="text-[10px] text-slate-400 block">المكتسبة كلياً</span>
                  <strong className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                    +{lifetimeEarned.toLocaleString()}
                  </strong>
                </div>
                <div className="w-px h-7 bg-slate-800" />
                <div>
                  <span className="text-[10px] text-slate-400 block">المستبدلة</span>
                  <strong className="text-sm font-extrabold text-purple-300 font-mono tabular-nums">
                    {totalRedeemedPoints.toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Tier Progress Bar */}
            <div className="bg-slate-950/75 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>مستوى العضوية: {tier.nameAr}</span>
                </span>
                {tier.nextTierNameAr && tier.nextTierPoints ? (
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    متبقي{' '}
                    <strong className="text-brand-300">
                      {Math.max(0, tier.nextTierPoints - lifetimeEarned).toLocaleString()} نقطة
                    </strong>{' '}
                    للترقية إلى {tier.nextTierNameAr}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-300 font-bold">
                    وصلت لأعلى مستوى ولاء في المتجر!
                  </span>
                )}
              </div>

              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-[#551465] via-[#af3fd2] to-amber-400 transition-all duration-500"
                  style={{ width: `${Math.max(8, tier.progressPercent)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400">{tier.perkAr}</p>
            </div>
          </div>

          {/* Earning Formula Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
              <Gift className="w-4 h-4 text-brand-300 shrink-0" />
              <span className="text-slate-300">
                تحصل تلقائياً على <strong className="text-white">1 نقطة لكل 10 ر.س</strong> مع كل طلب جديد.
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                الحد الأدنى للاستبدال <strong className="text-white">{MIN_REDEEM_POINTS} نقطة</strong> (5 ر.س خصم).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Points Redemption & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Redeem Points for Upcoming Orders */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="border-b border-slate-800 pb-3.5">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-brand-300" />
              <span>استبدال النقاط بخصم مباشر للطلب القادم</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              اختر عدد النقاط التي ترغب في تحويلها إلى خصم نقدي مباشر عند إتمام الشراء.
            </p>
          </div>

          {/* Active Pending Redemption Status */}
          {pendingRedeemPoints > 0 && (
            <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-extrabold text-white">
                      خصم النقاط مفعّل لطلبك القادم!
                    </h4>
                    <p className="text-[11px] text-emerald-200">
                      سيتم خصم{' '}
                      <strong className="tabular-nums">
                        {formatPrice(
                          pendingDiscountSar,
                          settings.activeCurrency,
                          settings.yerExchangeRate
                        )}
                      </strong>{' '}
                      ({pendingRedeemPoints.toLocaleString()} نقطة) تلقائياً في السلة وصفحة الدفع.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelPendingRedeem}
                  className="text-[11px] font-bold text-rose-300 hover:text-rose-200 underline shrink-0"
                >
                  إلغاء التفعيل
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={cartCount > 0 ? onOpenCart : onNavigateToHome}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition"
                >
                  {cartCount > 0 ? 'تطبيق الخصم وإتمام السلة الآن' : 'تصفح المنتجات للاستفادة من الخصم'}
                </button>
              </div>
            </div>
          )}

          {redeemFeedback && pendingRedeemPoints === 0 && (
            <div className="bg-amber-950/50 border border-amber-500/40 text-amber-200 rounded-xl p-3 text-xs">
              {redeemFeedback}
            </div>
          )}

          {/* Quick Redemption Packs */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 block">باقات الاستبدال السريعة:</span>
            <div className="grid grid-cols-2 gap-2.5">
              {presetPacks.map((pack) => {
                const isAffordable = loyaltyPoints >= pack.points;
                const isSelected = pendingRedeemPoints === pack.points;
                return (
                  <button
                    key={pack.points}
                    type="button"
                    disabled={!isAffordable}
                    onClick={() => handleActivateRedemption(pack.points)}
                    className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-[#551465]/30 border-[#551465] text-white shadow-lg'
                        : isAffordable
                        ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800/50 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-extrabold">{pack.label}</span>
                      <span className="text-[11px] font-bold text-emerald-400 tabular-nums">
                        خصم{' '}
                        {formatPrice(
                          pointsToDiscountSar(pack.points),
                          settings.activeCurrency,
                          settings.yerExchangeRate
                        )}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {isSelected
                        ? '✓ مفعّل للطلب القادم'
                        : isAffordable
                        ? 'اضغط لتفعيل الخصم'
                        : 'رصيد النقاط غير كافٍ'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Points Slider */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">تحديد عدد نقاط مخصص:</span>
              <span className="text-brand-300 font-extrabold font-mono tabular-nums">
                {Math.min(maxRedeemable, customRedeemPoints).toLocaleString()} نقطة ={' '}
                {formatPrice(
                  pointsToDiscountSar(Math.min(maxRedeemable, customRedeemPoints)),
                  settings.activeCurrency,
                  settings.yerExchangeRate
                )}
              </span>
            </div>

            <input
              type="range"
              min={MIN_REDEEM_POINTS}
              max={Math.max(MIN_REDEEM_POINTS, maxRedeemable)}
              step={10}
              disabled={maxRedeemable < MIN_REDEEM_POINTS}
              value={Math.min(Math.max(MIN_REDEEM_POINTS, customRedeemPoints), Math.max(MIN_REDEEM_POINTS, maxRedeemable))}
              aria-label="اختيار عدد النقاط للاستبدال"
              onChange={(e) => setCustomRedeemPoints(Number(e.target.value))}
              className="w-full h-1.5 accent-[#af3fd2] cursor-pointer bg-slate-800 rounded-lg disabled:opacity-40"
            />

            <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
              <span>الحد الأدنى: {MIN_REDEEM_POINTS} نقطة</span>
              <span>المتاح: {maxRedeemable.toLocaleString()} نقطة</span>
            </div>

            <button
              type="button"
              disabled={maxRedeemable < MIN_REDEEM_POINTS}
              onClick={() => handleActivateRedemption(customRedeemPoints)}
              className="w-full min-h-[42px] bg-[#551465] hover:bg-brand-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold rounded-xl text-xs shadow transition"
            >
              تفعيل خصم بقيمة{' '}
              {formatPrice(
                pointsToDiscountSar(Math.min(maxRedeemable, customRedeemPoints)),
                settings.activeCurrency,
                settings.yerExchangeRate
              )}{' '}
              على الطلب القادم
            </button>
          </div>
        </div>

        {/* Points Transaction History */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <span>سجل حركات نقاط الولاء</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                جميع النقاط المكتسبة من المشتريات والنقاط المستبدلة بخصومات.
              </p>
            </div>
            <span className="text-xs bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-xl font-bold tabular-nums">
              {loyaltyHistory.length} حركة
            </span>
          </div>

          <div className="space-y-2.5 flex-1 max-h-[400px] overflow-y-auto pl-1">
            {loyaltyHistory.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                لا توجد حركات نقاط مسجلة بعد. أتمم أول طلب لك لكسب النقاط!
              </div>
            ) : (
              loyaltyHistory.map((tx) => {
                const isEarned = tx.type === 'earned';
                return (
                  <div
                    key={tx.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                          isEarned
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                            : 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                        }`}
                      >
                        {isEarned ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{tx.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{tx.date}</span>
                          {tx.orderNumber && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-brand-300">{tx.orderNumber}</span>
                            </>
                          )}
                          {tx.discountValueSar && tx.discountValueSar > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-400 font-bold">
                                وفّرت{' '}
                                {formatPrice(
                                  tx.discountValueSar,
                                  settings.activeCurrency,
                                  settings.yerExchangeRate
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-sm font-black font-mono tabular-nums shrink-0 ${
                        isEarned ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isEarned ? `+${tx.points}` : `-${tx.points}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
