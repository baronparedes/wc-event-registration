/**
 * RFID card reader utilities for handling endianness conversions and search.
 */
import type { AttendeeSearchResult } from '../types';

/**
 * Converts a hexadecimal string to a decimal number, with optional byte-order reversal.
 * Useful for RFID card readers that output data in Big-Endian format.
 *
 * @param inputString - Hex string (with optional 0x prefix, spaces, colons, hyphens, newlines)
 * @param reverseBytes - If true, reverses the 4-byte order before conversion (Big-Endian to Little-Endian)
 * @returns Decimal number if valid 8-character hex; original input string if validation fails
 *
 * Example:
 *   - Input: "46 6C 21 69" (Big-Endian, with spaces)
 *   - With reverseBytes=true: "69216C46" (Little-Endian) → 1747949638
 *   - With reverseBytes=false: "466C2169" (Big-Endian) → 1181130025
 */
export function convertHexToDecimal(
  inputString: string,
  reverseBytes: boolean = false,
): number | string {
  if (!inputString) return inputString;

  // 1. Clean the string: Remove 0x prefix, spaces, colons, hyphens, and newlines
  let currentString = inputString
    .trim()
    .replace(/^0x/i, '') // Removes '0x' or '0X' if present
    .replace(/[:\s\-\r\n]/g, ''); // Removes spaces, colons, hyphens, and line breaks

  // 2. Solid Hex Validator (Checks if it is exactly 8 hex characters now)
  const isHex = /^[0-9A-Fa-f]{8}$/.test(currentString);
  if (!isHex) {
    return inputString; // Fail safely, return original uncleaned input
  }

  // 3. Convert from Big to Little or vice versa
  if (reverseBytes) {
    const byte1 = currentString.substring(0, 2);
    const byte2 = currentString.substring(2, 4);
    const byte3 = currentString.substring(4, 6);
    const byte4 = currentString.substring(6, 8);

    currentString = byte4 + byte3 + byte2 + byte1;
  }

  // 4 & 5. Convert and Return
  return parseInt(currentString, 16);
}

/**
 * Attempts to detect if input is a Big-Endian RFID hex string and converts it.
 * This function intelligently checks if the input looks like a hex value and applies reversal.
 * It's conservative: only converts if it's clearly a hex string (not an alphanumeric ID).
 *
 * @param input - The member ID input (could be hex, decimal, or alphanumeric)
 * @returns Converted decimal string if detected as Big-Endian hex; original input otherwise
 */
export function tryConvertRfidInput(input: string): string {
  if (!input) return input;

  const cleaned = input
    .trim()
    .replace(/^0x/i, '')
    .replace(/[:\s\-\r\n]/g, '');

  // Only attempt conversion if it looks like 8-character hex (not a regular alphanumeric ID)
  if (/^[0-9A-Fa-f]{8}$/.test(cleaned)) {
    const reversed = convertHexToDecimal(cleaned, true);
    // If conversion succeeded and produced a number, return as string
    if (typeof reversed === 'number') {
      return String(reversed);
    }
  }

  return input;
}

/**
 * Filters a list of attendees by a search token.
 * Matches against full_name, member_id, and email (case-insensitive).
 */
function searchAttendeesLocally(
  attendees: AttendeeSearchResult[],
  token: string,
): AttendeeSearchResult[] {
  const t = token.trim().toLowerCase();
  if (!t) return [];

  return attendees.filter((a) => {
    const fullName = a.full_name.toLowerCase();
    const memberId = (a.member_id ?? '').toLowerCase();
    const email = (a.email ?? '').toLowerCase();

    return fullName.includes(t) || memberId.includes(t) || email.includes(t);
  });
}

/**
 * Searches attendees with dual-pass logic for backward compatibility.
 *
 * **Pass 1**: Search with original input (supports existing decimal member IDs)
 * **Pass 2**: If no results in Pass 1, apply RFID conversion and search again
 *
 * This ensures:
 * - Direct decimal ID searches work (backward compatible)
 * - RFID hex input is converted and matched (new feature)
 * - Name/email searches unaffected (they don't convert)
 *
 * @param attendees - List of attendees to search
 * @param searchInput - Search token (could be member_id, RFID hex, name, or email)
 * @returns Attendees matching the search (from Pass 1 if found, else Pass 2, else empty)
 */
export function searchAttendeesWithRfidFallback(
  attendees: AttendeeSearchResult[],
  searchInput: string,
): AttendeeSearchResult[] {
  // Pass 1: Search with original input
  const pass1Results = searchAttendeesLocally(attendees, searchInput);
  if (pass1Results.length > 0) {
    return pass1Results;
  }

  // Pass 2: Try converting RFID and search again
  const convertedInput = tryConvertRfidInput(searchInput);
  if (convertedInput !== searchInput) {
    const pass2Results = searchAttendeesLocally(attendees, convertedInput);
    if (pass2Results.length > 0) {
      return pass2Results;
    }
  }

  // No results from either pass
  return [];
}
