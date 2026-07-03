import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClassicEventRegistrationFlow } from '@/pages/events/[slug]/register/components/ClassicEventRegistrationFlow';

const {
  mockUseEventRegistrationPageState,
  mockMemberLookupStepCard,
  mockLockedGateCard,
  mockDynamicFieldsStepCard,
} = vi.hoisted(() => ({
  mockUseEventRegistrationPageState: vi.fn(),
  mockMemberLookupStepCard: vi.fn(),
  mockLockedGateCard: vi.fn(),
  mockDynamicFieldsStepCard: vi.fn(),
}));

vi.mock('../hooks', () => ({
  useEventRegistrationPageState: (...args: unknown[]) => mockUseEventRegistrationPageState(...args),
}));

vi.mock('@/pages/events/[slug]/register/components', () => ({
  EventHeaderCard: () => <div>Header Card</div>,
  MemberLookupStepCard: (props: { suppressLookupWarning: boolean }) => {
    mockMemberLookupStepCard(props);
    return <div>Member Lookup Step</div>;
  },
  ProfileStepCard: () => <div>Profile Step</div>,
  DynamicFieldsStepCard: (props: { submitButtonLabel: string }) => {
    mockDynamicFieldsStepCard(props);
    return <div>Dynamic Fields Step</div>;
  },
  LockedGateCard: () => {
    mockLockedGateCard();
    return <div>Locked Gate</div>;
  },
}));

const baseState = {
  slug: 'event-1',
  eventQuery: { isLoading: false, isError: false },
  availability: { status: 'available' },
  isGateReady: true,
  eventWindowText: null,
  memberLookup: {
    lookupForm: {},
    isLookupPending: false,
    isRegistrationBlocked: false,
    memberIdHighlight: false,
    matchedMember: null,
    isUpdateMode: false,
    lockedStepMessage: null,
  },
  handleLookupSubmit: vi.fn(),
  lookupErrorMessage: null,
  lookupErrorFadeOut: false,
  memberIdInputRef: { current: null },
  clearLookupError: vi.fn(),
  dynamicFieldsStepRef: { current: null },
  eventFieldsQuery: { isLoading: false, isError: false, data: { issues: [] } },
  activeFields: [],
  kioskIdleSecondsRemaining: 90,
  dynamicForm: {},
  handleSubmitRegistration: vi.fn(),
  fieldErrorMessage: vi.fn(),
  submitMutation: { isPending: false },
  submitErrorMessage: null,
  submitSuccessMessage: null,
  handleCancelUpdate: vi.fn(),
  isRegistrationBlockedForCurrentFlow: false,
  shouldFadeBlockedRegistrationState: false,
};

describe('ClassicEventRegistrationFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseEventRegistrationPageState.mockReturnValue(baseState);
  });

  it('renders the full registration flow when gate is ready', () => {
    render(<ClassicEventRegistrationFlow />);

    expect(screen.getByText('Header Card')).toBeInTheDocument();
    expect(screen.getByText('Member Lookup Step')).toBeInTheDocument();
    expect(screen.getByText('Profile Step')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Fields Step')).toBeInTheDocument();
    expect(mockLockedGateCard).not.toHaveBeenCalled();
  });

  it('renders locked gate card when gate is not ready', () => {
    mockUseEventRegistrationPageState.mockReturnValue({
      ...baseState,
      isGateReady: false,
    });

    render(<ClassicEventRegistrationFlow />);

    expect(screen.getByText('Locked Gate')).toBeInTheDocument();
    expect(screen.queryByText('Member Lookup Step')).not.toBeInTheDocument();
    expect(mockLockedGateCard).toHaveBeenCalled();
  });

  it('passes lookup warning suppression flag from member lookup state', () => {
    mockUseEventRegistrationPageState.mockReturnValue({
      ...baseState,
      memberLookup: {
        ...baseState.memberLookup,
        isRegistrationBlocked: true,
      },
    });

    render(<ClassicEventRegistrationFlow />);

    expect(mockMemberLookupStepCard).toHaveBeenCalledWith(
      expect.objectContaining({
        suppressLookupWarning: true,
      }),
    );
  });

  it('uses update submit label when member lookup is in update mode', () => {
    mockUseEventRegistrationPageState.mockReturnValue({
      ...baseState,
      memberLookup: {
        ...baseState.memberLookup,
        isUpdateMode: true,
      },
    });

    render(<ClassicEventRegistrationFlow />);

    expect(mockDynamicFieldsStepCard).toHaveBeenCalledWith(
      expect.objectContaining({
        submitButtonLabel: 'Update',
      }),
    );
  });
});
