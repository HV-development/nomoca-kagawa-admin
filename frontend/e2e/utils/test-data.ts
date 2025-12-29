/**
 * テストデータユーティリティ
 * 
 * 注: モックを廃止したため、このファイルの関数は現在使用されていません。
 * 将来的にテストデータ生成が必要になった場合のために残しています。
 */

/**
 * ランダムな文字列を生成する
 */
export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * ランダムなメールアドレスを生成する
 */
export function randomEmail(): string {
  return `test-${randomString()}@example.com`;
}

/**
 * ランダムな電話番号を生成する
 */
export function randomPhoneNumber(): string {
  return `090${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
}
