import { faker } from '@faker-js/faker';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GuestInfoStepCard } from '../GuestInfoStepCard';

describe('GuestInfoStepCard', () => {
  it('renders guest form fields and handles valid submission', async () => {
    const handleSubmit = vi.fn();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.exampleEmail();

    render(<GuestInfoStepCard onSubmit={handleSubmit} />);

    expect(screen.getByText('Step 1: Respondent Information')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: firstName } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: lastName } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: email },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: '09123456789' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue to Questions/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: '09123456789',
        }),
        expect.anything(),
      );
    });
  });

  it('shows validation errors when submitting empty fields', async () => {
    const handleSubmit = vi.fn();

    render(<GuestInfoStepCard onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /Continue to Questions/i }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Valid email is required')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('renders switch to member button when allowSwitchToMember is true and triggers callback', () => {
    const handleSwitch = vi.fn();

    render(
      <GuestInfoStepCard
        onSubmit={vi.fn()}
        allowSwitchToMember={true}
        onSwitchToMember={handleSwitch}
      />,
    );

    const switchBtn = screen.getByRole('button', { name: 'I am a Member' });
    expect(switchBtn).toBeInTheDocument();

    fireEvent.click(switchBtn);
    expect(handleSwitch).toHaveBeenCalledTimes(1);
  });

  it('populates initial form values from defaultValues prop', () => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.exampleEmail();
    render(
      <GuestInfoStepCard
        onSubmit={vi.fn()}
        defaultValues={{
          first_name: firstName,
          last_name: lastName,
          email,
          phone: '09999999999',
        }}
      />,
    );

    expect(screen.getByLabelText(/First Name/i)).toHaveValue(firstName);
    expect(screen.getByLabelText(/Last Name/i)).toHaveValue(lastName);
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue(email);
    expect(screen.getByLabelText(/Phone Number/i)).toHaveValue('09999999999');
  });

  it('shows submitting state when isSubmitting is true', () => {
    render(<GuestInfoStepCard onSubmit={vi.fn()} isSubmitting={true} />);

    expect(screen.getByRole('button', { name: 'Continuing...' })).toBeDisabled();
  });

  it('renders inactivity timer message when inactivityTimeoutMs is provided', () => {
    render(
      <GuestInfoStepCard
        onSubmit={vi.fn()}
        inactivityTimeoutMs={5000}
        onInactivityTimeout={vi.fn()}
      />,
    );

    expect(screen.getByText(/Resetting in 5s if inactive/i)).toBeInTheDocument();
  });
});
