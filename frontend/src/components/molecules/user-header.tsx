'use client';

import { useAuth } from '@/components/contexts/auth-context';
import { useRouter } from 'next/navigation';

interface UserHeaderProps {
  className?: string;
}

export default function UserHeader({ className = '' }: UserHeaderProps) {
  const auth = useAuth();
  const router = useRouter();

  const isLoading = auth?.isLoading ?? true;
  const displayName = auth?.user?.name ?? '—';
  const roleLabel = auth?.user?.role ?? auth?.user?.accountType ?? '—';

  const handleLogout = async () => {
    if (!auth) return;
    
    if (confirm('ログアウトしますか？')) {
      await auth.logout();
      router.push('/login');
    }
  };

  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-3 ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            ログインユーザー:
          </div>
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <>
                <span className="text-sm font-medium text-gray-400 animate-pulse">
                  読み込み中...
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-900">
                  {displayName}
                </span>
                <span className="text-xs text-gray-500">
                  ({roleLabel})
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className={`text-sm transition-colors ${
            isLoading 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}