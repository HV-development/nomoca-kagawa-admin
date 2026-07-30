import { NextRequest } from 'next/server';
import { createNoCacheResponse } from '@/lib/response-utils';
import { authenticatedFetch } from '@/lib/auth-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const qs = url.searchParams.toString();
    const fullUrl = qs
      ? `${API_BASE_URL}/admin/campaigns?${qs}`
      : `${API_BASE_URL}/admin/campaigns`;

    const { response } = await authenticatedFetch(request, fullUrl, { method: 'GET' });
    return response;
  } catch (error) {
    console.error('キャンペーン一覧取得に失敗しました:', error);
    return createNoCacheResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch campaigns' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullUrl = `${API_BASE_URL}/admin/campaigns`;

    const { response } = await authenticatedFetch(request, fullUrl, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return response;
  } catch (error) {
    console.error('キャンペーン作成に失敗しました:', error);
    return createNoCacheResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create campaign' } },
      { status: 500 }
    );
  }
}
