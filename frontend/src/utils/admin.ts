/**
 * 管理者アカウント関連のユーティリティ関数
 */

/**
 * 権限値を日本語ラベルに変換
 * @param role - 権限値 ('sysadmin' | 'operator')
 * @returns 日本語ラベル
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case 'sysadmin':
      return '管理者';
    case 'operator':
      return '一般';
    default:
      return '';
  }
}
