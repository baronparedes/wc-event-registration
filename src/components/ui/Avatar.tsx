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

  const initials = name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base',
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

  if (shouldShowImage) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={name}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={() => setFailedAvatarUrl(avatarUrl)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center font-semibold text-white ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};
