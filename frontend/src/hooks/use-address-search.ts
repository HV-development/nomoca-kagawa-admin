import { useState } from 'react';

/**
 * 住所検索APIのレスポンス型
 */
interface AddressSearchResponse {
  status: number;
  results?: Array<{
    address1: string; // 都道府県
    address2: string; // 市区町村
    address3: string; // 町名
  }>;
  message?: string;
}

/**
 * 住所検索の状態管理
 */
interface AddressSearchState {
  isSearching: boolean;
  error: string | null;
}

/**
 * 住所検索の結果
 */
interface AddressSearchResult {
  prefecture: string;
  city: string;
  address1: string;
}

/**
 * 住所検索カスタムフック
 * @param onSuccess 検索成功時のコールバック
 * @param onError 検索失敗時のコールバック
 * @returns 住所検索の状態と検索関数
 */
export function useAddressSearch(
  onSuccess?: (result: AddressSearchResult) => void,
  onError?: (error: string) => void
) {
  const [state, setState] = useState<AddressSearchState>({
    isSearching: false,
    error: null,
  });

  /**
   * 郵便番号から住所を検索
   * @param postalCode 郵便番号（7桁の数字）
   */
  const searchAddress = async (postalCode: string): Promise<AddressSearchResult | null> => {
    // 郵便番号の形式チェック
    if (!/^\d{7}$/.test(postalCode)) {
      const error = '郵便番号は7桁の数字で入力してください';
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return null;
    }

    setState({ isSearching: true, error: null });

    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
      const data: AddressSearchResponse = await response.json();

      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0];
        const addressResult: AddressSearchResult = {
          prefecture: result.address1,
          city: result.address2,
          address1: result.address3,
        };

        setState({ isSearching: false, error: null });
        onSuccess?.(addressResult);
        return addressResult;
      } else {
        const error = '該当する住所が見つかりませんでした';
        setState({ isSearching: false, error });
        onError?.(error);
        return null;
      }
    } catch (error) {
      const errorMessage = '住所検索に失敗しました';
      console.error('住所検索エラー:', error);
      setState({ isSearching: false, error: errorMessage });
      onError?.(errorMessage);
      return null;
    }
  };

  /**
   * エラーをクリア
   */
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    isSearching: state.isSearching,
    error: state.error,
    searchAddress,
    clearError,
  };
}

/**
 * 住所検索の結果をフォームデータに適用するヘルパー関数
 * @param formData 現在のフォームデータ
 * @param addressResult 住所検索の結果
 * @returns 更新されたフォームデータ
 */
export function applyAddressSearchResult<T extends { prefecture?: string; city?: string; address1?: string }>(
  formData: T,
  addressResult: AddressSearchResult
): T {
  return {
    ...formData,
    prefecture: addressResult.prefecture,
    city: addressResult.city,
    address1: addressResult.address1,
  };
}
