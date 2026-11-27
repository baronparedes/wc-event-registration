import { type ReactNode, useEffect, useState } from 'react';

import { Check, Copy, Mail, MessageSquare } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import {
  buildMailtoUri,
  copyPhoneNumberToClipboard,
  getMessagingLinks,
} from '@/lib/infrastructure';

import { Button } from './Button';

export type ContactButtonsLayout = 'row' | 'column' | 'responsive';
export type ContactButtonsSize = 'sm' | 'md' | 'lg';
export type ContactButtonsVariant = 'default' | 'icon';

export interface ContactButtonsProps {
  /** The recipient phone number. Omit to hide SMS, Viber, and Copy controls. */
  phone?: string;
  /** Optional recipient email address to render a quick mailto button. */
  email?: string;
  /** Optional pre-filled message text for both SMS and Viber. */
  message?: string;
  /** Optional pre-filled subject for the Email action. */
  emailSubject?: string;
  /** Optional pre-filled body for the Email action. */
  emailBody?: string;
  /** Visual style: 'default' with text labels, or 'icon' for subtle icon-only badges. Defaults to 'default'. */
  variant?: ContactButtonsVariant;
  /** Custom label for SMS button. Defaults to 'SMS'. */
  smsLabel?: string;
  /** Custom label for Viber button. Defaults to 'Viber'. */
  viberLabel?: string;
  /** Custom label for Email button. Defaults to 'Email'. */
  emailLabel?: string;
  /** Custom label for copy button. Defaults to 'Copy'. */
  copyLabel?: string;
  /** Default country calling code without leading plus. Defaults to '63'. */
  defaultCountryCode?: string;
  /** Layout orientation: 'row', 'column', or 'responsive' (column on mobile, row on sm+). Defaults to 'responsive'. */
  layout?: ContactButtonsLayout;
  /** Size of the buttons: 'sm', 'md', or 'lg'. Defaults to 'md'. */
  size?: ContactButtonsSize;
  /** Whether to render the clipboard copy helper button. Defaults to true. */
  showCopyFallback?: boolean;
  /** Custom CSS classes for the container wrapper. */
  className?: string;
  /** Custom CSS classes for the SMS button. */
  smsClassName?: string;
  /** Custom CSS classes for the Viber button. */
  viberClassName?: string;
  /** Custom CSS classes for the Email button. */
  emailClassName?: string;
  /** Custom CSS classes for the copy button. */
  copyClassName?: string;
  /** Callback fired when the SMS action is clicked. */
  onSmsClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  /** Callback fired when the Viber action is clicked. */
  onViberClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  /** Callback fired when the Email action is clicked. */
  onEmailClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  /** Callback fired after the phone number is copied to the clipboard. */
  onCopySuccess?: () => void;
}

/**
 * Clean vector Viber speech bubble icon with branded phone receiver.
 */
export function ViberIcon({ className = 'w-4 h-4' }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.5 3.5C17.5 1.7 14.8 1 12 1S6.5 1.7 4.5 3.5C2.5 5.3 1.5 7.8 1.5 10.5c0 2.2.7 4.3 2 6l-1.3 4.8c-.2.6.4 1.2 1 1l4.8-1.3c1.3.7 2.6 1 4 1 2.8 0 5.5-.7 7.5-2.5 2-1.8 3-4.3 3-7s-1-5.2-3-7zm-2.8 12.8c-.3.3-.8.4-1.2.3-1.6-.4-3.5-1.5-5.1-3.1-1.6-1.6-2.7-3.5-3.1-5.1-.1-.4 0-.9.3-1.2l1.2-1.2c.4-.4 1-.4 1.4 0l1.8 1.8c.4.4.4 1 0 1.4l-.6.6c.4.8 1 1.6 1.7 2.3.7.7 1.5 1.3 2.3 1.7l.6-.6c.4-.4 1-.4 1.4 0l1.8 1.8c.4.4.4 1 0 1.4l-1.2 1.2z"
      />
    </svg>
  );
}

