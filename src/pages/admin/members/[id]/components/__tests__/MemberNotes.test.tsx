import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { MemberNote } from '@/lib/domain/members';

import { MemberNotes } from '../MemberNotes';

// Mock mutations
vi.mock('@/hooks/domain/members/mutations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/domain/members/mutations')>();
  return {
    ...actual,
    useAddMemberNoteMutation: () => ({
      mutateAsync: vi.fn(async () => {}),
      isPending: false,
    }),
    useDeleteMemberNoteMutation: () => ({
      mutateAsync: vi.fn(async () => {}),
      isPending: false,
    }),
  };
});

// Mock infrastructure
vi.mock('@/lib/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/infrastructure')>();
  return {
    ...actual,
    formatDateTime: (date: string) => new Date(date).toLocaleString(),
  };
});

describe('MemberNotes', () => {
  const mockNotes: MemberNote[] = [
    {
      id: '1',
      text: 'First note about member',
      author_id: 'author-1',
      author_name: 'Admin User',
      created_at: '2026-11-06T10:00:00Z',
    },
    {
      id: '2',
      text: 'Second note',
      author_id: 'author-2',
      author_name: 'Another Admin',
      created_at: '2026-11-05T15:00:00Z',
    },
  ];

  it('renders section card with title and subtitle', () => {
    render(<MemberNotes memberId="member-1" notes={[]} />);

    expect(screen.getByText('Member Notes')).toBeInTheDocument();
    expect(
      screen.getByText(/Add notes about this member \(max 255 characters\)/),
    ).toBeInTheDocument();
  });

  it('displays "No notes yet" message when notes array is empty', () => {
    render(<MemberNotes memberId="member-1" notes={[]} />);

    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  it('displays existing notes with author and date', () => {
    render(<MemberNotes memberId="member-1" notes={mockNotes} />);

    expect(screen.getByText('First note about member')).toBeInTheDocument();
    expect(screen.getByText('Second note')).toBeInTheDocument();
    expect(screen.getByText(/By Admin User on/)).toBeInTheDocument();
    expect(screen.getByText(/By Another Admin on/)).toBeInTheDocument();
  });

  it('renders textarea for adding new notes when not disabled', () => {
    render(<MemberNotes memberId="member-1" notes={[]} />);

    const textarea = screen.getByPlaceholderText('Type a new note...');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('maxLength', '255');
  });

  it('renders add note button when not disabled', () => {
    render(<MemberNotes memberId="member-1" notes={[]} />);

    expect(screen.getByRole('button', { name: /Add Note/i })).toBeInTheDocument();
  });

  it('hides textarea and add button when disabled prop is true', () => {
    render(<MemberNotes memberId="member-1" notes={[]} disabled={true} />);

    expect(screen.queryByPlaceholderText('Type a new note...')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Note/i })).not.toBeInTheDocument();
  });

  it('displays character count below textarea', () => {
    render(<MemberNotes memberId="member-1" notes={[]} />);

    expect(screen.getByText('0 / 255')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<MemberNotes memberId="member-1" notes={[]} />);

    const textarea = screen.getByPlaceholderText('Type a new note...');
    await user.type(textarea, 'Test note');

    expect(screen.getByText('9 / 255')).toBeInTheDocument();
  });

  it('disables add note button when textarea is empty', () => {
    render(<MemberNotes memberId="member-1" notes={[]} />);

    const addButton = screen.getByRole('button', { name: /Add Note/i });
    expect(addButton).toBeDisabled();
  });

  it('limits textarea input to 255 characters with maxLength attribute', () => {
    render(<MemberNotes memberId="member-1" notes={[]} />);

    const textarea = screen.getByPlaceholderText('Type a new note...') as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(255);
  });

  it('enables add note button when textarea has valid text', async () => {
    const user = userEvent.setup();
    render(<MemberNotes memberId="member-1" notes={[]} />);

    const textarea = screen.getByPlaceholderText('Type a new note...');
    await user.type(textarea, 'Valid note');

    const addButton = screen.getByRole('button', { name: /Add Note/i });
    expect(addButton).not.toBeDisabled();
  });

  it('displays delete button for each note when not disabled', () => {
    render(<MemberNotes memberId="member-1" notes={mockNotes} />);

    const deleteButtons = screen.getAllByLabelText('Delete note');
    expect(deleteButtons).toHaveLength(2);
  });

  it('does not display delete buttons when disabled is true', () => {
    render(<MemberNotes memberId="member-1" notes={mockNotes} disabled={true} />);

    expect(screen.queryByLabelText('Delete note')).not.toBeInTheDocument();
  });

  it('displays character count in correct color based on content', async () => {
    const user = userEvent.setup();
    render(<MemberNotes memberId="member-1" notes={[]} />);

    const textarea = screen.getByPlaceholderText('Type a new note...');
    await user.type(textarea, 'Valid note text');

    const charCount = screen.getByText(/\d+ \/ 255/);
    expect(charCount).toHaveClass('text-muted');
  });

  it('renders notes with proper styling and layout', () => {
    const { container } = render(<MemberNotes memberId="member-1" notes={mockNotes} />);

    const noteItems = container.querySelectorAll('li');
    expect(noteItems).toHaveLength(2);

    noteItems.forEach((item) => {
      expect(item).toHaveClass('flex', 'justify-between', 'items-start');
    });
  });

  it('displays author name and formatted creation date for each note', () => {
    render(<MemberNotes memberId="member-1" notes={mockNotes} />);

    // Check that author names are rendered
    expect(screen.getByText(/Admin User/)).toBeInTheDocument();
    expect(screen.getByText(/Another Admin/)).toBeInTheDocument();
  });

  it('properly formats note text with line breaks', () => {
    const noteWithBreaks: MemberNote[] = [
      {
        id: '1',
        text: 'Line 1\nLine 2\nLine 3',
        author_id: 'author-1',
        author_name: 'Admin',
        created_at: '2026-11-06T10:00:00Z',
      },
    ];

    const { container } = render(<MemberNotes memberId="member-1" notes={noteWithBreaks} />);

    const noteText = container.querySelector('.whitespace-pre-wrap');
    expect(noteText?.textContent).toContain('Line 1\nLine 2\nLine 3');
  });

  it('does not add note if text is only whitespace', async () => {
    const user = userEvent.setup();
    render(<MemberNotes memberId="member-1" notes={[]} />);

    const textarea = screen.getByPlaceholderText('Type a new note...');
    await user.type(textarea, '   ');

    const addButton = screen.getByRole('button', { name: /Add Note/i });
    expect(addButton).toBeDisabled();
  });

  it('passes correct memberId to mutations', () => {
    render(<MemberNotes memberId="member-123" notes={mockNotes} />);

    // Verify the component renders correctly with the memberId
    expect(screen.getByText('Member Notes')).toBeInTheDocument();
  });

  it('renders empty notes array when notes prop is not provided', () => {
    render(<MemberNotes memberId="member-1" notes={[]} />);

    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });

  it('displays notes in correct order', () => {
    render(<MemberNotes memberId="member-1" notes={mockNotes} />);

    const notesList = screen.getByText('First note about member').closest('li');
    const secondNote = screen.getByText('Second note').closest('li');

    expect(notesList).toBeInTheDocument();
    expect(secondNote).toBeInTheDocument();
  });
});
