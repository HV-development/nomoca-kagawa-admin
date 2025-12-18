import React from 'react';

interface IconButtonProps {
  children: React.ReactNode;
  color?: 'green' | 'blue' | 'orange' | 'gray';
  onClick?: () => void;
  title?: string;
  className?: string;
}

export default function IconButton({
  children,
  color = 'green',
  onClick,
  title,
  className = '',
}: IconButtonProps) {
  const baseClasses = 'p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px]';
  
  const colorClasses = {
    green: 'text-green-600 hover:text-green-800',
    blue: 'text-blue-600 hover:text-blue-800',
    orange: 'text-orange-600 hover:text-orange-800',
    gray: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${baseClasses} ${colorClasses[color]} ${className}`}
    >
      {children}
    </button>
  );
}

