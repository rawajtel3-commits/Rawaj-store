import "dotenv/config";
import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { INITIAL_PRODUCTS } from "./src/data/initialData.js";
import type { Product } from "./src/types.js";
import { createWhiteLabelRouter } from "./server/whiteLabelRouter.js";
import { securityStoreQueries, promptVaultQueries } from "./server/sqliteStore.js";
import {
  ensurePromptVaultInitialized,
  exportEncryptedPromptBackup,
  getActivePromptKeyVersion,
  isMasterPromptFeatureEnabled,
  listPromptAuditLogs,
  readDecryptedMasterPrompt,
  recordPromptAuditEvent,
  restoreEncryptedPromptBackup,
  rotatePromptEncryptionKey,
  setMasterPromptFeatureEnabled,
  type PromptActorContext,
} from "./server/promptVault.js";
import { computeDeterministicCrossSell } from "./src/utils/recommendations.js";
import {
  buildAdminPerformanceReport,
  normalizeApiRouteKey,
  parsePerformanceWindow,
  recordApiPerformanceSample,
} from "./server/performanceMonitor.js";
import {
  evaluateSuspiciousAdminActivity,
  listAdminSecurityAlerts,
  saveSecurityAlertSettings,
  triggerTestSecurityAlert,
  updateAlertStatusById,
} from "./server/securityAlerts.js";
import {
  buildAdminBehaviorReport,
  parseBehaviorTimeRange,
  recordBehaviorEvent,
  seedBehaviorBaselineIfEmpty,
  validateBehaviorEventInput,
} from "./server/behaviorAnalytics.js";
import {
  listAdminModificationLogs,
  recordAdminModification,
  seedAdminModificationBaselineIfEmpty,
  validateClientModificationPayload,
} from "./server/adminModificationLogs.js";
import {
  findAmazonSaCatalogProductById,
  isValidAsin,
  normalizeAmazonCategory,
  queryAmazonSaCatalog,
  refreshAmazonSaItemByAsin,
} from "./server/amazonSaService.js";
import {
  isValidBrandSlug,
  listMerchantRatingSummaries,
  recordMerchantRating,
  seedMerchantRatingsIfEmpty,
  validateMerchantRatingPayload,
} from "./server/merchantRatings.js";
import { buildDigitalAssetLinks } from "./server/androidAssetLinks.js";
import {
  evaluateClientPriceAlertsAgainstCatalog,
  isValidClientKey,
  isValidProductId,
  listClientPriceAlerts,
  removeClientPriceAlert,
  upsertClientPriceAlert,
  validateUpsertPriceAlertPayload,
} from "./server/priceAlerts.js";

const INITIAL_PRODUCTS_MAP = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));

const app = express();
const PORT = 3000;

app.set("trust proxy", true);
app.set("env", "production");
app.disable("x-powered-by");

function getForwardedProto(req: express.Request): string {
  return String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function isLocalLoopbackHost(hostHeader: string | undefined): boolean {
  const host = String(hostHeader || "").trim().toLowerCase();
  return (
    !host ||
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(host)
  );
}

function isHttpsRequest(req: express.Request): boolean {
  return req.secure || getForwardedProto(req) === "https";
}

// Block direct HTTP access to debug/diagnostic routes, env files, server sources/bundles, maps, rules, and raw config files
const BLOCKED_SENSITIVE_PATH_PATTERN =
  /^\/(\.env.*|\.git(\/.*)?|\.vscode(\/.*)?|\.idea(\/.*)?|debug(\/.*)?|_debug(\/.*)?|__debug(\/.*)?|__inspect(\/.*)?|actuator(\/.*)?|phpinfo(\.php)?|firebase-applet-config\.json|firestore\.rules|firebase-blueprint\.json|security_spec\.md|eslint\.config\.mjs|package(-lock)?\.json|tsconfig\.json|server\.ts|server\.cjs(\.map)?|server\/.*|.*\.pem|.*\.key|.*\.map)$/i;

app.use((req, res, next) => {
  let decodedPath = req.path;
  try {
    decodedPath = decodeURIComponent(req.path);
  } catch {
    return res.status(400).json({ error: "Invalid path" });
  }
  const normalized = decodedPath.replace(/\/+/g, "/");
  if (BLOCKED_SENSITIVE_PATH_PATTERN.test(normalized)) {
    return res.status(403).json({ error: "Access denied" });
  }
  // Neutralize client debug triggers
  delete req.headers["x-debug"];
  delete req.headers["x-devtools"];
  if (req.query && typeof req.query === "object" && "debug" in req.query) {
    delete (req.query as Record<string, unknown>).debug;
  }
  next();
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLen);
}

function isSafeId(value: unknown, maxLen = 64): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= maxLen &&
    /^[a-zA-Z0-9_\-]+$/.test(value)
  );
}

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,180}\.[^\s@]{2,24}$/;
const VOUCHER_CODE_PATTERN = /^[A-Z0-9\-]{4,32}$/i;
const HOST_HEADER_PATTERN = /^[a-zA-Z0-9.\-:\[\]]{1,253}$/;

app.use((req, res, next) => {
  const host = req.get("host");
  if (host && !HOST_HEADER_PATTERN.test(host)) {
    return res.status(400).json({ error: "Invalid Host header" });
  }
  const isLocal = isLocalLoopbackHost(host);
  const isHttps = isHttpsRequest(req);

  if (!isHttps && !isLocal && req.path !== "/api/health") {
    if (!host) {
      return res.status(400).json({ error: "Invalid Host header" });
    }
    const targetUrl = `https://${host}${req.originalUrl}`;
    const redirectCode = req.method === "GET" || req.method === "HEAD" ? 301 : 308;
    return res.redirect(redirectCode, targetUrl);
  }

  if (isHttps || !isLocal) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    res.setHeader("Content-Security-Policy", "upgrade-insecure-requests");
  }

  next();
});

app.use(express.json({ limit: "8mb" }));
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "تنسيق البيانات المرسلة (JSON) غير صالح." });
    }
    next(err);
  }
);
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.path.startsWith("/api/")) {
    if (req.body !== undefined && !isPlainObject(req.body)) {
      return res.status(400).json({ error: "بنية الطلب المرسل غير صالحة." });
    }
  }
  if (req.path.startsWith("/api/")) {
    const startNs = process.hrtime.bigint();
    const authMode =
      typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
        ? "jwt_bearer"
        : typeof req.headers.cookie === "string" && req.headers.cookie.includes(`${SESSION_COOKIE_NAME}=`)
        ? "cookie"
        : "anonymous";

    res.on("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      recordApiPerformanceSample({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: elapsedMs,
        authMode,
      });

      if (
        (res.statusCode === 401 || res.statusCode === 403) &&
        (req.path.startsWith("/api/admin/") ||
          req.path.startsWith("/api/whitelabel") ||
          req.path === "/api/auth/pin/verify")
      ) {
        const rawFwd = String(req.headers["x-forwarded-for"] || "").trim();
        const clientIp = rawFwd || req.ip || req.socket.remoteAddress || "127.0.0.1";
        let actorUid: string | undefined;
        let actorEmail: string | undefined;
        try {
          const sess = readAuthenticatedSession(req);
          actorUid = sess?.uid;
          actorEmail = sess?.email;
        } catch {
          // Ignore invalid auth headers while still recording anomaly
        }
        const eventKind: "admin_denied" | "pin_failed" | "role_escalation" =
          req.path === "/api/auth/pin/verify"
            ? "pin_failed"
            : res.statusCode === 403 &&
              (req.path.startsWith("/api/admin/master-prompt") ||
                req.path.startsWith("/api/admin/roles"))
            ? "role_escalation"
            : "admin_denied";

        try {
          evaluateSuspiciousAdminActivity({
            ipAddress: clientIp,
            routeKey: normalizeApiRouteKey(req.method, req.path),
            actorUid,
            actorEmail,
            statusCode: res.statusCode,
            eventKind,
            userAgent: String(req.headers["user-agent"] || "unknown"),
          });
        } catch {
          // Non-blocking anomaly telemetry
        }
      }
    });

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (
      req.path.startsWith("/api/auth/") ||
      req.path.startsWith("/api/admin/") ||
      req.path === "/api/firebase-client-config"
    ) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
    }
  }
  next();
});
app.use("/api/whitelabel", createWhiteLabelRouter(requireVerifiedAdminSession));

// Initialize Gemini SDK lazily / safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Android Digital Asset Links endpoint for App Links & TWA on custom domains
app.get("/.well-known/assetlinks.json", (_req, res) => {
  const payload = buildDigitalAssetLinks(process.env);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(payload);
});

interface ServerFirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

function loadServerFirebaseConfig(): ServerFirebaseConfig | null {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) return null;
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
    if (
      typeof raw.apiKey !== "string" ||
      typeof raw.projectId !== "string" ||
      typeof raw.appId !== "string" ||
      typeof raw.authDomain !== "string"
    ) {
      return null;
    }
    return {
      apiKey: raw.apiKey,
      authDomain: raw.authDomain,
      projectId: raw.projectId,
      appId: raw.appId,
      ...(typeof raw.firestoreDatabaseId === "string"
        ? { firestoreDatabaseId: raw.firestoreDatabaseId }
        : {}),
      ...(typeof raw.storageBucket === "string"
        ? { storageBucket: raw.storageBucket }
        : {}),
      ...(typeof raw.messagingSenderId === "string"
        ? { messagingSenderId: raw.messagingSenderId }
        : {}),
    };
  } catch {
    return null;
  }
}

const SERVER_FIREBASE_CONFIG = loadServerFirebaseConfig();
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || SERVER_FIREBASE_CONFIG?.projectId || "";

// Runtime Firebase SDK bootstrap endpoint (never baked into static JS bundles)
app.get("/api/firebase-client-config", (req, res) => {
  if (req.headers["x-requested-with"] !== "RawajApp") {
    return res.status(403).json({ error: "Access denied" });
  }
  if (!SERVER_FIREBASE_CONFIG) {
    return res.status(503).json({ error: "Firebase configuration unavailable" });
  }
  return res.json(SERVER_FIREBASE_CONFIG);
});

// -------------------------------------------------------------
// Hardened Authentication, Session Cookie (HttpOnly), 2FA PIN & Rate-Limiting
// -------------------------------------------------------------
const SESSION_COOKIE_NAME = "rawaj_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_HMAC_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const BOOTSTRAPPED_ADMIN_EMAIL = "telrawaj@gmail.com";

type RbacRole = "customer" | "user_admin" | "promoter_admin";

interface SignedSessionPayload {
  sid: string;
  uid: string;
  email: string;
  displayName: string;
  role: RbacRole;
  originalRole?: RbacRole;
  pinEnabled: boolean;
  pinVerified: boolean;
  webauthnVerified: boolean;
  exp: number;
}

