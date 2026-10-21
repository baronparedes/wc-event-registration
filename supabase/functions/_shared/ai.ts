export const DEFAULT_GOOGLE_AI_MODEL = 'gemini-3.5-flash-lite';

/**
 * Returns the configured Google AI / Gemini API key.
 * Checks GOOGLE_API_KEY first, followed by GOOGLE_GENERATIVE_AI_API_KEY.
 */
export function getGoogleAiApiKey(): string | undefined {
  return (
    Deno.env.get('GOOGLE_API_KEY') ?? Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY') ?? undefined
  );
}

/**
 * Returns the configured Google AI model name (default: gemini-3.5-flash-lite).
 */
export function getGoogleAiModel(): string {
  return Deno.env.get('GOOGLE_AI_MODEL') ?? DEFAULT_GOOGLE_AI_MODEL;
}
