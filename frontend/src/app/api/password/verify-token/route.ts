import { NextRequest } from 'next/server';
import { secureFetchWithCommonHeaders } from '@/lib/fetch-utils';
import { createNoCacheResponse } from '@/lib/response-utils';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api/v1';

/**
 * 成功レスポンスをフィルタリング
 * セキュリティのため、許可されたフィールドのみを抽出
 */
function filterSuccessResponse(data: unknown): { data: { valid: boolean; accountType?: string } } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid response format: expected object');
  }

  const response = data as Record<string, unknown>;
  
  if (!response.data || typeof response.data !== 'object' || response.data === null) {
    throw new Error('Invalid response format: missing or invalid data field');
  }

  const dataField = response.data as Record<string, unknown>;
  
  // 許可されたフィールドのみを抽出
  const filtered: { valid: boolean; accountType?: string } = {
    valid: dataField.valid === true,
  };

  // accountTypeが存在し、文字列の場合のみ追加
  if (typeof dataField.accountType === 'string') {
    filtered.accountType = dataField.accountType;
  }

  return { data: filtered };
}

/**
 * エラーレスポンスをフィルタリング
 * セキュリティのため、許可されたフィールドのみを抽出
 */
function filterErrorResponse(data: unknown, statusCode: number): { error: { code: string; message: string; details?: unknown } } {
  if (typeof data !== 'object' || data === null) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'トークンの検証に失敗しました',
      },
    };
  }

  const response = data as Record<string, unknown>;
  
  if (!response.error || typeof response.error !== 'object' || response.error === null) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'トークンの検証に失敗しました',
      },
    };
  }

  const errorField = response.error as Record<string, unknown>;
  
  // 許可されたフィールドのみを抽出
  const filtered: { code: string; message: string; details?: unknown } = {
    code: typeof errorField.code === 'string' ? errorField.code : 'INTERNAL_ERROR',
    message: typeof errorField.message === 'string' ? errorField.message : 'トークンの検証に失敗しました',
  };

  // detailsはバリデーションエラー時のみ許可（個人情報が含まれていないことを確認）
  // VALIDATION_ERRORの場合のみdetailsを含める
  if (
    statusCode === 400 &&
    filtered.code === 'VALIDATION_ERROR' &&
    errorField.details !== undefined
  ) {
    // detailsが配列またはオブジェクトの場合のみ許可
    if (Array.isArray(errorField.details) || (typeof errorField.details === 'object' && errorField.details !== null)) {
      filtered.details = errorField.details;
    }
  }

  return { error: filtered };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return createNoCacheResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'トークンが正しくありません' } },
        { status: 400 }
      );
    }

    console.log('🔐 API Route: Password token verification request received', { token: token.substring(0, 8) + '...' });

    const response = await secureFetchWithCommonHeaders(request, `${API_BASE_URL}/password/verify-token?token=${token}`, {
      method: 'GET',
      headerOptions: {
        requireAuth: false, // トークン検証は認証不要
      },
    });

    console.log('📡 API Route: Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      console.error('❌ API Route: Password token verification failed', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorData 
      });
      
      // エラーレスポンスをフィルタリング
      const filteredError = filterErrorResponse(errorData, response.status);
      return createNoCacheResponse(filteredError, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ API Route: Password token verification successful', { 
      dataType: typeof data,
      dataKeys: Object.keys(data),
      hasData: 'data' in data,
      isValid: data.data?.valid
    });
    
    // 成功レスポンスをフィルタリング
    try {
      const filteredData = filterSuccessResponse(data);
      return createNoCacheResponse(filteredData);
    } catch (filterError) {
      // 予期しないレスポンス形式の場合
      console.error('❌ API Route: Unexpected response format', {
        error: filterError,
        receivedData: data,
      });
      return createNoCacheResponse({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'トークンの検証に失敗しました',
        },
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('❌ API Route: Password token verification error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      API_BASE_URL
    });
    return createNoCacheResponse({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: 'トークンの検証に失敗しました', 
      }
    }, { status: 500 });
  }
}
