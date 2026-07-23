import React from 'react';

import { useMemberAvatarQuery } from '@/hooks/domain/members';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className = '' }) => {
  const { data: avatarUrl } = useMemberAvatarQuery(name);
  const [failedAvatarUrl, setFailedAvatarUrl] = React.useState<string | null>(null);
  const [loadedAvatarUrl, setLoadedAvatarUrl] = React.useState<string | null>(null);

  const initials = name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-base',
    lg: 'w-24 h-24 text-lg',
    xl: 'w-48 h-48 text-xl',
    '2xl': 'w-64 h-64 text-2xl',
    '3xl': 'w-128 h-128 text-3xl',
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
      className={`${sizeClasses[size]} ${bgColor} relative rounded-full flex items-center justify-center overflow-hidden font-semibold text-white ${className}`}
      title={name}
    >
      {initials}
      {shouldShowImage && (
        <img
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
