export function parseErrorToJsonOrString(errorMessage: string): string {
  try {
    const parsed = JSON.parse(errorMessage);
    if (Array.isArray(parsed)) {
      return parsed
        .map((issue: Record<string, unknown>) => issue.message)
        .filter(Boolean)
        .join('\n');
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'message' in parsed &&
      typeof parsed.message === 'string'
    ) {
      return parsed.message;
    }
    return errorMessage;
  } catch {
    return errorMessage;
  }
}
