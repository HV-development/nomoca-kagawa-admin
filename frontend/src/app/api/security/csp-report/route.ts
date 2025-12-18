import { NextResponse } from 'next/server';

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
    // 204 No Contentはボディを持てないため、NextResponseを直接使用
    return new NextResponse(null, { status: 204 });
  } catch (_e) {
    // エラー時も204を返す（CSPレポートは失敗してもブラウザに影響しない）
    return new NextResponse(null, { status: 204 });
  }
}
