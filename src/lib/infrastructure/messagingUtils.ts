/**
 * Messaging URI and phone number utilities.
 * Handles phone number sanitization, international formatting (E.164),
 * and generation of SMS and Viber click-to-chat URIs.
 */

export interface BuildSmsUriOptions {
  /** Optional pre-filled SMS message text. */
  body?: string;
  /**
   * Default country calling code without leading plus (e.g. '63' for Philippines).
   * Defaults to '63'.
   */
  defaultCountryCode?: string;
}

export interface BuildViberChatUriOptions {
  /** Optional pre-filled Viber message text. */
  text?: string;
  /**
   * Default country calling code without leading plus (e.g. '63' for Philippines).
   * Defaults to '63'.
   */
  defaultCountryCode?: string;
}

export interface MessagingLinksOptions {
  /** Optional pre-filled message body / text for both SMS and Viber. */
  message?: string;
  /** Default country calling code without leading plus (e.g. '63'). Defaults to '63'. */
  defaultCountryCode?: string;
}

export interface MessagingLinks {
  /** Full `sms:` URI scheme string, or empty string if number is invalid. */
  smsUri: string;
  /** Full `viber://chat` URI scheme string, or empty string if number is invalid. */
  viberUri: string;
  /** Whether the input phone number resolved to a valid international number. */
  isValid: boolean;
  /** Normalized international phone number in E.164 format (e.g. `+639171234567`). */
  formattedNumber: string;
}

const DEFAULT_COUNTRY_CODE = '63';

/**
 * Strips formatting characters (spaces, hyphens, parentheses, dots),
 * converts international dialing prefix `00` to `+`, and preserves leading `+`.
 */
export function sanitizePhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) {
    return '';
  }

  // Convert international prefix 00 (e.g. 0063...) to +
  const withPlusPrefix = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed;

  const hasLeadingPlus = withPlusPrefix.startsWith('+');
  const digitsOnly = withPlusPrefix.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Formats a given phone number into E.164 international format (e.g. `+639171234567`).
 * - If already starting with `+`, preserves country code and cleans non-digits.
 * - If starting with `00`, converts to `+` with following digits.
 * - If starting with `0` (local trunk prefix), strips leading `0` and prepends default country code.
 * - If starting with the country code digits directly without `+`, prepends `+`.
 * - Otherwise, prepends `+${defaultCountryCode}`.
 */
export function formatInternationalPhoneNumber(
  phone: string,
  defaultCountryCode = DEFAULT_COUNTRY_CODE,
): string {
  const sanitized = sanitizePhoneNumber(phone);
  if (!sanitized) {
    return '';
  }

  const cleanCountryCode = defaultCountryCode.replace(/\D/g, '') || DEFAULT_COUNTRY_CODE;

  if (sanitized.startsWith('+')) {
    return sanitized;
  }

  // Local trunk format (e.g., 09171234567 -> 639171234567)
  if (sanitized.startsWith('0')) {
    return `+${cleanCountryCode}${sanitized.slice(1)}`;
  }

  // Already prefixed with country code without plus (e.g., 639171234567)
  if (sanitized.startsWith(cleanCountryCode)) {
    return `+${sanitized}`;
  }

  // Number without local trunk 0 or country code (e.g., 9171234567)
  return `+${cleanCountryCode}${sanitized}`;
}

/**
 * Validates whether the given phone number satisfies international E.164 length
 * constraints (7 to 15 digits total, including country code).
 */
export function isValidPhoneNumber(
  phone: string,
  defaultCountryCode = DEFAULT_COUNTRY_CODE,
): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const formatted = formatInternationalPhoneNumber(phone, defaultCountryCode);
  if (!formatted.startsWith('+')) {
    return false;
  }

  const digits = formatted.slice(1);
  // ITU-T E.164: maximum 15 digits, minimum 7 digits
  return /^[1-9]\d{6,14}$/.test(digits);
}

/**
 * Generates an RFC 5724 compliant `sms:` URI.
 *
 * Example: `sms:+639171234567?body=Hello%20World`
 *
 * @param phone Target phone number.
 * @param options Optional pre-filled body text and default country code.
 * @returns URI string or empty string if phone is invalid.
 */
export function buildSmsUri(phone: string, options: BuildSmsUriOptions = {}): string {
  const { body, defaultCountryCode = DEFAULT_COUNTRY_CODE } = options;

  if (!phone || !isValidPhoneNumber(phone, defaultCountryCode)) {
    return '';
  }

  const formatted = formatInternationalPhoneNumber(phone, defaultCountryCode);
  const trimmedBody = body?.trim();

  if (!trimmedBody) {
    return `sms:${formatted}`;
  }

  return `sms:${formatted}?body=${encodeURIComponent(trimmedBody)}`;
}

/**
 * Generates a Viber chat URI using the `viber://chat` scheme.
 * The Viber scheme requires an international number with `%2B` encoded plus
 * and an optional encoded message `&text=`.
 *
 * Example: `viber://chat?number=%2B639171234567&text=Hello%20World`
 *
 * @param phone Target phone number.
 * @param options Optional pre-filled text and default country code.
 * @returns URI string or empty string if phone is invalid.
 */
export function buildViberChatUri(phone: string, options: BuildViberChatUriOptions = {}): string {
  const { text, defaultCountryCode = DEFAULT_COUNTRY_CODE } = options;

  if (!phone || !isValidPhoneNumber(phone, defaultCountryCode)) {
    return '';
  }

  const formatted = formatInternationalPhoneNumber(phone, defaultCountryCode);
  // Viber requires the leading '+' to be URL-encoded as '%2B'
  const encodedNumber = encodeURIComponent(formatted);

  let uri = `viber://chat?number=${encodedNumber}`;

  const trimmedText = text?.trim();
  if (trimmedText) {
    uri += `&text=${encodeURIComponent(trimmedText)}`;
  }

  return uri;
}

/**
 * Convenience helper to generate both SMS and Viber links and validation status in one call.
 */
export function getMessagingLinks(
  phone: string,
  options: MessagingLinksOptions = {},
): MessagingLinks {
  const { message, defaultCountryCode = DEFAULT_COUNTRY_CODE } = options;
  const isValid = isValidPhoneNumber(phone, defaultCountryCode);
  const formattedNumber = isValid ? formatInternationalPhoneNumber(phone, defaultCountryCode) : '';

  return {
    smsUri: isValid ? buildSmsUri(phone, { body: message, defaultCountryCode }) : '',
    viberUri: isValid ? buildViberChatUri(phone, { text: message, defaultCountryCode }) : '',
    isValid,
    formattedNumber,
  };
}

/**
 * Copies the phone number (or any text) to the clipboard with fallback support.
 */
export async function copyPhoneNumberToClipboard(phone: string): Promise<boolean> {
  const sanitized = phone.trim();
  if (!sanitized) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(sanitized);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = sanitized;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      const success =
        typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
      document.body.removeChild(textarea);
      return Boolean(success);
    } catch {
      return false;
    }
  }

  return false;
}
