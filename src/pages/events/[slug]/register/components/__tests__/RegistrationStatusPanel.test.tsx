import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RegistrationStatusPanel } from '../RegistrationStatusPanel';

describe('RegistrationStatusPanel', () => {
  it('renders blocked variant copy and styles', () => {
    render(
      <RegistrationStatusPanel
        isRegistrationBlocked
        isUpdateMode={false}
        registrationStatusRef={createRef()}
      />,
    );

    expect(
      screen.getByText('You are already registered. No further actions are needed at the moment.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your registration is already complete for this event.'),
    ).toBeInTheDocument();
  });

  it('renders update variant copy when not blocked and update mode is true', () => {
    render(
      <RegistrationStatusPanel
        isRegistrationBlocked={false}
        isUpdateMode
        registrationStatusRef={createRef()}
      />,
    );

    expect(screen.getByText('You are already registered for this event.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tap "Yes, I confirm" to continue to Step 3 if you want to update your registration.',
      ),
    ).toBeInTheDocument();
  });

  it('renders new-registration variant copy when not blocked and update mode is false', () => {
    render(
      <RegistrationStatusPanel
        isRegistrationBlocked={false}
        isUpdateMode={false}
        registrationStatusRef={createRef()}
      />,
    );

    expect(screen.getByText('Tap "Yes, I confirm" to continue to Step 3.')).toBeInTheDocument();
  });
});
