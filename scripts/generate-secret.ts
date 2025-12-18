import { randomBytes } from 'crypto';

console.log('🔐 JWT Secret Key Generator');
console.log('============================\n');

// 64バイト (512ビット) のランダムなバイトを生成し、Hex形式で出力
const hexSecret = randomBytes(64).toString('hex');
console.log('📝 Hex Secret Key (推奨):');
console.log(hexSecret + '\n');

// 32バイトのランダムなバイトを生成し、Base64形式で出力
const base64Secret = randomBytes(32).toString('base64');
console.log('📝 Base64 Secret Key:');
console.log(base64Secret + '\n');

// URL-safe Base64形式
const urlSafeSecret = randomBytes(32).toString('base64url');
console.log('📝 URL-Safe Base64 Secret Key:');
console.log(urlSafeSecret + '\n');

console.log('💡 使用方法:');
console.log('1. .envファイルを作成または更新');
console.log('2. JWT_SECRET=上記のいずれかのキーを設定');
console.log('3. 本番環境では必ず新しいキーを生成してください\n');

console.log('⚠️  注意事項:');
console.log('- 生成されたキーは安全に保管してください');
console.log('- 本番環境では必ず新しいキーを生成してください');
console.log('- キーが漏洩した場合は即座に変更してください');
console.log('- GitHubやその他の公開リポジトリにコミットしないでください');

