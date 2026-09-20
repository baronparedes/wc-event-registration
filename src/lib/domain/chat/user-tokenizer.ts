import type { ResolvedToken } from '@/hooks/domain/chat/queries/useResolveUserTokensQuery';

export const USER_TOKEN_REGEX = /USR_\d{6}/g;

export type NameTokenEntry = {
  token: string;
  name: string;
  isMultiWord: boolean;
  user: ResolvedToken;
};

/**
 * Escapes string for safe use in RegExp.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a list of name entries mapped to user tokens, sorted by descending name length.
 * Prioritizing longer names ensures compound names (e.g. "John Doe Jr.") match before substrings ("John Doe").
 */
export function buildReverseUserTokenMap(
  tokenMap: Record<string, ResolvedToken>,
): NameTokenEntry[] {
  const entries: NameTokenEntry[] = [];

  for (const [token, user] of Object.entries(tokenMap)) {
    if (!token || !user) continue;

    const candidateNames = new Set<string>();

    if (user.fullName && user.fullName.trim().length > 1) {
      candidateNames.add(user.fullName.trim());
    }

    if (user.firstName && user.lastName) {
      const combined = `${user.firstName.trim()} ${user.lastName.trim()}`.trim();
      if (combined.length > 1) {
        candidateNames.add(combined);
      }
    }

    if (user.name && user.name.trim().length > 1) {
      candidateNames.add(user.name.trim());
    }

    if (user.nickname && user.nickname.trim().length > 1) {
      candidateNames.add(user.nickname.trim());
    }

    for (const name of candidateNames) {
      entries.push({
        token,
        name,
        isMultiWord: name.includes(' '),
        user,
      });
    }
  }

  // Sort longest names first to prevent partial clobbering
  return entries.sort((a, b) => b.name.length - a.name.length);
}

/**
 * Replaces recognized member names and '@' mentions in text with their USR_XXXXXX tokens.
 *
 * Rules:
 * 1. Multi-word names (e.g. "John Doe") are automatically replaced with word boundaries.
 * 2. Any name preceded by '@' (e.g. "@John Doe" or "@Johnny") is always replaced.
 * 3. Single-word names without '@' are replaced if length >= 4 and not standard common words.
 */
export function tokenizeUserText(text: string, tokenMap: Record<string, ResolvedToken>): string {
  if (!text || !tokenMap || Object.keys(tokenMap).length === 0) {
    return text;
  }

  const entries = buildReverseUserTokenMap(tokenMap);
  if (entries.length === 0) {
    return text;
  }

  let result = text;

  for (const entry of entries) {
    const escaped = escapeRegExp(entry.name);

    if (entry.isMultiWord) {
      // Matches "@John Doe" or "John Doe" with identifier-safe boundaries
      const regex = new RegExp(`(^|[^a-zA-Z0-9_@])@?(${escaped})(?![a-zA-Z0-9_])`, 'gi');
      result = result.replace(regex, `$1${entry.token}`);
    } else {
      // For single-word names, always match if preceded by '@'
      const mentionRegex = new RegExp(`(^|[^a-zA-Z0-9_])@(${escaped})(?![a-zA-Z0-9_])`, 'gi');
      result = result.replace(mentionRegex, `$1${entry.token}`);

      // If single-word name is >= 4 chars, also match standalone with word boundaries
      if (entry.name.length >= 4) {
        const standaloneRegex = new RegExp(`(^|[^a-zA-Z0-9_@])(${escaped})(?![a-zA-Z0-9_])`, 'gi');
        result = result.replace(standaloneRegex, `$1${entry.token}`);
      }
    }
  }

  return result;
}

/**
 * Untokenizes USR_XXXXXX tokens in text back to their human-readable display names.
 */
export function untokenizeUserText(text: string, tokenMap: Record<string, ResolvedToken>): string {
  if (!text || !tokenMap || Object.keys(tokenMap).length === 0) {
    return text;
  }

  return text.replaceAll(USER_TOKEN_REGEX, (token) => {
    return tokenMap[token]?.name ?? token;
  });
}

/**
 * Searches and filters candidate members matching a query string (typed after '@').
 */
export function findMentionCandidates(
  query: string,
  tokenMap: Record<string, ResolvedToken>,
  limit = 5,
): ResolvedToken[] {
  if (!tokenMap) return [];

  const normalized = query.trim().toLowerCase();
  const allUsers = Object.values(tokenMap);

  // Deduplicate by user ID
  const uniqueUsers = Array.from(new Map(allUsers.map((u) => [u.id, u])).values());

  if (!normalized) {
    return uniqueUsers.sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
  }

  const scored = uniqueUsers
    .map((user) => {
      const name = (user.fullName || user.name || '').toLowerCase();
      const nickname = (user.nickname || '').toLowerCase();
      const firstName = (user.firstName || '').toLowerCase();
      const lastName = (user.lastName || '').toLowerCase();

      let score = 0;
      if (name.startsWith(normalized)) score = 100;
      else if (firstName.startsWith(normalized)) score = 90;
      else if (nickname.startsWith(normalized)) score = 80;
      else if (lastName.startsWith(normalized)) score = 70;
      else if (name.includes(normalized)) score = 50;
      else if (nickname.includes(normalized)) score = 40;

      return { user, score };
    })
    .filter((item) => item.score > 0);

  scored.sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name));

  return scored.slice(0, limit).map((s) => s.user);
}

export type TextMentionSegment = {
  text: string;
  isMention: boolean;
};

/**
 * Splits text into segments identifying '@' mentions for UI syntax highlighting.
 */
export function splitTextByMentions(
  text: string,
  tokenMap: Record<string, ResolvedToken>,
): TextMentionSegment[] {
  if (!text) return [];

  const entries = buildReverseUserTokenMap(tokenMap);
  const mentionPatterns = entries.map((e) => `@${escapeRegExp(e.name)}`);

  const patternString =
    mentionPatterns.length > 0
      ? `(${mentionPatterns.join('|')}|@[a-zA-Z0-9_]+)`
      : '(@[a-zA-Z0-9_]+)';

  const regex = new RegExp(patternString, 'gi');
  const segments: TextMentionSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isMention: false,
      });
    }
    segments.push({
      text: match[0],
      isMention: true,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isMention: false,
    });
  }

  return segments;
}
