'use client';

import { useAuth } from '@/components/contexts/auth-context';
import { useRouter } from 'next/navigation';

interface UserHeaderProps {
  className?: string;
}

export default function UserHeader({ className = '' }: UserHeaderProps) {
  const auth = useAuth();
  const router = useRouter();
  
  // 実際の実装では認証コンテキストやセッションから取得
  const currentUser = {
    name: '管理者太郎',
    role: '管理者',
    loginTime: '2024/01/15 10:30'
  };

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
            <span className="text-sm font-medium text-gray-900">
              {currentUser.name}
            </span>
            <span className="text-xs text-gray-500">
              ({currentUser.role})
            </span>
          </div>
          <div className="text-xs text-gray-500">
            ログイン時刻: {currentUser.loginTime}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}