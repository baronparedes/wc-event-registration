import { describe, expect, it } from 'vitest';

import type { ResolvedToken } from '@/hooks/domain/chat/queries/useResolveUserTokensQuery';

import {
  buildReverseUserTokenMap,
  findMentionCandidates,
  tokenizeUserText,
  untokenizeUserText,
} from '../user-tokenizer';

describe('user-tokenizer', () => {
  const mockTokenMap: Record<string, ResolvedToken> = {
    USR_000001: {
      id: 'uuid-1',
      name: 'John Doe',
      fullName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      nickname: 'Johnny',
    },
    USR_000002: {
      id: 'uuid-2',
      name: 'John Doe Jr.',
      fullName: 'John Doe Jr.',
      firstName: 'John',
      lastName: 'Doe Jr.',
      nickname: 'JJ',
    },
    USR_000003: {
      id: 'uuid-3',
      name: 'Mary Jane Watson',
      fullName: 'Mary Jane Watson',
      firstName: 'Mary Jane',
      lastName: 'Watson',
      nickname: 'MJ',
    },
    USR_000004: {
      id: 'uuid-4',
      name: 'Peter Parker',
      fullName: 'Peter Parker',
      firstName: 'Peter',
      lastName: 'Parker',
      nickname: 'Spidey',
    },
  };

  describe('buildReverseUserTokenMap', () => {
    it('sorts names descending by length so longer compound names come first', () => {
      const entries = buildReverseUserTokenMap(mockTokenMap);
      expect(entries.length).toBeGreaterThan(0);

      // "Mary Jane Watson" or "John Doe Jr." should precede "John Doe"
      const names = entries.map((e) => e.name);
      const idxJr = names.indexOf('John Doe Jr.');
      const idxSr = names.indexOf('John Doe');
      expect(idxJr).toBeLessThan(idxSr);
    });
  });

  describe('tokenizeUserText', () => {
    it('replaces exact full names with tokens', () => {
      const input = 'Is John Doe scheduled for Sunday?';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Is USR_000001 scheduled for Sunday?');
    });

    it('matches compound names without partial replacement', () => {
      const input = 'Can we check John Doe Jr. and John Doe?';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Can we check USR_000002 and USR_000001?');
    });

    it('is case-insensitive', () => {
      const input = 'what did john doe do yesterday?';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('what did USR_000001 do yesterday?');
    });

    it('replaces explicit @ mentions for full names', () => {
      const input = 'Ask @Peter Parker for an update';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Ask USR_000004 for an update');
    });

    it('replaces explicit @ mentions for nicknames', () => {
      const input = 'Did @Spidey check in?';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Did USR_000004 check in?');
    });

    it('does not replace partial words inside other words', () => {
      const input = 'John Doeman is not a volunteer';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('John Doeman is not a volunteer');
    });

    it('handles start and end of strings cleanly', () => {
      const input = 'Peter Parker';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('USR_000004');
    });

    it('returns original text if token map is empty or null', () => {
      expect(tokenizeUserText('Hello world', {})).toBe('Hello world');
      expect(tokenizeUserText('', mockTokenMap)).toBe('');
    });
  });

  describe('untokenizeUserText', () => {
    it('converts tokens back to user display names', () => {
      const text = 'USR_000001 and USR_000004 served at 9AM';
      const result = untokenizeUserText(text, mockTokenMap);
      expect(result).toBe('John Doe and Peter Parker served at 9AM');
    });

    it('leaves unknown tokens as-is', () => {
      const text = 'USR_999999 served at 9AM';
      const result = untokenizeUserText(text, mockTokenMap);
      expect(result).toBe('USR_999999 served at 9AM');
    });
  });

  describe('findMentionCandidates', () => {
    it('returns top candidates matching prefix query', () => {
      const candidates = findMentionCandidates('john', mockTokenMap);
      expect(candidates.length).toBe(2);
      expect(candidates.some((c) => c.name === 'John Doe')).toBe(true);
      expect(candidates.some((c) => c.name === 'John Doe Jr.')).toBe(true);
    });

    it('matches nicknames as well', () => {
      const candidates = findMentionCandidates('spid', mockTokenMap);
      expect(candidates.length).toBe(1);
      expect(candidates[0]?.name).toBe('Peter Parker');
    });

    it('returns top members when query is empty', () => {
      const candidates = findMentionCandidates('', mockTokenMap, 3);
      expect(candidates.length).toBe(3);
    });
  });
});
