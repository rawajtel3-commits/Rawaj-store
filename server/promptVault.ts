import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  promptVaultQueries,
  type PromptAccessAuditRow,
  type PromptKeyringRow,
} from "./sqliteStore.js";
import type {
  MasterPromptAuditEntry,
  MasterPromptEncryptedBackup,
  MasterPromptMetadata,
} from "../src/types.js";

const PROMPT_ID = "rawaj_master_engineering_prompt_v1";
const FEATURE_FLAG_KEY = "master_prompt_visible";
const KEY_ROTATION_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days periodic rotation

const KEK_RUNTIME_KEY_FILE = path.join("/tmp", "rawaj-prompt-kek.key");

// Server-only canonical Engineering Prompt (never exposed in client bundles or logs)
const INITIAL_MASTER_PROMPT_SERVER_ONLY = `### 🚀 البرومبت المعتمد لبناء وتصميم متجر إلكتروني متكامل مزود بمساعد ذكي (Master Prompt for E-Commerce App)

بصفتك مهندساً وخبيراً متمرساً في تطوير المتاجر الإلكترونية الحديثة والذكاء الاصطناعي، يرجى إنشاء منصة تجارة إلكترونية متكاملة باللغة العربية بأسلوب وتصميم فاخر عالي الأداء مع مراعاة كافة المتطلبات التالية:

1️⃣ تفاصيل المنتجات وشاشة العرض (Rich Product Specification & Catalog):
   - عرض جدول مواصفات تقنية تفصيلية لكل منتج (المعالج، الذاكرة، التخزين، البطارية، الضمان).
   - توفير خيارات تخصيص متطورة (الألوان، السعات، النقش الليزري المخصص، حزم الضمان وتغليف الهدايا).
   - مؤشر حالة التوفر الفوري (متوفر، كمية محدودة، نفذت الكمية).
   - تقييمات ومراجعات مشفوعة بآراء العملاء الحقيقيين.

2️⃣ خيارات الدفع الشاملة والآمنة (Multi-Payment Gateway Integration):
   - دمج البطاقات الائتمانية والدفع الإلكتروني (Visa, MasterCard, Apple Pay) مع محاكي بطاقة تفاعلي والتحقق الفوري.
   - خدمة الدفع عند الاستلام (COD) في كافة محافظات الجمهورية اليمنية.
   - المحافظ الإلكترونية المحلية والدولية (كريمي، جيب، فلوسي، قروش، كاش ون، Apple Pay).
   - خيارات التقسيط بدون فوائد (تمارا / الدفع المرن على 4 دفعات).
   - إصدار فاتورة ضريبية مبسطة قابلة للطباعة والتنزيل فور إتمام الطلب.

3️⃣ الدردشة المباشرة مع البائع (Live Seller Chat System):
   - نافذة دردشة فورية للتواصل المباشر مع الدعم والبائع.
   - دعم الاستفسارات الشائعة بلمسة واحدة (موعد التوصيل، خصم الجملة، الضمان المحلي).
   - ردود آليّة ذكية ومحاكاة ممثل خدمة العملاء.

4️⃣ لوحة تحكم الأدمن المتكاملة (Full Admin Control Panel):
   - رسم بياني لتحليلات المبيعات والإيرادات والأداء الشهري.
   - إدارة الطلبات وإمكانية تغيير حالة الطلب (قيد الانتظار، جاري الشحن، تم التوصيل، ملغي).
   - إدارة دليل المنتجات وتعديل المخزون إضافة/تحديث.
   - إدارة قائمة العملاء والمتحصلات المالية وسجل الشراء.

5️⃣ المساعد الذكي القائم على الذكاء الاصطناعي (AI Shopping Assistant):
   - دمج محرك Gemini AI (server-side @google/genai) لتقديم توصيات منتجات مخصصة بناءً على ميزانية المستخدم وتفضيلاته.
   - محرك بحث ذكي وفهم الاستفسارات باللغة العربية الطبيعية.
   - زر إضافة إلى السلة مباشر من داخل المحادثة الذكية.

✨ معايير التصميم والأداء:
   - واجهة مستخدم ناعمة وفاخرة تدعم اتجاه RTL باللغة العربية.
   - تجربة متجاوبة بالكامل على الهواتف والتابلت وأجهزة السطح المكتب.
   - سرعة فائقة وعدم استخدام بيانات وهمية عشوائية.`;

