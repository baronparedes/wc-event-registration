export interface SlotChip {
  text: string;
  isExcused: boolean;
}

export function parseSlotChips(formattedSlots?: string | null): SlotChip[] {
  if (!formattedSlots || !formattedSlots.trim()) {
    return [];
  }

  const parts = formattedSlots
    .split(/,\s*|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.map((part) => {
    const isExcused = /\(excused\)/i.test(part);
    const cleanText = part.replace(/\s*\(excused\)/i, '').trim();

    return {
      text: cleanText,
      isExcused,
    };
  });
}
