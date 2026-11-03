/**
 * Parses rating labels and descriptions from help_text or rule strings.
 * e.g., "1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time"
 */
export function parseRatingLabels(helpText?: string | null): Record<number, string> {
  if (!helpText) return {};
  const map: Record<number, string> = {};
  const parts = helpText.split(/[;\n]/);
  for (const part of parts) {
    const match = part.trim().match(/^(\d+)\s*[:=-]\s*(.+)$/);
    if (match) {
      const num = Number(match[1]);
      const text = match[2].trim();
      if (!Number.isNaN(num) && text) {
        map[num] = text;
      }
    }
  }
  return map;
}
