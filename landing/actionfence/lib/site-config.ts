const DEFAULT_SITE_URL = "https://www.actionfence.dev";
const DEFAULT_CLARITY_PROJECT_ID = "wz8b6apxjk";

export const siteName = "ActionFence";
export const siteTitle = "ActionFence — AI Action Firewall";
export const siteDescription =
  "Open-source middleware for Node.js. Stop runaway spending and get cryptographic receipts for every agent action.";
export const siteRepoUrl = "https://github.com/saifeldeen911/actionfence";

export const siteKeywords = [
  "AI action firewall",
  "MCP security",
  "Node.js middleware",
  "agent guardrails",
  "AI spend controls",
  "cryptographic receipts",
  "policy enforcement",
  "ActionFence",
];

function normalizeSiteUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const normalized = new URL(withProtocol);
    normalized.hash = "";
    normalized.search = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
);
export const metadataBase = new URL(`${siteUrl}/`);

export const clarityProjectId =
  (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? DEFAULT_CLARITY_PROJECT_ID)
    .trim() || DEFAULT_CLARITY_PROJECT_ID;

export const canonicalRoutes = [
  "/",
  "/docs/readme",
  "/docs/changelog",
  "/docs/security",
  "/docs/contributing",
] as const;

export function canonicalPath(path = "/"): string {
  const normalized = path.trim() || "/";
  const withLeadingSlash = normalized.startsWith("/")
    ? normalized
    : `/${normalized}`;
  if (withLeadingSlash === "/") {
    return "/";
  }
  return withLeadingSlash.replace(/\/+$/, "");
}

export function canonicalUrl(path = "/"): string {
  return new URL(canonicalPath(path), metadataBase).toString();
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
