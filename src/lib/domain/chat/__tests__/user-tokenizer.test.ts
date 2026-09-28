import { describe, expect, it } from 'vitest';

import type { ResolvedToken } from '@/hooks/domain/chat/queries/useResolveUserTokensQuery';

import {
  buildReverseUserTokenMap,
  findMentionCandidates,
  splitTextByMentions,
  tokenizeUserText,
  untokenizeUserText,
} from '../user-tokenizer';

describe('user-tokenizer', () => {
  const mockTokenMap: Record<string, ResolvedToken> = {
    USR_000001: {
      id: 'uuid-1',
      name: 'Sample Test',
      fullName: 'Sample Test',
      firstName: 'Sample',
      lastName: 'Test',
      nickname: 'Sample One',
    },
    USR_000002: {
      id: 'uuid-2',
      name: 'Sample Test Jr.',
      fullName: 'Sample Test Jr.',
      firstName: 'Sample',
      lastName: 'Test Jr.',
      nickname: 'Sample Junior',
    },
    USR_000003: {
      id: 'uuid-3',
      name: 'Test Multi Test Word',
      fullName: 'Test Multi Test Word',
      firstName: 'Test Multi',
      lastName: 'Test Word',
      nickname: 'Test MW',
    },
    USR_000004: {
      id: 'uuid-4',
      name: 'Test Test Four',
      fullName: 'Test Test Four',
      firstName: 'Test',
      lastName: 'Test Four',
      nickname: 'Test Hero',
    },
  };

  describe('buildReverseUserTokenMap', () => {
    it('sorts names descending by length so longer compound names come first', () => {
      const entries = buildReverseUserTokenMap(mockTokenMap);
      expect(entries.length).toBeGreaterThan(0);

      // "Test Multi Test Word" or "Sample Test Jr." should precede "Sample Test"
      const names = entries.map((e) => e.name);
      const idxJr = names.indexOf('Sample Test Jr.');
      const idxSr = names.indexOf('Sample Test');
      expect(idxJr).toBeLessThan(idxSr);
    });
  });

  describe('tokenizeUserText', () => {
    it('replaces exact full names with tokens', () => {
      const input = 'Is Sample Test scheduled for Sunday?';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Is USR_000001 scheduled for Sunday?');
    });

    it('matches compound names without partial replacement', () => {
      const input = 'Can we check Sample Test Jr. and Sample Test?';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Can we check USR_000002 and USR_000001?');
    });

    it('is case-insensitive', () => {
      const input = 'what did sample test do yesterday?';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('what did USR_000001 do yesterday?');
    });

    it('replaces explicit @ mentions for full names', () => {
      const input = 'Ask @Test Test Four for an update';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Ask USR_000004 for an update');
    });

    it('replaces explicit @ mentions for nicknames', () => {
      const input = 'Did @Test Hero check in?';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Did USR_000004 check in?');
    });

    it('does not replace partial words inside other words', () => {
      const input = 'Sample Testman is not a volunteer';
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Sample Testman is not a volunteer');
    });

    it('handles start and end of strings cleanly', () => {
      const input = 'Test Test Four';
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
      expect(result).toBe('Sample Test and Test Test Four served at 9AM');
    });

    it('leaves unknown tokens as-is', () => {
      const text = 'USR_999999 served at 9AM';
      const result = untokenizeUserText(text, mockTokenMap);
      expect(result).toBe('USR_999999 served at 9AM');
    });
  });

  describe('findMentionCandidates', () => {
    it('returns top candidates matching prefix query', () => {
      const candidates = findMentionCandidates('sample', mockTokenMap);
      expect(candidates.length).toBe(2);
      expect(candidates.some((c) => c.name === 'Sample Test')).toBe(true);
      expect(candidates.some((c) => c.name === 'Sample Test Jr.')).toBe(true);
    });

    it('matches nicknames as well', () => {
      const candidates = findMentionCandidates('test h', mockTokenMap);
      expect(candidates.length).toBe(1);
      expect(candidates[0]?.name).toBe('Test Test Four');
    });

    it('returns top members when query is empty', () => {
      const candidates = findMentionCandidates('', mockTokenMap, 3);
      expect(candidates.length).toBe(3);
    });
  });

  describe('splitTextByMentions', () => {
    it('splits text into mention and regular segments', () => {
      const segments = splitTextByMentions('Is @Sample Test scheduled for Sunday?', mockTokenMap);
      expect(segments).toEqual([
        { text: 'Is ', isMention: false },
        { text: '@Sample Test', isMention: true },
        { text: ' scheduled for Sunday?', isMention: false },
      ]);
    });

    it('identifies multiple mentions in a single string', () => {
      const segments = splitTextByMentions(
        'Ask @Test Test Four and @Test Multi Test Word',
        mockTokenMap,
      );
      expect(segments).toEqual([
        { text: 'Ask ', isMention: false },
        { text: '@Test Test Four', isMention: true },
        { text: ' and ', isMention: false },
        { text: '@Test Multi Test Word', isMention: true },
      ]);
    });

    it('returns single non-mention segment for plain text', () => {
      const segments = splitTextByMentions('Hello world', mockTokenMap);
      expect(segments).toEqual([{ text: 'Hello world', isMention: false }]);
    });

    it('returns empty array for empty string', () => {
      expect(splitTextByMentions('', mockTokenMap)).toEqual([]);
    });
  });
});
