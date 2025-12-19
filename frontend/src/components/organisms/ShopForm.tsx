'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/atoms/Button';
import ToastContainer from '@/components/molecules/toast-container';
import ErrorMessage from '@/components/atoms/ErrorMessage';

const MerchantSelectModal = dynamicImport(() => import('@/components/molecules/MerchantSelectModal'), {
  loading: () => null,
  ssr: false,
});
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/contexts/auth-context';
import type { ShopCreateRequest } from '@hv-development/schemas';
import { shopCreateRequestSchema, shopUpdateRequestSchema, isValidEmail, isValidPhone, isValidPostalCode, isValidKana } from '@hv-development/schemas';
import { PREFECTURES, WEEKDAYS } from '@/lib/constants/japan';
import { SMOKING_OPTIONS } from '@/lib/constants/shop';
import { useAddressSearch, applyAddressSearchResult } from '@/hooks/use-address-search';
import { useShopValidation } from '@/hooks/useShopValidation';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { Merchant, ShopDataResponse, Genre, Scene, ExtendedShopCreateRequest } from '@/types/shop';

const PaymentMethodSelector = dynamicImport(() => import('@/components/molecules/PaymentMethodSelector'), {
  loading: () => null,
  ssr: false,
});

const SceneSelector = dynamicImport(() => import('@/components/molecules/SceneSelector'), {
  loading: () => null,
  ssr: false,
});

const ImageUploader = dynamicImport(() => import('@/components/molecules/ImageUploader'), {
  loading: () => null,
  ssr: false,
});

const AccountSection = dynamicImport(() => import('@/components/molecules/AccountSection'), {
  loading: () => null,
  ssr: false,
});

const QRCodeGenerator = dynamicImport(() => import('@/components/molecules/QRCodeGenerator'), {
  loading: () => null,
  ssr: false,
});

interface ShopFormProps {
  merchantId?: string;
}

