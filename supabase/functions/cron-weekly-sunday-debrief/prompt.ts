import type { ComputedSundayMetrics, DebriefParsedResponse } from './types.ts';

export function getSystemPrompt(): string {
  return `You are a ministry operations analyst for the CCF Welcome Center.
Author a concise, factual 3-paragraph Sunday debrief for the Officer-in-Charge (OIC).

Strict Guidelines:
- Strictly factual, data-driven, and concise. No fluff, greetings, preambles, or sign-offs.
- PARAGRAPH 1 (Attendance Overview): Report the overall turn-up rate percentage, total present vs committed volunteers, and peak attendance slot.
- PARAGRAPH 2 (Role Variances): Highlight specific role surpluses and deficits (e.g. Ushers, Greeters, Prayer Coaches) by slot with exact numbers.
- PARAGRAPH 3 (Walk-ins & Action Items): Detail total walk-in volunteers, notable flow trends, and 1-2 actionable operational takeaways for next Sunday.

Output ONLY a valid JSON object matching this schema:
{
  "summary": "Three distinct paragraphs separated by double newlines (\\n\\n). Crisp, direct, and professional tone.",
  "keyHighlights": [
    "3 to 5 concise executive bullet strings (under 60 characters each)",
    "e.g. 'Turn-up reached 92.5% (64/70 volunteers)'",
    "e.g. 'Peak Service: 9:00 AM (38 present)'",
    "e.g. 'Usher shortage across 12:00 NN slot (-2)'",
    "e.g. '6 Walk-in volunteers accommodated'"
  ]
}`;
}

export function getUserPrompt(metrics: ComputedSundayMetrics): string {
  const surplusStr =
    metrics.overallSurplusRoles.length > 0
      ? metrics.overallSurplusRoles
          .map((r) => `${r.role}: ${r.present}/${r.committed} (+${r.diff})`)
          .join(', ')
      : 'None';

  const deficitStr =
    metrics.overallDeficitRoles.length > 0
      ? metrics.overallDeficitRoles
          .map((r) => `${r.role}: ${r.present}/${r.committed} (${r.diff})`)
          .join(', ')
      : 'None';

  const slotBreakdown = metrics.slotSummaries
    .map((s) => {
      const surplus = s.surplusRoles.map((r) => `${r.role} (+${r.diff})`).join(', ') || 'None';
      const deficit = s.deficitRoles.map((r) => `${r.role} (${r.diff})`).join(', ') || 'None';
      return `Slot ${s.slot}: Committed=${s.committed}, Present=${s.present}, Walk-ins=${s.walkIns}, Turn-up=${s.turnupRate}%. Surplus=[${surplus}], Deficits=[${deficit}]`;
    })
    .join('\n');

  return `Sunday Service Data for ${metrics.sundayDate} (CCF Welcome Center):
- Overall Turn-up Rate: ${metrics.turnupRate}%
- Total Committed: ${metrics.totalCommitted}
- Total Present: ${metrics.totalPresent}
- Total Walk-ins: ${metrics.totalWalkIns}
- Peak Attendance Slot: ${metrics.peakSlot}
- Overall Surplus Roles: ${surplusStr}
- Overall Deficit Roles: ${deficitStr}

Slots:
${slotBreakdown}

Generate the debrief JSON now.`;
}

/**
 * Extracts and cleans the JSON debrief response from Gemini.
 */
export function parseDebriefResponse(rawText: string): DebriefParsedResponse {
  let cleaned = rawText.trim();

  // Strip markdown code fences if Gemini returned them
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.summary === 'string') {
      const keyHighlights = Array.isArray(parsed.keyHighlights)
        ? parsed.keyHighlights.filter((h: unknown) => typeof h === 'string' && h.trim().length > 0)
        : [];

      return {
        summary: parsed.summary.trim(),
        keyHighlights,
      };
    }
  } catch {
    // If JSON parsing fails, fallback to raw text
  }

  return {
    summary: rawText.trim(),
    keyHighlights: [],
  };
}
