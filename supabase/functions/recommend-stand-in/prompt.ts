import type { RecommendStandInPayload, RecommendStandInResponse } from './types.ts';

export function getSystemPrompt(neededCount = 3): string {
  const targetCount = Math.max(1, Math.min(20, neededCount));
  return `You are an expert ministry volunteer coordinator assistant for the Welcome Center at Christ's Commission Fellowship (CCF).
Your objective is to:
1. Rank the top candidate volunteers (up to ${targetCount}) for a walk-in assignment based on their reliability tier, turnup rate, attendance score, and usual slot affinity.
2. Provide a 1-sentence, grounded rationale for each ranked candidate explaining why they are an ideal fit.
3. Generate concise, warm, pastoral walk-in invitation drafts across 3 channels:
   - "sms": Direct, clear walk-in request with service details. MAXIMUM 160 characters.
   - "viber": Warm, friendly ministry ask with shift details and gracious tone. MAXIMUM 450 characters.
   - "email": Structured subject (<= 80 chars) and body (<= 500 chars).

PLACEHOLDER CONVENTION:
In the invitations, always use these exact placeholder tags:
- {{volunteer_name}} (for candidate greeting)
- {{service_date}} (for formatted Sunday date)
- {{service_time}} (for service time slot, e.g. 9:00 AM)
- {{role}} (for ministry role, e.g. Prayer Coach)

EDITORIAL & HUMAN VOICE RULES:
- Authentic Pastoral Tone: Warm, encouraging, respectful of volunteer time, and appreciative.
- Zero AI Slop & Buzzwords: Do NOT use corporate AI filler words (e.g. "delve", "tapestry", "beacon of hope", "embark", "supercharge", "unleash", "vibrant").
- Keep it direct and logistical: who is asking, what date/time, what role, and a clear reply ask.
- Natural Recommendation Rationales: In "reasoning", write a natural 1-sentence explanation of why the volunteer is recommended (e.g. "Consistently high 100% turnup rate with strong 9:00 AM slot affinity"). Do NOT include or prefix with candidate tokens (e.g. do not say "USR_001 has...").

STRICT PRIVACY & FORMATTING:
- Zero PII Leakage: Candidates are provided as anonymous tokens (e.g., USR_001). Never guess or invent real human names or personal emails.
- Return ONLY valid JSON matching this exact schema:
{
  "recommendations": [
    {
      "candidateToken": "USR_001",
      "rank": 1,
      "reasoning": "1-sentence grounded rationale"
    }
  ],
  "invitations": {
    "sms": "string (<= 160 chars)",
    "viber": "string (<= 450 chars)",
    "email": {
      "subject": "string (<= 80 chars)",
      "body": "string (<= 500 chars)"
    }
  }
}`;
}

export function getUserPrompt(payload: RecommendStandInPayload): string {
  const { targetDate, timeSlot, role, excusedMemberToken, candidates, neededCount } = payload;
  const targetCount = Math.max(1, Math.min(20, neededCount ?? 3));

  const formattedSlot =
    timeSlot === '9AM' ? '9:00 AM' : timeSlot === '12NN' ? '12:00 NN' : '3:00 PM';

  const excusedContext = excusedMemberToken
    ? `Context: Volunteer ${excusedMemberToken} is on excused leave and needs a walk-in substitute.`
    : `Context: Active volunteer deficit of ${neededCount ?? 1} in ${role} for this service slot.`;

  const candidateDescriptions = candidates
    .map(
      (c) =>
        `- ${c.token}: Tier: ${c.tier}, Turnup: ${c.turnupRate}%, Score: ${c.attendanceScore}, Usual Slots: ${c.usualSlots?.join(', ') || 'Flexible'}`,
    )
    .join('\n');

  return `Service Assignment:
- Sunday Date: ${targetDate}
- Time Slot: ${formattedSlot} (${timeSlot})
- Role: ${role}
${excusedContext}

Eligible Candidate Pool (Anonymized):
${candidateDescriptions}

Evaluate the candidates, select the top picks (up to ${targetCount}), rank them, provide a concise 1-sentence rationale for each, and draft the Viber, SMS, and Email invitations using the {{volunteer_name}}, {{service_date}}, {{service_time}}, and {{role}} placeholders. Output ONLY valid JSON.`;
}

