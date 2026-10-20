/**
 * Utility functions for pruning and compacting conversation message history
 * to prevent runaway token accumulation over multi-turn chat sessions.
 */

export function compactMessageHistory<T extends { role: string; content: string }>(
  messages: T[],
  maxMessages = 6,
): T[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Preserve the most recent maxMessages and clean excess whitespace
  let window = (messages.length > maxMessages ? messages.slice(-maxMessages) : [...messages]).map(
    (msg) => ({
      ...msg,
      content: msg.content.trim().replace(/\n{3,}/g, '\n\n'),
    }),
  );

  // If the window begins on an assistant response, trim it so context begins with a user query
  if (window.length > 1 && window[0].role === 'assistant') {
    window = window.slice(1);
  }

  // Compact older assistant messages in the window (excluding the immediate last assistant turn)
  return window.map((msg, idx) => {
    if (msg.role === 'assistant' && idx < window.length - 1) {
      const lines = msg.content.split('\n');
      const tableLines = lines.filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
      if (tableLines.length > 4) {
        const nonTableLines = lines.filter(
          (l) => !l.trim().startsWith('|') || !l.trim().endsWith('|'),
        );
        const summary = '[Prior table details summarized for context]';
        const compacted = [...nonTableLines, summary].join('\n').trim();
        return {
          ...msg,
          content: compacted || msg.content,
        };
      }
    }
    return msg;
  });
}
