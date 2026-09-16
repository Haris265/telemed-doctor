/** Base API origin (no trailing slash). */
export const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "https://telemed-api.hnhsofttechsolutions.com"
).replace(/\/+$/, "");

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) {
    return `${API_ORIGIN}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/media/")) {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
