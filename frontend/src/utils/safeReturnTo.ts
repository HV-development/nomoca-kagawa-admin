const DEFAULT_BACK_HREF = '/shops';
const SAME_ORIGIN_BASE = 'http://same-origin.invalid';

export function toSafeBackHref(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_BACK_HREF;
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/') || decoded.includes('\\')) return DEFAULT_BACK_HREF;
    const url = new URL(decoded, SAME_ORIGIN_BASE);
    if (url.origin !== SAME_ORIGIN_BASE) return DEFAULT_BACK_HREF;
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_BACK_HREF;
  }
}
