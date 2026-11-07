import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecruiterNote } from '@/lib/domain/recruitment';

import { StepRecruiterNotesDialog } from '../StepRecruiterNotesDialog';

vi.mock('@/hooks/domain/recruitment', () => ({
  useAddRecruiterNoteMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const mockNotes: RecruiterNote[] = [
  {
    id: 'note-1',
    application_id: 'app-1',
    step_number: 4,
    attempt_number: 1,
    author_id: 'user-coach',
    author_name: 'Coach Sarah',
    author_role: 'Usher Lead',
    avatar_object_key: null,
    content: 'Candidate arrived promptly and completed checklist.',
    created_at: '2026-11-08T10:00:00+08:00',
  },
];

describe('StepRecruiterNotesDialog', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('renders modal header, existing notes, and allows closing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithClient(
      <StepRecruiterNotesDialog
        isOpen={true}
        onClose={onClose}
        applicationId="app-1"
        stepNumber={4}
        stepTitle="Observation"
        notes={mockNotes}
      />,
    );

    expect(screen.getByText('Recruiter Notes — Step 4: Observation')).toBeInTheDocument();
    expect(screen.getByText('Coach Sarah')).toBeInTheDocument();
    expect(
      screen.getByText('Candidate arrived promptly and completed checklist.'),
    ).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /^close$/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
