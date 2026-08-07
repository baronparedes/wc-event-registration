import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMemberMilestonesPage } from '@/pages/admin/members/milestones';

const { mockUseAdminMembersMilestonesQuery, mockUseIsMobileViewport } = vi.hoisted(() => ({
  mockUseAdminMembersMilestonesQuery: vi.fn(),
  mockUseIsMobileViewport: vi.fn(),
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');

  return {
    ...actual,
    useAdminMembersMilestonesQuery: (...args: unknown[]) =>
      mockUseAdminMembersMilestonesQuery(...args),
  };
});

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/utils')>('@/hooks/utils');

  return {
    ...actual,
    useIsMobileViewport: (...args: unknown[]) => mockUseIsMobileViewport(...args),
  };
});

function makeMember(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'member-1',
    member_id: 'WC-001',
    avatar_object_key: null,
    is_active: true,
    full_name: 'Jane Doe',
    first_name: 'Jane',
    last_name: 'Doe',
    nickname: 'J',
    email: null,
    phone: null,
    date_of_birth: '1990-06-15',
    role: 'member',
    category: 'adult',
    extra_metadata: {},
    created_at: '2026-06-15T00:00:00.000Z',
    updated_at: '2026-06-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('AdminMemberMilestonesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T08:00:00.000Z'));
    mockUseIsMobileViewport.mockReturnValue(false);
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:mock-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });

    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [makeMember()],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a calendar cell and selected-day milestones', () => {
    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Member Milestones')).toBeInTheDocument();
    expect(screen.getAllByText('June 2026')).toHaveLength(2);
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(screen.getByText('Birthday')).toBeInTheDocument();
    expect(screen.getByText('Birthdays')).toBeInTheDocument();
    expect(screen.getByText('Wedding Anniversaries')).toBeInTheDocument();
  });

  it('exports current month milestones as csv', async () => {
    const createdAnchors: HTMLAnchorElement[] = [];
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);

      if (tagName.toLowerCase() === 'a') {
        const anchor = element as HTMLAnchorElement;
        Object.defineProperty(anchor, 'click', {
          writable: true,
          value: vi.fn(),
        });
        createdAnchors.push(anchor);
      }

      return element;
    });

    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Month Milestones CSV' }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    const createObjectURLMock = URL.createObjectURL as unknown as {
      mock: { calls: Array<[Blob]> };
    };
    const exportedBlob = createObjectURLMock.mock.calls[0]?.[0];
    const csvText = await exportedBlob.text();

    expect(csvText).toContain(
      'Member ID,Full Name,Nickname,Milestone Type,Milestone Date,Email,Phone,Role,Category',
    );
    expect(csvText).toContain('WC-001,Jane Doe,J,Birthday,1990-06-15,,,member,adult');

    const exportAnchor = createdAnchors.find(
      (anchor) =>
        anchor.download === 'member-milestones-2026-06.csv' &&
        typeof anchor.click === 'function' &&
        vi.mocked(anchor.click).mock.calls.length > 0,
    );
    expect(exportAnchor).toBeDefined();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('renders error state when milestones query fails', () => {
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('failed'),
    });

    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Failed to load member milestones. Please refresh.'),
    ).toBeInTheDocument();
  });

  it('renders empty state when there are no active members', () => {
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No active members')).toBeInTheDocument();
    expect(
      screen.getByText('Add active members first, then their milestones will appear here.'),
    ).toBeInTheDocument();
  });

  it('supports mobile week selection and shows selected-day empty state', () => {
    mockUseIsMobileViewport.mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to week 1' }));
    expect(screen.getByText('No milestones on this date')).toBeInTheDocument();
  });

  it('navigates months and allows returning to today', () => {
    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getAllByText('July 2026')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getAllByText('June 2026')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('button', { name: 'Today' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();
  });

  it('exports only milestones from the month currently in view', async () => {
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [
        makeMember({
          id: 'member-1',
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          date_of_birth: '1990-06-15',
        }),
        makeMember({
          id: 'member-2',
          member_id: 'WC-002',
          full_name: 'John Roe',
          date_of_birth: '1990-07-10',
        }),
      ],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Month Milestones CSV' }));

    const createObjectURLMockJune = URL.createObjectURL as unknown as {
      mock: { calls: Array<[Blob]> };
    };
    const juneBlob = createObjectURLMockJune.mock.calls[0]?.[0];
    const juneCsv = await juneBlob.text();

    expect(juneCsv).toContain('WC-001');
    expect(juneCsv).not.toContain('WC-002');

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getAllByText('July 2026')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Export Month Milestones CSV' }));

    const createObjectURLMockJuly = URL.createObjectURL as unknown as {
      mock: { calls: Array<[Blob]> };
    };
    const julyBlob = createObjectURLMockJuly.mock.calls[1]?.[0];
    const julyCsv = await julyBlob.text();

    expect(julyCsv).toContain('WC-002');
    expect(julyCsv).not.toContain('WC-001');
  });

  it('renders birthday and wedding anniversary milestones on the same selected date', () => {
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [
        makeMember({
          id: 'member-1',
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          date_of_birth: '1990-06-15',
          extra_metadata: {},
        }),
        makeMember({
          id: 'member-2',
          member_id: 'WC-002',
          full_name: 'John Roe',
          date_of_birth: null,
          extra_metadata: { wedanniv_date: '2005-06-15' },
        }),
      ],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Birthday')).toBeInTheDocument();
    expect(screen.getByText('Wedding Anniversary')).toBeInTheDocument();
    expect(screen.getByText(/^Birthday:/)).toBeInTheDocument();
    expect(screen.getByText(/^Wedding Anniversary:/)).toBeInTheDocument();
  });

  it('ignores missing or invalid wedding anniversary metadata values', () => {
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [
        makeMember({
          id: 'member-1',
          member_id: 'WC-001',
          full_name: 'Jane Doe',
          date_of_birth: '1990-06-15',
          extra_metadata: {},
        }),
        makeMember({
          id: 'member-2',
          member_id: 'WC-002',
          full_name: 'John Roe',
          date_of_birth: null,
          extra_metadata: { wedanniv_date: 'not-a-date' },
        }),
      ],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Birthdays')).toBeInTheDocument();
    expect(screen.getByText('Wedding Anniversaries')).toBeInTheDocument();
    const birthdaysCardLabel = screen.getByText('Birthdays');
    const birthdaysCard = birthdaysCardLabel.parentElement;
    expect(birthdaysCard?.textContent).toContain('1');

    const weddingCardLabel = screen.getByText('Wedding Anniversaries');
    const weddingCard = weddingCardLabel.parentElement;
    expect(weddingCard?.textContent).toContain('0');
    expect(screen.queryByText('Wedding Anniversary')).not.toBeInTheDocument();
  });
});
