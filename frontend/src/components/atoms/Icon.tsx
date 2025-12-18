import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

interface IconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap: Record<string, { type: 'emoji' | 'material' | 'image'; value: string }> = {
  store: { type: 'material', value: 'storefront' },
  coupon: { type: 'material', value: 'confirmation_number' },
  users: { type: 'material', value: 'groups' },
  admin: { type: 'material', value: 'person' },
  history: { type: 'material', value: 'history_2' },
  // サイドバーで使用するアイコン名を追加
  apartment: { type: 'material', value: 'apartment' },
  domain: { type: 'material', value: 'domain' },
  storefront: { type: 'material', value: 'storefront' },
  confirmation_number: { type: 'material', value: 'confirmation_number' },
  groups: { type: 'material', value: 'groups' },
  person: { type: 'material', value: 'person' },
  history_2: { type: 'material', value: 'history_2' },
  chevronLeft: { type: 'material', value: 'chevron_left' },
  chevronRight: { type: 'material', value: 'chevron_right' },
  chevronUp: { type: 'material', value: 'expand_less' },
  chevronDown: { type: 'material', value: 'expand_more' },
  home: { type: 'emoji', value: '🏠' },
  settings: { type: 'emoji', value: '⚙️' },
  logout: { type: 'material', value: 'logout' },
  plus: { type: 'emoji', value: '➕' },
  search: { type: 'emoji', value: '🔍' },
  edit: { type: 'emoji', value: '✏️' },
  eye: { type: 'emoji', value: '👁️' },
  clear: { type: 'emoji', value: '🗑️' },
  'check-circle': { type: 'material', value: 'check_circle' },
  'alert-circle': { type: 'material', value: 'error' },
  'alert-triangle': { type: 'material', value: 'warning' },
  info: { type: 'material', value: 'info' },
  x: { type: 'material', value: 'close' },
  check: { type: 'material', value: 'check' },
  remove: { type: 'material', value: 'remove' },
  'add-store': { type: 'image', value: '/store-list.svg' },
  link: { type: 'material', value: 'link' },
  'content-copy': { type: 'material', value: 'content_copy' },
  download: { type: 'material', value: 'download' },
};

function Icon({ name, size = 'md', className = '' }: IconProps) {
  const [isFontLoaded, setIsFontLoaded] = useState(false);

  useEffect(() => {
    // Material Iconsフォントの読み込み状態をチェック
    const checkFontLoaded = () => {
      if (document.fonts && document.fonts.check) {
        // document.fonts.check()が利用可能な場合
        const isLoaded = document.fonts.check('24px "Material Symbols Outlined"');
        setIsFontLoaded(isLoaded);
        
        if (!isLoaded) {
          // フォントがまだ読み込まれていない場合、読み込み完了を待つ
          document.fonts.ready.then(() => {
            setIsFontLoaded(true);
          });
        }
      } else {
        // document.fonts.check()が利用できない場合、少し待ってから表示
        const timer = setTimeout(() => {
          setIsFontLoaded(true);
        }, 100);
        
        return () => clearTimeout(timer);
      }
    };

    checkFontLoaded();
  }, []);

  const sizeClasses = useMemo(
    () => ({
      sm: 'text-sm leading-none',
      md: 'text-lg leading-none',
      lg: 'text-xl leading-none',
    }),
    []
  );

  const imageSizeClasses = useMemo(
    () => ({
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    }),
    []
  );

  const icon = useMemo(() => iconMap[name], [name]);
  
  if (!icon) {
    return (
      <span className={`inline-block ${sizeClasses[size]} ${className}`}>
        ?
      </span>
    );
  }

  if (icon.type === 'material') {
    // フォントが読み込まれていない場合は非表示
    if (!isFontLoaded) {
      return (
        <span 
          className={`inline-block ${sizeClasses[size]} ${className}`}
          style={{ 
            width: size === 'sm' ? '16px' : size === 'md' ? '20px' : '24px',
            height: size === 'sm' ? '16px' : size === 'md' ? '20px' : '24px',
            backgroundColor: 'transparent'
          }}
        />
      );
    }

    return (
      <span 
        className={`material-symbols-outlined inline-block align-text-bottom ${sizeClasses[size]} ${className}`}
        style={{ 
          fontFamily: 'Material Symbols Outlined',
          fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
          fontSize: '24px',
          lineHeight: '1'
        }}
      >
        {icon.value}
      </span>
    );
  }

  if (icon.type === 'image') {
    const imageSizes = useMemo(
      () => ({
        sm: 16,
        md: 20,
        lg: 24,
      }),
      []
    );
    
    return (
      <Image 
        src={icon.value} 
        alt={name}
        width={imageSizes[size]}
        height={imageSizes[size]}
        className={`inline-block ${imageSizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <span className={`inline-block ${sizeClasses[size]} ${className}`}>
      {icon.value}
    </span>
  );
}

export default React.memo(Icon);
