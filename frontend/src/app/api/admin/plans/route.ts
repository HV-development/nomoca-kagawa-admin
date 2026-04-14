import { NextRequest } from 'next/server';
import { createNoCacheResponse } from '@/lib/response-utils';
import { authenticatedFetch } from '@/lib/auth-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

export async function GET(request: NextRequest) {
  try {
    const fullUrl = `${API_BASE_URL}/admin/plans`;

    const { response } = await authenticatedFetch(request, fullUrl, {
      method: 'GET',
    });

    return response;
  } catch (error) {
    console.error('プラン一覧取得に失敗しました:', error);
    return createNoCacheResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch plans' } },
      { status: 500 }
    );
  }
}
