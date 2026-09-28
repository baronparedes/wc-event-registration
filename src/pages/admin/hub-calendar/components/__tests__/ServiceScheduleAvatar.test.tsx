import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ServiceScheduleAvatar } from '../ServiceScheduleAvatar';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: vi.fn(() => ({ data: null })),
}));

describe('ServiceScheduleAvatar', () => {
  it('renders standard avatar without excused badge when excused is false', () => {
    render(<ServiceScheduleAvatar name="Test Member" excused={false} size="sm" />);

    expect(screen.getByText('TM')).toBeInTheDocument();
    expect(screen.queryByTitle('Excused')).not.toBeInTheDocument();
  });

  it('renders excused badge when excused is true (sm size)', () => {
    render(<ServiceScheduleAvatar name="Sample Member" excused size="sm" />);

    expect(screen.getByText('SM')).toBeInTheDocument();
    expect(screen.getByTitle('Excused')).toBeInTheDocument();
  });

  it('renders excused badge with md and lg size classes', () => {
    const { rerender } = render(<ServiceScheduleAvatar name="Test Alpha" excused size="md" />);
    expect(screen.getByTitle('Excused')).toBeInTheDocument();

    rerender(<ServiceScheduleAvatar name="Test Alpha" excused size="lg" />);
    expect(screen.getByTitle('Excused')).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <ServiceScheduleAvatar name="Test Bravo" excused className="custom-schedule-avatar" />,
    );

    expect(container.querySelector('.custom-schedule-avatar')).toBeInTheDocument();
  });
});
