import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecruiterNote } from '@/lib/domain/recruitment';

import { StepRecruiterNotesThread } from '../StepRecruiterNotesThread';

const mockMutate = vi.fn();

vi.mock('@/hooks/domain/recruitment', async () => {
  const actual = await vi.importActual('@/hooks/domain/recruitment');
  return {
    ...actual,
    useAddRecruiterNoteMutation: () => ({
      mutate: mockMutate,
      isPending: false,
    }),
  };
});

describe('StepRecruiterNotesThread', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  const sampleNotes: RecruiterNote[] = [
    {
      id: 'note-1',
      application_id: 'app-123',
      step_number: 2,
      attempt_number: 1,
      author_id: 'user-1',
      author_name: 'David Pastor',
      author_role: 'admin',
      avatar_object_key: null,
      content: 'Candidate showed great communication skills during initial interview.',
      created_at: '2026-11-04T10:00:00Z',
    },
    {
      id: 'note-2',
      application_id: 'app-123',
      step_number: 2,
      attempt_number: 1,
      author_id: 'user-2',
      author_name: 'Sarah Lead',
      author_role: 'slod',
      avatar_object_key: 'avatars/sarah.png',
      content: 'Follow-up discussion: recommended for Prayer Coach.',
      created_at: '2026-11-04T11:30:00Z',
    },
  ];

  it('renders empty state when there are no notes', () => {
    renderWithClient(
      <StepRecruiterNotesThread
        applicationId="app-123"
        stepNumber={2}
        stepTitle="Ministry Interview"
        notes={[]}
      />,
    );

    expect(screen.getByText('Recruiter Notes')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('No recruiter notes recorded for this step yet.')).toBeInTheDocument();
    expect(screen.getByText('Add Recruiter Note *')).toBeInTheDocument();
  });

  it('renders recorded notes with author info, roles, and content', () => {
    renderWithClient(
      <StepRecruiterNotesThread
        applicationId="app-123"
        stepNumber={2}
        stepTitle="Ministry Interview"
        notes={sampleNotes}
      />,
    );

    expect(screen.getByText('Recruiter Notes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('David Pastor')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(
      screen.getByText('Candidate showed great communication skills during initial interview.'),
    ).toBeInTheDocument();

    expect(screen.getByText('Sarah Lead')).toBeInTheDocument();
    expect(screen.getByText('slod')).toBeInTheDocument();
    expect(
      screen.getByText('Follow-up discussion: recommended for Prayer Coach.'),
    ).toBeInTheDocument();
  });

  it('submits a new recruiter note when text is entered and form is submitted', () => {
    renderWithClient(
      <StepRecruiterNotesThread
        applicationId="app-123"
        stepNumber={2}
        stepTitle="Ministry Interview"
        notes={sampleNotes}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      'Type internal feedback, candidate observations, or notes for Step 2...',
    );
    fireEvent.change(textarea, {
      target: { value: 'Confirmed commitment for Sunday 1st service.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Add Note/i });
    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      {
        application_id: 'app-123',
        step_number: 2,
        content: 'Confirmed commitment for Sunday 1st service.',
      },
      expect.any(Object),
    );
  });

  it('does not submit when the composer input is empty or whitespace only', () => {
    renderWithClient(
      <StepRecruiterNotesThread
        applicationId="app-123"
        stepNumber={2}
        stepTitle="Ministry Interview"
        notes={sampleNotes}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /Add Note/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(
      'Type internal feedback, candidate observations, or notes for Step 2...',
    );
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(submitBtn).toBeDisabled();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
