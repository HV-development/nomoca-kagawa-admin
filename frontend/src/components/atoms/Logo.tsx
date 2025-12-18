import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

function Logo({ size = 'md', className = '', onLoad, onError }: LogoProps) {
  const sizeClasses = useMemo(
    () => ({
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
    }),
    []
  );

  const imageSize = useMemo(
    () => (size === 'sm' ? 32 : size === 'md' ? 40 : 48),
    [size]
  );

  return (
    <Link href="/coupons" prefetch={false} className={`flex items-center w-full ${className}`}>
      <Image 
        src="/nomoca_logo.svg" 
        alt="nomoca 香川ロゴ" 
        width={imageSize}
        height={imageSize}
        className={`w-full ${sizeClasses[size]} object-contain cursor-pointer hover:opacity-80 transition-opacity`}
        priority
        onLoadingComplete={() => {
          onLoad?.();
        }}
        onError={() => {
          onError?.();
        }}
      />
    </Link>
  );
}

export default React.memo(Logo);
