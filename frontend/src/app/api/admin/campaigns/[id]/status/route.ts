import { NextRequest } from 'next/server';
import { createNoCacheResponse } from '@/lib/response-utils';
import { authenticatedFetch } from '@/lib/auth-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const fullUrl = `${API_BASE_URL}/admin/campaigns/${id}/status`;
    const { response } = await authenticatedFetch(request, fullUrl, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return response;
  } catch (error) {
    console.error('キャンペーンステータス変更に失敗しました:', error);
    return createNoCacheResponse(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update campaign status' } },
      { status: 500 }
    );
  }
}
