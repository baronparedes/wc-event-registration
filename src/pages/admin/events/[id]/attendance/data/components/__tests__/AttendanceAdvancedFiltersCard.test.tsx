import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { DynamicFieldOption } from '@/lib/domain/attendance-views';

import { AttendanceAdvancedFiltersCard } from '../AttendanceAdvancedFiltersCard';

describe('AttendanceAdvancedFiltersCard', () => {
  it('renders field filter UI and allows applying a filter', async () => {
    const user = userEvent.setup();
    const onDynamicFilterCombinationChange = vi.fn();
    const onDynamicFilterFieldTokenChange = vi.fn();
    const onDynamicFilterValueChange = vi.fn();
    const onApplyDynamicFilter = vi.fn();
    const onCustomFilterJsonChange = vi.fn();
    const onApplyCustomJson = vi.fn();
    const onRemoveDynamicFilter = vi.fn();

    const mockRegistrationField = {
      label: 'Field 1',
      token: 'registration:field-1',
      fieldType: 'text' as const,
      source: 'registration' as const,
      fieldKey: 'field-1',
      values: [],
    } as unknown as DynamicFieldOption;

    render(
      <AttendanceAdvancedFiltersCard
        dynamicFilterCombination="and"
        dynamicFilterFieldToken="registration:field-1"
        dynamicFilterValue="some value"
        dynamicFilterFieldLabel="Field 1"
        dynamicFilterFieldType="text"
        registrationDynamicFieldOptions={[mockRegistrationField]}
        attendanceDynamicFieldOptions={[]}
        customFilterJson=""
        customFilterJsonError={null}
        dynamicFilters={[]}
        onDynamicFilterCombinationChange={onDynamicFilterCombinationChange}
        onDynamicFilterFieldTokenChange={onDynamicFilterFieldTokenChange}
        onDynamicFilterValueChange={onDynamicFilterValueChange}
        onApplyDynamicFilter={onApplyDynamicFilter}
        onCustomFilterJsonChange={onCustomFilterJsonChange}
        onApplyCustomJson={onApplyCustomJson}
        onRemoveDynamicFilter={onRemoveDynamicFilter}
      />,
    );

    const comboSelects = screen.getAllByRole('button');
    const comboSelect = comboSelects.find(
      (b) => b.getAttribute('aria-label') === 'Field-Based Conditions',
    );

    await user.click(comboSelect!);
    const orOption = screen.getByText('Any filter can match (OR)');
    await user.click(orOption);
    expect(onDynamicFilterCombinationChange).toHaveBeenCalledWith('or');

    const fieldSelect = comboSelects.find((b) => b.getAttribute('aria-label') === 'Filter field');

    await user.click(fieldSelect!);
    const field1Options = screen.getAllByText('Field 1');
    const optionToClick = field1Options.find(
      (el) => el.getAttribute('role') === 'option' || el.closest('[role="option"]'),
    );
    if (optionToClick) {
      await user.click(optionToClick);
      expect(onDynamicFilterFieldTokenChange).toHaveBeenCalledWith('registration:field-1');
    }

    const valueInput = screen.getByLabelText('Field value');
    expect(valueInput).toHaveValue('some value');

    await user.clear(valueInput);
    // Since user.type triggers change on each keystroke, we check that the handler was called
    expect(onDynamicFilterValueChange).toHaveBeenCalled();

    const applyBtn = screen.getByRole('button', { name: 'Apply field filter' });
    expect(applyBtn).toBeEnabled();

    await user.click(applyBtn);
    expect(onApplyDynamicFilter).toHaveBeenCalled();
  });

  it('renders dynamic filters and allows removing them', async () => {
    const user = userEvent.setup();
    const onRemoveDynamicFilter = vi.fn();

    render(
      <AttendanceAdvancedFiltersCard
        dynamicFilterCombination="and"
        dynamicFilterFieldToken=""
        dynamicFilterValue=""
        dynamicFilterFieldLabel={null}
        registrationDynamicFieldOptions={[]}
        attendanceDynamicFieldOptions={[]}
        customFilterJson=""
        customFilterJsonError={null}
        dynamicFilters={[
          {
            field: {
              fieldKey: 'field-1',
              label: 'Field 1',
              source: 'registration',
            } as unknown as DynamicFieldOption,
            value: 'match me',
          },
        ]}
        onDynamicFilterCombinationChange={vi.fn()}
        onDynamicFilterFieldTokenChange={vi.fn()}
        onDynamicFilterValueChange={vi.fn()}
        onApplyDynamicFilter={vi.fn()}
        onCustomFilterJsonChange={vi.fn()}
        onApplyCustomJson={vi.fn()}
        onRemoveDynamicFilter={onRemoveDynamicFilter}
      />,
    );

    const removeBtn = screen.getByTitle('Remove filter');
    expect(removeBtn).toHaveTextContent('Field 1 (registration): match me x');

    await user.click(removeBtn);
    // Token is composed as source:fieldKey
    expect(onRemoveDynamicFilter).toHaveBeenCalledWith('registration:field-1', 'match me');
  });

  it('disables apply button when label is missing or value is empty', () => {
    const { rerender } = render(
      <AttendanceAdvancedFiltersCard
        dynamicFilterCombination="and"
        dynamicFilterFieldToken="registration:field-1"
        dynamicFilterValue=""
        dynamicFilterFieldLabel="Field 1"
        registrationDynamicFieldOptions={[]}
        attendanceDynamicFieldOptions={[]}
        customFilterJson=""
        customFilterJsonError={null}
        dynamicFilters={[]}
        onDynamicFilterCombinationChange={vi.fn()}
        onDynamicFilterFieldTokenChange={vi.fn()}
        onDynamicFilterValueChange={vi.fn()}
        onApplyDynamicFilter={vi.fn()}
        onCustomFilterJsonChange={vi.fn()}
        onApplyCustomJson={vi.fn()}
        onRemoveDynamicFilter={vi.fn()}
      />,
    );

    let applyBtn = screen.getByRole('button', { name: 'Apply field filter' });
    expect(applyBtn).toBeDisabled();

    rerender(
      <AttendanceAdvancedFiltersCard
        dynamicFilterCombination="and"
        dynamicFilterFieldToken=""
        dynamicFilterValue="some value"
        dynamicFilterFieldLabel={null}
        registrationDynamicFieldOptions={[]}
        attendanceDynamicFieldOptions={[]}
        customFilterJson=""
        customFilterJsonError={null}
        dynamicFilters={[]}
        onDynamicFilterCombinationChange={vi.fn()}
        onDynamicFilterFieldTokenChange={vi.fn()}
        onDynamicFilterValueChange={vi.fn()}
        onApplyDynamicFilter={vi.fn()}
        onCustomFilterJsonChange={vi.fn()}
        onApplyCustomJson={vi.fn()}
        onRemoveDynamicFilter={vi.fn()}
      />,
    );

    applyBtn = screen.getByRole('button', { name: 'Apply field filter' });
    expect(applyBtn).toBeDisabled();
  });
});
