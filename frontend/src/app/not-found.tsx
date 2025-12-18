import Link from 'next/link';

// 動的レンダリングを強制（静的生成エラー回避）
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            ページが見つかりません
          </h2>
          <p className="text-gray-600 mb-8">
            お探しのページは存在しないか、移動しました。
          </p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ホームに戻る
          </Link>
          
          <div className="text-sm text-gray-500">
            <Link href="/login" className="hover:text-blue-600">
              ログインページ
            </Link>
            {' | '}
            <Link href="/merchants" className="hover:text-blue-600">
              事業者管理
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