interface StoredPinCredential {
  version?: 2;
  kdf?: "hmac-sha256+scrypt";
  salt: string;
  hash: string;
  updatedAt: string;
}

interface ServerSecurityAuditRecord {
  id: string;
  uid: string;
  eventType:
    | "google_signin"
    | "pin_verified"
    | "pin_failed"
    | "pin_enabled"
    | "pin_disabled"
    | "webauthn_verified"
    | "signout"
    | "admin_access";
  status: "success" | "blocked";
  deviceSummary: string;
  createdAt: string;
}

const CREDENTIAL_MASTER_KEY_FILE = path.join("/tmp", "rawaj-credential-master.key");
const CREDENTIAL_VAULT_FILE = path.join("/tmp", "rawaj-credential-vault.enc");

function resolveCredentialMasterSecret(): Buffer {
  const envPepper = process.env.PASSWORD_PEPPER?.trim();
  if (envPepper && envPepper !== "MY_PASSWORD_PEPPER") {
    return crypto.createHash("sha256").update(envPepper, "utf8").digest();
  }
  try {
    if (fs.existsSync(CREDENTIAL_MASTER_KEY_FILE)) {
      const hex = fs.readFileSync(CREDENTIAL_MASTER_KEY_FILE, "utf8").trim();
      if (/^[0-9a-f]{64}$/i.test(hex)) {
        return Buffer.from(hex, "hex");
      }
    }
    const generated = crypto.randomBytes(32);
    fs.writeFileSync(CREDENTIAL_MASTER_KEY_FILE, generated.toString("hex"), {
      encoding: "utf8",
      mode: 0o600,
    });
    return generated;
  } catch {
    return crypto.randomBytes(32);
  }
}

const CREDENTIAL_MASTER_SECRET = resolveCredentialMasterSecret();
const CREDENTIAL_PEPPER = crypto
  .createHmac("sha256", CREDENTIAL_MASTER_SECRET)
  .update("rawaj:password-pepper:v2")
  .digest();
const CREDENTIAL_VAULT_KEY = crypto
  .createHmac("sha256", CREDENTIAL_MASTER_SECRET)
  .update("rawaj:credential-vault-aes256gcm:v2")
  .digest();

