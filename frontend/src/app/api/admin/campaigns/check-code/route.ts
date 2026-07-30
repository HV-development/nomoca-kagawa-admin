import { NextRequest } from 'next/server';
import { createNoCacheResponse } from '@/lib/response-utils';
import { authenticatedFetch } from '@/lib/auth-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const qs = url.searchParams.toString();
    const fullUrl = `${API_BASE_URL}/admin/campaigns/check-code${qs ? `?${qs}` : ''}`;

    const { response } = await authenticatedFetch(request, fullUrl, { method: 'GET' });
    return response;
  } catch (error) {
    console.error('キャンペーンコード重複チェックに失敗しました:', error);
    return createNoCacheResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to check campaign code' } },
      { status: 500 }
    );
  }
}
