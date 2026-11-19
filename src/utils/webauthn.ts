import {
  WebAuthnCredentialRecord,
  WebAuthnSecuritySettings,
  WebAuthnSession,
} from '../types';

const CREDENTIALS_STORAGE_KEY = 'rawaj-webauthn-credentials';
const SESSION_STORAGE_KEY = 'rawaj-webauthn-session';
const SETTINGS_STORAGE_KEY = 'rawaj-webauthn-settings';

export const DEFAULT_WEBAUTHN_SETTINGS: WebAuthnSecuritySettings = {
  requireForHighValue: true,
  highValueThresholdSar: 1000,
};

export interface WebAuthnSupportInfo {
  supported: boolean;
  platformAvailable: boolean;
  isEmbeddedIframe: boolean;
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function detectWebAuthnSupport(): Promise<WebAuthnSupportInfo> {
  const isEmbeddedIframe =
    typeof window !== 'undefined' && window.self !== window.top;

  if (
    typeof window === 'undefined' ||
    typeof window.PublicKeyCredential === 'undefined' ||
    !navigator.credentials
  ) {
    return { supported: false, platformAvailable: false, isEmbeddedIframe };
  }

  let platformAvailable = false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      platformAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    platformAvailable = false;
  }

  return {
    supported: true,
    platformAvailable,
    isEmbeddedIframe,
  };
}

export function mapWebAuthnErrorToArabic(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = String((err as { name: string }).name);
    if (name === 'NotAllowedError') {
      return 'تم إلغاء التحقق بالبصمة/الوجه أو أن المتصفح المضمّن يقيّد صلاحية WebAuthn — افتح المتجر في نافذة Chrome أو تطبيق أندرويد المثبّت.';
    }
    if (name === 'SecurityError') {
      return 'سياق الأمان الحالي لا يسمح بتمرير WebAuthn؛ يرجى فتح التطبيق مباشرة عبر HTTPS أو تطبيق أندرويد.';
    }
    if (name === 'InvalidStateError') {
      return 'تم تسجيل مفتاح البصمة لهذا الجهاز مسبقاً.';
    }
    if (name === 'NotSupportedError') {
      return 'جهازك أو متصفحك الحالي لا يدعم مستشعر البصمة أو التعرف على الوجه عبر WebAuthn.';
    }
  }
  if (err instanceof Error && err.message && /[\u0600-\u06FF]/.test(err.message)) {
    return err.message;
  }
  return 'تعذر إتمام المصادقة البيومترية، يرجى المحاولة مرة أخرى.';
}

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'جهاز موثوق';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'هاتف أندرويد (بصمة الإصبع / الوجه)';
  if (/iphone|ipad|ipod/.test(ua)) return 'جهاز Apple (Face ID / Touch ID)';
  if (/windows/.test(ua)) return 'جهاز Windows (Windows Hello)';
  if (/mac/.test(ua)) return 'جهاز Mac (Touch ID)';
  return 'متصفح موثوق (Passkey)';
}

export async function registerBiometricPasskey(params: {
  userName: string;
  displayName: string;
}): Promise<WebAuthnCredentialRecord> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('متصفحك الحالي لا يدعم Web Authentication API.');
  }

  const rpId = window.location.hostname;
  const optRes = await fetch('/api/webauthn/register-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName: params.userName,
      displayName: params.displayName,
      rpId,
    }),
  });
  const options = await optRes.json();
  if (!optRes.ok) {
    throw new Error(options.error || 'فشل بدء تسجيل البصمة البيومترية.');
  }

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToBuffer(options.challenge),
    rp: {
      name: options.rp.name,
      id: options.rp.id,
    },
    user: {
      id: base64UrlToBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('لم يتم إنشاء مفتاح المصادقة البيومترية.');
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  const verifyRes = await fetch('/api/webauthn/verify-registration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId: options.challengeId,
      credentialId: credential.id,
      rawId: bufferToBase64Url(credential.rawId),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      userName: params.displayName,
    }),
  });
  const verified = await verifyRes.json();
  if (!verifyRes.ok || !verified.verified) {
    throw new Error(verified.error || 'فشل التحقق من تسجيل مفتاح البصمة.');
  }

  return {
    id: credential.id,
    label: detectDeviceLabel(),
    userName: params.displayName,
    createdAt: verified.registeredAt || new Date().toISOString(),
    lastVerifiedAt: verified.registeredAt || new Date().toISOString(),
  };
}

export async function authenticateWithBiometrics(
  credentialIds: string[]
): Promise<{ verified: boolean; credentialId: string; verifiedAt: string }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('متصفحك الحالي لا يدعم Web Authentication API.');
  }

  const rpId = window.location.hostname;
  const optRes = await fetch('/api/webauthn/auth-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rpId,
      credentialIds,
    }),
  });
  const options = await optRes.json();
  if (!optRes.ok) {
    throw new Error(options.error || 'فشل تجهيز تحدي التحقق البيومتري.');
  }

  const publicKeyRequest: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(options.challenge),
    rpId: options.rpId,
    userVerification: 'required',
    timeout: 60000,
    ...(credentialIds.length > 0
      ? {
          allowCredentials: credentialIds.map((id) => ({
            id: base64UrlToBuffer(id),
            type: 'public-key' as const,
            transports: ['internal', 'hybrid'] as AuthenticatorTransport[],
          })),
        }
      : {}),
  };

  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyRequest,
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('لم يتم إكمال التحقق البيومتري.');
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  const verifyRes = await fetch('/api/webauthn/verify-authentication', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId: options.challengeId,
      credentialId: assertion.id,
      rawId: bufferToBase64Url(assertion.rawId),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
    }),
  });
  const verified = await verifyRes.json();
  if (!verifyRes.ok || !verified.verified) {
    throw new Error(verified.error || 'فشل تأكيد البصمة البيومترية.');
  }

  return {
    verified: true,
    credentialId: assertion.id,
    verifiedAt: verified.verifiedAt || new Date().toISOString(),
  };
}

export function loadWebAuthnCredentials(): WebAuthnCredentialRecord[] {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWebAuthnCredentials(list: WebAuthnCredentialRecord[]): void {
  try {
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }
}

export function loadWebAuthnSession(): WebAuthnSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return { authenticated: false };
    const parsed = JSON.parse(raw) as WebAuthnSession;
    return parsed && typeof parsed.authenticated === 'boolean'
      ? parsed
      : { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}

export function saveWebAuthnSession(session: WebAuthnSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore
  }
}

export function loadWebAuthnSettings(): WebAuthnSecuritySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_WEBAUTHN_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<WebAuthnSecuritySettings>;
    return {
      requireForHighValue:
        typeof parsed.requireForHighValue === 'boolean'
          ? parsed.requireForHighValue
          : DEFAULT_WEBAUTHN_SETTINGS.requireForHighValue,
      highValueThresholdSar:
        typeof parsed.highValueThresholdSar === 'number' && parsed.highValueThresholdSar >= 0
          ? parsed.highValueThresholdSar
          : DEFAULT_WEBAUTHN_SETTINGS.highValueThresholdSar,
    };
  } catch {
    return DEFAULT_WEBAUTHN_SETTINGS;
  }
}

export function saveWebAuthnSettings(settings: WebAuthnSecuritySettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}
