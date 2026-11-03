import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { EmergencyContactSection } from '../EmergencyContactSection';

function EmergencyContactHarness() {
  const form = useForm<RecruitmentStep1Input>({
    defaultValues: {
      emergency_contact: { name: '', phone: '', relation: '' },
    },
  });

  return <EmergencyContactSection form={form} />;
}

describe('EmergencyContactSection', () => {
  it('updates and displays the selected emergency contact relationship', () => {
    render(<EmergencyContactHarness />);

    const relationSelect = screen.getByRole('button', { name: 'Relation to the Applicant *' });
    fireEvent.click(relationSelect);
    fireEvent.click(screen.getByRole('option', { name: 'Sibling' }));

    expect(relationSelect).toHaveTextContent('Sibling');
  });
});
