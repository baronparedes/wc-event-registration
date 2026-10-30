import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import * as hubCalendar from '@/lib/domain/hub-calendar';
import type { AdminMember, MemberAttendanceStats } from '@/lib/domain/members';

import { StandInRecommenderModal } from '../StandInRecommenderModal';

vi.mock('@/hooks/domain/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/domain/members')>();
  return {
    ...actual,
    useMemberAvatarQuery: vi.fn(() => ({ data: null })),
  };
});

vi.mock('@/lib/domain/hub-calendar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/domain/hub-calendar')>();
  return {
    ...actual,
    recommendStandIn: vi.fn(),
  };
});

function createMockMember(
  id: string,
  name: string,
  role: string,
  overrides?: Partial<AdminMember>,
): AdminMember {
  const displayName = name.startsWith('Test ') ? name : `Test ${name}`;
  return {
    id,
    member_id: `MEM-${id}`,
    avatar_object_key: null,
    is_active: true,
    first_name: displayName,
    last_name: 'Sample',
    nickname: displayName,
    full_name: `${displayName} Sample`,
    email: `${name.toLowerCase()}@test.com`,
    phone: '09171234567',
    date_of_birth: '1990-01-01',
    role,
    category: 'adult',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    extra_metadata: {},
    notes: [],
    ...overrides,
  };
}

function createWrapper(
  customClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={customClient}>{children}</QueryClientProvider>;
  };
}

