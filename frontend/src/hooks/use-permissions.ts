import { useAuth } from '@/components/contexts/auth-context';
import { getPermissions, type Permissions } from '@/lib/permissions';

/**
 * ログイン中のアカウントの権限を返す
 * 認証情報の読み込み中はすべて false（ボタンのちらつきを防ぐ）
 */
export function usePermissions(): Permissions {
  const auth = useAuth();
  return getPermissions(auth?.user);
}
