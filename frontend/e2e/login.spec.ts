
import { test, expect } from '@playwright/test';

test.describe('Admin ログインページのテスト', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('ログインページの要素確認', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
        await expect(page.getByLabel('メールアドレス')).toBeVisible();
        await expect(page.getByLabel('パスワード')).toBeVisible();
        await expect(page.getByRole('button', { name: 'ログイン', exact: true })).toBeVisible();
    });

    test('必須項目のバリデーション', async ({ page }) => {
        // 空で送信
        await page.getByRole('button', { name: 'ログイン', exact: true }).click();

        // エラーメッセージの確認
        // inputの下に .text-red-500 クラスを持つpタグが表示される
        // 具体的なメッセージはZodスキーマに依存するが、何かエラーが表示されていることを確認
        // inputの直下にあるp.text-red-500を確認
        // inputはid="email", id="password"を持つ
        await expect(page.locator('#email + p.text-red-500')).toBeVisible();

        await expect(page.locator('#password + p.text-red-500')).toBeVisible();
    });

    test('無効なメールアドレス形式', async ({ page }) => {
        await page.getByLabel('メールアドレス').fill('invalid-email');
        await page.getByRole('button', { name: 'ログイン', exact: true }).click();

        await expect(page.locator('#email + p.text-red-500')).toBeVisible();
    });
});
