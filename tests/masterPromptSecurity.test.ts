import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-prompt-sec-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-wl-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-master-prompt-rbac-verification-0123456789";
process.env.PROMPT_KMS_KEY = "test-kms-key-envelope-wrapping-0123456789abcdef";

const { promptVaultQueries } = await import("../server/sqliteStore.js");
const promptVault = await import("../server/promptVault.js");
const serverMod = await import("../server.js");

let httpServer: Server;
let baseUrl = "";

function makeJwtForRole(
  role: "promoter_admin" | "user_admin" | "customer",
  email: string,
  uid: string
): string {
  return serverMod.issueServerJwtToken({
    sid: `sid-${uid}-${Date.now()}`,
    uid,
    email,
    displayName: `Test ${role}`,
    role,
    originalRole: role,
    pinEnabled: false,
    pinVerified: true,
    webauthnVerified: false,
    exp: Date.now() + 60 * 60 * 1000,
  });
}

describe("Master Engineering Prompt Vault, RBAC & Audit Integration", () => {
  before(async () => {
    promptVault.ensurePromptVaultInitialized();
    await new Promise<void>((resolve) => {
      httpServer = serverMod.app.listen(0, "127.0.0.1", () => {
        const addr = httpServer.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    for (const file of [
      TEST_DB_PATH,
      `${TEST_DB_PATH}-wal`,
      `${TEST_DB_PATH}-shm`,
      TEST_WHITELABEL_DB_PATH,
      `${TEST_WHITELABEL_DB_PATH}-wal`,
      `${TEST_WHITELABEL_DB_PATH}-shm`,
    ]) {
      if (fs.existsSync(file)) {
        fs.rmSync(file, { force: true });
      }
    }
  });

  it("stores encrypted ciphertext in SQLite (no plaintext prompt at rest)", () => {
    const encryptedRow = promptVaultQueries.getEncryptedPrompt("rawaj_master_engineering_prompt_v1");
    assert.ok(encryptedRow, "Encrypted prompt row must exist");
    assert.equal(encryptedRow.key_version, 1);
    assert.ok(/^[0-9a-f]+$/i.test(encryptedRow.cipher_hex), "Ciphertext must be hex-encoded");
    assert.ok(!encryptedRow.cipher_hex.includes("Master Prompt"));

    const dbBytes = fs.readFileSync(TEST_DB_PATH);
    assert.equal(
      dbBytes.includes(Buffer.from("البرومبت المعتمد لبناء وتصميم متجر إلكتروني")),
      false,
      "SQLite database file must not contain plaintext prompt"
    );
  });

  it("blocks unauthenticated requests with 401 and logs accessRefId without leaking prompt", async () => {
    const res = await fetch(`${baseUrl}/api/admin/master-prompt`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, "PROMOTER_AUTH_REQUIRED");
    assert.ok(typeof body.accessRefId === "string" && body.accessRefId.startsWith("prm-acc-"));
    assert.equal(body.prompt, undefined);
  });

  it("rejects tampered JWT tokens with 401", async () => {
    const validJwt = makeJwtForRole("promoter_admin", "telrawaj@gmail.com", "uid-promoter");
    const tampered = `${validJwt.slice(0, -4)}zzzz`;
    const res = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Authorization: `Bearer ${tampered}` },
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.prompt, undefined);
  });

  it("returns 403 PROMOTER_ADMIN_REQUIRED for customer and user_admin across all prompt & key endpoints", async () => {
    const customerJwt = makeJwtForRole("customer", "buyer@example.com", "uid-cust-1");
    const userAdminJwt = makeJwtForRole("user_admin", "store.manager@example.com", "uid-user-admin-1");

    const custPromptRes = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Authorization: `Bearer ${customerJwt}` },
    });
    assert.equal(custPromptRes.status, 403);
    const custBody = await custPromptRes.json();
    assert.equal(custBody.code, "PROMOTER_ADMIN_REQUIRED");
    assert.equal(custBody.prompt, undefined);

    const protectedCalls: Array<{ method: string; path: string; body?: unknown }> = [
      { method: "GET", path: "/api/admin/master-prompt" },
      { method: "GET", path: "/api/admin/master-prompt/audit" },
      { method: "PATCH", path: "/api/admin/master-prompt/feature", body: { enabled: false } },
      { method: "POST", path: "/api/admin/master-prompt/rotate-key" },
      { method: "POST", path: "/api/admin/master-prompt/backup" },
      { method: "POST", path: "/api/admin/roles/switch-preview", body: { targetRole: "promoter_admin" } },
      { method: "GET", path: "/api/admin/roles/assignments" },
      {
        method: "POST",
        path: "/api/admin/roles/assign",
        body: { email: "store.manager@example.com", role: "promoter_admin" },
      },
    ];

    for (const call of protectedCalls) {
      const r = await fetch(`${baseUrl}${call.path}`, {
        method: call.method,
        headers: {
          Authorization: `Bearer ${userAdminJwt}`,
          ...(call.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(call.body ? { body: JSON.stringify(call.body) } : {}),
      });
      assert.equal(
        r.status,
        403,
        `Expected 403 for user_admin calling ${call.method} ${call.path}, got ${r.status}`
      );
      const data = await r.json();
      assert.equal(data.code, "PROMOTER_ADMIN_REQUIRED");
      assert.equal(data.prompt, undefined);
    }
  });

  it("enforces server-driven UI capabilities per role", async () => {
    const anonCap = await fetch(`${baseUrl}/api/admin/capabilities`).then((r) => r.json());
    assert.equal(anonCap.canAccessMasterPrompt, false);
    assert.equal(anonCap.isAdmin, false);

    const userAdminJwt = makeJwtForRole("user_admin", "store.manager@example.com", "uid-ua-cap");
    const uaCap = await fetch(`${baseUrl}/api/admin/capabilities`, {
      headers: { Authorization: `Bearer ${userAdminJwt}` },
    }).then((r) => r.json());
    assert.equal(uaCap.role, "user_admin");
    assert.equal(uaCap.isAdmin, true);
    assert.equal(uaCap.isPromoterAdmin, false);
    assert.equal(uaCap.canAccessMasterPrompt, false);

    const promoterJwt = makeJwtForRole("promoter_admin", "telrawaj@gmail.com", "uid-pa-cap");
    const paCap = await fetch(`${baseUrl}/api/admin/capabilities`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    }).then((r) => r.json());
    assert.equal(paCap.role, "promoter_admin");
    assert.equal(paCap.isAdmin, true);
    assert.equal(paCap.isPromoterAdmin, true);
    assert.equal(paCap.canAccessMasterPrompt, true);
  });

  it("allows promoter_admin to read decrypted prompt with no-store headers and audits accessRefId", async () => {
    const promoterJwt = makeJwtForRole("promoter_admin", "telrawaj@gmail.com", "uid-pa-read");
    const res = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control") || "", /no-store/);
    const body = await res.json();
    assert.ok(typeof body.prompt === "string" && body.prompt.includes("البرومبت المعتمد"));
    assert.equal(body.metadata.keyVersion, 1);
    assert.ok(typeof body.metadata.checksumSha256 === "string" && body.metadata.checksumSha256.length === 64);
    assert.ok(body.metadata.accessRefId.startsWith("prm-acc-"));
  });

  it("supports feature flag toggle (returns 403 FEATURE_DISABLED when off, 200 when re-enabled)", async () => {
    const promoterJwt = makeJwtForRole("promoter_admin", "telrawaj@gmail.com", "uid-pa-flag");

    const disableRes = await fetch(`${baseUrl}/api/admin/master-prompt/feature`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(disableRes.status, 200);

    const capDisabled = await fetch(`${baseUrl}/api/admin/capabilities`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    }).then((r) => r.json());
    assert.equal(capDisabled.featureEnabled, false);
    assert.equal(capDisabled.canAccessMasterPrompt, false);

    const blockedRead = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(blockedRead.status, 403);
    const blockedBody = await blockedRead.json();
    assert.equal(blockedBody.code, "FEATURE_DISABLED");
    assert.equal(blockedBody.prompt, undefined);

    const enableRes = await fetch(`${baseUrl}/api/admin/master-prompt/feature`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: true }),
    });
    assert.equal(enableRes.status, 200);

    const restoredRead = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(restoredRead.status, 200);
  });

  it("rotates DEK version cleanly and preserves prompt integrity + checksum", async () => {
    const promoterJwt = makeJwtForRole("promoter_admin", "telrawaj@gmail.com", "uid-pa-rot");
    const beforeRead = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    }).then((r) => r.json());

    const rotRes = await fetch(`${baseUrl}/api/admin/master-prompt/rotate-key`, {
      method: "POST",
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(rotRes.status, 200);
    const rotBody = await rotRes.json();
    assert.equal(rotBody.metadata.keyVersion, beforeRead.metadata.keyVersion + 1);

    const afterRead = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    }).then((r) => r.json());
    assert.equal(afterRead.prompt, beforeRead.prompt);
    assert.equal(afterRead.metadata.checksumSha256, beforeRead.metadata.checksumSha256);
    assert.equal(afterRead.metadata.keyVersion, rotBody.metadata.keyVersion);
  });

  it("exports signed encrypted backup, rejects tampered backup, and restores valid backup", async () => {
    const promoterJwt = makeJwtForRole("promoter_admin", "telrawaj@gmail.com", "uid-pa-bkp");

    const backupRes = await fetch(`${baseUrl}/api/admin/master-prompt/backup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(backupRes.status, 200);
    const { backup } = await backupRes.json();
    assert.equal(backup.backupVersion, "1.0");
    assert.ok(backup.envelopeSignatureSha256);
    assert.ok(backup.plaintextChecksumSha256);

    const tamperedBackup = { ...backup, cipherHex: `ff${backup.cipherHex.slice(2)}` };
    const badRestore = await fetch(`${baseUrl}/api/admin/master-prompt/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ backup: tamperedBackup }),
    });
    assert.equal(badRestore.status, 400);

    const goodRestore = await fetch(`${baseUrl}/api/admin/master-prompt/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ backup }),
    });
    assert.equal(goodRestore.status, 200);
    const restoreBody = await goodRestore.json();
    assert.equal(restoreBody.metadata.checksumSha256, backup.plaintextChecksumSha256);
  });

  it("downgrades promoter_admin cookie session during user_admin preview and enforces 403 until restored", async () => {
    const promoterJwt = makeJwtForRole("promoter_admin", "telrawaj@gmail.com", "uid-pa-prev");

    const switchDown = await fetch(`${baseUrl}/api/admin/roles/switch-preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetRole: "user_admin" }),
    });
    assert.equal(switchDown.status, 200);
    const setCookieHeader = switchDown.headers.get("set-cookie");
    assert.ok(setCookieHeader && setCookieHeader.includes("rawaj_session="));
    const cookiePair = setCookieHeader.split(";")[0];

    const previewRead = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(previewRead.status, 403);

    const previewCap = await fetch(`${baseUrl}/api/admin/capabilities`, {
      headers: { Cookie: cookiePair },
    }).then((r) => r.json());
    assert.equal(previewCap.role, "user_admin");
    assert.equal(previewCap.originalRole, "promoter_admin");
    assert.equal(previewCap.canAccessMasterPrompt, false);

    const switchBack = await fetch(`${baseUrl}/api/admin/roles/switch-preview`, {
      method: "POST",
      headers: {
        Cookie: cookiePair,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetRole: "promoter_admin" }),
    });
    assert.equal(switchBack.status, 200);
    const restoredCookie = (switchBack.headers.get("set-cookie") || "").split(";")[0];

    const restoredRead = await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { Cookie: restoredCookie },
    });
    assert.equal(restoredRead.status, 200);
  });

  it("enforces RBAC role assignment rules and confirms audit logs never store raw prompt text", async () => {
    const promoterJwt = makeJwtForRole("promoter_admin", "telrawaj@gmail.com", "uid-pa-rbac");

    // Cannot downgrade bootstrapped promoter admin
    const downgradeBoot = await fetch(`${baseUrl}/api/admin/roles/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "telrawaj@gmail.com", role: "user_admin" }),
    });
    assert.equal(downgradeBoot.status, 400);

    // Assign user_admin to merchant operator
    const assignRes = await fetch(`${baseUrl}/api/admin/roles/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "merchant.ops@rawaj.store", role: "user_admin" }),
    });
    assert.equal(assignRes.status, 200);
    assert.equal(serverMod.resolveRbacRole("merchant.ops@rawaj.store"), "user_admin");
    assert.equal(serverMod.resolveRbacRole("telrawaj@gmail.com"), "promoter_admin");
    assert.equal(serverMod.resolveRbacRole("random.buyer@gmail.com"), "customer");

    // Audit log check: zero plaintext prompt anywhere
    const auditRes = await fetch(`${baseUrl}/api/admin/master-prompt/audit?limit=100`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.ok(Array.isArray(auditBody.entries) && auditBody.entries.length >= 8);

    const serializedAudit = JSON.stringify(auditBody.entries);
    assert.equal(serializedAudit.includes("البرومبت المعتمد"), false);
    assert.equal(serializedAudit.includes("Master Prompt for E-Commerce App"), false);
    assert.equal(
      auditBody.entries.some((l: any) => l.actorRole === "user_admin" && l.outcome === "blocked"),
      true
    );
    assert.equal(
      auditBody.entries.some((l: any) => l.actorRole === "promoter_admin" && l.outcome === "granted"),
      true
    );

    const pathBasedTestCheck = path.basename(TEST_DB_PATH);
    assert.ok(pathBasedTestCheck.endsWith(".sqlite"));
  });
});
