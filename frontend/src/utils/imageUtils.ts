/**
 * 画像を圧縮（WebP変換 + リサイズ + 目標サイズまでクオリティ調整）
 */
export async function compressImageFile(
  sourceFile: File,
  options?: {
    maxBytes?: number; // 目標最大サイズ（バイト）
    maxWidth?: number;
    maxHeight?: number;
    initialQuality?: number; // 0.0 - 1.0
    minQuality?: number; // 0.0 - 1.0
    qualityStep?: number; // 品質の減衰量
  }
): Promise<File> {
  const {
    maxBytes = 9.5 * 1024 * 1024,
    maxWidth = 2560,
    maxHeight = 2560,
    initialQuality = 0.9,
    minQuality = 0.5,
    qualityStep = 0.1,
  } = options || {};

  // すでに十分小さい場合は変換せず返す
  if (sourceFile.size <= maxBytes && sourceFile.type === 'image/webp') {
    return sourceFile;
  }

  const objectUrl = URL.createObjectURL(sourceFile);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    // リサイズ後の幅・高さを計算
    const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height);
    const targetWidth = Math.max(1, Math.floor(img.width * scale));
    const targetHeight = Math.max(1, Math.floor(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return sourceFile;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    let quality = initialQuality;
    let blob: Blob | null = null;

    // 品質を下げながら maxBytes 以下を目指す
    while (quality >= minQuality) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/webp', quality)
      );
      if (blob && blob.size <= maxBytes) break;
      quality -= qualityStep;
    }

    // 生成できなかった場合は元ファイルを返す
    if (!blob) return sourceFile;

    // まだ大きい場合は元ファイルを優先して返す（失敗扱いにしない）
    if (blob.size > maxBytes && sourceFile.size <= maxBytes) return sourceFile;

    const newName = sourceFile.name.replace(/\.[^.]+$/, '.webp');
    return new File([blob], newName, { type: 'image/webp' });
  } catch {
    return sourceFile;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}



