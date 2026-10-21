import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServiceWeeklyBrief } from '@/lib/domain/services';

import { WeeklyDebriefModal } from '../WeeklyDebriefModal';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseServiceWeeklyBriefByDateQuery = vi.fn();
const mockTriggerDebriefMutateAsync = vi.fn();

vi.mock('@/hooks/domain/services', () => ({
  useServiceWeeklyBriefByDateQuery: (date?: string) => mockUseServiceWeeklyBriefByDateQuery(date),
  useTriggerWeeklyDebriefMutation: () => ({
    mutateAsync: mockTriggerDebriefMutateAsync,
    isPending: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderModal(ui: React.ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const sampleBrief: ServiceWeeklyBrief = {
  id: 'brief-001',
  sunday_date: '2026-10-18',
  turnup_rate: 91.5,
  total_committed: 70,
  total_present: 64,
  total_walk_ins: 6,
  peak_slot: '9AM',
  summary:
    'Sunday services on October 18 saw strong volunteer turn-up of 91.5%, with 64 volunteers serving across morning and afternoon services.\n\nProduction and Greeter teams achieved full coverage, while Ushers had a 2-person deficit during the 12NN service.\n\nA total of 6 walk-in volunteers supported service operations seamlessly.',
  key_highlights: [
    'Turn-up rate reached 91.5%',
    'Peak slot: 9AM with 38 present',
    'Minor Usher deficit at 12NN',
    '6 walk-ins accommodated',
  ],
  created_at: '2026-10-19T00:00:00Z',
  updated_at: '2026-10-19T00:00:00Z',
};

describe('WeeklyDebriefModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no brief exists for the date', () => {
    mockUseServiceWeeklyBriefByDateQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });

    renderModal(<WeeklyDebriefModal isOpen={true} onClose={vi.fn()} selectedSunday="2026-10-18" />);

    expect(screen.getByText('Sunday Executive Debrief')).toBeInTheDocument();
    expect(screen.getByText('Sunday, October 18, 2026')).toBeInTheDocument();
    expect(screen.getByText('No Debrief Generated')).toBeInTheDocument();
    expect(screen.getByText('Generate with Hub AI')).toBeInTheDocument();
  });

  it('triggers debrief generation from empty state', async () => {
    mockUseServiceWeeklyBriefByDateQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockTriggerDebriefMutateAsync.mockResolvedValue({ success: true });

    renderModal(<WeeklyDebriefModal isOpen={true} onClose={vi.fn()} selectedSunday="2026-10-18" />);

    const generateBtn = screen.getByText('Generate with Hub AI');
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockTriggerDebriefMutateAsync).toHaveBeenCalledWith({
        sunday_date: '2026-10-18',
        force: true,
        notify: true,
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Debrief generated successfully and dispatched to OIC role',
      );
    });
  });

  it('renders debrief metrics, highlights, and paragraphs when brief exists', () => {
    mockUseServiceWeeklyBriefByDateQuery.mockReturnValue({
      data: sampleBrief,
      isLoading: false,
    });

    renderModal(<WeeklyDebriefModal isOpen={true} onClose={vi.fn()} selectedSunday="2026-10-18" />);

    expect(screen.getAllByText('Sunday, October 18, 2026')[0]).toBeInTheDocument();
    expect(screen.getByText('91.5%')).toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('+6')).toBeInTheDocument();
    expect(screen.getByText('Turn-up rate reached 91.5%')).toBeInTheDocument();
    expect(
      screen.getByText(/Sunday services on October 18 saw strong volunteer/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Production and Greeter teams achieved full coverage/),
    ).toBeInTheDocument();
    expect(screen.getByText('Copy Brief')).toBeInTheDocument();
    expect(screen.getByText('Regenerate Debrief')).toBeInTheDocument();
  });

  it('copies debrief text to clipboard when copy button is clicked', async () => {
    mockUseServiceWeeklyBriefByDateQuery.mockReturnValue({
      data: sampleBrief,
      isLoading: false,
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    renderModal(<WeeklyDebriefModal isOpen={true} onClose={vi.fn()} selectedSunday="2026-10-18" />);

    const copyBtn = screen.getByText('Copy Brief');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Executive debrief copied to clipboard');
    });
  });

  it('regenerates debrief when regenerate button is clicked', async () => {
    mockUseServiceWeeklyBriefByDateQuery.mockReturnValue({
      data: sampleBrief,
      isLoading: false,
    });
    mockTriggerDebriefMutateAsync.mockResolvedValue({ success: true });

    renderModal(<WeeklyDebriefModal isOpen={true} onClose={vi.fn()} selectedSunday="2026-10-18" />);

    const regenBtn = screen.getByText('Regenerate Debrief');
    fireEvent.click(regenBtn);

    await waitFor(() => {
      expect(mockTriggerDebriefMutateAsync).toHaveBeenCalledWith({
        sunday_date: '2026-10-18',
        force: true,
        notify: true,
      });
      expect(toast.success).toHaveBeenCalledWith('Debrief regenerated and saved successfully');
    });
  });

  it('calls onClose when close button is clicked', () => {
    mockUseServiceWeeklyBriefByDateQuery.mockReturnValue({
      data: sampleBrief,
      isLoading: false,
    });
    const handleClose = vi.fn();

    renderModal(
      <WeeklyDebriefModal isOpen={true} onClose={handleClose} selectedSunday="2026-10-18" />,
    );

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