describe('StandInRecommenderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  it('renders empty state when no eligible candidates are available', () => {
    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="NonExistentRole"
        allMembers={[]}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByText('No Eligible Walk-ins Found')).toBeInTheDocument();
    expect(screen.getByText(/There are currently no active volunteers/)).toBeInTheDocument();
  });

  it('calls recommendStandIn and displays ranked candidate with draft messages', async () => {
    const candidateMember = createMockMember('1', 'Test Grace', 'Prayer Coach');
    const allMembers = [candidateMember];
    const scheduleEntries: MemberScheduleEntry[] = [];
    const attendanceScoreMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 10, turnupRate: 95, committed: 10, attended: 9 }],
    ]);

    const mockAiResponse: hubCalendar.RecommendStandInResponse = {
      recommendations: [
        {
          candidateToken: 'USR_001',
          rank: 1,
          reasoning: 'USR_001 has exceptional 95% turnup rate and regular service commitment.',
        },
      ],
      invitations: {
        sms: 'Hi {{volunteer_name}}, can you serve as {{role}} this Sunday at {{service_time}}?',
        viber:
          'Hi {{volunteer_name}}! Would you be available to walk in for {{role}} this Sunday, {{service_date}} at {{service_time}}? Thank you!',
        email: {
          subject: 'Walk-in request for {{service_date}}',
          body: 'Hi {{volunteer_name}}, could you walk in for {{role}} at {{service_time}}?',
        },
      },
    };

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValueOnce(mockAiResponse);

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        allMembers={allMembers}
        scheduleEntries={scheduleEntries}
        attendanceScoreMap={attendanceScoreMap}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });

    // Resolves USR_001 to member name and does not leak token
    expect(screen.getByText(/Test Grace has exceptional 95% turnup rate/)).toBeInTheDocument();
    expect(screen.queryByText(/USR_001/)).not.toBeInTheDocument();
    expect(screen.getByText('Top Match')).toBeInTheDocument();
    expect(screen.getByText('95% turnup')).toBeInTheDocument();

    // Default channel Viber text has Test Grace substituted
    expect(
      screen.getByText(/Hi Test Grace! Would you be available to walk in for Prayer Coach/),
    ).toBeInTheDocument();

    // Switch to SMS channel
    fireEvent.click(screen.getByRole('button', { name: /SMS/i }));
    expect(
      screen.getByText(/Hi Test Grace, can you serve as Prayer Coach this Sunday at 9:00 AM\?/),
    ).toBeInTheDocument();

    // Switch to Email channel
    fireEvent.click(screen.getByRole('button', { name: /Email/i }));
    expect(
      screen.getByText(/Hi Test Grace, could you walk in for Prayer Coach at 9:00 AM\?/),
    ).toBeInTheDocument();

    // Copy message actions
    fireEvent.click(screen.getByRole('button', { name: /Copy All Messages/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Copy Template/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('supports multi-candidate recommendations, multi-selection, and bulk copy', async () => {
    const member1 = createMockMember('1', 'Grace', 'Usher');
    const member2 = createMockMember('2', 'Daniel', 'Usher');
    const member3 = createMockMember('3', 'Hannah', 'Usher');
    const allMembers = [member1, member2, member3];
    const scheduleEntries: MemberScheduleEntry[] = [];
    const attendanceScoreMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 10, turnupRate: 95, committed: 10, attended: 9 }],
      ['2', { attendanceScore: 9, turnupRate: 90, committed: 10, attended: 9 }],
      ['3', { attendanceScore: 8, turnupRate: 85, committed: 10, attended: 8 }],
    ]);

    const mockAiResponse: hubCalendar.RecommendStandInResponse = {
      recommendations: [
        {
          candidateToken: 'USR_001',
          rank: 1,
          reasoning: 'Exceptional 95% turnup rate.',
        },
        {
          candidateToken: 'USR_002',
          rank: 2,
          reasoning: 'Strong 90% turnup rate.',
        },
        {
          candidateToken: 'USR_003',
          rank: 3,
          reasoning: 'Reliable 85% turnup rate.',
        },
      ],
      invitations: {
        sms: 'Hi {{volunteer_name}}, can you serve as {{role}} this Sunday at {{service_time}}?',
        viber:
          'Hi {{volunteer_name}}! Would you be available to walk in for {{role}} this Sunday, {{service_date}} at {{service_time}}? Thank you!',
        email: {
          subject: 'Walk-in request for {{service_date}}',
          body: 'Hi {{volunteer_name}}, could you walk in for {{role}} at {{service_time}}?',
        },
      },
    };

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValueOnce(mockAiResponse);

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Usher"
        neededCount={2}
        allMembers={allMembers}
        scheduleEntries={scheduleEntries}
        attendanceScoreMap={attendanceScoreMap}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(hubCalendar.recommendStandIn).toHaveBeenCalledWith(
        expect.objectContaining({
          neededCount: 2,
          role: 'Usher',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Daniel Sample').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Hannah Sample').length).toBeGreaterThan(0);
    });

    // Pre-selects top 2 candidates based on neededCount = 2
    expect(screen.getByText('2 Selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy All Messages \(2\)/i })).toBeInTheDocument();

    // Select All
    fireEvent.click(screen.getByRole('button', { name: /Select All/i }));
    expect(screen.getByText('3 Selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy All Messages \(3\)/i })).toBeInTheDocument();

    // Copy Contact Numbers
    fireEvent.click(screen.getByRole('button', { name: /Copy Numbers/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('639171234567'),
    );

    // Copy All Messages
    fireEvent.click(screen.getByRole('button', { name: /Copy All Messages \(3\)/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Deselect one candidate by clicking their checkbox
    const hannahCheckbox = screen.getByLabelText('Select Test Hannah Sample');
    fireEvent.click(hannahCheckbox);
    expect(screen.getByText('2 Selected')).toBeInTheDocument();

    // Clear selection
    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));
    expect(screen.getByText('0 Selected')).toBeInTheDocument();
  });

  it('serves results from cache on reopen and supports manual refresh', async () => {
    const candidateMember = createMockMember('1', 'Test Grace', 'Prayer Coach');
    const allMembers = [candidateMember];
    const scheduleEntries: MemberScheduleEntry[] = [];
    const attendanceScoreMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 10, turnupRate: 95, committed: 10, attended: 9 }],
    ]);

    const mockAiResponse: hubCalendar.RecommendStandInResponse = {
      recommendations: [
        {
          candidateToken: 'USR_001',
          rank: 1,
          reasoning: 'High reliability volunteer.',
        },
      ],
      invitations: {
        sms: 'Hi {{volunteer_name}}, can you serve?',
        viber: 'Hi {{volunteer_name}}, can you walk in?',
        email: { subject: 'Walk-in', body: 'Hi {{volunteer_name}}' },
      },
    };

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue(mockAiResponse);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 10 * 60 * 1000 },
      },
    });
    const wrapper = createWrapper(queryClient);

    const { unmount } = render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        allMembers={allMembers}
        scheduleEntries={scheduleEntries}
        attendanceScoreMap={attendanceScoreMap}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });
    expect(hubCalendar.recommendStandIn).toHaveBeenCalledTimes(1);

    // Simulate modal close & reopen with identical parameters
    unmount();

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        allMembers={allMembers}
        scheduleEntries={scheduleEntries}
        attendanceScoreMap={attendanceScoreMap}
      />,
      { wrapper },
    );

    // Immediately present without re-calling API
    expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    expect(hubCalendar.recommendStandIn).toHaveBeenCalledTimes(1);

    // Clicking Refresh forces a refetch
    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(hubCalendar.recommendStandIn).toHaveBeenCalledTimes(2);
    });
  });

  it('debounces quota changes when rapidly clicking stepper buttons', async () => {
    const candidateMember = createMockMember('1', 'Test Grace', 'Prayer Coach');
    const allMembers = [candidateMember];
    const scheduleEntries: MemberScheduleEntry[] = [];
    const attendanceScoreMap = new Map<string, MemberAttendanceStats>([
      ['1', { attendanceScore: 10, turnupRate: 95, committed: 10, attended: 9 }],
    ]);

    const mockAiResponse: hubCalendar.RecommendStandInResponse = {
      recommendations: [
        {
          candidateToken: 'USR_001',
          rank: 1,
          reasoning: 'High reliability volunteer.',
        },
      ],
      invitations: {
        sms: 'Hi {{volunteer_name}}, can you serve?',
        viber: 'Hi {{volunteer_name}}, can you walk in?',
        email: { subject: 'Walk-in', body: 'Hi {{volunteer_name}}' },
      },
    };

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue(mockAiResponse);

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        neededCount={1}
        allMembers={allMembers}
        scheduleEntries={scheduleEntries}
        attendanceScoreMap={attendanceScoreMap}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });
    // Initial call for neededCount: 1
    expect(hubCalendar.recommendStandIn).toHaveBeenCalledWith(
      expect.objectContaining({ neededCount: 1 }),
    );
    expect(hubCalendar.recommendStandIn).toHaveBeenCalledTimes(1);

    // Rapidly click Increase (+) twice: 1 -> 2 -> 3
    const plusBtn = screen.getByRole('button', { name: /Increase needed walk-ins/i });
    fireEvent.click(plusBtn);
    fireEvent.click(plusBtn);

    // UI immediately reflects 3 without lag
    expect(screen.getByText('3')).toBeInTheDocument();

    // After debounce settles, only the final neededCount: 3 is requested
    await waitFor(() => {
      expect(hubCalendar.recommendStandIn).toHaveBeenCalledWith(
        expect.objectContaining({ neededCount: 3 }),
      );
    });
    // Intermediate neededCount: 2 was debounced away
    expect(hubCalendar.recommendStandIn).toHaveBeenCalledTimes(2);
  });
});
