import { faker } from '@faker-js/faker';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';

import { MemberQuickViewDialog } from '../MemberQuickViewDialog';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: vi.fn(() => ({ data: null })),
}));

const firstName = faker.person.firstName();
const lastName = faker.person.lastName();

const baseMember: AdminMember = {
  id: 'mem-123',
  member_id: 'MEM-1001',
  avatar_object_key: null,
  is_active: true,
  first_name: firstName,
  last_name: lastName,
  nickname: faker.person.firstName(),
  full_name: `${firstName} ${lastName}`,
  email: 'johnny@example.com',
  phone: '0917-123-4567',
  date_of_birth: '1990-01-01',
  role: 'Usher',
  category: 'adult',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  extra_metadata: {},
};

describe('MemberQuickViewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when member is null', () => {
    const { container } = render(
      <MemoryRouter>
        <MemberQuickViewDialog isOpen={true} onClose={vi.fn()} member={null} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders basic member details, email, and phone', () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <MemberQuickViewDialog isOpen={true} onClose={handleClose} member={baseMember} />
      </MemoryRouter>,
    );

    expect(screen.getByText(baseMember.full_name)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`MEM-1001 • ${baseMember.nickname}`, 'i')),
    ).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('adult')).toBeInTheDocument();
    expect(screen.getByText('johnny@example.com')).toBeInTheDocument();
    expect(screen.getByText('0917-123-4567')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const fullProfileBtn = screen.getByRole('button', { name: 'View Full Profile' });
    fireEvent.click(fullProfileBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      ROUTE_PATHS.adminMemberDetailPattern.replace(':id', baseMember.id),
    );
  });

  it('renders contact buttons for SMS, Viber, and clipboard when phone is provided', () => {
    render(
      <MemoryRouter>
        <MemberQuickViewDialog isOpen={true} onClose={vi.fn()} member={baseMember} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('contact-buttons')).toBeInTheDocument();
    expect(screen.getByTestId('contact-sms-link')).toBeInTheDocument();
    expect(screen.getByTestId('contact-viber-link')).toBeInTheDocument();
    expect(screen.getByTestId('contact-copy-button')).toBeInTheDocument();
  });

  it('does not render contact buttons when phone is not provided', () => {
    render(
      <MemoryRouter>
        <MemberQuickViewDialog
          isOpen={true}
          onClose={vi.fn()}
          member={{ ...baseMember, phone: null }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('contact-buttons')).not.toBeInTheDocument();
    expect(screen.getByText('Not provided')).toBeInTheDocument();
  });

  it('renders Solid confidence tier, emerald status ring, and detailed note', () => {
    const stats: MemberAttendanceStats = {
      turnupRate: 0.9,
      attended: 9,
      committed: 10,
      attendanceScore: 9,
    };

    render(
      <MemoryRouter>
        <MemberQuickViewDialog
          isOpen={true}
          onClose={vi.fn()}
          member={baseMember}
          stats={stats}
          isExcused={false}
        />
      </MemoryRouter>,
    );

    const confidenceCard = screen.getByTestId('member-confidence-card');
    expect(confidenceCard).toBeInTheDocument();
    expect(screen.getByText('Solid')).toBeInTheDocument();
    expect(screen.getByText('90% Turnup')).toBeInTheDocument();
    expect(
      screen.getByText(/Attended 9 of 10 scheduled commitments in recent weeks/i),
    ).toBeInTheDocument();

    const avatar = screen.getByTitle(baseMember.full_name);
    expect(avatar).toHaveClass('ring-emerald-500');
  });

  it('renders Moderate confidence tier, accent amber status ring, and note', () => {
    const stats: MemberAttendanceStats = {
      turnupRate: 0.5,
      attended: 5,
      committed: 10,
      attendanceScore: 5,
    };

    render(
      <MemoryRouter>
        <MemberQuickViewDialog
          isOpen={true}
          onClose={vi.fn()}
          member={baseMember}
          stats={stats}
          isExcused={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('50% Turnup')).toBeInTheDocument();
    expect(
      screen.getByText(/Attended 5 of 10 scheduled commitments in recent weeks/i),
    ).toBeInTheDocument();

    const avatar = screen.getByTitle(baseMember.full_name);
    expect(avatar).toHaveClass('ring-accent');
  });

  it('renders At Risk confidence tier, destructive red status ring, and note', () => {
    const stats: MemberAttendanceStats = {
      turnupRate: 0.2,
      attended: 2,
      committed: 10,
      attendanceScore: 2,
    };

    render(
      <MemoryRouter>
        <MemberQuickViewDialog
          isOpen={true}
          onClose={vi.fn()}
          member={baseMember}
          stats={stats}
          isExcused={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('20% Turnup')).toBeInTheDocument();
    expect(
      screen.getByText(/Attended 2 of 10 scheduled commitments in recent weeks/i),
    ).toBeInTheDocument();

    const avatar = screen.getByTitle(baseMember.full_name);
    expect(avatar).toHaveClass('ring-red-600');
  });

  it('renders Excused badge and excuse note when isExcused is true', () => {
    render(
      <MemoryRouter>
        <MemberQuickViewDialog
          isOpen={true}
          onClose={vi.fn()}
          member={baseMember}
          isExcused={true}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Excused')).toBeInTheDocument();
    expect(
      screen.getByText(/Submitted an approved excuse request for this service slot/i),
    ).toBeInTheDocument();
    expect(screen.getByTitle('Excused')).toBeInTheDocument();
  });

  it('renders Inactive badge and note when member has no attendance data recorded for 30+ days', () => {
    render(
      <MemoryRouter>
        <MemberQuickViewDialog
          isOpen={true}
          onClose={vi.fn()}
          member={{ ...baseMember, created_at: '2024-01-01T00:00:00Z' }}
          stats={undefined}
          isExcused={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(
      screen.getByText(/Member has 0% attendance data recorded over the past 30\+ days/i),
    ).toBeInTheDocument();
  });

  it('renders default baseline when member is new with no prior stats', () => {
    const recentDate = new Date().toISOString();
    render(
      <MemoryRouter>
        <MemberQuickViewDialog
          isOpen={true}
          onClose={vi.fn()}
          member={{ ...baseMember, created_at: recentDate }}
          stats={undefined}
          isExcused={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Solid')).toBeInTheDocument();
    expect(screen.getByText('80% Turnup (Baseline)')).toBeInTheDocument();
    expect(
      screen.getByText(/High reliability volunteer \(80% default baseline rate\)/i),
    ).toBeInTheDocument();
  });
});
