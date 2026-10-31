// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { DOMPurify } from '../dompurify';

describe('DOMPurify configuration', () => {
  describe('afterSanitizeAttributes hook', () => {
    it('adds rel="noopener noreferrer" to anchor tags with target="_blank"', () => {
      const html = '<a href="https://example.com" target="_blank">Link</a>';
      // explicit allow target attribute based on memory guidelines
      const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }) as string;

      expect(sanitized).toContain('rel="noopener noreferrer"');
      expect(sanitized).toContain('target="_blank"');
    });

    it('does not add rel attribute if target is not _blank', () => {
      const html = '<a href="https://example.com" target="_self">Link</a>';
      const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }) as string;

      expect(sanitized).not.toContain('rel="noopener noreferrer"');
      expect(sanitized).toContain('target="_self"');
    });

    it('does not add rel attribute if target attribute is missing', () => {
      const html = '<a href="https://example.com">Link</a>';
      const sanitized = DOMPurify.sanitize(html) as string;

      expect(sanitized).not.toContain('rel="noopener noreferrer"');
      expect(sanitized).toContain('href="https://example.com"');
    });

    it('handles multiple anchor tags correctly', () => {
      const html = `
        <a href="https://example.com" target="_blank">Link 1</a>
        <a href="https://example2.com" target="_self">Link 2</a>
        <a href="https://example3.com" target="_blank">Link 3</a>
      `;
      const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }) as string;

      expect(sanitized).toContain(
        'href="https://example.com" target="_blank" rel="noopener noreferrer"',
      );
      expect(sanitized).toContain('href="https://example2.com" target="_self"');
      expect(sanitized).not.toContain(
        'href="https://example2.com" target="_self" rel="noopener noreferrer"',
      );
      expect(sanitized).toContain(
        'href="https://example3.com" target="_blank" rel="noopener noreferrer"',
      );
    });
  });
});
