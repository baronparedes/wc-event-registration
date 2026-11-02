import type { ComputedSundayMetrics, DebriefParsedResponse } from './types.ts';

export function getSystemPrompt(): string {
  return `You are a ministry operations analyst for the CCF Welcome Center.
Author a concise, highly readable executive debrief for the Officer-in-Charge (OIC).

Readability & Style Guidelines:
- High-level synthesis over raw data: Write for quick scanning. Keep paragraphs short (2-3 sentences max).
- DO NOT LIST EVERY ROLE OR DELTA: Never mechanically recite every role or slot's plus/minus in running prose. The OIC already has the data table.
- Focus only on the 1 or 2 biggest operational takeaways and outliers (e.g. highlight the primary bottleneck). Ignore trivial ±1 variations.
- Professional, objective, and plain-spoken: Avoid storytelling fluff, editorial praise, or run-on parenthetical lists.

Structure (exactly 3 short, readable paragraphs separated by \\n\\n):
- PARAGRAPH 1 (Attendance Overview): High-level snapshot of overall turn-up percentage, total shifts filled vs committed, unique volunteer count, and peak service slot. (2 sentences max).
- PARAGRAPH 2 (Key Staffing Bottlenecks): Synthesize the single largest role shortage across the day and where it hit hardest. Mention any major surplus role in 1 sentence. (2-3 sentences max).
- PARAGRAPH 3 (Operational Takeaways): Note total walk-in volunteer impact in 1 sentence, and give 1-2 practical staffing priorities for the upcoming Sunday. (2 sentences max).

Output ONLY a valid JSON object matching this schema:
{
  "summary": "Three short, scannable paragraphs separated by double newlines (\\n\\n). Crisp, clear prose without run-on number lists.",
  "keyHighlights": [
    "3 to 5 concise executive bullets (under 60 characters each)",
    "e.g. 'Turn-up reached 75.1% across 143 unique volunteers'",
    "e.g. 'Peak service: 12NN with 65 volunteers present'",
    "e.g. 'Primary shortage: Prayer Coach (-46 across all slots)'",
    "e.g. '37 walk-in volunteers helped cover operational gaps'"
  ]
}`;
}

export function getUserPrompt(metrics: ComputedSundayMetrics): string {
  const deficitStr =
    metrics.overallDeficitRoles.length > 0
      ? metrics.overallDeficitRoles
          .map((r) => `${r.role}: ${r.present}/${r.committed} (${r.diff})`)
          .join(', ')
      : 'None';

  const surplusStr =
    metrics.overallSurplusRoles.length > 0
      ? metrics.overallSurplusRoles
          .map((r) => `${r.role}: ${r.present}/${r.committed} (+${r.diff})`)
          .join(', ')
      : 'None';

  const slotBreakdown = metrics.slotSummaries
    .map((s) => {
      const deficit = s.deficitRoles.map((r) => `${r.role} (${r.diff})`).join(', ') || 'None';
      const surplus = s.surplusRoles.map((r) => `${r.role} (+${r.diff})`).join(', ') || 'None';
      return `Slot ${s.slot}: Committed=${s.committed}, Present=${s.present}, Walk-ins=${s.walkIns}, Turn-up=${s.turnupRate}%. Deficits=[${deficit}], Surplus=[${surplus}]`;
    })
    .join('\n');

  return `Sunday Service Data for ${metrics.sundayDate} (CCF Welcome Center):
- Overall Turn-up Rate: ${metrics.turnupRate}%
- Total Committed: ${metrics.totalCommitted}
- Total Present: ${metrics.totalPresent}
- Total Walk-ins: ${metrics.totalWalkIns}
- Unique Volunteers: ${metrics.uniqueVolunteers}
- Peak Attendance Slot: ${metrics.peakSlot}
- Overall Deficit Roles: ${deficitStr}
- Overall Surplus Roles: ${surplusStr}

Slots:
${slotBreakdown}

Generate the debrief JSON now. Synthesize top patterns into short, readable prose. Do NOT list every role delta in a run-on sentence.`;
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
