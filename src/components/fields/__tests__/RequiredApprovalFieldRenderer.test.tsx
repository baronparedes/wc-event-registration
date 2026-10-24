import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

import { RequiredApprovalFieldRenderer } from '../RequiredApprovalFieldRenderer';

function Harness(props: { label?: string; helpText?: string | null; approverName?: string }) {
  const dynamicForm = useForm<DynamicFieldResponseValues>();
  const field: DynamicFieldLike = {
    id: 'field-1',
    field_key: 'head_approval',
    label: props.label || 'Required Approval',
    field_type: 'required_approval',
    is_required: false,
    help_text: props.helpText,
    validation_rules: props.approverName ? { approver_name: props.approverName } : {},
  };
  return <RequiredApprovalFieldRenderer field={field} dynamicForm={dynamicForm} />;
}

describe('RequiredApprovalFieldRenderer', () => {
  it('renders callout with heading and notice text', () => {
    render(<Harness />);

    expect(screen.getByText('Required Approval')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Submissions for this form require administrator review before they are finalized. You will be notified once your submission is reviewed.',
      ),
    ).toBeInTheDocument();
  });

  it('renders designated approver line when approverName is provided', () => {
    render(<Harness approverName="Pastor David" />);

    expect(screen.getByText(/Designated Reviewer:/i)).toBeInTheDocument();
    expect(screen.getByText('Pastor David')).toBeInTheDocument();
  });

  it('renders custom help text when provided', () => {
    render(<Harness helpText="Special instructions for approval" />);

    expect(screen.getByText('Special instructions for approval')).toBeInTheDocument();
  });

  it('renders hidden input with pending_approval value', () => {
    const { container } = render(<Harness />);

    const hiddenInput = container.querySelector('input[type="hidden"]');
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput).toHaveAttribute('name', 'head_approval');
    expect(hiddenInput).toHaveAttribute('value', 'pending_approval');
  });
});
