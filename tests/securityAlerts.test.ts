import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-sec-alerts-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-sec-alerts-wl-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-security-alerts-verification-01234567";
process.env.PROMPT_KMS_KEY = "test-kms-key-security-alerts-verification-0123456789abcdef";

const serverMod = await import("../server.js");

let httpServer: Server;
let baseUrl = "";

function makeJwt(role: "promoter_admin" | "user_admin" | "customer", email: string, uid: string): string {
  return serverMod.issueServerJwtToken({
    sid: `sid-alert-${uid}-${Date.now()}`,
    uid,
    email,
    displayName: `Alert ${role}`,
    role,
    originalRole: role,
    pinEnabled: false,
    pinVerified: true,
    webauthnVerified: false,
    exp: Date.now() + 60 * 60 * 1000,
  });
}

describe("Suspicious Activity Detection & Admin Security Alerts", () => {
  before(async () => {
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

  it("enforces admin RBAC on security alerts API endpoints (401/403)", async () => {
    const anon = await fetch(`${baseUrl}/api/admin/security-alerts`);
    assert.equal(anon.status, 401);

    const custJwt = makeJwt("customer", "buyer@example.com", "uid-alert-cust");
    const cust = await fetch(`${baseUrl}/api/admin/security-alerts`, {
      headers: { Authorization: `Bearer ${custJwt}` },
    });
    assert.equal(cust.status, 403);
  });

  it("detects repeated admin access probes from multiple distinct IP addresses and deduplicates active alerts", async () => {
    const probeIps = ["198.51.100.10", "203.0.113.25", "192.0.2.44"];
    for (const ip of probeIps) {
      const r = await fetch(`${baseUrl}/api/admin/performance`, {
        headers: { "X-Forwarded-For": ip },
      });
      assert.equal(r.status, 401);
    }

    const adminJwt = makeJwt("promoter_admin", "telrawaj@gmail.com", "uid-alert-pa");
    const res1 = await fetch(`${baseUrl}/api/admin/security-alerts`, {
      headers: { Authorization: `Bearer ${adminJwt}` },
    });
    assert.equal(res1.status, 200);
    const body1 = await res1.json();

    const multiIpAlert = body1.alerts.find((a: any) => a.ruleCode === "MULTI_IP_ADMIN_PROBE");
    assert.ok(multiIpAlert, "Expected MULTI_IP_ADMIN_PROBE alert after 3 distinct IP denials");
    assert.ok(multiIpAlert.distinctIpCount >= 3);
    const countBeforeFourthProbe = multiIpAlert.distinctIpCount;
    assert.equal(multiIpAlert.status, "unread");
    assert.ok(probeIps.every((ip) => multiIpAlert.ips.includes(ip)));

    // Additional distinct IP within window updates the existing active alert instead of duplicating
    await fetch(`${baseUrl}/api/admin/master-prompt`, {
      headers: { "X-Forwarded-For": "198.51.100.99" },
    });

    const res2 = await fetch(`${baseUrl}/api/admin/security-alerts`, {
      headers: { Authorization: `Bearer ${adminJwt}` },
    });
    const body2 = await res2.json();
    const matchingAlerts = body2.alerts.filter((a: any) => a.ruleCode === "MULTI_IP_ADMIN_PROBE");
    assert.equal(matchingAlerts.length, 1);
    assert.equal(matchingAlerts[0].distinctIpCount, countBeforeFourthProbe + 1);
    assert.ok(matchingAlerts[0].ips.includes("198.51.100.99"));
  });

  it("triggers critical ROLE_ESCALATION_ATTEMPT alert when user_admin probes promoter_admin vault", async () => {
    const userAdminJwt = makeJwt("user_admin", "ops@rawaj.store", "uid-alert-ua");
    const denied = await fetch(`${baseUrl}/api/admin/master-prompt/rotate-key`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userAdminJwt}`,
        "X-Forwarded-For": "203.0.113.77",
      },
    });
    assert.equal(denied.status, 403);

    const promoterJwt = makeJwt("promoter_admin", "telrawaj@gmail.com", "uid-alert-pa2");
    const alertsRes = await fetch(`${baseUrl}/api/admin/security-alerts`, {
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    const body = await alertsRes.json();
    const esc = body.alerts.find((a: any) => a.ruleCode === "ROLE_ESCALATION_ATTEMPT");
    assert.ok(esc, "Expected ROLE_ESCALATION_ATTEMPT alert");
    assert.equal(esc.severity, "critical");
    assert.ok(esc.ips.includes("203.0.113.77"));
  });

  it("supports configuring email alert settings, triggering test alert, and acknowledging/resolving incidents", async () => {
    const promoterJwt = makeJwt("promoter_admin", "telrawaj@gmail.com", "uid-alert-pa3");

    // Save updated notification & threshold settings
    const saveRes = await fetch(`${baseUrl}/api/admin/security-alerts/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dashboardEnabled: true,
        emailEnabled: true,
        recipientEmail: "security-ops@rawaj.store",
        multiIpThreshold: 2,
        repeatedAttemptsThreshold: 4,
        windowMinutes: 30,
      }),
    });
    assert.equal(saveRes.status, 200);
    const saveBody = await saveRes.json();
    assert.equal(saveBody.settings.recipientEmail, "security-ops@rawaj.store");
    assert.equal(saveBody.settings.multiIpThreshold, 2);

    // Trigger manual test alert
    const testRes = await fetch(`${baseUrl}/api/admin/security-alerts/test`, {
      method: "POST",
      headers: { Authorization: `Bearer ${promoterJwt}` },
    });
    assert.equal(testRes.status, 200);
    const { alert } = await testRes.json();
    assert.equal(alert.ruleCode, "MANUAL_TEST_ALERT");
    assert.equal(alert.emailRecipient, "security-ops@rawaj.store");

    // Acknowledge and then resolve
    const ackRes = await fetch(`${baseUrl}/api/admin/security-alerts/${alert.id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "acknowledged" }),
    });
    assert.equal(ackRes.status, 200);
    assert.equal((await ackRes.json()).alert.status, "acknowledged");

    const resRes = await fetch(`${baseUrl}/api/admin/security-alerts/${alert.id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${promoterJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "resolved" }),
    });
    assert.equal(resRes.status, 200);
    const resolvedBody = await resRes.json();
    assert.equal(resolvedBody.alert.status, "resolved");
    assert.ok(resolvedBody.alert.resolvedBy);
  });
});