function loadEncryptedCredentialVault(): Map<string, StoredPinCredential> {
  const map = new Map<string, StoredPinCredential>();
  try {
    if (!fs.existsSync(CREDENTIAL_VAULT_FILE)) return map;
    const raw = JSON.parse(fs.readFileSync(CREDENTIAL_VAULT_FILE, "utf8")) as {
      ivHex: string;
      tagHex: string;
      cipherHex: string;
    };
    if (!raw?.ivHex || !raw?.tagHex || !raw?.cipherHex) return map;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      CREDENTIAL_VAULT_KEY,
      Buffer.from(raw.ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(raw.tagHex, "hex"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(raw.cipherHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plain) as Record<string, StoredPinCredential>;
    for (const [uid, cred] of Object.entries(parsed)) {
      if (cred && typeof cred.salt === "string" && typeof cred.hash === "string") {
        map.set(uid, cred);
      }
    }
  } catch {
    // If vault cannot be decrypted (e.g. rotated ephemeral key), start cleanly
  }
  return map;
}

function saveEncryptedCredentialVault(map: Map<string, StoredPinCredential>): void {
  try {
    const obj: Record<string, StoredPinCredential> = {};
    for (const [uid, cred] of map.entries()) {
      obj[uid] = cred;
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", CREDENTIAL_VAULT_KEY, iv);
    const cipherBuf = Buffer.concat([
      cipher.update(JSON.stringify(obj), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    fs.writeFileSync(
      CREDENTIAL_VAULT_FILE,
      JSON.stringify({
        ivHex: iv.toString("hex"),
        tagHex: tag.toString("hex"),
        cipherHex: cipherBuf.toString("hex"),
      }),
      { encoding: "utf8", mode: 0o600 }
    );
  } catch {
    // Keep in-memory state intact if disk is read-only
  }
}

const userPinCredentials = loadEncryptedCredentialVault();

const WEAK_PINS = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "654321",
  "123123",
  "112233",
]);

function recordServerSecurityEvent(
  uid: string,
  eventType: ServerSecurityAuditRecord["eventType"],
  status: "success" | "blocked",
  req: express.Request
) {
  const ua = String(req.headers["user-agent"] || "Web Client").slice(0, 80);
  securityStoreQueries.insertAuditLog({
    id: `srv-${crypto.randomBytes(5).toString("hex")}`,
    uid,
    event_type: eventType,
    status,
    device_summary: ua,
    created_at: new Date().toISOString(),
  });
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out = Object.create(null) as Record<string, string>;
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key && key !== "__proto__" && key !== "constructor" && key !== "prototype") {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

function signSessionPayload(payload: SignedSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_HMAC_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function issueServerJwtToken(payload: SignedSessionPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8").toString("base64url");
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_HMAC_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJwtToken(token: string | undefined): SignedSessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sig] = parts;
  if (!headerB64 || !bodyB64 || !sig) return null;
  const expectedSig = crypto
    .createHmac("sha256", SESSION_HMAC_SECRET)
    .update(`${headerB64}.${bodyB64}`)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(bodyB64, "base64url").toString("utf8")
    ) as SignedSessionPayload;
    if (!parsed || !parsed.uid || !parsed.sid || parsed.exp < Date.now()) {
      return null;
    }
    if (securityStoreQueries.isSessionRevoked(parsed.sid)) {
      return null;
    }
    if (
      parsed.role !== "customer" &&
      parsed.role !== "user_admin" &&
      parsed.role !== "promoter_admin"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function verifySessionToken(token: string | undefined): SignedSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const dotCount = token.split(".").length - 1;
  if (dotCount === 2) {
    return verifyJwtToken(token);
  }
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = crypto
    .createHmac("sha256", SESSION_HMAC_SECRET)
    .update(body)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SignedSessionPayload;
    if (!parsed || !parsed.uid || !parsed.sid || parsed.exp < Date.now()) {
      return null;
    }
    if (securityStoreQueries.isSessionRevoked(parsed.sid)) {
      return null;
    }
    if (
      parsed.role !== "customer" &&
      parsed.role !== "user_admin" &&
      parsed.role !== "promoter_admin"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setSessionCookie(
  req: express.Request,
  res: express.Response,
  payload: SignedSessionPayload
) {
  const token = signSessionPayload(payload);
  const isHttps = isHttpsRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (isHttps) {
    attrs.push("Secure");
  }
  res.setHeader("Set-Cookie", attrs.join("; "));
}

function clearSessionCookie(req: express.Request, res: express.Response) {
  const isHttps = isHttpsRequest(req);
  const attrs = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isHttps) {
    attrs.push("Secure");
  }
  res.setHeader("Set-Cookie", attrs.join("; "));
}

function readAuthenticatedSession(req: express.Request): SignedSessionPayload | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    const jwtSession = verifyJwtToken(bearer);
    if (jwtSession) return jwtSession;
  }
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = Object.hasOwn(cookies, SESSION_COOKIE_NAME)
    ? cookies[SESSION_COOKIE_NAME]
    : undefined;
  return verifySessionToken(rawToken);
}

function isAnyAdminRole(role: RbacRole | undefined): boolean {
  return role === "promoter_admin" || role === "user_admin";
}

export function resolveRbacRole(email: string, claimRole?: unknown): RbacRole {
  const normalized = email.trim().toLowerCase();
  const promoterList = String(process.env.PROMOTER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (normalized === BOOTSTRAPPED_ADMIN_EMAIL || promoterList.includes(normalized)) {
    return "promoter_admin";
  }

  const assigned = promptVaultQueries.getRbacAssignment(normalized);
  if (assigned) {
    if (assigned.role === "promoter_admin") return "promoter_admin";
    if (assigned.role === "user_admin") return "user_admin";
  }

  const userAdminList = String(process.env.USER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (userAdminList.includes(normalized)) {
    return "user_admin";
  }

  if (claimRole === "promoter_admin" || claimRole === "user_admin") {
    return claimRole;
  }
  return "customer";
}

function extractPromptActor(
  req: express.Request,
  session: SignedSessionPayload | null
): PromptActorContext {
  return {
    uid: session?.uid || "anonymous",
    email: session?.email,
    role: session?.role || "unauthenticated",
    ipAddress: String(req.ip || req.socket.remoteAddress || "unknown"),
    userAgent: String(req.headers["user-agent"] || "unknown"),
  };
}

function requireVerifiedAdminSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const session = readAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({
      error: "غير مصرح: يجب تسجيل الدخول بحساب مسؤول للوصول إلى صفحات وعمليات الإدارة.",
      code: "ADMIN_AUTH_REQUIRED",
    });
  }
  if (!isAnyAdminRole(session.role)) {
    recordServerSecurityEvent(session.uid, "admin_access", "blocked", req);
    return res.status(403).json({
      error: "ممنوع: هذه الصفحة مخصصة لمسؤول المتجر فقط.",
      code: "ADMIN_ROLE_REQUIRED",
    });
  }
  const hasPin = userPinCredentials.has(session.uid);
  if (hasPin && !session.pinVerified) {
    recordServerSecurityEvent(session.uid, "admin_access", "blocked", req);
    return res.status(403).json({
      error: "الجلسة مقفلة برمز التحقق الثنائي (2FA PIN). يرجى تأكيد الرمز للمتابعة.",
      code: "ADMIN_PIN_REQUIRED",
    });
  }
  next();
}

function requirePromoterAdminSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  ensurePromptVaultInitialized();
  const session = readAuthenticatedSession(req);
  const keyVersion = getActivePromptKeyVersion();
  const actor = extractPromptActor(req, session);

  if (!session) {
    const accessRefId = recordPromptAuditEvent({
      actor,
      action: "denied",
      outcome: "blocked",
      httpStatus: 401,
      keyVersion,
      reason: "UNAUTHENTICATED_REQUEST",
    });
    return res.status(401).json({
      error: "غير مصرح: يجب تسجيل الدخول بحساب أدمن المروّج للوصول إلى هذا المورد.",
      code: "PROMOTER_AUTH_REQUIRED",
      accessRefId,
    });
  }

  if (session.role !== "promoter_admin") {
    recordServerSecurityEvent(session.uid, "admin_access", "blocked", req);
    const accessRefId = recordPromptAuditEvent({
      actor,
      action: "denied",
      outcome: "blocked",
      httpStatus: 403,
      keyVersion,
      reason: `INSUFFICIENT_ROLE_${session.role.toUpperCase()}`,
    });
    return res.status(403).json({
      error: "ممنوع (403): هذا المورد الهندسي الحساس مخصص حصرياً لصلاحية أدمن المروّج (promoter_admin).",
      code: "PROMOTER_ADMIN_REQUIRED",
      accessRefId,
    });
  }

  const hasPin = userPinCredentials.has(session.uid);
  if (hasPin && !session.pinVerified) {
    recordServerSecurityEvent(session.uid, "admin_access", "blocked", req);
    const accessRefId = recordPromptAuditEvent({
      actor,
      action: "denied",
      outcome: "blocked",
      httpStatus: 403,
      keyVersion,
      reason: "PIN_LOCKED",
    });
    return res.status(403).json({
      error: "الجلسة مقفلة برمز التحقق الثنائي (2FA PIN). يرجى تأكيد الرمز للمتابعة.",
      code: "ADMIN_PIN_REQUIRED",
      accessRefId,
    });
  }

  next();
}

function decodeFirebaseIdTokenClaims(idToken: string): {
  sub?: string;
  aud?: string;
  iss?: string;
  email?: string;
  email_verified?: boolean;
  role?: string;
  exp?: number;
} | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const SCRYPT_PARAMS = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function hashPinScrypt(pin: string, saltHex: string): string {
  const peppered = crypto
    .createHmac("sha256", CREDENTIAL_PEPPER)
    .update(pin, "utf8")
    .digest();
  return crypto
    .scryptSync(peppered, Buffer.from(saltHex, "hex"), 64, SCRYPT_PARAMS)
    .toString("hex");
}

function verifyPinScrypt(pin: string, cred: StoredPinCredential): boolean {
  const derivedHex =
    cred.version === 2
      ? hashPinScrypt(pin, cred.salt)
      : crypto.scryptSync(pin, cred.salt, 64).toString("hex");
  const candidate = Buffer.from(derivedHex, "hex");
  const stored = Buffer.from(cred.hash, "hex");
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function getRateLimitKey(req: express.Request, uid: string): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return `${uid}:${ip}`;
}

app.get("/api/auth/session", (req, res) => {
  const session = readAuthenticatedSession(req);
  const featureEnabled = isMasterPromptFeatureEnabled();
  if (!session) {
    return res.json({
      authenticated: false,
      pinEnabled: false,
      pinVerified: false,
      webauthnVerified: false,
      canAccessMasterPrompt: false,
      masterPromptFeatureEnabled: featureEnabled,
    });
  }
  const hasPin = userPinCredentials.has(session.uid);
  const pinOk = hasPin ? session.pinVerified : true;
  const rl = securityStoreQueries.getRateLimit(getRateLimitKey(req, session.uid));
  const lockedUntil = rl && rl.locked_until > Date.now() ? rl.locked_until : undefined;
  const canAccessMasterPrompt = session.role === "promoter_admin" && pinOk && featureEnabled;

  return res.json({
    authenticated: true,
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    originalRole: session.originalRole || session.role,
    canAccessMasterPrompt,
    masterPromptFeatureEnabled: featureEnabled,
    pinEnabled: hasPin,
    pinVerified: pinOk,
    webauthnVerified: session.webauthnVerified,
    expiresAt: new Date(session.exp).toISOString(),
    ...(lockedUntil ? { lockedUntil } : {}),
  });
});

app.post("/api/auth/session", (req, res) => {
  const { uid, email, emailVerified, displayName, idToken } = req.body || {};
  if (
    typeof uid !== "string" ||
    typeof email !== "string" ||
    typeof idToken !== "string" ||
    idToken.length > 8192
  ) {
    return res.status(400).json({ error: "بيانات جلسة المصادقة غير صالحة." });
  }

  const cleanUid = uid.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!isSafeId(cleanUid, 128) || !EMAIL_PATTERN.test(cleanEmail) || !idToken.trim()) {
    return res.status(400).json({ error: "بيانات جلسة المصادقة غير مكتملة أو غير صالحة." });
  }

  const claims = decodeFirebaseIdTokenClaims(idToken.trim());
  const expectedIssuer = FIREBASE_PROJECT_ID
    ? `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
    : "";
  if (
    !claims ||
    claims.sub !== cleanUid ||
    claims.aud !== FIREBASE_PROJECT_ID ||
    (expectedIssuer && claims.iss && claims.iss !== expectedIssuer) ||
    typeof claims.email !== "string" ||
    claims.email.trim().toLowerCase() !== cleanEmail ||
    !claims.exp ||
    claims.exp * 1000 < Date.now()
  ) {
    return res.status(401).json({ error: "رمز التحقق الأمني غير صالح أو منتهي الصلاحية." });
  }

  const isEmailVerified = Boolean(claims.email_verified && emailVerified === true);
  if (!isEmailVerified) {
    return res.status(403).json({ error: "يجب استخدام بريد إلكتروني موثّق لإتمام الدخول الآمن." });
  }

  const role = resolveRbacRole(cleanEmail, claims.role);
  const hasPin = userPinCredentials.has(cleanUid);
  const existingSession = readAuthenticatedSession(req);
  const pinOk = hasPin
    ? Boolean(existingSession?.uid === cleanUid && existingSession.pinVerified)
    : true;
  const safeDisplayName =
    cleanText(displayName, 100) || cleanEmail.split("@")[0].slice(0, 100);
  const featureEnabled = isMasterPromptFeatureEnabled();

  const payload: SignedSessionPayload = {
    sid: crypto.randomUUID(),
    uid: cleanUid,
    email: cleanEmail,
    displayName: safeDisplayName,
    role,
    originalRole: role,
    pinEnabled: hasPin,
    pinVerified: pinOk,
    webauthnVerified: Boolean(
      existingSession?.uid === cleanUid && existingSession.webauthnVerified
    ),
    exp: Date.now() + SESSION_TTL_MS,
  };

  setSessionCookie(req, res, payload);
  recordServerSecurityEvent(cleanUid, "google_signin", "success", req);

  return res.json({
    authenticated: true,
    uid: payload.uid,
    email: payload.email,
    displayName: payload.displayName,
    role: payload.role,
    originalRole: payload.originalRole,
    canAccessMasterPrompt: payload.role === "promoter_admin" && payload.pinVerified && featureEnabled,
    masterPromptFeatureEnabled: featureEnabled,
    pinEnabled: payload.pinEnabled,
    pinVerified: payload.pinVerified,
    webauthnVerified: payload.webauthnVerified,
    expiresAt: new Date(payload.exp).toISOString(),
  });
});

app.post("/api/auth/pin/setup", (req, res) => {
  const session = readAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({ error: "يجب تسجيل الدخول أولاً قبل إعداد رمز الأمان." });
  }

  const rawPin = req.body?.pin;
  const pin = typeof rawPin === "string" ? rawPin.trim() : "";
  if (!/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: "يجب أن يتكون رمز الأمان الثنائي من 6 أرقام بالضبط." });
  }
  if (WEAK_PINS.has(pin)) {
    return res.status(400).json({
      error: "رمز الأمان ضعيف جداً (تجنب الأرقام المتكررة أو المتسلسلة مثل 123456).",
    });
  }

  const salt = crypto.randomBytes(32).toString("hex");
  userPinCredentials.set(session.uid, {
    version: 2,
    kdf: "hmac-sha256+scrypt",
    salt,
    hash: hashPinScrypt(pin, salt),
    updatedAt: new Date().toISOString(),
  });
  saveEncryptedCredentialVault(userPinCredentials);

  const updated: SignedSessionPayload = {
    ...session,
    pinEnabled: true,
    pinVerified: true,
  };
  setSessionCookie(req, res, updated);
  recordServerSecurityEvent(session.uid, "pin_enabled", "success", req);

  return res.json({
    pinEnabled: true,
    pinVerified: true,
    message: "تم تفعيل رمز الأمان الثنائي (2FA) وتشفيره بنجاح.",
  });
});

app.post("/api/auth/pin/verify", (req, res) => {
  const session = readAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({ error: "انتهت الجلسة، يرجى إعادة تسجيل الدخول." });
  }

  const cred = userPinCredentials.get(session.uid);
  if (!cred) {
    return res.status(400).json({ error: "رمز الأمان الثنائي غير مفعّل لهذا الحساب." });
  }

  const rlKey = getRateLimitKey(req, session.uid);
  const now = Date.now();
  const rl = securityStoreQueries.getRateLimit(rlKey) || {
    rl_key: rlKey,
    attempts: 0,
    locked_until: 0,
    last_attempt_at: 0,
  };

  if (rl.locked_until > now) {
    const remainingSec = Math.ceil((rl.locked_until - now) / 1000);
    recordServerSecurityEvent(session.uid, "pin_failed", "blocked", req);
    return res.status(429).json({
      error: `تم قفل التحقق مؤقتاً بسبب محاولات خاطئة متكررة. حاول بعد ${remainingSec} ثانية.`,
      lockedUntil: rl.locked_until,
      remainingSeconds: remainingSec,
    });
  }

  const rawPin = req.body?.pin;
  const pin = typeof rawPin === "string" ? rawPin.trim() : "";
  if (!/^\d{6}$/.test(pin) || !verifyPinScrypt(pin, cred)) {
    const nextAttempts = rl.attempts + 1;
    if (nextAttempts >= 5) {
      const lockedUntil = now + 120 * 1000;
      securityStoreQueries.upsertRateLimit({
        rl_key: rlKey,
        attempts: 0,
        locked_until: lockedUntil,
        last_attempt_at: now,
      });
      recordServerSecurityEvent(session.uid, "pin_failed", "blocked", req);
      return res.status(429).json({
        error: "تجاوزت الحد المسموح (5 محاولات). تم قفل التحقق لمدة 120 ثانية حمايةً لحسابك.",
        lockedUntil,
        remainingSeconds: 120,
      });
    }
    securityStoreQueries.upsertRateLimit({
      rl_key: rlKey,
      attempts: nextAttempts,
      locked_until: 0,
      last_attempt_at: now,
    });
    recordServerSecurityEvent(session.uid, "pin_failed", "blocked", req);
    return res.status(401).json({
      error: `رمز الأمان غير صحيح. تبقى لديك ${5 - nextAttempts} محاولات.`,
      remainingAttempts: 5 - nextAttempts,
    });
  }

  securityStoreQueries.deleteRateLimit(rlKey);
  const updated: SignedSessionPayload = {
    ...session,
    pinEnabled: true,
    pinVerified: true,
  };
  setSessionCookie(req, res, updated);
  recordServerSecurityEvent(session.uid, "pin_verified", "success", req);

  return res.json({
    pinVerified: true,
    message: "تم التحقق من رمز الأمان الثنائي بنجاح.",
  });
});

app.post("/api/auth/pin/disable", (req, res) => {
  const session = readAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({ error: "يجب تسجيل الدخول أولاً." });
  }
  const cred = userPinCredentials.get(session.uid);
  if (!cred) {
    return res.json({ pinEnabled: false });
  }
  const rawPin = req.body?.pin;
  const pin = typeof rawPin === "string" ? rawPin.trim() : "";
  if (!/^\d{6}$/.test(pin) || !verifyPinScrypt(pin, cred)) {
    recordServerSecurityEvent(session.uid, "pin_failed", "blocked", req);
    return res.status(401).json({ error: "رمز الأمان الحالي غير صحيح لإلغاء التفعيل." });
  }

  userPinCredentials.delete(session.uid);
  saveEncryptedCredentialVault(userPinCredentials);
  const updated: SignedSessionPayload = {
    ...session,
    pinEnabled: false,
    pinVerified: true,
  };
  setSessionCookie(req, res, updated);
  recordServerSecurityEvent(session.uid, "pin_disabled", "success", req);

  return res.json({ pinEnabled: false, message: "تم تعطيل رمز الأمان الثنائي." });
});

app.post("/api/auth/logout", (req, res) => {
  const session = readAuthenticatedSession(req);
  if (session) {
    securityStoreQueries.revokeSession(session.sid, session.exp);
    recordServerSecurityEvent(session.uid, "signout", "success", req);
  }
  clearSessionCookie(req, res);
  return res.json({ loggedOut: true });
});

app.get("/api/auth/audit-log", (req, res) => {
  const session = readAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({ error: "غير مصرح بالوصول لسجل النشاط الأمني." });
  }
  const rows = securityStoreQueries.listAuditLogsByUid(session.uid, 25);
  return res.json({
    entries: rows.map((r) => ({
      id: r.id,
      uid: r.uid,
      eventType: r.event_type,
      status: r.status,
      deviceSummary: r.device_summary,
      createdAt: r.created_at,
    })),
  });
});

// -------------------------------------------------------------
// Web Authentication API (WebAuthn / Biometric Passkey) Endpoints
// -------------------------------------------------------------
interface StoredChallenge {
  challenge: string;
  rpId: string;
  expiresAt: number;
}
const webauthnChallenges = new Map<string, StoredChallenge>();

function pruneExpiredChallenges() {
  const now = Date.now();
  for (const [key, value] of webauthnChallenges.entries()) {
    if (value.expiresAt < now) {
      webauthnChallenges.delete(key);
    }
  }
}

function decodeClientData(clientDataB64Url: string): {
  type?: string;
  challenge?: string;
  origin?: string;
} | null {
  try {
    const base64 = clientDataB64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

app.post("/api/webauthn/register-options", (req, res) => {
  pruneExpiredChallenges();
  const { userName, displayName, rpId } = req.body || {};
  const safeUserName = cleanText(userName, 180) || "user@rawaj.store";
  const safeDisplayName = cleanText(displayName, 120) || "عميل متجر رواج";
  const rawRpId = typeof rpId === "string" ? rpId.trim().split(":")[0] : "";
  const fallbackHost = String(req.hostname || "localhost").split(":")[0];
  const resolvedRpId = /^[a-zA-Z0-9.-]{1,253}$/.test(rawRpId)
    ? rawRpId
    : fallbackHost;
  const challenge = crypto.randomBytes(32).toString("base64url");
  const challengeId = crypto.randomUUID();
  const userId = crypto
    .createHash("sha256")
    .update(safeUserName)
    .digest()
    .subarray(0, 16)
    .toString("base64url");

  webauthnChallenges.set(challengeId, {
    challenge,
    rpId: resolvedRpId,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return res.json({
    challengeId,
    challenge,
    rp: {
      name: "متجر رواج | Rawaj Store",
      id: resolvedRpId,
    },
    user: {
      id: userId,
      name: safeUserName,
      displayName: safeDisplayName,
    },
  });
});

app.post("/api/webauthn/verify-registration", (req, res) => {
  pruneExpiredChallenges();
  const { challengeId, credentialId, clientDataJSON, userName } = req.body || {};
  if (
    typeof challengeId !== "string" ||
    typeof credentialId !== "string" ||
    typeof clientDataJSON !== "string" ||
    challengeId.length > 64 ||
    credentialId.length === 0 ||
    credentialId.length > 512 ||
    clientDataJSON.length > 4096
  ) {
    return res.status(400).json({ error: "بيانات تسجيل البصمة غير صالحة." });
  }

  const stored = webauthnChallenges.get(challengeId);
  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(400).json({ error: "انتهت صلاحية التحدي الأمني، يرجى إعادة المحاولة." });
  }
  webauthnChallenges.delete(challengeId);

  const clientData = decodeClientData(clientDataJSON);
  if (
    !clientData ||
    clientData.type !== "webauthn.create" ||
    clientData.challenge !== stored.challenge
  ) {
    return res.status(400).json({ error: "تعذر التحقق من بيانات تسجيل البصمة الأمنية." });
  }

  const credId = credentialId.trim();
  const registeredAt = new Date().toISOString();
  securityStoreQueries.upsertWebAuthnCredential(
    credId,
    cleanText(userName, 120) || "عميل متجر رواج",
    registeredAt
  );

  return res.json({
    verified: true,
    credentialId: credId,
    registeredAt,
  });
});

app.post("/api/webauthn/auth-options", (req, res) => {
  pruneExpiredChallenges();
  const { rpId, credentialIds = [] } = req.body || {};
  const rawRpId = typeof rpId === "string" ? rpId.trim().split(":")[0] : "";
  const fallbackHost = String(req.hostname || "localhost").split(":")[0];
  const resolvedRpId = /^[a-zA-Z0-9.-]{1,253}$/.test(rawRpId)
    ? rawRpId
    : fallbackHost;
  const safeCredIds = Array.isArray(credentialIds)
    ? credentialIds
        .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 512)
        .slice(0, 20)
    : [];
  const challenge = crypto.randomBytes(32).toString("base64url");
  const challengeId = crypto.randomUUID();

  webauthnChallenges.set(challengeId, {
    challenge,
    rpId: resolvedRpId,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return res.json({
    challengeId,
    challenge,
    rpId: resolvedRpId,
    allowCredentials: safeCredIds,
  });
});

app.post("/api/webauthn/verify-authentication", (req, res) => {
  pruneExpiredChallenges();
  const { challengeId, credentialId, clientDataJSON, authenticatorData, signature } = req.body || {};
  if (
    typeof challengeId !== "string" ||
    typeof credentialId !== "string" ||
    typeof clientDataJSON !== "string" ||
    typeof authenticatorData !== "string" ||
    typeof signature !== "string" ||
    challengeId.length > 64 ||
    !credentialId.trim() ||
    credentialId.length > 512 ||
    clientDataJSON.length > 4096 ||
    !authenticatorData.trim() ||
    authenticatorData.length > 4096 ||
    !signature.trim() ||
    signature.length > 4096
  ) {
    return res.status(400).json({ error: "بيانات المصادقة البيومترية غير مكتملة أو غير صالحة." });
  }

  const stored = webauthnChallenges.get(challengeId);
  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(400).json({ error: "انتهت صلاحية جلسة التحقق البيومتري، يرجى المحاولة مرة أخرى." });
  }
  webauthnChallenges.delete(challengeId);

  const clientData = decodeClientData(clientDataJSON);
  if (!clientData || clientData.type !== "webauthn.get" || clientData.challenge !== stored.challenge) {
    return res.status(400).json({ error: "فشل مطابقة توقيع التحقق البيومتري." });
  }

  const activeSession = readAuthenticatedSession(req);
  if (activeSession) {
    setSessionCookie(req, res, {
      ...activeSession,
      webauthnVerified: true,
      pinVerified: true,
    });
    recordServerSecurityEvent(activeSession.uid, "webauthn_verified", "success", req);
  }

  return res.json({
    verified: true,
    credentialId: credentialId.trim(),
    verifiedAt: new Date().toISOString(),
  });
});

// Dynamic XML Sitemap for Search Engines (SEO)
app.get("/sitemap.xml", (req, res) => {
  const host = req.get("host") || `localhost:${PORT}`;
  const protocol = isLocalLoopbackHost(host)
    ? isHttpsRequest(req)
      ? "https"
      : req.protocol || "http"
    : "https";
  const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, "");
  const lastmod = new Date().toISOString().split("T")[0];

  const staticRoutes = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/?view=offers", priority: "0.9", changefreq: "daily" },
    { loc: "/?view=gift-vouchers", priority: "0.85", changefreq: "weekly" },
    { loc: "/?view=track-order", priority: "0.7", changefreq: "weekly" },
    { loc: "/?view=profile", priority: "0.7", changefreq: "weekly" },
    { loc: "/?view=wishlist", priority: "0.6", changefreq: "weekly" },
    { loc: "/?view=ads", priority: "0.7", changefreq: "weekly" },
    { loc: "/?view=faq", priority: "0.7", changefreq: "monthly" },
    { loc: "/?view=policies", priority: "0.6", changefreq: "monthly" },
    { loc: "/?view=about", priority: "0.7", changefreq: "monthly" },
    { loc: "/?view=sitemap", priority: "0.8", changefreq: "weekly" },
  ];

  const categories = ["electronics", "accessories", "gaming", "home", "fashion"];
  const categoryRoutes = categories.map((cat) => ({
    loc: `/?category=${cat}`,
    priority: "0.85",
    changefreq: "daily",
  }));

  const productRoutes = INITIAL_PRODUCTS.map((p) => ({
    loc: `/?product=${encodeURIComponent(p.id)}`,
    priority: "0.8",
    changefreq: "weekly",
  }));

  const escapeXml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const allUrls = [...staticRoutes, ...categoryRoutes, ...productRoutes]
    .map(
      (item) => `  <url>
    <loc>${escapeXml(`${baseUrl}${item.loc}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

// Robots.txt pointing crawlers to /sitemap.xml
app.get("/robots.txt", (req, res) => {
  const host = req.get("host") || `localhost:${PORT}`;
  const protocol = isLocalLoopbackHost(host)
    ? isHttpsRequest(req)
      ? "https"
      : req.protocol || "http"
    : "https";
  const baseUrl = (process.env.APP_URL || `${protocol}://${host}`).replace(/\/$/, "");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

// AI Assistant Shopping Advisor powered by Gemini 3.6 Flash
app.post("/api/ai-assistant", async (req, res) => {
  try {
    const rawMessage = req.body?.message;
    const rawHistory = req.body?.conversationHistory;

    if (typeof rawMessage !== "string") {
      return res.status(400).json({ error: "صيغة الرسالة غير صالحة." });
    }
    const message = cleanText(rawMessage, 2000);
    if (!message) {
      return res.status(400).json({ error: "الرجاء إدخال رسالة أو استفسار." });
    }

    const safeHistory = Array.isArray(rawHistory)
      ? rawHistory
          .filter(
            (h): h is { sender?: unknown; text?: unknown } =>
              isPlainObject(h) && typeof h.text === "string"
          )
          .slice(-20)
          .map((h) => ({
            role: h.sender === "user" ? ("user" as const) : ("model" as const),
            parts: [{ text: cleanText(h.text, 1500) }],
          }))
          .filter((h) => h.parts[0].text.length > 0)
      : [];

    const ai = getGeminiClient();

    // Catalog summary for Gemini context
    const catalogSummary = INITIAL_PRODUCTS.map(p => 
      `- المعرف: ${p.id} | المنتج: ${p.name} | السعر: ${p.price} ر.س | التصنيف: ${p.categoryNameAr} | المخزون: ${p.stock} | الميزات: ${p.description}`
    ).join("\n");

    const systemInstruction = `أنت المساعد الذكي الخبير لـ "متجر رواج" (Rawaj Store)، متجر إلكتروني فاخر رائد باللغة العربية.
وظيفتك مساعدة العملاء بنبرة راقية ومحترفة وودودة باللغة العربية.

كتالوج المنتجات المتاحة حالياً في المتجر:
${catalogSummary}

قواعد الإجابة:
1. قدم نصائح دقيقة ومخصصة ومبنية على منتجات كتالوج المتجر أعلاه.
2. إذا طلب المستخدم اقتراحاً، اذكر اسم المنتج وسعره وميزاته ومبررات الاختيار.
3. يمكنك الإجابة عن الاستفسارات التقنية وسياسات الشحن والضمان (نوفر ضمان سنتين، وتوصيل مجاني للطلبات أكثر من 200 ريال).
4. في نهاية الإجابة، يرجى تضمين قائمة بالمعرفات الموصى بها في سطر خاص بالصيغة: [RECOMMENDED_IDS: prod-1, prod-2] إذا كانت هناك منتجات مناسبة.`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          ...safeHistory,
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        }
      });

      const responseText = response.text || "مرحباً بك! يسعدني مساعدتك في اختيار أفضل المنتجات في متجر رواج.";

      // Extract recommended IDs if any
      const match = responseText.match(/\[RECOMMENDED_IDS:\s*([\w-,\s]+)\]/);
      let recommendedProductIds: string[] = [];
      let cleanedText = responseText.replace(/\[RECOMMENDED_IDS:\s*[\w-,\s]+\]/, '').trim();

      if (match && match[1]) {
        recommendedProductIds = match[1].split(',').map(s => s.trim()).filter(Boolean);
      }

      return res.json({
        reply: cleanedText,
        recommendedProductIds
      });
    } else {
      // Intelligent fallback when Gemini API Key is not yet configured in environment
      const lower = message.toLowerCase();
      let reply = "أهلاً بك! أنا المساعد الذكي لمتجر رواج. يسعدني إجابة كافة استفساراتك واقتراح الأنسب لك.";
      let recs: string[] = [];

      if (lower.includes("حاسوب") || lower.includes("لابتوب") || lower.includes("أعمال") || lower.includes("برمجة")) {
        reply = "أنصحك بحاسوب **نيوبروم بوك برو 16** الفاخر، فهو مزود بمعالج خارق وبطارية تدوم حتى 22 ساعة وشاشة XDR مريحة جداً للعين.";
        recs = ["prod-1"];
      } else if (lower.includes("ساعة") || lower.includes("رياضة") || lower.includes("صحة")) {
        reply = "إليك **ساعة رواج الذكية Ultra Fit 3** المصنوعة من التيتانيوم والمقاومة للماء، وتوفر تتبعاً دقيقاً للغاية للأنشطة الرياضية ونبضات القلب.";
        recs = ["prod-2"];
      } else if (lower.includes("صوت") || lower.includes("سماعة") || lower.includes("عزل")) {
        reply = "سماعات **رواج بودز برو Max** توفر عزل ضوضاء تكيفي سينمائي بنسبة 99.8% وصوتاً ثلاثي الأبعاد مع بطارية 35 ساعة.";
        recs = ["prod-3"];
      } else if (lower.includes("ألعاب") || lower.includes("سوني") || lower.includes("بلايستيشن") || lower.includes("شاشة")) {
        reply = "أرشح لك جهاز **Titan Console X** أحدث منصة ألعاب 4K حقيقية مع شاشة **UltraSight 34 OLED** المنحنية لتجربة ألعاب لا تضاهى.";
        recs = ["prod-4", "prod-6"];
      } else if (lower.includes("قهوة") || lower.includes("منزل") || lower.includes("إسبيرسو")) {
        reply = "ماكينة القهوة الذكية **Espresso Master Touch** هي الخيار الأمثل لعشاق القهوة المختصة مع 19 بار ضغط إيطالي ورغوة حليب تلقائية.";
        recs = ["prod-7"];
      } else {
        reply = "يسعدني إرشادك وتوفير تفاصيل أي منتج! نوفر شحناً مجانياً للطلبات الأكبر من 200 ريال ضماناً شهيراً لمدة سنتين وصيانة شاملة.";
        recs = ["prod-1", "prod-2", "prod-4"];
      }

      return res.json({
        reply,
        recommendedProductIds: recs
      });
    }
  } catch (error: unknown) {
    console.error(
      "AI Assistant Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    res.status(500).json({
      error: "حدث خطأ أثناء معالجة طلبك الذكي.",
    });
  }
});

// AI-Powered Cross-Selling Product Recommendations (Browsing + Purchase History)
app.post("/api/recommendations/cross-sell", async (req, res) => {
  try {
    const {
      currentProductId,
      products: clientCatalog,
      browsingHistory = [],
      purchaseHistory = [],
      cartProductIds = [],
      focusMode = "all",
    } = req.body || {};

    if (!isSafeId(currentProductId, 64)) {
      return res.status(400).json({ error: "معرف المنتج غير صالح." });
    }

    const catalog =
      Array.isArray(clientCatalog) && clientCatalog.length > 0
        ? clientCatalog
            .filter(
              (p): p is (typeof INITIAL_PRODUCTS)[number] =>
                isPlainObject(p) &&
                isSafeId(p.id, 64) &&
                typeof p.name === "string" &&
                typeof p.price === "number" &&
                Number.isFinite(p.price) &&
                p.price >= 0 &&
                typeof p.stock === "number" &&
                Number.isFinite(p.stock)
            )
            .slice(0, 60)
        : INITIAL_PRODUCTS;

    const currentProduct = (catalog.length > 0 ? catalog : INITIAL_PRODUCTS).find(
      (p) => p.id === currentProductId
    );
    if (!currentProduct) {
      return res.status(404).json({ error: "المنتج المطلوب غير موجود." });
    }

    const safeBrowsing = Array.isArray(browsingHistory)
      ? browsingHistory.filter(isPlainObject).slice(0, 30)
      : [];
    const safePurchases = Array.isArray(purchaseHistory)
      ? purchaseHistory.filter(isPlainObject).slice(0, 30)
      : [];
    const safeCartIds = Array.isArray(cartProductIds)
      ? cartProductIds.filter((id): id is string => isSafeId(id, 64)).slice(0, 30)
      : [];
    const safeFocusMode =
      focusMode === "purchases" || focusMode === "browsing" ? focusMode : "all";

    const fallbackResult = computeDeterministicCrossSell({
      currentProduct,
      catalog: catalog.length > 0 ? catalog : INITIAL_PRODUCTS,
      browsingHistory: safeBrowsing as any,
      purchaseHistory: safePurchases as any,
      cartProductIds: safeCartIds,
      focusMode: safeFocusMode,
      maxResults: 3,
    });

    const ai = getGeminiClient();
    if (!ai) {
      return res.json(fallbackResult);
    }

    const candidates = (catalog.length > 0 ? catalog : INITIAL_PRODUCTS).filter(
      (p) => p.id !== currentProduct.id && p.stock > 0
    );
    if (candidates.length === 0) {
      return res.json(fallbackResult);
    }

    const catalogLines = candidates
      .map(
        (p) =>
          `- id: ${p.id} | الاسم: ${cleanText(p.name, 80)} | التصنيف: ${cleanText(p.categoryNameAr, 40)} (${cleanText(p.category, 30)}) | السعر: ${p.price} ر.س | التقييم: ${p.rating} | الوصف: ${cleanText(p.description, 160)}`
      )
      .join("\n");

    const viewedSummary = safeBrowsing
      .slice(0, 8)
      .map((b) => {
        const matched = candidates.find((p) => p.id === b.productId);
        return matched
          ? `${cleanText(matched.name, 80)} (التصنيف: ${cleanText(matched.categoryNameAr, 40)}، عدد المشاهدات: ${Number(b.viewCount) || 1})`
          : `${cleanText(b.productId, 64)} (${cleanText(b.category, 40)})`;
      })
      .join("، ");

    const purchaseSummary = safePurchases
      .slice(0, 8)
      .map(
        (p) =>
          `${cleanText(p.name, 80)} (${cleanText(p.categoryNameAr, 40)}، طلب ${cleanText(p.orderNumber, 32)})`
      )
      .join("، ");

    const focusInstruction =
      focusMode === "purchases"
        ? "ركّز بشكل أساسي على اقتراح مكملات تتوافق مع مشتريات العميل السابقة لتعزيز البيع المتقاطع."
        : focusMode === "browsing"
        ? "ركّز بشكل أساسي على اهتمامات العميل الظاهرة في سجل التصفح الأخير."
        : "ادمج بذكاء بين سجل التصفح والمشتريات السابقة والمنتج المعروض حالياً لاقتراح أفضل 3 منتجات بيع متقاطع.";

    const systemInstruction = `أنت محرك توصيات ذكي للبيع المتقاطع (Cross-selling) في متجر رواج الإلكتروني الفاخر.
مهمتك اختيار أفضل 3 منتجات مختلفة عن المنتج المعروض حالياً لتكملة تجربة العميل وزيادة القيمة المضافة له.
${focusInstruction}
يجب أن يكون لكل منتج سبب واضح ومقنع بالعربية (في سطر واحد موجز لا يتجاوز 18 كلمة) يربطه بسجل التصفح أو المشتريات السابقة أو المنتج الحالي.
لا تقترح معرفات غير موجودة في قائمة المرشحين، ولا تقترح المنتج المعروض حالياً (${currentProduct.id}).`;

    const promptText = `المنتج المعروض حالياً: ${currentProduct.name} (${currentProduct.categoryNameAr} - ${currentProduct.price} ر.س)
سجل التصفح الأخير للعميل: ${viewedSummary || "لم يتصفح منتجات أخرى بعد"}
المشتريات السابقة للعميل: ${purchaseSummary || "لا توجد مشتريات سابقة مسجلة"}
المنتجات الموجودة حالياً في السلة: ${Array.isArray(cartProductIds) && cartProductIds.length > 0 ? cartProductIds.join("، ") : "السلة فارغة"}

المنتجات المرشحة المتاحة في المخزون:
${catalogLines}`;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: promptText,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headlineAr: {
              type: Type.STRING,
              description: "جملة عربية موجزة توضح سبب التخصيص بناءً على سجل التصفح والمشتريات.",
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productId: { type: Type.STRING },
                  badgeAr: {
                    type: Type.STRING,
                    description: "وسم قصير من 2-3 كلمات مثل: يكمل مشترياتك، بيع متقاطع ذكي، حسب تصفحك",
                  },
                  reasonAr: {
                    type: Type.STRING,
                    description: "سبب البيع المتقاطع باللغة العربية بشكل مختصر ومباشر.",
                  },
                  matchScore: {
                    type: Type.INTEGER,
                    description: "نسبة التوافق من 75 إلى 99",
                  },
                },
                required: ["productId", "badgeAr", "reasonAr", "matchScore"],
              },
            },
          },
          required: ["headlineAr", "recommendations"],
        },
      },
    });

    const parsed = JSON.parse((aiResponse.text ?? "{}").trim());
    const candidateMap = new Map(candidates.map((c: any) => [c.id, c]));
    const seen = new Set<string>();
    const validAiRecs = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
      .filter((item: any) => {
        if (!item || typeof item.productId !== "string") return false;
        if (!candidateMap.has(item.productId) || seen.has(item.productId)) return false;
        seen.add(item.productId);
        return true;
      })
      .slice(0, 3)
      .map((item: any) => ({
        productId: item.productId,
        badgeAr: String(item.badgeAr || "بيع متقاطع ذكي").slice(0, 32),
        reasonAr: String(item.reasonAr || "خيار متكامل يعزز تجربتك مع هذا المنتج."),
        matchScore: Math.min(99, Math.max(75, Number(item.matchScore) || 92)),
      }));

    // Pad with deterministic cross-sell items if AI returned fewer than 3
    for (const fb of fallbackResult.recommendations) {
      if (validAiRecs.length >= 3) break;
      if (!seen.has(fb.productId)) {
        seen.add(fb.productId);
        validAiRecs.push(fb);
      }
    }

    return res.json({
      headlineAr: parsed.headlineAr || fallbackResult.headlineAr,
      source: "gemini-ai",
      recommendations: validAiRecs,
    });
  } catch (error: unknown) {
    console.error(
      "Cross-Sell Recommendations Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    // Graceful fallback so PDP recommendations never break
    try {
      const {
        currentProductId,
        products: clientCatalog,
        browsingHistory = [],
        purchaseHistory = [],
        cartProductIds = [],
        focusMode = "all",
      } = req.body || {};
      const catalog = Array.isArray(clientCatalog) && clientCatalog.length > 0
        ? clientCatalog
        : INITIAL_PRODUCTS;
      const currentProduct = catalog.find((p: any) => p.id === currentProductId);
      if (currentProduct) {
        return res.json(
          computeDeterministicCrossSell({
            currentProduct,
            catalog,
            browsingHistory: Array.isArray(browsingHistory) ? browsingHistory : [],
            purchaseHistory: Array.isArray(purchaseHistory) ? purchaseHistory : [],
            cartProductIds: Array.isArray(cartProductIds) ? cartProductIds : [],
            focusMode: focusMode === "purchases" || focusMode === "browsing" ? focusMode : "all",
            maxResults: 3,
          })
        );
      }
    } catch {
      // Ignore nested error
    }
    return res.status(500).json({ error: "تعذر تحميل المنتجات المقترحة حالياً." });
  }
});

