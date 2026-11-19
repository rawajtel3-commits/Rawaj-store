import { DatabaseSync, StatementSync } from "node:sqlite";
import path from "path";

const SECURITY_DB_FILE =
  process.env.RAWAJ_SECURITY_DB_FILE?.trim() || path.join("/tmp", "rawaj-security.sqlite");
const WHITELABEL_DB_FILE =
  process.env.RAWAJ_WHITELABEL_DB_FILE?.trim() || path.join("/tmp", "rawaj-whitelabel.sqlite");

function openSafeSqlite(filePath: string): DatabaseSync {
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(filePath);
  } catch {
    db = new DatabaseSync(":memory:");
  }
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 3000;");
  return db;
}

// ---------------------------------------------------------------------------
// 1. Server Security Store (Audit Logs, Rate Limits, Revoked Sessions, WebAuthn)
// ---------------------------------------------------------------------------
const secDb = openSafeSqlite(SECURITY_DB_FILE);

secDb.exec(`
  CREATE TABLE IF NOT EXISTS server_security_audit_logs (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    device_summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sec_audit_uid_created
    ON server_security_audit_logs (uid, created_at DESC);

  CREATE TABLE IF NOT EXISTS auth_rate_limits (
    rl_key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    locked_until INTEGER NOT NULL,
    last_attempt_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS revoked_sessions (
    sid TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webauthn_credentials (
    credential_id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export interface SecurityAuditRow {
  id: string;
  uid: string;
  event_type: string;
  status: "success" | "blocked";
  device_summary: string;
  created_at: string;
}

export interface RateLimitRow {
  rl_key: string;
  attempts: number;
  locked_until: number;
  last_attempt_at: number;
}

const stmtInsertAuditLog: StatementSync = secDb.prepare(`
  INSERT INTO server_security_audit_logs (id, uid, event_type, status, device_summary, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const stmtTrimAuditLogs: StatementSync = secDb.prepare(`
  DELETE FROM server_security_audit_logs
  WHERE uid = ? AND id NOT IN (
    SELECT id FROM server_security_audit_logs
    WHERE uid = ?
    ORDER BY created_at DESC
    LIMIT 25
  )
`);

const stmtSelectAuditLogsByUid: StatementSync = secDb.prepare(`
  SELECT id, uid, event_type, status, device_summary, created_at
  FROM server_security_audit_logs
  WHERE uid = ?
  ORDER BY created_at DESC
  LIMIT ?
`);

const stmtGetRateLimit: StatementSync = secDb.prepare(`
  SELECT rl_key, attempts, locked_until, last_attempt_at
  FROM auth_rate_limits
  WHERE rl_key = ?
`);

const stmtUpsertRateLimit: StatementSync = secDb.prepare(`
  INSERT INTO auth_rate_limits (rl_key, attempts, locked_until, last_attempt_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(rl_key) DO UPDATE SET
    attempts = excluded.attempts,
    locked_until = excluded.locked_until,
    last_attempt_at = excluded.last_attempt_at
`);

const stmtDeleteRateLimit: StatementSync = secDb.prepare(`
  DELETE FROM auth_rate_limits WHERE rl_key = ?
`);

const stmtInsertRevokedSession: StatementSync = secDb.prepare(`
  INSERT OR REPLACE INTO revoked_sessions (sid, expires_at)
  VALUES (?, ?)
`);

const stmtIsSessionRevoked: StatementSync = secDb.prepare(`
  SELECT 1 AS revoked FROM revoked_sessions WHERE sid = ? LIMIT 1
`);

const stmtPruneRevokedSessions: StatementSync = secDb.prepare(`
  DELETE FROM revoked_sessions WHERE expires_at < ?
`);

const stmtUpsertWebAuthnCredential: StatementSync = secDb.prepare(`
  INSERT INTO webauthn_credentials (credential_id, user_name, created_at)
  VALUES (?, ?, ?)
  ON CONFLICT(credential_id) DO UPDATE SET
    user_name = excluded.user_name,
    created_at = excluded.created_at
`);

export const securityStoreQueries = {
  insertAuditLog(row: SecurityAuditRow): void {
    stmtInsertAuditLog.run(
      row.id,
      row.uid,
      row.event_type,
      row.status,
      row.device_summary,
      row.created_at
    );
    stmtTrimAuditLogs.run(row.uid, row.uid);
  },

  listAuditLogsByUid(uid: string, maxRows = 25): SecurityAuditRow[] {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(maxRows)));
    return stmtSelectAuditLogsByUid.all(uid, safeLimit) as unknown as SecurityAuditRow[];
  },

  getRateLimit(rlKey: string): RateLimitRow | undefined {
    return stmtGetRateLimit.get(rlKey) as unknown as RateLimitRow | undefined;
  },

  upsertRateLimit(row: RateLimitRow): void {
    stmtUpsertRateLimit.run(
      row.rl_key,
      row.attempts,
      row.locked_until,
      row.last_attempt_at
    );
  },

  deleteRateLimit(rlKey: string): void {
    stmtDeleteRateLimit.run(rlKey);
  },

  revokeSession(sid: string, expiresAt: number): void {
    stmtPruneRevokedSessions.run(Date.now());
    stmtInsertRevokedSession.run(sid, expiresAt);
  },

  isSessionRevoked(sid: string): boolean {
    const row = stmtIsSessionRevoked.get(sid) as { revoked?: number } | undefined;
    return Boolean(row?.revoked);
  },

  upsertWebAuthnCredential(credentialId: string, userName: string, createdAt: string): void {
    stmtUpsertWebAuthnCredential.run(credentialId, userName, createdAt);
  },
};

// ---------------------------------------------------------------------------
// 1B. Encrypted Master Prompt Vault, Keyring, Feature Flags, RBAC & Audit Logs
// ---------------------------------------------------------------------------
secDb.exec(`
  CREATE TABLE IF NOT EXISTS prompt_keyring (
    key_id TEXT PRIMARY KEY,
    key_version INTEGER NOT NULL,
    wrapped_key_hex TEXT NOT NULL,
    iv_hex TEXT NOT NULL,
    tag_hex TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    rotate_after_at TEXT NOT NULL,
    rotated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS encrypted_master_prompts (
    prompt_id TEXT PRIMARY KEY,
    key_id TEXT NOT NULL,
    key_version INTEGER NOT NULL,
    iv_hex TEXT NOT NULL,
    tag_hex TEXT NOT NULL,
    cipher_hex TEXT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prompt_feature_flags (
    flag_key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prompt_access_audit_logs (
    id TEXT PRIMARY KEY,
    access_ref_id TEXT NOT NULL,
    actor_uid TEXT NOT NULL,
    actor_email_masked TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL,
    http_status INTEGER NOT NULL,
    key_version INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_prompt_audit_created
    ON prompt_access_audit_logs (created_at DESC);

  CREATE TABLE IF NOT EXISTS rbac_role_assignments (
    email TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  );
`);

