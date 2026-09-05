import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { VisibilityRuleSection } from '../VisibilityRuleSection';

function VisibilityRuleSectionHarness(props: {
  isLocked?: boolean;
  availableParentFields?: Array<{ field_key: string; label: string }>;
  defaultDependsOn?: string;
}) {
  const {
    isLocked = false,
    availableParentFields = [
      { field_key: 'field_1', label: 'Category' },
      { field_key: 'field_2', label: 'Role' },
    ],
    defaultDependsOn = '',
  } = props;

  const { register, watch } = useForm({
    defaultValues: {
      val_visibility_depends_on_field_key: defaultDependsOn,
      val_visibility_equals_value: 'Others',
    },
  });

  const dependsOnFieldKey = watch('val_visibility_depends_on_field_key');

  return (
    <VisibilityRuleSection
      isLocked={isLocked}
      availableParentFields={availableParentFields}
      dependsOnFieldKey={dependsOnFieldKey}
      register={register}
    />
  );
}

describe('VisibilityRuleSection', () => {
  it('renders section title and parent field dropdown', () => {
    render(<VisibilityRuleSectionHarness />);

    expect(screen.getByText('Conditional Visibility')).toBeInTheDocument();
    expect(screen.getByLabelText(/Depends On Field/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/When Value Equals/i)).not.toBeInTheDocument();
  });

  it('shows target value input when parent field is selected', () => {
    render(<VisibilityRuleSectionHarness defaultDependsOn="field_1" />);

    expect(screen.getByLabelText(/When Value Equals/i)).toBeInTheDocument();
  });

  it('reveals target value input when user selects parent field', () => {
    render(<VisibilityRuleSectionHarness />);

    const select = screen.getByLabelText(/Depends On Field/i);
    fireEvent.change(select, { target: { value: 'field_2' } });

    expect(screen.getByLabelText(/When Value Equals/i)).toBeInTheDocument();
  });

  it('disables inputs when isLocked is true', () => {
    render(<VisibilityRuleSectionHarness isLocked defaultDependsOn="field_1" />);

    expect(screen.getByLabelText(/Depends On Field/i)).toBeDisabled();
    expect(screen.getByLabelText(/When Value Equals/i)).toBeDisabled();
  });

  it('shows message when no parent fields are available', () => {
    render(<VisibilityRuleSectionHarness availableParentFields={[]} />);

    expect(
      screen.getByText(/No other fields are available in this event yet to depend on/i),
    ).toBeInTheDocument();
  });
});
