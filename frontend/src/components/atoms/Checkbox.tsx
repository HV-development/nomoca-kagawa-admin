'use client';

import React from 'react';
import Icon from '@/components/atoms/Icon';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  className = '',
  size = 'md'
}: CheckboxProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const getCheckboxClasses = () => {
    let baseClasses = `${sizeClasses[size]} rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${className}`;
    
    if (disabled) {
      baseClasses += ' bg-gray-100 border-gray-300 cursor-not-allowed';
    } else if (checked || indeterminate) {
      baseClasses += ' bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700';
    } else {
      baseClasses += ' bg-white border-gray-300 hover:border-green-500 hover:bg-green-50';
    }
    
    return baseClasses;
  };

  return (
    <div
      className={getCheckboxClasses()}
      onClick={handleClick}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      {(checked || indeterminate) && (
        <Icon
          name={indeterminate ? 'remove' : 'check'}
          size="sm"
          className={`${iconSizes[size]} text-white`}
        />
      )}
    </div>
  );
}
