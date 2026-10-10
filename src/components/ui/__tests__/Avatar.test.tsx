import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Avatar } from '@/components/ui/Avatar';

const { mockUseMemberAvatarQuery } = vi.hoisted(() => ({
  mockUseMemberAvatarQuery: vi.fn(),
}));

const avatarSources = (url: string, fallbackUrl = url) => ({ url, fallbackUrl });

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: (...args: unknown[]) => mockUseMemberAvatarQuery(...args),
}));

describe('Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMemberAvatarQuery.mockReturnValue({ data: null });
  });

  it('renders initials when no avatar URL is available', () => {
    render(<Avatar name="Test Member" />);

    expect(screen.getByTitle('Test Member')).toHaveTextContent('TM');
    expect(screen.queryByRole('img', { name: 'Test Member' })).not.toBeInTheDocument();
    expect(mockUseMemberAvatarQuery).toHaveBeenCalledWith(undefined, 128);
  });

  it('renders the avatar image and reveals it after load', () => {
    mockUseMemberAvatarQuery.mockReturnValue({
      data: avatarSources(
        'https://example.com/render/image/public/avatars/member.jpg?width=128',
        'https://example.com/avatars/member.jpg',
      ),
    });

    render(<Avatar name="Test Member" avatarObjectKey="avatars/member.jpg" />);

    const image = screen.getByRole('img', { name: 'Avatar of Test Member' });

    expect(image).toHaveAttribute(
      'src',
      'https://example.com/render/image/public/avatars/member.jpg?width=128',
    );
    expect(image).toHaveClass('opacity-0');

    fireEvent.load(image);

    expect(image).toHaveClass('opacity-100');
    expect(mockUseMemberAvatarQuery).toHaveBeenCalledWith('avatars/member.jpg', 128);
  });

  it('falls back to the original image if the transformed avatar fails', () => {
    mockUseMemberAvatarQuery.mockReturnValue({
      data: avatarSources(
        'https://example.com/render/image/public/avatars/member.jpg?width=128',
        'https://example.com/avatars/member.jpg',
      ),
    });

    render(<Avatar name="Test Member" avatarObjectKey="avatars/member.jpg" />);
    const transformedImage = screen.getByRole('img', { name: 'Avatar of Test Member' });

    fireEvent.error(transformedImage);

    expect(screen.getByRole('img', { name: 'Avatar of Test Member' })).toHaveAttribute(
      'src',
      'https://example.com/avatars/member.jpg',
    );
  });

  it('falls back to initials if both transformed and original avatars fail', () => {
    mockUseMemberAvatarQuery.mockReturnValue({
      data: avatarSources(
        'https://example.com/render/image/public/avatars/member.jpg?width=128',
        'https://example.com/avatars/member.jpg',
      ),
    });

    render(<Avatar name="Test Member" avatarObjectKey="avatars/member.jpg" />);

    fireEvent.error(screen.getByRole('img', { name: 'Avatar of Test Member' }));
    fireEvent.error(screen.getByRole('img', { name: 'Avatar of Test Member' }));

    expect(screen.getByTitle('Test Member')).toHaveTextContent('TM');
    expect(screen.queryByRole('img', { name: 'Avatar of Test Member' })).not.toBeInTheDocument();
  });

  it('falls back to initials when the avatar image fails to load', () => {
    mockUseMemberAvatarQuery.mockReturnValue({
      data: avatarSources('https://example.com/avatar.jpg'),
    });

    render(<Avatar name="Test Member" avatarObjectKey="avatars/member.jpg" />);

    fireEvent.error(screen.getByRole('img', { name: 'Avatar of Test Member' }));

    expect(screen.getByTitle('Test Member')).toHaveTextContent('TM');
    expect(screen.queryByRole('img', { name: 'Avatar of Test Member' })).not.toBeInTheDocument();
  });

  it('renders a new avatar URL after a previous one failed', () => {
    mockUseMemberAvatarQuery.mockReturnValue({
      data: avatarSources('https://example.com/avatar-1.jpg'),
    });

    const { rerender } = render(<Avatar name="Test Member" avatarObjectKey="avatars/m-1.jpg" />);

    fireEvent.error(screen.getByRole('img', { name: 'Avatar of Test Member' }));

    mockUseMemberAvatarQuery.mockReturnValue({
      data: avatarSources('https://example.com/avatar-2.jpg'),
    });
    rerender(<Avatar name="Test Member" avatarObjectKey="avatars/m-2.jpg" />);

    const image = screen.getByRole('img', { name: 'Avatar of Test Member' });
    expect(image).toHaveAttribute('src', 'https://example.com/avatar-2.jpg');
    expect(image).toHaveClass('opacity-0');
  });

  describe('border prop', () => {
    it('applies no border classes by default', () => {
      render(<Avatar name="Test Member" />);
      const container = screen.getByTitle('Test Member');
      expect(container).not.toHaveClass('ring-2');
    });

    it('applies primary border classes when border="primary"', () => {
      render(<Avatar name="Test Member" border="primary" />);
      const container = screen.getByTitle('Test Member');
      expect(container).toHaveClass(
        'ring-2',
        'ring-primary',
        'ring-offset-2',
        'ring-offset-background',
      );
    });

    it('applies destructive border classes when border="destructive"', () => {
      render(<Avatar name="Test Member" border="destructive" />);
      const container = screen.getByTitle('Test Member');
      expect(container).toHaveClass(
        'ring-2',
        'ring-red-600',
        'ring-offset-2',
        'ring-offset-background',
      );
    });

    it('applies accent border classes when border="accent"', () => {
      render(<Avatar name="Test Member" border="accent" />);
      const container = screen.getByTitle('Test Member');
      expect(container).toHaveClass(
        'ring-2',
        'ring-accent',
        'ring-offset-2',
        'ring-offset-background',
      );
    });
  });

  describe('size prop', () => {
    it('applies xs size classes when size="xs"', () => {
      render(<Avatar name="Test Member" size="xs" />);
      const container = screen.getByTitle('Test Member');
      expect(container).toHaveClass('w-6', 'h-6', 'text-[10px]');
    });
  });
});
