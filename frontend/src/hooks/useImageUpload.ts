import { useState, useCallback } from 'react';
import { compressImageFile } from '@/utils/imageUtils';
import { useToast } from '@/hooks/use-toast';

export interface ImagePreview {
  file: File;
  url: string;
}

interface UseImageUploadOptions {
  maxImages?: number;
  onUploadSuccess?: (urls: string[]) => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { maxImages = 3 } = options;
  const { showError } = useToast();
  
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    
    const totalImages = imagePreviews.length + existingImages.length + newFiles.length;

    if (totalImages > maxImages) {
      showError(`画像は最大${maxImages}枚までアップロードできます`);
      return;
    }

    const newPreviews: ImagePreview[] = [];
    newFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        showError('画像ファイルのみアップロード可能です');
        return;
      }

      const url = URL.createObjectURL(file);
      newPreviews.push({ file, url });
    });

    setImagePreviews([...imagePreviews, ...newPreviews]);
  }, [imagePreviews, existingImages.length, maxImages, showError]);

  const handleRemoveImage = useCallback((index: number) => {
    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index].url);
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  }, [imagePreviews]);

  const handleRemoveExistingImage = useCallback((index: number) => {
    const newExistingImages = [...existingImages];
    newExistingImages.splice(index, 1);
    setExistingImages(newExistingImages);
  }, [existingImages]);

  const uploadImages = useCallback(async (
    targetShopId: string,
    merchantId: string
  ): Promise<string[]> => {
    const uploadedImageUrls: string[] = [];
    
    if (imagePreviews.length > 0) {
      // 全画像で同じタイムスタンプを使用
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0];
      
      let index = 0;
      for (const preview of imagePreviews) {
        index++;
        
        const uploadFormData = new FormData();
        const fileForUpload = await compressImageFile(preview.file, {
          maxBytes: 9.5 * 1024 * 1024,
          maxWidth: 2560,
          maxHeight: 2560,
          initialQuality: 0.9,
          minQuality: 0.6,
          qualityStep: 0.1,
        });
        uploadFormData.append('image', fileForUpload);
        uploadFormData.append('type', 'shop');
        uploadFormData.append('merchantId', merchantId);
        uploadFormData.append('shopId', targetShopId);
        uploadFormData.append('timestamp', timestamp); // 全画像で同じタイムスタンプを使用
        
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
            credentials: 'include',
          });
          
          const result = await response.json();

          if (!response.ok) {
            const message = result?.error || result?.message || '画像のアップロードに失敗しました';
            console.error(`❌ Upload failed for image ${index}:`, response.status, result);
            throw new Error(message);
          }

          uploadedImageUrls.push(result.url);
        } catch (uploadErr) {
          const message = (() => {
            if (uploadErr instanceof Error && uploadErr.message) return uploadErr.message;
            if (typeof uploadErr === 'object' && uploadErr !== null && 'message' in uploadErr) {
              const value = (uploadErr as { message?: string }).message;
              if (typeof value === 'string' && value.trim()) return value;
            }
            return '画像のアップロードに失敗しました';
          })();
          console.error(`❌ Image upload failed for ${index}:`, uploadErr);
          showError(message);
          throw uploadErr;
        }
      }
    }
    return uploadedImageUrls;
  }, [imagePreviews, showError]);

  const clearPreviews = useCallback(() => {
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview.url));
    setImagePreviews([]);
  }, [imagePreviews]);

  return {
    imagePreviews,
    existingImages,
    setExistingImages,
    handleImageSelect,
    handleRemoveImage,
    handleRemoveExistingImage,
    uploadImages,
    clearPreviews,
  };
}



