'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// 動的レンダリングを強制（静的生成エラー回避）
export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-red-300 mb-4">500</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            エラーが発生しました
          </h2>
          <p className="text-gray-600 mb-8">
            {process.env.NODE_ENV === 'development' 
              ? error.message 
              : '時間をおいて再度お試しください。'
            }
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={reset}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
          
          <div className="text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">
              ホームに戻る
            </Link>
            {' | '}
            <Link href="/login" className="hover:text-blue-600">
              ログインページ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