function resolvePromptKeyEncryptionKey(): Buffer {
  const envSecret = process.env.PROMPT_KMS_KEY?.trim() || process.env.PASSWORD_PEPPER?.trim();
  if (envSecret && envSecret !== "MY_PROMPT_KMS_KEY" && envSecret !== "MY_PASSWORD_PEPPER") {
    return crypto
      .createHmac("sha256", Buffer.from(envSecret, "utf8"))
      .update("rawaj:prompt-vault-kek:v1")
      .digest();
  }
  try {
    if (fs.existsSync(KEK_RUNTIME_KEY_FILE)) {
      const hex = fs.readFileSync(KEK_RUNTIME_KEY_FILE, "utf8").trim();
      if (/^[0-9a-f]{64}$/i.test(hex)) {
        return Buffer.from(hex, "hex");
      }
    }
    const generated = crypto.randomBytes(32);
    fs.writeFileSync(KEK_RUNTIME_KEY_FILE, generated.toString("hex"), {
      encoding: "utf8",
      mode: 0o600,
    });
    return generated;
  } catch {
    return crypto.randomBytes(32);
  }
}

const PROMPT_KEK = resolvePromptKeyEncryptionKey();

function aesGcmEncrypt(key: Buffer, plaintext: Buffer): { ivHex: string; tagHex: string; cipherHex: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ivHex: iv.toString("hex"),
    tagHex: tag.toString("hex"),
    cipherHex: encrypted.toString("hex"),
  };
}

function aesGcmDecrypt(key: Buffer, ivHex: string, tagHex: string, cipherHex: string): Buffer {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(cipherHex, "hex")), decipher.final()]);
}

function wrapDek(dek: Buffer): { wrappedKeyHex: string; ivHex: string; tagHex: string } {
  const enc = aesGcmEncrypt(PROMPT_KEK, dek);
  return {
    wrappedKeyHex: enc.cipherHex,
    ivHex: enc.ivHex,
    tagHex: enc.tagHex,
  };
}

function unwrapDek(row: PromptKeyringRow): Buffer {
  return aesGcmDecrypt(PROMPT_KEK, row.iv_hex, row.tag_hex, row.wrapped_key_hex);
}

export function maskActorEmail(email: string | undefined): string {
  if (!email || !email.includes("@")) return "anonymous";
  const [local, domain] = email.split("@");
  const prefix = local.slice(0, 2) || "*";
  return `${prefix}***@${domain}`;
}

export function generateAccessRefId(prefix = "prm-acc"): string {
  return `${prefix}-${crypto.randomBytes(6).toString("hex")}`;
}

export interface PromptActorContext {
  uid: string;
  email?: string;
  role: string;
  ipAddress: string;
  userAgent: string;
}

export function recordPromptAuditEvent(params: {
  actor: PromptActorContext;
  action: MasterPromptAuditEntry["action"];
  outcome: "granted" | "blocked";
  httpStatus: number;
  keyVersion: number;
  accessRefId?: string;
  reason?: string;
}): string {
  const accessRefId = params.accessRefId || generateAccessRefId();
  const row: PromptAccessAuditRow = {
    id: `paud-${crypto.randomBytes(6).toString("hex")}`,
    access_ref_id: accessRefId,
    actor_uid: String(params.actor.uid || "anonymous").slice(0, 128),
    actor_email_masked: maskActorEmail(params.actor.email),
    actor_role: String(params.actor.role || "unauthenticated").slice(0, 32),
    action: params.action,
    outcome: params.outcome,
    http_status: params.httpStatus,
    key_version: params.keyVersion,
    ip_address: String(params.actor.ipAddress || "unknown").slice(0, 64),
    user_agent: String(params.actor.userAgent || "unknown").slice(0, 120),
    reason: params.reason ? String(params.reason).slice(0, 160) : null,
    created_at: new Date().toISOString(),
  };
  promptVaultQueries.insertPromptAudit(row);
  return accessRefId;
}

