import { describe, expect, it } from 'vitest';

import {
  detectCivilStatus,
  extractCivilStatusValues,
  isCivilStatusKey,
  normalizeWeddingAnniversaryDate,
  updateMetadataWithCivilStatusField,
} from '../civil-status';

describe('civil-status domain helpers', () => {
  describe('isCivilStatusKey', () => {
    it('identifies canonical and alias keys for civil status and wedding anniversary', () => {
      expect(isCivilStatusKey('civil_status')).toBe(true);
      expect(isCivilStatusKey('civilstatus')).toBe(true);
      expect(isCivilStatusKey('Civil Status')).toBe(true);
      expect(isCivilStatusKey('wedanniv_date')).toBe(true);
      expect(isCivilStatusKey('wedding_anniversary_date')).toBe(true);
      expect(isCivilStatusKey('Wedding Anniversary')).toBe(true);
    });

    it('returns false for unrelated keys', () => {
      expect(isCivilStatusKey('dgroup_status')).toBe(false);
      expect(isCivilStatusKey('first_sunday')).toBe(false);
      expect(isCivilStatusKey('wedding_date')).toBe(false);
      expect(isCivilStatusKey('is_oic')).toBe(false);
    });
  });

  describe('detectCivilStatus', () => {
    it('normalizes known civil status values case-insensitively', () => {
      expect(detectCivilStatus('single')).toBe('Single');
      expect(detectCivilStatus('Married')).toBe('Married');
      expect(detectCivilStatus('MARRIED')).toBe('Married');
      expect(detectCivilStatus('widowed')).toBe('Widowed');
      expect(detectCivilStatus('separated')).toBe('Separated');
      expect(detectCivilStatus('Solo parent')).toBe('Solo Parent');
      expect(detectCivilStatus('  solo   parent  ')).toBe('Solo Parent');
    });

    it('returns empty string for blank or unrecognized values', () => {
      expect(detectCivilStatus('')).toBe('');
      expect(detectCivilStatus(null)).toBe('');
      expect(detectCivilStatus(undefined)).toBe('');
      expect(detectCivilStatus('Unknown')).toBe('');
    });
  });

  describe('normalizeWeddingAnniversaryDate', () => {
    it('preserves valid ISO YYYY-MM-DD dates and pads single-digit month/day', () => {
      expect(normalizeWeddingAnniversaryDate('2015-09-20')).toBe('2015-09-20');
      expect(normalizeWeddingAnniversaryDate('2015-9-5')).toBe('2015-09-05');
    });

    it('converts legacy M/D/YY and M/D/YYYY dates to YYYY-MM-DD', () => {
      expect(normalizeWeddingAnniversaryDate('1/14/95')).toBe('1995-01-14');
      expect(normalizeWeddingAnniversaryDate('11/27/23')).toBe('2023-11-27');
      expect(normalizeWeddingAnniversaryDate('4/19/26')).toBe('2026-04-19');
      expect(normalizeWeddingAnniversaryDate('4/6/1991')).toBe('1991-04-06');
    });

    it('returns empty string for blank or invalid values', () => {
      expect(normalizeWeddingAnniversaryDate('')).toBe('');
      expect(normalizeWeddingAnniversaryDate(null)).toBe('');
      expect(normalizeWeddingAnniversaryDate('not-a-date')).toBe('');
      expect(normalizeWeddingAnniversaryDate('2020-13-40')).toBe('');
    });
  });

  describe('extractCivilStatusValues', () => {
    it('returns blank defaults for null or empty metadata', () => {
      expect(extractCivilStatusValues(null)).toEqual({
        civilStatus: '',
        weddingAnniversaryDate: '',
      });
      expect(extractCivilStatusValues([])).toEqual({
        civilStatus: '',
        weddingAnniversaryDate: '',
      });
    });

    it('extracts and normalizes values from metadata record', () => {
      expect(
        extractCivilStatusValues({
          civil_status: 'married',
          wedanniv_date: '1/14/95',
        }),
      ).toEqual({
        civilStatus: 'Married',
        weddingAnniversaryDate: '1995-01-14',
      });
    });

    it('extracts and normalizes values from metadata_entries array', () => {
      expect(
        extractCivilStatusValues([
          { key: 'Civil Status', value: 'Solo parent' },
          { key: 'wedanniv_date', value: '2018-06-15' },
        ]),
      ).toEqual({
        civilStatus: 'Solo Parent',
        weddingAnniversaryDate: '2018-06-15',
      });
    });
  });

  describe('updateMetadataWithCivilStatusField', () => {
    it('inserts canonical keys when not present', () => {
      const updated = updateMetadataWithCivilStatusField(
        [{ key: 'is_oic', value: 'true' }],
        'civilStatus',
        'Married',
      );
      expect(updated).toEqual([
        { key: 'is_oic', value: 'true' },
        { key: 'civil_status', value: 'Married' },
      ]);
    });

    it('replaces legacy alias keys with canonical keys and deduplicates', () => {
      const updated = updateMetadataWithCivilStatusField(
        [
          { key: 'Civil Status', value: 'single' },
          { key: 'civilstatus', value: 'Single' },
          { key: 'is_oic', value: 'true' },
        ],
        'civilStatus',
        'Married',
      );
      expect(updated).toEqual([
        { key: 'civil_status', value: 'Married' },
        { key: 'is_oic', value: 'true' },
      ]);
    });

    it('removes matching keys when cleared to empty string', () => {
      const updated = updateMetadataWithCivilStatusField(
        [
          { key: 'is_oic', value: 'true' },
          { key: 'wedanniv_date', value: '2015-09-20' },
        ],
        'weddingAnniversaryDate',
        '',
      );
      expect(updated).toEqual([{ key: 'is_oic', value: 'true' }]);
    });
  });
});
