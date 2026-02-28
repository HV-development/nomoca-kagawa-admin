import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { COOKIE_NAMES } from '@/lib/cookie-config';

/** 管理者アカウントのみアクセス可能なパス（直リンク時の権限制御） */
const ADMIN_ONLY_PATHS = ['/admins', '/users'];
function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * IPv4-mapped IPv6アドレスからIPv4部分を抽出
 * 例: ::ffff:192.168.1.1 -> 192.168.1.1
 */
function normalizeIp(ip: string): string {
  // IPv4-mapped IPv6 (::ffff:x.x.x.x) からIPv4部分を抽出
  const ipv4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4Mapped) {
    return ipv4Mapped[1];
  }
  return ip;
}

/**
 * クライアントのIPアドレスを取得
 * Vercel/Cloudflare等のプロキシヘッダーを優先
 */
function getClientIp(request: NextRequest): string {
  let ip = '0.0.0.0';
  
  // Vercel固有のヘッダー
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    ip = vercelIp.split(',')[0].trim();
  }
  // 標準的なプロキシヘッダー
  else {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      ip = forwarded.split(',')[0].trim();
    } else {
      const realIp = request.headers.get('x-real-ip');
      if (realIp) {
        ip = realIp;
      }
    }
  }
  
  // IPv4-mapped IPv6アドレスを正規化
  return normalizeIp(ip);
}

/**
 * /_next/image エンドポイントのURLパラメータを検証
 * ディレクトリトラバーサル攻撃を防止
 */
