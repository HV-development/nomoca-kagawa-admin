'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/auth-context';
import { getDeniedRedirect, getPermissions, isRestrictedPath } from '@/lib/permissions';

/**
 * 権限が足りない画面を直リンクで開いたときに、一覧へ戻す
 * 役割はDBの値（/api/me）で判定するため、middlewareではなくここで行う
 */
export default function PermissionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const user = auth?.user;
  const redirectTo = user ? getDeniedRedirect(pathname, getPermissions(user)) : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  // 役割が分かるまでは制限のある画面を描画しない（入力フォームのちらつきを防ぐ）
  if (redirectTo || (auth?.isLoading && isRestrictedPath(pathname))) {
    return null;
  }

  return <>{children}</>;
}
