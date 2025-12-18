import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    console.log('🌐 API Route: Get admin accounts request received', { email });

    const fullUrl = `${API_BASE_URL}/admin-accounts/${email}`;
    console.log('🔗 API Route: Fetching from', fullUrl);
    console.log('🔑 API Route: API_BASE_URL', API_BASE_URL);

    const response = await secureFetchWithCommonHeaders(request, fullUrl, {
      method: 'GET',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Get admin account failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Get admin account successful', { email });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error('❌ API Route: Get admin account error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    const body = await request.json();
    console.log('✏️ API Route: Update admin account request received', { email, body });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin-accounts/${email}`, {
      method: 'PATCH',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
      body: JSON.stringify(body),
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Update admin account failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Update admin account successful', { email });
    return createNoCacheResponse(data);
  } catch (error: unknown) {
    console.error(`❌ API Route: Update admin account error`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email } = await params;
    console.log('🗑️ API Route: Delete admin account request received', { email });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/admin-accounts/${email}`, {
      method: 'DELETE',
      headerOptions: {
        requireAuth: true, // 認証が必要
      },
    });

    // 認証エラーの場合は401を返す
    if (response.status === 401) {
      return createNoCacheResponse({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Route: Delete admin account failed', { status: response.status, error: errorData });
      return createNoCacheResponse(errorData, { status: response.status });
    }

    console.log('✅ API Route: Delete admin account successful', { email });
    return createNoCacheResponse({ message: '管理者アカウントが削除されました' });
  } catch (error: unknown) {
    console.error(`❌ API Route: Delete admin account error`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