// Seller Chat endpoint for instant response simulation
app.post("/api/seller-chat", (req, res) => {
  const rawMessage = req.body?.message;
  const rawProductId = req.body?.productId;

  if (typeof rawMessage !== "string") {
    return res.status(400).json({ error: "صيغة الرسالة غير صالحة." });
  }
  const cleanMessage = cleanText(rawMessage, 1000);
  if (!cleanMessage) {
    return res.status(400).json({ error: "الرجاء كتابة رسالتك قبل الإرسال." });
  }
  if (rawProductId !== undefined && !isSafeId(rawProductId, 64)) {
    return res.status(400).json({ error: "معرف المنتج غير صالح." });
  }

  const lower = cleanMessage.toLowerCase();
  let reply = "شكراً لتواصلك مع البائع! يسعدنا الإجابة عن أي استفسار تخص التجهيز والشحن والعروض الخاصة.";

  if (lower.includes("توصيل") || lower.includes("شحن") || lower.includes("متى")) {
    reply = "نقوم بشحن الطلبات داخل المكلا وحضرموت وصنعاء وعدن خلال 24-48 ساعة عمل، وبقية محافظات الجمهورية اليمنية خلال 2 إلى 4 أيام عمل عبر شركاء التوصيل المعتمدين.";
  } else if (lower.includes("ضمان") || lower.includes("صيانة")) {
    reply = "جميع المنتجات الإلكترونية بالمتجر خاضعة لضمان وكيل محلي معتمد لمدة 24 شهراً (سنتين) ضد عيوب المصنع.";
  } else if (lower.includes("خصم") || lower.includes("جملة") || lower.includes("كمية")) {
    reply = "يسعدنا تقديم كود خصم خاص 10% إضافي للكميات (الكود: RAWAJ10). يسري عند إضافة 2 أو أكثر من المنتجات للسلة.";
  } else if (typeof rawProductId === "string") {
    const product =
      INITIAL_PRODUCTS_MAP.get(rawProductId) ||
      findAmazonSaCatalogProductById(rawProductId);
    if (product) {
      reply = `بالنسبة لمنتج "${product.name}"، فهو متوفر حالياً بالمخزون (${product.stock} قطعة)، وجاهز للشحن الفوري! هل ترغب في حجز قطعة لك؟`;
    }
  }

  return res.json({ reply, timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) });
});

