import { createNoCacheResponse } from '@/lib/response-utils';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: unknown = null;
    if (contentType.includes('application/csp-report') || contentType.includes('application/json') || contentType.includes('application/reports+json')) {
      body = await request.json().catch(() => null);
    } else {
      const text = await request.text().catch(() => '');
      body = text;
    }
    // ここではサーバの標準出力へ記録（本番ではログ基盤に送る）
    console.warn('🔐 CSP Report received:', body);
    return createNoCacheResponse(null, { status: 204 });
  } catch (_e) {
    return createNoCacheResponse({ ok: false }, { status: 204 });
  }
}
