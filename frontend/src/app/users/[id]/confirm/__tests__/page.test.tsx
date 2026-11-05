// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserEditConfirmPage from '../page';

const formData = {
  nickname: 'テストユーザー',
  email: 'user@example.com',
  postalCode: '7600001',
  address: '香川県高松市',
  birthDate: '1990-01-01',
  gender: '1',
  saitamaAppId: '',
};

// useSearchParams の戻り値は useEffect の依存に入るので、毎回同じものを返す
const { searchParams } = vi.hoisted(() => ({
  searchParams: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams.current,
  useParams: () => ({ id: 'user-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/templates/admin-layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/contexts/auth-context', () => ({
  useAuth: () => ({ user: { name: '管理者' } }),
}));

describe('ユーザー変更内容確認画面', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    searchParams.current = new URLSearchParams(formData);
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 'user-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('保存時に phone を送らない（編集画面にない項目を空で上書きしない）', async () => {
    render(<UserEditConfirmPage />);

    fireEvent.click(await screen.findByRole('button', { name: '変更する' }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/users/user-1');
    expect(init.method).toBe('PUT');

    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty('phone');
    expect(body).toEqual({
      nickname: formData.nickname,
      email: formData.email,
      postalCode: formData.postalCode,
      address: formData.address,
      birthDate: formData.birthDate,
      gender: formData.gender,
    });
  });
});