export default function ShopForm({ merchantId: propMerchantId }: ShopFormProps = {}) {
  const params = useParams();
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const auth = useAuth();

  // 事業者アカウントかどうかを判定
  const isMerchantAccount = useMemo(
    () => auth?.user?.accountType === 'merchant',
    [auth?.user?.accountType]
  );

  // 管理者アカウントかどうかを判定
  const isAdminAccount = useMemo(
    () => auth?.user?.accountType === 'admin',
    [auth?.user?.accountType]
  );

  // 店舗アカウントかどうかを判定
  const isShopAccount = useMemo(
    () => auth?.user?.accountType === 'shop',
    [auth?.user?.accountType]
  );

  // shopIdの取得（編集時のみ存在）
  // /merchants/[id]/shops/[shopId]/edit -> params.shopId
  // /shops/[id]/edit -> params.id（merchantId未指定の場合）
  const shopId = useMemo(
    () => (params.shopId || (!propMerchantId ? params.id : undefined)) as string | undefined,
    [params.shopId, params.id, propMerchantId]
  );
  
  const merchantIdFromParams = useMemo(
    () => params.id as string,
    [params.id]
  );
  
  const isEdit = useMemo(() => !!shopId, [shopId]);

  // merchantIdの決定（props > URLパラメータ）
  const merchantId = useMemo(
    () => propMerchantId || merchantIdFromParams,
    [propMerchantId, merchantIdFromParams]
  );
  
  const returnToParam = searchParamsHook?.get('returnTo') || null;
  const decodedReturnTo = useMemo(() => {
    if (!returnToParam) return null;
    try {
      const decoded = decodeURIComponent(returnToParam);
      return decoded.startsWith('/') ? decoded : `/${decoded}`;
    } catch {
      return returnToParam.startsWith('/') ? returnToParam : `/${returnToParam}`;
    }
  }, [returnToParam]);

  const fallbackRedirect = useMemo(() => {
    if (decodedReturnTo) {
      return decodedReturnTo;
    }
    if (isMerchantAccount && merchantId) {
      return `/merchants/${merchantId}/shops`;
    }
    return '/shops';
  }, [decodedReturnTo, isMerchantAccount, merchantId]);

  const [formData, setFormData] = useState<ExtendedShopCreateRequest>({
    merchantId: merchantId || '',
    genreId: '',
    accountEmail: '',
    name: '',
    nameKana: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
    address: '',
    latitude: '',
    longitude: '',
    description: '',
    details: '',
    holidays: '',
    smokingType: undefined,
    homepageUrl: '',
    couponUsageStart: '',
    couponUsageEnd: '',
    couponUsageDays: '',
    paymentMydigi: false,
    paymentCash: true,
    paymentCredit: '',
    paymentCode: '',
    status: 'registering',
    createAccount: false,
    password: '',
  });

  // 利用シーンの複数選択用
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [customSceneText, setCustomSceneText] = useState<string>('');

  // 決済方法の複数選択用
  const [selectedCreditBrands, setSelectedCreditBrands] = useState<string[]>([]);
  const [customCreditText, setCustomCreditText] = useState<string>('');
  const [selectedQrBrands, setSelectedQrBrands] = useState<string[]>([]);
  const [customQrText, setCustomQrText] = useState<string>('');

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchantDetails, setSelectedMerchantDetails] = useState<Merchant | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [existingAccountEmails, setExistingAccountEmails] = useState<Array<{ shopId: string; email: string }>>([]);
  const [originalAccountEmail, setOriginalAccountEmail] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);

  const collectAccountEmailEntries = (data: unknown): Array<{ shopId: string; email: string }> => {
    const entries: Array<{ shopId: string; email: string }> = [];
    const appendFromArray = (shops: Array<{ id?: unknown; accountEmail?: unknown }>) => {
      shops.forEach((shop) => {
        if (shop && typeof shop === 'object') {
          const id = typeof shop.id === 'string' ? shop.id : null;
          const email = typeof shop.accountEmail === 'string' ? shop.accountEmail : null;
          if (id && email) {
            entries.push({ shopId: id, email });
          }
        }
      });
    };

    if (Array.isArray(data)) {
      appendFromArray(data as Array<{ id?: string; accountEmail?: string }>);
      return entries;
    }

    if (data && typeof data === 'object') {
      const raw = data as { shops?: unknown; data?: unknown };
      if (Array.isArray(raw.shops)) {
        appendFromArray(raw.shops as Array<{ id?: string; accountEmail?: string }>);
      }
      if (raw.data && typeof raw.data === 'object') {
        const inner = raw.data as { shops?: unknown };
        if (Array.isArray(inner.shops)) {
          appendFromArray(inner.shops as Array<{ id?: string; accountEmail?: string }>);
        }
      }
    }

    return entries;
  };

  const isAccountEmailDuplicate = (email: string): boolean => {
    const normalized = email.trim().toLowerCase();
    return existingAccountEmails.some((entry) => {
      if (entry.email.trim().toLowerCase() !== normalized) {
        return false;
      }
      if (isEdit && shopId) {
        return entry.shopId !== shopId;
      }
      return true;
    });
  };

  // 住所検索フック
  const { isSearching: isSearchingAddress, searchAddress } = useAddressSearch(
    (result) => {
      setFormData(prev => {
        const addressResult = applyAddressSearchResult(prev, result);
        return {
          ...prev,
          ...addressResult
        };
      });
      // 住所フィールドのエラーをクリア
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.prefecture;
        delete newErrors.city;
        delete newErrors.address1;
        return newErrors;
      });
      showSuccess('住所を取得しました');
    },
    (error) => {
      showError(error);
    }
  );

  // バリデーションエラー用のステート
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // フィールドが触られたかを追跡（初期表示時は必須エラーを表示しない）
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // validationErrorsの変更を監視（必要に応じてデバッグ用）
  useEffect(() => {
    // デバッグログは削除済み
  }, [validationErrors]);

  // 既存のアカウントがあるかどうか（API取得時の初期データで判定）
  const [hasExistingAccount, setHasExistingAccount] = useState(false);

  // 画像アップロードフック
  const {
    imagePreviews,
    existingImages,
    setExistingImages,
    handleImageSelect,
    handleRemoveImage,
    handleRemoveExistingImage,
    uploadImages,
  } = useImageUpload({ maxImages: 3 });

  // 定休日チェックボックス用
  const [selectedHolidays, setSelectedHolidays] = useState<string[]>([]);

  // バリデーションフック
  const { validateField } = useShopValidation({
    formData,
    touchedFields,
    isEdit,
    setValidationErrors,
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 並列実行可能なAPIリクエストを準備
        const promises: Promise<unknown>[] = [];

        // 事業者アカウントの場合、自分の事業者情報を取得
        let myMerchantPromise: Promise<unknown> | null = null;
        if (isMerchantAccount) {
          myMerchantPromise = apiClient.getMyMerchant();
          promises.push(myMerchantPromise);
        }

        // 加盟店一覧を取得（adminアカウントの場合のみ）
        let merchantsPromise: Promise<unknown> | null = null;
        if (isAdminAccount) {
          merchantsPromise = apiClient.getMerchants();
          promises.push(merchantsPromise);
        }

        // ジャンル一覧と利用シーン一覧を並列取得
        const genresPromise = apiClient.getGenres();
        const scenesPromise = apiClient.getScenes();
        promises.push(genresPromise, scenesPromise);

        // 編集モードの場合は店舗データも並列取得
        let shopPromise: Promise<unknown> | null = null;
        if (isEdit && shopId) {
          shopPromise = apiClient.getShop(shopId);
          promises.push(shopPromise);
        }

        // すべてのAPIリクエストを並列実行
        // Promise.allSettledを使用して、一部のリクエストが失敗しても他のリクエストは続行
        const results = await Promise.allSettled(promises);
        if (!isMounted) return;

        // 結果を処理
        let resultIndex = 0;
        let merchantsArray: Merchant[] = [];

        // 事業者アカウントの場合
        if (isMerchantAccount && myMerchantPromise) {
          const result = results[resultIndex++];
          if (result.status === 'fulfilled') {
            const myMerchantData = result.value;
            if (myMerchantData && typeof myMerchantData === 'object' && 'data' in myMerchantData && myMerchantData.data) {
              const merchant = myMerchantData.data as Merchant;
              if (!merchantId) {
                setFormData((prev) => ({
                  ...prev,
                  merchantId: merchant.id,
                }));
              }
              setMerchantName(merchant.name);
              setMerchants([merchant]);
              setSelectedMerchantDetails(merchant);
            }
          } else {
            console.error('事業者情報の取得に失敗しました:', result.reason);
            showError('事業者情報の取得に失敗しました');
          }
        }

        // adminアカウントの場合
        if (isAdminAccount && merchantsPromise) {
          const result = results[resultIndex++];
          if (result.status === 'fulfilled') {
            const merchantsData = result.value;
            if (Array.isArray(merchantsData)) {
              merchantsArray = merchantsData as Merchant[];
            } else if (merchantsData && typeof merchantsData === 'object') {
              if ('data' in merchantsData && merchantsData.data && typeof merchantsData.data === 'object' && 'merchants' in merchantsData.data) {
                merchantsArray = ((merchantsData.data as { merchants: Merchant[] }).merchants || []) as Merchant[];
              } else if ('merchants' in merchantsData) {
                merchantsArray = ((merchantsData as { merchants: Merchant[] }).merchants || []) as Merchant[];
              }
            }
            setMerchants(merchantsArray);
          } else {
            console.error('加盟店一覧の取得に失敗しました:', result.reason);
            showError('加盟店一覧の取得に失敗しました');
          }
        }

        // ジャンル一覧を処理
        const genresResult = results[resultIndex++];
        if (genresResult.status === 'fulfilled') {
          const genresData = genresResult.value;
          const genresArray = Array.isArray(genresData) ? genresData : (genresData as { genres: unknown[] }).genres || [];
          setGenres(genresArray);
        } else {
          console.error('ジャンル一覧の取得に失敗しました:', genresResult.reason);
          showError('ジャンル一覧の取得に失敗しました');
        }

        // 利用シーン一覧を処理
        const scenesResult = results[resultIndex++];
        if (scenesResult.status === 'fulfilled') {
          const scenesData = scenesResult.value;
          const scenesArray = Array.isArray(scenesData) ? scenesData : (scenesData as { scenes: unknown[] }).scenes || [];
          setScenes(scenesArray);
        } else {
          console.error('利用シーン一覧の取得に失敗しました:', scenesResult.reason);
          showError('利用シーン一覧の取得に失敗しました');
        }

        // 編集モードの場合は店舗データを処理
        if (isEdit && isMounted && shopId && shopPromise) {
          const shopResult = results[resultIndex++];
          if (shopResult.status !== 'fulfilled') {
            throw new Error('店舗データの取得に失敗しました');
          }
          // APIレスポンスが { data: ... } 形式の場合とそうでない場合に対応
          const rawShopData = shopResult.value as { data?: ShopDataResponse } | ShopDataResponse;
          const shopData = (rawShopData && typeof rawShopData === 'object' && 'data' in rawShopData && rawShopData.data)
            ? rawShopData.data
            : rawShopData as ShopDataResponse;

          if (isMounted) {
            // merchantIdがpropsで渡されている場合は上書きしない
            const finalMerchantId = merchantId || shopData.merchantId;

            // accountEmailが存在する場合、createAccountをtrueに設定
            const accountEmail = shopData.accountEmail;
            setHasExistingAccount(!!accountEmail); // 既存アカウントの有無を記録
            setOriginalAccountEmail(accountEmail ?? null);

            // paymentAppsからmydigiの値を取得（後方互換性: paymentMydigiも参照）
            // APIレスポンスが文字列の場合はパースする
            const rawPaymentApps = (shopData as { paymentApps?: Record<string, boolean> | string }).paymentApps;
            const paymentAppsData = typeof rawPaymentApps === 'string' 
              ? (() => { try { return JSON.parse(rawPaymentApps); } catch { return null; } })()
              : rawPaymentApps;
            const paymentMydigiValue = paymentAppsData?.mydigi ?? shopData.paymentMydigi ?? false;
            console.log('🔍 ShopForm - paymentApps loading:', { rawPaymentApps, paymentAppsData, paymentMydigiValue });

            setFormData({
              ...shopData,
              merchantId: finalMerchantId,
              createAccount: !!accountEmail, // accountEmailが存在する場合はcreateAccountをtrueに
              // latitude/longitudeを文字列に変換
              latitude: shopData.latitude ? String(shopData.latitude) : '',
              longitude: shopData.longitude ? String(shopData.longitude) : '',
              // paymentAppsからpaymentMydigiを設定
              paymentMydigi: paymentMydigiValue,
            });

            // 編集モード時は必須フィールドを最初から touched として設定
            // これにより、初期値を削除した際にエラーメッセージが表示される
            setTouchedFields({
              name: true,
              accountEmail: !!accountEmail, // アカウント発行時のみ
              phone: true,
              postalCode: true,
            });

            // 加盟店名を設定（APIレスポンスから直接取得）
            const merchantFromShop = shopData.merchant;

            if (merchantFromShop?.name) {
              // APIレスポンスにmerchant情報が含まれている場合はそれを使用
              setMerchantName(merchantFromShop.name);
            } else {
              // fallback: merchants配列から検索
              const merchant = merchantsArray.find((m) => m.id === finalMerchantId);
              if (merchant) {
                setMerchantName(merchant.name);
              }
            }

            // 既存画像の設定
            if (shopData.images && Array.isArray(shopData.images)) {
              const validImages = shopData.images.filter((img) => img && typeof img === 'string' && img.length > 0);
              setExistingImages(validImages);
            }

            // クレジットカードブランドの設定（JSON形式から読み込み）
            const shopDataWithPayment = shopData as ShopCreateRequest & { paymentCredit?: { brands: string[]; other?: string }; paymentCode?: string };
            const creditValue = shopDataWithPayment.paymentCredit;
            if (creditValue) {
              // JSONオブジェクトとして扱う
              if (typeof creditValue === 'object' && creditValue.brands) {
                const brands = [...creditValue.brands];
                if (creditValue.other) {
                  brands.push('その他');
                  setCustomCreditText(creditValue.other);
                }
                setSelectedCreditBrands(brands);
              } else if (typeof creditValue === 'string') {
                // 旧形式（カンマ区切り）のフォールバック
                const brands = creditValue.split(',').map((b: string) => b.trim());
                setSelectedCreditBrands(brands);
              }
            }

            // QRコード決済の設定（JSON形式から読み込み）
            const qrValue = shopDataWithPayment.paymentCode;
            if (qrValue) {
              // JSONオブジェクトとして扱う
              if (typeof qrValue === 'object' && qrValue.services) {
                const services = [...qrValue.services];
                if (qrValue.other) {
                  services.push('その他');
                  setCustomQrText(qrValue.other);
                }
                setSelectedQrBrands(services);
              } else if (typeof qrValue === 'string') {
                // 旧形式（カンマ区切り）のフォールバック
                const services = qrValue.split(',').map((s: string) => s.trim());
                setSelectedQrBrands(services);
              }
            }

            // 定休日の設定
            const holidaysValue = (shopData as ShopCreateRequest).holidays;
            if (holidaysValue && holidaysValue.trim()) {
              setSelectedHolidays(holidaysValue.split(',').map(h => h.trim()));
            }

            // 利用シーンの設定
            const shopDataWithScenes = shopData as ShopCreateRequest & { sceneIds?: string[]; customSceneText?: string };
            if (shopDataWithScenes.sceneIds && Array.isArray(shopDataWithScenes.sceneIds)) {
              setSelectedScenes(shopDataWithScenes.sceneIds);
            }

            // カスタム利用シーンテキストの設定
            if (shopDataWithScenes.customSceneText) {
              setCustomSceneText(shopDataWithScenes.customSceneText);
            }

            // フォームの基本データが取得できたので、すぐにフォームを表示
            if (isMounted) {
              setIsLoading(false);
            }
          }
        } else if (merchantId && merchantsArray.length > 0 && isMounted) {
          // 新規作成モードで加盟店が指定されている場合
          const merchant = merchantsArray.find(m => m.id === merchantId);
          if (merchant) {
            setMerchantName(merchant.name);
          }
          // 新規作成モードでもフォームを表示
          if (isMounted) {
            setIsLoading(false);
          }
        } else {
          // 新規作成モード（merchantId未指定）でもフォームを表示
          if (isMounted) {
            setIsLoading(false);
          }
        }

        // 既存店舗のメールアドレスを収集（重複チェック用、非同期、フォーム表示をブロックしない）
        // 注: フォーム送信時にAPI側でチェックされるため、初回表示時には不要だが、
        // リアルタイムバリデーションのために非同期で取得
        (async () => {
          try {
            const shopsResponse = await apiClient.getShops('limit=1000');
            if (isMounted) {
              setExistingAccountEmails(collectAccountEmailEntries(shopsResponse));
            }
          } catch (_error) {
            // 重複チェック用のデータ取得に失敗した場合はスキップ（API側で弾かれるため）
          }
        })();
      } catch (err: unknown) {
        // アボート時のエラーは無視
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        if (isMounted) {
          setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
          showError('データの取得に失敗しました');
          setIsLoading(false);
        }
      }
    };

    fetchData();

    // クリーンアップ: コンポーネントのアンマウント時または再実行時にリクエストをキャンセル
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [shopId, isEdit, merchantId, showError, isMerchantAccount, isAdminAccount]);

  // formData.merchantIdが変更されたときに加盟店名とselectedMerchantDetailsを更新
  useEffect(() => {
    if (formData.merchantId && merchants.length > 0) {
      const merchant = merchants.find(m => m.id === formData.merchantId) as Merchant;
      if (merchant) {
        setMerchantName(merchant.name);
        setSelectedMerchantDetails(merchant);
      }
    }
  }, [formData.merchantId, merchants]);

  // 加盟店選択ハンドラー
  const handleMerchantSelect = async (merchant: Merchant) => {
    setFormData(prev => ({
      ...prev,
      merchantId: merchant.id,
    }));
    setMerchantName(merchant.name);

    // 事業者を選択したことを記録
    setTouchedFields(prev => ({
      ...prev,
      merchantId: true,
    }));

    // 事業者選択時のバリデーションエラーをクリア
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.merchantId;
      return newErrors;
    });

    setIsMerchantModalOpen(false);

    // 選択した事業者がmerchants配列に存在する場合はその情報を使用
    const existingMerchant = merchants.find(m => m.id === merchant.id);
    if (existingMerchant) {
      setSelectedMerchantDetails(existingMerchant);
    } else {
      // 存在しない場合は詳細情報を取得
      try {
        const response = await apiClient.getMerchant(merchant.id) as { data?: Merchant } | Merchant;
        // APIレスポンスが { data: ... } 形式の場合とそうでない場合に対応
        const merchantDetails = (response && typeof response === 'object' && 'data' in response && response.data)
          ? response.data as Merchant
          : response as Merchant;
        if (merchantDetails && merchantDetails.id) {
          setSelectedMerchantDetails(merchantDetails);
          setMerchants(prev => [...prev, merchantDetails]);
        }
      } catch (error) {
        console.error('事業者詳細の取得に失敗しました:', error);
      }
    }
  };

  // 親事業者からコピー機能
  const handleCopyFromMerchant = () => {
    // selectedMerchantDetailsを優先的に使用し、なければmerchants配列から検索
    const merchant = selectedMerchantDetails?.id === formData.merchantId
      ? selectedMerchantDetails
      : merchants.find(m => m.id === formData.merchantId);
    
    if (merchant) {
      setFormData(prev => ({
        ...prev,
        // 店舗名（事業者名をそのまま使用）
        name: merchant.name,
        // 店舗名（カナ）
        nameKana: merchant.nameKana || '',
        // 電話番号
        phone: merchant.representativePhone || '',
        // 郵便番号
        postalCode: merchant.postalCode || '',
        // 都道府県
        prefecture: merchant.prefecture || '',
        // 市区町村
        city: merchant.city || '',
        // 番地以降
        address1: merchant.address1 || '',
        // 建物名
        address2: merchant.address2 || ''
      }));
    }
  };

  const handleInputChange = (field: keyof ExtendedShopCreateRequest, value: string | number | boolean) => {
    // 更新されたformDataを作成（バリデーション用）
    const updatedFormData = {
      ...formData,
      [field]: value,
    };

    // フィールドが触られたことを記録（常に更新）
    const updatedTouchedFields = {
      ...touchedFields,
      [field]: true,
    };

    setFormData(updatedFormData);
    setTouchedFields(updatedTouchedFields);

    // 更新されたformDataとtouchedFieldsを使ってバリデーションを実行
    validateField(field, value, updatedFormData, updatedTouchedFields);
  };

  // onBlurイベントハンドラー（フィールドが触られたことを記録してバリデーション実行）
  const handleFieldBlur = (field: keyof ExtendedShopCreateRequest, value: string | boolean | number | undefined) => {
    // フィールドが触られたことを記録
    const updatedTouchedFields = {
      ...touchedFields,
      [field]: true,
    };

    setTouchedFields(updatedTouchedFields);

    // バリデーション実行（最新のformDataとtouchedFieldsを使用）
    validateField(field, value, formData, updatedTouchedFields);
  };

  // 郵便番号から住所を検索（zipcloud API使用）
  const handleZipcodeSearch = async () => {
    await searchAddress(formData.postalCode);
  };

  // 緯度経度の貼り付けハンドラー（カンマ区切り対応）
  const handleCoordinatesPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');

    // カンマが含まれている場合は緯度経度として処理
    if (pastedText.includes(',')) {
      e.preventDefault(); // デフォルトの貼り付け動作を防ぐ
      
      const parts = pastedText.split(',').map(part => part.trim());
      if (parts.length === 2) {
        const [lat, lng] = parts;
        setFormData({
          ...formData,
          latitude: lat,
          longitude: lng
        });

        // 自動入力されたフィールドのバリデーションエラーをクリア
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.latitude;
          delete newErrors.longitude;
          return newErrors;
        });

        showSuccess('緯度経度を設定しました');
      }
    }
    // カンマがない場合は通常の貼り付け動作
  };

  // Google Mapで住所を開く（手動で緯度経度を確認）
  const openGoogleMapsForAddress = () => {
    const latitude = formData.latitude ? String(formData.latitude).trim() : '';
    const longitude = formData.longitude ? String(formData.longitude).trim() : '';

    // 緯度経度が両方入力されている場合は座標でピンを表示（最大ズーム）
    if (latitude && longitude) {
      // 複数の方法を試して最大ズームレベルで表示
      const url = `https://www.google.com/maps/@${latitude},${longitude},21z/data=!3m1!1e3`;
      window.open(url, '_blank', 'noopener,noreferrer');
      showSuccess('Google Mapで座標のピンを最大ズームで表示しました。');
      return;
    }

    // 緯度経度がない場合は住所で検索（最大ズーム）
    const _postalCode = formData.postalCode?.trim();
    const prefecture = formData.prefecture?.trim();
    const city = formData.city?.trim();
    const address1 = formData.address1?.trim();
    const address2 = formData.address2?.trim();

    if (!prefecture && !city && !address1) {
      showError('住所または緯度経度を入力してください');
      return;
    }

    // 住所を構築（郵便番号も含める）
    const addressParts = [
      _postalCode ? `〒${_postalCode}` : '',
      prefecture,
      city,
      address1,
      address2,
    ].filter(Boolean);
    
    const address = addressParts.join(' ');

    // Google Mapsで住所検索を開く（検索ボックスに入力された状態、最大ズーム）
    // 住所検索専用のURL形式を使用
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}&zoom=21`;
    window.open(url, '_blank', 'noopener,noreferrer');

    showSuccess('Google Mapを最大ズームで開きました。住所が自動的に検索されます。');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // 送信前の総合バリデーション
      // クレジットカードとQRコードをJSON形式に変換
      const isCreditOtherSelected = selectedCreditBrands.includes('その他');
      const isQrOtherSelected = selectedQrBrands.includes('その他');

      // 「その他」シーンの選択状態を確認
      const otherScene = scenes.find(s => s.name === 'その他');
      const isOtherSceneSelected = otherScene && selectedScenes.includes(otherScene.id);
      
      const paymentCreditJson = selectedCreditBrands.length > 0 ? {
        brands: selectedCreditBrands.filter(b => b !== 'その他'),
        ...(isCreditOtherSelected && customCreditText && { other: customCreditText })
      } : null;
      
      const paymentCodeJson = selectedQrBrands.length > 0 ? {
        services: selectedQrBrands.filter(s => s !== 'その他'),
        ...(isQrOtherSelected && customQrText && { other: customQrText })
      } : null;
      
      const dataToValidate = {
        ...formData,
        // 空文字列の場合はnullに変換（zodのバリデーションに対応）
        accountEmail: formData.accountEmail || null,
        holidays: selectedHolidays.join(','),
        paymentCredit: paymentCreditJson,
        paymentCode: paymentCodeJson,
        // クーポン利用時間の空文字列をnullに変換
        couponUsageStart: formData.couponUsageStart && formData.couponUsageStart.trim() !== '' ? formData.couponUsageStart : null,
        couponUsageEnd: formData.couponUsageEnd && formData.couponUsageEnd.trim() !== '' ? formData.couponUsageEnd : null,
      };

      // Submit時は全フィールドのカスタムバリデーションを実行
      const customErrors: Record<string, string> = {};

      // 店舗名
      if (!formData.name || formData.name.trim().length === 0) {
        customErrors.name = '店舗名は必須です';
      } else if (formData.name.length > 100) {
        customErrors.name = '店舗名は100文字以内で入力してください';
      }

      // 店舗名（カナ）
      if (formData.nameKana && formData.nameKana.length > 100) {
        customErrors.nameKana = '店舗名（カナ）は100文字以内で入力してください';
      } else if (formData.nameKana && formData.nameKana.trim().length > 0 && !isValidKana(formData.nameKana)) {
        customErrors.nameKana = '店舗名（カナ）は全角カタカナで入力してください';
      }

      // 電話番号
      if (!formData.phone || formData.phone.trim().length === 0) {
        customErrors.phone = '電話番号は必須です';
      } else if (!isValidPhone(formData.phone)) {
        customErrors.phone = '有効な電話番号を入力してください（10-11桁の数字）';
      }

      // 郵便番号
      if (!formData.postalCode || formData.postalCode.trim().length === 0) {
        customErrors.postalCode = '郵便番号は必須です';
      } else if (!isValidPostalCode(formData.postalCode)) {
        customErrors.postalCode = '郵便番号は7桁の数字で入力してください';
      }

      // 都道府県
      if (!formData.prefecture || formData.prefecture.trim().length === 0) {
        customErrors.prefecture = '都道府県を選択してください';
      }

      // 市区町村
      if (!formData.city || formData.city.trim().length === 0) {
        customErrors.city = '市区町村は必須です';
      }

      // 番地以降
      if (!formData.address1 || formData.address1.trim().length === 0) {
        customErrors.address1 = '番地以降は必須です';
      }

      // 緯度
      if (!formData.latitude || String(formData.latitude).trim().length === 0) {
        customErrors.latitude = '緯度は必須です';
      }

      // 経度
      if (!formData.longitude || String(formData.longitude).trim().length === 0) {
        customErrors.longitude = '経度は必須です';
      }

      // ジャンル
      if (!formData.genreId || formData.genreId.trim().length === 0) {
        customErrors.genreId = 'ジャンルを選択してください';
      }

      // 喫煙タイプ
      if (!formData.smokingType || String(formData.smokingType).trim().length === 0) {
        customErrors.smokingType = '喫煙タイプを選択してください';
      }

      // 事業者（管理者アカウントの場合のみ）
      if (!isMerchantAccount && (!formData.merchantId || formData.merchantId.trim().length === 0)) {
        customErrors.merchantId = '事業者を選択してください';
      }

      // クーポン利用時間（任意・開始と終了はセットで入力）
      const hasCouponStart = !!(formData.couponUsageStart && formData.couponUsageStart.trim().length > 0);
      const hasCouponEnd = !!(formData.couponUsageEnd && formData.couponUsageEnd.trim().length > 0);
      if (hasCouponStart && !hasCouponEnd) {
        customErrors.couponUsageEnd = 'クーポン利用時間の終了時刻を入力してください';
      } else if (!hasCouponStart && hasCouponEnd) {
        customErrors.couponUsageStart = 'クーポン利用時間の開始時刻を入力してください';
      }

      // アカウント情報（アカウント発行時のみ）
      if (formData.createAccount) {
        const trimmedAccountEmail = formData.accountEmail?.trim() ?? '';
        if (trimmedAccountEmail.length === 0) {
          customErrors.accountEmail = 'メールアドレスは必須です';
        } else if (!isValidEmail(trimmedAccountEmail)) {
          customErrors.accountEmail = '有効なメールアドレスを入力してください';
        } else if (isAccountEmailDuplicate(trimmedAccountEmail) && trimmedAccountEmail.toLowerCase() !== (originalAccountEmail ?? '').toLowerCase()) {
          customErrors.accountEmail = 'このメールアドレスは既に使用されています';
        }

        // 新規登録時のみパスワード必須
        if (!isEdit && (!formData.password || formData.password.trim().length === 0)) {
          customErrors.password = 'パスワードは必須です';
        } else if (!isEdit && formData.password && formData.password.length < 8) {
          customErrors.password = 'パスワードは8文字以上で入力してください';
        }
      }

      // 説明文
      if (formData.description && formData.description.length > 500) {
        customErrors.description = '店舗紹介説明は500文字以内で入力してください';
      }

      // 詳細情報
      if (formData.details && formData.details.length > 1000) {
        customErrors.details = '詳細情報は1000文字以内で入力してください';
      }

      // クレジットカード「その他」のテキストボックス必須チェック
      if (isCreditOtherSelected && (!customCreditText || customCreditText.trim().length === 0)) {
        customErrors.customCreditText = 'その他のクレジットカードブランド名を入力してください';
      } else if (isCreditOtherSelected && customCreditText && customCreditText.length > 100) {
        customErrors.customCreditText = 'その他のクレジットカードブランド名は100文字以内で入力してください';
      }

      // QRコード「その他」のテキストボックス必須チェック
      if (isQrOtherSelected && (!customQrText || customQrText.trim().length === 0)) {
        customErrors.customQrText = 'その他のQRコード決済サービス名を入力してください';
      } else if (isQrOtherSelected && customQrText && customQrText.length > 100) {
        customErrors.customQrText = 'その他のQRコード決済サービス名は100文字以内で入力してください';
      }

      // 利用シーン「その他」のテキストボックス必須チェック
      if (isOtherSceneSelected && (!customSceneText || customSceneText.trim().length === 0)) {
        customErrors.customSceneText = '具体的な利用シーンを入力してください';
      } else if (isOtherSceneSelected && customSceneText && customSceneText.length > 100) {
        customErrors.customSceneText = '具体的な利用シーンは100文字以内で入力してください';
      }

      // カスタムエラーがある場合は表示して終了
      if (Object.keys(customErrors).length > 0) {
        // エラーをstateに設定
        setValidationErrors(customErrors);
        showError('入力内容に誤りがあります。各項目を確認してください。');
        setIsSubmitting(false);

        // エラー設定後、次のレンダリングサイクルでスクロール
        setTimeout(() => {
          // 最初のエラー項目にスクロール
          const firstErrorField = Object.keys(customErrors)[0];
          if (firstErrorField) {
            // フィールド名から対応するinput要素を探す
            const errorElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
            if (errorElement) {
              // input要素の親要素（ラベルを含むコンテナ）を見つけてスクロール
              const fieldContainer = errorElement.closest('div') as HTMLElement;
              if (fieldContainer) {
                fieldContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              // フォーカスはinput要素に当てる
              errorElement.focus();
            } else {
              // name属性がない場合は、idやdata属性で検索
              const errorSection = document.querySelector(`[data-field="${firstErrorField}"]`) as HTMLElement;
              if (errorSection) {
                errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        }, 100);

        return;
      }

      // Zodバリデーションも実行（追加チェック用）
      const schema = isEdit ? shopUpdateRequestSchema : shopCreateRequestSchema;

      // アカウント発行が無効な場合はパスワードフィールドを除外
      let dataForZodValidation: ExtendedShopCreateRequest & { applications?: string[] } = { ...dataToValidate } as ExtendedShopCreateRequest & { applications?: string[] };
      // applications はZodチェック前に除去（後で送信データに 'tamanomi' を設定）
      if ('applications' in dataForZodValidation) {
        delete (dataForZodValidation as Record<string, unknown>).applications;
      }
      if (!formData.createAccount) {
        const { password: _password, ...rest } = dataForZodValidation;
        dataForZodValidation = { ...rest, accountEmail: null };
      }

      const validationResult = schema.safeParse(dataForZodValidation);

      if (!validationResult.success) {
        const zodErrors: Record<string, string> = {};
        validationResult.error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!zodErrors[path]) {
            zodErrors[path] = err.message;
          }
        });

        setValidationErrors(zodErrors);
        showError('入力内容に誤りがあります。各項目を確認してください。');
        setIsSubmitting(false);

        return;
      }

      let uploadedImageUrls: string[] = [];

      // 編集時のみ画像を先にアップロード
      if (isEdit && shopId) {
        // merchantIdが設定されていることを確認
        if (!formData.merchantId || formData.merchantId.trim() === '') {
          throw new Error('事業者IDが設定されていません。画像をアップロードできません。');
        }
        uploadedImageUrls = await uploadImages(shopId, formData.merchantId);
      }

      // 住所フィールドを結合
      const fullAddress = [
        formData.prefecture,
        formData.city,
        formData.address1,
        formData.address2
      ].filter(Boolean).join('');
      
      // 画像URLを結合（既存画像 + 新規アップロード画像）
      const allImageUrls = [...existingImages, ...uploadedImageUrls];
      // 画面上の既存画像も即時更新（古い世代で404になるのを避ける）
      if (uploadedImageUrls.length > 0) {
        setExistingImages(allImageUrls);
      }
      // アカウントメールの設定
      let accountEmail: string | null | undefined;
      if (formData.createAccount) {
        // アカウント発行チェックがONの場合
        accountEmail = formData.accountEmail || null;
      } else {
        // アカウント発行チェックがOFFの場合はnullに設定（アカウント無効化）
        accountEmail = null;
      }

      // クレジットカードとQRコードをJSON形式で送信データに追加
      // 空文字はnullに正規化（未入力と区別し、明示的にDBをクリアできるようにする）
      const normalizedHomepageUrl = (formData.homepageUrl && formData.homepageUrl.trim() !== '') ? formData.homepageUrl.trim() : null;
      const normalizedCouponStart = (formData.couponUsageStart && formData.couponUsageStart !== '') ? formData.couponUsageStart : null;
      const normalizedCouponEnd = (formData.couponUsageEnd && formData.couponUsageEnd !== '') ? formData.couponUsageEnd : null;
      const normalizedCouponDays = (formData.couponUsageDays && formData.couponUsageDays.trim() !== '') ? formData.couponUsageDays.trim() : null;

      const submitData = {
        ...formData,
        accountEmail,
        address: fullAddress,  // 結合した住所
        // latitude/longitudeを文字列に変換
        latitude: formData.latitude ? (isEdit ? Number(formData.latitude) : String(formData.latitude)) : undefined,
        longitude: formData.longitude ? (isEdit ? Number(formData.longitude) : String(formData.longitude)) : undefined,
        images: allImageUrls,  // 画像削除時にも空配列を送信
        holidays: selectedHolidays.join(','),
        sceneIds: selectedScenes,  // 利用シーンの配列を追加
        customSceneText: isOtherSceneSelected ? customSceneText : undefined,  // 「その他」選択時のみ送信
        paymentCredit: paymentCreditJson,
        paymentCode: paymentCodeJson,
        // paymentApps: mydigi用の決済方法をJSON形式で送信
        paymentApps: { mydigi: formData.paymentMydigi ?? false },
        homepageUrl: normalizedHomepageUrl,
        couponUsageStart: normalizedCouponStart,
        couponUsageEnd: normalizedCouponEnd,
        couponUsageDays: normalizedCouponDays,
      };

      if (isEdit && shopId) {
        // 編集時：merchantIdが設定されていることを確認
        if (!formData.merchantId || formData.merchantId.trim() === '') {
          throw new Error('事業者IDが設定されていません');
        }

        await apiClient.updateShop(shopId, submitData);
        // 遷移先でトーストを表示するため、ここではshowSuccessを呼ばない
      } else {
        // 新規作成時は店舗を先に作成
        const createdShop = await apiClient.createShop(submitData) as { id: string; merchantId: string };
        
        // 作成された店舗のIDを使って画像をアップロード
        // merchantIdはcreatedShopから取得（formData.merchantIdが空の場合でも対応）
        const targetMerchantId = createdShop?.merchantId || formData.merchantId;

        if (imagePreviews.length > 0 && createdShop?.id) {
          if (!targetMerchantId || targetMerchantId.trim() === '') {
            throw new Error('事業者IDが設定されていません。画像をアップロードできません。');
          }

          const newUploadedImageUrls = await uploadImages(createdShop.id, targetMerchantId);

          // 画像をアップロードした場合は店舗を更新
          if (newUploadedImageUrls.length > 0) {
            await apiClient.updateShop(createdShop.id, {
              images: newUploadedImageUrls,
            });
          }
        }

        // 遷移先でトーストを表示するため、ここではshowSuccessを呼ばない
      }

      // リダイレクト先を決定（トーストメッセージをクエリパラメータで渡す）
      const toastMessage = isEdit ? '店舗を更新しました' : '店舗を作成しました';
      const separator = fallbackRedirect.includes('?') ? '&' : '?';
      router.push(`${fallbackRedirect}${separator}toast=${encodeURIComponent(toastMessage)}`);
    } catch (err: unknown) {
      const error = err as Error & {
        response?: {
          status?: number;
          data?: { message?: string } | null;
        };
      };

      const isConflict = error?.response?.status === 409;
      const conflictMessage =
        error?.response?.data && typeof error.response.data === 'object'
          ? (error.response.data as { message?: string }).message
          : undefined;

      if (isConflict) {
        const message = conflictMessage || error?.message || 'このメールアドレスは既に使用されています';
        setTouchedFields((prev) => ({
          ...prev,
          accountEmail: true,
        }));
        setValidationErrors((prev) => ({
          ...prev,
          accountEmail: message,
        }));
        showError(message);
      } else {
        showError(isEdit ? '店舗更新に失敗しました' : '店舗作成に失敗しました');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // 管理者または店舗アカウントの場合は店舗一覧にリダイレクト
    if (isAdminAccount || isShopAccount) {
      router.push(fallbackRedirect);
      return;
    }

    router.push(fallbackRedirect);
  };

  // QRコードを取得する関数（ボタン押下時のみ実行）
  const handleLoadQrCode = async () => {
    if (!shopId) return;

    try {
      setQrCodeLoading(true);
      const qrCodeData = await apiClient.getShopQrCodeUrl(shopId);
      if (qrCodeData && typeof qrCodeData === 'object' && 'qr_code_url' in qrCodeData) {
        setQrCodeUrl((qrCodeData as { qr_code_url: string }).qr_code_url);
      }
    } catch (error) {
      console.error('QRコードURL取得エラー:', error);
      showError('QRコードの取得に失敗しました');
    } finally {
      setQrCodeLoading(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-600">{error}</div>
          <Button variant="secondary" onClick={handleCancel} className="mt-4">
            店舗一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* 加盟店選択モーダル */}
      <MerchantSelectModal
        isOpen={isMerchantModalOpen}
        onClose={() => setIsMerchantModalOpen(false)}
        onSelect={handleMerchantSelect}
        selectedMerchantId={formData.merchantId}
      />

      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '店舗編集' : '新規店舗登録'}
        </h1>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-500">データを読み込み中...</p>
          </div>
        </div>
      ) : (
      <form 
        noValidate
        onSubmit={(e) => {
          handleSubmit(e);
        }} 
        className="space-y-6"
      >
        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <div className="space-y-4">
            {/* shopアカウントの場合は事業者名セクションを非表示 */}
            {!isShopAccount && (
            <div className="w-full" data-field="merchantId">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                事業者名 <span className="text-red-500">*</span>
              </label>
              {isMerchantAccount ? (
                // 事業者アカウントの場合は事業者名を固定表示（親事業者からコピーボタン付き）
                <div>
                  <div className="text-gray-900 mb-2">
                    {merchantName || '読み込み中...'}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyFromMerchant}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    親事業者からコピー
                  </button>
                </div>
              ) : (propMerchantId || merchantIdFromParams) ? (
                <div>
                  <div className="text-gray-900 mb-2">
                    {merchantName || '読み込み中...'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMerchantModalOpen(true)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                      title="事業者を変更"
                    >
                      事業者を変更
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyFromMerchant}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      親事業者からコピー
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {merchantName ? (
                    <div>
                      <div className="text-gray-900 mb-2">
                        {merchantName}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsMerchantModalOpen(true)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                          title="事業者を変更"
                        >
                          事業者を変更
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyFromMerchant}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          親事業者からコピー
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMerchantModalOpen(true);
                          // モーダルを開いたことをタッチとして記録
                          setTouchedFields(prev => ({
                            ...prev,
                            merchantId: true,
                          }));
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                        title="事業者を選択"
                      >
                        事業者を選択
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyFromMerchant}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        親事業者からコピー
                      </button>
                    </div>
                  )}
                  <ErrorMessage message={validationErrors.merchantId} />
                </div>
              )}
            </div>
            )}

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={(e) => handleFieldBlur('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.name 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                maxLength={100}
                required
              />
              <ErrorMessage message={validationErrors.name} field="name" />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {formData.name.length} / 100文字
              </p>
            </div>

            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗名（カナ）
              </label>
              <input
                type="text"
                name="nameKana"
                value={formData.nameKana}
                onChange={(e) => handleInputChange('nameKana', e.target.value)}
                onBlur={(e) => handleFieldBlur('nameKana', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.nameKana 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                maxLength={100}
                placeholder="例: タマノミショクドウ"
              />
              <ErrorMessage message={validationErrors.nameKana} />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {(formData.nameKana || '').length} / 100文字
              </p>
            </div>

            <div className="w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  // 数値のみ許可
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  handleInputChange('phone', value);
                }}
                onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.phone 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
                placeholder="例: 0312345678（ハイフンなし）"
                maxLength={11}
              />
              <ErrorMessage message={validationErrors.phone} />
            </div>

            {/* 郵便番号と住所検索 */}
            <div className="flex gap-4">
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  郵便番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => {
                    // 数値のみ許可
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange('postalCode', value);
                  }}
                  onBlur={(e) => handleFieldBlur('postalCode', e.target.value)}
                  onKeyDown={(e) => {
                    // Enterキーが押された場合は住所検索を実行
                    if (e.key === 'Enter') {
                      e.preventDefault(); // フォーム送信を防ぐ
                      handleZipcodeSearch();
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    validationErrors.postalCode 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="1234567"
                  maxLength={7}
                  required
                />
                <ErrorMessage message={validationErrors.postalCode} />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleZipcodeSearch}
                  disabled={formData.postalCode.length !== 7 || isSearchingAddress}
                  className="w-32"
                >
                  {isSearchingAddress ? '検索中...' : '住所検索'}
                </Button>
              </div>
            </div>

            {/* 都道府県 */}
            <div className="w-60">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                都道府県 <span className="text-red-500">*</span>
              </label>
              <select
                name="prefecture"
                value={formData.prefecture}
                onChange={(e) => handleInputChange('prefecture', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.prefecture 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                required
              >
                <option value="">都道府県を選択</option>
                {PREFECTURES.map(pref => (
                  <option key={pref} value={pref}>{pref}</option>
                ))}
              </select>
              <ErrorMessage message={validationErrors.prefecture} />
            </div>

            {/* 市区町村 */}
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                市区町村 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.city 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="市区町村を入力してください"
                required
              />
              <ErrorMessage message={validationErrors.city} />
            </div>

            {/* 番地以降 */}
            <div className="max-w-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                番地以降 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address1"
                value={formData.address1}
                onChange={(e) => handleInputChange('address1', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.address1 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="番地以降を入力してください"
                required
              />
              <ErrorMessage message={validationErrors.address1} />
            </div>

            {/* 建物名 / 部屋番号 */}
            <div className="max-w-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                建物名 / 部屋番号
              </label>
              <input
                type="text"
                value={formData.address2}
                onChange={(e) => handleInputChange('address2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="建物名 / 部屋番号を入力してください（任意）"
              />
            </div>

            {/* 緯度・経度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                緯度・経度 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 items-start">
                <div className="w-48">
                  <input
                    type="text"
                    name="latitude"
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                    onBlur={(e) => handleFieldBlur('latitude', e.target.value)}
                    onPaste={handleCoordinatesPaste}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      validationErrors.latitude 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="緯度（例: 35.681236）"
                    required
                  />
                  <ErrorMessage message={validationErrors.latitude} field="latitude" />
                </div>
                <div className="w-48">
                  <input
                    type="text"
                    name="longitude"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    onBlur={(e) => handleFieldBlur('longitude', e.target.value)}
                    onPaste={handleCoordinatesPaste}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                      validationErrors.longitude 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="経度（例: 139.767125）"
                    required
                  />
                  <ErrorMessage message={validationErrors.longitude} field="longitude" />
                </div>
                <button
                  type="button"
                  onClick={openGoogleMapsForAddress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                >
                  地図で確認
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                <p className="font-semibold mb-1">座標取得手順：</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>「地図で確認」ボタンをクリック</li>
                  <li>Google Mapで<span className="font-semibold text-gray-700">検索ボタンをクリック</span>してピンを表示</li>
                  <li>地図上で場所を右クリック → 緯度経度をコピー</li>
                  <li>緯度または経度欄に貼り付け（カンマ区切りで自動的に分割されます）</li>
                </ol>
              </div>
              {formData.latitude && formData.longitude && (
                <div className="mt-2">
                  <a
                    href={`https://www.google.com/maps/@${formData.latitude},${formData.longitude},21z/data=!3m1!1e3`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    入力された座標をGoogle Mapで確認
                  </a>
                </div>
              )}
            </div>

            {/* ステータス（編集時のみ表示） */}
            {isEdit && (
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="registering">登録中</option>
                  <option value="collection_requested">情報収集依頼済み</option>
                  <option value="approval_pending">承認待ち</option>
                  <option value="promotional_materials_preparing">宣材準備中</option>
                  <option value="promotional_materials_shipping">宣材発送中</option>
                  <option value="operating">営業中</option>
                  <option value="suspended">停止中</option>
                  <option value="terminated">終了</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ジャンル */}
        <div className="bg-white rounded-lg shadow p-6" data-field="genreId">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ジャンル <span className="text-red-500">*</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {genres.map((genre) => (
              <label
                key={genre.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="genreId"
                  value={genre.id}
                  checked={formData.genreId === genre.id}
                  onChange={(e) => handleInputChange('genreId', e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  required
                />
                <span className="text-sm text-gray-700">{genre.name}</span>
              </label>
            ))}
          </div>
          <ErrorMessage message={validationErrors.genreId} field="genreId" />
        </div>

        {/* 利用シーン */}
        <SceneSelector
          scenes={scenes}
          selectedScenes={selectedScenes}
          customSceneText={customSceneText}
          validationErrors={validationErrors}
          onScenesChange={setSelectedScenes}
          onCustomTextChange={setCustomSceneText}
          onValidationErrorChange={(field, error) => {
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              if (error === null) {
                delete newErrors[field];
              } else {
                newErrors[field] = error;
              }
              return newErrors;
            });
          }}
        />

        {/* 店舗紹介・詳細情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">店舗紹介・詳細情報</h2>
          <div className="space-y-6">
            {/* 店舗紹介説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                店舗紹介説明
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                maxLength={500}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.description 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="例：アットホームな雰囲気の居酒屋です。新鮮な魚介類と地元の食材を使った料理が自慢です。"
              />
              <ErrorMessage message={validationErrors.description} />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {formData.description?.length || 0} / 500文字
              </p>
            </div>

            {/* 詳細情報 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                詳細情報
              </label>
              <textarea
                name="details"
                value={formData.details}
                onChange={(e) => handleInputChange('details', e.target.value)}
                rows={6}
                maxLength={1000}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.details 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="【営業時間】&#10;ランチ: 11:30-14:00（L.O. 13:30）&#10;ディナー: 17:00-23:00（L.O. 22:00）&#10;&#10;【予算】&#10;ランチ: ¥1,000〜¥1,500&#10;ディナー: ¥3,000〜¥5,000"
              />
              <ErrorMessage message={validationErrors.details} />
              <p className="mt-1 text-xs text-gray-500 text-right">
                {formData.details?.length || 0} / 1000文字
              </p>
            </div>

            {/* 定休日 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                定休日
              </label>
              <div className="flex flex-wrap gap-4">
                {WEEKDAYS.map((day) => (
                  <label key={day} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedHolidays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHolidays([...selectedHolidays, day]);
                        } else {
                          setSelectedHolidays(selectedHolidays.filter(h => h !== day));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{day === '祝日' ? day : `${day}曜日`}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ホームページURL（任意） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ホームページURL
              </label>
              <input
                type="url"
                name="homepageUrl"
                value={formData.homepageUrl || ''}
                onChange={(e) => handleInputChange('homepageUrl', e.target.value)}
                onBlur={(e) => handleFieldBlur('homepageUrl', e.target.value)}
                placeholder="https://example.com"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  validationErrors.homepageUrl 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              <ErrorMessage message={validationErrors.homepageUrl} field="homepageUrl" />
            </div>

            {/* クーポン利用時間（任意、開始・終了） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                クーポン利用時間
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  name="couponUsageStart"
                  value={formData.couponUsageStart || ''}
                  onChange={(e) => handleInputChange('couponUsageStart', e.target.value)}
                  onBlur={(e) => handleFieldBlur('couponUsageStart', e.target.value)}
                  className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    validationErrors.couponUsageStart 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                <span className="text-gray-500">〜</span>
                <input
                  type="time"
                  name="couponUsageEnd"
                  value={formData.couponUsageEnd || ''}
                  onChange={(e) => handleInputChange('couponUsageEnd', e.target.value)}
                  onBlur={(e) => handleFieldBlur('couponUsageEnd', e.target.value)}
                  className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    validationErrors.couponUsageEnd 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
              </div>
              {(validationErrors.couponUsageStart || validationErrors.couponUsageEnd) && (
                <ErrorMessage
                  message={validationErrors.couponUsageStart || validationErrors.couponUsageEnd}
                  field="couponUsage"
                />
              )}
              <p className="mt-1 text-xs text-gray-500">両方入力するか、両方未入力にしてください</p>
            </div>

            {/* クーポン利用可能曜日 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                クーポン利用可能曜日
              </label>
              <div className="flex flex-wrap gap-3">
                {WEEKDAYS.filter(d => d !== '祝日').map((day) => (
                  <label key={day} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.couponUsageDays?.includes(day) || false}
                      onChange={(e) => {
                        const current = formData.couponUsageDays?.split(',').filter(Boolean) || [];
                        const updated = e.target.checked
                          ? [...current, day]
                          : current.filter(d => d !== day);
                        handleInputChange('couponUsageDays', updated.join(','));
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{day}曜日</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500">クーポンを利用できる曜日を選択してください（任意）</p>
            </div>

            {/* 喫煙タイプ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                喫煙タイプ <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {SMOKING_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="smokingType"
                      value={opt.value}
                      checked={formData.smokingType === opt.value}
                      onChange={(e) => handleInputChange('smokingType', e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
              <ErrorMessage message={validationErrors.smokingType} field="smokingType" />
            </div>
          </div>
        </div>

        {/* 決済情報 */}
        <PaymentMethodSelector
          paymentCash={formData.paymentCash ?? false}
          paymentMydigi={formData.paymentMydigi ?? false}
          selectedCreditBrands={selectedCreditBrands}
          customCreditText={customCreditText}
          selectedQrBrands={selectedQrBrands}
          customQrText={customQrText}
          validationErrors={validationErrors}
          onPaymentChange={(field, value) => handleInputChange(field, value)}
          onCreditBrandsChange={setSelectedCreditBrands}
          onCreditTextChange={setCustomCreditText}
          onQrBrandsChange={setSelectedQrBrands}
          onQrTextChange={setCustomQrText}
          onValidationErrorChange={(field, error) => {
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              if (error === null) {
                delete newErrors[field];
              } else {
                newErrors[field] = error;
              }
              return newErrors;
            });
          }}
        />

        {/* 店舗画像 */}
        <ImageUploader
          imagePreviews={imagePreviews}
          existingImages={existingImages}
          maxImages={3}
          onImageSelect={handleImageSelect}
          onRemoveImage={handleRemoveImage}
          onRemoveExistingImage={handleRemoveExistingImage}
        />

        {/* QRコード表示（編集モードのみ） */}
        {isEdit && shopId && (
          <QRCodeGenerator
            qrCodeLoading={qrCodeLoading}
            qrCodeUrl={qrCodeUrl || ''}
            shopId={shopId}
            showSuccess={showSuccess}
            onLoadRequest={handleLoadQrCode}
          />
        )}

        {/* アカウント発行 / 店舗用アカウント情報 */}
        <AccountSection
          isEdit={isEdit}
          hasExistingAccount={hasExistingAccount}
          createAccount={formData.createAccount ?? false}
          accountEmail={formData.accountEmail || ''}
          password={formData.password || ''}
          validationErrors={validationErrors}
          onCreateAccountChange={(value) => handleInputChange('createAccount', value)}
          onAccountEmailChange={(value) => handleInputChange('accountEmail', value)}
          onPasswordChange={(value) => handleInputChange('password', value)}
          onValidationErrorChange={(field, error) => {
            setValidationErrors(prev => {
              const newErrors = { ...prev };
              if (error === null) {
                delete newErrors[field];
              } else {
                newErrors[field] = error;
              }
              return newErrors;
            });
          }}
          onFieldBlur={(field, value) => handleFieldBlur(field as keyof ExtendedShopCreateRequest, value)}
          // shopアカウントの場合はアカウント削除を非表示にする
          onDeleteAccountChange={isShopAccount ? undefined : (deleteAccount) => {
            if (deleteAccount) {
              handleInputChange('createAccount', false);
            }
          }}
        />

        {/* ボタン */}
        <div className="flex justify-center items-center">
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={handleCancel}>
              キャンセル
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
              onClick={() => {
                // Submit button clicked
              }}
            >
              {isSubmitting ? '保存中...' : (isEdit ? '更新' : '作成')}
            </Button>
          </div>
        </div>
      </form>
      )}
    </div>
  );
}
