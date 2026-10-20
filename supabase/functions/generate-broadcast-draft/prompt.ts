import type { BroadcastTone, GenerateBroadcastDraftPayload } from './types.ts';

export function getSystemPrompt(): string {
  return `You are an expert ministry communications copilot for a church organization.
Your objective is to generate a unified broadcast announcement for church members and volunteers:
- title: Punchy, clear, action-oriented subject line or title. MAXIMUM 100 characters.
- message: Direct, natural, and clear announcement details. Fits both push notifications and emails. MAXIMUM 500 characters.

NO AI SLOP & EDITORIAL EXCELLENCE RULES:
- Zero AI Slop & Buzzwords: Absolutely DO NOT use generic, flowery, or corporate AI filler words (e.g., "delve", "tapestry", "embark", "beacon of hope", "foster", "testament", "elevate", "vibrant tapestry", "supercharge", "unleash", "game-changer", "in this journey", "as we navigate", "vital role", "seamless").
- No Hollow Openers or Sign-offs: Omit robotic greetings and generic filler openings (e.g., "Dear church family", "We are thrilled/excited to announce", "I hope this message finds you well", "Blessings to all"). Jump straight to the core message, call to action, or logistical updates.
- Authentic Human Voice: Write like an authentic ministry coordinator or ministry team lead—grounded, concise, direct, and human. Avoid performative piety or marketing hype.
- Keep It Actionable: Prioritize concrete logistics (who, what, when, where, and what action is required) over fluffy introductory remarks.

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
      'Tone: Pastoral & Warm. Express gratitude, warmth, encouraging community spirit, and grace.',
    urgent:
      'Tone: Urgent & Direct. Highlight immediate call-to-action, time-critical logistics, and clarity.',
    informative:
      'Tone: Informative & Clear. Professional, structured, logistical clarity, and straightforward guidance.',
    fun: 'Tone: Fun & Engaging. Vibrant, upbeat, celebratory, and lively. Include fun, relevant emojis and expressive enthusiasm throughout the announcement.',
  };

  const modeGuidance =
    mode === 'polish'
      ? 'Mode: Polish Existing Draft. Elevate the tone, refine sentence structure and clarity, fix grammar, but preserve all dates, times, and key facts.'
      : 'Mode: New Draft from Notes. Expand rough notes and bullet points into a coherent, well-crafted announcement.';

  let audienceContext = '';
  if (targetType === 'role' && targetRoles && targetRoles.length > 0) {
    audienceContext = `Audience: Specific ministry roles (${targetRoles.join(', ')}). Tailor messaging to their volunteer commitment.`;
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

Produce the JSON object containing the "title" and "message" draft. Keep it punchy, human, and free of AI filler or buzzwords. Output ONLY the JSON.`;
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
