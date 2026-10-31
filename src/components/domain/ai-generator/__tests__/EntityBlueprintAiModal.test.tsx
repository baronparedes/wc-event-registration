import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityBlueprintAiModal } from '../EntityBlueprintAiModal';

const {
  mockGenerateMutate,
  mockCreateEventMutateAsync,
  mockCreateFormMutateAsync,
  mockAppendFieldsMutateAsync,
} = vi.hoisted(() => ({
  mockGenerateMutate: vi.fn(),
  mockCreateEventMutateAsync: vi.fn(),
  mockCreateFormMutateAsync: vi.fn(),
  mockAppendFieldsMutateAsync: vi.fn(),
}));

let mockHookState = {
  isPending: false,
  isError: false,
  error: null as Error | null,
  triggerSuccess: true,
};

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/domain/ai-generator', () => ({
  useGenerateEntityBlueprintMutation: (options?: {
    onSuccess?: (data: unknown) => void;
    onError?: (err: Error) => void;
  }) => ({
    mutate: (payload: unknown) => {
      mockGenerateMutate(payload);
      if (mockHookState.triggerSuccess) {
        options?.onSuccess?.({
          domain: 'event',
          metadata: {
            title: 'Couples Fellowship 2026',
            slug: 'couples-fellowship-2026',
            description: 'A great evening for couples.',
            location: 'CCF Center',
            starts_at: '2026-11-21T09:00',
            ends_at: '2026-11-21T12:00',
            registration_opens_at: '2026-11-01T08:00',
            registration_closes_at: '2026-11-20T23:59',
            audience: 'members_and_public',
            duplicate_policy: 'block',
          },
          fields: [
            {
              field_key: 'spouse_name',
              label: "Spouse's Full Name",
              field_type: 'text',
              is_required: true,
              options: [],
              validation_rules: {},
            },
            {
              field_key: 'need_childcare',
              label: 'Need childcare?',
              field_type: 'radio',
              is_required: true,
              options: [
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ],
              validation_rules: {},
            },
          ],
        });
      } else if (mockHookState.isError && mockHookState.error) {
        options?.onError?.(mockHookState.error);
      }
    },
    isPending: mockHookState.isPending,
    isError: mockHookState.isError,
    error: mockHookState.error,
  }),
  useCreateEventWithBlueprintMutation: () => ({
    mutateAsync: mockCreateEventMutateAsync,
    isPending: false,
  }),
  useCreateFormWithBlueprintMutation: () => ({
    mutateAsync: mockCreateFormMutateAsync,
    isPending: false,
  }),
  useAppendBlueprintFieldsMutation: () => ({
    mutateAsync: mockAppendFieldsMutateAsync,
    isPending: false,
  }),
}));

