import type { FC } from 'react';

import brandLogo from '@/assets/wc-hub-brand.png';

export interface BrandAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  alt?: string;
  className?: string;
}

const sizeClasses = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
};

export const BrandAvatar: FC<BrandAvatarProps> = ({
  size = 'md',
  alt = 'AI Assistant',
  className = '',
}) => {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/80 shadow-xs ${sizeClasses[size]} ${className}`}
      title={alt}
    >
      <img src={brandLogo} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
};
