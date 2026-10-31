import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
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

  it('supports stepper decrement and respects min (1) and max (15) bounds', async () => {
    const candidateMember = createMockMember('1', 'Test Grace', 'Prayer Coach');
    const allMembers = [candidateMember];

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue({
      recommendations: [{ candidateToken: 'USR_001', rank: 1, reasoning: 'Reliable' }],
      invitations: {
        sms: 'Hi',
        viber: 'Hi',
        email: { subject: 'Subject', body: 'Body' },
      },
    });

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="12NN"
        role="Prayer Coach"
        neededCount={2}
        allMembers={allMembers}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });

    // Check custom slot formatting: 12NN -> 12:00 NN
    expect(screen.getByText('12:00 NN')).toBeInTheDocument();

    const minusBtn = screen.getByRole('button', { name: /Decrease needed walk-ins/i });
    const plusBtn = screen.getByRole('button', { name: /Increase needed walk-ins/i });

    // Decrement from 2 to 1
    fireEvent.click(minusBtn);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(minusBtn).toBeDisabled();

    // Increment up to limit
    for (let i = 1; i < 15; i++) {
      fireEvent.click(plusBtn);
    }
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(plusBtn).toBeDisabled();
  });

  it('handles candidate toggle via click, keyboard (Space/Enter), and Select Top N', async () => {
    const candidate1 = createMockMember('1', 'Test Grace', 'Prayer Coach');
    const candidate2 = createMockMember('2', 'Test Patrick', 'Prayer Coach');
    const allMembers = [candidate1, candidate2];

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue({
      recommendations: [
        { candidateToken: 'USR_001', rank: 1, reasoning: 'Reason 1' },
        { candidateToken: 'USR_002', rank: 2, reasoning: 'Reason 2' },
      ],
      invitations: {
        sms: 'Hi',
        viber: 'Hi',
        email: { subject: 'Subject', body: 'Body' },
      },
    });

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="3PM"
        role="Prayer Coach"
        neededCount={2}
        allMembers={allMembers}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });

    // Check slot formatting: 3PM -> 3:00 PM
    expect(screen.getByText('3:00 PM')).toBeInTheDocument();

    // Select Top 2 button
    const selectTopBtn = screen.getByRole('button', { name: /Select Top 2/i });
    fireEvent.click(selectTopBtn);

    // Click candidate 1 row to deselect
    const graceRow = screen.getAllByText('Test Grace Sample')[0].closest('div[role="button"]')!;
    fireEvent.click(graceRow);

    // Keyboard Space to re-select
    fireEvent.keyDown(graceRow, { key: ' ' });

    // Keyboard Enter to deselect again
    fireEvent.keyDown(graceRow, { key: 'Enter' });

    // Keyboard unrelated key ignored
    fireEvent.keyDown(graceRow, { key: 'Escape' });
  });

  it('supports Email and SMS channel switching, individual message copy, and contact list export', async () => {
    const candidate = createMockMember('1', 'Test Grace', 'Prayer Coach', {
      phone: '09171234567',
      email: 'grace@example.com',
    });

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue({
      recommendations: [{ candidateToken: 'USR_001', rank: 1, reasoning: 'Reason 1' }],
      invitations: {
        sms: 'SMS invite',
        viber: 'Viber invite',
        email: { subject: 'Volunteer Call', body: 'Dear volunteer, please serve.' },
      },
    });

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="invalid-format-date"
        timeSlot={'custom-slot' as unknown as TimeSlot}
        role="Prayer Coach"
        neededCount={1}
        allMembers={[candidate]}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });

    // Custom slot string is rendered as-is
    expect(screen.getByText('custom-slot')).toBeInTheDocument();

    // Switch to Email channel
    const emailTab = screen.getByRole('button', { name: /Email/i });
    fireEvent.click(emailTab);

    // Copy individual message (includes subject)
    const copyMsgBtn = screen.getByRole('button', { name: /Copy invite for/i });
    fireEvent.click(copyMsgBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Subject: Volunteer Call'),
    );

    // Copy Email List
    const copyEmailListBtn = screen.getByRole('button', { name: /Copy Email List/i });
    fireEvent.click(copyEmailListBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('grace@example.com');

    // Copy Template
    const copyTemplateBtn = screen.getByRole('button', { name: /Copy Template/i });
    fireEvent.click(copyTemplateBtn);

    // Switch to SMS channel
    const smsTab = screen.getByRole('button', { name: /SMS/i });
    fireEvent.click(smsTab);

    // Copy Numbers
    const copyNumbersBtn = screen.getByRole('button', { name: /Copy Numbers/i });
    fireEvent.click(copyNumbersBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('639171234567');
  });

  it('renders error banner and supports retry when recommendation query fails', async () => {
    const candidate = createMockMember('1', 'Test Grace', 'Prayer Coach');
    vi.mocked(hubCalendar.recommendStandIn).mockRejectedValueOnce(new Error('AI generation error'));

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        allMembers={[candidate]}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText(/Evaluation Failed/i)).toBeInTheDocument();
    });

    // Retry button click
    const retryBtn = screen.getByRole('button', { name: /Retry Evaluation/i });
    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValueOnce({
      recommendations: [{ candidateToken: 'USR_001', rank: 1, reasoning: 'Reason 1' }],
      invitations: {
        sms: 'Hi',
        viber: 'Hi',
        email: { subject: 'Subject', body: 'Body' },
      },
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });
  });

  it('shows error toast when clipboard copy fails', async () => {
    const candidate = createMockMember('1', 'Test Grace', 'Prayer Coach', {
      phone: '+639180001122',
    });
    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue({
      recommendations: [{ candidateToken: 'USR_001', rank: 1, reasoning: 'Reason 1' }],
      invitations: {
        sms: 'Hi',
        viber: 'Hi',
        email: { subject: 'Subject', body: 'Body' },
      },
    });

    // Make clipboard fail
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard blocked'));

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        allMembers={[candidate]}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });

    // Copy template should fail gracefully
    const copyTemplateBtn = screen.getByRole('button', { name: /Copy Template/i });
    fireEvent.click(copyTemplateBtn);

    // Copy individual should fail gracefully
    const copyMsgBtn = screen.getByRole('button', { name: /Copy invite for/i });
    fireEvent.click(copyMsgBtn);

    // Copy all should fail gracefully
    const copyAllBtn = screen.getByRole('button', { name: /Copy All Messages/i });
    fireEvent.click(copyAllBtn);

    // Copy numbers should fail gracefully
    const copyNumbersBtn = screen.getByRole('button', { name: /Copy Numbers/i });
    fireEvent.click(copyNumbersBtn);

    // Switch to email and copy email list should fail gracefully
    const emailTab = screen.getByRole('button', { name: /Email/i });
    fireEvent.click(emailTab);

    const copyEmailListBtn = screen.getByRole('button', { name: /Copy Email List/i });
    fireEvent.click(copyEmailListBtn);
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <StandInRecommenderModal
        isOpen={false}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        allMembers={[]}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles empty selections and missing contact details with warning toasts', async () => {
    const candidateNoContact = createMockMember('1', 'Test Grace', 'Prayer Coach', {
      phone: null,
      email: null,
    });

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue({
      recommendations: [{ candidateToken: 'USR_001', rank: 1, reasoning: 'Reason 1' }],
      invitations: {
        sms: 'Hi',
        viber: 'Hi',
        email: { subject: 'Subject', body: 'Body' },
      },
    });

    const handleClose = vi.fn();
    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={handleClose}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        allMembers={[candidateNoContact]}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });

    // Deselect candidate
    const graceRow = screen.getAllByText('Test Grace Sample')[0].closest('div[role="button"]')!;
    fireEvent.click(graceRow);

    // Copy with 0 selected volunteers triggers error toast
    const copyAllBtn = screen.getByRole('button', { name: /Copy All Messages/i });
    fireEvent.click(copyAllBtn);

    const copyNumbersBtn = screen.getByRole('button', { name: /Copy Numbers/i });
    fireEvent.click(copyNumbersBtn);

    // Re-select candidate with null phone and null email
    fireEvent.click(graceRow);

    // Attempt copying empty phone numbers
    fireEvent.click(copyNumbersBtn);

    // Switch to email and attempt copying empty emails
    const emailTab = screen.getByRole('button', { name: /Email/i });
    fireEvent.click(emailTab);

    const copyEmailListBtn = screen.getByRole('button', { name: /Copy Email List/i });
    fireEvent.click(copyEmailListBtn);

    // Clicking close button calls onClose
    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('resets copied state after timer expiration', async () => {
    vi.useFakeTimers();
    const candidate = createMockMember('1', 'Test Grace', 'Prayer Coach');
    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue({
      recommendations: [{ candidateToken: 'USR_001', rank: 1, reasoning: 'Reason 1' }],
      invitations: {
        sms: 'Hi',
        viber: 'Hi',
        email: { subject: 'Subject', body: 'Body' },
      },
    });

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026-11-01"
        timeSlot="9AM"
        role="Prayer Coach"
        allMembers={[candidate]}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    await vi.waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });

    const copyTemplateBtn = screen.getByRole('button', { name: /Copy Template/i });
    fireEvent.click(copyTemplateBtn);

    const copyMsgBtn = screen.getByRole('button', { name: /Copy invite for/i });
    fireEvent.click(copyMsgBtn);

    vi.advanceTimersByTime(2500);
    vi.useRealTimers();
  });

  it('handles excusedMember defaults, custom slots, and non-split date strings', async () => {
    const candidate = createMockMember('1', 'Test Grace', 'Prayer Coach');
    const excused = createMockMember('99', 'Test Patrick', 'Prayer Coach');

    vi.mocked(hubCalendar.recommendStandIn).mockResolvedValue({
      recommendations: [
        { candidateToken: 'USR_001', rank: 1, reasoning: 'Substitutes for regular volunteer' },
      ],
      invitations: {
        sms: 'Hi',
        viber: 'Hi',
        email: { subject: 'Subject', body: 'Body' },
      },
    });

    render(
      <StandInRecommenderModal
        isOpen={true}
        onClose={vi.fn()}
        targetDate="2026/11/01"
        timeSlot={'6PM' as unknown as TimeSlot}
        role="Prayer Coach"
        excusedMember={excused}
        allMembers={[candidate]}
        scheduleEntries={[]}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Grace Sample').length).toBeGreaterThan(0);
    });

    // Custom slot 6PM displayed
    expect(screen.getByText('6PM')).toBeInTheDocument();
    // Non-split date string displayed as-is
    expect(screen.getByText('2026/11/01')).toBeInTheDocument();
    // Default count with excusedMember defaults to 1
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
