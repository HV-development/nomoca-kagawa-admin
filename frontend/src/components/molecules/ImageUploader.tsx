'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';

interface ImagePreview {
  file: File;
  url: string;
}

interface ImageUploaderProps {
  imagePreviews: ImagePreview[];
  existingImages: string[];
  maxImages?: number;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onRemoveExistingImage: (index: number) => void;
}

function ImageUploader({
  imagePreviews,
  existingImages,
  maxImages = 3,
  onImageSelect,
  onRemoveImage,
  onRemoveExistingImage,
}: ImageUploaderProps) {
  const totalImages = useMemo(
    () => imagePreviews.length + existingImages.length,
    [imagePreviews.length, existingImages.length]
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">店舗画像（最大{maxImages}枚）</h2>
      
      <div className="space-y-4">
        {/* 既存の画像 */}
        {existingImages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {existingImages.map((imageUrl, index) => (
              <div key={`existing-${index}`} className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-md overflow-hidden border border-gray-300 bg-gray-100">
                <Image
                  src={imageUrl}
                  alt={`店舗画像 ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => onRemoveExistingImage(index)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors z-10"
                  title="画像を削除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 新規アップロード画像のプレビュー */}
        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={`preview-${index}`} className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-md overflow-hidden border border-gray-300 bg-gray-100">
                <Image
                  src={preview.url}
                  alt={`プレビュー ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors z-10"
                  title="画像を削除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 画像アップロードボタン */}
        {totalImages < maxImages && (
          <div>
            <input
              type="file"
              id="shop-image-upload"
              accept="image/*"
              multiple={maxImages > 1}
              onChange={onImageSelect}
              className="hidden"
            />
            <label
              htmlFor="shop-image-upload"
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              画像を追加（{totalImages}/{maxImages}）
            </label>
            <p className="mt-1 text-xs text-gray-500">
              画像形式：JPEG、PNG、WebP（推奨サイズ：1200x400px以上、推奨アスペクト比：4:3または16:9）
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ImageUploader);
