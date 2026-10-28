const DEFAULT_BACK_HREF = '/shops';
const SAME_ORIGIN_BASE = 'http://same-origin.invalid';

export function toSafeBackHref(raw: string | null | undefined, fallback: string = DEFAULT_BACK_HREF): string {
  if (!raw) return fallback;
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/') || decoded.includes('\\')) return fallback;
    const url = new URL(decoded, SAME_ORIGIN_BASE);
    if (url.origin !== SAME_ORIGIN_BASE) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
