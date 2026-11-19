export interface DigitalAssetLinkStatement {
  relation: string[];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
}

const ANDROID_PACKAGE_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const SHA256_FINGERPRINT_REGEX = /^([0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/;
const DEFAULT_ANDROID_PACKAGE = "com.rawaj.store";

export function isValidAndroidPackageName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 3 && trimmed.length <= 150 && ANDROID_PACKAGE_REGEX.test(trimmed);
}

export function isValidSha256Fingerprint(value: string): boolean {
  return SHA256_FINGERPRINT_REGEX.test(value.trim());
}

export function parseSha256Fingerprints(raw?: string): string[] {
  if (!raw || typeof raw !== "string") return [];
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const part of raw.split(",")) {
    const normalized = part.trim().toUpperCase();
    if (normalized && isValidSha256Fingerprint(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      valid.push(normalized);
    }
  }
  return valid;
}

export function normalizeCustomDomainOrigin(raw?: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "MY_APP_URL" || trimmed === "MY_CUSTOM_DOMAIN") return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname || url.hostname.includes(" ")) return null;
    const isLocal =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0";
    const protocol = isLocal ? url.protocol : "https:";
    return `${protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function buildDigitalAssetLinks(
  env: Record<string, string | undefined> = process.env
): DigitalAssetLinkStatement[] {
  const rawPackage = String(env.ANDROID_APP_PACKAGE || "").trim();
  const packageName = isValidAndroidPackageName(rawPackage)
    ? rawPackage
    : DEFAULT_ANDROID_PACKAGE;
  const fingerprints = parseSha256Fingerprints(env.ANDROID_SHA256_CERT_FINGERPRINTS);

  if (fingerprints.length === 0) {
    return [];
  }

  return [
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds",
      ],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
