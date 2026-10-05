import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import {
  MultiSelectFieldRenderer,
  MultiSelectToggleFieldRenderer,
  RadioFieldRenderer,
  SelectFieldRenderer,
} from '@/components/fields/SelectFieldRenderer';
import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

function TestHarness({
  field,
  Component,
  defaultValue,
  memberRole,
  remainingSlotsByOption,
  remainingSlotsByRoleByOption,
}: {
  field: DynamicFieldLike;
  Component: React.ComponentType<{
    field: DynamicFieldLike;
    dynamicForm: ReturnType<typeof useForm<DynamicFieldResponseValues>>;
    memberRole?: string;
    remainingSlotsByOption?: Record<string, number>;
    remainingSlotsByRoleByOption?: Record<string, Record<string, number>>;
  }>;
  defaultValue?: unknown;
  memberRole?: string;
  remainingSlotsByOption?: Record<string, number>;
  remainingSlotsByRoleByOption?: Record<string, Record<string, number>>;
}) {
  const form = useForm<DynamicFieldResponseValues>({
    defaultValues: { [field.field_key]: defaultValue },
  });

  return (
    <Component
      field={field}
      dynamicForm={form}
      memberRole={memberRole}
      remainingSlotsByOption={remainingSlotsByOption}
      remainingSlotsByRoleByOption={remainingSlotsByRoleByOption}
    />
  );
}

describe('SelectFieldRenderer and variants', () => {
  const choiceField: DynamicFieldLike = {
    id: 'field-choice-1',
    field_key: 'session_choice',
    label: 'Select Session',
    field_type: 'select',
    is_required: false,
    options: [
      { value: 'morning', label: 'Morning Session' },
      { value: 'afternoon', label: 'Afternoon Session' },
    ],
  };

  describe('SelectFieldRenderer', () => {
    it('renders select dropdown trigger and opens options on click', () => {
      render(<TestHarness field={choiceField} Component={SelectFieldRenderer} defaultValue="" />);

      const trigger = screen.getByRole('button', { name: /Select an option/i });
      expect(trigger).toBeInTheDocument();

      fireEvent.click(trigger);
      expect(screen.getByText('Morning Session')).toBeInTheDocument();
      expect(screen.getByText('Afternoon Session')).toBeInTheDocument();
    });

    it('renders disabled option if slots are full', () => {
      render(
        <TestHarness
          field={choiceField}
          Component={SelectFieldRenderer}
          defaultValue=""
          remainingSlotsByOption={{ morning: 0, afternoon: 5 }}
        />,
      );

      const trigger = screen.getByRole('button', { name: /Select an option/i });
      fireEvent.click(trigger);

      expect(screen.getByText(/Morning Session \(0 slots left\)/i)).toBeInTheDocument();
    });

    it('supports large options list (> 10 items)', () => {
      const largeOptions = Array.from({ length: 12 }, (_, i) => ({
        value: `opt-${i}`,
        label: `Option ${i}`,
      }));

      render(
        <TestHarness
          field={{ ...choiceField, options: largeOptions }}
          Component={SelectFieldRenderer}
          defaultValue=""
        />,
      );

      const trigger = screen.getByRole('button', { name: /Select an option/i });
      fireEvent.click(trigger);

      expect(screen.getByText('Option 0')).toBeInTheDocument();
      expect(screen.getByText('Option 11')).toBeInTheDocument();
    });
  });

  describe('RadioFieldRenderer', () => {
    it('renders radio buttons for each option', () => {
      render(<TestHarness field={choiceField} Component={RadioFieldRenderer} defaultValue="" />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);

      fireEvent.click(radios[0]);
      expect(radios[0]).toBeChecked();
    });

    it('disables radio options when slots are 0 for role', () => {
      render(
        <TestHarness
          field={{
            ...choiceField,
            validation_rules: {
              max_slots_role_allotments: {
                morning: [{ role: 'volunteer', alloted_slots: 0 }],
              },
            },
          }}
          Component={RadioFieldRenderer}
          memberRole="volunteer"
          remainingSlotsByRoleByOption={{ morning: { volunteer: 0 } }}
        />,
      );

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toBeDisabled();
      expect(radios[1]).not.toBeDisabled();
    });

    it('handles wildcard role allotments', () => {
      render(
        <TestHarness
          field={{
            ...choiceField,
            validation_rules: {
              max_slots_role_allotments: {
                morning: [{ role: '*', alloted_slots: 0 }],
              },
            },
          }}
          Component={RadioFieldRenderer}
          remainingSlotsByRoleByOption={{ morning: { '*': 0 } }}
        />,
      );

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toBeDisabled();
    });
  });

  describe('MultiSelectFieldRenderer', () => {
    it('renders checkboxes for multiple options', () => {
      render(
        <TestHarness field={choiceField} Component={MultiSelectFieldRenderer} defaultValue={[]} />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);

      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe('MultiSelectToggleFieldRenderer', () => {
    const toggleField: DynamicFieldLike = {
      id: 'field-toggle-1',
      field_key: 'workshop_toggles',
      label: 'Workshops',
      field_type: 'multi_select_toggle',
      is_required: false,
      options: [
        {
          value: 'ws1',
          label: 'Workshop 1, Room 101',
          toggle_label: 'Snack?',
          toggle_default: null as unknown as boolean,
        },
      ],
    };

    it('handles checking, yes/no toggling, and unchecking', () => {
      render(
        <TestHarness
          field={toggleField}
          Component={MultiSelectToggleFieldRenderer}
          defaultValue={{}}
          remainingSlotsByOption={{ ws1: 10 }}
        />,
      );

      const mainCheckbox = screen.getByRole('checkbox', { name: /Workshop 1/i });
      expect(mainCheckbox).not.toBeChecked();

      // Check option
      fireEvent.click(mainCheckbox);
      expect(mainCheckbox).toBeChecked();
      expect(screen.getByText('Choose Yes or No to continue.')).toBeInTheDocument();

      // Click Yes
      const yesBtn = screen.getByRole('button', { name: /Workshop 1, Room 101 - Yes/i });
      fireEvent.click(yesBtn);
      expect(screen.queryByText('Choose Yes or No to continue.')).not.toBeInTheDocument();

      // Click No
      const noBtn = screen.getByRole('button', { name: /Workshop 1, Room 101 - No/i });
      fireEvent.click(noBtn);

      // Uncheck option
      fireEvent.click(mainCheckbox);
      expect(mainCheckbox).not.toBeChecked();
    });

    it('handles card click to toggle selection', () => {
      render(
        <TestHarness
          field={toggleField}
          Component={MultiSelectToggleFieldRenderer}
          defaultValue={{}}
        />,
      );

      const card = screen.getByText('Workshop 1').closest('[data-slot-option-card="true"]');
      expect(card).toBeInTheDocument();

      if (card) {
        fireEvent.click(card);
      }

      const mainCheckbox = screen.getByRole('checkbox', { name: /Workshop 1/i });
      expect(mainCheckbox).toBeChecked();
    });
  });
});
