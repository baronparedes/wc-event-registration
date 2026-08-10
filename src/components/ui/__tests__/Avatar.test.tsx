import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Avatar } from '@/components/ui/Avatar';

const { mockUseMemberAvatarQuery } = vi.hoisted(() => ({
  mockUseMemberAvatarQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: (...args: unknown[]) => mockUseMemberAvatarQuery(...args),
}));

describe('Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });
  });

  it('renders initials when no avatar URL is available', () => {
    render(<Avatar name="Jane Doe" />);

    expect(screen.getByTitle('Jane Doe')).toHaveTextContent('JD');
    expect(screen.queryByRole('img', { name: 'Jane Doe' })).not.toBeInTheDocument();
    expect(mockUseMemberAvatarQuery).toHaveBeenCalledWith(undefined);
  });

  it('renders the avatar image and reveals it after load', () => {
    mockUseMemberAvatarQuery.mockReturnValue({ data: 'https://example.com/avatar.jpg' });

    render(<Avatar name="Jane Doe" avatarObjectKey="avatars/jane.jpg" />);

    const image = screen.getByRole('img', { name: 'Avatar of Jane Doe' });

    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(image).toHaveClass('opacity-0');

    fireEvent.load(image);

    expect(image).toHaveClass('opacity-100');
    expect(mockUseMemberAvatarQuery).toHaveBeenCalledWith('avatars/jane.jpg');
  });

  it('falls back to initials when the avatar image fails to load', () => {
    mockUseMemberAvatarQuery.mockReturnValue({ data: 'https://example.com/avatar.jpg' });

    render(<Avatar name="Jane Doe" avatarObjectKey="avatars/jane.jpg" />);

    fireEvent.error(screen.getByRole('img', { name: 'Avatar of Jane Doe' }));

    expect(screen.getByTitle('Jane Doe')).toHaveTextContent('JD');
    expect(screen.queryByRole('img', { name: 'Avatar of Jane Doe' })).not.toBeInTheDocument();
  });

  it('renders a new avatar URL after a previous one failed', () => {
    mockUseMemberAvatarQuery.mockReturnValue({ data: 'https://example.com/avatar-1.jpg' });

    const { rerender } = render(<Avatar name="Jane Doe" avatarObjectKey="avatars/jane-1.jpg" />);

    fireEvent.error(screen.getByRole('img', { name: 'Avatar of Jane Doe' }));

    mockUseMemberAvatarQuery.mockReturnValue({ data: 'https://example.com/avatar-2.jpg' });
    rerender(<Avatar name="Jane Doe" avatarObjectKey="avatars/jane-2.jpg" />);

    const image = screen.getByRole('img', { name: 'Avatar of Jane Doe' });
    expect(image).toHaveAttribute('src', 'https://example.com/avatar-2.jpg');
    expect(image).toHaveClass('opacity-0');
  });
});