function seedVaultWithFreshKey(plaintext: string): void {
  const now = new Date();
  const rotateAfter = new Date(now.getTime() + KEY_ROTATION_INTERVAL_MS);
  const keyVersion = 1;
  const keyId = `pdk-v${keyVersion}-${crypto.randomBytes(4).toString("hex")}`;
  const dek = crypto.randomBytes(32);
  const wrapped = wrapDek(dek);
  const plainBuf = Buffer.from(plaintext, "utf8");
  const enc = aesGcmEncrypt(dek, plainBuf);
  const checksum = crypto.createHash("sha256").update(plainBuf).digest("hex");

  promptVaultQueries.runTransaction(() => {
    promptVaultQueries.insertKeyring({
      key_id: keyId,
      key_version: keyVersion,
      wrapped_key_hex: wrapped.wrappedKeyHex,
      iv_hex: wrapped.ivHex,
      tag_hex: wrapped.tagHex,
      status: "active",
      created_at: now.toISOString(),
      rotate_after_at: rotateAfter.toISOString(),
      rotated_at: null,
    });

    promptVaultQueries.upsertEncryptedPrompt({
      prompt_id: PROMPT_ID,
      key_id: keyId,
      key_version: keyVersion,
      iv_hex: enc.ivHex,
      tag_hex: enc.tagHex,
      cipher_hex: enc.cipherHex,
      checksum_sha256: checksum,
      updated_at: now.toISOString(),
    });

    if (!promptVaultQueries.getFeatureFlag(FEATURE_FLAG_KEY)) {
      promptVaultQueries.upsertFeatureFlag({
        flag_key: FEATURE_FLAG_KEY,
        enabled: 1,
        updated_at: now.toISOString(),
        updated_by: "system-bootstrap",
      });
    }
  });
}

export function ensurePromptVaultInitialized(): void {
  let activeKey = promptVaultQueries.getActiveKeyring();
  let stored = promptVaultQueries.getEncryptedPrompt(PROMPT_ID);

  if (!activeKey || !stored) {
    seedVaultWithFreshKey(INITIAL_MASTER_PROMPT_SERVER_ONLY);
    return;
  }

  // Verify the stored DEK & ciphertext decrypt under the current KEK; re-seed cleanly if ephemeral KEK changed across container cold start
  try {
    const keyRow = promptVaultQueries.getKeyringById(stored.key_id);
    if (!keyRow) throw new Error("Missing keyring");
    const dek = unwrapDek(keyRow);
    const plain = aesGcmDecrypt(dek, stored.iv_hex, stored.tag_hex, stored.cipher_hex);
    const check = crypto.createHash("sha256").update(plain).digest("hex");
    if (check !== stored.checksum_sha256) throw new Error("Checksum mismatch");
  } catch {
    seedVaultWithFreshKey(INITIAL_MASTER_PROMPT_SERVER_ONLY);
    activeKey = promptVaultQueries.getActiveKeyring();
    stored = promptVaultQueries.getEncryptedPrompt(PROMPT_ID);
  }

  // Periodic automatic key rotation check
  if (activeKey && stored && new Date(activeKey.rotate_after_at).getTime() <= Date.now()) {
    rotatePromptEncryptionKey({
      uid: "system-scheduler",
      email: "scheduler@rawaj.internal",
      role: "promoter_admin",
      ipAddress: "127.0.0.1",
      userAgent: "Periodic-Key-Rotation",
    });
  }
}

export function isMasterPromptFeatureEnabled(): boolean {
  ensurePromptVaultInitialized();
  const flag = promptVaultQueries.getFeatureFlag(FEATURE_FLAG_KEY);
  return flag ? flag.enabled === 1 : true;
}

export function setMasterPromptFeatureEnabled(
  enabled: boolean,
  actor: PromptActorContext
): { featureEnabled: boolean; accessRefId: string } {
  ensurePromptVaultInitialized();
  const activeKey = promptVaultQueries.getActiveKeyring();
  const now = new Date().toISOString();
  promptVaultQueries.upsertFeatureFlag({
    flag_key: FEATURE_FLAG_KEY,
    enabled: enabled ? 1 : 0,
    updated_at: now,
    updated_by: maskActorEmail(actor.email),
  });
  const accessRefId = recordPromptAuditEvent({
    actor,
    action: "feature_toggle",
    outcome: "granted",
    httpStatus: 200,
    keyVersion: activeKey?.key_version || 1,
    reason: enabled ? "FEATURE_ENABLED" : "FEATURE_DISABLED",
  });
  return { featureEnabled: enabled, accessRefId };
}

export function getActivePromptKeyVersion(): number {
  ensurePromptVaultInitialized();
  return promptVaultQueries.getActiveKeyring()?.key_version || 1;
}