export interface PromptKeyringRow {
  key_id: string;
  key_version: number;
  wrapped_key_hex: string;
  iv_hex: string;
  tag_hex: string;
  status: "active" | "rotated" | "retired";
  created_at: string;
  rotate_after_at: string;
  rotated_at: string | null;
}

export interface EncryptedPromptRow {
  prompt_id: string;
  key_id: string;
  key_version: number;
  iv_hex: string;
  tag_hex: string;
  cipher_hex: string;
  checksum_sha256: string;
  updated_at: string;
}

export interface PromptFeatureFlagRow {
  flag_key: string;
  enabled: number;
  updated_at: string;
  updated_by: string;
}

export interface PromptAccessAuditRow {
  id: string;
  access_ref_id: string;
  actor_uid: string;
  actor_email_masked: string;
  actor_role: string;
  action: string;
  outcome: "granted" | "blocked";
  http_status: number;
  key_version: number;
  ip_address: string;
  user_agent: string;
  reason: string | null;
  created_at: string;
}

export interface RbacRoleAssignmentRow {
  email: string;
  role: string;
  updated_at: string;
  updated_by: string;
}

const stmtInsertKeyring: StatementSync = secDb.prepare(`
  INSERT INTO prompt_keyring (key_id, key_version, wrapped_key_hex, iv_hex, tag_hex, status, created_at, rotate_after_at, rotated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtGetActiveKeyring: StatementSync = secDb.prepare(`
  SELECT key_id, key_version, wrapped_key_hex, iv_hex, tag_hex, status, created_at, rotate_after_at, rotated_at
  FROM prompt_keyring
  WHERE status = 'active'
  ORDER BY key_version DESC
  LIMIT 1
`);

const stmtGetKeyringById: StatementSync = secDb.prepare(`
  SELECT key_id, key_version, wrapped_key_hex, iv_hex, tag_hex, status, created_at, rotate_after_at, rotated_at
  FROM prompt_keyring
  WHERE key_id = ?
  LIMIT 1
`);

const stmtListKeyring: StatementSync = secDb.prepare(`
  SELECT key_id, key_version, wrapped_key_hex, iv_hex, tag_hex, status, created_at, rotate_after_at, rotated_at
  FROM prompt_keyring
  ORDER BY key_version DESC
  LIMIT 20
`);

const stmtMarkKeyRotated: StatementSync = secDb.prepare(`
  UPDATE prompt_keyring
  SET status = 'rotated', rotated_at = ?
  WHERE key_id = ?
`);

const stmtGetEncryptedPrompt: StatementSync = secDb.prepare(`
  SELECT prompt_id, key_id, key_version, iv_hex, tag_hex, cipher_hex, checksum_sha256, updated_at
  FROM encrypted_master_prompts
  WHERE prompt_id = ?
  LIMIT 1
`);

const stmtUpsertEncryptedPrompt: StatementSync = secDb.prepare(`
  INSERT INTO encrypted_master_prompts (prompt_id, key_id, key_version, iv_hex, tag_hex, cipher_hex, checksum_sha256, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(prompt_id) DO UPDATE SET
    key_id = excluded.key_id,
    key_version = excluded.key_version,
    iv_hex = excluded.iv_hex,
    tag_hex = excluded.tag_hex,
    cipher_hex = excluded.cipher_hex,
    checksum_sha256 = excluded.checksum_sha256,
    updated_at = excluded.updated_at
`);

const stmtGetFeatureFlag: StatementSync = secDb.prepare(`
  SELECT flag_key, enabled, updated_at, updated_by
  FROM prompt_feature_flags
  WHERE flag_key = ?
  LIMIT 1
`);

const stmtUpsertFeatureFlag: StatementSync = secDb.prepare(`
  INSERT INTO prompt_feature_flags (flag_key, enabled, updated_at, updated_by)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(flag_key) DO UPDATE SET
    enabled = excluded.enabled,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by
`);

const stmtInsertPromptAudit: StatementSync = secDb.prepare(`
  INSERT INTO prompt_access_audit_logs (
    id, access_ref_id, actor_uid, actor_email_masked, actor_role, action,
    outcome, http_status, key_version, ip_address, user_agent, reason, created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtTrimPromptAudit: StatementSync = secDb.prepare(`
  DELETE FROM prompt_access_audit_logs
  WHERE id NOT IN (
    SELECT id FROM prompt_access_audit_logs ORDER BY created_at DESC LIMIT 200
  )
`);

const stmtListPromptAudit: StatementSync = secDb.prepare(`
  SELECT id, access_ref_id, actor_uid, actor_email_masked, actor_role, action,
         outcome, http_status, key_version, ip_address, user_agent, reason, created_at
  FROM prompt_access_audit_logs
  ORDER BY created_at DESC
  LIMIT ?
`);

const stmtGetRbacAssignment: StatementSync = secDb.prepare(`
  SELECT email, role, updated_at, updated_by
  FROM rbac_role_assignments
  WHERE email = ?
  LIMIT 1
`);

const stmtUpsertRbacAssignment: StatementSync = secDb.prepare(`
  INSERT INTO rbac_role_assignments (email, role, updated_at, updated_by)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    role = excluded.role,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by
`);

const stmtListRbacAssignments: StatementSync = secDb.prepare(`
  SELECT email, role, updated_at, updated_by
  FROM rbac_role_assignments
  ORDER BY updated_at DESC
  LIMIT 50
`);

const stmtDeleteRbacAssignment: StatementSync = secDb.prepare(`
  DELETE FROM rbac_role_assignments WHERE email = ?
`);

export const promptVaultQueries = {
  insertKeyring(row: PromptKeyringRow): void {
    stmtInsertKeyring.run(
      row.key_id,
      row.key_version,
      row.wrapped_key_hex,
      row.iv_hex,
      row.tag_hex,
      row.status,
      row.created_at,
      row.rotate_after_at,
      row.rotated_at
    );
  },

  getActiveKeyring(): PromptKeyringRow | undefined {
    return stmtGetActiveKeyring.get() as unknown as PromptKeyringRow | undefined;
  },

  getKeyringById(keyId: string): PromptKeyringRow | undefined {
    return stmtGetKeyringById.get(keyId) as unknown as PromptKeyringRow | undefined;
  },

  listKeyring(): PromptKeyringRow[] {
    return stmtListKeyring.all() as unknown as PromptKeyringRow[];
  },

  markKeyRotated(keyId: string, rotatedAt: string): void {
    stmtMarkKeyRotated.run(rotatedAt, keyId);
  },

  getEncryptedPrompt(promptId: string): EncryptedPromptRow | undefined {
    return stmtGetEncryptedPrompt.get(promptId) as unknown as EncryptedPromptRow | undefined;
  },

  upsertEncryptedPrompt(row: EncryptedPromptRow): void {
    stmtUpsertEncryptedPrompt.run(
      row.prompt_id,
      row.key_id,
      row.key_version,
      row.iv_hex,
      row.tag_hex,
      row.cipher_hex,
      row.checksum_sha256,
      row.updated_at
    );
  },

  getFeatureFlag(flagKey: string): PromptFeatureFlagRow | undefined {
    return stmtGetFeatureFlag.get(flagKey) as unknown as PromptFeatureFlagRow | undefined;
  },

  upsertFeatureFlag(row: PromptFeatureFlagRow): void {
    stmtUpsertFeatureFlag.run(row.flag_key, row.enabled, row.updated_at, row.updated_by);
  },

  insertPromptAudit(row: PromptAccessAuditRow): void {
    stmtInsertPromptAudit.run(
      row.id,
      row.access_ref_id,
      row.actor_uid,
      row.actor_email_masked,
      row.actor_role,
      row.action,
      row.outcome,
      row.http_status,
      row.key_version,
      row.ip_address,
      row.user_agent,
      row.reason,
      row.created_at
    );
    stmtTrimPromptAudit.run();
  },

  listPromptAudit(maxRows = 50): PromptAccessAuditRow[] {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(maxRows)));
    return stmtListPromptAudit.all(safeLimit) as unknown as PromptAccessAuditRow[];
  },

  getRbacAssignment(email: string): RbacRoleAssignmentRow | undefined {
    return stmtGetRbacAssignment.get(email.toLowerCase()) as unknown as RbacRoleAssignmentRow | undefined;
  },

  upsertRbacAssignment(row: RbacRoleAssignmentRow): void {
    stmtUpsertRbacAssignment.run(row.email.toLowerCase(), row.role, row.updated_at, row.updated_by);
  },

  listRbacAssignments(): RbacRoleAssignmentRow[] {
    return stmtListRbacAssignments.all() as unknown as RbacRoleAssignmentRow[];
  },

  deleteRbacAssignment(email: string): void {
    stmtDeleteRbacAssignment.run(email.toLowerCase());
  },

  runTransaction<T>(fn: () => T): T {
    secDb.exec("BEGIN");
    try {
      const result = fn();
      secDb.exec("COMMIT");
      return result;
    } catch (err) {
      secDb.exec("ROLLBACK");
      throw err;
    }
  },
};

// ---------------------------------------------------------------------------
// 1C. API Performance Telemetry & Security Feature Adoption Queries
// ---------------------------------------------------------------------------
secDb.exec(`
  CREATE TABLE IF NOT EXISTS api_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_key TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms REAL NOT NULL,
    outcome TEXT NOT NULL,
    auth_mode TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_api_perf_created
    ON api_performance_metrics (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_api_perf_route_created
    ON api_performance_metrics (route_key, created_at DESC);
`);

export interface ApiPerformanceMetricRow {
  id?: number;
  route_key: string;
  method: string;
  status_code: number;
  duration_ms: number;
  outcome: "success" | "client_error" | "server_error";
  auth_mode: "cookie" | "jwt_bearer" | "anonymous";
  created_at: string;
}

const stmtInsertApiMetric: StatementSync = secDb.prepare(`
  INSERT INTO api_performance_metrics (route_key, method, status_code, duration_ms, outcome, auth_mode, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const stmtTrimApiMetrics: StatementSync = secDb.prepare(`
  DELETE FROM api_performance_metrics
  WHERE id NOT IN (
    SELECT id FROM api_performance_metrics ORDER BY id DESC LIMIT 4000
  )
`);

const stmtListApiMetricsSince: StatementSync = secDb.prepare(`
  SELECT id, route_key, method, status_code, duration_ms, outcome, auth_mode, created_at
  FROM api_performance_metrics
  WHERE created_at >= ?
  ORDER BY created_at ASC
  LIMIT ?
`);

const stmtCountDistinctAuditUids: StatementSync = secDb.prepare(`
  SELECT COUNT(DISTINCT uid) AS cnt FROM server_security_audit_logs
`);

const stmtCountPinEnabledUids: StatementSync = secDb.prepare(`
  SELECT COUNT(DISTINCT uid) AS cnt
  FROM server_security_audit_logs
  WHERE event_type IN ('pin_enabled', 'pin_verified')
`);

const stmtCountWebAuthnCreds: StatementSync = secDb.prepare(`
  SELECT COUNT(*) AS cnt FROM webauthn_credentials
`);

const stmtCountActiveRateLimits: StatementSync = secDb.prepare(`
  SELECT COUNT(*) AS cnt FROM auth_rate_limits WHERE attempts > 0 OR locked_until > ?
`);

const stmtCountBlockedSecEvents: StatementSync = secDb.prepare(`
  SELECT COUNT(*) AS cnt FROM server_security_audit_logs WHERE status = 'blocked'
`);

const stmtCountPromptAuditOutcomes: StatementSync = secDb.prepare(`
  SELECT
    SUM(CASE WHEN outcome = 'granted' THEN 1 ELSE 0 END) AS granted_cnt,
    SUM(CASE WHEN outcome = 'blocked' THEN 1 ELSE 0 END) AS blocked_cnt
  FROM prompt_access_audit_logs
`);

let apiInsertCounter = 0;

export const performanceStoreQueries = {
  insertMetric(row: Omit<ApiPerformanceMetricRow, "id">): void {
    stmtInsertApiMetric.run(
      row.route_key,
      row.method,
      row.status_code,
      row.duration_ms,
      row.outcome,
      row.auth_mode,
      row.created_at
    );
    apiInsertCounter += 1;
    if (apiInsertCounter % 50 === 0) {
      stmtTrimApiMetrics.run();
    }
  },

  listMetricsSince(sinceIso: string, maxRows = 4000): ApiPerformanceMetricRow[] {
    const safeLimit = Math.max(1, Math.min(4000, Math.floor(maxRows)));
    return stmtListApiMetricsSince.all(sinceIso, safeLimit) as unknown as ApiPerformanceMetricRow[];
  },

  getSecurityTelemetryCounts(): {
    distinctUsers: number;
    pinVerifiedUsers: number;
    webauthnCredentials: number;
    rateLimitTriggers: number;
    blockedAuthEvents: number;
    promptGrantedCount: number;
    promptBlockedCount: number;
  } {
    const u = stmtCountDistinctAuditUids.get() as { cnt?: number } | undefined;
    const p = stmtCountPinEnabledUids.get() as { cnt?: number } | undefined;
    const w = stmtCountWebAuthnCreds.get() as { cnt?: number } | undefined;
    const r = stmtCountActiveRateLimits.get(Date.now()) as { cnt?: number } | undefined;
    const b = stmtCountBlockedSecEvents.get() as { cnt?: number } | undefined;
    const pv = stmtCountPromptAuditOutcomes.get() as
      | { granted_cnt?: number; blocked_cnt?: number }
      | undefined;

    return {
      distinctUsers: Number(u?.cnt || 0),
      pinVerifiedUsers: Number(p?.cnt || 0),
      webauthnCredentials: Number(w?.cnt || 0),
      rateLimitTriggers: Number(r?.cnt || 0),
      blockedAuthEvents: Number(b?.cnt || 0),
      promptGrantedCount: Number(pv?.granted_cnt || 0),
      promptBlockedCount: Number(pv?.blocked_cnt || 0),
    };
  },
};

// ---------------------------------------------------------------------------
// 1D. Suspicious Activity Detection & Admin Security Alerts Store
// ---------------------------------------------------------------------------
secDb.exec(`
  CREATE TABLE IF NOT EXISTS admin_access_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    route_key TEXT NOT NULL,
    actor_uid TEXT NOT NULL,
    actor_email_masked TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    event_kind TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_admin_access_created
    ON admin_access_events (created_at DESC);

  CREATE TABLE IF NOT EXISTS security_alerts (
    id TEXT PRIMARY KEY,
    rule_code TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    distinct_ip_count INTEGER NOT NULL,
    attempt_count INTEGER NOT NULL,
    ips_json TEXT NOT NULL,
    routes_json TEXT NOT NULL,
    actor_summary TEXT NOT NULL,
    email_status TEXT NOT NULL,
    email_recipient TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_by TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_security_alerts_updated
    ON security_alerts (updated_at DESC);

  CREATE TABLE IF NOT EXISTS security_alert_settings (
    id TEXT PRIMARY KEY,
    dashboard_enabled INTEGER NOT NULL,
    email_enabled INTEGER NOT NULL,
    recipient_email TEXT NOT NULL,
    multi_ip_threshold INTEGER NOT NULL,
    repeated_attempts_threshold INTEGER NOT NULL,
    window_minutes INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL
  );
`);

export interface AdminAccessEventRow {
  id?: number;
  ip_address: string;
  route_key: string;
  actor_uid: string;
  actor_email_masked: string;
  status_code: number;
  event_kind: string;
  user_agent: string;
  created_at: string;
}

export interface SecurityAlertRow {
  id: string;
  rule_code: string;
  severity: "critical" | "high" | "medium";
  status: "unread" | "acknowledged" | "resolved";
  title_ar: string;
  description_ar: string;
  distinct_ip_count: number;
  attempt_count: number;
  ips_json: string;
  routes_json: string;
  actor_summary: string;
  email_status: "sent" | "dashboard_only" | "disabled" | "failed";
  email_recipient: string | null;
  created_at: string;
  updated_at: string;
  resolved_by: string | null;
}

export interface SecurityAlertSettingsRow {
  id: string;
  dashboard_enabled: number;
  email_enabled: number;
  recipient_email: string;
  multi_ip_threshold: number;
  repeated_attempts_threshold: number;
  window_minutes: number;
  updated_at: string;
  updated_by: string;
}

const stmtInsertAdminAccessEvent: StatementSync = secDb.prepare(`
  INSERT INTO admin_access_events (
    ip_address, route_key, actor_uid, actor_email_masked, status_code, event_kind, user_agent, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtTrimAdminAccessEvents: StatementSync = secDb.prepare(`
  DELETE FROM admin_access_events
  WHERE id NOT IN (
    SELECT id FROM admin_access_events ORDER BY id DESC LIMIT 3000
  )
`);

const stmtListAdminAccessEventsSince: StatementSync = secDb.prepare(`
  SELECT id, ip_address, route_key, actor_uid, actor_email_masked, status_code, event_kind, user_agent, created_at
  FROM admin_access_events
  WHERE created_at >= ?
  ORDER BY created_at DESC
  LIMIT ?
`);

const stmtInsertSecurityAlert: StatementSync = secDb.prepare(`
  INSERT INTO security_alerts (
    id, rule_code, severity, status, title_ar, description_ar,
    distinct_ip_count, attempt_count, ips_json, routes_json, actor_summary,
    email_status, email_recipient, created_at, updated_at, resolved_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtUpdateSecurityAlertCounters: StatementSync = secDb.prepare(`
  UPDATE security_alerts
  SET severity = ?,
      title_ar = ?,
      description_ar = ?,
      distinct_ip_count = ?,
      attempt_count = ?,
      ips_json = ?,
      routes_json = ?,
      actor_summary = ?,
      updated_at = ?
  WHERE id = ?
`);

const stmtUpdateSecurityAlertEmailStatus: StatementSync = secDb.prepare(`
  UPDATE security_alerts
  SET email_status = ?, email_recipient = ?, updated_at = ?
  WHERE id = ?
`);

const stmtFindActiveAlertByRuleSince: StatementSync = secDb.prepare(`
  SELECT id, rule_code, severity, status, title_ar, description_ar,
         distinct_ip_count, attempt_count, ips_json, routes_json, actor_summary,
         email_status, email_recipient, created_at, updated_at, resolved_by
  FROM security_alerts
  WHERE rule_code = ? AND status != 'resolved' AND updated_at >= ?
  ORDER BY updated_at DESC
  LIMIT 1
`);

const stmtListSecurityAlerts: StatementSync = secDb.prepare(`
  SELECT id, rule_code, severity, status, title_ar, description_ar,
         distinct_ip_count, attempt_count, ips_json, routes_json, actor_summary,
         email_status, email_recipient, created_at, updated_at, resolved_by
  FROM security_alerts
  ORDER BY updated_at DESC
  LIMIT ?
`);

const stmtGetSecurityAlertById: StatementSync = secDb.prepare(`
  SELECT id, rule_code, severity, status, title_ar, description_ar,
         distinct_ip_count, attempt_count, ips_json, routes_json, actor_summary,
         email_status, email_recipient, created_at, updated_at, resolved_by
  FROM security_alerts
  WHERE id = ?
  LIMIT 1
`);

const stmtUpdateSecurityAlertStatus: StatementSync = secDb.prepare(`
  UPDATE security_alerts
  SET status = ?, resolved_by = ?, updated_at = ?
  WHERE id = ?
`);

const stmtCountUnreadSecurityAlerts: StatementSync = secDb.prepare(`
  SELECT COUNT(*) AS cnt FROM security_alerts WHERE status = 'unread'
`);

const stmtTrimSecurityAlerts: StatementSync = secDb.prepare(`
  DELETE FROM security_alerts
  WHERE id NOT IN (
    SELECT id FROM security_alerts ORDER BY updated_at DESC LIMIT 200
  )
`);

const stmtGetSecurityAlertSettings: StatementSync = secDb.prepare(`
  SELECT id, dashboard_enabled, email_enabled, recipient_email,
         multi_ip_threshold, repeated_attempts_threshold, window_minutes, updated_at, updated_by
  FROM security_alert_settings
  WHERE id = 'default'
  LIMIT 1
`);

const stmtUpsertSecurityAlertSettings: StatementSync = secDb.prepare(`
  INSERT INTO security_alert_settings (
    id, dashboard_enabled, email_enabled, recipient_email,
    multi_ip_threshold, repeated_attempts_threshold, window_minutes, updated_at, updated_by
  ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    dashboard_enabled = excluded.dashboard_enabled,
    email_enabled = excluded.email_enabled,
    recipient_email = excluded.recipient_email,
    multi_ip_threshold = excluded.multi_ip_threshold,
    repeated_attempts_threshold = excluded.repeated_attempts_threshold,
    window_minutes = excluded.window_minutes,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by
`);

let adminEventInsertCounter = 0;

export const securityAlertQueries = {
  insertAdminAccessEvent(row: Omit<AdminAccessEventRow, "id">): void {
    stmtInsertAdminAccessEvent.run(
      row.ip_address,
      row.route_key,
      row.actor_uid,
      row.actor_email_masked,
      row.status_code,
      row.event_kind,
      row.user_agent,
      row.created_at
    );
    adminEventInsertCounter += 1;
    if (adminEventInsertCounter % 50 === 0) {
      stmtTrimAdminAccessEvents.run();
    }
  },

  listAdminAccessEventsSince(sinceIso: string, maxRows = 1000): AdminAccessEventRow[] {
    const safeLimit = Math.max(1, Math.min(2000, Math.floor(maxRows)));
    return stmtListAdminAccessEventsSince.all(sinceIso, safeLimit) as unknown as AdminAccessEventRow[];
  },

  findActiveAlertByRuleSince(ruleCode: string, sinceIso: string): SecurityAlertRow | undefined {
    return stmtFindActiveAlertByRuleSince.get(ruleCode, sinceIso) as unknown as
      | SecurityAlertRow
      | undefined;
  },

  insertSecurityAlert(row: SecurityAlertRow): void {
    stmtInsertSecurityAlert.run(
      row.id,
      row.rule_code,
      row.severity,
      row.status,
      row.title_ar,
      row.description_ar,
      row.distinct_ip_count,
      row.attempt_count,
      row.ips_json,
      row.routes_json,
      row.actor_summary,
      row.email_status,
      row.email_recipient,
      row.created_at,
      row.updated_at,
      row.resolved_by
    );
    stmtTrimSecurityAlerts.run();
  },

  updateSecurityAlertCounters(params: {
    id: string;
    severity: "critical" | "high" | "medium";
    title_ar: string;
    description_ar: string;
    distinct_ip_count: number;
    attempt_count: number;
    ips_json: string;
    routes_json: string;
    actor_summary: string;
    updated_at: string;
  }): void {
    stmtUpdateSecurityAlertCounters.run(
      params.severity,
      params.title_ar,
      params.description_ar,
      params.distinct_ip_count,
      params.attempt_count,
      params.ips_json,
      params.routes_json,
      params.actor_summary,
      params.updated_at,
      params.id
    );
  },

  updateSecurityAlertEmailStatus(
    id: string,
    emailStatus: SecurityAlertRow["email_status"],
    recipient: string | null
  ): void {
    stmtUpdateSecurityAlertEmailStatus.run(emailStatus, recipient, new Date().toISOString(), id);
  },

  listSecurityAlerts(maxRows = 50): SecurityAlertRow[] {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(maxRows)));
    return stmtListSecurityAlerts.all(safeLimit) as unknown as SecurityAlertRow[];
  },

  getSecurityAlertById(id: string): SecurityAlertRow | undefined {
    return stmtGetSecurityAlertById.get(id) as unknown as SecurityAlertRow | undefined;
  },

  updateSecurityAlertStatus(
    id: string,
    status: SecurityAlertRow["status"],
    resolvedBy: string | null
  ): void {
    stmtUpdateSecurityAlertStatus.run(status, resolvedBy, new Date().toISOString(), id);
  },

  countUnreadSecurityAlerts(): number {
    const row = stmtCountUnreadSecurityAlerts.get() as { cnt?: number } | undefined;
    return Number(row?.cnt || 0);
  },

  getAlertSettings(): SecurityAlertSettingsRow | undefined {
    return stmtGetSecurityAlertSettings.get() as unknown as SecurityAlertSettingsRow | undefined;
  },

  upsertAlertSettings(row: Omit<SecurityAlertSettingsRow, "id">): void {
    stmtUpsertSecurityAlertSettings.run(
      row.dashboard_enabled,
      row.email_enabled,
      row.recipient_email,
      row.multi_ip_threshold,
      row.repeated_attempts_threshold,
      row.window_minutes,
      row.updated_at,
      row.updated_by
    );
  },
};

// ---------------------------------------------------------------------------
// 1E. Store Behavior & Google Analytics First-Party Telemetry Store
// ---------------------------------------------------------------------------
secDb.exec(`
  CREATE TABLE IF NOT EXISTS store_behavior_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    page_path TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    search_term TEXT NOT NULL,
    value_sar REAL NOT NULL,
    hour_of_day INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    device_type TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_behavior_created
    ON store_behavior_events (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_behavior_type_prod
    ON store_behavior_events (event_type, product_id);
`);

export interface StoreBehaviorEventRow {
  id?: number;
  session_id: string;
  event_type: string;
  page_path: string;
  product_id: string;
  product_name: string;
  category: string;
  search_term: string;
  value_sar: number;
  hour_of_day: number;
  day_of_week: number;
  device_type: "mobile" | "desktop" | "tablet";
  created_at: string;
}

const stmtCountBehaviorEvents: StatementSync = secDb.prepare(`
  SELECT COUNT(*) AS cnt FROM store_behavior_events
`);

const stmtInsertBehaviorEvent: StatementSync = secDb.prepare(`
  INSERT INTO store_behavior_events (
    session_id, event_type, page_path, product_id, product_name,
    category, search_term, value_sar, hour_of_day, day_of_week, device_type, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtTrimBehaviorEvents: StatementSync = secDb.prepare(`
  DELETE FROM store_behavior_events
  WHERE id NOT IN (
    SELECT id FROM store_behavior_events ORDER BY id DESC LIMIT 5000
  )
`);

const stmtListBehaviorEventsSince: StatementSync = secDb.prepare(`
  SELECT id, session_id, event_type, page_path, product_id, product_name,
         category, search_term, value_sar, hour_of_day, day_of_week, device_type, created_at
  FROM store_behavior_events
  WHERE created_at >= ?
  ORDER BY created_at DESC
  LIMIT ?
`);

let behaviorInsertCounter = 0;

export const behaviorAnalyticsQueries = {
  countEvents(): number {
    const row = stmtCountBehaviorEvents.get() as { cnt?: number } | undefined;
    return Number(row?.cnt || 0);
  },

  insertEvent(row: Omit<StoreBehaviorEventRow, "id">): void {
    stmtInsertBehaviorEvent.run(
      row.session_id,
      row.event_type,
      row.page_path,
      row.product_id,
      row.product_name,
      row.category,
      row.search_term,
      row.value_sar,
      row.hour_of_day,
      row.day_of_week,
      row.device_type,
      row.created_at
    );
    behaviorInsertCounter += 1;
    if (behaviorInsertCounter % 100 === 0) {
      stmtTrimBehaviorEvents.run();
    }
  },

  insertBatch(rows: Array<Omit<StoreBehaviorEventRow, "id">>): void {
    secDb.exec("BEGIN");
    try {
      for (const row of rows) {
        stmtInsertBehaviorEvent.run(
          row.session_id,
          row.event_type,
          row.page_path,
          row.product_id,
          row.product_name,
          row.category,
          row.search_term,
          row.value_sar,
          row.hour_of_day,
          row.day_of_week,
          row.device_type,
          row.created_at
        );
      }
      secDb.exec("COMMIT");
    } catch (err) {
      secDb.exec("ROLLBACK");
      throw err;
    }
  },

  listEventsSince(sinceIso: string, maxRows = 5000): StoreBehaviorEventRow[] {
    const safeLimit = Math.max(1, Math.min(5000, Math.floor(maxRows)));
    return stmtListBehaviorEventsSince.all(sinceIso, safeLimit) as unknown as StoreBehaviorEventRow[];
  },
};

// ---------------------------------------------------------------------------
// 1F. Admin Modification Audit Logs Store (Prices, Stock, Permissions)
// ---------------------------------------------------------------------------
secDb.exec(`
  CREATE TABLE IF NOT EXISTS admin_modification_logs (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    action_label_ar TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    field_label_ar TEXT NOT NULL,
    previous_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    summary_ar TEXT NOT NULL,
    actor_uid TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_email_masked TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_admin_mod_created
    ON admin_modification_logs (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_admin_mod_category
    ON admin_modification_logs (category, created_at DESC);
`);

export interface AdminModificationLogRow {
  id: string;
  category: string;
  action_label_ar: string;
  target_type: string;
  target_id: string;
  target_name: string;
  field_label_ar: string;
  previous_value: string;
  new_value: string;
  summary_ar: string;
  actor_uid: string;
  actor_name: string;
  actor_email_masked: string;
  actor_role: string;
  ip_address: string;
  created_at: string;
}

const stmtCountAdminMods: StatementSync = secDb.prepare(`
  SELECT COUNT(*) AS cnt FROM admin_modification_logs
`);

const stmtInsertAdminMod: StatementSync = secDb.prepare(`
  INSERT INTO admin_modification_logs (
    id, category, action_label_ar, target_type, target_id, target_name,
    field_label_ar, previous_value, new_value, summary_ar,
    actor_uid, actor_name, actor_email_masked, actor_role, ip_address, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtTrimAdminMods: StatementSync = secDb.prepare(`
  DELETE FROM admin_modification_logs
  WHERE id NOT IN (
    SELECT id FROM admin_modification_logs ORDER BY created_at DESC LIMIT 1000
  )
`);

const stmtListAdminMods: StatementSync = secDb.prepare(`
  SELECT id, category, action_label_ar, target_type, target_id, target_name,
         field_label_ar, previous_value, new_value, summary_ar,
         actor_uid, actor_name, actor_email_masked, actor_role, ip_address, created_at
  FROM admin_modification_logs
  ORDER BY created_at DESC
  LIMIT ?
`);

let adminModInsertCounter = 0;

export const adminModificationQueries = {
  countModifications(): number {
    const row = stmtCountAdminMods.get() as { cnt?: number } | undefined;
    return Number(row?.cnt || 0);
  },

  insertModification(row: AdminModificationLogRow): void {
    stmtInsertAdminMod.run(
      row.id,
      row.category,
      row.action_label_ar,
      row.target_type,
      row.target_id,
      row.target_name,
      row.field_label_ar,
      row.previous_value,
      row.new_value,
      row.summary_ar,
      row.actor_uid,
      row.actor_name,
      row.actor_email_masked,
      row.actor_role,
      row.ip_address,
      row.created_at
    );
    adminModInsertCounter += 1;
    if (adminModInsertCounter % 50 === 0) {
      stmtTrimAdminMods.run();
    }
  },

  insertBatch(rows: AdminModificationLogRow[]): void {
    secDb.exec("BEGIN");
    try {
      for (const row of rows) {
        stmtInsertAdminMod.run(
          row.id,
          row.category,
          row.action_label_ar,
          row.target_type,
          row.target_id,
          row.target_name,
          row.field_label_ar,
          row.previous_value,
          row.new_value,
          row.summary_ar,
          row.actor_uid,
          row.actor_name,
          row.actor_email_masked,
          row.actor_role,
          row.ip_address,
          row.created_at
        );
      }
      secDb.exec("COMMIT");
    } catch (err) {
      secDb.exec("ROLLBACK");
      throw err;
    }
  },

  listModifications(maxRows = 500): AdminModificationLogRow[] {
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(maxRows)));
    return stmtListAdminMods.all(safeLimit) as unknown as AdminModificationLogRow[];
  },
};

secDb.exec(`
  CREATE TABLE IF NOT EXISTS merchant_brand_ratings (
    id TEXT PRIMARY KEY,
    brand_slug TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    prep_speed_rating INTEGER NOT NULL,
    packaging_quality_rating INTEGER NOT NULL,
    overall_rating REAL NOT NULL,
    comment TEXT NOT NULL,
    order_number TEXT NOT NULL,
    verified_order INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_merchant_ratings_brand
    ON merchant_brand_ratings (brand_slug, created_at DESC);
`);

export interface MerchantRatingRow {
  id: string;
  brand_slug: string;
  brand_name: string;
  reviewer_name: string;
  prep_speed_rating: number;
  packaging_quality_rating: number;
  overall_rating: number;
  comment: string;
  order_number: string;
  verified_order: number;
  created_at: string;
}

const stmtCountMerchantRatings: StatementSync = secDb.prepare(`
  SELECT COUNT(*) AS cnt FROM merchant_brand_ratings
`);

const stmtInsertMerchantRating: StatementSync = secDb.prepare(`
  INSERT INTO merchant_brand_ratings (
    id, brand_slug, brand_name, reviewer_name,
    prep_speed_rating, packaging_quality_rating, overall_rating,
    comment, order_number, verified_order, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtListAllMerchantRatings: StatementSync = secDb.prepare(`
  SELECT id, brand_slug, brand_name, reviewer_name,
         prep_speed_rating, packaging_quality_rating, overall_rating,
         comment, order_number, verified_order, created_at
  FROM merchant_brand_ratings
  ORDER BY created_at DESC
  LIMIT ?
`);

const stmtListMerchantRatingsByBrand: StatementSync = secDb.prepare(`
  SELECT id, brand_slug, brand_name, reviewer_name,
         prep_speed_rating, packaging_quality_rating, overall_rating,
         comment, order_number, verified_order, created_at
  FROM merchant_brand_ratings
  WHERE brand_slug = ?
  ORDER BY created_at DESC
  LIMIT ?
`);

export const merchantRatingQueries = {
  countRatings(): number {
    const row = stmtCountMerchantRatings.get() as { cnt?: number } | undefined;
    return Number(row?.cnt || 0);
  },

  insertRating(row: MerchantRatingRow): void {
    stmtInsertMerchantRating.run(
      row.id,
      row.brand_slug,
      row.brand_name,
      row.reviewer_name,
      row.prep_speed_rating,
      row.packaging_quality_rating,
      row.overall_rating,
      row.comment,
      row.order_number,
      row.verified_order,
      row.created_at
    );
  },

  insertBatch(rows: MerchantRatingRow[]): void {
    secDb.exec("BEGIN");
    try {
      for (const row of rows) {
        stmtInsertMerchantRating.run(
          row.id,
          row.brand_slug,
          row.brand_name,
          row.reviewer_name,
          row.prep_speed_rating,
          row.packaging_quality_rating,
          row.overall_rating,
          row.comment,
          row.order_number,
          row.verified_order,
          row.created_at
        );
      }
      secDb.exec("COMMIT");
    } catch (err) {
      secDb.exec("ROLLBACK");
      throw err;
    }
  },

  listAllRatings(maxRows = 500): MerchantRatingRow[] {
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(maxRows)));
    return stmtListAllMerchantRatings.all(safeLimit) as unknown as MerchantRatingRow[];
  },

  listRatingsByBrand(brandSlug: string, maxRows = 100): MerchantRatingRow[] {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(maxRows)));
    return stmtListMerchantRatingsByBrand.all(brandSlug, safeLimit) as unknown as MerchantRatingRow[];
  },
};

// ---------------------------------------------------------------------------
// 7. Automatic Target Price Drop Alerts Store
// ---------------------------------------------------------------------------
secDb.exec(`
  CREATE TABLE IF NOT EXISTS price_drop_alerts (
    id TEXT PRIMARY KEY,
    client_key TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_image TEXT NOT NULL,
    subscribed_price REAL NOT NULL,
    target_price REAL,
    last_triggered_price REAL,
    triggered_at TEXT,
    trigger_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    UNIQUE(client_key, product_id)
  );
  CREATE INDEX IF NOT EXISTS idx_price_drop_alerts_client
    ON price_drop_alerts (client_key, created_at DESC);
`);

export interface PriceDropAlertRow {
  id: string;
  client_key: string;
  product_id: string;
  product_name: string;
  product_image: string;
  subscribed_price: number;
  target_price: number | null;
  last_triggered_price: number | null;
  triggered_at: string | null;
  trigger_count: number;
  is_active: number;
  created_at: string;
}

const stmtUpsertPriceAlert: StatementSync = secDb.prepare(`
  INSERT INTO price_drop_alerts (
    id, client_key, product_id, product_name, product_image,
    subscribed_price, target_price, last_triggered_price,
    triggered_at, trigger_count, is_active, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(client_key, product_id) DO UPDATE SET
    product_name = excluded.product_name,
    product_image = excluded.product_image,
    subscribed_price = excluded.subscribed_price,
    target_price = excluded.target_price,
    last_triggered_price = excluded.last_triggered_price,
    triggered_at = excluded.triggered_at,
    trigger_count = excluded.trigger_count,
    is_active = excluded.is_active
`);

const stmtListPriceAlertsByClient: StatementSync = secDb.prepare(`
  SELECT id, client_key, product_id, product_name, product_image,
         subscribed_price, target_price, last_triggered_price,
         triggered_at, trigger_count, is_active, created_at
  FROM price_drop_alerts
  WHERE client_key = ?
  ORDER BY created_at DESC
  LIMIT ?
`);

const stmtDeletePriceAlert: StatementSync = secDb.prepare(`
  DELETE FROM price_drop_alerts
  WHERE client_key = ? AND product_id = ?
`);

export const priceDropAlertQueries = {
  upsertAlert(row: PriceDropAlertRow): void {
    stmtUpsertPriceAlert.run(
      row.id,
      row.client_key,
      row.product_id,
      row.product_name,
      row.product_image,
      row.subscribed_price,
      row.target_price,
      row.last_triggered_price,
      row.triggered_at,
      row.trigger_count,
      row.is_active,
      row.created_at
    );
  },

  listByClient(clientKey: string, maxRows = 100): PriceDropAlertRow[] {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(maxRows)));
    return stmtListPriceAlertsByClient.all(clientKey, safeLimit) as unknown as PriceDropAlertRow[];
  },

  deleteByClientAndProduct(clientKey: string, productId: string): number {
    const info = stmtDeletePriceAlert.run(clientKey, productId);
    return Number(info?.changes || 0);
  },
};

// ---------------------------------------------------------------------------
// 2. White-Label Multi-Tenant Store (Tenants, Encrypted Blobs, Snapshots, Logs)
// ---------------------------------------------------------------------------
const wlDb = openSafeSqlite(WHITELABEL_DB_FILE);

wlDb.exec(`
  CREATE TABLE IF NOT EXISTS wl_tenants (
    id TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wl_blobs (
    asset_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    iv_hex TEXT NOT NULL,
    tag_hex TEXT NOT NULL,
    cipher_hex TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    etag TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_wl_blobs_tenant ON wl_blobs (tenant_id);

  CREATE TABLE IF NOT EXISTS wl_snapshots (
    backup_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    meta_json TEXT NOT NULL,
    tenant_snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_wl_snapshots_tenant ON wl_snapshots (tenant_id);

  CREATE TABLE IF NOT EXISTS wl_audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    level TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    details TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    timestamp TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_wl_logs_ts ON wl_audit_logs (timestamp DESC);

  CREATE TABLE IF NOT EXISTS wl_metrics (
    metric_key TEXT PRIMARY KEY,
    metric_value INTEGER NOT NULL
  );
`);

export interface WlBlobRow {
  asset_id: string;
  tenant_id: string;
  iv_hex: string;
  tag_hex: string;
  cipher_hex: string;
  mime_type: string;
  etag: string;
}

export interface WlSnapshotRow {
  backup_id: string;
  tenant_id: string;
  meta_json: string;
  tenant_snapshot_json: string;
  created_at: string;
}

export interface WlAuditLogRow {
  id: string;
  tenant_id: string;
  level: string;
  action: string;
  actor_role: string;
  details: string;
  status_code: number;
  timestamp: string;
}

const stmtCountTenants: StatementSync = wlDb.prepare(`
  SELECT COUNT(*) AS cnt FROM wl_tenants
`);

const stmtListTenants: StatementSync = wlDb.prepare(`
  SELECT id, data_json, updated_at FROM wl_tenants ORDER BY updated_at ASC
`);

const stmtGetTenantById: StatementSync = wlDb.prepare(`
  SELECT id, data_json, updated_at FROM wl_tenants WHERE id = ? LIMIT 1
`);

const stmtUpsertTenant: StatementSync = wlDb.prepare(`
  INSERT INTO wl_tenants (id, data_json, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    data_json = excluded.data_json,
    updated_at = excluded.updated_at
`);

const stmtUpsertBlob: StatementSync = wlDb.prepare(`
  INSERT INTO wl_blobs (asset_id, tenant_id, iv_hex, tag_hex, cipher_hex, mime_type, etag)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(asset_id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    iv_hex = excluded.iv_hex,
    tag_hex = excluded.tag_hex,
    cipher_hex = excluded.cipher_hex,
    mime_type = excluded.mime_type,
    etag = excluded.etag
`);

const stmtGetBlobByTenantAndAsset: StatementSync = wlDb.prepare(`
  SELECT asset_id, tenant_id, iv_hex, tag_hex, cipher_hex, mime_type, etag
  FROM wl_blobs
  WHERE asset_id = ? AND tenant_id = ?
  LIMIT 1
`);

const stmtInsertSnapshot: StatementSync = wlDb.prepare(`
  INSERT INTO wl_snapshots (backup_id, tenant_id, meta_json, tenant_snapshot_json, created_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(backup_id) DO UPDATE SET
    tenant_id = excluded.tenant_id,
    meta_json = excluded.meta_json,
    tenant_snapshot_json = excluded.tenant_snapshot_json,
    created_at = excluded.created_at
`);

const stmtGetSnapshotByTenantAndId: StatementSync = wlDb.prepare(`
  SELECT backup_id, tenant_id, meta_json, tenant_snapshot_json, created_at
  FROM wl_snapshots
  WHERE backup_id = ? AND tenant_id = ?
  LIMIT 1
`);

const stmtInsertWlLog: StatementSync = wlDb.prepare(`
  INSERT INTO wl_audit_logs (id, tenant_id, level, action, actor_role, details, status_code, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtTrimWlLogs: StatementSync = wlDb.prepare(`
  DELETE FROM wl_audit_logs
  WHERE id NOT IN (
    SELECT id FROM wl_audit_logs ORDER BY timestamp DESC LIMIT 80
  )
`);

const stmtListWlLogs: StatementSync = wlDb.prepare(`
  SELECT id, tenant_id, level, action, actor_role, details, status_code, timestamp
  FROM wl_audit_logs
  ORDER BY timestamp DESC
  LIMIT ?
`);

const stmtInitMetric: StatementSync = wlDb.prepare(`
  INSERT OR IGNORE INTO wl_metrics (metric_key, metric_value) VALUES (?, ?)
`);

const stmtIncrementMetric: StatementSync = wlDb.prepare(`
  INSERT INTO wl_metrics (metric_key, metric_value) VALUES (?, ?)
  ON CONFLICT(metric_key) DO UPDATE SET metric_value = metric_value + excluded.metric_value
`);

const stmtGetMetric: StatementSync = wlDb.prepare(`
  SELECT metric_value FROM wl_metrics WHERE metric_key = ? LIMIT 1
`);

const stmtClearAllWlBlobs: StatementSync = wlDb.prepare(`DELETE FROM wl_blobs`);
const stmtClearAllWlSnapshots: StatementSync = wlDb.prepare(`DELETE FROM wl_snapshots`);
const stmtClearAllWlTenants: StatementSync = wlDb.prepare(`DELETE FROM wl_tenants`);
const stmtClearAllWlLogs: StatementSync = wlDb.prepare(`DELETE FROM wl_audit_logs`);
const stmtClearAllWlMetrics: StatementSync = wlDb.prepare(`DELETE FROM wl_metrics`);

export const whiteLabelSqlQueries = {
  countTenants(): number {
    const row = stmtCountTenants.get() as { cnt?: number } | undefined;
    return Number(row?.cnt || 0);
  },

  listTenantsJson(): string[] {
    const rows = stmtListTenants.all() as unknown as Array<{ data_json: string }>;
    return rows.map((r) => r.data_json);
  },

  getTenantJsonById(tenantId: string): string | null {
    const row = stmtGetTenantById.get(tenantId) as { data_json?: string } | undefined;
    return typeof row?.data_json === "string" ? row.data_json : null;
  },

  upsertTenantJson(tenantId: string, dataJson: string, updatedAt: string): void {
    stmtUpsertTenant.run(tenantId, dataJson, updatedAt);
  },

  upsertBlob(row: WlBlobRow): void {
    stmtUpsertBlob.run(
      row.asset_id,
      row.tenant_id,
      row.iv_hex,
      row.tag_hex,
      row.cipher_hex,
      row.mime_type,
      row.etag
    );
  },

  getBlobForTenant(tenantId: string, assetId: string): WlBlobRow | undefined {
    return stmtGetBlobByTenantAndAsset.get(assetId, tenantId) as unknown as WlBlobRow | undefined;
  },

  insertSnapshot(row: WlSnapshotRow): void {
    stmtInsertSnapshot.run(
      row.backup_id,
      row.tenant_id,
      row.meta_json,
      row.tenant_snapshot_json,
      row.created_at
    );
  },

  getSnapshotForTenant(tenantId: string, backupId: string): WlSnapshotRow | undefined {
    return stmtGetSnapshotByTenantAndId.get(backupId, tenantId) as unknown as WlSnapshotRow | undefined;
  },

  insertLog(row: WlAuditLogRow): void {
    stmtInsertWlLog.run(
      row.id,
      row.tenant_id,
      row.level,
      row.action,
      row.actor_role,
      row.details,
      row.status_code,
      row.timestamp
    );
    stmtTrimWlLogs.run();
  },

  listLogs(maxRows = 80): WlAuditLogRow[] {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(maxRows)));
    return stmtListWlLogs.all(safeLimit) as unknown as WlAuditLogRow[];
  },

  initMetric(key: string, initialValue: number): void {
    stmtInitMetric.run(key, initialValue);
  },

  incrementMetric(key: string, delta = 1): void {
    stmtIncrementMetric.run(key, delta);
  },

  getMetric(key: string): number {
    const row = stmtGetMetric.get(key) as { metric_value?: number } | undefined;
    return Number(row?.metric_value || 0);
  },

  resetAll(): void {
    wlDb.exec("BEGIN");
    try {
      stmtClearAllWlBlobs.run();
      stmtClearAllWlSnapshots.run();
      stmtClearAllWlTenants.run();
      stmtClearAllWlLogs.run();
      stmtClearAllWlMetrics.run();
      wlDb.exec("COMMIT");
    } catch (err) {
      wlDb.exec("ROLLBACK");
      throw err;
    }
  },
};
