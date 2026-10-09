import React from 'react';

import { useMemberAvatarQuery } from '@/hooks/domain/members';

interface AvatarProps {
  name: string;
  avatarObjectKey?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  border?: 'primary' | 'secondary' | 'destructive' | 'accent' | 'success' | 'none';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarObjectKey,
  size = 'md',
  border = 'none',
  className = '',
}) => {
  const { data: avatarUrl } = useMemberAvatarQuery(avatarObjectKey);
  const [failedAvatarUrl, setFailedAvatarUrl] = React.useState<string | null>(null);
  const [loadedAvatarUrl, setLoadedAvatarUrl] = React.useState<string | null>(null);

  const initials = name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-base',
    lg: 'w-32 h-32 text-lg',
    xl: 'w-48 h-48 text-xl',
    '2xl': 'w-64 h-64 text-2xl',
    '3xl': 'w-128 h-128 text-3xl',
  };

  const borderClasses = {
    none: '',
    primary: 'ring-2 ring-primary ring-offset-2 ring-offset-background',
    secondary: 'ring-2 ring-secondary ring-offset-2 ring-offset-background',
    destructive: 'ring-2 ring-red-600 ring-offset-2 ring-offset-background',
    accent: 'ring-2 ring-accent ring-offset-2 ring-offset-background',
    success: 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background',
  };

  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  const shouldShowImage = avatarUrl && failedAvatarUrl !== avatarUrl;
  const isImageLoaded = shouldShowImage && loadedAvatarUrl === avatarUrl;

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} ${borderClasses[border]} relative rounded-full flex shrink-0 aspect-square items-center justify-center overflow-hidden font-semibold text-white ${className}`}
      title={name}
    >
      {initials}
      {shouldShowImage && (
        <img
          aria-label={`Avatar of ${name}`}
          src={avatarUrl}
          alt={name}
          className={`absolute inset-0 h-full w-full rounded-full object-cover transition-opacity duration-200 ${
            isImageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoadedAvatarUrl(avatarUrl)}
          onError={() => setFailedAvatarUrl(avatarUrl)}
        />
      )}
    </div>
  );
};
