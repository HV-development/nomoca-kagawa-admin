import { NextRequest } from 'next/server';
import { createNoCacheResponse } from '@/lib/response-utils';
import { authenticatedFetch } from '@/lib/auth-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3002/api/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const fullUrl = `${API_BASE_URL}/admin/users`;

    const { response } = await authenticatedFetch(request, fullUrl, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return response;
  } catch (error: unknown) {
    console.error('❌ API Route: Get users error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createNoCacheResponse({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