function validateImageUrl(url: string | null): boolean {
  if (!url) return false;

  // URLデコードして正規化（複数回デコードを試みてエンコードされた攻撃を検出）
  let decodedUrl = url;
  try {
    // 最大3回までデコードを試みる（多重エンコード対策）
    for (let i = 0; i < 3; i++) {
      const newDecoded = decodeURIComponent(decodedUrl);
      if (newDecoded === decodedUrl) break;
      decodedUrl = newDecoded;
    }
  } catch {
    // デコード失敗は不正なURLとして拒否
    return false;
  }

  // パストラバーサルパターンを禁止
  if (decodedUrl.includes('..') || decodedUrl.includes('./')) {
    return false;
  }

  // バックスラッシュによるトラバーサルも禁止
  if (decodedUrl.includes('..\\') || decodedUrl.includes('.\\')) {
    return false;
  }

  // ローカルパスは / で始まる必要がある
  if (!decodedUrl.startsWith('/') && !decodedUrl.startsWith('http')) {
    return false;
  }

  // リモートURLの場合は許可されたドメインのみ
  if (decodedUrl.startsWith('http')) {
    const allowedHosts = [
      'dev-images.tamanomi.com',
      'images.tamanomi.com',
      'localhost',
    ];
    try {
      const urlObj = new URL(decodedUrl);
      return allowedHosts.some(host => urlObj.hostname === host);
    } catch {
      return false;
    }
  }

  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  // メンテナンスモードチェック（最優先で実行）
  if (process.env.MAINTENANCE_MODE === 'true') {
    // メンテナンスページ自体と静的ファイルは除外
    if (pathname === '/maintenance' || pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
      // メンテナンスページはそのまま表示
      if (pathname === '/maintenance') {
        const response = NextResponse.next();
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        return response;
      }
    } else {
      // IPホワイトリストチェック
      const clientIp = getClientIp(request);
      const allowedIps = (process.env.MAINTENANCE_ALLOWED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);
      
      if (!allowedIps.includes(clientIp)) {
        // メンテナンスページへリダイレクト
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        url.search = '';
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        return redirectResponse;
      }
    }
  }

  // /_next/image エンドポイントのURLパラメータを検証（ディレクトリトラバーサル対策）
  if (pathname === '/_next/image') {
    const imageUrl = request.nextUrl.searchParams.get('url');
    if (!validateImageUrl(imageUrl)) {
      console.warn('[middleware] Invalid image URL blocked', {
        url: imageUrl,
        method: request.method,
        fullUrl: request.nextUrl.toString(),
      });
      const errorResponse = NextResponse.json({ message: 'Invalid image URL' }, { status: 403 });
      errorResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      return errorResponse;
    }
    // 検証通過後は通常の処理へ
    // 画像はキャッシュを有効化（パフォーマンス向上のため）
    const response = NextResponse.next();
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // 画像は長期間キャッシュ可能（1年間、immutable）
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return response;
  }

  // CSRF: /api 以下の unsafe メソッドは Origin/Referer を検証
  if (
    pathname.startsWith('/api') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  ) {
    // 認証系の一部エンドポイントはCSRF対象外（ログイン/リフレッシュなど）
    const isProd = process.env.NODE_ENV === 'production';
    const csrfSkip = !isProd && (
      pathname === '/api/auth/login' ||
      pathname === '/api/auth/refresh'
    );
    if (csrfSkip) {
      const response = NextResponse.next();
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const secFetchSite = request.headers.get('sec-fetch-site');

    // ブラウザが same-origin / same-site と自己申告している場合は許可
    if (secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none') {
      const response = NextResponse.next();
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    const sameOrigin = (() => {
      try {
        const allowed = new Set<string>();
        allowed.add(host);
        // ローカル開発での localhost/127.0.0.1 換算を許可
        const [, port] = host.split(':');
        if (port) {
          allowed.add(`localhost:${port}`);
          allowed.add(`127.0.0.1:${port}`);
        }

        if (origin) {
          const originHost = new URL(origin).host;
          if (allowed.has(originHost)) return true;
        }
        if (referer) {
          const refererHost = new URL(referer).host;
          if (allowed.has(refererHost)) return true;
        }
        // Origin/Referer が両方無い場合は同一オリジン遷移等の可能性が高いので許可
        if (!origin && !referer) return true;
        return false;
      } catch {
        // 解析失敗時は不正とみなす
        return false;
      }
    })();

    if (!sameOrigin) {
      const errorResponse = NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
      errorResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      return errorResponse;
    }
  }

  // ルートパスは加盟店一覧にリダイレクト（HTMLレンダリングなし）
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/merchants';
    // 307リダイレクトを実行（リダイレクト実行直後にスクリプトを終了）
    const redirectResponse = NextResponse.redirect(url, 307);
    // リダイレクトレスポンスにもセキュリティヘッダーを設定
    redirectResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    redirectResponse.headers.set('Pragma', 'no-cache');
    redirectResponse.headers.set('Expires', '0');
    return redirectResponse;
  }

  // アプリの保護ページはCookieが無ければログインへ
  const protectedPaths = [
    '/merchants',
    '/shops',
    '/coupons',
    '/admins',
    '/applications',
    '/users',
    '/coupon-history',
  ];

  if (protectedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    const token =
      request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ||
      request.cookies.get(COOKIE_NAMES.HOST_ACCESS_TOKEN)?.value;
    const isCouponsPath = pathname === '/coupons' || pathname.startsWith('/coupons/');
    if (isCouponsPath) {
      console.info('[middleware] coupons access check', {
        hasToken: Boolean(token),
        method: request.method,
        url: request.nextUrl.toString(),
        host,
        hostname: request.nextUrl.hostname,
        purpose: request.headers.get('purpose'),
        secFetchMode: request.headers.get('sec-fetch-mode'),
        secFetchDest: request.headers.get('sec-fetch-dest'),
      });
    }
    if (!token) {
      if (isCouponsPath) {
        console.warn('[middleware] coupons redirect due to missing token', {
          method: request.method,
          url: request.nextUrl.toString(),
          host,
          hostname: request.nextUrl.hostname,
          purpose: request.headers.get('purpose'),
          secFetchMode: request.headers.get('sec-fetch-mode'),
          secFetchDest: request.headers.get('sec-fetch-dest'),
          hasAccessCookie: Boolean(request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)),
          hasHostAccessCookie: Boolean(request.cookies.get(COOKIE_NAMES.HOST_ACCESS_TOKEN)),
        });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('session', 'expired');
      // 307リダイレクトを実行（リダイレクト実行直後にスクリプトを終了）
      const redirectResponse = NextResponse.redirect(url, 307);
      // リダイレクトレスポンスにもセキュリティヘッダーを設定
      redirectResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      redirectResponse.headers.set('Pragma', 'no-cache');
      redirectResponse.headers.set('Expires', '0');
      return redirectResponse;
    }
    // 管理者専用パスはJWTのaccountTypeを検証し、adminでなければ/merchantsへリダイレクト
    if (isAdminOnlyPath(pathname)) {
      // API（AuthUtils）と同じ秘密鍵を使用。未設定時はAPIのデフォルトと揃える
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'default-secret-key'
      );
      try {
        const { payload } = await jwtVerify(token, secret);
        const accountType = payload.accountType as string | undefined;
        if (accountType !== 'admin') {
          const url = request.nextUrl.clone();
          url.pathname = '/merchants';
          url.search = '';
          const redirectResponse = NextResponse.redirect(url, 307);
          redirectResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
          redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          redirectResponse.headers.set('Pragma', 'no-cache');
          redirectResponse.headers.set('Expires', '0');
          return redirectResponse;
        }
      } catch {
        // トークン不正・期限切れの場合はログインへ
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('session', 'expired');
        const redirectResponse = NextResponse.redirect(url, 307);
        redirectResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        redirectResponse.headers.set('Pragma', 'no-cache');
        redirectResponse.headers.set('Expires', '0');
        return redirectResponse;
      }
    }
  }

  // セキュリティヘッダーを設定
  const response = NextResponse.next();

  // HSTS: HTTPSの接続を強制（1年間）
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // キャッシュ制御: 全てのページでキャッシュを無効化して機密情報の漏洩を防止
  // 管理画面の全てのページは機密情報を含む可能性があるため、キャッシュから情報が漏洩することを防止
  // Next.jsのデフォルトのCache-Controlヘッダーを削除してから設定
  response.headers.delete('Cache-Control');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

// 静的ファイル以外のすべてのルートに適用
// 注意: _next/image は検証のためマッチャーに含める（ディレクトリトラバーサル対策）
export const config = {
  matcher: [
    '/((?!_next/static|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