export function rotatePromptEncryptionKey(actor: PromptActorContext): MasterPromptMetadata {
  ensurePromptVaultInitialized();
  const stored = promptVaultQueries.getEncryptedPrompt(PROMPT_ID);
  const currentKey = stored ? promptVaultQueries.getKeyringById(stored.key_id) : undefined;
  if (!stored || !currentKey) {
    throw new Error("Prompt vault unavailable for rotation");
  }

  const oldDek = unwrapDek(currentKey);
  const plainBuf = aesGcmDecrypt(oldDek, stored.iv_hex, stored.tag_hex, stored.cipher_hex);

  const now = new Date();
  const nextVersion = currentKey.key_version + 1;
  const nextKeyId = `pdk-v${nextVersion}-${crypto.randomBytes(4).toString("hex")}`;
  const nextRotateAfter = new Date(now.getTime() + KEY_ROTATION_INTERVAL_MS);
  const newDek = crypto.randomBytes(32);
  const wrappedNew = wrapDek(newDek);
  const reEncrypted = aesGcmEncrypt(newDek, plainBuf);
  const checksum = crypto.createHash("sha256").update(plainBuf).digest("hex");

  promptVaultQueries.runTransaction(() => {
    promptVaultQueries.markKeyRotated(currentKey.key_id, now.toISOString());
    promptVaultQueries.insertKeyring({
      key_id: nextKeyId,
      key_version: nextVersion,
      wrapped_key_hex: wrappedNew.wrappedKeyHex,
      iv_hex: wrappedNew.ivHex,
      tag_hex: wrappedNew.tagHex,
      status: "active",
      created_at: now.toISOString(),
      rotate_after_at: nextRotateAfter.toISOString(),
      rotated_at: null,
    });
    promptVaultQueries.upsertEncryptedPrompt({
      prompt_id: PROMPT_ID,
      key_id: nextKeyId,
      key_version: nextVersion,
      iv_hex: reEncrypted.ivHex,
      tag_hex: reEncrypted.tagHex,
      cipher_hex: reEncrypted.cipherHex,
      checksum_sha256: checksum,
      updated_at: now.toISOString(),
    });
  });

  const accessRefId = recordPromptAuditEvent({
    actor,
    action: "key_rotated",
    outcome: "granted",
    httpStatus: 200,
    keyVersion: nextVersion,
    reason: `ROTATED_FROM_V${currentKey.key_version}_TO_V${nextVersion}`,
  });

  return {
    promptId: PROMPT_ID,
    accessRefId,
    keyId: nextKeyId,
    keyVersion: nextVersion,
    checksumSha256: checksum,
    updatedAt: now.toISOString(),
    lastRotatedAt: now.toISOString(),
    nextRotationAt: nextRotateAfter.toISOString(),
    featureEnabled: isMasterPromptFeatureEnabled(),
  };
}

