import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Fingerprint,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Activity,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import {
  AuthUserSummary,
  isAdminRole,
  SecurityAuditEntry,
  SecurityAuditEventType,
  ServerSessionState,
} from '../types';

export type AuthModalMode = 'account' | 'admin-gate';

interface AuthModalProps {
  isOpen: boolean;
  mode: AuthModalMode;
  onClose: () => void;
  authReady: boolean;
  authUser: AuthUserSummary | null;
  serverSession: ServerSessionState;
  securityLogs: SecurityAuditEntry[];
  hasWebAuthnPasskey: boolean;
  isWebAuthnSupported: boolean;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSetupPin: (pin: string) => Promise<{ ok: boolean; message: string }>;
  onVerifyPin: (pin: string) => Promise<{ ok: boolean; message: string; lockedUntil?: number }>;
  onDisablePin: (pin: string) => Promise<{ ok: boolean; message: string }>;
  onVerifyBiometrics: () => Promise<{ ok: boolean; message: string }>;
  onEnterAdminAfterUnlock?: () => void;
  onNavigateToProfileSecurity?: () => void;
}

const EVENT_LABELS: Record<SecurityAuditEventType, string> = {
  google_signin: 'تسجيل دخول موثق عبر Google',
  pin_verified: 'تأكيد رمز الأمان الثنائي (2FA)',
  pin_failed: 'محاولة إدخال رمز أمان خاطئة',
  pin_enabled: 'تفعيل رمز الأمان الثنائي (6 أرقام)',
  pin_disabled: 'إلغاء رمز الأمان الثنائي',
  webauthn_verified: 'تحقق بيومتري (البصمة / الوجه)',
  signout: 'تسجيل خروج آمن وإبطال الجلسة',
  admin_access: 'دخول مصرح به للوحة الإدارة',
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  onClose,
  authReady,
  authUser,
  serverSession,
  securityLogs,
  hasWebAuthnPasskey,
  isWebAuthnSupported,
  onGoogleSignIn,
  onSignOut,
  onSetupPin,
  onVerifyPin,
  onDisablePin,
  onVerifyBiometrics,
  onEnterAdminAfterUnlock,
  onNavigateToProfileSecurity,
}) => {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [disablePinInput, setDisablePinInput] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showDisablePin, setShowDisablePin] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | undefined>(serverSession.lockedUntil);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setLockedUntil(serverSession.lockedUntil);
  }, [serverSession.lockedUntil]);

  useEffect(() => {
    if (!isOpen) {
      setFeedback(null);
      setPinInput('');
      setConfirmPinInput('');
      setDisablePinInput('');
      setShowPinSetup(false);
      setShowDisablePin(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!lockedUntil || lockedUntil <= Date.now()) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const lockRemainingSec =
    lockedUntil && lockedUntil > nowMs ? Math.ceil((lockedUntil - nowMs) / 1000) : 0;
  const isLockedOut = lockRemainingSec > 0;
  const needsPinUnlock = Boolean(authUser && serverSession.pinEnabled && !serverSession.pinVerified);
  const isAdminAuthorized = Boolean(authUser && isAdminRole(authUser.role));

  const handleGoogleLoginClick = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await onGoogleSignIn();
      setFeedback({
        type: 'success',
        text: 'تم تسجيل الدخول الآمن والتحقق من الجلسة بنجاح.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر إتمام تسجيل الدخول الآمن.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    if (!/^\d{6}$/.test(pinInput)) {
      setFeedback({ type: 'error', text: 'يرجى إدخال رمز أمان مكون من 6 أرقام.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    const res = await onVerifyPin(pinInput);
    setBusy(false);
    setPinInput('');
    if (res.lockedUntil) {
      setLockedUntil(res.lockedUntil);
      setNowMs(Date.now());
    }
    setFeedback({ type: res.ok ? 'success' : 'error', text: res.message });
    if (res.ok && mode === 'admin-gate' && isAdminAuthorized && onEnterAdminAfterUnlock) {
      onEnterAdminAfterUnlock();
    }
  };

  const handleSetupPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pinInput)) {
      setFeedback({ type: 'error', text: 'يجب أن يتكون رمز الأمان من 6 أرقام بالضبط.' });
      return;
    }
    if (pinInput !== confirmPinInput) {
      setFeedback({ type: 'error', text: 'تأكيد رمز الأمان غير مطابق.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    const res = await onSetupPin(pinInput);
    setBusy(false);
    setFeedback({ type: res.ok ? 'success' : 'error', text: res.message });
    if (res.ok) {
      setPinInput('');
      setConfirmPinInput('');
      setShowPinSetup(false);
    }
  };

  const handleDisablePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(disablePinInput)) {
      setFeedback({ type: 'error', text: 'أدخل رمز الأمان الحالي المكون من 6 أرقام.' });
      return;
    }
    const candidate = disablePinInput;
    setDisablePinInput('');
    setBusy(true);
    setFeedback(null);
    const res = await onDisablePin(candidate);
    setBusy(false);
    setFeedback({ type: res.ok ? 'success' : 'error', text: res.message });
    if (res.ok) {
      setShowDisablePin(false);
    }
  };

  const handleBiometricVerifyClick = async () => {
    setBusy(true);
    setFeedback(null);
    const res = await onVerifyBiometrics();
    setBusy(false);
    setFeedback({ type: res.ok ? 'success' : 'error', text: res.message });
    if (res.ok && mode === 'admin-gate' && isAdminAuthorized && onEnterAdminAfterUnlock) {
      onEnterAdminAfterUnlock();
    }
  };

  const handleSignOutClick = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await onSignOut();
      setFeedback({ type: 'success', text: 'تم تسجيل الخروج وإبطال الجلسة بنجاح.' });
    } finally {
      setBusy(false);
    }
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
        role="dialog"
        aria-modal="true"
        aria-label="بوابة تسجيل الدخول الآمن والأمان"
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-5 my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#551465]/25 border border-brand-400/40 flex items-center justify-center text-brand-300 shrink-0">
              {mode === 'admin-gate' ? (
                <Lock className="w-5 h-5 text-amber-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {mode === 'admin-gate'
                  ? 'حماية الوصول إلى لوحة الإدارة'
                  : 'تسجيل الدخول الآمن وإدارة الجلسة'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'admin-gate'
                  ? 'يتطلب الدخول مصادقة موثقة وصلاحيات إدارة معتمدة'
                  : 'حماية متعددة الطبقات: Google Auth + HttpOnly + 2FA + WebAuthn'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة تسجيل الدخول"
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            role="alert"
            className={`rounded-2xl p-3.5 text-xs font-bold flex items-start gap-2.5 border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Loading Auth State */}
        {!authReady ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-brand-300" />
            <span>جاري التحقق من حالة الجلسة الأمنية...</span>
          </div>
        ) : !authUser ? (
          /* Unauthenticated Sign-In View */
          <div className="space-y-4">
            {mode === 'admin-gate' && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  لوحة تحكم الإدارة محمية. يرجى تسجيل الدخول بحساب الإدارة المعتمد أولاً للتحقق من الهوية والصلاحيات.
                </span>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-300" />
                <span>معايير الأمان المطبّقة في جلسة دخولك:</span>
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                <li className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>مصادقة Google والتحقق من البريد</span>
                </li>
                <li className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>جلسة خادم موقّعة HttpOnly</span>
                </li>
                <li className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>تحقق ثنائي 2FA + حظر التخمين</span>
                </li>
                <li className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>دعم البصمة / الوجه WebAuthn</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleLoginClick}
              className="w-full min-h-[48px] bg-[#551465] hover:bg-brand-700 disabled:opacity-60 text-white font-extrabold px-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-3 shadow-xl shadow-[#551465]/30 border border-brand-400/40 transition"
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UserCheck className="w-5 h-5 text-brand-200" />
              )}
              <span>تسجيل الدخول الآمن عبر Google</span>
            </button>
          </div>
        ) : (
          /* Authenticated Security Center & Gate */
          <div className="space-y-4">
            {/* Verified Identity Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {authUser.photoURL ? (
                  <img
                    src={authUser.photoURL}
                    alt={authUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover border border-brand-400/50 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#551465]/30 border border-brand-400/40 flex items-center justify-center text-brand-300 font-extrabold text-base shrink-0">
                    {authUser.displayName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-white truncate">
                      {authUser.displayName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                      {authUser.emailVerified ? 'بريد موثّق ✓' : 'غير موثّق'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isAdminAuthorized
                          ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 text-brand-300 border-slate-700'
                      }`}
                    >
                      {authUser.role === 'promoter_admin'
                        ? 'صلاحية: أدمن المروّج (promoter_admin)'
                        : authUser.role === 'user_admin'
                        ? 'صلاحية: أدمن المستخدم (user_admin)'
                        : 'صلاحية: عميل'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono block truncate mt-0.5" dir="ltr">
                    {authUser.email}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleSignOutClick}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>

            {/* Admin RBAC Rejection Notice if Non-Admin */}
            {mode === 'admin-gate' && !isAdminAuthorized && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-4 text-xs text-rose-200 space-y-1.5">
                <div className="font-extrabold flex items-center gap-2 text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>تم رفض الوصول: صلاحيات غير كافية (RBAC)</span>
                </div>
                <p className="leading-relaxed text-slate-300">
                  الحساب المسجل حالياً (<span className="font-mono" dir="ltr">{authUser.email}</span>) يملك صلاحية «عميل» فقط. الوصول إلى لوحة تحكم الإدارة مقصور على حساب الإدارة المعتمد.
                </p>
              </div>
            )}

            {/* Step-Up 2FA PIN Unlock Form when locked */}
            {needsPinUnlock && (
              <form
                onSubmit={handleVerifyPinSubmit}
                className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>مطلوب تأكيد رمز الأمان الثنائي (2FA PIN)</span>
                  </h4>
                  {isLockedOut && (
                    <span className="text-[11px] font-mono font-bold text-rose-400 flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      {lockRemainingSec}ث
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    disabled={isLockedOut || busy}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="أدخل الرمز المكوّن من 6 أرقام"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white tracking-widest focus:outline-none focus:border-[#551465]"
                    dir="ltr"
                  />
                  <button
                    type="submit"
                    disabled={isLockedOut || busy || pinInput.length !== 6}
                    className="px-4 py-2.5 rounded-xl bg-[#551465] hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                    <span>فتح القفل</span>
                  </button>
                </div>

                {hasWebAuthnPasskey && isWebAuthnSupported && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleBiometricVerifyClick}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>أو الفتح الفوري بالبصمة / الوجه (WebAuthn)</span>
                  </button>
                )}
              </form>
            )}

            {/* Admin Unlocked CTA */}
            {mode === 'admin-gate' && isAdminAuthorized && !needsPinUnlock && onEnterAdminAfterUnlock && (
              <button
                type="button"
                onClick={onEnterAdminAfterUnlock}
                className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Unlock className="w-4 h-4" />
                <span>الدخول الآن إلى لوحة تحكم الإدارة</span>
              </button>
            )}

            {/* Security Controls Grid (2FA PIN Management + Biometric) */}
            {!needsPinUnlock && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-brand-300" />
                    <span className="text-xs font-extrabold text-white">
                      رمز الأمان الثنائي (2FA PIN)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                      serverSession.pinEnabled
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {serverSession.pinEnabled ? 'مفعّل ومشفّر (Scrypt + Pepper + AES-256-GCM)' : 'غير مفعّل'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinSetup((v) => !v);
                      setShowDisablePin(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#551465] hover:bg-brand-700 text-white text-xs font-bold transition"
                  >
                    {serverSession.pinEnabled ? 'تغيير رمز الأمان' : 'إعداد رمز أمان 6 أرقام'}
                  </button>

                  {serverSession.pinEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDisablePin((v) => !v);
                        setShowPinSetup(false);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
                    >
                      تعطيل الرمز
                    </button>
                  )}

                  {onNavigateToProfileSecurity && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToProfileSecurity();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-brand-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>إدارة البصمة (Passkey)</span>
                    </button>
                  )}
                </div>

                {showPinSetup && (
                  <form onSubmit={handleSetupPinSubmit} className="pt-2 border-t border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={6}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="الرمز الجديد (6 أرقام)"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white tracking-widest focus:outline-none focus:border-[#551465]"
                        dir="ltr"
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={6}
                        value={confirmPinInput}
                        onChange={(e) =>
                          setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="تأكيد الرمز (6 أرقام)"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white tracking-widest focus:outline-none focus:border-[#551465]"
                        dir="ltr"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy || pinInput.length !== 6 || confirmPinInput.length !== 6}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold transition"
                    >
                      حفظ وتفعيل رمز الأمان الثنائي
                    </button>
                  </form>
                )}

                {showDisablePin && (
                  <form onSubmit={handleDisablePinSubmit} className="pt-2 border-t border-slate-800 flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="current-password"
                      maxLength={6}
                      value={disablePinInput}
                      onChange={(e) =>
                        setDisablePinInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="أدخل الرمز الحالي للتأكيد"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white tracking-widest focus:outline-none focus:border-[#551465]"
                      dir="ltr"
                    />
                    <button
                      type="submit"
                      disabled={busy || disablePinInput.length !== 6}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition"
                    >
                      تأكيد التعطيل
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Security Audit Log */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-brand-300" />
                  <span>سجل النشاط الأمني للجلسة</span>
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {securityLogs.length} أحداث
                </span>
              </div>

              {securityLogs.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-2">
                  سيظهر هنا سجل عمليات تسجيل الدخول والتحقق الأمني الخاصة بحسابك.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {securityLogs.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            entry.status === 'success' ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-slate-200 font-bold truncate">
                          {EVENT_LABELS[entry.eventType] || entry.eventType}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 tabular-nums">
                        {new Date(entry.createdAt).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
