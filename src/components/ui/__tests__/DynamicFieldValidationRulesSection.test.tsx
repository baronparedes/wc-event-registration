import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import {
  DynamicFieldValidationRulesSection,
  type DynamicFieldValidationRulesSectionProps,
} from '@/components/ui/DynamicFieldValidationRulesSection';

vi.mock('@/hooks/domain/auth', () => ({
  useApproverUsersQuery: () => ({
    data: [
      {
        auth_user_id: 'user-1',
        email: 'approver@example.com',
        name: 'Approver One',
        role: 'admin',
        avatar_object_key: null,
      },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/domain/members/queries/useMemberAvatarQuery', () => ({
  useMemberAvatarQuery: () => ({ data: null }),
}));

type TestFormValues = {
  val_min_length?: number;
  val_max_length?: number;
  val_pattern?: string;
  val_min?: number;
  val_max?: number;
  val_min_selections?: number;
  val_max_selections?: number;
  val_min_date?: string;
  val_max_date?: string;
  val_max_past_days?: number;
  val_allowed_weekdays?: string[];
  val_unique_key_component?: boolean;
};

function Harness(props: Partial<DynamicFieldValidationRulesSectionProps<TestFormValues>>) {
  const { register } = useForm<TestFormValues>();

  return <DynamicFieldValidationRulesSection<TestFormValues> register={register} {...props} />;
}

describe('DynamicFieldValidationRulesSection', () => {
  it('returns null if no validation rules are enabled', () => {
    const { container } = render(<Harness />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders text validation fields (min/max length, pattern)', () => {
    render(<Harness showTextValidation />);

    expect(screen.getByLabelText(/Minimum Length/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum Length/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pattern \(Regex\)/i)).toBeInTheDocument();
  });

  it('renders number validation fields (min/max value)', () => {
    render(<Harness showNumberValidation />);

    expect(screen.getByLabelText(/Minimum Value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum Value/i)).toBeInTheDocument();
  });

  it('renders rating validation fields (max stars)', () => {
    render(<Harness showRatingValidation />);

    expect(screen.getByLabelText(/Max Stars \/ Rating Scale/i)).toBeInTheDocument();
  });

  it('renders multiselect validation fields (min/max selections)', () => {
    render(<Harness showMultiSelectValidation />);

    expect(screen.getByLabelText(/Minimum Selections/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Maximum Selections/i)).toBeInTheDocument();
  });

  it('renders date validation fields with extra rules (weekdays, past days)', () => {
    render(<Harness showDateValidation allowDateExtraRules />);

    expect(screen.getByLabelText(/Earliest Allowed Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Latest Allowed Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Max Days In The Past/i)).toBeInTheDocument();
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
  });

  it('renders duplicate matching toggle with error message', () => {
    render(
      <Harness allowUniqueMatching uniqueKeyComponentError="Must have at least one unique field" />,
    );

    expect(screen.getByLabelText(/Use In Duplicate Matching/i)).toBeInTheDocument();
    expect(screen.getByText('Must have at least one unique field')).toBeInTheDocument();
  });

  it('disables all inputs when disabled prop is true', () => {
    render(<Harness showTextValidation showNumberValidation allowUniqueMatching disabled />);

    expect(screen.getByLabelText(/Minimum Length/i)).toBeDisabled();
    expect(screen.getByLabelText(/Minimum Value/i)).toBeDisabled();
    expect(screen.getByLabelText(/Use In Duplicate Matching/i)).toBeDisabled();
    expect(
      screen.getByText('Validation rules are locked on published and archived records.'),
    ).toBeInTheDocument();
  });

  it('renders approval validation fields with approver selector and error message', () => {
    const handleApproverChange = vi.fn();
    render(
      <Harness
        showApprovalValidation
        approverEmail="approver@example.com"
        onApproverChange={handleApproverChange}
        approverError="An approver must be selected for Required Approval fields."
      />,
    );

    expect(screen.getByLabelText(/Designated Approver/i)).toBeInTheDocument();
    expect(
      screen.getByText('An approver must be selected for Required Approval fields.'),
    ).toBeInTheDocument();
  });

  it('forwards disabledApproverEmails to ApproverSelectField', () => {
    render(
      <Harness
        showApprovalValidation
        onApproverChange={vi.fn()}
        disabledApproverEmails={['approver@example.com']}
      />,
    );

    const input = screen.getByPlaceholderText('Search approver by name or email...');
    expect(input).toBeInTheDocument();
  });
});
