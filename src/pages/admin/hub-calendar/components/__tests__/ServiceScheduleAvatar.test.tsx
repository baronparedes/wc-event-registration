import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ServiceScheduleAvatar } from '../ServiceScheduleAvatar';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: vi.fn(() => ({ data: null })),
}));

describe('ServiceScheduleAvatar', () => {
  it('renders standard avatar without excused badge when excused is false', () => {
    render(<ServiceScheduleAvatar name="John Doe" excused={false} size="sm" />);

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.queryByTitle('Excused')).not.toBeInTheDocument();
  });

  it('renders excused badge when excused is true (sm size)', () => {
    render(<ServiceScheduleAvatar name="Jane Doe" excused size="sm" />);

    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByTitle('Excused')).toBeInTheDocument();
  });

  it('renders excused badge with md and lg size classes', () => {
    const { rerender } = render(<ServiceScheduleAvatar name="Alex Smith" excused size="md" />);
    expect(screen.getByTitle('Excused')).toBeInTheDocument();

    rerender(<ServiceScheduleAvatar name="Alex Smith" excused size="lg" />);
    expect(screen.getByTitle('Excused')).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <ServiceScheduleAvatar name="Sam Wilson" excused className="custom-schedule-avatar" />,
    );

    expect(container.querySelector('.custom-schedule-avatar')).toBeInTheDocument();
  });
});
