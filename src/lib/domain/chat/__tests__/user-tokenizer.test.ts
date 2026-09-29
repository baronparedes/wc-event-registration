import { faker } from '@faker-js/faker';
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
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const baseName = `${firstName} ${lastName}`;
  const juniorName = `${baseName} Jr.`;
  const thirdName = faker.person.fullName();
  const fourthName = faker.person.fullName();
  const fourthNickname = faker.person.fullName();
  const mockTokenMap: Record<string, ResolvedToken> = {
    USR_000001: {
      id: 'uuid-1',
      name: baseName,
      fullName: baseName,
      firstName,
      lastName,
      nickname: faker.person.fullName(),
    },
    USR_000002: {
      id: 'uuid-2',
      name: juniorName,
      fullName: juniorName,
      firstName,
      lastName: `${lastName} Jr.`,
      nickname: faker.person.fullName(),
    },
    USR_000003: {
      id: 'uuid-3',
      name: thirdName,
      fullName: thirdName,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      nickname: faker.person.fullName(),
    },
    USR_000004: {
      id: 'uuid-4',
      name: fourthName,
      fullName: fourthName,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      nickname: fourthNickname,
    },
  };

  describe('buildReverseUserTokenMap', () => {
    it('sorts names descending by length so longer compound names come first', () => {
      const entries = buildReverseUserTokenMap(mockTokenMap);
      expect(entries.length).toBeGreaterThan(0);

      const names = entries.map((e) => e.name);
      const idxJr = names.indexOf(juniorName);
      const idxSr = names.indexOf(baseName);
      expect(idxJr).toBeLessThan(idxSr);
    });
  });

  describe('tokenizeUserText', () => {
    it('only replaces short single-word names when explicitly mentioned', () => {
      const name = `${faker.person.firstName()} ${faker.person.lastName()}`;
      const tokens = {
        USR_000005: {
          id: 'user-5',
          name,
          fullName: name,
          firstName: name.split(' ')[0],
          lastName: name.split(' ')[1],
          nickname: name,
        },
      };

      expect(tokenizeUserText(`${name} replied to @${name}.`, tokens)).toBe(
        `USR_000005 replied to USR_000005.`,
      );
    });

    it('replaces exact full names with tokens', () => {
      const input = `Is ${baseName} scheduled for Sunday?`;
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Is USR_000001 scheduled for Sunday?');
    });

    it('matches compound names without partial replacement', () => {
      const input = `Can we check ${juniorName} and ${baseName}?`;
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Can we check USR_000002 and USR_000001?');
    });

    it('is case-insensitive', () => {
      const input = `what did ${baseName.toLowerCase()} do yesterday?`;
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('what did USR_000001 do yesterday?');
    });

    it('replaces explicit @ mentions for full names', () => {
      const input = `Ask @${fourthName} for an update`;
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Ask USR_000004 for an update');
    });

    it('replaces explicit @ mentions for nicknames', () => {
      const input = `Did @${fourthNickname} check in?`;
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe('Did USR_000004 check in?');
    });

    it('does not replace partial words inside other words', () => {
      const input = `${baseName}man is not a volunteer`;
      const output = tokenizeUserText(input, mockTokenMap);
      expect(output).toBe(input);
    });

    it('handles start and end of strings cleanly', () => {
      const input = fourthName;
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
      expect(result).toBe(`${baseName} and ${fourthName} served at 9AM`);
    });

    it('leaves unknown tokens as-is', () => {
      const text = 'USR_999999 served at 9AM';
      const result = untokenizeUserText(text, mockTokenMap);
      expect(result).toBe('USR_999999 served at 9AM');
    });
  });

  describe('findMentionCandidates', () => {
    it('deduplicates users linked by multiple tokens and respects the result limit', () => {
      const duplicateTokens = { ...mockTokenMap, USR_000005: mockTokenMap.USR_000001 };
      const candidates = findMentionCandidates('', duplicateTokens, 2);

      expect(candidates).toHaveLength(2);
      expect(candidates.map((candidate) => candidate.name)).toEqual(
        [baseName, juniorName, thirdName, fourthName].sort().slice(0, 2),
      );
    });

    it('returns top candidates matching prefix query', () => {
      const candidates = findMentionCandidates(baseName.toLowerCase(), mockTokenMap);
      expect(candidates.some((candidate) => candidate.name === baseName)).toBe(true);
      expect(candidates.some((candidate) => candidate.name === juniorName)).toBe(true);
    });

    it('matches nicknames as well', () => {
      const candidates = findMentionCandidates(fourthNickname.toLowerCase(), mockTokenMap);
      expect(candidates.some((candidate) => candidate.name === fourthName)).toBe(true);
    });

    it('returns top members when query is empty', () => {
      const candidates = findMentionCandidates('', mockTokenMap, 3);
      expect(candidates.length).toBe(3);
    });
  });

  describe('splitTextByMentions', () => {
    it('recognizes an unknown @ mention and trailing plain text without a token map', () => {
      expect(splitTextByMentions('Ask @TestUnknown soon', {})).toEqual([
        { text: 'Ask ', isMention: false },
        { text: '@TestUnknown', isMention: true },
        { text: ' soon', isMention: false },
      ]);
    });

    it('splits text into mention and regular segments', () => {
      const segments = splitTextByMentions(`Is @${baseName} scheduled for Sunday?`, mockTokenMap);
      expect(segments).toEqual([
        { text: 'Is ', isMention: false },
        { text: `@${baseName}`, isMention: true },
        { text: ' scheduled for Sunday?', isMention: false },
      ]);
    });

    it('identifies multiple mentions in a single string', () => {
      const segments = splitTextByMentions(`Ask @${fourthName} and @${thirdName}`, mockTokenMap);
      expect(segments).toEqual([
        { text: 'Ask ', isMention: false },
        { text: `@${fourthName}`, isMention: true },
        { text: ' and ', isMention: false },
        { text: `@${thirdName}`, isMention: true },
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