export function readDecryptedMasterPrompt(actor: PromptActorContext): {
  prompt: string;
  metadata: MasterPromptMetadata;
} {
  ensurePromptVaultInitialized();
  const stored = promptVaultQueries.getEncryptedPrompt(PROMPT_ID);
  const activeKey = stored ? promptVaultQueries.getKeyringById(stored.key_id) : undefined;
  const featureEnabled = isMasterPromptFeatureEnabled();

  if (!featureEnabled) {
    const ref = recordPromptAuditEvent({
      actor,
      action: "denied",
      outcome: "blocked",
      httpStatus: 403,
      keyVersion: activeKey?.key_version || 1,
      reason: "FEATURE_DISABLED",
    });
    const err = new Error("ميزة عرض البرومبت الهندسي معطلة حالياً من إعدادات أدمن المروّج.");
    (err as Error & { code?: string; accessRefId?: string; status?: number }).code = "FEATURE_DISABLED";
    (err as Error & { accessRefId?: string }).accessRefId = ref;
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  if (!stored || !activeKey) {
    throw new Error("مخزن البرومبت غير مهيأ.");
  }

  const dek = unwrapDek(activeKey);
  const plainBuf = aesGcmDecrypt(dek, stored.iv_hex, stored.tag_hex, stored.cipher_hex);
  const promptText = plainBuf.toString("utf8");
  const accessRefId = recordPromptAuditEvent({
    actor,
    action: "view",
    outcome: "granted",
    httpStatus: 200,
    keyVersion: stored.key_version,
    reason: "PROMOTER_ADMIN_AUTHORIZED",
  });

  return {
    prompt: promptText,
    metadata: {
      promptId: stored.prompt_id,
      accessRefId,
      keyId: stored.key_id,
      keyVersion: stored.key_version,
      checksumSha256: stored.checksum_sha256,
      updatedAt: stored.updated_at,
      lastRotatedAt: activeKey.created_at,
      nextRotationAt: activeKey.rotate_after_at,
      featureEnabled: true,
    },
  };
}

export function exportEncryptedPromptBackup(actor: PromptActorContext): MasterPromptEncryptedBackup {
  ensurePromptVaultInitialized();
  const stored = promptVaultQueries.getEncryptedPrompt(PROMPT_ID);
  if (!stored) {
    throw new Error("No encrypted prompt found to back up");
  }
  const exportedAt = new Date().toISOString();
  const accessRefId = recordPromptAuditEvent({
    actor,
    action: "backup_created",
    outcome: "granted",
    httpStatus: 200,
    keyVersion: stored.key_version,
    reason: "ENCRYPTED_BACKUP_EXPORTED",
  });
  const sigInput = `${stored.prompt_id}:${stored.key_id}:${stored.key_version}:${stored.cipher_hex}:${stored.checksum_sha256}`;
  const envelopeSignatureSha256 = crypto
    .createHmac("sha256", PROMPT_KEK)
    .update(sigInput)
    .digest("hex");

  return {
    backupVersion: "1.0",
    exportedAt,
    exportedByRef: accessRefId,
    promptId: stored.prompt_id,
    keyId: stored.key_id,
    keyVersion: stored.key_version,
    ivHex: stored.iv_hex,
    tagHex: stored.tag_hex,
    cipherHex: stored.cipher_hex,
    plaintextChecksumSha256: stored.checksum_sha256,
    envelopeSignatureSha256,
    featureEnabled: isMasterPromptFeatureEnabled(),
  };
}

export function restoreEncryptedPromptBackup(
  backup: MasterPromptEncryptedBackup,
  actor: PromptActorContext
): MasterPromptMetadata {
  ensurePromptVaultInitialized();
  const sigInput = `${backup.promptId}:${backup.keyId}:${backup.keyVersion}:${backup.cipherHex}:${backup.plaintextChecksumSha256}`;
  const expectedSig = crypto
    .createHmac("sha256", PROMPT_KEK)
    .update(sigInput)
    .digest("hex");
  const sigBuf = Buffer.from(backup.envelopeSignatureSha256, "hex");
  const expBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("توقيع النسخة الاحتياطية غير صالح.");
  }
  const keyRow = promptVaultQueries.getKeyringById(backup.keyId);
  if (!keyRow) {
    throw new Error("مفتاح التشفير المرتبط بالنسخة الاحتياطية غير موجود.");
  }
  const dek = unwrapDek(keyRow);
  const plainBuf = aesGcmDecrypt(dek, backup.ivHex, backup.tagHex, backup.cipherHex);
  const checksum = crypto.createHash("sha256").update(plainBuf).digest("hex");
  if (checksum !== backup.plaintextChecksumSha256) {
    throw new Error("فشل التحقق من بصمة تكامل النسخة الاحتياطية.");
  }

  const now = new Date().toISOString();
  promptVaultQueries.upsertEncryptedPrompt({
    prompt_id: PROMPT_ID,
    key_id: backup.keyId,
    key_version: backup.keyVersion,
    iv_hex: backup.ivHex,
    tag_hex: backup.tagHex,
    cipher_hex: backup.cipherHex,
    checksum_sha256: checksum,
    updated_at: now,
  });

  const accessRefId = recordPromptAuditEvent({
    actor,
    action: "backup_restored",
    outcome: "granted",
    httpStatus: 200,
    keyVersion: backup.keyVersion,
    reason: "ENCRYPTED_BACKUP_RESTORED",
  });

  return {
    promptId: PROMPT_ID,
    accessRefId,
    keyId: backup.keyId,
    keyVersion: backup.keyVersion,
    checksumSha256: checksum,
    updatedAt: now,
    lastRotatedAt: keyRow.created_at,
    nextRotationAt: keyRow.rotate_after_at,
    featureEnabled: isMasterPromptFeatureEnabled(),
  };
}

export function listPromptAuditLogs(limit = 50): {
  entries: MasterPromptAuditEntry[];
  keyring: Array<{
    keyId: string;
    keyVersion: number;
    status: string;
    createdAt: string;
    rotateAfterAt: string;
    rotatedAt: string | null;
  }>;
} {
  ensurePromptVaultInitialized();
  const rows = promptVaultQueries.listPromptAudit(limit);
  const keyring = promptVaultQueries.listKeyring().map((k) => ({
    keyId: k.key_id,
    keyVersion: k.key_version,
    status: k.status,
    createdAt: k.created_at,
    rotateAfterAt: k.rotate_after_at,
    rotatedAt: k.rotated_at,
  }));
  return {
    entries: rows.map((r) => ({
      id: r.id,
      accessRefId: r.access_ref_id,
      actorUid: r.actor_uid,
      actorEmailMasked: r.actor_email_masked,
      actorRole: r.actor_role,
      action: r.action as MasterPromptAuditEntry["action"],
      outcome: r.outcome,
      httpStatus: r.http_status,
      keyVersion: r.key_version,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      ...(r.reason ? { reason: r.reason } : {}),
      createdAt: r.created_at,
    })),
    keyring,
  };
}
