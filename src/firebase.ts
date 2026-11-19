import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { AuthUserRole, SecurityAuditEntry, SecurityAuditEventType, UserProfile } from './types';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'telrawaj@gmail.com';

interface FirebaseClientRuntimeConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let initPromise: Promise<{ app: FirebaseApp; db: Firestore; auth: Auth }> | null = null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function ensureFirebaseInitialized(): Promise<{
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
}> {
  if (appInstance && dbInstance && authInstance) {
    return { app: appInstance, db: dbInstance, auth: authInstance };
  }
  if (!initPromise) {
    initPromise = (async () => {
      const res = await fetch('/api/firebase-client-config', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'X-Requested-With': 'RawajApp',
        },
      });
      if (!res.ok) {
        throw new Error('تعذر تهيئة خدمة المصادقة السحابية حالياً.');
      }
      const config = (await res.json()) as FirebaseClientRuntimeConfig;
      appInstance = getApps().length > 0 ? getApps()[0] : initializeApp(config);
      dbInstance = getFirestore(appInstance, config.firestoreDatabaseId);
      authInstance = getAuth(appInstance);
      return { app: appInstance, db: dbInstance, auth: authInstance };
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export function subscribeToFirebaseAuthState(
  callback: (user: User | null) => void
): () => void {
  let disposed = false;
  let unsubscribeInner: (() => void) | null = null;

  ensureFirebaseInitialized()
    .then(({ auth }) => {
      if (disposed) return;
      unsubscribeInner = onAuthStateChanged(auth, callback);
    })
    .catch(() => {
      if (!disposed) {
        callback(null);
      }
    });

  return () => {
    disposed = true;
    if (unsubscribeInner) {
      unsubscribeInner();
    }
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  _error: unknown,
  _operationType: OperationType,
  _path: string | null
): never {
  throw new Error('تعذر إتمام العملية على قاعدة البيانات، يرجى المحاولة لاحقاً.');
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const { db } = await ensureFirebaseInitialized();
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      return false;
    }
    return true;
  }
}

const FIRESTORE_PARAM_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function validateFirestoreParamId(raw: string, maxLen = 128): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 1 || trimmed.length > maxLen) return null;
  return FIRESTORE_PARAM_ID_REGEX.test(trimmed) ? trimmed : null;
}

// Centralized parameterized Firestore document & query builders (never interpolate paths)
function buildAdminDocRef(db: Firestore, uid: string) {
  return doc(db, 'admins', uid);
}

function buildOwnerPublicProfileRef(db: Firestore, uid: string) {
  return doc(db, 'users', uid, 'public', 'profile');
}

function buildOwnerPrivateInfoRef(db: Firestore, uid: string) {
  return doc(db, 'users', uid, 'private', 'info');
}

function buildOwnerWishlistCollectionRef(db: Firestore, uid: string) {
  return collection(db, 'users', uid, 'wishlist');
}

function buildOwnerWishlistItemRef(db: Firestore, uid: string, productId: string) {
  return doc(db, 'users', uid, 'wishlist', productId);
}

function buildOwnerSecurityLogsQuery(db: Firestore, uid: string, maxEntries = 20) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(maxEntries)));
  return query(
    collection(db, 'security_logs'),
    where('uid', '==', uid),
    limit(safeLimit)
  );
}