// Digital Gift Voucher Email / Code Dispatch Endpoint
app.post("/api/gift-vouchers/dispatch", (req, res) => {
  const { code, recipientEmail, recipientName, senderName, amountSar, deliveryMethod } = req.body || {};

  if (typeof code !== "string" || !VOUCHER_CODE_PATTERN.test(code.trim())) {
    return res.status(400).json({ error: "صيغة كود قسيمة الهدية غير صالحة." });
  }

  const parsedAmount = Number(amountSar);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 50 || parsedAmount > 10000) {
    return res.status(400).json({ error: "قيمة قسيمة الهدية يجب أن تكون بين 50 و 10,000 ر.س." });
  }

  const safeMethod =
    deliveryMethod === "email"
      ? "email"
      : deliveryMethod === "custom_code" || deliveryMethod === undefined
      ? "custom_code"
      : null;
  if (!safeMethod) {
    return res.status(400).json({ error: "طريقة تسليم القسيمة غير صالحة." });
  }

  let cleanEmail: string | undefined;
  if (safeMethod === "email") {
    if (typeof recipientEmail !== "string" || !EMAIL_PATTERN.test(recipientEmail.trim())) {
      return res.status(400).json({ error: "يرجى إدخال بريد إلكتروني صحيح للمستلم." });
    }
    cleanEmail = recipientEmail.trim().toLowerCase();
  }

  return res.json({
    dispatched: true,
    dispatchId: `GVD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    code: code.trim().toUpperCase(),
    deliveryMethod: safeMethod,
    recipientName: cleanText(recipientName, 80) || "صديقك",
    senderName: cleanText(senderName, 80) || "عميل متجر رواج",
    recipientEmail: cleanEmail,
    sentAt: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Master Engineering Prompt Vault & RBAC Capabilities Endpoints
// Strictly enforced server-side: promoter_admin ONLY vs user_admin/customer (403)
// -------------------------------------------------------------

// Server-driven capabilities endpoint (tells UI what tabs/features to render; never leaks prompt)
app.get("/api/admin/capabilities", (req, res) => {
  const session = readAuthenticatedSession(req);
  const featureEnabled = isMasterPromptFeatureEnabled();
  if (!session) {
    return res.json({
      authenticated: false,
      role: "customer",
      originalRole: "customer",
      isAdmin: false,
      isPromoterAdmin: false,
      pinLocked: false,
      canAccessMasterPrompt: false,
      featureEnabled,
      canManageRoles: false,
      canRotateKeys: false,
    });
  }
  const hasPin = userPinCredentials.has(session.uid);
  const pinLocked = Boolean(hasPin && !session.pinVerified);
  const isAdmin = isAnyAdminRole(session.role) && !pinLocked;
  const isPromoterAdmin = session.role === "promoter_admin" && !pinLocked;

  return res.json({
    authenticated: true,
    role: session.role,
    originalRole: session.originalRole || session.role,
    isAdmin,
    isPromoterAdmin,
    pinLocked,
    canAccessMasterPrompt: isPromoterAdmin && featureEnabled,
    featureEnabled,
    canManageRoles: isPromoterAdmin,
    canRotateKeys: isPromoterAdmin,
  });
});

// Retrieve decrypted Master Engineering Prompt (promoter_admin ONLY)
app.get("/api/admin/master-prompt", requirePromoterAdminSession, (req, res) => {
  const session = readAuthenticatedSession(req);
  const actor = extractPromptActor(req, session);
  try {
    const result = readDecryptedMasterPrompt(actor);
    return res.json(result);
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: number }).status) || 403
        : 500;
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: string }).code || "PROMPT_ACCESS_ERROR")
        : "PROMPT_ACCESS_ERROR";
    const accessRefId =
      typeof err === "object" && err !== null && "accessRefId" in err
        ? String((err as { accessRefId?: string }).accessRefId || "")
        : undefined;
    return res.status(status).json({
      error: err instanceof Error ? err.message : "تعذر استرجاع البرومبت الهندسي.",
      code,
      ...(accessRefId ? { accessRefId } : {}),
    });
  }
});

// Audit log & keyring metadata (promoter_admin ONLY, never contains raw prompt text)
app.get("/api/admin/master-prompt/audit", requirePromoterAdminSession, (req, res) => {
  const limitRaw = Number(req.query.limit || 50);
  const safeLimit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.round(limitRaw))) : 50;
  const audit = listPromptAuditLogs(safeLimit);
  return res.json({
    ...audit,
    featureEnabled: isMasterPromptFeatureEnabled(),
  });
});

// Toggle Master Prompt Feature Flag (promoter_admin ONLY)
app.patch("/api/admin/master-prompt/feature", requirePromoterAdminSession, (req, res) => {
  if (typeof req.body?.enabled !== "boolean") {
    return res.status(400).json({ error: "قيمة التفعيل (enabled) مطلوبة بصيغة منطقية." });
  }
  const session = readAuthenticatedSession(req);
  const actor = extractPromptActor(req, session);
  const prevEnabled = isMasterPromptFeatureEnabled();
  const result = setMasterPromptFeatureEnabled(req.body.enabled, actor);
  recordAdminModification({
    category: "permission_change",
    actionLabelAr: "تعديل صلاحية عرض البرومبت",
    targetType: "feature_flag",
    targetId: "master_prompt_enabled",
    targetName: "تفعيل ميزة البرومبت الهندسي",
    fieldLabelAr: "حالة التفعيل",
    previousValue: prevEnabled ? "مفعّلة" : "معطّلة",
    newValue: req.body.enabled ? "مفعّلة" : "معطّلة",
    summaryAr: req.body.enabled
      ? "تم تفعيل صلاحية عرض البرومبت الهندسي لحساب المروّج"
      : "تم تعطيل ميزة عرض البرومبت الهندسي مؤقتاً",
    actorUid: session?.uid || "promoter",
    actorName: session?.displayName || session?.email || "أدمن المروّج",
    actorEmail: session?.email || BOOTSTRAPPED_ADMIN_EMAIL,
    actorRole: session?.role || "promoter_admin",
    ipAddress: String(req.headers["x-forwarded-for"] || req.ip || "127.0.0.1"),
  });
  return res.json(result);
});

// Rotate AES-256-GCM DEK and re-encrypt stored Master Prompt (promoter_admin ONLY)
app.post("/api/admin/master-prompt/rotate-key", requirePromoterAdminSession, (req, res) => {
  const session = readAuthenticatedSession(req);
  const actor = extractPromptActor(req, session);
  const metadata = rotatePromptEncryptionKey(actor);
  return res.json({ metadata });
});

// Export signed encrypted backup envelope (promoter_admin ONLY)
app.post("/api/admin/master-prompt/backup", requirePromoterAdminSession, (req, res) => {
  const session = readAuthenticatedSession(req);
  const actor = extractPromptActor(req, session);
  const backup = exportEncryptedPromptBackup(actor);
  return res.json({ backup });
});

// Restore from signed encrypted backup envelope (promoter_admin ONLY)
app.post("/api/admin/master-prompt/restore", requirePromoterAdminSession, (req, res) => {
  const backup = req.body?.backup;
  if (!isPlainObject(backup) || typeof backup.cipherHex !== "string" || typeof backup.envelopeSignatureSha256 !== "string") {
    return res.status(400).json({ error: "ملف النسخة الاحتياطية المشفرة غير صالح." });
  }
  const session = readAuthenticatedSession(req);
  const actor = extractPromptActor(req, session);
  try {
    const metadata = restoreEncryptedPromptBackup(backup as any, actor);
    return res.json({ metadata });
  } catch (err: unknown) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : "فشل استعادة النسخة الاحتياطية.",
    });
  }
});

// Server-enforced Role Preview Switcher (ONLY permitted when original authenticated role === promoter_admin)
app.post("/api/admin/roles/switch-preview", (req, res) => {
  const session = readAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({ error: "يجب تسجيل الدخول أولاً." });
  }
  const originRole = session.originalRole || session.role;
  if (originRole !== "promoter_admin") {
    recordPromptAuditEvent({
      actor: extractPromptActor(req, session),
      action: "denied",
      outcome: "blocked",
      httpStatus: 403,
      keyVersion: getActivePromptKeyVersion(),
      reason: "ROLE_ESCALATION_BLOCKED",
    });
    return res.status(403).json({
      error: "ممنوع: لا تملك صلاحية التبديل بين أدوار الإدارة.",
      code: "PROMOTER_ADMIN_REQUIRED",
    });
  }
  const targetRole = req.body?.targetRole;
  if (targetRole !== "promoter_admin" && targetRole !== "user_admin") {
    return res.status(400).json({ error: "الدور المستهدف غير صالح." });
  }
  const hasPin = userPinCredentials.has(session.uid);
  if (hasPin && !session.pinVerified) {
    return res.status(403).json({ error: "يرجى فتح قفل التحقق الثنائي (2FA PIN) أولاً." });
  }

  const updated: SignedSessionPayload = {
    ...session,
    role: targetRole,
    originalRole: "promoter_admin",
  };
  setSessionCookie(req, res, updated);
  const accessRefId = recordPromptAuditEvent({
    actor: extractPromptActor(req, updated),
    action: "role_switched",
    outcome: "granted",
    httpStatus: 200,
    keyVersion: getActivePromptKeyVersion(),
    reason: `PREVIEW_ROLE_${targetRole.toUpperCase()}`,
  });
  recordAdminModification({
    category: "permission_change",
    actionLabelAr: "تبديل معاينة الصلاحيات",
    targetType: "role",
    targetId: session.email || session.uid,
    targetName: session.displayName || session.email || "جلسة الإدارة",
    fieldLabelAr: "الدور النشط",
    previousValue: session.role,
    newValue: targetRole,
    summaryAr: `تبديل معاينة الجلسة الإدارية من ${session.role} إلى ${targetRole}`,
    actorUid: session.uid,
    actorName: session.displayName || session.email || "أدمن المروّج",
    actorEmail: session.email || BOOTSTRAPPED_ADMIN_EMAIL,
    actorRole: originRole,
    ipAddress: String(req.headers["x-forwarded-for"] || req.ip || "127.0.0.1"),
  });
  const featureEnabled = isMasterPromptFeatureEnabled();

  return res.json({
    role: updated.role,
    originalRole: updated.originalRole,
    canAccessMasterPrompt: updated.role === "promoter_admin" && featureEnabled,
    featureEnabled,
    accessRefId,
  });
});

// Manage user_admin / promoter_admin role assignments (promoter_admin ONLY)
app.get("/api/admin/roles/assignments", requirePromoterAdminSession, (_req, res) => {
  return res.json({
    bootstrappedPromoterAdmin: BOOTSTRAPPED_ADMIN_EMAIL,
    assignments: promptVaultQueries.listRbacAssignments(),
  });
});

app.post("/api/admin/roles/assign", requirePromoterAdminSession, (req, res) => {
  const rawEmail = req.body?.email;
  const rawRole = req.body?.role;
  if (typeof rawEmail !== "string" || !EMAIL_PATTERN.test(rawEmail.trim())) {
    return res.status(400).json({ error: "صيغة البريد الإلكتروني غير صالحة." });
  }
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (cleanEmail === BOOTSTRAPPED_ADMIN_EMAIL) {
    return res.status(400).json({ error: "لا يمكن خفض أو تعديل صلاحية حساب المروّج المؤسس." });
  }
  if (rawRole !== "user_admin" && rawRole !== "promoter_admin" && rawRole !== "customer") {
    return res.status(400).json({ error: "الدور المحدد غير صالح." });
  }

  const session = readAuthenticatedSession(req);
  const existingAssignment = promptVaultQueries.getRbacAssignment(cleanEmail);
  const previousRole = existingAssignment?.role || "customer";
  const now = new Date().toISOString();
  if (rawRole === "customer") {
    promptVaultQueries.deleteRbacAssignment(cleanEmail);
  } else {
    promptVaultQueries.upsertRbacAssignment({
      email: cleanEmail,
      role: rawRole,
      updated_at: now,
      updated_by: session?.email || "promoter_admin",
    });
  }
  const accessRefId = recordPromptAuditEvent({
    actor: extractPromptActor(req, session),
    action: "role_assigned",
    outcome: "granted",
    httpStatus: 200,
    keyVersion: getActivePromptKeyVersion(),
    reason: `ROLE_SET_${rawRole.toUpperCase()}`,
  });
  recordAdminModification({
    category: "permission_change",
    actionLabelAr: rawRole === "customer" ? "سحب صلاحيات الإدارة" : "تعديل صلاحيات مسؤول",
    targetType: "role",
    targetId: cleanEmail,
    targetName: cleanEmail,
    fieldLabelAr: "الصلاحية",
    previousValue: previousRole,
    newValue: rawRole,
    summaryAr: `تعديل صلاحية الحساب من ${previousRole} إلى ${rawRole}`,
    actorUid: session?.uid || "promoter",
    actorName: session?.displayName || session?.email || "أدمن المروّج",
    actorEmail: session?.email || BOOTSTRAPPED_ADMIN_EMAIL,
    actorRole: session?.role || "promoter_admin",
    ipAddress: String(req.headers["x-forwarded-for"] || req.ip || "127.0.0.1"),
  });

  return res.json({
    email: cleanEmail,
    role: rawRole,
    accessRefId,
    assignments: promptVaultQueries.listRbacAssignments(),
  });
});

// Admin API Performance, Security Feature Adoption & Bottleneck Prediction Report
app.get("/api/admin/performance", requireVerifiedAdminSession, (req, res) => {
  const session = readAuthenticatedSession(req);
  const window = parsePerformanceWindow(req.query.window);
  const isPromoter = session?.role === "promoter_admin";
  const report = buildAdminPerformanceReport({
    window,
    pinEnabledCount: userPinCredentials.size,
    ...(isPromoter ? { activePromptKeyVersion: getActivePromptKeyVersion() } : {}),
    includeVaultTelemetry: isPromoter,
  });
  return res.json(report);
});

// Admin Suspicious Activity Alerts & Email/In-App Notification Configuration
app.get("/api/admin/security-alerts", requireVerifiedAdminSession, (_req, res) => {
  return res.json(listAdminSecurityAlerts());
});

app.patch("/api/admin/security-alerts/settings", requireVerifiedAdminSession, (req, res) => {
  const {
    dashboardEnabled,
    emailEnabled,
    recipientEmail,
    multiIpThreshold,
    repeatedAttemptsThreshold,
    windowMinutes,
  } = req.body || {};

  if (typeof dashboardEnabled !== "boolean" || typeof emailEnabled !== "boolean") {
    return res.status(400).json({ error: "صيغة تفعيل قنوات التنبيه غير صالحة." });
  }
  if (typeof recipientEmail !== "string" || !EMAIL_PATTERN.test(recipientEmail.trim())) {
    return res.status(400).json({ error: "يرجى إدخال بريد إلكتروني صحيح لاستلام التنبيهات." });
  }
  const multiIp = Number(multiIpThreshold);
  const attempts = Number(repeatedAttemptsThreshold);
  const winMins = Number(windowMinutes);
  if (
    !Number.isFinite(multiIp) ||
    multiIp < 2 ||
    multiIp > 20 ||
    !Number.isFinite(attempts) ||
    attempts < 2 ||
    attempts > 50 ||
    !Number.isFinite(winMins) ||
    winMins < 1 ||
    winMins > 120
  ) {
    return res.status(400).json({ error: "قيم عتبات الكشف والنافذة الزمنية خارج النطاق المسموح." });
  }

  const session = readAuthenticatedSession(req);
  const settings = saveSecurityAlertSettings(
    {
      dashboardEnabled,
      emailEnabled,
      recipientEmail,
      multiIpThreshold: multiIp,
      repeatedAttemptsThreshold: attempts,
      windowMinutes: winMins,
    },
    session?.email || "admin"
  );
  return res.json({ settings });
});

app.patch("/api/admin/security-alerts/:id/status", requireVerifiedAdminSession, (req, res) => {
  const alertId = req.params.id;
  const status = req.body?.status;
  if (!isSafeId(alertId, 64)) {
    return res.status(400).json({ error: "معرف التنبيه غير صالح." });
  }
  if (status !== "acknowledged" && status !== "resolved") {
    return res.status(400).json({ error: "حالة التنبيه المطلوبة غير صالحة." });
  }
  const session = readAuthenticatedSession(req);
  const updated = updateAlertStatusById(alertId, status, session?.email || "admin");
  if (!updated) {
    return res.status(404).json({ error: "التنبيه المطلوب غير موجود." });
  }
  return res.json({ alert: updated });
});

app.post("/api/admin/security-alerts/test", requireVerifiedAdminSession, async (req, res) => {
  const session = readAuthenticatedSession(req);
  const rawFwd = String(req.headers["x-forwarded-for"] || "").trim();
  const sourceIp = rawFwd || req.ip || req.socket.remoteAddress || "127.0.0.1";
  const alert = await triggerTestSecurityAlert(session?.email || "admin", sourceIp);
  return res.json({ alert });
});

// Storefront Google Analytics First-Party Behavior Collector & Admin Insights Report
app.post("/api/analytics/behavior/event", (req, res) => {
  const validated = validateBehaviorEventInput(req.body, req.headers["user-agent"]);
  if ("error" in validated) {
    return res.status(400).json({ error: validated.error });
  }
  recordBehaviorEvent(validated.event);
  return res.status(202).json({ ok: true });
});

app.get("/api/admin/behavior-analytics", requireVerifiedAdminSession, (req, res) => {
  const range = parseBehaviorTimeRange(req.query.range);
  const report = buildAdminBehaviorReport(range, process.env.VITE_GA_MEASUREMENT_ID);
  return res.json(report);
});

// Admin Modifications Audit Log (Price Changes, Stock Updates, Permission Changes)
app.get("/api/admin/modification-logs", requireVerifiedAdminSession, (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : "all";
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const limit = Number(req.query.limit || 120);
  return res.json(listAdminModificationLogs({ category, search, limit }));
});

app.post("/api/admin/modification-logs", requireVerifiedAdminSession, (req, res) => {
  const validated = validateClientModificationPayload(req.body);
  if ("error" in validated) {
    return res.status(400).json({ error: validated.error });
  }
  const session = readAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({ error: "انتهت الجلسة، يرجى إعادة تسجيل الدخول." });
  }
  const entry = recordAdminModification({
    ...validated.data,
    actorUid: session.uid,
    actorName: session.displayName || session.email,
    actorEmail: session.email,
    actorRole: session.role,
    ipAddress: String(req.headers["x-forwarded-for"] || req.ip || "127.0.0.1"),
  });
  return res.status(201).json({ entry });
});

// Amazon Saudi Arabia Server-Side API Proxy (AWS4 Signed PA-API 5.0 + High-Speed TTL Cache)
app.get("/api/amazon-sa/products", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const category = normalizeAmazonCategory(req.query.category);
    const brand = typeof req.query.brand === "string" ? req.query.brand : "";
    const minPrice =
      req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
    const maxPrice =
      req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
    const minRating =
      req.query.minRating !== undefined ? Number(req.query.minRating) : undefined;
    const primeOnly = req.query.primeOnly === "1" || req.query.primeOnly === "true";
    const inStockOnly =
      req.query.inStockOnly === "1" || req.query.inStockOnly === "true";
    const rawSort = typeof req.query.sort === "string" ? req.query.sort : "featured";
    const sort =
      rawSort === "price-asc" ||
      rawSort === "price-desc" ||
      rawSort === "rating-desc" ||
      rawSort === "discount-desc"
        ? rawSort
        : "featured";
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 24;

    const payload = await queryAmazonSaCatalog({
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      minRating,
      primeOnly,
      inStockOnly,
      sort,
      limit,
    });

    res.setHeader("Cache-Control", "private, max-age=30");
    return res.json(payload);
  } catch {
    return res.status(502).json({
      error: "تعذر جلب كتالوج أمازون السعودية مؤقتاً، يرجى المحاولة مرة أخرى.",
    });
  }
});

app.get("/api/amazon-sa/products/:asin/refresh", async (req, res) => {
  const asin = String(req.params.asin || "").trim().toUpperCase();
  if (!isValidAsin(asin)) {
    return res.status(400).json({ error: "رمز المنتج (ASIN) غير صالح." });
  }
  const force = req.query.force === "1" || req.query.force === "true";
  const result = await refreshAmazonSaItemByAsin(asin, force);
  if (!result) {
    return res.status(404).json({ error: "لم يتم العثور على هذا المنتج في كتالوج أمازون السعودية." });
  }
  res.setHeader("Cache-Control", "no-store");
  return res.json(result);
});

// Brand Storefront Merchant Ratings (Order Prep Speed & Packaging Quality)
app.get("/api/brands/ratings", (req, res) => {
  seedMerchantRatingsIfEmpty();
  const brandSlug =
    typeof req.query.brandSlug === "string" ? req.query.brandSlug.trim().toLowerCase() : undefined;
  if (brandSlug && !isValidBrandSlug(brandSlug)) {
    return res.status(400).json({ error: "معرّف العلامة التجارية غير صالح." });
  }
  const summaries = listMerchantRatingSummaries(brandSlug);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ summaries });
});

app.post("/api/brands/:slug/ratings", (req, res) => {
  seedMerchantRatingsIfEmpty();
  const validated = validateMerchantRatingPayload(req.params.slug || "", req.body);
  if ("error" in validated) {
    return res.status(400).json({ error: validated.error });
  }
  const result = recordMerchantRating(validated.data);
  return res.status(201).json(result);
});

// Automatic Target Price Drop Alerts Endpoints
app.get("/api/price-alerts", (req, res) => {
  const clientKey =
    typeof req.query.clientKey === "string"
      ? req.query.clientKey.trim()
      : String(req.headers["x-rawaj-client-key"] || "").trim();
  if (!isValidClientKey(clientKey)) {
    return res.status(400).json({ error: "معرّف الجلسة أو العميل غير صالح." });
  }
  const alerts = listClientPriceAlerts(clientKey);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ alerts });
});

app.post("/api/price-alerts", (req, res) => {
  const rawClientKey =
    (isPlainObject(req.body) ? req.body.clientKey : undefined) ||
    req.headers["x-rawaj-client-key"];
  const validated = validateUpsertPriceAlertPayload(rawClientKey, req.body);
  if ("error" in validated) {
    return res.status(400).json({ error: validated.error });
  }
  const alert = upsertClientPriceAlert(validated.data);
  return res.status(201).json({ alert });
});

app.delete("/api/price-alerts/:productId", (req, res) => {
  const clientKey =
    typeof req.query.clientKey === "string"
      ? req.query.clientKey.trim()
      : String(req.headers["x-rawaj-client-key"] || "").trim();
  const productId = (req.params.productId || "").trim();
  if (!isValidClientKey(clientKey) || !isValidProductId(productId)) {
    return res.status(400).json({ error: "معاملات حذف التنبيه غير صالحة." });
  }
  const removed = removeClientPriceAlert(clientKey, productId);
  return res.json({ removed });
});

app.post("/api/price-alerts/evaluate", (req, res) => {
  const body = isPlainObject(req.body) ? req.body : {};
  const clientKey = String(
    body.clientKey || req.headers["x-rawaj-client-key"] || ""
  ).trim();
  if (!isValidClientKey(clientKey)) {
    return res.status(400).json({ error: "معرّف الجلسة أو العميل غير صالح." });
  }
  const incomingProducts: Product[] = Array.isArray(body.products)
    ? body.products
        .filter(
          (item): item is Record<string, unknown> =>
            isPlainObject(item) &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.price === "number" &&
            Number.isFinite(item.price) &&
            item.price > 0
        )
        .map((item) => ({
          ...(item as unknown as Product),
          images: Array.isArray(item.images)
            ? item.images.filter((img): img is string => typeof img === "string")
            : typeof item.image === "string"
              ? [item.image]
              : [],
        }))
    : INITIAL_PRODUCTS;
  const previousPrices =
    isPlainObject(body.previousPrices)
      ? (body.previousPrices as Record<string, number>)
      : {};
  const result = evaluateClientPriceAlertsAgainstCatalog(
    clientKey,
    incomingProducts,
    previousPrices
  );
  res.setHeader("Cache-Control", "no-store");
  return res.json(result);
});

// Start Server and Vite Middleware
async function start() {
  seedBehaviorBaselineIfEmpty();
  seedAdminModificationBaselineIfEmpty();
  seedMerchantRatingsIfEmpty();
  // Serve local product demonstration videos with byte-range seeking support
  app.use("/videos", express.static(path.join(process.cwd(), "public", "videos")));

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "نقطة النهاية المطلوبة غير موجودة." });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      plugins: [
        {
          name: "rawaj-disable-hmr-ws",
          enforce: "post",
          transform(code, id) {
            if (id.replace(/\\/g, "/").endsWith("vite/dist/client/client.mjs")) {
              return {
                code: code
                  .replace(
                    "transport.connect(createHMRHandler(handleMessage));",
                    "/* HMR WebSocket disabled in preview runtime */"
                  )
                  .replace(
                    'throw new Error("send was called before connect");',
                    "return;"
                  )
                  .replace(
                    'throw new Error("invoke was called before connect");',
                    "return undefined;"
                  ),
                map: null,
              };
            }
          },
        },
      ],
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Final stack-free production error handler
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (res.headersSent) return;
      const status =
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        typeof (err as { status?: unknown }).status === "number"
          ? Math.max(400, Math.min(599, (err as { status: number }).status))
          : 500;
      if (req.path.startsWith("/api/")) {
        res.status(status).json({ error: "حدث خطأ داخلي في الخادم." });
        return;
      }
      res.status(status).type("text/plain; charset=utf-8").send("حدث خطأ غير متوقع.");
    }
  );

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

export { app };

if (process.env.RAWAJ_SKIP_SERVER_LISTEN !== "1") {
  start();
}
