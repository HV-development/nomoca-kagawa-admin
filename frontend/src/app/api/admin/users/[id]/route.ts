import { NextRequest } from 'next/server';
import { createNoCacheResponse } from '@/lib/response-utils';
import { authenticatedFetch } from '@/lib/auth-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id) {
    return createNoCacheResponse({ message: 'ユーザーIDが指定されていません' }, { status: 400 });
  }

  try {
    const fullUrl = `${API_BASE_URL}/users/${encodeURIComponent(id)}`;

    const { response } = await authenticatedFetch(request, fullUrl, {
      method: 'GET',
    });

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id) {
    return createNoCacheResponse({ message: 'ユーザーIDが指定されていません' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const fullUrl = `${API_BASE_URL}/users/${encodeURIComponent(id)}`;

    const { response } = await authenticatedFetch(request, fullUrl, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return response;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
