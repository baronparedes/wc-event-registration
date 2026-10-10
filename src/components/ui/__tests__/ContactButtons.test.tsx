import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as messagingUtils from '@/lib/infrastructure/messagingUtils';

import { ContactButtons } from '../ContactButtons';

describe('ContactButtons', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders valid links for SMS and Viber with proper URI schemes', () => {
    render(<ContactButtons phone="09171234567" />);

    const smsLink = screen.getByTestId('contact-sms-link');
    const viberLink = screen.getByTestId('contact-viber-link');

    expect(smsLink).toHaveAttribute('href', 'sms:+639171234567');
    expect(viberLink).toHaveAttribute('href', 'viber://chat?number=%2B639171234567');
  });

  it('includes URL-encoded message in both SMS and Viber links', () => {
    render(
      <ContactButtons phone="+639171234567" message="Hello from Welcome Hub! See you at 9am." />,
    );

    const smsLink = screen.getByTestId('contact-sms-link');
    const viberLink = screen.getByTestId('contact-viber-link');

    expect(smsLink).toHaveAttribute(
      'href',
      'sms:+639171234567?body=Hello%20from%20Welcome%20Hub!%20See%20you%20at%209am.',
    );
    expect(viberLink).toHaveAttribute(
      'href',
      'viber://chat?number=%2B639171234567&text=Hello%20from%20Welcome%20Hub!%20See%20you%20at%209am.',
    );
  });

  it('renders disabled state when phone number is invalid', () => {
    render(<ContactButtons phone="123" />);

    expect(screen.queryByTestId('contact-sms-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contact-viber-link')).not.toBeInTheDocument();

    const disabledSms = screen.getByTestId('contact-sms-disabled');
    const disabledViber = screen.getByTestId('contact-viber-disabled');

    expect(disabledSms).toBeDisabled();
    expect(disabledViber).toBeDisabled();
  });

  it('supports custom labels', () => {
    render(
      <ContactButtons
        phone="09171234567"
        smsLabel="Text Us"
        viberLabel="Message on Viber"
        copyLabel="Copy Mobile"
      />,
    );

    expect(screen.getByText('Text Us')).toBeInTheDocument();
    expect(screen.getByText('Message on Viber')).toBeInTheDocument();
    expect(screen.getByText('Copy Mobile')).toBeInTheDocument();
  });

  it('applies responsive layout by default and supports row and column layouts', () => {
    const { rerender } = render(<ContactButtons phone="09171234567" layout="responsive" />);
    const container = screen.getByTestId('contact-buttons');
    expect(container).toHaveClass('flex-col');
    expect(container).toHaveClass('sm:flex-row');

    rerender(<ContactButtons phone="09171234567" layout="row" />);
    expect(container).toHaveClass('flex-row');

    rerender(<ContactButtons phone="09171234567" layout="column" />);
    expect(container).toHaveClass('flex-col');
    expect(container).toHaveClass('w-full');
  });

  it('hides copy fallback button when showCopyFallback is false', () => {
    render(<ContactButtons phone="09171234567" showCopyFallback={false} />);
    expect(screen.queryByTestId('contact-copy-button')).not.toBeInTheDocument();
  });

  it('copies formatted number to clipboard and updates label to "Copied!" temporarily', async () => {
    vi.useFakeTimers();
    const copySpy = vi.spyOn(messagingUtils, 'copyPhoneNumberToClipboard').mockResolvedValue(true);
    const onCopySuccess = vi.fn();

    render(<ContactButtons phone="09171234567" onCopySuccess={onCopySuccess} />);

    const copyBtn = screen.getByTestId('contact-copy-button');
    expect(copyBtn).toHaveTextContent('Copy');

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(copySpy).toHaveBeenCalledWith('+639171234567');
    expect(onCopySuccess).toHaveBeenCalledTimes(1);
    expect(copyBtn).toHaveTextContent('Copied!');

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(copyBtn).toHaveTextContent('Copy');
    vi.useRealTimers();
  });

  it('invokes click callbacks for SMS and Viber', () => {
    const onSmsClick = vi.fn();
    const onViberClick = vi.fn();

    render(
      <ContactButtons phone="09171234567" onSmsClick={onSmsClick} onViberClick={onViberClick} />,
    );

    fireEvent.click(screen.getByTestId('contact-sms-link'));
    expect(onSmsClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('contact-viber-link'));
    expect(onViberClick).toHaveBeenCalledTimes(1);
  });

  it('renders solid vibrant icon-only buttons when variant is icon including primary copy badge', () => {
    render(<ContactButtons phone="09171234567" variant="icon" size="sm" />);

    const smsLink = screen.getByTestId('contact-sms-link');
    const viberLink = screen.getByTestId('contact-viber-link');
    const copyBtn = screen.getByTestId('contact-copy-button');

    expect(smsLink).toHaveAttribute('title', 'Send SMS');
    expect(viberLink).toHaveAttribute('title', 'Open Viber');
    expect(smsLink).toHaveClass('h-6', 'w-6', 'bg-emerald-600', 'text-white');
    expect(viberLink).toHaveClass('h-6', 'w-6', 'bg-[#7360F2]', 'text-white');
    expect(copyBtn).toHaveClass('h-6', 'w-6', 'bg-primary', 'text-white');
    expect(smsLink.querySelector('span')).not.toBeInTheDocument();
    expect(viberLink.querySelector('span')).not.toBeInTheDocument();
    expect(copyBtn.querySelector('span')).not.toBeInTheDocument();
  });

  it('renders primary outline copy button in default variant', () => {
    render(<ContactButtons phone="09171234567" variant="default" />);

    const copyBtn = screen.getByTestId('contact-copy-button');
    expect(copyBtn).toHaveClass('border-primary', 'text-primary');
  });
});
