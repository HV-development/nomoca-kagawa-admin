import { useState } from 'react';

export interface ZipcodeSearchResult {
  prefecture: string;
  city: string;
  address1: string;
}

export interface ZipcodeSearchError {
  message: string;
}

export const useZipcodeSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ZipcodeSearchError | null>(null);

  const searchZipcode = async (zipcode: string): Promise<ZipcodeSearchResult | null> => {
    if (!zipcode || zipcode.length !== 7) {
      setError({ message: '郵便番号は7桁で入力してください' });
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`);
      const data = await response.json();

      if (data.status !== 200) {
        setError({ message: data.message || '郵便番号が見つかりませんでした' });
        return null;
      }

      if (!data.results || data.results.length === 0) {
        setError({ message: '該当する住所が見つかりませんでした' });
        return null;
      }

      const result = data.results[0];
      return {
        prefecture: result.address1,
        city: result.address2,
        address1: result.address3,
      };
    } catch (_err) {
      setError({ message: '郵便番号検索でエラーが発生しました' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    searchZipcode,
    isLoading,
    error,
  };
};