describe('EntityBlueprintAiModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      isPending: false,
      isError: false,
      error: null,
      triggerSuccess: true,
    };
    mockCreateEventMutateAsync.mockResolvedValue({
      id: 'new-event-123',
      slug: 'couples-fellowship-2026',
    });
    mockCreateFormMutateAsync.mockResolvedValue({
      id: 'new-form-123',
      slug: 'couples-fellowship-2026',
    });
    mockAppendFieldsMutateAsync.mockResolvedValue(undefined);
  });

  it('renders modal with event inputs and audience options', () => {
    render(
      <MemoryRouter>
        <EntityBlueprintAiModal isOpen={true} onClose={vi.fn()} domain="event" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Event One-Click AI Generator')).toBeInTheDocument();
    const audienceDropdown = screen.getByRole('button', { name: 'Allow Public Registrations' });
    expect(audienceDropdown).toBeInTheDocument();
    expect(audienceDropdown).toHaveTextContent('Members + Public');
    expect(screen.getByPlaceholderText(/Couples Retreat on March 20-22/i)).toBeInTheDocument();
  });

  it('renders modal with form audience label and actual form audience options', () => {
    render(
      <MemoryRouter>
        <EntityBlueprintAiModal isOpen={true} onClose={vi.fn()} domain="form" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Form One-Click AI Generator')).toBeInTheDocument();
    const audienceDropdown = screen.getByRole('button', { name: 'Audience' });
    expect(audienceDropdown).toBeInTheDocument();
    expect(audienceDropdown).toHaveTextContent('Members and Public');

    // Open dropdown to verify standard options
    fireEvent.click(audienceDropdown);
    expect(screen.getByRole('option', { name: 'Members and Public' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Members Only' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Public Only' })).toBeInTheDocument();
    // Ensure "Select..." is not rendered as an option
    expect(screen.queryByRole('option', { name: 'Select...' })).not.toBeInTheDocument();
  });

  it('triggers mutation and renders preview with generated fields', () => {
    render(
      <MemoryRouter>
        <EntityBlueprintAiModal isOpen={true} onClose={vi.fn()} domain="event" />
      </MemoryRouter>,
    );

    const textarea = screen.getByRole('textbox', { name: /Describe the Event/i });
    fireEvent.change(textarea, { target: { value: 'Couples retreat prompt' } });

    const generateBtn = screen.getByRole('button', { name: /Generate Blueprint/i });
    fireEvent.click(generateBtn);

    expect(mockGenerateMutate).toHaveBeenCalledWith({
      domain: 'event',
      prompt: 'Couples retreat prompt',
      audiencePreference: 'members_and_public',
    });

    // Preview should now be visible
    expect(screen.getByText('Couples Fellowship 2026')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /General Details/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Questions/i })).toBeInTheDocument();
    expect(screen.getByText(/Event Schedule:/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-11-21 09:00 to 2026-11-21 12:00/i)).toBeInTheDocument();
    expect(screen.getByText(/Registration Window:/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-11-01 08:00 to 2026-11-20 23:59/i)).toBeInTheDocument();
  });

  it('allows switching to questions tab, toggling fields, and creating draft', async () => {
    const onCreatedSuccess = vi.fn();

    render(
      <MemoryRouter>
        <EntityBlueprintAiModal
          isOpen={true}
          onClose={vi.fn()}
          domain="event"
          onCreatedSuccess={onCreatedSuccess}
        />
      </MemoryRouter>,
    );

    const textarea = screen.getByRole('textbox', { name: /Describe the Event/i });
    fireEvent.change(textarea, { target: { value: 'Couples retreat prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Blueprint/i }));

    // Switch to Questions tab
    fireEvent.click(screen.getByRole('tab', { name: /Questions/i }));

    expect(screen.getByText("Spouse's Full Name")).toBeInTheDocument();
    expect(screen.getByText('Need childcare?')).toBeInTheDocument();

    // Click Apply & Create Draft
    const createBtn = screen.getByRole('button', { name: /Apply & Create Draft/i });
    await act(async () => {
      fireEvent.click(createBtn);
    });

    expect(mockCreateEventMutateAsync).toHaveBeenCalledWith({
      metadata: expect.objectContaining({ title: 'Couples Fellowship 2026' }),
      fields: expect.arrayContaining([
        expect.objectContaining({ field_key: 'spouse_name' }),
        expect.objectContaining({ field_key: 'need_childcare' }),
      ]),
    });

    expect(onCreatedSuccess).toHaveBeenCalledWith('new-event-123', 'couples-fellowship-2026');
  });

  it('calls onApplyToForm with full metadata including event dates when Apply to Form is clicked', async () => {
    const onApplyToForm = vi.fn();
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <EntityBlueprintAiModal
          isOpen={true}
          onClose={onClose}
          domain="event"
          onApplyToForm={onApplyToForm}
        />
      </MemoryRouter>,
    );

    const textarea = screen.getByRole('textbox', { name: /Describe the Event/i });
    fireEvent.change(textarea, { target: { value: 'Couples retreat prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Blueprint/i }));

    const applyBtn = screen.getByRole('button', { name: /Populate Form Only/i });
    fireEvent.click(applyBtn);

    expect(onApplyToForm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Couples Fellowship 2026',
        starts_at: '2026-11-21T09:00',
        ends_at: '2026-11-21T12:00',
        registration_opens_at: '2026-11-01T08:00',
        registration_closes_at: '2026-11-20T23:59',
      }),
      expect.any(Array),
    );
    expect(toast.success).toHaveBeenCalledWith('Applied generated details to the form.');
    expect(onClose).toHaveBeenCalled();
  });

  it('supports appending fields mode for existing forms or events', async () => {
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <EntityBlueprintAiModal
          isOpen={true}
          onClose={onClose}
          domain="form"
          mode="append_fields"
          existingEntityId="form-456"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Add Form Questions with AI')).toBeInTheDocument();

    const textarea = screen.getByRole('textbox', { name: /Describe the Form/i });
    fireEvent.change(textarea, { target: { value: 'Feedback survey questions' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Blueprint/i }));

    const addBtn = screen.getByRole('button', { name: /Add 2 Questions/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    expect(mockAppendFieldsMutateAsync).toHaveBeenCalledWith({
      domain: 'form',
      entityId: 'form-456',
      fields: expect.arrayContaining([expect.objectContaining({ field_key: 'spouse_name' })]),
    });
    expect(toast.success).toHaveBeenCalledWith('Added 2 fields successfully!');
  });
});
