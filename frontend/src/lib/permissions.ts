/**
 * 画面の出し分けに使う権限の判定
 * 実際の認可はAPI側で行うので、ここは操作できないボタンや画面を出さないためのもの
 */

export interface PermissionUser {
  accountType: string;
  role?: string;
}

export interface Permissions {
  /** 管理者アカウントの作成・削除・他者の編集（sysadminのみ） */
  canManageAdmins: boolean;
  /** 事業者・ユーザー・店舗・クーポン・キャンペーンの変更（viewerは閲覧のみ） */
  canWrite: boolean;
  /** 店舗の新規作成（店舗アカウントは不可） */
  canCreateShop: boolean;
  /** ユーザーの編集（sysadminのみ。API の PUT /users/:id が sysadmin 限定） */
  canEditUsers: boolean;
}

const ADMIN_WRITE_ROLES = ['sysadmin', 'operator'];

export function getPermissions(user: PermissionUser | null | undefined): Permissions {
  if (!user) {
    return { canManageAdmins: false, canWrite: false, canCreateShop: false, canEditUsers: false };
  }

  const isAdmin = user.accountType === 'admin';
  const canWrite = !isAdmin || ADMIN_WRITE_ROLES.includes(user.role ?? '');

  return {
    canManageAdmins: isAdmin && user.role === 'sysadmin',
    canWrite,
    canCreateShop: canWrite && user.accountType !== 'shop',
    canEditUsers: isAdmin && user.role === 'sysadmin',
  };
}

const WRITE_PATH = /^\/(merchants|shops|coupons|users|campaigns)(?:\/.*)?\/(?:new|edit|confirm)$/;
const SHOP_CREATE_PATH = /^\/(?:shops\/new|shops\/confirm|merchants\/[^/]+\/shops\/new)$/;
const ADMIN_CREATE_PATH = '/admins/new';
const USER_EDIT_PATH = /^\/users\/[^/]+\/(?:edit|confirm)$/;

/** 権限によっては開けない画面か（直リンク対策） */
export function isRestrictedPath(pathname: string): boolean {
  return pathname === ADMIN_CREATE_PATH || WRITE_PATH.test(pathname);
}

/**
 * 権限が足りない画面なら戻り先を返す。開いてよい画面なら null
 * /admins/[id]/edit は対象が本人かどうかで決まるので、画面側で判定する
 */
export function getDeniedRedirect(pathname: string, permissions: Permissions): string | null {
  if (pathname === ADMIN_CREATE_PATH) {
    return permissions.canManageAdmins ? null : '/admins';
  }
  if (USER_EDIT_PATH.test(pathname)) {
    return permissions.canEditUsers ? null : '/users';
  }

  const section = WRITE_PATH.exec(pathname)?.[1];
  if (!section) {
    return null;
  }
  if (!permissions.canWrite) {
    return `/${section}`;
  }
  if (!permissions.canCreateShop && SHOP_CREATE_PATH.test(pathname)) {
    return '/shops';
  }
  return null;
}