export function parseStandInResponse(
  rawText: string,
  payload: RecommendStandInPayload,
): RecommendStandInResponse {
  const targetCount = Math.max(1, Math.min(20, payload.neededCount ?? 3));
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  try {
    const parsed = JSON.parse(cleaned);

    const validTokens = new Set(payload.candidates.map((c) => c.token));

    let rawRecs: Array<{ candidateToken?: string; rank?: number; reasoning?: string }> = [];
    if (Array.isArray(parsed?.recommendations)) {
      rawRecs = parsed.recommendations;
    }

    const recommendations = rawRecs
      .filter((r) => typeof r?.candidateToken === 'string' && validTokens.has(r.candidateToken))
      .slice(0, targetCount)
      .map((r, idx) => {
        const rawReasoning =
          typeof r.reasoning === 'string' && r.reasoning.trim()
            ? r.reasoning.trim()
            : 'Strong attendance reliability and availability for this service.';
        let cleanedReasoning = rawReasoning
          .replace(/^(?:(?:Candidate\s+)?(?:USR_\w+|MEM_\w+)[:\s-]*(?:has\s+|is\s+)?)/i, '')
          .trim();
        if (cleanedReasoning.length > 0) {
          cleanedReasoning = cleanedReasoning.charAt(0).toUpperCase() + cleanedReasoning.slice(1);
        }

        return {
          candidateToken: r.candidateToken!,
          rank: typeof r.rank === 'number' ? r.rank : idx + 1,
          reasoning:
            cleanedReasoning || 'Strong attendance reliability and availability for this service.',
        };
      });

    // Fallback if LLM returned no valid tokens
    if (recommendations.length === 0) {
      payload.candidates.slice(0, targetCount).forEach((c, idx) => {
        recommendations.push({
          candidateToken: c.token,
          rank: idx + 1,
          reasoning: `${c.turnupRate}% turnup rate with high service fidelity.`,
        });
      });
    }

    const rawInvitations = parsed?.invitations;
    const sms =
      typeof rawInvitations?.sms === 'string' && rawInvitations.sms.trim()
        ? rawInvitations.sms.trim().slice(0, 160)
        : `Hi {{volunteer_name}}, can you walk in for {{role}} this Sunday, {{service_date}} at {{service_time}}? Let us know if you are available. Thank you!`;

    const rawViberText = rawInvitations?.viber ?? rawInvitations?.whatsapp;
    const viber =
      typeof rawViberText === 'string' && rawViberText.trim()
        ? rawViberText.trim().slice(0, 450)
        : `Hi {{volunteer_name}}! Warm greetings from CCF Welcome Center. We have an opening for a {{role}} walk-in this Sunday, {{service_date}} for the {{service_time}} service. Would you be blessed and available to step in? Please let us know. Thank you for your faithful heart to serve!`;

    const emailSubject =
      typeof rawInvitations?.email?.subject === 'string' && rawInvitations.email.subject.trim()
        ? rawInvitations.email.subject.trim().slice(0, 80)
        : `Welcome Center: Walk-in Opportunity for {{service_date}} ({{service_time}})`;

    const emailBody =
      typeof rawInvitations?.email?.body === 'string' && rawInvitations.email.body.trim()
        ? rawInvitations.email.body.trim().slice(0, 500)
        : `Hi {{volunteer_name}},\n\nGreetings in Christ! We are reaching out because there is an open volunteer need for {{role}} this coming Sunday, {{service_date}} during the {{service_time}} service.\n\nGiven your faithful ministry commitment, we would love to invite you to walk in. Please reply to this email or message your coordinator to confirm.\n\nThank you and God bless!`;

    return {
      recommendations,
      invitations: {
        sms,
        viber,
        whatsapp: viber,
        email: {
          subject: emailSubject,
          body: emailBody,
        },
      },
    };
  } catch (err) {
    console.warn('[recommend-stand-in] Failed to parse LLM JSON, using fallback templates', err);

    const fallbackViber = `Hi {{volunteer_name}}! We have an opening for a {{role}} walk-in this Sunday, {{service_date}} at {{service_time}}. Would you be available to serve? Thank you!`;

    return {
      recommendations: payload.candidates.slice(0, 3).map((c, idx) => ({
        candidateToken: c.token,
        rank: idx + 1,
        reasoning: `${c.turnupRate}% turnup rate with high service fidelity.`,
      })),
      invitations: {
        sms: `Hi {{volunteer_name}}, can you walk in for {{role}} this Sunday, {{service_date}} at {{service_time}}? Please let us know if available. Thanks!`,
        viber: fallbackViber,
        whatsapp: fallbackViber,
        email: {
          subject: `Welcome Center: Walk-in Request for {{service_date}} ({{service_time}})`,
          body: `Hi {{volunteer_name}},\n\nWe have an open need for {{role}} this coming Sunday, {{service_date}} during the {{service_time}} service. Would you be available to step in?\n\nPlease let us know.\n\nThank you!`,
        },
      },
    };
  }
}