export async function signInWithGoogleSecure(): Promise<User> {
  const { auth } = await ensureFirebaseInitialized();
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebaseSecure(): Promise<void> {
  const { auth } = await ensureFirebaseInitialized();
  await firebaseSignOut(auth);
}

export async function resolveFirebaseUserRole(user: User | null): Promise<AuthUserRole> {
  if (!user || !user.emailVerified) return 'customer';
  if ((user.email || '').toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return 'promoter_admin';
  }
  const safeUid = validateFirestoreParamId(user.uid, 128);
  if (!safeUid) return 'customer';
  try {
    const { db } = await ensureFirebaseInitialized();
    const snap = await getDoc(buildAdminDocRef(db, safeUid));
    if (!snap.exists()) return 'customer';
    const role = snap.data()?.role;
    if (role === 'promoter_admin') return 'promoter_admin';
    if (role === 'user_admin' || role === 'admin') return 'user_admin';
    return 'customer';
  } catch {
    return 'customer';
  }
}

export async function checkIsAdminUser(user: User | null): Promise<boolean> {
  const role = await resolveFirebaseUserRole(user);
  return role === 'promoter_admin' || role === 'user_admin';
}

export async function syncUserProfileToFirestore(
  user: User,
  profile: UserProfile,
  securityFlags: { twoFactorEnabled: boolean; biometricEnabled: boolean }
): Promise<void> {
  if (!user.emailVerified) return;
  const safeUid = validateFirestoreParamId(user.uid, 128);
  if (!safeUid) return;

  const publicPath = `users/${safeUid}/public/profile`;
  const privatePath = `users/${safeUid}/private/info`;

  const displayName = (profile.fullName || user.displayName || 'عميل متجر رواج').trim().slice(0, 100);
  const photoUrl = (user.photoURL || '').trim().slice(0, 500);
  const email = (user.email || '').trim().slice(0, 180);

  if (!email) return;

  const { db } = await ensureFirebaseInitialized();

  try {
    await setDoc(buildOwnerPublicProfileRef(db, safeUid), {
      uid: safeUid,
      displayName,
      ...(photoUrl ? { photoUrl } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  try {
    await setDoc(buildOwnerPrivateInfoRef(db, safeUid), {
      uid: safeUid,
      email,
      fullName: (profile.fullName || displayName).trim().slice(0, 120),
      phone: (profile.phone || '').trim().slice(0, 32),
      city: (profile.city || '').trim().slice(0, 80),
      twoFactorEnabled: Boolean(securityFlags.twoFactorEnabled),
      biometricEnabled: Boolean(securityFlags.biometricEnabled),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

export async function loadUserPrivateFromFirestore(
  user: User
): Promise<Partial<UserProfile> | null> {
  if (!user.emailVerified) return null;
  const safeUid = validateFirestoreParamId(user.uid, 128);
  if (!safeUid) return null;
  const privatePath = `users/${safeUid}/private/info`;

  try {
    const { db } = await ensureFirebaseInitialized();
    const snap = await getDoc(buildOwnerPrivateInfoRef(db, safeUid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      fullName: typeof data.fullName === 'string' ? data.fullName : undefined,
      email: typeof data.email === 'string' ? data.email : undefined,
      phone: typeof data.phone === 'string' ? data.phone : undefined,
      city: typeof data.city === 'string' ? data.city : undefined,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privatePath);
  }
}

export async function loadWishlistFromFirestore(user: User): Promise<string[]> {
  if (!user.emailVerified) return [];
  const safeUid = validateFirestoreParamId(user.uid, 128);
  if (!safeUid) return [];
  const wishlistPath = `users/${safeUid}/wishlist`;

  try {
    const { db } = await ensureFirebaseInitialized();
    const snap = await getDocs(buildOwnerWishlistCollectionRef(db, safeUid));
    return snap.docs
      .map((d) => d.id)
      .filter((id) => FIRESTORE_PARAM_ID_REGEX.test(id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, wishlistPath);
  }
}

export async function syncWishlistItemToFirestore(
  user: User,
  productId: string,
  action: 'add' | 'remove'
): Promise<void> {
  if (!user.emailVerified) return;
  const safeUid = validateFirestoreParamId(user.uid, 128);
  const safeProdId = validateFirestoreParamId(productId, 64);
  if (!safeUid || !safeProdId) return;

  const itemPath = `users/${safeUid}/wishlist/${safeProdId}`;
  try {
    const { db } = await ensureFirebaseInitialized();
    const itemRef = buildOwnerWishlistItemRef(db, safeUid, safeProdId);
    if (action === 'add') {
      await setDoc(itemRef, {
        uid: safeUid,
        productId: safeProdId,
        addedAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(itemRef);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      action === 'add' ? OperationType.CREATE : OperationType.DELETE,
      itemPath
    );
  }
}

export async function recordSecurityLogToFirestore(
  user: User,
  eventType: Extract<
    SecurityAuditEventType,
    'google_signin' | 'pin_verified' | 'pin_failed' | 'webauthn_verified' | 'signout' | 'admin_access'
  >,
  status: 'success' | 'blocked',
  deviceSummary?: string
): Promise<void> {
  if (!user.emailVerified) return;
  const safeUid = validateFirestoreParamId(user.uid, 128);
  if (!safeUid) return;

  const logsPath = 'security_logs';
  try {
    const { db } = await ensureFirebaseInitialized();
    await addDoc(collection(db, 'security_logs'), {
      uid: safeUid,
      eventType,
      status,
      deviceSummary: (deviceSummary || 'متصفح الويب - متجر رواج').slice(0, 160),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, logsPath);
  }
}

export async function loadSecurityLogsFromFirestore(user: User): Promise<SecurityAuditEntry[]> {
  if (!user.emailVerified) return [];
  const safeUid = validateFirestoreParamId(user.uid, 128);
  if (!safeUid) return [];

  const logsPath = 'security_logs';
  try {
    const { db } = await ensureFirebaseInitialized();
    const snap = await getDocs(buildOwnerSecurityLogsQuery(db, safeUid, 20));
    const entries: SecurityAuditEntry[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      const ts = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
      return {
        id: docSnap.id,
        uid: String(data.uid || safeUid),
        eventType: (data.eventType as SecurityAuditEventType) || 'google_signin',
        status: data.status === 'blocked' ? 'blocked' : 'success',
        deviceSummary: typeof data.deviceSummary === 'string' ? data.deviceSummary : undefined,
        createdAt: ts,
      };
    });
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, logsPath);
  }
}

export function mapFirebaseAuthErrorToArabic(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام المصادقة.';
  }
  if (code === 'auth/popup-blocked') {
    return 'حظر المتصفح النافذة المنبثقة لتسجيل الدخول. يرجى السماح بالنوافذ المنبثقة لهذا الموقع والمحاولة مجدداً.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'نطاق المعاينة الحالي غير مضاف في قائمة النطاقات المصرح بها في المصادقة.';
  }
  if (code === 'auth/network-request-failed') {
    return 'تعذر الاتصال بخدمة المصادقة. يرجى التحقق من اتصال الإنترنت.';
  }
  if (code === 'auth/too-many-requests') {
    return 'تم تقييد المحاولات مؤقتاً بسبب كثرة الطلبات. يرجى الانتظار قليلاً ثم المحاولة.';
  }
  return 'تعذر إتمام تسجيل الدخول الآمن، يرجى المحاولة مرة أخرى.';
}
