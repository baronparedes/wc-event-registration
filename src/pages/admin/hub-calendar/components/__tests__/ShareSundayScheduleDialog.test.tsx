import { faker } from '@faker-js/faker';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toJpeg } from 'html-to-image';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LEGAL_CONFIG } from '@/config/constants';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import type { AdminMember } from '@/lib/domain/members';

import { ShareSundayScheduleDialog } from '../ShareSundayScheduleDialog';

vi.mock('html-to-image', () => ({
  toJpeg: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/domain/members', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/domain/members')>();
  return {
    ...actual,
    useMemberAvatarQuery: vi.fn(() => ({ data: null })),
  };
});

const firstName1 = faker.person.firstName();
const lastName1 = faker.person.lastName();
const firstName2 = faker.person.firstName();
const lastName2 = faker.person.lastName();

describe('ShareSundayScheduleDialog', () => {
  const mockMember1: AdminMember = {
    id: 'm1',
    member_id: 'MEM-001',
    avatar_object_key: null,
    is_active: true,
    first_name: firstName1,
    last_name: lastName1,
    nickname: firstName1,
    full_name: `${firstName1} ${lastName1}`,
    email: faker.internet.exampleEmail({ firstName: firstName1, lastName: lastName1 }),
    phone: '123-456',
    date_of_birth: '1990-05-15',
    role: 'Usher',
    category: 'adult',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    extra_metadata: {},
  };

  const mockMember2: AdminMember = {
    id: 'm2',
    member_id: 'MEM-002',
    avatar_object_key: null,
    is_active: true,
    first_name: firstName2,
    last_name: lastName2,
    nickname: firstName2,
    full_name: `${firstName2} ${lastName2}`,
    email: faker.internet.exampleEmail({ firstName: firstName2, lastName: lastName2 }),
    phone: '654-321',
    date_of_birth: '1992-08-20',
    role: 'Prayer Coach',
    category: 'adult',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    extra_metadata: {},
  };

  const entry1: MemberScheduleEntry = {
    member: mockMember1,
    sundayKey: 'third_sunday',
    timeSlots: ['9AM'],
  };

  const entry2: MemberScheduleEntry = {
    member: mockMember2,
    sundayKey: 'third_sunday',
    timeSlots: ['12NN'],
  };

  const entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]> = {
    '9AM': [entry1],
    '12NN': [entry2],
    '3PM': [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    global.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['fake-image'], { type: 'image/jpeg' })),
    });
    vi.mocked(toJpeg).mockResolvedValue('data:image/jpeg;base64,mockJpegData');
  });

  it('does not render when isOpen is false', () => {
    render(
      <ShareSundayScheduleDialog
        isOpen={false}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9} // October
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders summary dialog with date, total volunteer count, and services breakdown', () => {
    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9} // October
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Share Sunday Schedule' })).toBeInTheDocument();
    expect(screen.getAllByText('Sunday, October 4, 2026')[0]).toBeInTheDocument();
    expect(screen.getByText('2 Total Volunteers')).toBeInTheDocument();
    expect(screen.getAllByText('9:00 AM Service')[0]).toBeInTheDocument();
    expect(screen.getAllByText('12:00 NN Service')[0]).toBeInTheDocument();
    expect(screen.getAllByText('3:00 PM Service')[0]).toBeInTheDocument();
    expect(
      screen.getAllByText(new RegExp(`Generated via ${LEGAL_CONFIG.appName}`, 'i'))[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText(mockMember1.full_name)[0]).toBeInTheDocument();
  });

  it('tags excused members in the schedule roster', () => {
    const excusedMap: ExcusedMemberMap = new Map([
      ['2026-10-04', new Map([['mem-001', new Set<TimeSlot>(['9AM'])]])],
    ]);

    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9}
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
        excusedMap={excusedMap}
      />,
    );

    expect(screen.getAllByText('Excused')[0]).toBeInTheDocument();
  });

  it('groups volunteers by primary role and renders secondary role subgroups', () => {
    const compoundFirstName = faker.person.firstName();
    const compoundLastName = faker.person.lastName();
    const compoundFullName = `${compoundFirstName} ${compoundLastName}`;

    const memberWithCompoundRole: AdminMember = {
      ...mockMember1,
      id: 'm3',
      member_id: 'MEM-003',
      first_name: compoundFirstName,
      last_name: compoundLastName,
      nickname: compoundFirstName,
      full_name: compoundFullName,
      role: 'IMT Support / Usher',
    };

    const compoundEntriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]> = {
      '9AM': [
        entry1,
        {
          member: memberWithCompoundRole,
          sundayKey: 'third_sunday',
          timeSlots: ['9AM'],
        },
      ],
      '12NN': [],
      '3PM': [],
    };

    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9}
        dayNumber={4}
        entriesByTimeSlot={compoundEntriesByTimeSlot}
      />,
    );

    expect(screen.getAllByText('IMT Support')[0]).toBeInTheDocument();
    expect(screen.getAllByText('+ Usher')[0]).toBeInTheDocument();
    expect(screen.getAllByText(compoundFullName)[0]).toBeInTheDocument();
  });

  it('calls navigator.share with all 3 service images when Share Images is clicked', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareMock, configurable: true });

    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9}
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
      />,
    );

    const shareButton = screen.getByRole('button', { name: /^Share$/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(toJpeg).toHaveBeenCalledTimes(3);
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Sunday Service Schedules'),
          files: expect.arrayContaining([expect.any(File)]),
        }),
      );
    });
  });

  it('ignores AbortError from navigator.share gracefully without error toast', async () => {
    const abortError = new DOMException('User cancelled share', 'AbortError');
    const shareMock = vi.fn().mockRejectedValue(abortError);
    const canShareMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareMock, configurable: true });

    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9}
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
      />,
    );

    const shareButton = screen.getByRole('button', { name: /^Share$/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalled();
    });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('falls back to downloading all images when native sharing is unavailable', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9}
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
      />,
    );

    const shareButton = screen.getByRole('button', { name: /^Share$/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalledTimes(3);
      expect(toast.success).toHaveBeenCalledWith('Schedule images downloaded');
    });

    clickSpy.mockRestore();
  });

  it('shows error toast when image generation fails', async () => {
    vi.mocked(toJpeg).mockRejectedValueOnce(new Error('Canvas error'));

    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9}
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
      />,
    );

    const shareButton = screen.getByRole('button', { name: /^Share$/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to generate schedule images');
    });
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onCloseMock = vi.fn();
    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={onCloseMock}
        year={2026}
        monthIndex={9}
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('downloads all 3 service images when Save is clicked', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <ShareSundayScheduleDialog
        isOpen={true}
        onClose={vi.fn()}
        year={2026}
        monthIndex={9}
        dayNumber={4}
        entriesByTimeSlot={entriesByTimeSlot}
      />,
    );

    const saveButton = screen.getByRole('button', { name: /^Save$/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalledTimes(3);
      expect(toast.success).toHaveBeenCalledWith('All 3 schedule images saved');
    });

    clickSpy.mockRestore();
  });
});
