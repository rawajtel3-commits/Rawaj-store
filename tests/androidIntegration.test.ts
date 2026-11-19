import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const TEST_DB_PATH = `/tmp/rawaj-android-integration-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
const TEST_WHITELABEL_DB_PATH = `/tmp/rawaj-android-integration-wl-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;

process.env.RAWAJ_SECURITY_DB_FILE = TEST_DB_PATH;
process.env.RAWAJ_WHITELABEL_DB_FILE = TEST_WHITELABEL_DB_PATH;
process.env.RAWAJ_SKIP_SERVER_LISTEN = "1";
process.env.SESSION_SECRET = "test-session-secret-for-android-integration-0123456789";
process.env.PROMPT_KMS_KEY = "test-kms-key-android-integration-0123456789abcdef01";

const serverMod = await import("../server.js");
const assetLinksMod = await import("../server/androidAssetLinks.js");

let httpServer: Server;
let baseUrl = "";

describe("Android Wrapper Project & Custom Domain App Links Integration", () => {
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
        fs.unlinkSync(file);
      }
    }
  });

  it("validates Android package names, SHA-256 certificate fingerprints, and custom domain origins", () => {
    assert.equal(assetLinksMod.isValidAndroidPackageName("com.rawaj.store"), true);
    assert.equal(assetLinksMod.isValidAndroidPackageName("sa.mybrand.shop_app"), true);
    assert.equal(assetLinksMod.isValidAndroidPackageName("invalid"), false);
    assert.equal(assetLinksMod.isValidAndroidPackageName("123.bad.pkg"), false);

    const sampleFp =
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";
    assert.equal(assetLinksMod.isValidSha256Fingerprint(sampleFp), true);
    assert.equal(assetLinksMod.isValidSha256Fingerprint("not-a-sha256"), false);

    const parsed = assetLinksMod.parseSha256Fingerprints(` ${sampleFp.toLowerCase()} , invalid , ${sampleFp} `);
    assert.deepEqual(parsed, [sampleFp]);

    assert.equal(
      assetLinksMod.normalizeCustomDomainOrigin("shop.rawaj.sa/"),
      "https://shop.rawaj.sa"
    );
    assert.equal(
      assetLinksMod.normalizeCustomDomainOrigin("http://store.example.com:8443/path"),
      "https://store.example.com:8443"
    );
    assert.equal(assetLinksMod.normalizeCustomDomainOrigin("MY_CUSTOM_DOMAIN"), null);
  });

  it("serves /.well-known/assetlinks.json dynamically from environment configuration", async () => {
    const emptyStatements = assetLinksMod.buildDigitalAssetLinks({});
    assert.deepEqual(emptyStatements, []);

    const sampleFp =
      "11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD:EE:FF";
    process.env.ANDROID_APP_PACKAGE = "com.customdomain.rawaj";
    process.env.ANDROID_SHA256_CERT_FINGERPRINTS = sampleFp;

    const res = await fetch(`${baseUrl}/.well-known/assetlinks.json`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("application/json"));
    const body = await res.json();

    assert.equal(Array.isArray(body), true);
    assert.equal(body.length, 1);
    assert.equal(body[0].target.namespace, "android_app");
    assert.equal(body[0].target.package_name, "com.customdomain.rawaj");
    assert.deepEqual(body[0].target.sha256_cert_fingerprints, [sampleFp]);

    delete process.env.ANDROID_APP_PACKAGE;
    delete process.env.ANDROID_SHA256_CERT_FINGERPRINTS;
  });

  it("includes a complete Android Studio Gradle project structure and CI APK builder", () => {
    const requiredFiles = [
      "android-app/settings.gradle.kts",
      "android-app/build.gradle.kts",
      "android-app/gradle.properties",
      "android-app/gradle/wrapper/gradle-wrapper.properties",
      "android-app/app/build.gradle.kts",
      "android-app/app/proguard-rules.pro",
      "android-app/app/src/main/AndroidManifest.xml",
      "android-app/app/src/main/java/com/rawaj/store/MainActivity.kt",
      "android-app/app/src/main/res/layout/activity_main.xml",
      "android-app/app/src/main/res/values/colors.xml",
      "android-app/app/src/main/res/values/strings.xml",
      "android-app/app/src/main/res/values/themes.xml",
      "android-app/app/src/main/res/xml/network_security_config.xml",
      "android-app/app/src/main/res/xml/file_paths.xml",
      "android-app/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
      ".github/workflows/android-apk.yml",
    ];

    for (const rel of requiredFiles) {
      const fullPath = path.join(process.cwd(), rel);
      assert.ok(fs.existsSync(fullPath), `Missing required Android project file: ${rel}`);
    }

    const gradleProps = fs.readFileSync(path.join(process.cwd(), "android-app/gradle.properties"), "utf8");
    assert.ok(gradleProps.includes("RAWAJ_STORE_URL="));
    assert.ok(gradleProps.includes("RAWAJ_APP_PACKAGE="));

    const manifest = fs.readFileSync(
      path.join(process.cwd(), "android-app/app/src/main/AndroidManifest.xml"),
      "utf8"
    );
    assert.ok(manifest.includes("android.permission.CAMERA"));
    assert.ok(manifest.includes('android:autoVerify="true"'));
    assert.ok(manifest.includes('android:host="${storeHost}"'));
  });
});
