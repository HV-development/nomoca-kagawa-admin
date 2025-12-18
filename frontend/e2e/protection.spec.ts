
import { test, expect } from '@playwright/test';

test.describe('ページ保護のテスト', () => {
    test('未認証状態で保護されたページにアクセスするとログインページにリダイレクトされる', async ({ page }) => {
        // /merchants はログイン後のデフォルトリダイレクト先の一つ
        await page.goto('/merchants');

        // URLがログインページであることを確認
        // next.config.jsなどの設定により、リダイレクトパラメータが付く可能性があるため、パス部分を確認
        await expect(page).toHaveURL(/.*\/login/);
        await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    });

    test('未認証状態で /users にアクセスするとログインページにリダイレクトされる', async ({ page }) => {
        await page.goto('/users');
        await expect(page).toHaveURL(/.*\/login/);
    });
});