const layoutStyles: Record<ContactButtonsLayout, string> = {
  row: 'flex flex-row items-center gap-1.5 flex-wrap',
  column: 'flex flex-col items-stretch gap-2 w-full',
  responsive: 'flex flex-col sm:flex-row sm:items-center gap-1.5 w-full sm:w-auto',
};

const iconSizes: Record<ContactButtonsSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const iconButtonDimensions: Record<ContactButtonsSize, string> = {
  sm: 'h-6 w-6 min-h-0 p-0 rounded-md',
  md: 'h-7.5 w-7.5 min-h-0 p-0 rounded-md',
  lg: 'h-9 w-9 min-h-0 p-0 rounded-md',
};

/**
 * Reusable contact buttons providing direct click-to-chat triggers
 * for native SMS and Viber apps, with graceful copy fallback for desktop/uninstalled environments.
 */
export function ContactButtons({
  phone,
  email,
  message,
  emailSubject,
  emailBody,
  variant = 'default',
  smsLabel = 'SMS',
  viberLabel = 'Viber',
  emailLabel = 'Email',
  copyLabel = 'Copy',
  defaultCountryCode = '63',
  layout = 'responsive',
  size = 'md',
  showCopyFallback = true,
  className,
  smsClassName,
  viberClassName,
  emailClassName,
  copyClassName,
  onSmsClick,
  onViberClick,
  onEmailClick,
  onCopySuccess,
}: ContactButtonsProps) {
  const [isCopied, setIsCopied] = useState(false);

  const hasPhoneProp = phone !== undefined;
  const { smsUri, viberUri, isValid, formattedNumber } = getMessagingLinks(phone ?? '', {
    message,
    defaultCountryCode,
  });

  const mailtoUri = email ? buildMailtoUri(email, { subject: emailSubject, body: emailBody }) : '';
  const trimmedEmail = email?.trim() ?? '';

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const handleCopy = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    const targetNumber = formattedNumber || phone || '';
    const success = await copyPhoneNumberToClipboard(targetNumber);
    if (success) {
      setIsCopied(true);
      onCopySuccess?.();
    }
  };

  if (!hasPhoneProp && !mailtoUri) {
    return null;
  }

  const isIconVariant = variant === 'icon';
  const iconClass = iconSizes[size];
  const isFullWidthInColumn = layout === 'column' && !isIconVariant;
  const dimensionClass = isIconVariant ? iconButtonDimensions[size] : '';

  // Brand styles: solid saturated colors with pure white icons for maximum contrast
  const smsClasses = isIconVariant
    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-2xs focus-visible:ring-emerald-500/50'
    : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs focus-visible:ring-emerald-500/50';

  const viberClasses = isIconVariant
    ? 'bg-[#7360F2] text-white hover:bg-[#624ee0] active:bg-[#523ecc] shadow-2xs focus-visible:ring-[#7360F2]/50'
    : 'bg-[#7360F2] text-white hover:bg-[#624ee0] active:bg-[#533ed1] shadow-xs focus-visible:ring-[#7360F2]/50';

  const emailClasses = isIconVariant
    ? 'bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 shadow-2xs focus-visible:ring-sky-500/50'
    : 'bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 shadow-xs focus-visible:ring-sky-500/50';

  const copyClasses = isIconVariant
    ? twMerge(
        'bg-primary text-white hover:bg-primary/90 active:bg-primary/80 shadow-2xs transition-colors',
        isCopied && 'bg-emerald-600 hover:bg-emerald-700 text-white',
      )
    : twMerge('transition-colors', isCopied && 'border-emerald-500 text-emerald-600');

  return (
    <div
      className={twMerge(
        isIconVariant ? 'inline-flex items-center gap-1.5' : layoutStyles[layout],
        className,
      )}
      data-testid="contact-buttons"
    >
      {/* SMS Button */}
      {hasPhoneProp &&
        (isValid ? (
          <Button
            asChild
            size={size}
            fullWidth={isFullWidthInColumn}
            className={twMerge(smsClasses, dimensionClass, smsClassName)}
          >
            <a
              href={smsUri}
              onClick={(e) => {
                e.stopPropagation();
                onSmsClick?.(e);
              }}
              aria-label={`Send SMS to ${formattedNumber}`}
              title="Send SMS"
              data-testid="contact-sms-link"
            >
              <MessageSquare className={iconClass} strokeWidth={2.25} aria-hidden="true" />
              {!isIconVariant && <span>{smsLabel}</span>}
            </a>
          </Button>
        ) : (
          <Button
            disabled
            size={size}
            fullWidth={isFullWidthInColumn}
            className={twMerge('opacity-50 cursor-not-allowed', dimensionClass, smsClassName)}
            onClick={(e) => {
              e.stopPropagation();
              onSmsClick?.(e);
            }}
            aria-label={`SMS unavailable (invalid phone number)`}
            title="SMS unavailable"
            data-testid="contact-sms-disabled"
          >
            <MessageSquare className={iconClass} strokeWidth={2.25} aria-hidden="true" />
            {!isIconVariant && <span>{smsLabel}</span>}
          </Button>
        ))}

      {/* Viber Button */}
      {hasPhoneProp &&
        (isValid ? (
          <Button
            asChild
            size={size}
            fullWidth={isFullWidthInColumn}
            className={twMerge(viberClasses, dimensionClass, viberClassName)}
          >
            <a
              href={viberUri}
              onClick={(e) => {
                e.stopPropagation();
                onViberClick?.(e);
              }}
              aria-label={`Open Viber chat with ${formattedNumber}`}
              title="Open Viber"
              data-testid="contact-viber-link"
            >
              <ViberIcon className={iconClass} />
              {!isIconVariant && <span>{viberLabel}</span>}
            </a>
          </Button>
        ) : (
          <Button
            disabled
            size={size}
            fullWidth={isFullWidthInColumn}
            className={twMerge('opacity-50 cursor-not-allowed', dimensionClass, viberClassName)}
            onClick={(e) => {
              e.stopPropagation();
              onViberClick?.(e);
            }}
            aria-label={`Viber unavailable (invalid phone number)`}
            title="Viber unavailable"
            data-testid="contact-viber-disabled"
          >
            <ViberIcon className={iconClass} />
            {!isIconVariant && <span>{viberLabel}</span>}
          </Button>
        ))}

      {/* Email Button */}
      {mailtoUri && (
        <Button
          asChild
          size={size}
          fullWidth={isFullWidthInColumn}
          className={twMerge(emailClasses, dimensionClass, emailClassName)}
        >
          <a
            href={mailtoUri}
            onClick={(e) => {
              e.stopPropagation();
              onEmailClick?.(e);
            }}
            aria-label={`Send email to ${trimmedEmail}`}
            title="Send Email"
            data-testid="contact-email-link"
          >
            <Mail className={iconClass} strokeWidth={2.25} aria-hidden="true" />
            {!isIconVariant && <span>{emailLabel}</span>}
          </a>
        </Button>
      )}

      {/* Copy Fallback Button */}
      {hasPhoneProp && showCopyFallback && (
        <Button
          type="button"
          variant={isIconVariant ? 'ghost' : 'primaryOutline'}
          size={size}
          fullWidth={isFullWidthInColumn}
          onClick={handleCopy}
          disabled={!phone}
          className={twMerge(copyClasses, dimensionClass, copyClassName)}
          aria-label={
            isCopied
              ? 'Phone number copied to clipboard'
              : `Copy phone number ${formattedNumber || phone}`
          }
          title={isCopied ? 'Copied!' : 'Copy phone number'}
          data-testid="contact-copy-button"
        >
          {isCopied ? (
            <Check
              className={twMerge(iconClass, isIconVariant ? 'text-white' : 'text-emerald-600')}
              aria-hidden="true"
            />
          ) : (
            <Copy
              className={twMerge(iconClass, isIconVariant && 'text-white')}
              aria-hidden="true"
            />
          )}
          {!isIconVariant && <span>{isCopied ? 'Copied!' : copyLabel}</span>}
        </Button>
      )}
    </div>
  );
}
