import { randomBytes } from 'crypto';

// 64バイト (512ビット) のランダムなバイトを生成し、Hex形式で出力
const hexSecret = randomBytes(64).toString('hex');

// 32バイトのランダムなバイトを生成し、Base64形式で出力
const base64Secret = randomBytes(32).toString('base64');

// URL-safe Base64形式
const urlSafeSecret = randomBytes(32).toString('base64url');

