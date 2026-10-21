import type { BroadcastTone, GenerateBroadcastDraftPayload } from './types.ts';

export function getSystemPrompt(): string {
  return `You are a ministry communications assistant for the Welcome Center at Christ's Commission Fellowship (CCF).
Your objective is to generate a concise, unified broadcast announcement for church members, attendees, and ministry volunteers:
- title: Punchy, clear, action-oriented subject line or title. MAXIMUM 100 characters.
- message: Direct, crisp, and fluff-free announcement details. Fits both push notifications and emails. MAXIMUM 500 characters.

NO AI SLOP & EDITORIAL EXCELLENCE RULES:
- Zero AI Slop & Buzzwords: Absolutely DO NOT use generic, flowery, or corporate AI filler words (e.g., "delve", "tapestry", "embark", "beacon of hope", "foster", "testament", "elevate", "vibrant tapestry", "supercharge", "unleash", "game-changer", "in this journey", "as we navigate", "vital role", "seamless").
- No Hollow Openers or Sign-offs: Strictly omit all greetings, preambles, and sign-offs (e.g., "Dear church family", "Hello team", "Greetings in Christ", "We are thrilled/excited to announce", "I hope this message finds you well", "Blessings to all", "Warmly"). Jump directly into the logistical facts or call to action.
- Authentic Human Voice: Write like an authentic Welcome Center coordinator at CCF—grounded, concise, direct, and human. Avoid performative piety, emotional fluff, or marketing hype.
- Keep It Actionable: Prioritize concrete logistics (who, what, when, where, and what action is required) over filler remarks.

STRICT SAFETY & PRIVACY RULES:
- Zero PII Leakage: Do NOT output or assume real personal names, personal email addresses, phone numbers, or private credentials.
- Adhere strictly to the length limits.
- Return ONLY valid JSON matching this exact structure:
{
  "title": "string (<= 100 chars)",
  "message": "string (<= 500 chars)"
}`;
}

export function getUserPrompt(payload: GenerateBroadcastDraftPayload): string {
  const { mode, notes, tone, targetType, targetRoles } = payload;

  const toneGuidance: Record<BroadcastTone, string> = {
    pastoral:
      'Tone: Pastoral & Warm. Encouraging, gracious, and appreciative, but strictly direct without flowery language or lengthy spiritual preambles.',
    urgent:
      'Tone: Urgent & Direct. Highlight immediate call-to-action, time-critical logistics, and clarity. Zero fluff.',
    informative:
      'Tone: Informative & Clear. Professional, structured, logistical clarity, and straightforward guidance.',
    fun: 'Tone: Fun & Engaging. Vibrant, upbeat, celebratory, and lively. Include fun, relevant emojis and expressive enthusiasm throughout the announcement.',
  };

  const modeGuidance =
    mode === 'polish'
      ? 'Mode: Polish Existing Draft. Elevate clarity and sentence structure, fix grammar, remove any filler or fluff, but preserve all dates, times, and key facts.'
      : 'Mode: New Draft from Notes. Transform rough notes into a concise, punchy announcement.';

  let audienceContext = '';
  if (targetType === 'role' && targetRoles && targetRoles.length > 0) {
    audienceContext = `Audience: CCF Welcome Center roles (${targetRoles.join(', ')}). Tailor messaging directly to their ministry responsibilities.`;
  } else if (targetType === 'event') {
    audienceContext = 'Audience: Event attendees and registrants.';
  } else if (targetType === 'all') {
    audienceContext = 'Audience: All church members and attendees.';
  }

  return `${modeGuidance}
${toneGuidance[tone]}
${audienceContext ? audienceContext + '\n' : ''}
Input Content:
"""
${notes.trim()}
"""

Produce the JSON object containing the "title" and "message" draft. Keep it punchy, human, and strictly free of AI filler, greetings, or buzzwords. Output ONLY the JSON.`;
}

export function parseDraftResponse(rawText: string): {
  title: string;
  message: string;
  push: { title: string; body: string };
  email: { title: string; body: string };
} {
  // Strip markdown code fences if wrapped by LLM
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  const parsed = JSON.parse(cleaned);

  // Extract from parsed.title / parsed.message (or fallback to legacy push/email if returned)
  const rawTitle = parsed?.title ?? parsed?.push?.title ?? parsed?.email?.title ?? '';
  const rawMessage =
    parsed?.message ?? parsed?.body ?? parsed?.push?.body ?? parsed?.email?.body ?? '';

  const title = String(rawTitle).slice(0, 100).trim() || 'Church Announcement';
  const message =
    String(rawMessage).slice(0, 500).trim() || 'Please check the app for the latest updates.';

  return {
    title,
    message,
    push: { title, body: message },
    email: { title, body: message },
  };
}
